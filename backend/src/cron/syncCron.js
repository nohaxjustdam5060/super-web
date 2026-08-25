const cuadradoSyncService = require('../services/cuadradoSyncService');
const logger = require('../config/logger');

class SyncCron {
  /**
   * Starts a 5-minute interval timer for automatic background catalog synchronization
   */
  startCron(intervalMs = 5 * 60 * 1000) { // 5 minutes
    logger.info('⏰ [SyncCron] Iniciando programador de sincronización de catálogo cada 5 minutos...');

    // Run initial sync 10 seconds after server startup to avoid startup congestion
    setTimeout(() => {
      cuadradoSyncService.syncCatalog().catch((err) => {
        logger.error('[SyncCron] Error en sincronización inicial al arrancar:', err);
      });
    }, 10000);

    // Schedule 5-minute interval
    const timer = setInterval(() => {
      cuadradoSyncService.syncCatalog().catch((err) => {
        logger.error('[SyncCron] Error en intervalo de sincronización:', err);
      });
    }, intervalMs);

    // Unref timer so it doesn't prevent Node process from closing cleanly on shutdown
    timer.unref();
    return timer;
  }
}

module.exports = new SyncCron();
