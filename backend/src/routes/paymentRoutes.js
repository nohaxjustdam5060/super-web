const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validationMiddleware');
const Joi = require('joi');

const createPreferenceSchema = Joi.object({
  order_id: Joi.string().uuid().optional(),
  items: Joi.array().items(Joi.object().unknown(true)).optional(),
  shipping_address: Joi.object().unknown(true).optional(),
  shipping_method: Joi.string().allow(null, '').optional(),
  shipping_cost: Joi.number().min(0).optional(),
  coupon_code: Joi.string().allow(null, '').optional(),
  invoice_info: Joi.object().allow(null).optional(),
  notes: Joi.string().allow(null, '').optional(),
  payment_method: Joi.string().allow(null, '').optional()
}).or('order_id', 'items');

// Endpoint para crear la preferencia de Checkout Pro (Redirección a Mercado Pago)
router.post('/create-preference', authMiddleware, validateBody(createPreferenceSchema), paymentController.createPreference);

// Endpoint de verificación síncrona de pago (Redirección de back_urls en frontend)
router.post('/verify-and-fulfill', paymentController.verifyAndFulfill);

// Webhook para recibir notificaciones / IPN de Mercado Pago (Público, sin JWT)
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
