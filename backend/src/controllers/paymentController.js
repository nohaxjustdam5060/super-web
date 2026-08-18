const crypto = require('crypto');
const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');
const nubeFactService = require('../services/nubeFactService');
const sequelize = require('../config/database');
const { Transaction } = require('sequelize');
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
 * Uses row-locking and Managed Transactions to prevent race conditions.
 */
exports.handleWebhook = async (req, res, next) => {
  // Respond 200 OK immediately to Mercado Pago to avoid retries
  console.log('🔔 [WEBHOOK RECIBIDO]', new Date().toISOString());
  res.status(200).send('OK');

  try {
    const body = req.body || {};
    const query = req.query || {};

    logger.info('[PaymentController] Webhook payload:', { body, query, headers: req.headers });

    const topic = query.topic || query.type || body.type || body.action || '';
    const paymentId = body.data?.id || query['data.id'] || query.id || body.id;

    // Filter out merchant_order events or events without a valid payment ID
    if (topic === 'merchant_order' || topic.includes('merchant_order')) {
      logger.info(`[PaymentController] Evento 'merchant_order' (${paymentId}) omitido intencionalmente.`);
      return;
    }

    if (!paymentId) {
      logger.info('[PaymentController] Webhook recibido sin payment ID, ignorando.');
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
    let paymentData;
    try {
      paymentData = await paymentService.getPaymentStatus(paymentId);
    } catch (mpErr) {
      logger.warn(`[PaymentController] No se pudo obtener el pago ${paymentId} de Mercado Pago (ID no corresponde a un pago válido):`, mpErr.message || mpErr);
      return;
    }

    if (!paymentData || !paymentData.external_reference) {
      logger.warn(`[PaymentController] Webhook payment ${paymentId} no tiene external_reference, ignorando.`);
      return;
    }

    const orderId = paymentData.external_reference;

    let shouldTriggerActions = false;
    let targetOrder = null;

    // Use a Managed Sequelize Transaction with Row Locking (Transaction.LOCK.UPDATE without outer join)
    await sequelize.transaction(async (t) => {
      const order = await Order.findByPk(orderId, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!order) {
        logger.error(`[PaymentController] Orden #${orderId} referenciada en pago ${paymentId} no encontrada.`);
        return;
      }

      // Idempotency check inside row-locked transaction: prevent duplicate processing
      if (order.mp_payment_id === String(paymentData.id) && order.status === 'paid' && paymentData.status === 'approved') {
        logger.info(`[PaymentController] Orden #${order.order_number} ya fue procesada anteriormente para el pago ${paymentData.id}.`);
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
      await order.save({ transaction: t });

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
        },
        transaction: t
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
        await dbPayment.save({ transaction: t });
      }

      // Log status history
      await OrderStatusHistory.create({
        order_id: order.id,
        status: newOrderStatus,
        comment: `Webhook Mercado Pago: Estado ${paymentData.status} (ID: ${paymentData.id})`,
        created_by_user_id: order.user_id
      }, { transaction: t });

      logger.info(`✅ [PaymentController] Orden #${order.order_number} actualizada a '${newOrderStatus}' vía Webhook.`);

      if (newOrderStatus === 'paid' && previousStatus !== 'paid') {
        shouldTriggerActions = true;
        targetOrder = order;
      }
    });

    // Execute secondary actions (email & NubeFact console output) AFTER transaction finishes cleanly
    if (shouldTriggerActions && targetOrder) {
      // Re-fetch order with associations for email & invoice generation
      const fullOrder = await Order.findByPk(targetOrder.id, {
        include: [
          { model: OrderItem, as: 'items' },
          { model: User, as: 'user' }
        ]
      });

      // 1. Send Order Confirmation Email
      try {
        const recipientEmail = fullOrder?.user?.email;
        if (recipientEmail && fullOrder) {
          await emailService.sendOrderConfirmation(recipientEmail, fullOrder);
        }
      } catch (emailErr) {
        logger.error('[PaymentController] Error enviando email de confirmación vía Webhook:', emailErr);
      }

      // 2. Trigger NubeFact Electronic Invoicing (Logs response to console)
      try {
        await nubeFactService.generateInvoiceForOrder(targetOrder.id);
      } catch (invoiceErr) {
        logger.error('[PaymentController] Error emitiendo factura NubeFact vía Webhook:', invoiceErr);
      }
    }
  } catch (error) {
    logger.error('❌ [PaymentController.handleWebhook Error]:', error);
  }
};
