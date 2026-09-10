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
          name: 'Envío a Provincias (Agencia de Transporte)',
          code: 'province',
          description: 'Despacho a nivel nacional vía agencia (Shalom, Olva, Marvisur)',
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

    if (order_id) {
      // Legacy flow: Update existing order
      order = await Order.findOne({ where: { id: order_id, user_id: req.user.id } });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Orden no encontrada' });
      }

      order.status = 'payment_review';
      order.payment_method = 'bank_transfer';
      if (shipping_address) order.shipping_address = shipping_address;
      if (shipping_method) order.shipping_method = shipping_method;
      if (shipping_cost !== undefined) order.shipping_cost = Number(shipping_cost);
      if (invoice_info) order.invoice_info = invoice_info;
      if (notes) order.notes = notes;
      await order.save();

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
        }
      });

      if (payment) {
        payment.provider = 'bank_transfer';
        payment.status = 'pending_verification';
        payment.payment_method = 'bank_transfer';
        payment.amount = order.total;
        await payment.save();
      }

      await OrderStatusHistory.create({
        order_id: order.id,
        status: 'payment_review',
        comment: 'Pago por transferencia bancaria iniciado. Pendiente de verificación por administrador (Reserva 24h).',
        created_by_user_id: req.user.id
      });
    } else {
      // Consolidated atomic flow: create order directly in 'payment_review'
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
          statusComment: 'Pago por transferencia bancaria iniciado. Pendiente de verificación por administrador (Reserva 24h).',
          transaction: t
        });

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

    // Send Bank Transfer Instruction Email
    try {
      await emailService.sendEmail({
        to: req.user.email,
        subject: `[SUPERLAPTOP] Reserva de Pedido #${order.order_number} - Instrucciones de Transferencia Bancaria`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background: #ffffff;">
            <h2 style="color: #dc2626;">¡Tu pedido #${order.order_number} ha sido reservado!</h2>
            <p>Gracias por tu compra en <strong>SUPERLAPTOP</strong>. Tu pedido estará reservado durante <strong>24 horas</strong> mientras se verifica la transferencia bancaria.</p>

            <h3 style="color: #1e3a8a;">Datos Bancarios para Transferir:</h3>
            <ul>
              <li><strong>BCP Soles:</strong> 191-98765432-0-89 (CCI: 002-191-0098765432089-54)</li>
              <li><strong>Interbank Soles:</strong> 200-3001234567 (CCI: 003-200-003001234567-88)</li>
              <li><strong>BBVA Soles:</strong> 0011-0123-0200987654 (CCI: 011-123-000200987654-12)</li>
              <li><strong>Titular:</strong> SUPERLAPTOP E-COMMERCE S.A.C.</li>
            </ul>

            <p style="background: #f8fafc; padding: 12px; border-radius: 8px; font-weight: bold; border-left: 4px solid #dc2626;">
              Monto Total a Transferir: S/ ${Number(order.total).toFixed(2)}
            </p>

            <p>Envía tu comprobante adjuntando el número de orden <strong>#${order.order_number}</strong> por WhatsApp o respondiendo a este correo.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('[BankTransferEmailError]', emailErr);
    }

    return res.json({
      success: true,
      message: 'Pedido por transferencia bancaria registrado exitosamente. Tu reserva estará activa por 24 horas.',
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

// Admin Endpoint: Verify Bank Transfer and mark order as Paid
exports.verifyBankTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'user' }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    order.status = 'paid';
    await order.save();

    let payment = await Payment.findOne({ where: { order_id: order.id } });
    if (payment) {
      payment.status = 'approved';
      payment.status_detail = 'Verificado manualmente por administrador';
      await payment.save();
    } else {
      await Payment.create({
        order_id: order.id,
        provider: 'bank_transfer',
        status: 'approved',
        status_detail: 'Verificado manualmente por administrador',
        amount: order.total,
        currency: 'PEN'
      });
    }

    await OrderStatusHistory.create({
      order_id: order.id,
      status: 'paid',
      comment: 'Transferencia bancaria verificada y aprobada por administrador.',
      created_by_user_id: req.user.id
    });

    // Ejecutar envío de correo y emisión de boleta en paralelo para reducir latencia
    const emailTemplates = require('../utils/emailTemplates');
    const html = emailTemplates.generateOrderConfirmationHTML(order);

    const emailPromise = emailService.sendEmail({
      to: order.user?.email || req.user.email,
      subject: `[SUPERLAPTOP] Pago Verificado - Confirmación de Pedido #${order.order_number}`,
      html
    }).catch((emailErr) => console.error('[VerifyPaymentEmailError]', emailErr));

    const nubeFactService = require('../services/nubeFactService');
    const invoicePromise = nubeFactService.generateInvoiceForOrder(order.id)
      .catch((invoiceErr) => console.error('[VerifyBankTransfer] Error emitting NubeFact invoice:', invoiceErr));

    await Promise.allSettled([emailPromise, invoicePromise]);

    return res.json({
      success: true,
      message: 'Transferencia bancaria verificada exitosamente. Orden marcada como PAGADA.',
      order
    });
  } catch (error) {
    next(error);
  }
};
