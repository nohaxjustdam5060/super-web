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
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Product, ProductImage, Category, Brand } = require('../models');
const logger = require('../config/logger');

const CUADRADO_API_URL = process.env.CUADRADO_API_URL || 'https://app.cuadrado.pe/cuadrado/api';
const CUADRADO_API_TOKEN = process.env.CUADRADO_API_TOKEN || '';
const CUADRADO_SYNC_PAGE_LIMIT = parseInt(process.env.CUADRADO_SYNC_PAGE_LIMIT, 10) || 50;
const CUADRADO_SYNC_TIMEOUT_MS = parseInt(process.env.CUADRADO_SYNC_TIMEOUT_MS, 10) || 15000;

class CuadradoSyncService {
  /**
   * Helper to fetch a single page from Cuadrado API with timeout and retries
   */
  async fetchPage(page = 1, limit = parseInt(process.env.CUADRADO_SYNC_PAGE_LIMIT, 10) || 50, retries = 3) {
    const baseUrl = (process.env.CUADRADO_API_URL || 'https://app.cuadrado.pe/cuadrado/api').replace(/\/+$/, '');
    const url = `${baseUrl}/products?is_active=true&page=${page}&limit=${limit}`;
    const rawToken = process.env.CUADRADO_API_TOKEN || '';
    const token = rawToken.replace(/^["']|["']$/g, '').trim();
    const timeoutMs = parseInt(process.env.CUADRADO_SYNC_TIMEOUT_MS, 10) || 15000;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const headers = {
          'Accept': 'application/json',
          'User-Agent': 'SUPERLAPTOP-CatalogSync/2.0'
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(timeoutMs)
        });

        if (!response.ok) {
          const status = response.status;
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (_) {}

          if (status === 401 || status === 403) {
            throw new Error(`HTTP Error ${status}: Autenticación fallida con la API de Cuadrado. Verifique CUADRADO_API_TOKEN en .env. Detalle: ${errorText.slice(0, 200)}`);
          }
          throw new Error(`HTTP Error ${status}: ${response.statusText} - ${errorText.slice(0, 200)}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        // Don't retry if authentication error
        if (error.message.includes('HTTP Error 401') || error.message.includes('HTTP Error 403')) {
          throw error;
        }
        logger.warn(`[CuadradoSync] Fallo al obtener página ${page} (Intento ${attempt}/${retries}): ${error.message}`);
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  /**
   * Fetches all products across all pages from official Cuadrado API
   */
  async fetchCatalogData() {
    logger.info(`[CuadradoSync] Conectando a API oficial de Cuadrado: ${CUADRADO_API_URL}/products (Límite por página: ${CUADRADO_SYNC_PAGE_LIMIT})...`);

    // 1. Fetch first page to obtain pagination metadata
    const firstPageResponse = await this.fetchPage(1, CUADRADO_SYNC_PAGE_LIMIT);

    let allItems = [];
    let total = 0;
    let limit = CUADRADO_SYNC_PAGE_LIMIT;

    if (firstPageResponse && firstPageResponse.data) {
      if (Array.isArray(firstPageResponse.data.data)) {
        // Standard structure: { success: true, data: { data: [...], total, page, limit } }
        allItems = [...firstPageResponse.data.data];
        total = Number(firstPageResponse.data.total) || allItems.length;
        limit = Number(firstPageResponse.data.limit) || CUADRADO_SYNC_PAGE_LIMIT;
      } else if (Array.isArray(firstPageResponse.data)) {
        // Direct array in data: { success: true, data: [...], total }
        allItems = [...firstPageResponse.data];
        total = Number(firstPageResponse.total) || allItems.length;
      }
    } else if (Array.isArray(firstPageResponse)) {
      allItems = [...firstPageResponse];
      total = allItems.length;
    }

    const totalPages = Math.ceil(total / limit);
    logger.info(`[CuadradoSync] Página 1 obtenida (${allItems.length} items). Total en catálogo: ${total} | Total páginas: ${totalPages}`);

    if (totalPages <= 1) {
      return allItems;
    }

    // 2. Fetch remaining pages with controlled concurrency (chunks of 3)
    const pageNumbers = [];
    for (let p = 2; p <= totalPages; p++) {
      pageNumbers.push(p);
    }

    const CHUNK_SIZE = 3;
    for (let i = 0; i < pageNumbers.length; i += CHUNK_SIZE) {
      const chunk = pageNumbers.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (pageNum) => {
          try {
            const pageData = await this.fetchPage(pageNum, limit);
            if (pageData && pageData.data && Array.isArray(pageData.data.data)) {
              return pageData.data.data;
            } else if (pageData && pageData.data && Array.isArray(pageData.data)) {
              return pageData.data;
            } else if (Array.isArray(pageData)) {
              return pageData;
            }
            return [];
          } catch (err) {
            logger.error(`[CuadradoSync] Error persistente al descargar página ${pageNum}:`, err.message);
            return [];
          }
        })
      );

      for (const res of chunkResults) {
        allItems.push(...res);
      }
      logger.info(`[CuadradoSync] Progreso de ingesta: ${allItems.length}/${total} productos descargados...`);
    }

    logger.info(`[CuadradoSync] Ingesta paginada finalizada exitosamente. Total items consolidados: ${allItems.length}`);
    return allItems;
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
      if (/\b(probook|elitebook|latitude|thinkpad|expertbook|travelmate|vostro|precision|zbook)\b/i.test(full)) return OFFICIAL.LAPTOPS_EMPRESARIALES;
      if (/\b(gaming|essential|gamer|katana|cyborg|gf63|victus|legion|tuf|rog|nitro|predator|strix|thin|loq|omen|helios|rtx|gtx)\b/i.test(full)) return OFFICIAL.LAPTOPS_GAMING;
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
   * Infer or create Brand based on API brand object or product name keywords
   */
  async getOrCreateBrandForProduct(productName, brandCache, explicitBrand = null) {
    let brandNameCandidate = null;

    if (explicitBrand) {
      if (typeof explicitBrand === 'string' && explicitBrand.trim().length > 0) {
        brandNameCandidate = explicitBrand.trim().toUpperCase();
      } else if (typeof explicitBrand === 'object' && explicitBrand.name) {
        brandNameCandidate = String(explicitBrand.name).trim().toUpperCase();
      }
    }

    if (!brandNameCandidate) {
      const name = (productName || '').toUpperCase();
      const knownBrands = [
        'EPSON', 'HP', 'LENOVO', 'ASUS', 'DELL', 'APPLE', 'ACER', 'MSI', 'SAMSUNG',
        'LOGITECH', 'TEROS', 'KINGSTON', 'CRUCIAL', 'GIGABYTE', 'AMD', 'INTEL',
        'WESTERN DIGITAL', 'SEAGATE', 'TP-LINK', 'CANON', 'BROTHER', 'LG', 'XIAOMI',
        'MOTOROLA', 'COUGAR', 'CORSAIR', 'RAZER', 'REDRAGON', 'HAVIT', 'VSG', 'T-FORCE',
        'PATRIOT', 'EVGA', 'ZOTAC', 'PALIT', 'PNY', 'ASROCK', 'BIOSTAR', 'BENQ',
        'VIEWSONIC', 'MERCUSYS', 'DLINK', 'NEXXT', 'CYBERTEL', 'HALION', 'KOLINK'
      ];

      for (const b of knownBrands) {
        const regex = new RegExp(`\\b${b.replace('-', '\\-')}\\b`, 'i');
        if (regex.test(name)) {
          brandNameCandidate = b;
          break;
        }
      }
    }

    if (!brandNameCandidate) return null;

    if (brandCache && brandCache.has(brandNameCandidate)) {
      return brandCache.get(brandNameCandidate);
    }

    const brandSlug = slugifyString(brandNameCandidate);
    const [brand] = await Brand.findOrCreate({
      where: { slug: brandSlug },
      defaults: { name: brandNameCandidate, slug: brandSlug }
    });

    if (brandCache) brandCache.set(brandNameCandidate, brand.id);
    return brand.id;
  }

  /**
   * Helper to normalize product attributes into structured JSONB
   */
  normalizeAttributes(rawItem) {
    const list = [];
    const rawList = Array.isArray(rawItem.attribute_values)
      ? rawItem.attribute_values
      : (Array.isArray(rawItem.atributos) ? rawItem.atributos : []);

    for (const a of rawList) {
      if (!a) continue;
      let name = '';
      let val = '';
      if (typeof a === 'string') {
        val = a;
      } else {
        name = a.nombre || (a.attribute && a.attribute.name) || a.name || a.key || a.label || '';
        val = a.valor || a.value || a.val || '';
      }
      name = String(name).trim();
      val = String(val).trim();
      if (name || val) {
        list.push({ nombre: name || 'General', valor: val });
      }
    }

    const specsMap = {};
    for (const item of list) {
      if (item.nombre && item.valor) {
        specsMap[item.nombre] = item.valor;
      }
    }

    return {
      atributos: list,
      specs_map: specsMap
    };
  }

  /**
   * Helper to extract all valid image URLs from supplier's JSON raw item
   * Supports: rawItem.images, rawItem.imagenes, rawItem.galeria, rawItem.fotos,
   * comma-separated strings, objects with image_url/url/src, and sequential fields (imagen1, etc.)
   */
  extractImageUrlsFromRawItem(rawItem) {
    const urls = [];

    const addUrl = (urlStr) => {
      if (urlStr && typeof urlStr === 'string') {
        const trimmed = urlStr.trim();
        if (trimmed.startsWith('http') && !urls.includes(trimmed)) {
          urls.push(trimmed);
        }
      }
    };

    if (!rawItem) return urls;

    // 1. Array fields: rawItem.images, rawItem.imagenes, rawItem.galeria, rawItem.fotos
    ['images', 'imagenes', 'galeria', 'fotos'].forEach((key) => {
      if (Array.isArray(rawItem[key])) {
        rawItem[key].forEach((imgObj) => {
          if (typeof imgObj === 'string') {
            addUrl(imgObj);
          } else if (imgObj && typeof imgObj === 'object') {
            addUrl(imgObj.image_url || imgObj.url || imgObj.src || imgObj.path || imgObj.href);
          }
        });
      } else if (typeof rawItem[key] === 'string') {
        rawItem[key].split(/[,;]/).forEach(addUrl);
      }
    });

    // 2. Main scalar image fields: rawItem.image, rawItem.imagen, rawItem.image_url, rawItem.foto
    ['image', 'imagen', 'image_url', 'foto'].forEach((key) => {
      if (rawItem[key]) {
        if (typeof rawItem[key] === 'string') {
          rawItem[key].split(/[,;]/).forEach(addUrl);
        } else if (Array.isArray(rawItem[key])) {
          rawItem[key].forEach((img) => typeof img === 'string' && addUrl(img));
        } else if (typeof rawItem[key] === 'object') {
          addUrl(rawItem[key].image_url || rawItem[key].url || rawItem[key].src);
        }
      }
    });

    // 3. Sequential image fields: rawItem.imagen1, rawItem.imagen2, rawItem.imagen_1, rawItem.image1, etc.
    for (let i = 1; i <= 10; i++) {
      if (rawItem[`imagen${i}`]) addUrl(rawItem[`imagen${i}`]);
      if (rawItem[`imagen_${i}`]) addUrl(rawItem[`imagen_${i}`]);
      if (rawItem[`image${i}`]) addUrl(rawItem[`image${i}`]);
      if (rawItem[`image_${i}`]) addUrl(rawItem[`image_${i}`]);
    }

    return urls;
  }

  /**
   * Main Sincronization Engine
   * Executes in-memory conditional updates and batch inserts to reduce DB load to zero for unchanged products
   */
  async syncCatalog() {
    const startTime = Date.now();
    logger.info('🚀 [CuadradoSync] Iniciando proceso de sincronización con API oficial de Cuadrado...');

    try {
      const items = await this.fetchCatalogData();
      if (!items || items.length === 0) {
        logger.warn('[CuadradoSync] Catálogo recibido está vacío. Abortando sync.');
        return { success: false, message: 'Catálogo vacío o no disponible' };
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
        attributes: ['id', 'external_id', 'sku', 'price', 'offer_price', 'stock', 'is_active', 'name', 'slug', 'category_id', 'brand_id']
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
        const sku = item.sku ? String(item.sku).trim() : null;
        const name = String(item.name || item.nombre || '').trim();

        if (!sku || !name) continue;

        incomingJsonSkus.add(sku);

        const externalId = item.id ? String(item.id).trim() : null;

        // Pricing calculation
        const basePrice = Number(item.base_price !== undefined && item.base_price !== null ? item.base_price : (item.precio !== undefined ? item.precio : 0)) || 0;
        const salePrice = Number(item.sale_price) || null;
        const webPrice = Number(item.web_price) || null;

        let price = basePrice > 0 ? basePrice : (salePrice || webPrice || 0);
        let offerPrice = null;

        if (webPrice && webPrice > 0 && webPrice < price) {
          offerPrice = webPrice;
        } else if (salePrice && salePrice > 0 && salePrice < price) {
          offerPrice = salePrice;
        }

        if (price === 0 && offerPrice) {
          price = offerPrice;
          offerPrice = null;
        }

        // Stock and active status
        const stock = Number(item.stock_quantity !== undefined && item.stock_quantity !== null ? item.stock_quantity : (item.stock !== undefined ? item.stock : 0)) || 0;
        const isActive = (item.is_active !== false) && stock > 0;

        // Technical specs normalization
        const technicalSpecs = this.normalizeAttributes(item);

        if (!existingMap.has(sku)) {
          // New SKU -> Queue for batch creation
          newItemsToCreate.push({
            sku,
            externalId,
            name,
            rawItem: item,
            price,
            offerPrice,
            stock,
            isActive,
            technicalSpecs
          });
        } else {
          // Existing SKU -> Conditional comparison
          const existing = existingMap.get(sku);

          const priceChanged = Math.abs(Number(existing.price || 0) - price) > 0.01;
          const offerPriceChanged = (existing.offer_price === null && offerPrice !== null) ||
            (existing.offer_price !== null && offerPrice === null) ||
            (offerPrice !== null && Math.abs(Number(existing.offer_price || 0) - offerPrice) > 0.01);
          const stockChanged = Number(existing.stock) !== stock;
          const statusChanged = Boolean(existing.is_active) !== isActive;
          const externalIdChanged = Boolean(externalId && existing.external_id !== externalId);
          const missingBrand = !existing.brand_id;

          let brandIdToAssign = null;
          if (missingBrand) {
            brandIdToAssign = await this.getOrCreateBrandForProduct(name, brandCache, item.brand);
          }

          if (priceChanged || offerPriceChanged || stockChanged || statusChanged || externalIdChanged || (missingBrand && brandIdToAssign)) {
            itemsToUpdate.push({
              id: existing.id,
              sku,
              external_id: externalId || existing.external_id,
              price,
              offer_price: offerPrice,
              stock,
              is_active: isActive,
              technical_specs: technicalSpecs,
              ...(brandIdToAssign ? { brand_id: brandIdToAssign } : {})
            });
          } else {
            skippedCount++;
          }
        }
      }

      logger.info(`📊 [CuadradoSync] Clasificación en memoria completada:
        - Total en API: ${items.length}
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
            const updatePayload = {
              price: upd.price,
              offer_price: upd.offer_price,
              stock: upd.stock,
              is_active: upd.is_active,
              technical_specs: upd.technical_specs
            };
            if (upd.external_id) {
              updatePayload.external_id = upd.external_id;
            }
            if (upd.brand_id) {
              updatePayload.brand_id = upd.brand_id;
            }
            await Product.update(
              updatePayload,
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
            const categoryId = this.getOfficialCategoryForProduct(newItem.name, newItem.technicalSpecs.atributos);
            const brandId = await this.getOrCreateBrandForProduct(newItem.name, brandCache, newItem.rawItem.brand);

            const baseSlug = slugifyString(newItem.name) || 'producto';
            const uniqueSlug = `${baseSlug.slice(0, 150)}-${slugifyString(newItem.sku)}`;

            const createdProduct = await Product.create({
              external_id: newItem.externalId,
              sku: newItem.sku,
              name: newItem.name,
              slug: uniqueSlug,
              price: newItem.price,
              offer_price: newItem.offerPrice,
              stock: newItem.stock,
              is_active: newItem.isActive,
              category_id: categoryId,
              brand_id: brandId,
              technical_specs: newItem.technicalSpecs,
              description: newItem.rawItem.description || newItem.rawItem.descripcion || `Especificaciones del producto ${newItem.name}`
            });

            // Insert all extracted images for new product
            const imageUrls = this.extractImageUrlsFromRawItem(newItem.rawItem);
            if (imageUrls.length > 0) {
              await Promise.all(
                imageUrls.map((url, idx) =>
                  ProductImage.create({
                    product_id: createdProduct.id,
                    image_url: url,
                    is_primary: idx === 0,
                    order: idx
                  })
                )
              );
              await createdProduct.update({ image_url: imageUrls[0] });
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
        logger.info(`[CuadradoSync] Encontrados ${missingSkus.length} SKUs descontinuados/desaparecidos de la API. Desactivando...`);
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
      logger.error(`❌ [CuadradoSync] Error crítico en la sincronización del catálogo: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atomic remote stock decrement via POST /inventory/stock/decrement
   * Reconciles local Postgres product stock immediately with the { to } value returned by the ERP
   */
  async decrementRemoteStock(productId, quantity, reason = 'Venta online') {
    const parsedProductId = parseInt(productId, 10);
    const parsedQuantity = parseInt(quantity, 10);

    if (isNaN(parsedProductId) || parsedProductId <= 0 || isNaN(parsedQuantity) || parsedQuantity <= 0) {
      logger.warn(`[CuadradoSync] Parámetros inválidos para decrementRemoteStock: product_id=${productId}, quantity=${quantity}`);
      return { success: false, message: 'Parámetros inválidos para decremento' };
    }

    const baseUrl = (process.env.CUADRADO_API_URL || 'https://app.cuadrado.pe/cuadrado/api').replace(/\/+$/, '');
    const url = `${baseUrl}/inventory/stock/decrement`;
    const rawToken = process.env.CUADRADO_API_TOKEN || '';
    const token = rawToken.replace(/^["']|["']$/g, '').trim();
    const timeoutMs = parseInt(process.env.CUADRADO_SYNC_TIMEOUT_MS, 10) || 15000;

    if (!token || token.includes('placeholder') || token.includes('xxx')) {
      logger.warn('[CuadradoSync] CUADRADO_API_TOKEN no configurado o es placeholder. Omitiendo decremento remoto en ERP.');
      return { success: false, message: 'Token de API no configurado' };
    }

    try {
      const payload = {
        product_id: parsedProductId,
        quantity: parsedQuantity,
        reason: String(reason || 'Venta online').slice(0, 150)
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'SUPERLAPTOP-CatalogSync/2.0'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch (_) {}
        logger.warn(`[CuadradoSync] Error en decremento remoto (HTTP ${response.status}) para product_id ${parsedProductId}: ${errorBody.slice(0, 200)}`);
        return { success: false, status: response.status, error: errorBody };
      }

      const json = await response.json();
      const data = json.data || {};
      const newStock = typeof data.to === 'number' ? data.to : null;

      // Reconcile local Postgres DB immediately if new stock value is present
      if (newStock !== null) {
        await Product.update(
          {
            stock: newStock,
            is_active: newStock > 0
          },
          {
            where: { external_id: String(parsedProductId) }
          }
        );
        logger.info(`✅ [CuadradoSync] Stock decrementado en ERP: product_id ${parsedProductId} (-${parsedQuantity}). Stock reconciliado en BD local: ${newStock}`);
      }

      return {
        success: true,
        data: {
          product_id: parsedProductId,
          from: data.from,
          to: newStock,
          requested: parsedQuantity,
          delta: data.delta
        }
      };
    } catch (error) {
      logger.warn(`[CuadradoSync] Fallo de conexión/timeout al decrementar stock para product_id ${parsedProductId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processes stock decrement for an entire order.
   * Decrements remote ERP stock for products with external_id, and decrements local DB for native products.
   */
  async decrementStockForOrder(order) {
    if (!order) {
      return { success: false, message: 'Orden no proporcionada' };
    }

    const orderNumber = order.order_number || order.id;
    const items = order.items || [];

    if (items.length === 0) {
      logger.info(`[CuadradoSync] Orden #${orderNumber} no tiene items para decrementar stock.`);
      return { success: true, processed: 0 };
    }

    logger.info(`📦 [CuadradoSync] Iniciando decremento de stock para Orden #${orderNumber} (${items.length} items)...`);

    try {
      // 1. Fetch products from DB to get their external_id and local stock
      const productIds = items.map((i) => i.product_id).filter(Boolean);
      const dbProducts = await Product.findAll({
        where: { id: { [Op.in]: productIds } },
        attributes: ['id', 'external_id', 'stock', 'name', 'sku']
      });

      const productMap = new Map(dbProducts.map((p) => [String(p.id), p]));

      // 2. Prepare decrement tasks
      const decrementTasks = items.map(async (item) => {
        const product = productMap.get(String(item.product_id));
        const quantity = Number(item.quantity) || 1;
        const reason = `Venta online #${orderNumber}`;

        if (!product) {
          logger.warn(`[CuadradoSync] Producto id ${item.product_id} no encontrado en base de datos al procesar orden #${orderNumber}`);
          return { success: false, product_id: item.product_id, message: 'Producto no encontrado' };
        }

        if (product.external_id) {
          // Product synced from Cuadrado ERP -> Atomic remote decrement
          return await this.decrementRemoteStock(product.external_id, quantity, reason);
        } else {
          // Local/Native product without external_id -> Decrement directly in local DB
          const newLocalStock = Math.max(0, (product.stock || 0) - quantity);
          await Product.update(
            {
              stock: newLocalStock,
              is_active: newLocalStock > 0
            },
            {
              where: { id: product.id }
            }
          );
          logger.info(`[CuadradoSync] Stock local decrementado para producto nativo ${product.name} (-${quantity}). Nuevo stock: ${newLocalStock}`);
          return { success: true, is_local: true, product_id: product.id, to: newLocalStock };
        }
      });

      const results = await Promise.allSettled(decrementTasks);
      const successfulCount = results.filter((r) => r.status === 'fulfilled' && r.value?.success).length;

      logger.info(`✅ [CuadradoSync] Decremento completado para Orden #${orderNumber}: ${successfulCount}/${items.length} items procesados exitosamente.`);

      return {
        success: true,
        orderNumber,
        totalItems: items.length,
        successfulCount,
        results: results.map((r) => (r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }))
      };
    } catch (orderErr) {
      logger.error(`[CuadradoSync] Error general al procesar decremento de stock para orden #${orderNumber}: ${orderErr.message}`);
      return { success: false, error: orderErr.message };
    }
  }
}

module.exports = new CuadradoSyncService();
