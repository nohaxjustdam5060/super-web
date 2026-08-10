const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);

router.get('/profile', authMiddleware, authController.getProfile);
router.post('/address', authMiddleware, authController.addAddress);
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
