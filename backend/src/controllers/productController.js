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

    // 2. Fetch all matching products in scope to calculate consolidated facets in a single pass
    const matchingProducts = await Product.findAll({
      where,
      attributes: ['id', 'name', 'processor_family', 'ram_gb', 'storage_gb', 'storage_type', 'screen_size', 'technical_specs'],
      raw: true
    });

    const procMap = {};
    const ramMap = {};
    const storageMap = {};
    const screenMap = {};
    const gpuMap = {};
    const kbMap = {};
    const osMap = {};
    const colorMap = {};
    const batteryMap = {};
    const connMap = {};

    matchingProducts.forEach((p) => {
      const specs = p.technical_specs?.specs_map || {};
      const name = p.name || '';

      // 1. PROCESADORES (Familias base limpias)
      const procRaw = (p.processor_family || '') + ' ' + (specs['PROCESADOR'] || specs['PROCESADOR / CPU'] || '') + ' ' + name;
      let procGroup = null;
      if (/core\s*ultra|ultra\s*[579]/i.test(procRaw)) procGroup = 'Intel Core Ultra';
      else if (/ryzen\s*ai/i.test(procRaw)) procGroup = 'AMD Ryzen AI';
      else if (/\b(core\s*i9|i9[- ]\d+|intel\s*i9)\b/i.test(procRaw) || p.processor_family === 'I9') procGroup = 'Intel Core i9';
      else if (/\b(core\s*i7|i7[- ]\d+|intel\s*i7)\b/i.test(procRaw) || p.processor_family === 'I7') procGroup = 'Intel Core i7';
      else if (/\b(core\s*i5|i5[- ]\d+|intel\s*i5)\b/i.test(procRaw) || p.processor_family === 'I5') procGroup = 'Intel Core i5';
      else if (/\b(core\s*i3|i3[- ]\d+|intel\s*i3)\b/i.test(procRaw) || p.processor_family === 'I3') procGroup = 'Intel Core i3';
      else if (/ryzen\s*9/i.test(procRaw)) procGroup = 'AMD Ryzen 9';
      else if (/ryzen\s*7/i.test(procRaw)) procGroup = 'AMD Ryzen 7';
      else if (/ryzen\s*5/i.test(procRaw)) procGroup = 'AMD Ryzen 5';
      else if (/ryzen\s*3/i.test(procRaw)) procGroup = 'AMD Ryzen 3';
      else if (/intel\s*core\s*9/i.test(procRaw)) procGroup = 'Intel Core i9';
      else if (/intel\s*core\s*7/i.test(procRaw)) procGroup = 'Intel Core i7';
      else if (/intel\s*core\s*5/i.test(procRaw)) procGroup = 'Intel Core i5';
      else if (/intel\s*core\s*3/i.test(procRaw)) procGroup = 'Intel Core i3';
      else if (/celeron|pentium|intel\s*n\d+|n150|n100/i.test(procRaw)) procGroup = 'Intel Celeron / N-Series';

      if (procGroup) procMap[procGroup] = (procMap[procGroup] || 0) + 1;

      // 2. MEMORIA RAM (Solo capacidades totales)
      let ramCap = null;
      if (p.ram_gb) {
        ramCap = `${p.ram_gb} GB`;
      } else {
        const ramRaw = (specs['RAM'] || specs['MEMORIA RAM'] || '') + ' ' + name;
        const m = ramRaw.match(/\b(4|8|12|16|24|32|64|128)\s*GB\b/i);
        if (m) ramCap = `${m[1]} GB`;
      }
      if (ramCap) ramMap[ramCap] = (ramMap[ramCap] || 0) + 1;

      // 3. ALMACENAMIENTO (Solo capacidades)
      let storageCap = null;
      if (p.storage_gb) {
        storageCap = p.storage_gb >= 1024 ? `${p.storage_gb / 1024} TB` : `${p.storage_gb} GB`;
      } else {
        const storRaw = (specs['ALMACENAMIENTO'] || specs['DISCO'] || '') + ' ' + name;
        if (/\b2\s*TB\b/i.test(storRaw)) storageCap = '2 TB';
        else if (/\b1\s*TB\b/i.test(storRaw)) storageCap = '1 TB';
        else if (/\b512\s*GB\b/i.test(storRaw) || /\b512\s*SSD\b/i.test(storRaw)) storageCap = '512 GB';
        else if (/\b256\s*GB\b/i.test(storRaw)) storageCap = '256 GB';
        else if (/\b128\s*GB\b/i.test(storRaw)) storageCap = '128 GB';
        else if (/\b64\s*GB\b/i.test(storRaw)) storageCap = '64 GB';
      }
      if (storageCap) storageMap[storageCap] = (storageMap[storageCap] || 0) + 1;

      // 4. PANTALLA (Solo diagonales limpias)
      let screenSize = null;
      let sizeNum = p.screen_size ? parseFloat(p.screen_size) : null;
      if (!sizeNum) {
        const scRaw = (specs['PANTALLA'] || specs['TAMAÑO DE PANTALLA'] || '') + ' ' + name;
        const m = scRaw.match(/(\d+\.?\d*)\s*(?:"|pulgadas|pulg)/i);
        if (m) sizeNum = parseFloat(m[1]);
      }
      if (sizeNum && sizeNum >= 10) {
        if (Math.abs(sizeNum - 10.1) < 0.2) screenSize = '10.1"';
        else if (Math.abs(sizeNum - 11.6) < 0.2) screenSize = '11.6"';
        else if (Math.abs(sizeNum - 13.3) < 0.3) screenSize = '13.3"';
        else if (Math.abs(sizeNum - 14.0) < 0.3) screenSize = '14"';
        else if (Math.abs(sizeNum - 15.6) < 0.3) screenSize = '15.6"';
        else if (Math.abs(sizeNum - 16.0) < 0.3) screenSize = '16"';
        else if (Math.abs(sizeNum - 17.3) < 0.3) screenSize = '17.3"';
        else if (sizeNum >= 23 && sizeNum <= 25) screenSize = '24"';
        else if (sizeNum >= 26 && sizeNum <= 28) screenSize = '27"';
        else if (sizeNum >= 31 && sizeNum <= 34) screenSize = '32"';
      }
      if (screenSize) screenMap[screenSize] = (screenMap[screenSize] || 0) + 1;

      // 5. TECLADOS (Solo tipos clave: Latinoamericano/Español, Retroiluminado, Inglés/US)
      const kbRaw = (specs['TECLADO'] || specs['DISTRIBUCION TECLADO'] || '').toUpperCase();
      if (kbRaw) {
        if (/LATINO|ESPAÑOL|ESP\b|LATAM/i.test(kbRaw)) kbMap['Latinoamericano / Español'] = (kbMap['Latinoamericano / Español'] || 0) + 1;
        if (/INGLES|AMERICANO|ENGLISH|\bUS\b/i.test(kbRaw)) kbMap['Inglés / US'] = (kbMap['Inglés / US'] || 0) + 1;
        if (/RETROILUMINADO|BACKLIT|\bRGB\b/i.test(kbRaw)) kbMap['Retroiluminado'] = (kbMap['Retroiluminado'] || 0) + 1;
      }

      // 6. TARJETA GRAFICA (Solo chipsets/series base)
      const gpuRaw = ((specs['TARJETA GRAFICA'] || specs['TARJETA DE VIDEO'] || specs['GPU'] || '') + ' ' + name).toUpperCase();
      if (gpuRaw.trim()) {
        let gpuGroup = null;
        if (/RTX\s*5090/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 5090';
        else if (/RTX\s*5080/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 5080';
        else if (/RTX\s*5070/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 5070';
        else if (/RTX\s*5060/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 5060';
        else if (/RTX\s*5050/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 5050';
        else if (/RTX\s*4090/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 4090';
        else if (/RTX\s*4080/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 4080';
        else if (/RTX\s*4070/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 4070';
        else if (/RTX\s*4060/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 4060';
        else if (/RTX\s*4050/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 4050';
        else if (/RTX\s*3080/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 3080';
        else if (/RTX\s*3070/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 3070';
        else if (/RTX\s*3060/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 3060';
        else if (/RTX\s*3050/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 3050';
        else if (/RTX\s*2050/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX 2050';
        else if (/RTX\s*(ADA|A\d{3,4}|QUADRO)/i.test(gpuRaw)) gpuGroup = 'NVIDIA RTX ADA / Quadro';
        else if (/IRIS\s*XE/i.test(gpuRaw)) gpuGroup = 'Intel Iris Xe';
        else if (/ARC\b/i.test(gpuRaw)) gpuGroup = 'Intel Arc';
        else if (/INTEL\s*(UHD|HD|GRAPHICS)/i.test(gpuRaw)) gpuGroup = 'Intel UHD / HD Graphics';
        else if (/RADEON/i.test(gpuRaw)) gpuGroup = 'AMD Radeon Graphics';

        if (gpuGroup) gpuMap[gpuGroup] = (gpuMap[gpuGroup] || 0) + 1;
      }

      // 7. SISTEMA OPERATIVO
      const osRaw = (specs['SISTEMA OPERATIVO'] || '').toUpperCase();
      if (osRaw) {
        let osGroup = null;
        if (/WINDOWS\s*11\s*PRO/i.test(osRaw)) osGroup = 'Windows 11 Pro';
        else if (/WINDOWS\s*11\s*HOME/i.test(osRaw)) osGroup = 'Windows 11 Home';
        else if (/WINDOWS\s*10/i.test(osRaw)) osGroup = 'Windows 10 Pro';
        else if (/FREE\s*DOS|SIN\s*SISTEMA/i.test(osRaw)) osGroup = 'FreeDOS / Sin Sistema Operativo';
        else if (/ANDROID/i.test(osRaw)) osGroup = 'Android';
        if (osGroup) osMap[osGroup] = (osMap[osGroup] || 0) + 1;
      }

      // 8. COLOR
      const colorRaw = (specs['COLOR'] || '').toUpperCase();
      if (colorRaw) {
        let colorGroup = null;
        if (/NEGRO|BLACK/i.test(colorRaw)) colorGroup = 'Negro';
        else if (/GRIS|GREY|SILVER|PLATA|MECHA|GRAPHITE/i.test(colorRaw)) colorGroup = 'Gris / Plateado';
        else if (/BLANCO|WHITE/i.test(colorRaw)) colorGroup = 'Blanco';
        else if (/AZUL|BLUE/i.test(colorRaw)) colorGroup = 'Azul';
        if (colorGroup) colorMap[colorGroup] = (colorMap[colorGroup] || 0) + 1;
      }

      // 9. BATERIA
      const batRaw = (specs['BATERIA'] || specs['BATERÍA'] || '').toUpperCase();
      if (batRaw) {
        if (/4\s*(CELL|CELDA)/i.test(batRaw) || /7\d\s*WH|8\d\s*WH|9\d\s*WH/i.test(batRaw)) batteryMap['4 Celdas'] = (batteryMap['4 Celdas'] || 0) + 1;
        else if (/3\s*(CELL|CELDA)/i.test(batRaw) || /4\d\s*WH|5\d\s*WH/i.test(batRaw)) batteryMap['3 Celdas'] = (batteryMap['3 Celdas'] || 0) + 1;
      }

      // 10. CONECTIVIDAD
      const connRaw = (specs['CONECTIVIDAD'] || specs['REDES'] || '').toUpperCase();
      if (connRaw) {
        if (/WIFI\s*6E?/i.test(connRaw) || /AX/i.test(connRaw)) connMap['Wi-Fi 6 / 6E'] = (connMap['Wi-Fi 6 / 6E'] || 0) + 1;
        if (/WIFI\s*5|AC\b/i.test(connRaw)) connMap['Wi-Fi 5 (AC)'] = (connMap['Wi-Fi 5 (AC)'] || 0) + 1;
        if (/BLUETOOTH|\bBT\b/i.test(connRaw)) connMap['Bluetooth'] = (connMap['Bluetooth'] || 0) + 1;
        if (/RJ45|GIGABIT|ETHERNET/i.test(connRaw)) connMap['Ethernet (RJ45)'] = (connMap['Ethernet (RJ45)'] || 0) + 1;
      }
    });

    // Formatting & Ordering Helpers
    const procPriority = [
      'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Intel Core Ultra',
      'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'AMD Ryzen AI',
      'Intel Celeron / N-Series'
    ];
    const processors = Object.keys(procMap)
      .sort((a, b) => {
        const idxA = procPriority.indexOf(a);
        const idxB = procPriority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      })
      .map((val) => ({ value: val, count: procMap[val] }));

    const ramOptions = Object.keys(ramMap)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((val) => ({ value: val, count: ramMap[val] }));

    const storageWeight = (s) => (s.includes('TB') ? parseInt(s, 10) * 1024 : parseInt(s, 10));
    const storageOptions = Object.keys(storageMap)
      .sort((a, b) => storageWeight(a) - storageWeight(b))
      .map((val) => ({ value: val, count: storageMap[val] }));

    const screenOptions = Object.keys(screenMap)
      .sort((a, b) => parseFloat(a) - parseFloat(b))
      .map((val) => ({ range: val, count: screenMap[val] }));

    const keyboardOptions = ['Latinoamericano / Español', 'Retroiluminado', 'Inglés / US']
      .filter((k) => kbMap[k] > 0)
      .map((k) => ({ value: k, count: kbMap[k] }));

    const gpuOptions = Object.keys(gpuMap)
      .sort((a, b) => gpuMap[b] - gpuMap[a])
      .map((val) => ({ value: val, count: gpuMap[val] }));

    const osOptions = ['Windows 11 Home', 'Windows 11 Pro', 'Windows 10 Pro', 'FreeDOS / Sin Sistema Operativo', 'Android']
      .filter((k) => osMap[k] > 0)
      .map((k) => ({ value: k, count: osMap[k] }));

    const colorOptions = ['Negro', 'Gris / Plateado', 'Blanco', 'Azul']
      .filter((k) => colorMap[k] > 0)
      .map((k) => ({ value: k, count: colorMap[k] }));

    const batteryOptions = ['3 Celdas', '4 Celdas']
      .filter((k) => batteryMap[k] > 0)
      .map((k) => ({ value: k, count: batteryMap[k] }));

    const connectivityOptions = ['Wi-Fi 6 / 6E', 'Wi-Fi 5 (AC)', 'Ethernet (RJ45)', 'Bluetooth']
      .filter((k) => connMap[k] > 0)
      .map((k) => ({ value: k, count: connMap[k] }));

    return res.json({
      success: true,
      filters: {
        brandOptions,
        processors,
        ramOptions,
        storageOptions,
        screenOptions,
        keyboardOptions,
        gpuOptions,
        osOptions,
        colorOptions,
        batteryOptions,
        connectivityOptions
      }
    });
  } catch (error) {
    console.error('[GET_FILTER_OPTIONS_ERROR]', error);
    next(error);
  }
};
