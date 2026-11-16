const crypto = require('crypto');

/**
 * Middleware for Machine-to-Machine (M2M) External API Authentication (e.g. Cuadrado ERP)
 * Accepts "Authorization: Bearer <token>" or "X-API-Key: <token>"
 */
const externalApiAuth = (req, res, next) => {
  const configuredToken = process.env.ERP_CUADRADO_TOKEN;

  if (!configuredToken) {
    return res.status(503).json({
      success: false,
      message: 'Integración ERP externa no configurada en el servidor (ERP_CUADRADO_TOKEN faltante).'
    });
  }

  let providedToken = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.slice(7).trim();
  } else if (req.headers['x-api-key']) {
    providedToken = String(req.headers['x-api-key']).trim();
  }

  if (!providedToken) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. Se requiere token de integración.'
    });
  }

  // Timing-safe comparison to prevent timing attacks
  const expectedBuf = Buffer.from(configuredToken, 'utf8');
  const providedBuf = Buffer.from(providedToken, 'utf8');

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return res.status(401).json({
      success: false,
      message: 'Token de integración inválido.'
    });
  }

  next();
};

module.exports = externalApiAuth;
