const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

router.use(authMiddleware, requireRole('admin', 'super_admin'));

router.get('/metrics', adminController.getDashboardMetrics);
router.get('/users', adminController.getUsers);
router.get('/orders', adminController.getAdminOrders);
router.put('/users/:id/role', requireRole('super_admin'), adminController.updateUserRole);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
