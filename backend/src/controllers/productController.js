const { Product, Category, Brand, ProductImage, ProductVariant, Review, User } = require('../models');
const searchService = require('../services/searchService');

exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, sort = 'newest', search, category_id, brand_id, min_price, max_price, in_stock, is_featured } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const where = await searchService.buildProductSearchQuery({
      search, category_id, brand_id, min_price, max_price, in_stock, is_featured
    });

    let order = [['createdAt', 'DESC']];
    if (sort === 'price_asc') order = [['price', 'ASC']];
    if (sort === 'price_desc') order = [['price', 'DESC']];
    if (sort === 'name') order = [['name', 'ASC']];

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: Brand, as: 'brand', attributes: ['id', 'name', 'slug', 'logo_url'] },
        { model: ProductImage, as: 'images', attributes: ['id', 'image_url', 'is_primary', 'order'] }
      ],
      distinct: true
    });

    return res.json({
      success: true,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
      products
    });
  } catch (error) {
    console.error('[GET_PRODUCTS_ERROR]', error);
    next(error);
  }
};

exports.getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      where: { slug, is_active: true },
      include: [
        { model: Category, as: 'category' },
        { model: Brand, as: 'brand' },
        { model: ProductImage, as: 'images' },
        { model: ProductVariant, as: 'variants' },
        {
          model: Review,
          as: 'reviews',
          where: { is_approved: true },
          required: false,
          include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    // Related products in the same category
    const relatedProducts = await Product.findAll({
      where: { category_id: product.category_id, is_active: true },
      limit: 4,
      include: [{ model: ProductImage, as: 'images' }]
    });

    return res.json({
      success: true,
      product,
      relatedProducts: relatedProducts.filter((p) => p.id !== product.id)
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    let categories = await Category.findAll({
      where: { parent_id: null },
      include: [{ model: Category, as: 'subcategories' }],
      order: [
        ['createdAt', 'ASC'],
        [{ model: Category, as: 'subcategories' }, 'name', 'ASC']
      ]
    });

    // Auto-repair if database has legacy unlinked categories or no subcategories populated
    const hasSubcategories = categories.some((c) => c.subcategories && c.subcategories.length > 0);
    if (categories.length === 0 || !hasSubcategories) {
      const seedInitialData = require('../seed');
      await seedInitialData();
      categories = await Category.findAll({
        where: { parent_id: null },
        include: [{ model: Category, as: 'subcategories' }],
        order: [
          ['createdAt', 'ASC'],
          [{ model: Category, as: 'subcategories' }, 'name', 'ASC']
        ]
      });
    }

    return res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

exports.getBrands = async (req, res, next) => {
  try {
    const brands = await Brand.findAll();
    return res.json({ success: true, brands });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, slug, sku, description, technical_specs, price, offer_price, stock, category_id, brand_id, images, is_featured } = req.body;

    const product = await Product.create({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sku,
      description,
      technical_specs: technical_specs || {},
      price,
      offer_price,
      stock,
      category_id,
      brand_id,
      is_featured: !!is_featured
    });

    if (images && Array.isArray(images)) {
      await Promise.all(
        images.map((img, idx) =>
          ProductImage.create({
            product_id: product.id,
            image_url: img.url || img,
            is_primary: idx === 0,
            order: idx
          })
        )
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      product
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    await product.update(req.body);
    return res.json({ success: true, message: 'Producto actualizado', product });
  } catch (error) {
    next(error);
  }
};
