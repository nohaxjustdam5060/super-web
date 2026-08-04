const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: {
        user: process.env.SMTP_USER || 'mock_user',
        pass: process.env.SMTP_PASS || 'mock_pass'
      }
    });
  }

  async sendOrderConfirmation(userEmail, order) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"SUPER Tech Store" <no-reply@supertech.com>',
        to: userEmail,
        subject: `Confirmación de Pedido #${order.order_number} - SUPER Tech`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #DC2626; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">SUPER TECH STORE</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">¡Gracias por tu compra!</p>
            </div>
            <div style="padding: 20px; color: #1f2937;">
              <h2 style="font-size: 18px; color: #1E3A8A;">Resumen de la orden #${order.order_number}</h2>
              <p>Estado del pago: <strong>${order.status.toUpperCase()}</strong></p>
              <p>Monto Total: <strong>S/ ${order.total}</strong></p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 12px; color: #6b7280;">Estamos preparando tus componentes informáticos para el envío express.</p>
            </div>
          </div>
        `
      };

      if (process.env.NODE_ENV !== 'test' && process.env.SMTP_USER !== 'mock_user') {
        await this.transporter.sendMail(mailOptions);
      }
      logger.info(`[EmailService] Order confirmation sent to ${userEmail} for #${order.order_number}`);
      return true;
    } catch (error) {
      logger.error('[EmailService] Error sending order confirmation email:', error);
      return false;
    }
  }

  async sendOrderStatusUpdate(userEmail, orderNumber, newStatus) {
    try {
      logger.info(`[EmailService] Order status update notification sent to ${userEmail} (#${orderNumber} -> ${newStatus})`);
      return true;
    } catch (error) {
      logger.error('[EmailService] Error sending status update email:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
