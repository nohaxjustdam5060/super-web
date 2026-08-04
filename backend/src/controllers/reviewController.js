const { Review, Product, User } = require('../models');

exports.addReview = async (req, res, next) => {
  try {
    const { product_id, rating, comment } = req.body;

    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const review = await Review.create({
      product_id,
      user_id: req.user.id,
      rating: Number(rating),
      comment,
      is_approved: true
    });

    return res.status(201).json({
      success: true,
      message: 'Reseña agregada correctamente',
      review
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductReviews = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const reviews = await Review.findAll({
      where: { product_id, is_approved: true },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, reviews });
  } catch (error) {
    next(error);
  }
};
