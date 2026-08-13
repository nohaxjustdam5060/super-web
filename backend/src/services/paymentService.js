const { MercadoPagoConfig, Payment: MPPayment } = require('mercadopago');
const logger = require('../config/logger');

// Initialize Mercado Pago with private Access Token from environment
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000'
});

const mpPaymentInstance = new MPPayment(client);

class PaymentService {
  /**
   * Process payment payload received from Mercado Pago Checkout Bricks
   */
  async createPayment({ transaction_amount, token, description, installments, payment_method_id, issuer_id, payer, external_reference }) {
    try {
      logger.info(`[PaymentService] Processing payment for external_reference: ${external_reference}`);
      console.log('👉 [LOG PASO 3.1 - PAYMENT SERVICE CREATE PAYMENT INICIADO]:', {
        transaction_amount,
        token: token ? `${token.substring(0, 15)}...` : 'NULL_TOKEN',
        payment_method_id,
        installments,
        issuer_id,
        payer_email: payer?.email
      });

      // Sandbox simulated approval for explicit mock tokens or test fallback mode
      if (process.env.NODE_ENV !== 'production' && token === 'mock_token_approved') {
        return {
          id: `MP-MOCK-${Date.now()}`,
          status: 'approved',
          status_detail: 'accredited',
          transaction_amount: Number(transaction_amount),
          currency_id: 'PEN',
          payment_method_id: payment_method_id || 'visa',
          card_last_four: '4242',
          date_approved: new Date().toISOString(),
          external_reference
        };
      }

      const body = {
        transaction_amount: Number(transaction_amount),
        token,
        description,
        installments: Number(installments) || 1,
        payment_method_id,
        issuer_id: issuer_id ? String(issuer_id) : undefined,
        payer: {
          email: payer?.email || 'cliente@example.com',
          first_name: payer?.first_name || 'Cliente',
          last_name: payer?.last_name || 'SUPER',
          identification: payer?.identification || undefined
        },
        external_reference,
        
      };

      try {
        const response = await mpPaymentInstance.create({ body });
        console.log('✅ [LOG PASO 3.2 - MERCADOPAGO API RESPONDIO EXITOSAMENTE]:', response);

        return {
          id: response.id.toString(),
          status: response.status,
          status_detail: response.status_detail,
          transaction_amount: response.transaction_amount,
          currency_id: response.currency_id,
          payment_method_id: response.payment_method_id,
          card_last_four: response.card?.last_four_digits || '4242',
          date_approved: response.date_approved || new Date().toISOString(),
          external_reference: response.external_reference,
          raw: response
        };
      } catch (mpError) {
        logger.warn('[PaymentService] MP API call encountered an error, falling back to Sandbox simulation for test environment:', mpError.message || mpError);
        console.log('⚠️ [LOG PASO 3.3 - FALLBACK SANDBOX ACTIVADO PARA AMBIENTE DE PRUEBAS]');
        throw mpError;
        {/*return {
          id: `MP-TEST-${Date.now()}`,
          status: 'approved',
          status_detail: 'accredited',
          transaction_amount: Number(transaction_amount),
          currency_id: 'PEN',
          payment_method_id: payment_method_id || 'visa',
          card_last_four: '4242',
          date_approved: new Date().toISOString(),
          external_reference
        }; */  }
      }

      

    } catch (error) {
      logger.error('[PaymentService] Error creating MercadoPago payment:', error);
      throw error;
    }
  }

  /**
   * Fetch payment status directly from Mercado Pago API
   */
  async getPaymentStatus(paymentId) {
    try {
      if (paymentId.startsWith('MP-MOCK-')) {
        return { status: 'approved', status_detail: 'accredited' };
      }
      const payment = await mpPaymentInstance.get({ id: paymentId });
      return {
        id: payment.id.toString(),
        status: payment.status,
        status_detail: payment.status_detail,
        external_reference: payment.external_reference
      };
    } catch (error) {
      logger.error(`[PaymentService] Error fetching payment status for ${paymentId}:`, error);
      throw error;
    }
  }

  /**
   * Handle Webhook / IPN notifications from Mercado Pago
   */
  async handleWebhook(data) {
    logger.info('[PaymentService] Webhook received payload:', data);
    const { type, action, data: eventData } = data;

    if (type === 'payment' || action === 'payment.created' || action === 'payment.updated') {
      const paymentId = eventData?.id || data?.id;
      if (paymentId) {
        return await this.getPaymentStatus(paymentId);
      }
    }
    return null;
  }
}

module.exports = new PaymentService();
