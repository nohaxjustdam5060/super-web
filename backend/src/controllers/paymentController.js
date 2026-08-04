const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');
const { Order, Payment, OrderStatusHistory, Product, User } = require('../models');
const logger = require('../config/logger');

exports.processPayment = async (req, res, next) => {
  try {
    const { order_id, formData, payment_method_id, token, installments, payer } = req.body;

    const order = await Order.findByPk(order_id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    const paymentResult = await paymentService.createPayment({
      transaction_amount: order.total,
      token: token || formData?.token || 'mock_token_approved',
      description: `Compra en SUPER Tech - Orden #${order.order_number}`,
      installments: installments || formData?.installments || 1,
      payment_method_id: payment_method_id || formData?.payment_method_id || 'visa',
      payer: payer || formData?.payer || { email: req.user.email, first_name: req.user.name },
      external_reference: order.id
    });

    // Save payment details in DB
    const payment = await Payment.create({
      order_id: order.id,
      provider: 'mercadopago',
      payment_id: paymentResult.id,
      status: paymentResult.status,
      status_detail: paymentResult.status_detail,
      amount: paymentResult.transaction_amount,
      payment_method: paymentResult.payment_method_id,
      card_last_four: paymentResult.card_last_four,
      raw_response: paymentResult
    });

    // Update order status depending on Mercado Pago response
    let newOrderStatus = 'pending';
    if (paymentResult.status === 'approved') {
      newOrderStatus = 'paid';
    } else if (paymentResult.status === 'in_process' || paymentResult.status === 'pending') {
      newOrderStatus = 'payment_review';
    } else if (paymentResult.status === 'rejected') {
      newOrderStatus = 'cancelled';
    }

    order.status = newOrderStatus;
    await order.save();

    await OrderStatusHistory.create({
      order_id: order.id,
      status: newOrderStatus,
      comment: `Pago procesado con estado: ${paymentResult.status}`,
      created_by_user_id: req.user.id
    });

    // If approved, send confirmation email
    if (newOrderStatus === 'paid') {
      emailService.sendOrderConfirmation(req.user.email, order);
    }

    return res.json({
      success: true,
      message: `Pago procesado con estado: ${paymentResult.status}`,
      payment,
      order
    });
  } catch (error) {
    next(error);
  }
};

exports.handleWebhook = async (req, res, next) => {
  try {
    logger.info('[PaymentController] MercadoPago webhook triggered', req.body);
    const webhookData = req.body;

    const paymentInfo = await paymentService.handleWebhook(webhookData);

    if (paymentInfo && paymentInfo.external_reference) {
      const order = await Order.findByPk(paymentInfo.external_reference);
      if (order) {
        let newStatus = order.status;
        if (paymentInfo.status === 'approved') newStatus = 'paid';
        if (paymentInfo.status === 'rejected') newStatus = 'cancelled';

        if (order.status !== newStatus) {
          order.status = newStatus;
          await order.save();

          await OrderStatusHistory.create({
            order_id: order.id,
            status: newStatus,
            comment: `Estado de pago actualizado vía Webhook MercadoPago (${paymentInfo.status})`
          });
        }
      }
    }

    // Always respond 200 OK to Mercado Pago webhook service
    return res.status(200).send('OK');
  } catch (error) {
    logger.error('[PaymentController] Error handling webhook:', error);
    return res.status(200).send('OK');
  }
};
