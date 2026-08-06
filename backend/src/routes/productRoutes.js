const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

router.get('/', productController.getProducts);
router.get('/filters', productController.getFilterOptions);
router.get('/categories', productController.getCategories);
router.get('/brands', productController.getBrands);
router.get('/:slug', productController.getProductBySlug);

// Reviews
router.get('/:product_id/reviews', reviewController.getProductReviews);
router.post('/reviews', authMiddleware, reviewController.addReview);

// Admin Routes
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), productController.createProduct);
router.put('/:id', authMiddleware, requireRole('admin', 'super_admin'), productController.updateProduct);

module.exports = router;
