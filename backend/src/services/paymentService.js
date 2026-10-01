const { preferenceClient, paymentClient } = require('../config/mercadopago');
const logger = require('../config/logger');

class PaymentService {
  /**
   * Create Checkout Pro Preference for hosted Mercado Pago payment redirect
   */
  async createPreference(order) {
    try {
      logger.info(`[PaymentService] Creating Checkout Pro Preference for Order #${order.order_number} (${order.id})`);

      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
      const backendUrl = process.env.BACKEND_URL ;

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

      // In Sandbox/Dev, omit payer object to avoid self-purchase / invalid account locks
      let payer = undefined;
      if (isProduction) {
        const recipientName = order.shipping_address?.recipient_name || order.user?.name || 'Cliente';
        const recipientEmail = order.user?.email || 'cliente@example.com';
        payer = {
          name: recipientName,
          email: recipientEmail
        };
      }

      const preferenceBody = {
        items,
        external_reference: String(order.id),
        ...(payer ? { payer } : {}),
        back_urls: {
          success: `${frontendUrl}/checkout/success?order_id=${order.id}`,
          failure: `${frontendUrl}/checkout/failure?order_id=${order.id}`,
          pending: `${frontendUrl}/checkout/pending?order_id=${order.id}`
        },
        notification_url: `${backendUrl}/api/payments/webhook`,
        statement_descriptor: 'SUPERLAPTOP'
      };

      console.log('👉 [LOG PASO 1 - MERCPAGO CREATE PREFERENCE PAYLOAD]:', {
        order_id: order.id,
        order_number: order.order_number,
        order_total: order.total,
        items_calculated_total: calculatedTotal,
        items_count: items.length,
        has_payer: Boolean(payer),
        environment: isProduction ? 'production' : 'sandbox/development',
        notification_url: preferenceBody.notification_url
      });

      const response = await preferenceClient.create({ body: preferenceBody });

      const resolvedInitPoint = isProduction
        ? (response.init_point || response.sandbox_init_point)
        : (response.sandbox_init_point || response.init_point);

      console.log('✅ [LOG PASO 2 - PREFERENCE CREADA EXITOSAMENTE]:', {
        id: response.id,
        environment: isProduction ? 'production' : 'sandbox/development',
        resolved_init_point: resolvedInitPoint,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point
      });

      return {
        id: response.id,
        init_point: resolvedInitPoint,
        sandbox_init_point: response.sandbox_init_point,
        external_reference: response.external_reference
      };
    } catch (error) {
      logger.error('[PaymentService] Error creating MercadoPago Checkout Pro Preference:', error);
      throw error;
    }
  }

  /**
   * Fetch payment status directly from Mercado Pago API using Payment.get({ id })
   */
  async getPaymentStatus(paymentId) {
    try {
      logger.info(`[PaymentService] Fetching Payment.get for paymentId: ${paymentId}`);

      const response = await paymentClient.get({ id: String(paymentId) });

      return {
        id: response.id.toString(),
        status: response.status,
        status_detail: response.status_detail,
        external_reference: response.external_reference,
        transaction_amount: response.transaction_amount,
        payment_method_id: response.payment_method_id,
        payment_type_id: response.payment_type_id || response.payment_type || null,
        card_last_four: response.card?.last_four_digits || null,
        raw: response
      };
    } catch (error) {
      logger.error(`[PaymentService] Error fetching payment status for ${paymentId}:`, error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
