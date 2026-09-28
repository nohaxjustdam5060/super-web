const { Op } = require('sequelize');
const { Order, OrderStatusHistory } = require('../models');
const logger = require('../config/logger');

/**
 * Sweeps and cancels orders stuck in pending / payment_review past the 24-hour grace period
 */
async function cancelExpiredBankTransferOrders() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const expiredOrders = await Order.findAll({
      where: {
        status: { [Op.in]: ['pending', 'payment_review'] },
        createdAt: { [Op.lt]: twentyFourHoursAgo }
      }
    });

    if (expiredOrders.length === 0) {
      return { count: 0 };
    }

    logger.info(`🧹 [OrderExpirationJob] Encontradas ${expiredOrders.length} órdenes vencidas (>24h). Procediendo a cancelar...`);

    let cancelledCount = 0;
    for (const order of expiredOrders) {
      try {
        order.status = 'cancelled';
        await order.save();

        await OrderStatusHistory.create({
          order_id: order.id,
          status: 'cancelled',
          comment: 'Cancelada automáticamente: Plazo de reserva de 24h vencido sin confirmación de pago.'
        });

        cancelledCount += 1;
        logger.info(`   - Orden #${order.order_number} (${order.payment_method}) cancelada por expiración.`);
      } catch (ordErr) {
        logger.error(`   - Error al cancelar orden #${order.order_number}:`, ordErr.message);
      }
    }

    logger.info(`✅ [OrderExpirationJob] Limpieza completada: ${cancelledCount}/${expiredOrders.length} órdenes canceladas.`);
    return { count: cancelledCount };
  } catch (error) {
    logger.error('❌ [OrderExpirationJob] Error en job de expiración de órdenes:', error.message);
    return { error: error.message };
  }
}

/**
 * Initializes recurring hourly background sweeper
 */
function startOrderExpirationJob() {
  logger.info('⏰ [OrderExpirationJob] Tarea programada de expiración de órdenes (24h) iniciada.');
  
  // Run on startup
  cancelExpiredBankTransferOrders();

  // Run every 1 hour (3,600,000 ms)
  const INTERVAL_MS = 60 * 60 * 1000;
  setInterval(cancelExpiredBankTransferOrders, INTERVAL_MS);
}

module.exports = {
  cancelExpiredBankTransferOrders,
  startOrderExpirationJob
};
