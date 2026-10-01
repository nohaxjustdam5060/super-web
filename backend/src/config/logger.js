const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'super-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack, service, ...meta }) => {
          const metaKeys = Object.keys(meta);
          const metaStr = metaKeys.length ? ' ' + JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
        })
      )
    })
  ]
});

module.exports = logger;
