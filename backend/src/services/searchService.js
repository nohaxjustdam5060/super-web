const { Op } = require('sequelize');
const { Category, Brand } = require('../models');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class SearchService {
  /**
   * Builds search & filter query criteria for Products
   */
  async buildProductSearchQuery({ search, category_id, brand_id, min_price, max_price, in_stock, is_featured, include_inactive, status, specs }) {
    const where = {};

    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    } else if (status === 'all' || include_inactive === 'true' || include_inactive === true) {
      // Do not filter by is_active (returns both active and inactive)
    } else {
      // Default for public catalog queries: only show active products
      where.is_active = true;
    }

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
      const brandItems = Array.isArray(brand_id)
        ? brand_id
        : String(brand_id).split(',').map((s) => s.trim()).filter(Boolean);

      const foundBrandIds = [];
      for (const item of brandItems) {
        if (UUID_REGEX.test(item)) {
          foundBrandIds.push(item);
        } else {
          const brand = await Brand.findOne({
            where: {
              [Op.or]: [
                { slug: item },
                { slug: item.toLowerCase() },
                { name: { [Op.iLike]: item } }
              ]
            }
          });
          if (brand && !foundBrandIds.includes(brand.id)) {
            foundBrandIds.push(brand.id);
          }
        }
      }

      if (foundBrandIds.length > 0) {
        where.brand_id = { [Op.in]: foundBrandIds };
      } else {
        where.brand_id = '00000000-0000-0000-0000-000000000000';
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

    // Spec Filters: Hybrid querying over both relational columns and technical_specs JSONB field

    // 1. Processor Family Filter
    if (specs?.processor_family) {
      const procList = Array.isArray(specs.processor_family)
        ? specs.processor_family
        : String(specs.processor_family).split(',').map((s) => s.trim()).filter(Boolean);

      const sequelize = require('../config/database');

      if (procList.length > 0) {
        const procConditions = procList.map((proc) => {
          const escaped = sequelize.escape(`%${proc}%`);
          return {
            [Op.or]: [
              { processor_family: proc },
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE ${escaped}`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE ${escaped}`)
            ]
          };
        });

        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ [Op.or]: procConditions });
      }
    }

    // 2. RAM GB Filter
    if (specs?.ram_gb) {
      const ramList = Array.isArray(specs.ram_gb)
        ? specs.ram_gb
        : String(specs.ram_gb).split(',').map((s) => s.trim()).filter(Boolean);

      const sequelize = require('../config/database');

      if (ramList.length > 0) {
        const ramConditions = ramList.map((ramVal) => {
          const num = Number(ramVal.replace(/[^0-9]/g, ''));
          const escaped = sequelize.escape(`%${ramVal}%`);
          const conds = [
            sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'MEMORIA RAM' ILIKE ${escaped}`),
            sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'RAM' ILIKE ${escaped}`)
          ];
          if (!isNaN(num) && num > 0) {
            conds.push({ ram_gb: num });
          }
          return { [Op.or]: conds };
        });

        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ [Op.or]: ramConditions });
      }
    }

    // 3. Storage Filter (e.g. storage=512_SSD,1024_SSD)
    if (specs?.storage) {
      const storageList = Array.isArray(specs.storage)
        ? specs.storage
        : String(specs.storage).split(',').map((s) => s.trim()).filter(Boolean);

      const sequelize = require('../config/database');

      const storageConditions = storageList.map((item) => {
        const parts = item.split('_');
        const gb = Number(parts[0]);
        const type = parts[1] ? parts[1].toUpperCase() : null;

        const conds = [];
        if (!isNaN(gb)) {
          const cond = { storage_gb: gb };
          if (type) cond.storage_type = type;
          conds.push(cond);
        }

        const escaped = sequelize.escape(`%${parts[0]}%`);
        conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'ALMACENAMIENTO' ILIKE ${escaped}`));
        conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'DISCO' ILIKE ${escaped}`));

        return { [Op.or]: conds };
      });

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

      const sequelize = require('../config/database');

      const screenConditions = ranges.map((r) => {
        const conds = [];

        if (r === 'lt13' || r === 'Menos de 13"') {
          conds.push({ screen_size: { [Op.lt]: 13.0 } });
        } else if (r === '13-13.9' || r === '13" - 13.9"') {
          conds.push({ screen_size: { [Op.gte]: 13.0, [Op.lt]: 14.0 } });
        } else if (r === '14-14.9' || r === '14" - 14.9"') {
          conds.push({ screen_size: { [Op.gte]: 14.0, [Op.lt]: 15.0 } });
        } else if (r === '15-15.9' || r === '15" - 15.9"') {
          conds.push({ screen_size: { [Op.gte]: 15.0, [Op.lt]: 16.0 } });
        } else if (r === 'gte16' || r === '16" o más') {
          conds.push({ screen_size: { [Op.gte]: 16.0 } });
        }

        const escaped = sequelize.escape(`%${r}%`);
        conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TAMAÑO DE PANTALLA' ILIKE ${escaped}`));
        conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PANTALLA' ILIKE ${escaped}`));

        return { [Op.or]: conds };
      });

      if (screenConditions.length > 0) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ [Op.or]: screenConditions });
      }
    }

    // 5. Dynamic JSONB Spec Filters from remaining query params
    if (specs && typeof specs === 'object') {
      const knownKeys = ['processor_family', 'ram_gb', 'storage', 'screen_range', 'page', 'limit', 'sort', 'search', 'category_id', 'brand_id', 'min_price', 'max_price', 'in_stock', 'is_featured', 'include_inactive', 'status'];
      
      const sequelize = require('../config/database');

      Object.entries(specs).forEach(([k, v]) => {
        if (knownKeys.includes(k) || !v) return;
        const valList = Array.isArray(v)
          ? v
          : String(v).split(',').map((s) => s.trim()).filter(Boolean);

        if (valList.length === 0) return;

        const attrUpper = k.toUpperCase().replace(/_/g, ' ');
        const jsonConditions = valList.map((val) => {
          const escapedVal = sequelize.escape(`%${val}%`);
          return sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'${attrUpper}' ILIKE ${escapedVal}`);
        });

        if (jsonConditions.length > 0) {
          where[Op.and] = where[Op.and] || [];
          where[Op.and].push({ [Op.or]: jsonConditions });
        }
      });
    }

    return where;
  }
}

module.exports = new SearchService();
