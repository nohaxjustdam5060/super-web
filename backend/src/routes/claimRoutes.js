const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// Public endpoint to register a new claim
router.post('/', claimController.createClaim);

// Admin endpoint (view registered claims)
router.get('/', authMiddleware, requireRole('admin', 'super_admin'), claimController.getAllClaims);

module.exports = router;
