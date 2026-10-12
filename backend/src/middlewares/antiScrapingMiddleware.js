/**
 * Anti-Scraping & Bot Protection Middleware
 *
 * Provides code-level protection against automated scripts and scraping tools:
 * 1. Bypasses CORS Preflight OPTIONS requests and payment webhook callbacks.
 * 2. Blocks known scraping tools, command-line clients, and automated HTTP libraries.
 * 3. Enforces presence of User-Agent without penalizing Safari/Firefox (no Chromium-only header checks).
 */

const BLOCKED_USER_AGENTS = [
  'python-requests',
  'aiohttp',
  'urllib',
  'scrapy',
  'curl/',
  'wget/',
  'httpie',
  'postmanruntime',
  'go-http-client',
  'node-fetch',
  'got/',
  'axios/',
  'java/',
  'apache-httpclient',
  'headlesschrome',
  'phantomjs',
  'selenium',
  'puppeteer'
];

function antiScrapingMiddleware(req, res, next) {
  // 1. Always allow CORS Preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  // 2. Bypass critical webhooks and healthcheck routes
  const path = req.path || req.originalUrl || '';
  if (
    path.includes('/payments/webhook') ||
    path === '/health' ||
    path === '/api/health' ||
    path === '/robots.txt'
  ) {
    return next();
  }

  const userAgent = (req.headers['user-agent'] || '').trim().toLowerCase();

  // 3. Reject requests completely missing a User-Agent
  if (!userAgent || userAgent.length < 8) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: Agente de usuario no identificado.'
    });
  }

  // 4. Block known automated scraping tools and libraries
  const isBlockedAgent = BLOCKED_USER_AGENTS.some((pattern) => userAgent.includes(pattern));
  if (isBlockedAgent) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado por políticas de protección automatizada.'
    });
  }

  return next();
}

module.exports = antiScrapingMiddleware;
