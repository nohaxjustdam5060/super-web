const { Product, Category, Brand, ProductImage, ProductVariant, Review, User } = require('../models');
const searchService = require('../services/searchService');

exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, sort = 'newest', search, category_id, brand_id, min_price, max_price, in_stock, is_featured, processor_family, ram_gb, storage, screen_range } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const where = await searchService.buildProductSearchQuery({
      search, category_id, brand_id, min_price, max_price, in_stock, is_featured,
      specs: {
        processor_family,
        ram_gb,
        storage,
        screen_range
      }
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

exports.getFilterOptions = async (req, res, next) => {
  try {
    const sequelize = require('../config/database');

    // 1. Processors (stock > 0 and processor_family is not null)
    const processors = await sequelize.query(`
      SELECT processor_family AS value, COUNT(*)::int AS count
      FROM products
      WHERE stock > 0 AND processor_family IS NOT NULL AND is_active = true
      GROUP BY processor_family
      HAVING COUNT(*) > 0
      ORDER BY processor_family ASC
    `, { type: sequelize.QueryTypes.SELECT });

    // 2. RAM (stock > 0 and ram_gb is not null)
    const ramOptions = await sequelize.query(`
      SELECT ram_gb AS value, COUNT(*)::int AS count
      FROM products
      WHERE stock > 0 AND ram_gb IS NOT NULL AND is_active = true
      GROUP BY ram_gb
      HAVING COUNT(*) > 0
      ORDER BY ram_gb ASC
    `, { type: sequelize.QueryTypes.SELECT });

    // 3. Storage (stock > 0 and storage_gb is not null)
    const storageOptions = await sequelize.query(`
      SELECT storage_gb, storage_type, COUNT(*)::int AS count
      FROM products
      WHERE stock > 0 AND storage_gb IS NOT NULL AND is_active = true
      GROUP BY storage_gb, storage_type
      HAVING COUNT(*) > 0
      ORDER BY storage_gb ASC, storage_type ASC
    `, { type: sequelize.QueryTypes.SELECT });

    // 4. Screen Size Ranges
    const screenOptions = await sequelize.query(`
      SELECT 
        CASE 
          WHEN screen_size < 13 THEN 'Menos de 13"'
          WHEN screen_size >= 13 AND screen_size < 14 THEN '13" - 13.9"'
          WHEN screen_size >= 14 AND screen_size < 15 THEN '14" - 14.9"'
          WHEN screen_size >= 15 AND screen_size < 16 THEN '15" - 15.9"'
          ELSE '16" o más'
        END AS range,
        COUNT(*)::int AS count,
        MIN(screen_size) as min_size
      FROM products
      WHERE stock > 0 AND screen_size IS NOT NULL AND is_active = true
      GROUP BY range
      HAVING COUNT(*) > 0
      ORDER BY min_size ASC
    `, { type: sequelize.QueryTypes.SELECT });

    // 5. Brands with stock count > 0
    const brandOptions = await sequelize.query(`
      SELECT b.id, b.name, b.slug, COUNT(p.id)::int AS count
      FROM brands b
      INNER JOIN products p ON p.brand_id = b.id
      WHERE p.stock > 0 AND p.is_active = true
      GROUP BY b.id, b.name, b.slug
      HAVING COUNT(p.id) > 0
      ORDER BY b.name ASC
    `, { type: sequelize.QueryTypes.SELECT });

    return res.json({
      success: true,
      filters: {
        processors,
        ramOptions,
        storageOptions,
        screenOptions,
        brandOptions
      }
    });
  } catch (error) {
    console.error('[GET_FILTER_OPTIONS_ERROR]', error);
    next(error);
  }
};
