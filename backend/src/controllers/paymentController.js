const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');
const { Order, OrderItem, Payment, OrderStatusHistory, Product, User } = require('../models');
const logger = require('../config/logger');

exports.processPayment = async (req, res, next) => {
  try {
    const rawData = req.body.formData || req.body;
    const token = req.body.token || rawData?.token;
    const payment_method_id = req.body.payment_method_id || rawData?.payment_method_id;
    const installments = req.body.installments || rawData?.installments || 1;
    const issuer_id = req.body.issuer_id || rawData?.issuer_id;
    const payer = req.body.payer || rawData?.payer;
    const order_id = req.body.order_id || rawData?.external_reference;

    console.log('👉 [LOG PASO 3 - BACKEND RECIBE PAYLOAD]:', {
      order_id,
      has_token: !!token,
      token_preview: token ? `${token.substring(0, 15)}...` : 'NINGUNO',
      payment_method_id,
      installments,
      issuer_id,
      payer_email: payer?.email || req.user?.email,
      full_body: req.body
    });

    const order = await Order.findByPk(order_id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    const paymentResult = await paymentService.createPayment({
      transaction_amount: order.total,
      token: token || 'mock_token_approved',
      description: `Compra en SUPER Tech - Orden #${order.order_number}`,
      installments: Number(installments) || 1,
      payment_method_id: payment_method_id || 'visa',
      issuer_id: issuer_id || null,
      payer: payer || { email: req.user.email, first_name: req.user.name },
      external_reference: order.id
    });

    console.log('✅ [LOG PASO 3 - RESULTADO PAGO EN BACKEND]:', paymentResult);

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

    // If approved, send confirmation email with full item details (isolated try/catch so email errors never break payment flow)
    if (newOrderStatus === 'paid') {
      try {
        const fullOrder = await Order.findByPk(order.id, {
          include: [
            { model: OrderItem, as: 'items' },
            { model: User, as: 'user' }
          ]
        });
        const recipientEmail = fullOrder?.user?.email || req.user?.email;
        if (recipientEmail && fullOrder) {
          await emailService.sendOrderConfirmation(recipientEmail, fullOrder);
        }
      } catch (emailErr) {
        logger.error('[PaymentController] Error sending order confirmation email (payment succeeded):', emailErr);
      }
    }

    return res.json({
      success: true,
      message: `Pago procesado con estado: ${paymentResult.status}`,
      payment,
      order
    });
  } catch (error) {
    console.error('❌ [LOG PASO 3 - ERROR EN CONTROLLER PAGO]:', error);
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
