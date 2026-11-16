const express = require('express');
const router = express.Router();
const externalApiAuth = require('../middlewares/externalApiAuth');
const externalOrderController = require('../controllers/externalOrderController');

// All endpoints in this router require valid M2M integration token
router.use(externalApiAuth);

// Cuadrado ERP Orders Integration
router.get('/cuadrado/orders', externalOrderController.getOrdersForErp);
router.get('/cuadrado/orders/:identifier', externalOrderController.getOrderByIdentifier);
router.post('/cuadrado/orders/:identifier/synced', externalOrderController.markOrderSynced);

module.exports = router;
