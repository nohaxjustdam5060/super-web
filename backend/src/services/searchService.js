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

    // Dynamic JSONB specs filtering example
    if (specs && typeof specs === 'object') {
      Object.keys(specs).forEach((key) => {
        if (specs[key]) {
          where[`technical_specs.${key}`] = specs[key];
        }
      });
    }

    return where;
  }
}

module.exports = new SearchService();
