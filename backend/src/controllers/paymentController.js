const crypto = require('crypto');
const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');
const sequelize = require('../config/database');
const { Transaction } = require('sequelize');
const { Order, OrderItem, Payment, OrderStatusHistory, User } = require('../models');
const orderService = require('../services/orderService');
const logger = require('../config/logger');

const cuadradoSyncService = require('../services/cuadradoSyncService');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Shared helper function to update order status, store payment record, and trigger Resend email & stock decrement.
 * Ensures idempotency via row-locking transaction.
 * Supports order lookup by UUID (id) OR order_number (SUP-XXXX).
 */
async function processSuccessfulOrder(orderIdOrNumber, paymentData) {
  let shouldTriggerActions = false;
  let targetOrder = null;
  let isAlreadyProcessed = false;

  await sequelize.transaction(async (t) => {
    const isUuid = UUID_REGEX.test(orderIdOrNumber);
    const order = await Order.findOne({
      where: isUuid ? { id: orderIdOrNumber } : { order_number: orderIdOrNumber },
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (!order) {
      throw new Error(`Orden '${orderIdOrNumber}' no encontrada en la base de datos.`);
    }

    // Idempotency check inside row-locked transaction: prevent duplicate processing
    if (order.mp_payment_id === String(paymentData.id) && order.status === 'paid' && paymentData.status === 'approved') {
      logger.info(`[PaymentController] Orden #${order.order_number} ya fue procesada anteriormente para el pago ${paymentData.id}.`);
      isAlreadyProcessed = true;
      targetOrder = order;
      return;
    }

    const previousStatus = order.status;

    // Map Mercado Pago status to Order status with 24-hour grace period for pending orders
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isWithinGracePeriod = new Date(order.createdAt) > twentyFourHoursAgo;

    let newOrderStatus = order.status;
    if (paymentData.status === 'approved') {
      newOrderStatus = 'paid';
    } else if (['in_process', 'pending', 'authorized'].includes(paymentData.status)) {
      newOrderStatus = 'payment_review';
    } else if (['rejected', 'cancelled'].includes(paymentData.status)) {
      // Only mark as cancelled if 24 hours have passed since order creation
      if (!isWithinGracePeriod) {
        newOrderStatus = 'cancelled';
      } else {
        logger.info(`[PaymentController] Pago rechazado/cancelado para la orden #${order.order_number}. Se mantiene en 'pending' durante el periodo de reserva de 24h.`);
        newOrderStatus = 'pending';
      }
    } else if (['refunded', 'charged_back'].includes(paymentData.status)) {
      newOrderStatus = 'refunded';
    }

    order.mp_payment_id = String(paymentData.id);
    order.status = newOrderStatus;
    if (paymentData.payment_type_id || paymentData.raw?.payment_type_id) {
      order.payment_method_detail = paymentData.payment_type_id || paymentData.raw?.payment_type_id;
    }
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
      comment: `Mercado Pago: Estado ${paymentData.status} (ID: ${paymentData.id})`,
      created_by_user_id: order.user_id
    }, { transaction: t });

    logger.info(`✅ [PaymentController] Orden #${order.order_number} actualizada a '${newOrderStatus}'.`);

    targetOrder = order;
    if (newOrderStatus === 'paid' && previousStatus !== 'paid') {
      shouldTriggerActions = true;
    }
  });

  // Execute secondary actions (email & Cuadrado ERP stock decrement) AFTER transaction finishes cleanly
  if (shouldTriggerActions && targetOrder) {
    const fullOrder = await Order.findByPk(targetOrder.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'user' }
      ]
    });

    const recipientEmail = fullOrder?.user?.email;

    // Ejecutar tareas secundarias en paralelo para reducir la latencia
    const emailPromise = (recipientEmail && fullOrder)
      ? emailService.sendOrderConfirmation(recipientEmail, fullOrder)
          .catch((emailErr) => logger.error(`[PaymentController] Error enviando email de confirmación: ${emailErr.message}`))
      : Promise.resolve();

    const stockDecrementPromise = fullOrder
      ? cuadradoSyncService.decrementStockForOrder(fullOrder)
          .catch((stockErr) => logger.error(`[PaymentController] Error decrementando stock en Cuadrado: ${stockErr.message}`))
      : Promise.resolve();

    await Promise.allSettled([emailPromise, stockDecrementPromise]);
  }

  return {
    alreadyProcessed: isAlreadyProcessed,
    order: targetOrder
  };
}

/**
 * Create Mercado Pago Checkout Pro Preference and return init_point redirect URL
 */
exports.createPreference = async (req, res, next) => {
  try {
    const { order_id, items, shipping_address, shipping_method, shipping_cost, coupon_code, invoice_info, notes } = req.body;

    let order = null;
    let preference = null;

    if (order_id) {
      // Legacy flow with existing order
      order = await Order.findByPk(order_id, {
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

      // Ensure payment_method is mercadopago and total includes 5% surcharge
      const subtotal = Number(order.subtotal) || 0;
      const discount = Number(order.discount_amount) || 0;
      const shippingCost = Number(order.shipping_cost) || 0;
      const baseAmount = Math.max(0, subtotal - discount + shippingCost);
      const surcharge = parseFloat((baseAmount * 0.05).toFixed(2));
      order.payment_method = 'mercadopago';
      order.total = parseFloat((baseAmount + surcharge).toFixed(2));

      preference = await paymentService.createPreference(order);

      order.preference_id = preference.id;
      await order.save();
    } else {
      // Consolidated atomic flow: create order and MP preference in a managed transaction
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
          payment_method: 'mercadopago',
          coupon_code,
          notes,
          status: 'pending',
          statusComment: 'Orden creada para pago con Mercado Pago (Checkout Pro)',
          transaction: t
        });

        // Ensure user and items are attached on the order object for createPreference
        order.items = order.getDataValue('items');
        order.user = order.getDataValue('user') || { name: req.user.name, email: req.user.email };

        // Create Mercado Pago Preference
        preference = await paymentService.createPreference(order);

        // Update preference_id in DB within the transaction
        order.preference_id = preference.id;
        await order.save({ transaction: t });
      });
    }

    return res.json({
      success: true,
      message: 'Preferencia de Mercado Pago creada exitosamente.',
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      order
    });
  } catch (error) {
    logger.error('❌ [paymentController.createPreference Error]:', error);
    next(error);
  }
};

/**
 * Synchronous Payment Verification Endpoint (POST /api/payments/verify-and-fulfill)
 * Fetches real payment status from Mercado Pago via Payment.get({ id })
 * If approved, performs idempotent order update, triggers Resend email confirmation, and returns order status.
 */
exports.verifyAndFulfill = async (req, res, next) => {
  try {
    const { paymentId, payment_id, orderId, order_id } = req.body;
    const targetPaymentId = paymentId || payment_id;
    const targetOrderId = orderId || order_id;

    if (!targetPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'No se especificó el ID del pago (paymentId).'
      });
    }

    logger.info(`[PaymentController.verifyAndFulfill] Verificando síncronamente pago ${targetPaymentId} para orden ${targetOrderId || 'N/A'}`);

    // Fetch real payment status directly from Mercado Pago API using Payment.get()
    const paymentData = await paymentService.getPaymentStatusDiagnostic(targetPaymentId);

    if (!paymentData) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado en Mercado Pago.'
      });
    }

    // Verify if payment status is approved
    if (paymentData.status !== 'approved') {
      logger.info(`[PaymentController.verifyAndFulfill] Pago ${targetPaymentId} no está aprobado. Estado actual: ${paymentData.status}`);
      return res.status(400).json({
        success: false,
        message: `El pago no fue aprobado. Estado de Mercado Pago: ${paymentData.status}`,
        payment_status: paymentData.status,
        status_detail: paymentData.status_detail
      });
    }

    // Determine target order ID from request body or external_reference
    const finalOrderId = targetOrderId || paymentData.external_reference;

    if (!finalOrderId) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo asociar el pago a ninguna orden de compra.'
      });
    }

    // Execute idempotent order fulfillment
    const result = await processSuccessfulOrder(finalOrderId, paymentData);

    const isUuid = UUID_REGEX.test(finalOrderId);
    const fullOrder = await Order.findOne({
      where: isUuid ? { id: finalOrderId } : { order_number: finalOrderId },
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'user' }
      ]
    });

    if (result.alreadyProcessed) {
      return res.json({
        success: true,
        message: 'La orden ya fue procesada previamente.',
        already_processed: true,
        order: fullOrder
      });
    }

    return res.json({
      success: true,
      message: 'Pago verificado exitosamente y orden procesada.',
      already_processed: false,
      order: fullOrder
    });
  } catch (error) {
    logger.error('❌ [PaymentController.verifyAndFulfill Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al verificar el pago con Mercado Pago.'
    });
  }
};

/**
 * Handle Mercado Pago Webhook / IPN Notifications
 * Responds 200 OK immediately and processes merchant_orders or payments asynchronously (Task 1, 2, 3, 6).
 */
exports.handleWebhook = async (req, res, next) => {
  // Respond 200 OK immediately to Mercado Pago to avoid retries (Task 6)
  console.log('🔔 [WEBHOOK RECIBIDO]', new Date().toISOString());
  res.status(200).send('OK');

  // Asynchronous diagnostic execution without blocking response
  (async () => {
    try {
      const body = req.body || {};
      const query = req.query || {};
      const headers = req.headers || {};

      // Task 1: Webhook payload logging with full stringified JSON, query, and headers
      const xRequestId = headers['x-request-id'] || headers['X-Request-Id'] || 'N/A';
      const xSignature = headers['x-signature'] || headers['X-Signature'] || 'N/A';

      logger.info(`[MP webhook] NOTIFICACIÓN RECIBIDA:\n` + JSON.stringify({
        body,
        query,
        headers: {
          'x-request-id': xRequestId,
          'x-signature': xSignature
        }
      }, null, 2));

      const topic = String(query.topic || query.type || body.type || body.action || '').toLowerCase();
      const resource = String(body.resource || '').toLowerCase();

      // Check if event is merchant_order (Task 2)
      const isMerchantOrder = topic.includes('merchant_order') || resource.includes('merchant_orders');

      if (isMerchantOrder) {
        let merchantOrderId = body.data?.id || query['data.id'] || query.id || body.id;
        if (!merchantOrderId && resource) {
          const parts = resource.split('/');
          merchantOrderId = parts[parts.length - 1];
        }

        if (!merchantOrderId) {
          logger.warn('[MP merchant_order] Evento merchant_order recibido sin ID de orden mercantil.');
          return;
        }

        logger.info(`[MP merchant_order] Procesando evento merchant_order #${merchantOrderId}`);
        const merchantOrderData = await paymentService.getMerchantOrder(merchantOrderId);

        // If merchant order contains payments, process each payment (Task 2 & 3)
        const payments = merchantOrderData.payments || [];
        if (payments.length > 0) {
          for (const p of payments) {
            const pId = p.id || p;
            try {
              const paymentData = await paymentService.getPaymentStatusDiagnostic(pId);
              if (paymentData && paymentData.external_reference) {
                await processSuccessfulOrder(paymentData.external_reference, paymentData);
              }
            } catch (pErr) {
              logger.error(`[MP merchant_order] Error procesando pago ${pId} asociado a merchant_order ${merchantOrderId}:`, pErr.message);
            }
          }
        }
        return;
      }

      // Check if event is payment (Task 3)
      const paymentId = body.data?.id || query['data.id'] || query.id || body.id;

      if (!paymentId) {
        logger.info('[MP webhook] Webhook recibido sin payment ID ni merchant_order ID válido, ignorando.');
        return;
      }

      // Validate Webhook Signature if MP_WEBHOOK_SECRET is configured
      const webhookSecret = process.env.MP_WEBHOOK_SECRET;
      if (webhookSecret && xSignature !== 'N/A') {
        try {
          const parts = xSignature.split(',');
          let ts = '';
          let hash = '';
          parts.forEach((part) => {
            const [key, value] = part.split('=');
            if (key?.trim() === 'ts') ts = value?.trim() || '';
            if (key?.trim() === 'v1') hash = value?.trim() || '';
          });

          let manifest = `id:${paymentId};`;
          if (xRequestId !== 'N/A') {
            manifest += `request-id:${xRequestId};`;
          }
          manifest += `ts:${ts};`;

          const calculatedHash = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');

          if (calculatedHash !== hash) {
            logger.warn(`[MP webhook] Webhook signature mismatch! Calculated: ${calculatedHash}, Received: ${hash}`);
            if (process.env.NODE_ENV === 'production') {
              logger.error('❌ [MP webhook] Rechazando webhook en producción debido a firma inválida.');
              return;
            }
          } else {
            logger.info('✅ [MP webhook] Webhook signature verified successfully.');
          }
        } catch (sigErr) {
          logger.error('[MP webhook] Error verificando firma de webhook:', sigErr);
          if (process.env.NODE_ENV === 'production') {
            return;
          }
        }
      }

      // Task 3: Process payment event diagnostic
      let paymentData;
      try {
        paymentData = await paymentService.getPaymentStatusDiagnostic(paymentId);
      } catch (mpErr) {
        logger.warn(`[MP payment] No se pudo obtener el pago ${paymentId} de Mercado Pago:`, mpErr.message || mpErr);
        return;
      }

      if (!paymentData || !paymentData.external_reference) {
        logger.warn(`[MP payment] Webhook payment ${paymentId} no tiene external_reference, ignorando.`);
        return;
      }

      const orderIdOrNumber = paymentData.external_reference;
      await processSuccessfulOrder(orderIdOrNumber, paymentData);
    } catch (error) {
      logger.error('❌ [PaymentController.handleWebhook Error]:', error);
    }
  })();
};

/**
 * Diagnostic Search Endpoint (GET /api/payments/search-debug?order_number=...) (Task 5)
 */
exports.searchDebug = async (req, res, next) => {
  try {
    const { order_number, external_reference } = req.query;
    const targetRef = order_number || external_reference;

    if (!targetRef) {
      return res.status(400).json({
        success: false,
        message: 'Por favor especifica el parámetro ?order_number=SUP-XXXX o ?external_reference=...'
      });
    }

    logger.info(`[MP search] Endpoint searchDebug llamado para order_number: ${targetRef}`);
    const searchData = await paymentService.searchPaymentsByExternalReference(targetRef);

    return res.json({
      success: true,
      order_number: targetRef,
      ...searchData
    });
  } catch (error) {
    logger.error('❌ [PaymentController.searchDebug Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al buscar pagos en Mercado Pago.'
    });
  }
};
