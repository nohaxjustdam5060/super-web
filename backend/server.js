const app = require('./src/app');
const sequelize = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    app.listen(PORT, () => {
      logger.info(`🚀 SUPER Backend API Server running at http://localhost:${PORT}`);
      logger.info(`Healthcheck available at http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database or start server:', error);
    // Fallback mode: start server anyway so API is reachable
    app.listen(PORT, () => {
      logger.info(`⚠️ Server started in fallback mode on http://localhost:${PORT}`);
    });
  }
}

startServer();
