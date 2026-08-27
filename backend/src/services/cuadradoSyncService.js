function slugifyString(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
const https = require('https');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Product, ProductImage, Category, Brand } = require('../models');
const logger = require('../config/logger');

const CUADRADO_JSON_URL = 'https://cuadrado.pe/lista.json';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

class CuadradoSyncService {
  /**
   * Helper to fetch JSON from cuadrado.pe with retries using native https module
   */
  async fetchCatalogData(retries = 3, delayMs = 5000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`[CuadradoSync] Intentando descargar catálogo desde ${CUADRADO_JSON_URL} (Intento ${attempt}/${retries})...`);

        const dataString = await new Promise((resolve, reject) => {
          const req = https.get(CUADRADO_JSON_URL, {
            agent: httpsAgent,
            headers: { 'User-Agent': 'SuperTech-CatalogSync/1.0' }
          }, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(`HTTP Error ${res.statusCode}: ${res.statusMessage}`));
            }
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => resolve(rawData));
          });

          req.on('error', (err) => reject(err));
          req.setTimeout(25000, () => {
            req.destroy(new Error('Timeout de lectura HTTP (25s)'));
          });
        });

        const data = JSON.parse(dataString);

        if (Array.isArray(data)) {
          logger.info(`[CuadradoSync] Catálogo descargado exitosamente. Total items recibidos: ${data.length}`);
          return data;
        }

        throw new Error('La respuesta del servidor origen no es un arreglo JSON válido.');
      } catch (error) {
        logger.warn(`[CuadradoSync] Fallo en intento ${attempt}/${retries}: ${error.message}`);
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Infer Category & Subcategory IDs based ONLY on official DB category tree
   * Applies typo-resistant Regex word boundaries (\b), brand family names, and negative device exclusions
   */
  getOfficialCategoryForProduct(productName, attributes = []) {
    const name = String(productName || '').trim();
    const attrsStr = JSON.stringify(attributes || []);
    const full = `${name} ${attrsStr}`;

    const OFFICIAL = {
      CONVERTIBLES: 'ca66ab32-6325-4ef4-8daa-6adb76361399',
      LAPTOPS_GAMING: '80e7ef4c-ccac-45f8-bd63-b496ac353125',
      LAPTOPS_EMPRESARIALES: 'f49d18a5-01da-472d-9181-f4662347c461',
      THINBOOKS: 'b175e4d0-f103-470a-b8e2-168787ac5e81',
      LAPTOPS_CONSUMO: 'ca1d0d17-4f24-473c-8693-eadc9abb6eb2',
      LAPTOPS_IA: 'b95ddd0a-d429-4234-a34e-40c422b18729',
      PCS_ESCRITORIO: '2166479c-9e2c-4c30-aa6e-832f4f7c8898',
      ALL_IN_ONE: 'ee2a6adb-581b-4f19-8350-12bab86c85ea',
      MINI_PCS: 'e76063ef-4075-4f84-ba8e-bc6e96a7e4f9',
      PROCESADORES: 'a0286a7a-6a09-4352-a48a-51f9fa3a8580',
      MEMORIAS_RAM: '8c45f470-3564-4c25-bbaf-03e3ec60cf86',
      ALMACENAMIENTO: '7df29568-6293-4ceb-a2cc-87aacbcc1e44',
      TARJETAS_VIDEO: 'e7145041-fc64-497b-9159-5535d16036c0',
      PLACAS_MADRE: '7367e10b-b511-4ee3-90f0-13f298860ae8',
      FUENTES_PODER: 'a57a6a85-8a10-4974-bd33-980b65f5a08a',
      MONITORES: 'fe7962d0-3a97-48cf-bbf9-023446426cd9',
      COMPONENTES_OEM: '3b9c8eeb-e9b3-41c0-acd4-3c6258af4162',
      CELULARES: '2473577b-7a47-4d38-8cbf-22127c502adf',
      TABLETS: '81b4a3c4-6122-4573-a832-fa0870842829',
      SMARTWATCHES: 'af1a7db2-93e9-4756-a503-0b9ec8b84da7',
      MOUSE_TECLADOS: '4fa4ff3b-f3cb-4479-9e2d-bd483daf42cd',
      MOUSEPADS: '66c37083-273b-4411-a163-b47d923c0d72',
      AUDIFONOS: '0263753c-2869-49d4-9ed1-07ed778a1bf4',
      PARLANTES_MICROFONOS: '11aabbb5-2104-4fb5-9928-727e31d85473',
      CARGADORES: 'bf6d7a45-60ee-4642-acc8-8ab0e57ba4ea',
      MOCHILAS: 'eaf9c812-8ec3-465a-ae6c-2a8f1ce90e5d',
      REDES: 'cfa57349-8c3b-451d-a0fa-af45977b079b',
      ACCESORIOS_VARIOS: '5d1fd588-c5d3-4aed-9820-0867c077ff9e',
      IMPRESORAS: 'e949e071-1cdf-4b84-b921-24902119405a',
      PROYECTORES: 'd35a5f69-d5ce-46e8-a09b-76bae147fc56',
      SOFTWARE: '9530d1dd-70dc-425f-b58d-2d82dac11c55'
    };

    // Pre-detection of Whole Devices with typo-resistant patterns (\s* for space tolerance)
    const isPrinter = /\b(impresora|multifuncional|epson\s*eco|laserjet|deskjet|smart\s*tank|ecotank|pixma)\b/i.test(full);
    const isDesktopOrMini = /\b(mini\s*pc|pro\s*mini|\bnuc\b|all[\s\-]*in[\s\-]*one|\baio\b|desktop|workstation|pc\s*gamer|prodesk|elitedesk|optiplex|thinkcentre|veriton|precision\s*tower|\bsff\b|\bmt\b|\btwr\b|\btorre\b)\b/i.test(full);

    const isLaptop = !isDesktopOrMini && (
      /\b(laptop|notebook|macbook|chromebook|omnibook|vivobook|zenbook|ideapad|thinkpad|matebook|surface|galaxy\s*book|tuf|nitro|thin|victus|legion|loq|omen|katana|cyborg|helios|strix|predator|swift|pavilion|aspire|modern|prestige|stealth|rog|vostro|probook|elitebook|latitude|expertbook|travelmate)\b/i.test(name) ||
      (/\b(14"|15\.6"|16"|17\.3"|fhd|wuxga|qhd|uhd|144hz|165hz)\b/i.test(full) && /\b(intel|amd|ryzen|core|rtx|gtx|geforce|radeon)\b/i.test(full))
    );

    const isTablet = /\b(tablet|ipad)\b/i.test(full) || (/\btab\b/i.test(name) && !/\btab\w+/i.test(name));
    const isPhone = /\b(celular|smartphone|iphone)\b/i.test(full);
    const isMonitor = /\b(monitor|pantalla)\b/i.test(name) && !isLaptop && !isPhone && !isTablet && !isDesktopOrMini;
    const isProjector = /\b(proyector|projector)\b/i.test(full);
    const isSoftware = /\b(software|antivirus|licencia|license|office|kaspersky|norton|eset|microsoft\s*365)\b/i.test(full);

    // Whole Device Flag
    const isWholeDevice = isLaptop || isDesktopOrMini || isTablet || isPhone || isPrinter || isMonitor || isProjector || isSoftware;

    // ==========================================
    // 1. CLASIFICACIÓN DE DISPOSITIVOS COMPLETOS
    // ==========================================

    // Impresoras y Oficina
    if (isPrinter) return OFFICIAL.IMPRESORAS;
    if (isProjector) return OFFICIAL.PROYECTORES;
    if (isSoftware) return OFFICIAL.SOFTWARE;

    // Computadoras de Escritorio / Mini PCs / AIO (Evaluado antes de laptops para evitar clasificación errónea de Mini PCs)
    if (isDesktopOrMini) {
      if (/\b(mini\s*pc|pro\s*mini|\bnuc\b)\b/i.test(full)) return OFFICIAL.MINI_PCS;
      if (/\b(all[\s\-]*in[\s\-]*one|\baio\b)\b/i.test(full)) return OFFICIAL.ALL_IN_ONE;
      return OFFICIAL.PCS_ESCRITORIO;
    }

    // Laptops (Procesadas jerárquicamente por modelo)
    if (isLaptop) {
      if (/\b(2\s*en\s*1|convertible|x360|yoga|spectre|flex|flip)\b/i.test(full)) return OFFICIAL.CONVERTIBLES;
      if (/\b(gaming|essential|gamer|katana|cyborg|gf63|victus|legion|tuf|rog|nitro|predator|strix|thin|loq|omen|helios|rtx|gtx)\b/i.test(full)) return OFFICIAL.LAPTOPS_GAMING;
      if (/\b(probook|elitebook|latitude|thinkpad|expertbook|travelmate|vostro)\b/i.test(full)) return OFFICIAL.LAPTOPS_EMPRESARIALES;
      if (/\b(thinkbook|ultrabook|zenbook|swift|gram|slim|air|omnibook)\b/i.test(full)) return OFFICIAL.THINBOOKS;
      if (/\b(copilot|npu|intel\s*core\s*ultra|ryzen\s*ai)\b/i.test(full)) return OFFICIAL.LAPTOPS_IA;
      return OFFICIAL.LAPTOPS_CONSUMO;
    }

    // Móviles y Wearables
    if (isPhone) return OFFICIAL.CELULARES;
    if (isTablet) return OFFICIAL.TABLETS;
    if (/\b(smartwatch|reloj\s*inteligente|apple\s*watch|galaxy\s*watch)\b/i.test(full)) return OFFICIAL.SMARTWATCHES;

    // Monitores
    if (isMonitor) return OFFICIAL.MONITORES;

    // ==========================================
    // 2. COMPONENTES INDIVIDUALES (Solo si NO es Dispositivo Completo)
    // ==========================================
    if (!isWholeDevice) {
      if (/\b(tarjeta\s*de\s*video|gpu|geforce|radeon)\b/i.test(name) || (/\b(rtx|gtx)\b/i.test(name) && !isLaptop)) {
        return OFFICIAL.TARJETAS_VIDEO;
      }
      if (/\b(placa\s*madre|motherboard|mainboard)\b/i.test(full)) return OFFICIAL.PLACAS_MADRE;
      if (/\b(fuente\s*de\s*poder|power\s*supply|psu)\b/i.test(full)) return OFFICIAL.FUENTES_PODER;

      // Procesadores (CPUs sueltas)
      if (/\b(procesador|cpu)\b/i.test(name) || /\b(intel\s*core|ryzen|athlon|pentium|celeron)\b/i.test(name)) {
        return OFFICIAL.PROCESADORES;
      }

      // Memorias RAM sueltas
      if (/\b(memoria\s*ram)\b/i.test(full) || (/\bram\b/i.test(name) && /\b(ddr4|ddr5|sodimm|udimm)\b/i.test(name))) {
        return OFFICIAL.MEMORIAS_RAM;
      }

      // Almacenamiento (SSD, HDD, NVMe, Discos Mecánicos, 5400RPM, 7200RPM, 2.5", 3.5")
      if (/\b(disco|disco\s*duro|disco\s*solido|disco\s*mecanico|\bssd\b|nvme|\bhdd\b|5400\s*rpm|7200\s*rpm|2\.5"|3\.5")\b/i.test(name)) {
        return OFFICIAL.ALMACENAMIENTO;
      }

      // Componentes OEM
      if (/\b(gabinete|case\s*gamer|cooler|refrigeracion|fan\s*rgb|oem)\b/i.test(full)) return OFFICIAL.COMPONENTES_OEM;
    }

    // ==========================================
    // 3. PERIFÉRICOS Y ACCESORIOS (Solo si NO es Dispositivo Completo)
    // ==========================================
    if (!isWholeDevice) {
      if (/\b(mousepad|pad\s*gamer)\b/i.test(full)) return OFFICIAL.MOUSEPADS;
      if (/\b(mouse|teclado|keyboard|kit\s*teclado)\b/i.test(full)) return OFFICIAL.MOUSE_TECLADOS;
      if (/\b(audifonos|audífonos|headset|airpods|earbuds|galaxy\s*buds)\b/i.test(full)) return OFFICIAL.AUDIFONOS;
      if (/\b(parlante|microfono|speaker|\bmic\b)\b/i.test(full)) return OFFICIAL.PARLANTES_MICROFONOS;
      if (/\b(cargador|power\s*bank|bateria\s*externa)\b/i.test(full)) return OFFICIAL.CARGADORES;
      if (/\b(mochila|funda\s*laptop|maletin)\b/i.test(full)) return OFFICIAL.MOCHILAS;

      // Redes
      if (/\b(tarjeta\s*wifi|adaptador\s*wifi|router|switch|access\s*point|\bredes\b)\b/i.test(full)) {
        return OFFICIAL.REDES;
      }

      if (/\b(cable|adaptador|hub\s*usb|soporte)\b/i.test(full)) return OFFICIAL.ACCESORIOS_VARIOS;
    }

    // Fallback final
    return OFFICIAL.ACCESORIOS_VARIOS;
  }

  /**
   * Infer or create Brand based on product name keywords
   */
  async getOrCreateBrandForProduct(productName, brandCache) {
    const name = (productName || '').toUpperCase();
    const knownBrands = ['HP', 'LENOVO', 'ASUS', 'DELL', 'APPLE', 'ACER', 'MSI', 'SAMSUNG', 'LOGITECH', 'TEROS', 'KINGSTON', 'CRUCIAL', 'GIGABYTE', 'AMD', 'INTEL', 'WESTERN DIGITAL', 'SEAGATE', 'TP-LINK'];

    let detectedBrand = null;
    for (const b of knownBrands) {
      const regex = new RegExp(`\\b${b}\\b`, 'i');
      if (regex.test(name)) {
        detectedBrand = b;
        break;
      }
    }

    if (!detectedBrand) return null;

    if (brandCache.has(detectedBrand)) {
      return brandCache.get(detectedBrand);
    }

    const brandSlug = slugifyString(detectedBrand);
    const [brand] = await Brand.findOrCreate({
      where: { slug: brandSlug },
      defaults: { name: detectedBrand, slug: brandSlug }
    });

    brandCache.set(detectedBrand, brand.id);
    return brand.id;
  }

  /**
   * Main Sincronization Engine
   * Executes in-memory conditional updates and batch inserts to reduce DB load to zero for unchanged products
   */
  async syncCatalog() {
    const startTime = Date.now();
    logger.info('🚀 [CuadradoSync] Iniciando proceso de sincronización condicional en memoria...');

    try {
      const items = await this.fetchCatalogData();
      if (!items || items.length === 0) {
        logger.warn('[CuadradoSync] Catálogo recibido está vacío. Abortando sync.');
        return { success: false, message: 'Catálogo vacío' };
      }

      // Caches for Category and Brand lookups
      const categoryCache = new Map();
      const brandCache = new Map();

      // Pre-load all existing categories & brands into cache to avoid DB roundtrips
      const existingCategories = await Category.findAll();
      existingCategories.forEach((c) => categoryCache.set(c.name, c.id));
      const existingBrands = await Brand.findAll();
      existingBrands.forEach((b) => brandCache.set(b.name, b.id));

      // 1. Light index query: Fetch active & inactive products from DB into memory Map
      const existingProducts = await Product.findAll({
        attributes: ['id', 'sku', 'price', 'stock', 'is_active', 'name', 'slug', 'category_id', 'brand_id']
      });

      const existingMap = new Map();
      existingProducts.forEach((p) => existingMap.set(p.sku, p));

      const activeDbSkus = new Set(
        existingProducts.filter((p) => p.is_active).map((p) => p.sku)
      );

      const incomingJsonSkus = new Set();
      const newItemsToCreate = [];
      const itemsToUpdate = [];
      let skippedCount = 0;

      // 2. Classify items in-memory
      for (const item of items) {
        if (!item.sku || !item.nombre) continue;

        const sku = String(item.sku).trim();
        incomingJsonSkus.add(sku);

        const price = Number(item.precio) || 0;
        const stock = Number(item.stock) || 0;
        const isActive = stock > 0;
        const atributos = Array.isArray(item.atributos) ? item.atributos : [];

        // Build technical specs JSONB
        const technicalSpecs = {
          atributos,
          specs_map: atributos.reduce((acc, curr) => {
            if (curr.nombre && curr.valor) {
              acc[curr.nombre.trim()] = curr.valor.trim();
            }
            return acc;
          }, {})
        };

        if (!existingMap.has(sku)) {
          // New SKU -> Queue for batch creation
          newItemsToCreate.push({
            sku,
            rawItem: item,
            price,
            stock,
            isActive,
            technicalSpecs
          });
        } else {
          // Existing SKU -> Conditional comparison
          const existing = existingMap.get(sku);
          const priceChanged = Math.abs(Number(existing.price) - price) > 0.01;
          const stockChanged = Number(existing.stock) !== stock;
          const statusChanged = Boolean(existing.is_active) !== isActive;

          if (priceChanged || stockChanged || statusChanged) {
            itemsToUpdate.push({
              id: existing.id,
              sku,
              price,
              stock,
              is_active: isActive,
              technical_specs: technicalSpecs
            });
          } else {
            skippedCount++;
          }
        }
      }

      logger.info(`📊 [CuadradoSync] Clasificación en memoria completada:
        - Total en JSON: ${items.length}
        - Nuevos para crear: ${newItemsToCreate.length}
        - Existentes con cambios (A actualizar): ${itemsToUpdate.length}
        - Sin cambios (Omitidos, 0 impacto en BD): ${skippedCount}`);

      // 3. Process Batch Updates (In batches of 100)
      let updatedCount = 0;
      const BATCH_SIZE = 100;

      for (let i = 0; i < itemsToUpdate.length; i += BATCH_SIZE) {
        const batch = itemsToUpdate.slice(i, i + BATCH_SIZE);
        await sequelize.transaction(async (t) => {
          for (const upd of batch) {
            await Product.update(
              {
                price: upd.price,
                stock: upd.stock,
                is_active: upd.is_active,
                technical_specs: upd.technical_specs
              },
              {
                where: { id: upd.id },
                transaction: t
              }
            );
            updatedCount++;
          }
        });
      }

      // 4. Process Batch Creation of New Products
      let createdCount = 0;
      for (let i = 0; i < newItemsToCreate.length; i += BATCH_SIZE) {
        const batch = newItemsToCreate.slice(i, i + BATCH_SIZE);

        for (const newItem of batch) {
          try {
            const categoryId = this.getOfficialCategoryForProduct(newItem.rawItem.nombre, newItem.rawItem.atributos);
            const brandId = await this.getOrCreateBrandForProduct(newItem.rawItem.nombre, brandCache);

            const baseSlug = slugifyString(newItem.rawItem.nombre) || 'producto';
            const uniqueSlug = `${baseSlug.slice(0, 150)}-${slugifyString(newItem.sku)}`;

            const createdProduct = await Product.create({
              sku: newItem.sku,
              name: newItem.rawItem.nombre,
              slug: uniqueSlug,
              price: newItem.price,
              stock: newItem.stock,
              is_active: newItem.isActive,
              category_id: categoryId,
              brand_id: brandId,
              technical_specs: newItem.technicalSpecs,
              description: `Especificaciones del producto ${newItem.rawItem.nombre}`
            });

            // Insert primary image if valid URL provided
            if (newItem.rawItem.imagen && typeof newItem.rawItem.imagen === 'string' && newItem.rawItem.imagen.startsWith('http')) {
              await ProductImage.create({
                product_id: createdProduct.id,
                image_url: newItem.rawItem.imagen.trim(),
                is_primary: true,
                order: 0
              });
            }

            createdCount++;
          } catch (createErr) {
            logger.error(`[CuadradoSync] Error creando producto SKU ${newItem.sku}:`, createErr.message);
          }
        }
      }

      // 5. In-Memory Set Difference for Orphans / Discontinued SKUs
      const missingSkus = Array.from(activeDbSkus).filter((sku) => !incomingJsonSkus.has(sku));
      let disabledCount = 0;

      if (missingSkus.length > 0) {
        logger.info(`[CuadradoSync] Encontrados ${missingSkus.length} SKUs descontinuados/desaparecidos del JSON. Desactivando...`);
        const [affected] = await Product.update(
          { is_active: false, stock: 0 },
          { where: { sku: { [Op.in]: missingSkus } } }
        );
        disabledCount = affected;
      }

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`✅ [CuadradoSync] Sincronización completada exitosamente en ${durationSec}s:
        - Creados: ${createdCount}
        - Actualizados: ${updatedCount}
        - Sin cambio (Omitidos): ${skippedCount}
        - Desactivados (Huérfanos): ${disabledCount}`);

      return {
        success: true,
        durationSec,
        summary: {
          totalReceived: items.length,
          createdCount,
          updatedCount,
          skippedCount,
          disabledCount
        }
      };
    } catch (error) {
      logger.error('❌ [CuadradoSync] Error crítico en la sincronización del catálogo:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CuadradoSyncService();
