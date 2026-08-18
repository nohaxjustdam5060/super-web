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
        unit_price: Number(item.unit_price) || 0,
        currency_id: 'PEN'
      }));

      // Include shipping cost if applicable
      const shippingCost = Number(order.shipping_cost) || 0;
      if (shippingCost > 0) {
        items.push({
          id: 'SHIPPING',
          title: order.shipping_method || 'Envío de Pedido',
          quantity: 1,
          unit_price: shippingCost,
          currency_id: 'PEN'
        });
      }

      const recipientName = order.shipping_address?.recipient_name || order.user?.name || 'Cliente';
      const recipientEmail = order.user?.email || 'cliente@example.com';

      const isHttpsFrontend = frontendUrl.startsWith('https://');
      {/*
          success: `${frontendUrl}/checkout/success?order_id=${order.id}`,
          failure: `${frontendUrl}/checkout/failure?order_id=${order.id}`,
          pending: `${frontendUrl}/checkout/pending?order_id=${order.id}`
          */}
      const preferenceBody = {
        items,
        external_reference: String(order.id),
        payer: {
          name: recipientName,
          email: recipientEmail
        },
        back_urls: {
          
          success: 'https://www.youtube.com',
          failure: 'https://www.youtube.com',
          pending: 'https://www.youtube.com'
        },
        notification_url: `${backendUrl}/api/payments/webhook`,
        statement_descriptor: 'SUPER TECH'
      };

      console.log('👉 [LOG PASO 1 - MERCPAGO CREATE PREFERENCE PAYLOAD]:', {
        order_id: order.id,
        order_number: order.order_number,
        total: order.total,
        items_count: items.length,
        notification_url: preferenceBody.notification_url
      });

      const response = await preferenceClient.create({ body: preferenceBody });

      console.log('✅ [LOG PASO 2 - PREFERENCE CREADA EXITOSAMENTE]:', {
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point
      });

      return {
        id: response.id,
        init_point: response.init_point || response.sandbox_init_point,
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
