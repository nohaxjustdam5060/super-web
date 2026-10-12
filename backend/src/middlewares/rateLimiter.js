const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Máximo 20 intentos por IP
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación. Intenta nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 120, // 120 peticiones por minuto
  skip: (req) => req.path === '/payments/webhook' || req.originalUrl?.includes('/payments/webhook'),
  message: {
    success: false,
    message: 'Límite de peticiones alcanzado. Por favor espera un momento.'
  }
});

const catalogLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 80, // 80 peticiones por minuto (permite búsqueda predictiva/debounce y navegación fluida)
  skip: (req) => {
    if (req.method === 'OPTIONS' || req.path === '/payments/webhook' || req.originalUrl?.includes('/payments/webhook')) {
      return true;
    }
    // No aplicar restricción de catálogo a administradores autenticados
    if (req.user && ['admin', 'super_admin'].includes(req.user.role)) {
      return true;
    }
    return false;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Límite de consultas al catálogo alcanzado temporalmente. Por favor espera un momento antes de continuar.'
  }
});

module.exports = { authLimiter, apiLimiter, catalogLimiter };
