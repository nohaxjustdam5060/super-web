const cuadradoSyncService = require('../services/cuadradoSyncService');
const logger = require('../config/logger');

class SyncCron {
  /**
   * Starts an interval timer for automatic background catalog synchronization
   */
  startCron(intervalMs = parseInt(process.env.CUADRADO_SYNC_INTERVAL_MS, 10) || 5 * 60 * 1000) {
    const minutes = Math.round(intervalMs / 60000);
    logger.info(`⏰ [SyncCron] Iniciando programador de sincronización de catálogo cada ${minutes} minutos (${intervalMs}ms)...`);

    // Run initial sync 10 seconds after server startup to avoid startup congestion
    setTimeout(() => {
      cuadradoSyncService.syncCatalog().catch((err) => {
        logger.warn(`[SyncCron] No se pudo realizar la sincronización inicial: ${err.message}. Se reintentará en el próximo intervalo.`);
      });
    }, 10000);

    // Schedule interval
    const timer = setInterval(() => {
      cuadradoSyncService.syncCatalog().catch((err) => {
        logger.warn(`[SyncCron] Sincronización omitida por falla en API de Cuadrado: ${err.message}. Se reintentará en el próximo ciclo.`);
      });
    }, intervalMs);

    // Unref timer so it doesn't prevent Node process from closing cleanly on shutdown
    timer.unref();
    return timer;
  }
}

module.exports = new SyncCron();
