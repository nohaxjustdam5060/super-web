const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const realMessage = err.original?.message || err.parent?.message || err.message;

  logger.error('[GlobalErrorHandler]', {
    message: realMessage,
    name: err.name,
    stack: err.stack
  });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Error interno del servidor';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { detail: realMessage, stack: err.stack })
  });
};

module.exports = errorHandler;