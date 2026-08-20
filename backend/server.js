const app = require('./src/app');
const sequelize = require('./src/config/database');
const logger = require('./src/config/logger');

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
  });
}

function gracefulShutdown(signal, error) {
  if (error) {
    logger.error(`[ProcessExit] Excepción no capturada o rechazo no manejado (${signal}):`, error);
  } else {
    logger.info(`[ProcessExit] Señal recibida (${signal}). Cerrando servidor de forma segura...`);
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
