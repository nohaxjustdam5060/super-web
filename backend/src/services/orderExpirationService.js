const { Op } = require('sequelize');
const { Order, OrderStatusHistory } = require('../models');
const logger = require('../config/logger');

class OrderExpirationService {
  /**
   * Finds and cancels all orders with status 'pending' created more than 24 hours ago.
   */
  async cancelExpiredPendingOrders() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const expiredOrders = await Order.findAll({
        where: {
          status: 'pending',
          createdAt: {
            [Op.lt]: twentyFourHoursAgo
          }
        }
      });

      if (expiredOrders.length === 0) {
        return { cancelledCount: 0 };
      }

      logger.info(`[OrderExpirationService] Encontradas ${expiredOrders.length} órdenes pendientes expiradas (>24h). Cancelando...`);

      let cancelledCount = 0;
      for (const order of expiredOrders) {
        order.status = 'cancelled';
        await order.save();

        await OrderStatusHistory.create({
          order_id: order.id,
          status: 'cancelled',
          comment: 'Orden cancelada automáticamente por expiración del periodo de reserva de 24 horas.',
          created_by_user_id: order.user_id
        });

        logger.info(`[OrderExpirationService] Orden #${order.order_number} (${order.id}) marcada como 'cancelled'.`);
        cancelledCount++;
      }

      return { cancelledCount };
    } catch (error) {
      logger.error('[OrderExpirationService] Error cancelando órdenes expiradas:', error);
      return { cancelledCount: 0, error };
    }
  }

  /**
   * Starts a background interval timer to clean up expired orders periodically (every 15 minutes).
   */
  startExpirationCron(intervalMs = 15 * 60 * 1000) {
    logger.info('[OrderExpirationService] Iniciando servicio de expiración automática de órdenes (24 horas)...');
    
    // Execute immediately on startup
    this.cancelExpiredPendingOrders().catch((err) => {
      logger.error('[OrderExpirationService] Error en ejecución inicial de cancelaciones:', err);
    });

    // Schedule periodic interval
    const timer = setInterval(() => {
      this.cancelExpiredPendingOrders().catch((err) => {
        logger.error('[OrderExpirationService] Error en intervalo de cancelaciones:', err);
      });
    }, intervalMs);

    // Allow process to exit cleanly without waiting for timer
    timer.unref();
    return timer;
  }
}

module.exports = new OrderExpirationService();
