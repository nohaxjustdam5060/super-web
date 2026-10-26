const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Order, OrderItem, OrderStatusHistory, Product, Coupon, Address, ShippingMethod, Payment, User } = require('../models');
const emailService = require('../services/emailService');
const orderService = require('../services/orderService');

exports.getShippingMethods = async (req, res, next) => {
  try {
    let methods = await ShippingMethod.findAll({
      where: { is_active: true },
      order: [['cost', 'ASC']]
    });

    if (methods.length === 0) {
      // Auto-seed default Peruvian shipping methods
      await ShippingMethod.bulkCreate([
        {
          name: 'Envío Express (Lima y Trujillo)',
          code: 'express',
          description: 'Entrega rápida a domicilio en 24-48h',
          cost: 15.00,
          estimated_delivery: '24 - 48 horas',
          is_active: true
        },
        {
          name: 'Envío a Provincias',
          code: 'province',
          description: 'Despacho a nivel nacional vía agencia',
          cost: 25.00,
          estimated_delivery: '48 - 72 horas',
          is_active: true
        },
        {
          name: 'Recojo en Tienda',
          code: 'pickup',
          description: 'Retiro presencial sin costo en nuestra tienda (Jr. Velarde 172, Lima)',
          cost: 0.00,
          estimated_delivery: 'Inmediato / Mismo día',
          is_active: true
        }
      ]);

      methods = await ShippingMethod.findAll({
        where: { is_active: true },
        order: [['cost', 'ASC']]
      });
    }

    return res.json({ success: true, shippingMethods: methods });
  } catch (error) {
    next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { items, shipping_address, shipping_method, shipping_cost, invoice_info, payment_method, coupon_code, notes } = req.body;

    const order = await orderService.createOrderCore({
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      items,
      shipping_address,
      shipping_method,
      shipping_cost,
      invoice_info,
      payment_method: payment_method || 'mercadopago',
      coupon_code,
      notes,
      status: 'pending',
      statusComment: 'Orden creada por el cliente'
    });

    return res.status(201).json({
      success: true,
      message: 'Orden creada exitosamente',
      order
    });
  } catch (error) {
    next(error);
  }
};

// Process Bank Transfer Checkout Submission (supports legacy order_id or consolidated atomic creation)
exports.processBankTransferPayment = async (req, res, next) => {
  try {
    const { order_id, items, shipping_address, shipping_method, shipping_cost, invoice_info, coupon_code, notes } = req.body;

    let order = null;
    const reservationExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 horas exactas

    if (order_id) {
      // Legacy flow: Update existing order within transaction with pessimistic lock
      await sequelize.transaction(async (t) => {
        order = await Order.findOne({
          where: { id: order_id, user_id: req.user.id },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (!order) {
          const err = new Error('Orden no encontrada');
          err.statusCode = 404;
          throw err;
        }

        const existingItems = await OrderItem.findAll({ where: { order_id: order.id }, transaction: t });
        const physicalItems = (existingItems || []).filter((item) => {
          if (!item || !item.product_id) return false;
          const pid = String(item.product_id).toUpperCase();
          return pid !== 'SHIPPING' && pid !== 'GATEWAY_SURCHARGE' && !pid.startsWith('VIRTUAL_');
        });

        if (physicalItems.length > 0) {
          const productIds = physicalItems.map((i) => i.product_id);
          const dbProducts = await Product.findAll({
            where: { id: { [Op.in]: productIds } },
            transaction: t,
            lock: t.LOCK.UPDATE
          });

          const productMap = new Map(dbProducts.map((p) => [String(p.id), p]));

          for (const item of physicalItems) {
            const product = productMap.get(String(item.product_id));
            const reqQty = Number(item.quantity) || 1;
            if (!product || !product.is_active) {
              const err = new Error(`Producto no disponible: ${item.product_name || item.product_id}`);
              err.statusCode = 400;
              throw err;
            }

            const availableStock = Math.max(0, (product.stock || 0) - (product.reserved_stock || 0));
            if (availableStock < reqQty) {
              const err = new Error(`Stock insuficiente o reservado para "${product.name}". Disponible: ${availableStock}`);
              err.statusCode = 400;
              throw err;
            }

            // Increment reserved_stock atomically
            product.reserved_stock = (product.reserved_stock || 0) + reqQty;
            await product.save({ transaction: t });
          }
        }

        order.status = 'payment_review';
        order.payment_method = 'bank_transfer';
        order.reservation_expires_at = reservationExpiresAt;
        if (shipping_address) order.shipping_address = shipping_address;
        if (shipping_method) order.shipping_method = shipping_method;
        if (shipping_cost !== undefined) order.shipping_cost = Number(shipping_cost);
        if (invoice_info) order.invoice_info = invoice_info;
        if (notes) order.notes = notes;

        // Recalculate total with 0% surcharge for bank transfer
        const subtotal = Number(order.subtotal) || 0;
        const discount = Number(order.discount_amount) || 0;
        const currentShippingCost = Number(order.shipping_cost) || 0;
        order.total = Math.max(0, subtotal - discount + currentShippingCost);
        await order.save({ transaction: t });

        // Create or update Payment record
        const [payment] = await Payment.findOrCreate({
          where: { order_id: order.id },
          defaults: {
            order_id: order.id,
            provider: 'bank_transfer',
            status: 'pending_verification',
            payment_method: 'bank_transfer',
            amount: order.total,
            currency: 'PEN'
          },
          transaction: t
        });

        if (payment) {
          payment.provider = 'bank_transfer';
          payment.status = 'pending_verification';
          payment.payment_method = 'bank_transfer';
          payment.amount = order.total;
          await payment.save({ transaction: t });
        }

        await OrderStatusHistory.create({
          order_id: order.id,
          status: 'payment_review',
          comment: 'Pago por transferencia bancaria iniciado. Reserva activa garantizada por 4 horas.',
          created_by_user_id: req.user.id
        }, { transaction: t });
      });
    } else {
      // Consolidated atomic flow: create order directly in 'payment_review' with 4-hour reservation and reserved_stock
      await sequelize.transaction(async (t) => {
        order = await orderService.createOrderCore({
          userId: req.user.id,
          userEmail: req.user.email,
          userName: req.user.name,
          items,
          shipping_address,
          shipping_method,
          shipping_cost,
          invoice_info,
          payment_method: 'bank_transfer',
          coupon_code,
          notes,
          status: 'payment_review',
          statusComment: 'Pago por transferencia bancaria iniciado. Reserva activa garantizada por 4 horas.',
          reservation_expires_at: reservationExpiresAt,
          transaction: t
        });

        // Reserve stock in database for physical items
        const rawItems = order.items || items || [];
        const physicalItems = rawItems.filter((item) => {
          if (!item || !item.product_id) return false;
          const pid = String(item.product_id).toUpperCase();
          return pid !== 'SHIPPING' && pid !== 'GATEWAY_SURCHARGE' && !pid.startsWith('VIRTUAL_');
        });

        if (physicalItems.length > 0) {
          const productIds = physicalItems.map((i) => i.product_id);
          const dbProducts = await Product.findAll({
            where: { id: { [Op.in]: productIds } },
            transaction: t,
            lock: t.LOCK.UPDATE
          });

          const productMap = new Map(dbProducts.map((p) => [String(p.id), p]));

          for (const item of physicalItems) {
            const product = productMap.get(String(item.product_id));
            if (product) {
              const reqQty = Number(item.quantity) || 1;
              product.reserved_stock = (product.reserved_stock || 0) + reqQty;
              await product.save({ transaction: t });
            }
          }
        }

        await Payment.create({
          order_id: order.id,
          provider: 'bank_transfer',
          status: 'pending_verification',
          payment_method: 'bank_transfer',
          amount: order.total,
          currency: 'PEN'
        }, { transaction: t });
      });
    }

    const whatsappNumber = process.env.WHATSAPP_NUMBER || '51904436463';
    const whatsappMsg = encodeURIComponent(
      `Hola SUPERLAPTOP, adjunto mi comprobante de transferencia para el Pedido #${order.order_number} por el monto de S/ ${Number(order.total).toFixed(2)} dentro del plazo de reserva de 4 horas.`
    );
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMsg}`;

    return res.json({
      success: true,
      message: 'Pedido por transferencia bancaria registrado exitosamente. Tu reserva estará activa durante 4 horas.',
      whatsapp_url: whatsappUrl,
      reservation_expires_at: order.reservation_expires_at || reservationExpiresAt,
      order
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: {
        user_id: req.user.id,
        status: {
          [Op.notIn]: ['pending', 'cancelled']
        }
      },
      order: [['createdAt', 'DESC']],
      include: [{ model: OrderItem, as: 'items' }]
    });

    return res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({
      where: { id, user_id: req.user.id },
      include: [
        { model: OrderItem, as: 'items' },
        { model: OrderStatusHistory, as: 'statusHistory' },
        { model: Payment, as: 'payments' }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    return res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// Admin Endpoint: Verify Bank Transfer and mark order as Paid with row-lock & anti-overselling stock check
exports.verifyBankTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    let order = null;

    // Managed transaction with row-level locking on Orders
    await sequelize.transaction(async (t) => {
      // 1. Lock exclusive row on Orders without left join
      order = await Order.findByPk(id, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!order) {
        const err = new Error('Orden no encontrada');
        err.statusCode = 404;
        throw err;
      }

      // 2. Idempotency check: prevent duplicate processing / double click
      if (order.status === 'paid') {
        const err = new Error('Esta orden ya fue aprobada y procesada previamente.');
        err.statusCode = 400;
        throw err;
      }

      // 3. Load associations within the active transaction
      const [orderItems, orderUser] = await Promise.all([
        OrderItem.findAll({ where: { order_id: order.id }, transaction: t }),
        order.user_id ? User.findByPk(order.user_id, { transaction: t }) : null
      ]);

      order.items = orderItems;
      order.user = orderUser;

      // 4. Anti-overselling validation: verify current stock before approving
      const physicalItems = (orderItems || []).filter((item) => {
        if (!item || !item.product_id) return false;
        const pid = String(item.product_id).toUpperCase();
        return pid !== 'SHIPPING' && pid !== 'GATEWAY_SURCHARGE' && !pid.startsWith('VIRTUAL_');
      });

        if (physicalItems.length > 0) {
          const productIds = physicalItems.map((i) => i.product_id);
          const dbProducts = await Product.findAll({
            where: { id: { [Op.in]: productIds } },
            transaction: t,
            lock: t.LOCK.UPDATE
          });

          const productMap = new Map(dbProducts.map((p) => [String(p.id), p]));

          for (const item of physicalItems) {
            const product = productMap.get(String(item.product_id));
            const reqQty = Number(item.quantity) || 1;
            const currentStock = product ? Number(product.stock) : 0;

            if (!product || !product.is_active || currentStock < reqQty) {
              const prodName = product ? product.name : (item.product_name || 'Producto');
              const err = new Error(`Stock insuficiente para "${prodName}". Stock disponible: ${currentStock}, Requerido: ${reqQty}. No se puede aprobar la orden.`);
              err.statusCode = 409;
              err.code = 'INSUFFICIENT_STOCK';
              throw err;
            }

            // Release the local reservation counter (official sale decrement happens next)
            product.reserved_stock = Math.max(0, (product.reserved_stock || 0) - reqQty);
            await product.save({ transaction: t });
          }
        }

        order.status = 'paid';
        order.reservation_expires_at = null;
        await order.save({ transaction: t });

      let payment = await Payment.findOne({ where: { order_id: order.id }, transaction: t });
      if (payment) {
        payment.status = 'approved';
        payment.status_detail = 'Verificado manualmente por administrador';
        await payment.save({ transaction: t });
      } else {
        await Payment.create({
          order_id: order.id,
          provider: 'bank_transfer',
          status: 'approved',
          status_detail: 'Verificado manualmente por administrador',
          amount: order.total,
          currency: 'PEN'
        }, { transaction: t });
      }

      await OrderStatusHistory.create({
        order_id: order.id,
        status: 'paid',
        comment: 'Transferencia bancaria verificada y aprobada por administrador.',
        created_by_user_id: req.user.id
      }, { transaction: t });
    });

    // Post-transaction notifications and ERP decrement
    const emailTemplates = require('../utils/emailTemplates');
    const html = emailTemplates.generateOrderConfirmationHTML(order);

    emailService.sendEmail({
      to: order.user?.email || req.user.email,
      subject: `[SUPERLAPTOP] Pago Verificado - Confirmación de Pedido #${order.order_number}`,
      html
    }).catch((emailErr) => console.error('[VerifyPaymentEmailError]', emailErr));

    const cuadradoSyncService = require('../services/cuadradoSyncService');
    let syncWarning = null;

    try {
      const stockResult = await cuadradoSyncService.decrementStockForOrder(order);
      if (!stockResult.success || (stockResult.results && stockResult.results.some((r) => !r.success))) {
        syncWarning = 'Pago aprobado, pero ocurrió una advertencia al decrementar stock en Cuadrado ERP.';
        await OrderStatusHistory.create({
          order_id: order.id,
          status: 'paid',
          comment: `Advertencia al sincronizar con Cuadrado ERP: ${stockResult.error || 'Uno o más productos no pudieron ser decrementados en el ERP'}`,
          created_by_user_id: req.user.id
        });
      } else {
        await OrderStatusHistory.create({
          order_id: order.id,
          status: 'paid',
          comment: `Stock decrementado exitosamente en Cuadrado ERP (${stockResult.successfulCount || 1} items).`,
          created_by_user_id: req.user.id
        });
      }
    } catch (stockErr) {
      console.error('[VerifyBankTransfer] Error decrementing stock:', stockErr);
      syncWarning = `Fallo de conexión con Cuadrado ERP: ${stockErr.message}`;
      await OrderStatusHistory.create({
        order_id: order.id,
        status: 'paid',
        comment: `Fallo de conexión al decrementar en Cuadrado ERP: ${stockErr.message}`,
        created_by_user_id: req.user.id
      });
    }

    return res.json({
      success: true,
      message: 'Transferencia bancaria verificada exitosamente. Orden marcada como PAGADA.',
      warning: syncWarning,
      order
    });
  } catch (error) {
    next(error);
  }
};

// Admin Route to manually cancel order and release reserved stock
exports.cancelOrderAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    let updatedOrder = null;

    await sequelize.transaction(async (t) => {
      const order = await Order.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!order) {
        const err = new Error('Orden no encontrada');
        err.statusCode = 404;
        throw err;
      }

      if (order.status === 'cancelled') {
        const err = new Error('La orden ya se encuentra cancelada.');
        err.statusCode = 400;
        throw err;
      }

      const orderItems = await OrderItem.findAll({
        where: { order_id: order.id },
        transaction: t
      });
      order.items = orderItems;

      // If the order was reserving stock in payment_review, restore reserved_stock
      if (order.status === 'payment_review' && order.payment_method === 'bank_transfer') {
        const physicalItems = (order.items || []).filter((item) => {
          if (!item || !item.product_id) return false;
          const pid = String(item.product_id).toUpperCase();
          return pid !== 'SHIPPING' && pid !== 'GATEWAY_SURCHARGE' && !pid.startsWith('VIRTUAL_');
        });

        if (physicalItems.length > 0) {
          const productIds = physicalItems.map((i) => i.product_id);
          const dbProducts = await Product.findAll({
            where: { id: { [Op.in]: productIds } },
            transaction: t,
            lock: t.LOCK.UPDATE
          });

          const productMap = new Map(dbProducts.map((p) => [String(p.id), p]));

          for (const item of physicalItems) {
            const product = productMap.get(String(item.product_id));
            if (product) {
              const reqQty = Number(item.quantity) || 1;
              product.reserved_stock = Math.max(0, (product.reserved_stock || 0) - reqQty);
              await product.save({ transaction: t });
            }
          }
        }
      }

      order.status = 'cancelled';
      order.reservation_expires_at = null;
      await order.save({ transaction: t });

      await OrderStatusHistory.create({
        order_id: order.id,
        status: 'cancelled',
        comment: reason || 'Orden cancelada manualmente por administrador.',
        created_by_user_id: req.user.id
      }, { transaction: t });

      updatedOrder = order;
    });

    return res.json({
      success: true,
      message: 'Orden cancelada exitosamente y reserva de stock liberada.',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};
