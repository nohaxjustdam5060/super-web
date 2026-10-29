const { Op } = require('sequelize');
const { Cart, CartItem, Product, ProductImage, User, Order } = require('../models');
const emailService = require('./emailService');
const logger = require('../config/logger');

class CartReminderService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    // Check every hour (3600000 ms) by default, or configurable via env
    this.checkIntervalMs = Number(process.env.CART_REMINDER_CHECK_INTERVAL_MS) || (60 * 60 * 1000);
    // 24 hours threshold in milliseconds (configurable for testing)
    this.reminderDelayMs = Number(process.env.CART_REMINDER_DELAY_MS) || (24 * 60 * 60 * 1000);
  }

  /**
   * Main processor for abandoned cart email reminders
   */
  async processAbandonedCarts() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();

      // Find all carts with an identified user that haven't exhausted reminders (sent < 2)
      const carts = await Cart.findAll({
        where: {
          user_id: { [Op.ne]: null },
          abandoned_emails_sent: { [Op.lt]: 2 }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'first_name', 'last_name', 'email', 'is_active']
          },
          {
            model: CartItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'slug', 'price', 'offer_price', 'stock', 'is_active'],
                include: [{ model: ProductImage, as: 'images' }]
              }
            ]
          }
        ]
      });

      if (!carts || carts.length === 0) {
        return;
      }

      for (const cart of carts) {
        try {
          // 1. Validate user existence and active status
          if (!cart.user || !cart.user.email || cart.user.is_active === false) {
            continue;
          }

          // 2. If cart has no items at all, nothing to remind
          if (!cart.items || cart.items.length === 0) {
            continue;
          }

          // 3. Check if user already placed an order after the cart's last update
          const recentOrder = await Order.findOne({
            where: {
              user_id: cart.user_id,
              createdAt: { [Op.gte]: cart.updatedAt }
            }
          });

          if (recentOrder) {
            // User already completed a checkout! Clean up leftover cart items
            await CartItem.destroy({ where: { cart_id: cart.id } });
            cart.abandoned_emails_sent = 0;
            await cart.save();
            continue;
          }

          // 4. Filter active products with current available stock > 0
          const validItems = cart.items
            .filter((item) => item.product && item.product.is_active && item.product.stock > 0)
            .map((item) => {
              const p = item.product;
              const primaryImg = p.images?.find((img) => img.is_primary)?.image_url || p.images?.[0]?.image_url || null;
              return {
                id: p.id,
                name: p.name,
                price: Number(p.offer_price || p.price),
                quantity: Math.min(item.quantity, p.stock),
                image_url: primaryImg
              };
            });

          // If all products in the cart are out of stock, pause reminders so we don't spam
          if (validItems.length === 0) {
            cart.abandoned_emails_sent = 2;
            await cart.save();
            logger.info(`[CartReminderService] Carrito ${cart.id} sin stock disponible. Pausando recordatorios.`);
            continue;
          }

          // 5. Check Timing Rules
          const currentSent = cart.abandoned_emails_sent || 0;
          let shouldSend = false;
          let nextReminderNumber = currentSent + 1;

          if (currentSent === 0) {
            // First reminder: At least 24 hours of inactivity since last cart update
            const elapsedSinceUpdate = now.getTime() - new Date(cart.updatedAt).getTime();
            if (elapsedSinceUpdate >= this.reminderDelayMs) {
              shouldSend = true;
            }
          } else if (currentSent === 1) {
            // Second reminder: At least 24 hours since the 1st email was sent
            const referenceTime = cart.last_abandoned_email_at 
              ? new Date(cart.last_abandoned_email_at).getTime()
              : new Date(cart.updatedAt).getTime();
            const elapsedSinceLastEmail = now.getTime() - referenceTime;
            if (elapsedSinceLastEmail >= this.reminderDelayMs) {
              shouldSend = true;
            }
          }

          // 6. Send email if criteria met
          if (shouldSend) {
            logger.info(`[CartReminderService] Enviando recordatorio #${nextReminderNumber} a ${cart.user.email} (cart: ${cart.id})`);
            const success = await emailService.sendAbandonedCartReminder(cart.user, validItems, nextReminderNumber);

            if (success) {
              cart.abandoned_emails_sent = nextReminderNumber;
              cart.last_abandoned_email_at = new Date();
              await cart.save();
              logger.info(`[CartReminderService] Recordatorio #${nextReminderNumber} enviado y registrado con éxito para ${cart.user.email}`);
            } else {
              logger.warn(`[CartReminderService] Falló el envío de correo de carrito abandonado para ${cart.user.email}`);
            }
          }
        } catch (itemErr) {
          logger.error(`[CartReminderService] Error procesando carrito individual ${cart?.id}:`, itemErr);
        }
      }
    } catch (err) {
      logger.error('[CartReminderService] Error general en processAbandonedCarts:', err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start recurring background timer
   */
  start() {
    if (this.intervalId) return;

    logger.info(`⏰ [CartReminderService] Iniciando servicio de recuperación de carritos (Revisión cada ${Math.round(this.checkIntervalMs / 60000)} min, espera entre envíos: ${Math.round(this.reminderDelayMs / 3600000)}h)`);

    // Run first check 2 minutes after server boot to allow full startup
    setTimeout(() => {
      this.processAbandonedCarts().catch((err) => {
        logger.error('[CartReminderService] Error en primera ejecución:', err);
      });
    }, 2 * 60 * 1000);

    // Schedule regular check interval
    this.intervalId = setInterval(() => {
      this.processAbandonedCarts().catch((err) => {
        logger.error('[CartReminderService] Error en intervalo periódico:', err);
      });
    }, this.checkIntervalMs);
  }

  /**
   * Stop recurring timer
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('🛑 [CartReminderService] Servicio de recordatorios detenido.');
    }
  }
}

module.exports = new CartReminderService();
