const { Op } = require('sequelize');
const { Category, Brand } = require('../models');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class SearchService {
  /**
   * Builds search & filter query criteria for Products
   */
  async buildProductSearchQuery({ search, category_id, brand_id, min_price, max_price, in_stock, is_featured, specs }) {
    const where = { is_active: true };

    // Search query using ILIKE / Full-text PostgreSQL search fallback
    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } },
        { sku: { [Op.iLike]: term } }
      ];
    }

    if (category_id) {
      let targetCat = null;
      if (UUID_REGEX.test(category_id)) {
        targetCat = await Category.findByPk(category_id, {
          include: [{ model: Category, as: 'subcategories', attributes: ['id'] }]
        });
      } else {
        targetCat = await Category.findOne({
          where: { slug: category_id },
          include: [{ model: Category, as: 'subcategories', attributes: ['id'] }]
        });
      }

      if (targetCat) {
        const subCatIds = targetCat.subcategories?.map((s) => s.id) || [];
        const allIds = [targetCat.id, ...subCatIds];
        where.category_id = { [Op.in]: allIds };
      } else {
        where.category_id = '00000000-0000-0000-0000-000000000000';
      }
    }

    if (brand_id) {
      if (UUID_REGEX.test(brand_id)) {
        where.brand_id = brand_id;
      } else {
        const brand = await Brand.findOne({ where: { slug: brand_id } });
        if (brand) {
          where.brand_id = brand.id;
        } else {
          // If brand slug does not exist, return non-matching UUID for empty list
          where.brand_id = '00000000-0000-0000-0000-000000000000';
        }
      }
    }

    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price[Op.gte] = Number(min_price);
      if (max_price) where.price[Op.lte] = Number(max_price);
    }

    if (in_stock === 'true' || in_stock === true) {
      where.stock = { [Op.gt]: 0 };
    }

    if (is_featured === 'true' || is_featured === true) {
      where.is_featured = true;
    }

    // Spec Filters: AND between different categories, OR within same category

    // 1. Processor Family Filter (e.g. processor_family=I5,I7)
    if (specs?.processor_family) {
      const procList = Array.isArray(specs.processor_family)
        ? specs.processor_family
        : String(specs.processor_family).split(',').map((s) => s.trim()).filter(Boolean);
      if (procList.length > 0) {
        where.processor_family = { [Op.in]: procList };
      }
    }

    // 2. RAM GB Filter (e.g. ram_gb=8,16)
    if (specs?.ram_gb) {
      const ramList = Array.isArray(specs.ram_gb)
        ? specs.ram_gb.map(Number)
        : String(specs.ram_gb).split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n));
      if (ramList.length > 0) {
        where.ram_gb = { [Op.in]: ramList };
      }
    }

    // 3. Storage Filter (e.g. storage=512_SSD,1024_SSD)
    if (specs?.storage) {
      const storageList = Array.isArray(specs.storage)
        ? specs.storage
        : String(specs.storage).split(',').map((s) => s.trim()).filter(Boolean);

      const storageConditions = storageList.map((item) => {
        const parts = item.split('_');
        const gb = Number(parts[0]);
        const type = parts[1] ? parts[1].toUpperCase() : null;
        const cond = {};
        if (!isNaN(gb)) cond.storage_gb = gb;
        if (type) cond.storage_type = type;
        return cond;
      }).filter((c) => Object.keys(c).length > 0);

      if (storageConditions.length > 0) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ [Op.or]: storageConditions });
      }
    }

    // 4. Screen Size Range Filter (e.g. screen_range=15-15.9,14-14.9,lt13,gte16)
    if (specs?.screen_range) {
      const ranges = Array.isArray(specs.screen_range)
        ? specs.screen_range
        : String(specs.screen_range).split(',').map((s) => s.trim()).filter(Boolean);

      const screenConditions = ranges.map((r) => {
        if (r === 'lt13' || r === 'Menos de 13"') {
          return { screen_size: { [Op.lt]: 13.0 } };
        }
        if (r === '13-13.9' || r === '13" - 13.9"') {
          return { screen_size: { [Op.gte]: 13.0, [Op.lt]: 14.0 } };
        }
        if (r === '14-14.9' || r === '14" - 14.9"') {
          return { screen_size: { [Op.gte]: 14.0, [Op.lt]: 15.0 } };
        }
        if (r === '15-15.9' || r === '15" - 15.9"') {
          return { screen_size: { [Op.gte]: 15.0, [Op.lt]: 16.0 } };
        }
        if (r === 'gte16' || r === '16" o más') {
          return { screen_size: { [Op.gte]: 16.0 } };
        }
        return null;
      }).filter(Boolean);

      if (screenConditions.length > 0) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ [Op.or]: screenConditions });
      }
    }

    return where;
  }
}

module.exports = new SearchService();
