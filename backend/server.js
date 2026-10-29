const app = require('./src/app');
const sequelize = require('./src/config/database');
const logger = require('./src/config/logger');
const orderExpirationService = require('./src/services/orderExpirationService');
const cartReminderService = require('./src/services/cartReminderService');
const syncCron = require('./src/cron/syncCron');

const PORT = process.env.PORT || 5000;
let server = null;

async function startServer() {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database, starting in fallback mode:', error);
  }

  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 SUPER Backend API Server running at http://localhost:${PORT}`);
    logger.info(`Healthcheck available at http://localhost:${PORT}/api/health`);

    // Start 4-hour bank transfer reservation and 1-hour MP order expiration service
    orderExpirationService.start();

    // Start abandoned cart email reminder service (checks every hour)
    cartReminderService.start();

    // Start 5-minute catalog sync Cron Job with cuadrado.pe
    syncCron.startCron();
  });
}

function gracefulShutdown(signal, error) {
  if (error) {
    logger.error(`[ProcessExit] Excepción no capturada o rechazo no manejado (${signal}):`, error);
  } else {
    logger.info(`[ProcessExit] Señal recibida (${signal}). Cerrando servidor de forma segura...`);
  }

  // Stop background services
  try {
    orderExpirationService.stop && orderExpirationService.stop();
    cartReminderService.stop && cartReminderService.stop();
  } catch (stopErr) {
    logger.error('[ProcessExit] Error al detener servicios background:', stopErr);
  }

  if (server) {
    server.close(() => {
      logger.info('[ProcessExit] Servidor HTTP cerrado. Sockets liberados.');
      process.exit(error ? 1 : 0);
    });

    // Enforce shutdown after 5 seconds if connections linger
    setTimeout(() => {
      logger.error('[ProcessExit] Apagado forzado por tiempo de espera.');
      process.exit(1);
    }, 5000).unref();
  } else {
    process.exit(error ? 1 : 0);
  }
}

process.on('unhandledRejection', (reason) => gracefulShutdown('unhandledRejection', reason));
process.on('uncaughtException', (error) => gracefulShutdown('uncaughtException', error));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer().catch((err) => gracefulShutdown('startServerFailure', err));
