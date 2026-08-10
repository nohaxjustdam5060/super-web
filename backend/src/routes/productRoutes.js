const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// Configure multer memory storage (max 5MB per file, images only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no válido. Solo se permiten imágenes JPG, PNG y WEBP.'));
    }
  }
});

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
router.post('/upload-images', authMiddleware, requireRole('admin', 'super_admin'), upload.array('images', 3), productController.uploadProductImages);
router.post('/delete-image', authMiddleware, requireRole('admin', 'super_admin'), productController.deleteProductImage);

module.exports = router;
