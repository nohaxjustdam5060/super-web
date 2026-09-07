const { Product, Category, Brand, ProductImage, ProductVariant, Review, User } = require('../models');
const searchService = require('../services/searchService');
const storageService = require('../services/storageService');

exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, sort = 'newest', search, category_id, brand_id, min_price, max_price, in_stock, is_featured, include_inactive, status, ...otherSpecs } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const where = await searchService.buildProductSearchQuery({
      search, category_id, brand_id, min_price, max_price, in_stock, is_featured, include_inactive, status,
      specs: otherSpecs
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

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 12);
    const totalPages = Math.ceil(count / limitNum) || 1;

    return res.json({
      success: true,
      total: count,
      page: pageNum,
      totalPages,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages
      },
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

    if (images && Array.isArray(images) && images.length > 0) {
      const primaryIdx = images.findIndex((img) => typeof img === 'object' && img.is_primary);
      const targetPrimaryIdx = primaryIdx >= 0 ? primaryIdx : 0;

      const orderedImages = images.map((img, idx) => {
        const isPrimary = idx === targetPrimaryIdx;
        return {
          imgUrl: typeof img === 'string' ? img : img.url || img.image_url,
          isPrimary,
          order: isPrimary ? 0 : (idx < targetPrimaryIdx ? idx + 1 : idx)
        };
      });

      await Promise.all(
        orderedImages.map((img) =>
          ProductImage.create({
            product_id: product.id,
            image_url: img.imgUrl,
            is_primary: img.isPrimary,
            order: img.order
          })
        )
      );

      const primaryImgObj = orderedImages.find((i) => i.isPrimary);
      if (primaryImgObj) {
        await product.update({ image_url: primaryImgObj.imgUrl });
      }
    }

    const createdProduct = await Product.findByPk(product.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Brand, as: 'brand' },
        { model: ProductImage, as: 'images' }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      product: createdProduct
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { images, ...updateData } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    // Auto-extract specs if name is being updated
    if (updateData.name && updateData.name !== product.name) {
      const extraerEspecificaciones = require('../utils/specExtractor');
      const specs = extraerEspecificaciones(updateData.name);
      updateData.processor_family = specs.processor_family || updateData.processor_family;
      updateData.ram_gb = specs.ram_gb || updateData.ram_gb;
      updateData.storage_gb = specs.storage_gb || updateData.storage_gb;
      updateData.storage_type = specs.storage_type || updateData.storage_type;
      updateData.screen_size = specs.screen_size || updateData.screen_size;
      updateData.full_name = specs.full_name || updateData.name;
    }

    await product.update(updateData);

    // If multi-image array provided, synchronize ProductImage records and clean orphaned files
    if (images && Array.isArray(images)) {
      const currentImages = await ProductImage.findAll({ where: { product_id: product.id } });
      const newUrls = images.map((img) => (typeof img === 'string' ? img : img.url || img.image_url));

      // Remove orphaned files from storage for images removed in edit
      for (const oldImg of currentImages) {
        if (!newUrls.includes(oldImg.image_url)) {
          await storageService.deleteFile(oldImg.image_url);
        }
      }

      await ProductImage.destroy({ where: { product_id: product.id } });

      const primaryIdx = images.findIndex((img) => typeof img === 'object' && img.is_primary);
      const targetPrimaryIdx = primaryIdx >= 0 ? primaryIdx : 0;

      const orderedImages = images.map((img, idx) => {
        const isPrimary = idx === targetPrimaryIdx;
        return {
          imgUrl: typeof img === 'string' ? img : img.url || img.image_url,
          isPrimary,
          order: isPrimary ? 0 : (idx < targetPrimaryIdx ? idx + 1 : idx)
        };
      });

      await Promise.all(
        orderedImages.map((img) =>
          ProductImage.create({
            product_id: product.id,
            image_url: img.imgUrl,
            is_primary: img.isPrimary,
            order: img.order
          })
        )
      );

      const primaryImgObj = orderedImages.find((i) => i.isPrimary);
      if (primaryImgObj) {
        await product.update({ image_url: primaryImgObj.imgUrl });
      }
    } else if (updateData.image_url) {
      const primaryImg = await ProductImage.findOne({ where: { product_id: product.id, is_primary: true } });
      if (primaryImg) {
        await primaryImg.update({ image_url: updateData.image_url });
      } else {
        await ProductImage.create({ product_id: product.id, image_url: updateData.image_url, is_primary: true, order: 0 });
      }
    }

    const updatedProduct = await Product.findByPk(id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: Brand, as: 'brand', attributes: ['id', 'name', 'slug'] },
        { model: ProductImage, as: 'images' }
      ]
    });

    return res.json({ success: true, message: 'Producto actualizado exitosamente', product: updatedProduct });
  } catch (error) {
    next(error);
  }
};

exports.uploadProductImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No se recibieron archivos de imagen.' });
    }

    const urls = [];
    for (const file of req.files) {
      const publicUrl = await storageService.uploadFile(file.buffer, file.originalname, file.mimetype);
      urls.push(publicUrl);
    }

    return res.json({
      success: true,
      message: `${urls.length} imagen(es) subida(s) exitosamente`,
      urls
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProductImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'URL de imagen requerida' });
    }

    await storageService.deleteFile(imageUrl);
    await ProductImage.destroy({ where: { image_url: imageUrl } });

    return res.json({ success: true, message: 'Imagen eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
};

exports.getFilterOptions = async (req, res, next) => {
  try {
    const sequelize = require('../config/database');
    const { Op } = require('sequelize');
    const { search, category_id, min_price, max_price, in_stock = 'true' } = req.query;

    // Auto-repair unbranded active products on demand if brand_id is null (e.g. Epson products)
    const unbrandedProducts = await Product.findAll({
      where: { brand_id: null, is_active: true },
      attributes: ['id', 'name']
    });

    if (unbrandedProducts.length > 0) {
      try {
        const cuadradoSyncService = require('../services/cuadradoSyncService');
        const brandCache = new Map();
        const existingBrands = await Brand.findAll();
        existingBrands.forEach((b) => brandCache.set(b.name, b.id));

        for (const p of unbrandedProducts) {
          const inferredBrandId = await cuadradoSyncService.getOrCreateBrandForProduct(p.name, brandCache);
          if (inferredBrandId) {
            await Product.update({ brand_id: inferredBrandId }, { where: { id: p.id } });
          }
        }
      } catch (repairErr) {
        console.error('[AUTO_BRAND_REPAIR_ERROR]', repairErr);
      }
    }

    // Build base contextual WHERE clause for active & stocked products matching category and/or search term
    const where = await searchService.buildProductSearchQuery({
      search,
      category_id,
      min_price,
      max_price,
      in_stock,
      status: 'active'
    });

    // 1. Contextual Brands with count > 0
    const brandRows = await Product.findAll({
      where: {
        ...where,
        brand_id: { [Op.ne]: null }
      },
      attributes: [
        'brand_id',
        [sequelize.fn('COUNT', sequelize.col('Product.id')), 'count']
      ],
      include: [
        {
          model: Brand,
          as: 'brand',
          attributes: ['id', 'name', 'slug', 'logo_url'],
          required: true
        }
      ],
      group: ['brand_id', 'brand.id', 'brand.name', 'brand.slug', 'brand.logo_url'],
      order: [[sequelize.col('brand.name'), 'ASC']],
      raw: true,
      nest: true
    });

    const brandOptions = brandRows.map((r) => ({
      id: r.brand.id,
      name: r.brand.name,
      slug: r.brand.slug,
      logo_url: r.brand.logo_url,
      count: parseInt(r.count, 10)
    }));

    // 2. Contextual Processors
    const procRows = await Product.findAll({
      where: {
        ...where,
        processor_family: { [Op.ne]: null }
      },
      attributes: [
        'processor_family',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['processor_family'],
      order: [['processor_family', 'ASC']],
      raw: true
    });
    const processors = procRows.map((r) => ({
      value: r.processor_family,
      count: parseInt(r.count, 10)
    }));

    // 3. Contextual RAM
    const ramRows = await Product.findAll({
      where: {
        ...where,
        ram_gb: { [Op.ne]: null }
      },
      attributes: [
        'ram_gb',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['ram_gb'],
      order: [['ram_gb', 'ASC']],
      raw: true
    });
    const ramOptions = ramRows.map((r) => ({
      value: r.ram_gb,
      count: parseInt(r.count, 10)
    }));

    // 4. Contextual Storage
    const storageRows = await Product.findAll({
      where: {
        ...where,
        storage_gb: { [Op.ne]: null }
      },
      attributes: [
        'storage_gb',
        'storage_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['storage_gb', 'storage_type'],
      order: [['storage_gb', 'ASC'], ['storage_type', 'ASC']],
      raw: true
    });
    const storageOptions = storageRows.map((r) => ({
      storage_gb: r.storage_gb,
      storage_type: r.storage_type,
      count: parseInt(r.count, 10)
    }));

    // 5. Contextual Screen Size Ranges
    const productsWithScreen = await Product.findAll({
      where: {
        ...where,
        screen_size: { [Op.ne]: null }
      },
      attributes: ['screen_size'],
      raw: true
    });

    const screenBuckets = {};
    productsWithScreen.forEach((p) => {
      const size = parseFloat(p.screen_size);
      if (isNaN(size)) return;
      let range = '16" o más';
      if (size < 13) range = 'Menos de 13"';
      else if (size >= 13 && size < 14) range = '13" - 13.9"';
      else if (size >= 14 && size < 15) range = '14" - 14.9"';
      else if (size >= 15 && size < 16) range = '15" - 15.9"';
      screenBuckets[range] = (screenBuckets[range] || 0) + 1;
    });

    const screenRangeOrder = ['Menos de 13"', '13" - 13.9"', '14" - 14.9"', '15" - 15.9"', '16" o más'];
    const screenOptions = screenRangeOrder
      .filter((r) => screenBuckets[r] > 0)
      .map((r) => ({ range: r, count: screenBuckets[r] }));

    // 6. Dynamic Attributes from technical_specs JSONB field
    const productsWithSpecs = await Product.findAll({
      where: {
        ...where,
        technical_specs: { [Op.ne]: null }
      },
      attributes: ['technical_specs'],
      raw: true
    });

    const attributeCounts = {};

    productsWithSpecs.forEach((p) => {
      const specs = p.technical_specs;
      if (!specs) return;

      if (specs.specs_map && typeof specs.specs_map === 'object') {
        Object.entries(specs.specs_map).forEach(([attrKey, attrVal]) => {
          if (!attrKey || !attrVal) return;
          const key = String(attrKey).trim().toUpperCase();
          const val = String(attrVal).trim();
          if (!key || !val) return;

          if (!attributeCounts[key]) attributeCounts[key] = {};
          attributeCounts[key][val] = (attributeCounts[key][val] || 0) + 1;
        });
      } else if (Array.isArray(specs.atributos)) {
        specs.atributos.forEach((item) => {
          if (!item || !item.nombre || !item.valor) return;
          const key = String(item.nombre).trim().toUpperCase();
          const val = String(item.valor).trim();
          if (!key || !val) return;

          if (!attributeCounts[key]) attributeCounts[key] = {};
          attributeCounts[key][val] = (attributeCounts[key][val] || 0) + 1;
        });
      }
    });

    const attributeOptions = {};
    Object.keys(attributeCounts).sort().forEach((attrKey) => {
      attributeOptions[attrKey] = Object.entries(attributeCounts[attrKey])
        .map(([val, count]) => ({ value: val, count }))
        .sort((a, b) => b.count - a.count);
    });

    // Consolidated Fallback: If relational column arrays are empty, populate from JSONB attributeOptions
    let finalProcessors = processors;
    if (!finalProcessors || finalProcessors.length === 0) {
      const jsonProc = attributeOptions['PROCESADOR'] || attributeOptions['PROCESADOR / CPU'] || [];
      finalProcessors = jsonProc.map((item) => ({ value: item.value, count: item.count }));
    }

    let finalRamOptions = ramOptions;
    if (!finalRamOptions || finalRamOptions.length === 0) {
      const jsonRam = attributeOptions['MEMORIA RAM'] || attributeOptions['RAM'] || [];
      finalRamOptions = jsonRam.map((item) => ({ value: item.value, count: item.count }));
    }

    let finalScreenOptions = screenOptions;
    if (!finalScreenOptions || finalScreenOptions.length === 0) {
      const jsonScreen = attributeOptions['TAMAÑO DE PANTALLA'] || attributeOptions['PANTALLA'] || attributeOptions['PANTALLA (PULGADAS)'] || [];
      finalScreenOptions = jsonScreen.map((item) => ({ range: item.value, count: item.count }));
    }

    return res.json({
      success: true,
      filters: {
        processors: finalProcessors,
        ramOptions: finalRamOptions,
        storageOptions,
        screenOptions: finalScreenOptions,
        brandOptions,
        attributeOptions
      }
    });
  } catch (error) {
    console.error('[GET_FILTER_OPTIONS_ERROR]', error);
    next(error);
  }
};
