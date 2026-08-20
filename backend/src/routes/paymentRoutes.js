const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validationMiddleware');
const Joi = require('joi');

const createPreferenceSchema = Joi.object({
  order_id: Joi.string().uuid().required(),
  invoice_info: Joi.object().optional()
});

// Endpoint para crear la preferencia de Checkout Pro (Redirección a Mercado Pago)
router.post('/create-preference', authMiddleware, validateBody(createPreferenceSchema), paymentController.createPreference);

// Endpoint de verificación síncrona de pago (Redirección de back_urls en frontend)
router.post('/verify-and-fulfill', paymentController.verifyAndFulfill);

// Webhook para recibir notificaciones / IPN de Mercado Pago (Público, sin JWT)
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
