const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

router.get('/shipping-methods', orderController.getShippingMethods);
router.post('/', authMiddleware, orderController.createOrder);
router.post('/bank-transfer', authMiddleware, orderController.processBankTransferPayment);
router.get('/', authMiddleware, orderController.getOrders);
router.get('/:id', authMiddleware, orderController.getOrderById);

// Admin Route to verify bank transfer
router.put('/:id/verify-bank-transfer', authMiddleware, requireRole('admin', 'super_admin'), orderController.verifyBankTransfer);

module.exports = router;
