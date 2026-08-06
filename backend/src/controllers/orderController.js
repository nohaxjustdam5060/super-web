const { Op } = require('sequelize');
const { Order, OrderItem, OrderStatusHistory, Product, Coupon, Address } = require('../models');
const emailService = require('../services/emailService');

exports.createOrder = async (req, res, next) => {
  try {
    const { items, shipping_address, shipping_method, coupon_code, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'La orden no contiene items' });
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      if (!product || !product.is_active) {
        return res.status(400).json({ success: false, message: `Producto no disponible: ${item.name || item.product_id}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Stock insuficiente para ${product.name}` });
      }

      const unitPrice = Number(product.offer_price || product.price);
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: itemTotal
      });
    }

    // Apply Coupon if exists
    let discountAmount = 0;
    if (coupon_code) {
      const coupon = await Coupon.findOne({ where: { code: coupon_code.toUpperCase(), is_active: true } });
      if (coupon) {
        if (coupon.discount_type === 'percentage') {
          discountAmount = (subtotal * Number(coupon.discount_value)) / 100;
          if (coupon.max_discount && discountAmount > Number(coupon.max_discount)) {
            discountAmount = Number(coupon.max_discount);
          }
        } else {
          discountAmount = Number(coupon.discount_value);
        }
        coupon.used_count += 1;
        await coupon.save();
      }
    }

    const shippingCost = 15.00; // Tarifa plana express
    const total = Math.max(0, subtotal - discountAmount + shippingCost);

    // 1. Check if user already has an existing pending order to REUSE and update
    const existingPendingOrder = await Order.findOne({
      where: {
        user_id: req.user.id,
        status: 'pending'
      },
      order: [['createdAt', 'DESC']]
    });

    if (existingPendingOrder) {
      existingPendingOrder.subtotal = subtotal;
      existingPendingOrder.discount_amount = discountAmount;
      existingPendingOrder.shipping_cost = shippingCost;
      existingPendingOrder.total = total;
      existingPendingOrder.shipping_address = shipping_address;
      existingPendingOrder.shipping_method = shipping_method || 'Envío Express a Domicilio';
      existingPendingOrder.coupon_code = coupon_code || null;
      existingPendingOrder.notes = notes;
      await existingPendingOrder.save();

      // Re-create items for this order
      await OrderItem.destroy({ where: { order_id: existingPendingOrder.id } });
      await Promise.all(
        validatedItems.map((item) =>
          OrderItem.create({
            order_id: existingPendingOrder.id,
            ...item
          })
        )
      );

      return res.status(200).json({
        success: true,
        message: 'Orden pendiente actualizada exitosamente',
        order: existingPendingOrder
      });
    }

    // 2. Create new order if no pending order exists
    const orderNumber = `SUP-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await Order.create({
      order_number: orderNumber,
      user_id: req.user.id,
      status: 'pending',
      subtotal,
      discount_amount: discountAmount,
      shipping_cost: shippingCost,
      total,
      shipping_address,
      shipping_method: shipping_method || 'Envío Express a Domicilio',
      coupon_code: coupon_code || null,
      notes
    });

    await Promise.all(
      validatedItems.map((item) =>
        OrderItem.create({
          order_id: order.id,
          ...item
        })
      )
    );

    await OrderStatusHistory.create({
      order_id: order.id,
      status: 'pending',
      comment: 'Orden creada por el cliente',
      created_by_user_id: req.user.id
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

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: {
        user_id: req.user.id,
        status: { [Op.ne]: 'pending' } // Exclude un-paid pending orders from user history
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
        { model: OrderStatusHistory, as: 'statusHistory' }
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
