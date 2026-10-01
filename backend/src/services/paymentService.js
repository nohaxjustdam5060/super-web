const { preferenceClient, paymentClient } = require('../config/mercadopago');
const logger = require('../config/logger');

/**
 * Universal helper to call Mercado Pago REST API with production access token,
 * structured logging, error handling, and X-Request-Id tracking.
 */
async function callMercadoPagoApi(path, options = {}) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    logger.error('[MP API Error] MP_ACCESS_TOKEN no está configurado en las variables de entorno.');
    throw new Error('MP_ACCESS_TOKEN no está configurado');
  }

  const url = path.startsWith('http') ? path : `https://api.mercadopago.com${path}`;
  const method = options.method || 'GET';

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });

    const requestId = response.headers.get('x-request-id') || response.headers.get('X-Request-Id') || 'N/A';
    const responseText = await response.text();

    let data = null;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = responseText;
    }

    if (!response.ok) {
      logger.error(`[MP API Error] ${method} ${url} | Status HTTP: ${response.status} | X-Request-Id: ${requestId} | Error Body: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
      const err = new Error(`Mercado Pago API Error (${response.status})`);
      err.status = response.status;
      err.requestId = requestId;
      err.data = data;
      throw err;
    }

    return { data, requestId, status: response.status };
  } catch (error) {
    if (!error.status) {
      logger.error(`[MP API Error] ${method} ${url} | Excepción: ${error.message}`);
    }
    throw error;
  }
}

class PaymentService {
  /**
   * Create Checkout Pro Preference for hosted Mercado Pago payment redirect
   */
  async createPreference(order) {
    try {
      logger.info(`[MP preference] Creating Checkout Pro Preference for Order #${order.order_number} (${order.id})`);

      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
      const backendUrl = process.env.BACKEND_URL;

      const items = (order.items || []).map((item) => ({
        id: item.sku || item.product_id || item.id,
        title: item.product_name,
        quantity: Number(item.quantity) || 1,
        unit_price: parseFloat((Number(item.unit_price) || 0).toFixed(2)),
        currency_id: 'PEN'
      }));

      // Include shipping cost if applicable
      const shippingCost = parseFloat((Number(order.shipping_cost) || 0).toFixed(2));
      if (shippingCost > 0) {
        items.push({
          id: 'SHIPPING',
          title: order.shipping_method || 'Envío de Pedido',
          quantity: 1,
          unit_price: shippingCost,
          currency_id: 'PEN'
        });
      }

      // Include gateway surcharge (5%) if applicable
      const subtotal = Number(order.subtotal) || 0;
      const discount = Number(order.discount_amount) || 0;
      const baseAmount = Math.max(0, parseFloat((subtotal - discount + shippingCost).toFixed(2)));
      const isMercadoPago = order.payment_method === 'mercadopago' || !order.payment_method;
      const surcharge = isMercadoPago ? parseFloat((baseAmount * 0.05).toFixed(2)) : 0;
      if (surcharge > 0) {
        items.push({
          id: 'GATEWAY_SURCHARGE',
          title: 'Recargo por pasarela de pago (5%)',
          quantity: 1,
          unit_price: surcharge,
          currency_id: 'PEN'
        });
      }

      const itemsTotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      const calculatedTotal = parseFloat(itemsTotal.toFixed(2));

      // Determine environment (Sandbox/Dev vs Production)
      const isProduction = process.env.NODE_ENV === 'production';

      const recipientName = order.shipping_address?.recipient_name || order.user?.name || 'Cliente';
      const recipientEmail = order.user?.email || 'cliente@example.com';
      let payer = undefined;
      if (isProduction) {
        payer = {
          name: recipientName,
          email: recipientEmail
        };
      } else {
        payer = {
          email: recipientEmail
        };
      }

      const externalReference = order.order_number || String(order.id);

      const preferenceBody = {
        items,
        external_reference: externalReference,
        ...(payer ? { payer } : {}),
        back_urls: {
          success: `${frontendUrl}/checkout/success?order_id=${order.id}`,
          failure: `${frontendUrl}/checkout/failure?order_id=${order.id}`,
          pending: `${frontendUrl}/checkout/pending?order_id=${order.id}`
        },
        auto_return: 'approved',
        notification_url: `${backendUrl}/api/payments/webhook`,
        statement_descriptor: 'SUPERLAPTOP'
      };

      // Diagnostic logging required by Task 4:
      // payer.email, back_urls, auto_return, items (title, quantity, unit_price, currency_id), expires/expiration_date_to, external_reference
      logger.info(`[MP preference] CREATE PREFERENCE PAYLOAD:\n` + JSON.stringify({
        external_reference: preferenceBody.external_reference,
        order_id: order.id,
        order_number: order.order_number,
        order_total: order.total,
        items_calculated_total: calculatedTotal,
        payer: {
          email: recipientEmail,
          name: recipientName
        },
        back_urls: preferenceBody.back_urls,
        auto_return: preferenceBody.auto_return,
        items: items.map(i => ({
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
          currency_id: i.currency_id
        })),
        expires: preferenceBody.expires || null,
        expiration_date_to: preferenceBody.expiration_date_to || null,
        notification_url: preferenceBody.notification_url,
        environment: isProduction ? 'production' : 'sandbox/development'
      }, null, 2));

      const response = await preferenceClient.create({ body: preferenceBody });

      const resolvedInitPoint = isProduction
        ? (response.init_point || response.sandbox_init_point)
        : (response.sandbox_init_point || response.init_point);

      logger.info(`[MP preference] PREFERENCE CREADA EXITOSAMENTE:\n` + JSON.stringify({
        id: response.id,
        external_reference: response.external_reference,
        environment: isProduction ? 'production' : 'sandbox/development',
        resolved_init_point: resolvedInitPoint,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point
      }, null, 2));

      return {
        id: response.id,
        init_point: resolvedInitPoint,
        sandbox_init_point: response.sandbox_init_point,
        external_reference: response.external_reference
      };
    } catch (error) {
      logger.error('[MP preference] Error creando MercadoPago Checkout Pro Preference:', error);
      throw error;
    }
  }

  /**
   * Diagnostic fetch for merchant_orders/{id} using production Access Token (Task 2)
   */
  async getMerchantOrder(merchantOrderId) {
    try {
      logger.info(`[MP merchant_order] Consultando GET /merchant_orders/${merchantOrderId}`);
      const { data: orderData, requestId } = await callMercadoPagoApi(`/merchant_orders/${merchantOrderId}`);

      const paymentsArr = orderData.payments || [];

      logger.info(`[MP merchant_order] RESPUESTA COMPLETA DE MERCHANT ORDER #${merchantOrderId} (Request ID: ${requestId}):\n` + JSON.stringify({
        id: orderData.id,
        order_status: orderData.order_status || orderData.status,
        preference_id: orderData.preference_id,
        external_reference: orderData.external_reference,
        total_amount: orderData.total_amount,
        paid_amount: orderData.paid_amount,
        payments: paymentsArr,
        payer: orderData.payer || null,
        raw_order: orderData
      }, null, 2));

      if (!paymentsArr || paymentsArr.length === 0) {
        logger.warn('[MP merchant_order] merchant_order sin pagos: el intento falló antes de crear el pago');
      } else {
        logger.info(`[MP merchant_order] merchant_order #${merchantOrderId} contiene ${paymentsArr.length} pago(s). Consultando cada uno...`);
      }

      return orderData;
    } catch (error) {
      logger.error(`[MP merchant_order] Error consultando merchant_order #${merchantOrderId}:`, error.message);
      throw error;
    }
  }

  /**
   * Diagnostic fetch for payments/{id} (Task 3 & 6)
   */
  async getPaymentStatusDiagnostic(paymentId) {
    try {
      logger.info(`[MP payment] Consultando GET /v1/payments/${paymentId}`);
      const { data: response, requestId } = await callMercadoPagoApi(`/v1/payments/${paymentId}`);

      const paymentInfo = {
        id: response.id ? String(response.id) : String(paymentId),
        status: response.status,
        status_detail: response.status_detail,
        payment_method_id: response.payment_method_id,
        payment_type_id: response.payment_type_id || response.payment_type || null,
        transaction_amount: response.transaction_amount,
        external_reference: response.external_reference,
        payer: {
          email: response.payer?.email || null
        },
        date_created: response.date_created,
        card_last_four: response.card?.last_four_digits || null,
        raw: response
      };

      logger.info(`[MP payment] DETALLE DE PAGO #${paymentId} (Request ID: ${requestId}):\n` + JSON.stringify({
        id: paymentInfo.id,
        status: paymentInfo.status,
        status_detail: paymentInfo.status_detail,
        payment_method_id: paymentInfo.payment_method_id,
        payment_type_id: paymentInfo.payment_type_id,
        transaction_amount: paymentInfo.transaction_amount,
        external_reference: paymentInfo.external_reference,
        payer_email: paymentInfo.payer.email,
        date_created: paymentInfo.date_created
      }, null, 2));

      return paymentInfo;
    } catch (error) {
      logger.error(`[MP payment] Error consultando pago #${paymentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Standard Payment.get wrapper for backward compatibility
   */
  async getPaymentStatus(paymentId) {
    return await this.getPaymentStatusDiagnostic(paymentId);
  }

  /**
   * Search payments by external_reference (Task 5)
   */
  async searchPaymentsByExternalReference(externalReference) {
    try {
      logger.info(`[MP search] Buscando pagos con GET /v1/payments/search?external_reference=${externalReference}`);
      const endpoint = `/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&sort=date_created&criteria=desc`;
      const { data: searchData, requestId } = await callMercadoPagoApi(endpoint);

      const results = (searchData.results || []).map((p) => ({
        id: String(p.id),
        status: p.status,
        status_detail: p.status_detail,
        payment_method_id: p.payment_method_id,
        payment_type_id: p.payment_type_id || p.payment_type || null,
        transaction_amount: p.transaction_amount,
        external_reference: p.external_reference,
        payer_email: p.payer?.email || null,
        date_created: p.date_created
      }));

      logger.info(`[MP search] RESULTADOS DE BÚSQUEDA PARA external_reference="${externalReference}" (Request ID: ${requestId}) - Total: ${searchData.paging?.total || results.length}:\n` + JSON.stringify({
        total: searchData.paging?.total || results.length,
        results
      }, null, 2));

      return {
        total: searchData.paging?.total || results.length,
        results,
        paging: searchData.paging,
        raw: searchData
      };
    } catch (error) {
      logger.error(`[MP search] Error en búsqueda de pagos para external_reference="${externalReference}":`, error.message);
      throw error;
    }
  }
}

module.exports = new PaymentService();
