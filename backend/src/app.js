const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');
const antiScrapingMiddleware = require('./middlewares/antiScrapingMiddleware');

const app = express();

app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Source', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Anti-Scraping & Bot Protection Middleware
app.use(antiScrapingMiddleware);

// API Rate Limiting
app.use('/api', apiLimiter);

// Native robots.txt endpoint for direct backend/API requests
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /checkout\nDisallow: /profile\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /\n`
  );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'SUPERLAPTOP E-commerce API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
