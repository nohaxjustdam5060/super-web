const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Order, OrderItem, Product, OrderStatusHistory } = require('../models');
const logger = require('../config/logger');

class OrderExpirationService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkIntervalMs = 5 * 60 * 1000; // Cada 5 minutos
  }

  /**
   * Procesa la expiración de órdenes por transferencia bancaria (4 horas)
   * y limpia intentos abandonados de Mercado Pago (1 hora).
   */
  async processExpiredOrders() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();

      // 1. EXPIRACIÓN DE RESERVAS DE TRANSFERENCIA BANCARIA (4 HORAS)
      const expiredBankOrders = await Order.findAll({
        where: {
          status: 'payment_review',
          payment_method: 'bank_transfer',
          reservation_expires_at: {
            [Op.ne]: null,
            [Op.lte]: now
          }
        },
        include: [{ model: OrderItem, as: 'items' }]
      });

      if (expiredBankOrders.length > 0) {
        logger.info(`⏰ [OrderExpirationService] Encontradas ${expiredBankOrders.length} orden(es) por transferencia con reserva vencida.`);
      }

      for (const order of expiredBankOrders) {
        try {
          await sequelize.transaction(async (t) => {
            const freshOrder = await Order.findByPk(order.id, {
              transaction: t,
              lock: t.LOCK.UPDATE
            });

            if (!freshOrder || freshOrder.status !== 'payment_review') return;

            const orderItems = await OrderItem.findAll({
              where: { order_id: freshOrder.id },
              transaction: t
            });
            freshOrder.items = orderItems;

            // Liberar reserved_stock de los productos físicos
            const physicalItems = (freshOrder.items || []).filter((item) => {
              if (!item || !item.product_id) return false;
              const pid = String(item.product_id).toUpperCase();
              return pid !== 'SHIPPING' && pid !== 'GATEWAY_SURCHARGE' && !pid.startsWith('VIRTUAL_');
            });

            if (physicalItems.length > 0) {
              const productIds = physicalItems.map((i) => i.product_id);
              const dbProducts = await Product.findAll({
                where: { id: { [Op.in]: productIds } },
                transaction: t,
                lock: t.LOCK.UPDATE
              });

              const productMap = new Map(dbProducts.map((p) => [String(p.id), p]));

              for (const item of physicalItems) {
                const product = productMap.get(String(item.product_id));
                if (product) {
                  const reqQty = Number(item.quantity) || 1;
                  product.reserved_stock = Math.max(0, (product.reserved_stock || 0) - reqQty);
                  await product.save({ transaction: t });
                  logger.info(`[OrderExpirationService] Stock reservado liberado para "${product.name}" (-${reqQty}). Reservado actual: ${product.reserved_stock}`);
                }
              }
            }

            freshOrder.status = 'cancelled';
            freshOrder.reservation_expires_at = null;
            await freshOrder.save({ transaction: t });

            await OrderStatusHistory.create({
              order_id: freshOrder.id,
              status: 'cancelled',
              comment: 'Orden cancelada automáticamente por el sistema tras cumplirse el plazo límite de reserva de 4 horas sin verificación de comprobante.',
              created_by_user_id: freshOrder.user_id
            }, { transaction: t });

            logger.info(`✅ [OrderExpirationService] Orden #${freshOrder.order_number} cancelada exitosamente por expiración de 4h.`);
          });
        } catch (singleErr) {
          logger.error(`[OrderExpirationService] Error expirando orden #${order.order_number}:`, singleErr.message);
        }
      }

      // 2. LIMPIEZA DE INTENTOS ABANDONADOS DE MERCADO PAGO (1 HORA)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const abandonedMPOrders = await Order.findAll({
        where: {
          status: 'pending',
          payment_method: 'mercadopago',
          createdAt: {
            [Op.lte]: oneHourAgo
          }
        }
      });

      for (const mpOrder of abandonedMPOrders) {
        try {
          await sequelize.transaction(async (t) => {
            const freshMPOrder = await Order.findByPk(mpOrder.id, {
              transaction: t,
              lock: t.LOCK.UPDATE
            });

            if (!freshMPOrder || freshMPOrder.status !== 'pending') return;

            freshMPOrder.status = 'cancelled';
            await freshMPOrder.save({ transaction: t });

            await OrderStatusHistory.create({
              order_id: freshMPOrder.id,
              status: 'cancelled',
              comment: 'Intento de pago con Mercado Pago cancelado automáticamente tras 1 hora de inactividad (pasarela no completada).',
              created_by_user_id: freshMPOrder.user_id
            }, { transaction: t });

            logger.info(`🧹 [OrderExpirationService] Orden de Mercado Pago abandonada #${freshMPOrder.order_number} cancelada tras 1h.`);
          });
        } catch (mpErr) {
          logger.error(`[OrderExpirationService] Error cancelando orden MP #${mpOrder.order_number}:`, mpErr.message);
        }
      }

    } catch (err) {
      logger.error('[OrderExpirationService] Error en ciclo de expiración:', err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Inicia el temporizador en segundo plano
   */
  start() {
    if (this.intervalId) return;
    logger.info('🚀 [OrderExpirationService] Cron de reservas activo (Chequeos cada 5 minutos: 4h transferencia, 1h Mercado Pago).');
    // Chequeo inicial
    this.processExpiredOrders().catch((e) => logger.error('[OrderExpirationService init error]:', e));
    // Intervalo recurrente
    this.intervalId = setInterval(() => {
      this.processExpiredOrders().catch((e) => logger.error('[OrderExpirationService loop error]:', e));
    }, this.checkIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

module.exports = new OrderExpirationService();
