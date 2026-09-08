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

    // ==========================================
    // CONSOLIDATED SPEC FILTERS (Hybrid relational & JSONB)
    // ==========================================
    const sequelize = require('../config/database');
    const andClauses = [];

    // 1. Processor Family Filter
    if (specs?.processor_family) {
      const procList = Array.isArray(specs.processor_family)
        ? specs.processor_family
        : String(specs.processor_family).split(',').map((s) => s.trim()).filter(Boolean);

      const procConditions = procList.map((proc) => {
        const p = proc.toLowerCase();
        if (p.includes('ultra')) {
          return {
            [Op.or]: [
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%ultra%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE '%ultra%'`),
              { name: { [Op.iLike]: '%ultra%' } }
            ]
          };
        }
        if (p.includes('ryzen ai')) {
          return {
            [Op.or]: [
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%ryzen ai%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE '%ryzen ai%'`),
              { name: { [Op.iLike]: '%ryzen ai%' } }
            ]
          };
        }
        if (p.includes('core i9') || p === 'i9') {
          return {
            [Op.or]: [
              { processor_family: 'I9' },
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%i9%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE '%i9%'`),
              { name: { [Op.iLike]: '%Core i9%' } },
              { name: { [Op.iLike]: '%i9-%' } }
            ]
          };
        }
        if (p.includes('core i7') || p === 'i7') {
          return {
            [Op.or]: [
              { processor_family: 'I7' },
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%i7%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE '%i7%'`),
              { name: { [Op.iLike]: '%Core i7%' } },
              { name: { [Op.iLike]: '%i7-%' } }
            ]
          };
        }
        if (p.includes('core i5') || p === 'i5') {
          return {
            [Op.or]: [
              { processor_family: 'I5' },
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%i5%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE '%i5%'`),
              { name: { [Op.iLike]: '%Core i5%' } },
              { name: { [Op.iLike]: '%i5-%' } }
            ]
          };
        }
        if (p.includes('core i3') || p === 'i3') {
          return {
            [Op.or]: [
              { processor_family: 'I3' },
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%i3%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE '%i3%'`),
              { name: { [Op.iLike]: '%Core i3%' } },
              { name: { [Op.iLike]: '%i3-%' } }
            ]
          };
        }
        if (p.includes('ryzen 9')) {
          return {
            [Op.or]: [
              { processor_family: 'RYZEN 9' },
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%ryzen 9%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE '%ryzen 9%'`),
              { name: { [Op.iLike]: '%Ryzen 9%' } }
            ]
          };
        }
        if (p.includes('ryzen 7')) {
          return {
            [Op.or]: [
              { processor_family: 'RYZEN 7' },
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%ryzen 7%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE '%ryzen 7%'`),
              { name: { [Op.iLike]: '%Ryzen 7%' } }
            ]
          };
        }
        if (p.includes('ryzen 5')) {
          return {
            [Op.or]: [
              { processor_family: 'RYZEN 5' },
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%ryzen 5%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE '%ryzen 5%'`),
              { name: { [Op.iLike]: '%Ryzen 5%' } }
            ]
          };
        }
        if (p.includes('ryzen 3')) {
          return {
            [Op.or]: [
              { processor_family: 'RYZEN 3' },
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%ryzen 3%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE '%ryzen 3%'`),
              { name: { [Op.iLike]: '%Ryzen 3%' } }
            ]
          };
        }
        if (p.includes('celeron') || p.includes('n-series') || p.includes('pentium')) {
          return {
            [Op.or]: [
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%celeron%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%n150%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%n100%'`),
              sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE '%pentium%'`),
              { name: { [Op.iLike]: '%celeron%' } },
              { name: { [Op.iLike]: '%N150%' } }
            ]
          };
        }
        const escaped = sequelize.escape(`%${proc}%`);
        return {
          [Op.or]: [
            { processor_family: proc },
            sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR' ILIKE ${escaped}`),
            sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PROCESADOR / CPU' ILIKE ${escaped}`),
            { name: { [Op.iLike]: `%${proc}%` } }
          ]
        };
      });

      if (procConditions.length > 0) {
        andClauses.push({ [Op.or]: procConditions });
      }
    }

    // 2. RAM Capacity Filter (e.g. "8 GB", "16 GB", "32 GB", "64 GB")
    if (specs?.ram_gb) {
      const ramList = Array.isArray(specs.ram_gb)
        ? specs.ram_gb
        : String(specs.ram_gb).split(',').map((s) => s.trim()).filter(Boolean);

      const ramConditions = ramList.map((ramVal) => {
        const num = parseInt(ramVal.replace(/[^0-9]/g, ''), 10);
        const conds = [];
        if (!isNaN(num) && num > 0) {
          conds.push({ ram_gb: num });
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'RAM' ILIKE '%${num}GB%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'RAM' ILIKE '%${num} GB%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'MEMORIA RAM' ILIKE '%${num}GB%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'MEMORIA RAM' ILIKE '%${num} GB%'`));
          conds.push({ name: { [Op.iLike]: `% ${num}GB %` } });
          conds.push({ name: { [Op.iLike]: `% ${num} GB %` } });
          conds.push({ name: { [Op.iLike]: `%${num}GB%` } });
        }
        return { [Op.or]: conds };
      });

      if (ramConditions.length > 0) {
        andClauses.push({ [Op.or]: ramConditions });
      }
    }

    // 3. Storage Capacity Filter (e.g. "256 GB", "512 GB", "1 TB", "2 TB")
    if (specs?.storage) {
      const storageList = Array.isArray(specs.storage)
        ? specs.storage
        : String(specs.storage).split(',').map((s) => s.trim()).filter(Boolean);

      const storageConditions = storageList.map((item) => {
        let gb = 0;
        if (item.toUpperCase().includes('TB')) {
          gb = parseInt(item.replace(/[^0-9]/g, ''), 10) * 1024;
        } else {
          gb = parseInt(item.replace(/[^0-9]/g, ''), 10);
        }

        const rawTerm = item.replace(/\s+/g, '');
        const conds = [];
        if (!isNaN(gb) && gb > 0) {
          conds.push({ storage_gb: gb });
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'ALMACENAMIENTO' ILIKE '%${rawTerm}%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'ALMACENAMIENTO' ILIKE '%${item}%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'DISCO' ILIKE '%${rawTerm}%'`));
          conds.push({ name: { [Op.iLike]: `%${rawTerm}%` } });
          conds.push({ name: { [Op.iLike]: `%${item}%` } });
        }
        return { [Op.or]: conds };
      });

      if (storageConditions.length > 0) {
        andClauses.push({ [Op.or]: storageConditions });
      }
    }

    // 4. Screen Size Diagonal Filter (e.g. '14"', '15.6"', '16"', '17.3"')
    if (specs?.screen_range || specs?.screen_size) {
      const rawParam = specs.screen_range || specs.screen_size;
      const screenList = Array.isArray(rawParam)
        ? rawParam
        : String(rawParam).split(',').map((s) => s.trim()).filter(Boolean);

      const screenConditions = screenList.map((r) => {
        const num = parseFloat(r.replace(/[^0-9.]/g, ''));
        const conds = [];
        if (!isNaN(num) && num > 0) {
          conds.push({
            screen_size: {
              [Op.gte]: num - 0.25,
              [Op.lte]: num + 0.25
            }
          });
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'PANTALLA' ILIKE '%${num}%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TAMAÑO DE PANTALLA' ILIKE '%${num}%'`));
          conds.push({ name: { [Op.iLike]: `%${num}%` } });
        }
        return { [Op.or]: conds };
      });

      if (screenConditions.length > 0) {
        andClauses.push({ [Op.or]: screenConditions });
      }
    }

    // 5. Keyboard Filter ("Latinoamericano / Español", "Retroiluminado", "Inglés / US")
    if (specs?.teclado) {
      const kbList = Array.isArray(specs.teclado)
        ? specs.teclado
        : String(specs.teclado).split(',').map((s) => s.trim()).filter(Boolean);

      const kbConditions = kbList.map((item) => {
        const conds = [];
        if (/latino|español|esp|latam/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TECLADO' ILIKE '%LATINO%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TECLADO' ILIKE '%ESPAÑOL%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TECLADO' ILIKE '%ESP%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TECLADO' ILIKE '%LATAM%'`));
          conds.push({ name: { [Op.iLike]: '%Español%' } });
          conds.push({ name: { [Op.iLike]: '%Latino%' } });
        } else if (/ingl[eé]s|americano|\bus\b/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TECLADO' ILIKE '%INGLES%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TECLADO' ILIKE '%AMERICANO%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TECLADO' ILIKE '%ENGLISH%'`));
        } else if (/retroiluminado|rgb|backlit/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TECLADO' ILIKE '%RETROILUMINADO%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TECLADO' ILIKE '%RGB%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TECLADO' ILIKE '%BACKLIT%'`));
        }
        return { [Op.or]: conds };
      });

      if (kbConditions.length > 0) {
        andClauses.push({ [Op.or]: kbConditions });
      }
    }

    // 6. Graphics Card / GPU Filter ("NVIDIA RTX 4060", "NVIDIA RTX ADA", "Intel Iris Xe", etc.)
    if (specs?.tarjeta_grafica) {
      const gpuList = Array.isArray(specs.tarjeta_grafica)
        ? specs.tarjeta_grafica
        : String(specs.tarjeta_grafica).split(',').map((s) => s.trim()).filter(Boolean);

      const gpuConditions = gpuList.map((item) => {
        const conds = [];
        const m = item.match(/\b(5090|5080|5070|5060|5050|4090|4080|4070|4060|4050|3080|3070|3060|3050|2050|1650)\b/);
        if (m) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TARJETA GRAFICA' ILIKE '%${m[1]}%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TARJETA DE VIDEO' ILIKE '%${m[1]}%'`));
          conds.push({ name: { [Op.iLike]: `%${m[1]}%` } });
        } else if (/ada|quadro/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TARJETA GRAFICA' ILIKE '%ADA%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TARJETA GRAFICA' ILIKE '%QUADRO%'`));
        } else if (/iris/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TARJETA GRAFICA' ILIKE '%IRIS%'`));
          conds.push({ name: { [Op.iLike]: '%Iris Xe%' } });
        } else if (/arc\b/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TARJETA GRAFICA' ILIKE '%ARC%'`));
        } else if (/uhd|hd|intel graphics/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TARJETA GRAFICA' ILIKE '%UHD%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TARJETA GRAFICA' ILIKE '%INTEL GRAPHICS%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TARJETA GRAFICA' ILIKE '%HD%'`));
        } else if (/radeon/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'TARJETA GRAFICA' ILIKE '%RADEON%'`));
          conds.push({ name: { [Op.iLike]: '%Radeon%' } });
        }
        return { [Op.or]: conds };
      });

      if (gpuConditions.length > 0) {
        andClauses.push({ [Op.or]: gpuConditions });
      }
    }

    // 7. Operating System Filter ("Windows 11 Home", "Windows 11 Pro", "FreeDOS / Sin Sistema Operativo", etc.)
    if (specs?.so || specs?.sistema_operativo) {
      const rawParam = specs.so || specs.sistema_operativo;
      const osList = Array.isArray(rawParam)
        ? rawParam
        : String(rawParam).split(',').map((s) => s.trim()).filter(Boolean);

      const osConditions = osList.map((item) => {
        const conds = [];
        if (/11\s*pro/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'SISTEMA OPERATIVO' ILIKE '%WINDOWS 11 PRO%'`));
        } else if (/11\s*home/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'SISTEMA OPERATIVO' ILIKE '%WINDOWS 11 HOME%'`));
        } else if (/10\s*pro/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'SISTEMA OPERATIVO' ILIKE '%WINDOWS 10%'`));
        } else if (/free|sin sistema/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'SISTEMA OPERATIVO' ILIKE '%FREE DOS%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'SISTEMA OPERATIVO' ILIKE '%FREEDOS%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'SISTEMA OPERATIVO' ILIKE '%SIN SISTEMA%'`));
        } else if (/android/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'SISTEMA OPERATIVO' ILIKE '%ANDROID%'`));
        }
        return { [Op.or]: conds };
      });

      if (osConditions.length > 0) {
        andClauses.push({ [Op.or]: osConditions });
      }
    }

    // 8. Color Filter ("Negro", "Gris / Plateado", "Blanco", "Azul")
    if (specs?.color) {
      const colorList = Array.isArray(specs.color)
        ? specs.color
        : String(specs.color).split(',').map((s) => s.trim()).filter(Boolean);

      const colorConditions = colorList.map((item) => {
        const conds = [];
        if (/negro/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'COLOR' ILIKE '%BLACK%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'COLOR' ILIKE '%NEGRO%'`));
        } else if (/gris|plateado/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'COLOR' ILIKE '%GREY%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'COLOR' ILIKE '%GRIS%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'COLOR' ILIKE '%SILVER%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'COLOR' ILIKE '%MECHA%'`));
        } else if (/blanco/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'COLOR' ILIKE '%WHITE%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'COLOR' ILIKE '%BLANCO%'`));
        } else if (/azul/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'COLOR' ILIKE '%BLUE%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'COLOR' ILIKE '%AZUL%'`));
        }
        return { [Op.or]: conds };
      });

      if (colorConditions.length > 0) {
        andClauses.push({ [Op.or]: colorConditions });
      }
    }

    // 9. Battery Filter ("3 Celdas", "4 Celdas")
    if (specs?.bateria) {
      const batList = Array.isArray(specs.bateria)
        ? specs.bateria
        : String(specs.bateria).split(',').map((s) => s.trim()).filter(Boolean);

      const batConditions = batList.map((item) => {
        const conds = [];
        if (/4\s*celda/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'BATERIA' ILIKE '%4 CELL%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'BATERIA' ILIKE '%4 CELDA%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'BATERIA' ILIKE '%90 WH%'`));
        } else if (/3\s*celda/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'BATERIA' ILIKE '%3 CELL%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'BATERIA' ILIKE '%3 CELDA%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'BATERIA' ILIKE '%4%WH%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'BATERIA' ILIKE '%5%WH%'`));
        }
        return { [Op.or]: conds };
      });

      if (batConditions.length > 0) {
        andClauses.push({ [Op.or]: batConditions });
      }
    }

    // 10. Connectivity Filter ("Wi-Fi 6 / 6E", "Wi-Fi 5 (AC)", "Ethernet (RJ45)", "Bluetooth")
    if (specs?.conectividad) {
      const connList = Array.isArray(specs.conectividad)
        ? specs.conectividad
        : String(specs.conectividad).split(',').map((s) => s.trim()).filter(Boolean);

      const connConditions = connList.map((item) => {
        const conds = [];
        if (/wi-?fi\s*6/i.test(item) || /ax/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'CONECTIVIDAD' ILIKE '%WIFI 6%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'CONECTIVIDAD' ILIKE '%AX%'`));
        } else if (/wi-?fi\s*5/i.test(item) || /ac\b/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'CONECTIVIDAD' ILIKE '%WIFI 5%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'CONECTIVIDAD' ILIKE '%AC%'`));
        } else if (/rj45|ethernet/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'CONECTIVIDAD' ILIKE '%RJ45%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'CONECTIVIDAD' ILIKE '%ETHERNET%'`));
        } else if (/bluetooth/i.test(item)) {
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'CONECTIVIDAD' ILIKE '%BLUETOOTH%'`));
          conds.push(sequelize.literal(`"Product"."technical_specs"->'specs_map'->>'BLUETOOTH' IS NOT NULL`));
        }
        return { [Op.or]: conds };
      });

      if (connConditions.length > 0) {
        andClauses.push({ [Op.or]: connConditions });
      }
    }

    if (andClauses.length > 0) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(...andClauses);
    }

    return where;
  }
}

module.exports = new SearchService();
