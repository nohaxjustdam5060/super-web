const crypto = require('crypto');
const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');
const nubeFactService = require('../services/nubeFactService');
const { Order, OrderItem, Payment, OrderStatusHistory, User } = require('../models');
const logger = require('../config/logger');

/**
 * Create Mercado Pago Checkout Pro Preference and return init_point redirect URL
 */
exports.createPreference = async (req, res, next) => {
  try {
    const { order_id, invoice_info } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'No se especificó el ID de la orden.'
      });
    }

    const order = await Order.findByPk(order_id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'user' }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    if (invoice_info) {
      order.invoice_info = invoice_info;
    }

    const preference = await paymentService.createPreference(order);

    order.preference_id = preference.id;
    await order.save();

    return res.json({
      success: true,
      message: 'Preferencia de Mercado Pago creada exitosamente.',
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point
    });
  } catch (error) {
    logger.error('❌ [paymentController.createPreference Error]:', error);
    next(error);
  }
};

/**
 * Handle Mercado Pago Webhook / IPN Notifications
 * Responds 200 OK immediately and processes real payment status via Payment.get()
 */
exports.handleWebhook = async (req, res, next) => {
  // Respond 200 OK immediately to Mercado Pago to avoid retries
  console.log('🔔🔔🔔 [WEBHOOK] LLEGÓ UNA PETICIÓN', new Date().toISOString());
  res.status(200).send('OK');

  try {
    const body = req.body || {};
    const query = req.query || {};

    logger.info('[PaymentController] Webhook received:', { body, query, headers: req.headers });

    // Extract payment ID from body or query params
    const paymentId = body.data?.id || query['data.id'] || query.id || body.id;
    const type = body.type || query.topic || body.action;

    if (!paymentId) {
      logger.info('[PaymentController] Webhook received notification without payment ID, ignoring.');
      return;
    }

    // Validate Webhook Signature if MP_WEBHOOK_SECRET is configured
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];

    if (webhookSecret && xSignature) {
      try {
        const parts = xSignature.split(',');
        let ts = '';
        let hash = '';
        parts.forEach((part) => {
          const [key, value] = part.split('=');
          if (key.trim() === 'ts') ts = value.trim();
          if (key.trim() === 'v1') hash = value.trim();
        });

        const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
        const calculatedHash = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');

        if (calculatedHash !== hash) {
          logger.warn('[PaymentController] Webhook signature mismatch! Calculated:', calculatedHash, 'Received:', hash);
        } else {
          logger.info('✅ [PaymentController] Webhook signature verified successfully.');
        }
      } catch (sigErr) {
        logger.error('[PaymentController] Error verifying webhook signature:', sigErr);
      }
    }

    // Fetch real payment status directly from Mercado Pago API using Payment.get()
    const paymentData = await paymentService.getPaymentStatus(paymentId);

    if (!paymentData || !paymentData.external_reference) {
      logger.warn(`[PaymentController] Webhook payment ${paymentId} has no external_reference, skipping.`);
      return;
    }

    const orderId = paymentData.external_reference;
    const order = await Order.findByPk(orderId, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'user' }
      ]
    });

    if (!order) {
      logger.error(`[PaymentController] Order #${orderId} referenced in payment ${paymentId} not found.`);
      return;
    }

    // Idempotency check: prevent duplicate processing if order is already paid with same mp_payment_id
    if (order.mp_payment_id === String(paymentData.id) && order.status === 'paid' && paymentData.status === 'approved') {
      logger.info(`[PaymentController] Order #${order.order_number} already processed for payment ${paymentData.id}.`);
      return;
    }

    const previousStatus = order.status;

    // Map Mercado Pago status to Order status
    let newOrderStatus = 'pending';
    if (paymentData.status === 'approved') {
      newOrderStatus = 'paid';
    } else if (['in_process', 'pending', 'authorized'].includes(paymentData.status)) {
      newOrderStatus = 'payment_review';
    } else if (['rejected', 'cancelled'].includes(paymentData.status)) {
      newOrderStatus = 'cancelled';
    } else if (['refunded', 'charged_back'].includes(paymentData.status)) {
      newOrderStatus = 'refunded';
    }

    order.mp_payment_id = String(paymentData.id);
    order.status = newOrderStatus;
    await order.save();

    // Create or update Payment record in DB
    const [dbPayment] = await Payment.findOrCreate({
      where: { order_id: order.id },
      defaults: {
        order_id: order.id,
        provider: 'mercadopago',
        payment_id: String(paymentData.id),
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        amount: paymentData.transaction_amount || order.total,
        payment_method: paymentData.payment_method_id,
        card_last_four: paymentData.card_last_four,
        raw_response: paymentData.raw
      }
    });

    if (dbPayment) {
      dbPayment.provider = 'mercadopago';
      dbPayment.payment_id = String(paymentData.id);
      dbPayment.status = paymentData.status;
      dbPayment.status_detail = paymentData.status_detail;
      dbPayment.amount = paymentData.transaction_amount || order.total;
      dbPayment.payment_method = paymentData.payment_method_id;
      dbPayment.card_last_four = paymentData.card_last_four;
      dbPayment.raw_response = paymentData.raw;
      await dbPayment.save();
    }

    // Log status history
    await OrderStatusHistory.create({
      order_id: order.id,
      status: newOrderStatus,
      comment: `Webhook Mercado Pago: Estado ${paymentData.status} (ID: ${paymentData.id})`,
      created_by_user_id: order.user_id
    });

    logger.info(`✅ [PaymentController] Order #${order.order_number} status updated to '${newOrderStatus}' via Webhook.`);

    // If order was newly transitioned to 'paid', send confirmation email & NubeFact invoice
    if (newOrderStatus === 'paid' && previousStatus !== 'paid') {
      // 1. Send Order Confirmation Email
      try {
        const recipientEmail = order.user?.email;
        if (recipientEmail) {
          await emailService.sendOrderConfirmation(recipientEmail, order);
        }
      } catch (emailErr) {
        logger.error('[PaymentController] Error sending order confirmation email via Webhook:', emailErr);
      }

      // 2. Trigger NubeFact Electronic Invoicing
      try {
        await nubeFactService.generateInvoiceForOrder(order.id);
      } catch (invoiceErr) {
        logger.error('[PaymentController] Error emitting NubeFact invoice via Webhook:', invoiceErr);
      }
    }
  } catch (error) {
    logger.error('❌ [PaymentController.handleWebhook Error]:', error);
  }
};
