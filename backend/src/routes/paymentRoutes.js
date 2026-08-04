const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Endpoint para procesar el pago desde Mercado Pago Checkout Bricks
router.post('/process', authMiddleware, paymentController.processPayment);

// Webhook para recibir notificaciones / IPN de Mercado Pago
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
