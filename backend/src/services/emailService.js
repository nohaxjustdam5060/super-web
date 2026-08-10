const { Resend } = require('resend');
const logger = require('../config/logger');
const { generateOrderConfirmationHTML } = require('../utils/emailTemplates');

// Local dev certificate fallback for Windows environments with SSL interception
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

class EmailService {
  /**
   * Base function to send emails via Resend SDK
   * Resend returns { data, error } instead of throwing exceptions.
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      const fromAddress = process.env.EMAIL_FROM || 'SUPER Tech Store <onboarding@resend.dev>';

      logger.info(`[EmailService] Attempting to send email via Resend to: ${to}`);

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      });

      // Explicit error handling for Resend SDK response
      if (error) {
        logger.error('[EmailService] Resend API returned error:', error);
        return { success: false, error };
      }

      logger.info(`[EmailService] Email sent successfully via Resend. ID: ${data?.id}`);
      return { success: true, data };
    } catch (err) {
      logger.error('[EmailService] Unexpected error sending email via Resend:', err);
      return { success: false, error: err.message || err };
    }
  }

  /**
   * Order Confirmation Email
   */
  async sendOrderConfirmation(userEmail, order) {
    const subject = `Confirmación de Pedido #${order.order_number || ''} - SUPER Tech Store`;
    const html = generateOrderConfirmationHTML(order);

    const result = await this.sendEmail({ to: userEmail, subject, html });
    return result.success;
  }

  /**
   * Order Status Update Email
   */
  async sendOrderStatusUpdate(userEmail, orderNumber, newStatus) {
    const subject = `Actualización de Pedido #${orderNumber} - SUPER Tech`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1E3A8A;">Actualización de tu Pedido #${orderNumber}</h2>
        <p>El nuevo estado de tu pedido es: <strong>${newStatus.toUpperCase()}</strong></p>
        <p style="font-size: 12px; color: #6b7280;">Gracias por elegir SUPER Tech Store.</p>
      </div>
    `;

    const result = await this.sendEmail({ to: userEmail, subject, html });
    return result.success;
  }

  /**
   * Password Reset Email
   */
  async sendPasswordReset(userEmail, resetLinkOrToken) {
    const subject = 'Restablecimiento de Contraseña - SUPER Tech Store';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
        <div style="background-color: #0F172A; color: white; padding: 15px; text-align: center; border-radius: 6px;">
          <h2 style="color: #EF4444; margin: 0;">SUPER TECH STORE</h2>
        </div>
        <div style="padding: 20px 0;">
          <h3 style="color: #1F2937;">Recuperación de Contraseña</h3>
          <p style="color: #4B5563;">Has solicitado restablecer la contraseña de tu cuenta en SUPER Tech.</p>
          <p style="margin: 25px 0;">
            <a href="${resetLinkOrToken}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Restablecer Contraseña
            </a>
          </p>
          <p style="font-size: 12px; color: #9CA3AF;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        </div>
      </div>
    `;

    const result = await this.sendEmail({ to: userEmail, subject, html });
    return result.success;
  }
}

module.exports = new EmailService();
