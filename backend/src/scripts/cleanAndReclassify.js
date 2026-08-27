require('dotenv').config();
const { Product, Category, sequelize } = require('../models');
const { Op } = require('sequelize');

// OFFICIAL DB CATEGORY & SUBCATEGORY ID MAP
const OFFICIAL_IDS = {
  // Laptops
  LAPTOPS_PARENT: '7edd4fe0-3b4f-4a65-9fad-f6d38fa37003',
  CONVERTIBLES: 'ca66ab32-6325-4ef4-8daa-6adb76361399',
  LAPTOPS_GAMING: '80e7ef4c-ccac-45f8-bd63-b496ac353125',
  LAPTOPS_EMPRESARIALES: 'f49d18a5-01da-472d-9181-f4662347c461',
  THINBOOKS: 'b175e4d0-f103-470a-b8e2-168787ac5e81',
  LAPTOPS_CONSUMO: 'ca1d0d17-4f24-473c-8693-eadc9abb6eb2',
  LAPTOPS_IA: 'b95ddd0a-d429-4234-a34e-40c422b18729',

  // Computadoras y Componentes
  COMPUTADORAS_PARENT: '3ff3a330-93c0-4177-b03e-165fa75ef7ba',
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

  // Móviles y Wearables
  MOVILES_PARENT: 'd20ef3ee-66e6-4ac0-9d50-b3e7ba24839c',
  CELULARES: '2473577b-7a47-4d38-8cbf-22127c502adf',
  TABLETS: '81b4a3c4-6122-4573-a832-fa0870842829',
  SMARTWATCHES: 'af1a7db2-93e9-4756-a503-0b9ec8b84da7',

  // Periféricos y Accesorios
  PERIFERICOS_PARENT: '8e84f9c5-c496-487e-825e-7fe4aaf7c320',
  MOUSE_TECLADOS: '4fa4ff3b-f3cb-4479-9e2d-bd483daf42cd',
  MOUSEPADS: '66c37083-273b-4411-a163-b47d923c0d72',
  AUDIFONOS: '0263753c-2869-49d4-9ed1-07ed778a1bf4',
  PARLANTES_MICROFONOS: '11aabbb5-2104-4fb5-9928-727e31d85473',
  CARGADORES: 'bf6d7a45-60ee-4642-acc8-8ab0e57ba4ea',
  MOCHILAS: 'eaf9c812-8ec3-465a-ae6c-2a8f1ce90e5d',
  REDES: 'cfa57349-8c3b-451d-a0fa-af45977b079b',
  ACCESORIOS_VARIOS: '5d1fd588-c5d3-4aed-9820-0867c077ff9e',

  // Oficina y Software
  OFICINA_PARENT: '6d1a95c0-7881-4c40-a61a-51b2261e6772',
  IMPRESORAS: 'e949e071-1cdf-4b84-b921-24902119405a',
  PROYECTORES: 'd35a5f69-d5ce-46e8-a09b-76bae147fc56',
  SOFTWARE: '9530d1dd-70dc-425f-b58d-2d82dac11c55'
};

function classifyProductToOfficialCategory(productName, attributes = []) {
  const name = String(productName || '').trim();
  const attrsStr = JSON.stringify(attributes || []);
  const full = `${name} ${attrsStr}`;

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
  if (isPrinter) return OFFICIAL_IDS.IMPRESORAS;
  if (isProjector) return OFFICIAL_IDS.PROYECTORES;
  if (isSoftware) return OFFICIAL_IDS.SOFTWARE;

  // Computadoras de Escritorio / Mini PCs / AIO (Evaluado antes de laptops para evitar clasificación errónea de Mini PCs)
  if (isDesktopOrMini) {
    if (/\b(mini\s*pc|pro\s*mini|\bnuc\b)\b/i.test(full)) return OFFICIAL_IDS.MINI_PCS;
    if (/\b(all[\s\-]*in[\s\-]*one|\baio\b)\b/i.test(full)) return OFFICIAL_IDS.ALL_IN_ONE;
    return OFFICIAL_IDS.PCS_ESCRITORIO;
  }

  // Laptops (Procesadas jerárquicamente por modelo)
  if (isLaptop) {
    if (/\b(2\s*en\s*1|convertible|x360|yoga|spectre|flex|flip)\b/i.test(full)) return OFFICIAL_IDS.CONVERTIBLES;
    if (/\b(gaming|essential|gamer|katana|cyborg|gf63|victus|legion|tuf|rog|nitro|predator|strix|thin|loq|omen|helios|rtx|gtx)\b/i.test(full)) return OFFICIAL_IDS.LAPTOPS_GAMING;
    if (/\b(probook|elitebook|latitude|thinkpad|expertbook|travelmate|vostro)\b/i.test(full)) return OFFICIAL_IDS.LAPTOPS_EMPRESARIALES;
    if (/\b(thinkbook|ultrabook|zenbook|swift|gram|slim|air|omnibook)\b/i.test(full)) return OFFICIAL_IDS.THINBOOKS;
    if (/\b(copilot|npu|intel\s*core\s*ultra|ryzen\s*ai)\b/i.test(full)) return OFFICIAL_IDS.LAPTOPS_IA;
    return OFFICIAL_IDS.LAPTOPS_CONSUMO;
  }

  // Móviles y Wearables
  if (isPhone) return OFFICIAL_IDS.CELULARES;
  if (isTablet) return OFFICIAL_IDS.TABLETS;
  if (/\b(smartwatch|reloj\s*inteligente|apple\s*watch|galaxy\s*watch)\b/i.test(full)) return OFFICIAL_IDS.SMARTWATCHES;

  // Monitores
  if (isMonitor) return OFFICIAL_IDS.MONITORES;

  // ==========================================
  // 2. COMPONENTES INDIVIDUALES (Solo si NO es Dispositivo Completo)
  // ==========================================
  if (!isWholeDevice) {
    if (/\b(tarjeta\s*de\s*video|gpu|geforce|radeon)\b/i.test(name) || (/\b(rtx|gtx)\b/i.test(name) && !isLaptop)) {
      return OFFICIAL_IDS.TARJETAS_VIDEO;
    }
    if (/\b(placa\s*madre|motherboard|mainboard)\b/i.test(full)) return OFFICIAL_IDS.PLACAS_MADRE;
    if (/\b(fuente\s*de\s*poder|power\s*supply|psu)\b/i.test(full)) return OFFICIAL_IDS.FUENTES_PODER;

    // Procesadores (CPUs sueltas)
    if (/\b(procesador|cpu)\b/i.test(name) || /\b(intel\s*core|ryzen|athlon|pentium|celeron)\b/i.test(name)) {
      return OFFICIAL_IDS.PROCESADORES;
    }

    // Memorias RAM sueltas
    if (/\b(memoria\s*ram)\b/i.test(full) || (/\bram\b/i.test(name) && /\b(ddr4|ddr5|sodimm|udimm)\b/i.test(name))) {
      return OFFICIAL_IDS.MEMORIAS_RAM;
    }

    // Almacenamiento (SSD, HDD, NVMe, Discos Mecánicos, 5400RPM, 7200RPM, 2.5", 3.5")
    if (/\b(disco|disco\s*duro|disco\s*solido|disco\s*mecanico|\bssd\b|nvme|\bhdd\b|5400\s*rpm|7200\s*rpm|2\.5"|3\.5")\b/i.test(name)) {
      return OFFICIAL_IDS.ALMACENAMIENTO;
    }

    // Componentes OEM
    if (/\b(gabinete|case\s*gamer|cooler|refrigeracion|fan\s*rgb|oem)\b/i.test(full)) return OFFICIAL_IDS.COMPONENTES_OEM;
  }

  // ==========================================
  // 3. PERIFÉRICOS Y ACCESORIOS (Solo si NO es Dispositivo Completo)
  // ==========================================
  if (!isWholeDevice) {
    if (/\b(mousepad|pad\s*gamer)\b/i.test(full)) return OFFICIAL_IDS.MOUSEPADS;
    if (/\b(mouse|teclado|keyboard|kit\s*teclado)\b/i.test(full)) return OFFICIAL_IDS.MOUSE_TECLADOS;
    if (/\b(audifonos|audífonos|audífono|audifono|headset|airpods|earbuds|galaxy\s*buds)\b/i.test(full)) return OFFICIAL_IDS.AUDIFONOS;
    if (/\b(parlante|microfono|speaker|\bmic\b)\b/i.test(full)) return OFFICIAL_IDS.PARLANTES_MICROFONOS;
    if (/\b(cargador|power\s*bank|bateria\s*externa)\b/i.test(full)) return OFFICIAL_IDS.CARGADORES;
    if (/\b(mochila|funda\s*laptop|maletin)\b/i.test(full)) return OFFICIAL_IDS.MOCHILAS;

    // Redes
    if (/\b(tarjeta\s*wifi|adaptador\s*wifi|router|switch|access\s*point|\bredes\b)\b/i.test(full)) {
      return OFFICIAL_IDS.REDES;
    }

    if (/\b(cable|adaptador|hub\s*usb|soporte)\b/i.test(full)) return OFFICIAL_IDS.ACCESORIOS_VARIOS;
  }

  // Fallback final
  return OFFICIAL_IDS.ACCESORIOS_VARIOS;
}

async function runCleanupAndReclassify() {
  console.log('🚀 Iniciando script de re-clasificación de productos y eliminación de categorías duplicadas...');

  // Duplicate category IDs to remove after re-assigning products
  const DUPLICATE_CATEGORY_SLUGS = [
    'laptops-portatiles',
    'general-importados',
    'perifericos-accesorios',
    'monitores-pantallas',
    'componentes-partes',
    'almacenamiento-ssd',
    'computadoras-computo',
    'computadoras-de-escritorio'
  ];

  const duplicateCats = await Category.findAll({
    where: { slug: { [Op.in]: DUPLICATE_CATEGORY_SLUGS } }
  });

  const duplicateCatIds = duplicateCats.map((c) => c.id);
  console.log(`Encontradas ${duplicateCats.length} categorías duplicadas erróneas para limpiar:`, duplicateCats.map((c) => c.name));

  // Find all products assigned to duplicate categories or any category
  const products = await Product.findAll();
  console.log(`Re-evaluando las categorías de ${products.length} productos en la base de datos...`);

  let reclassifiedCount = 0;
  for (const product of products) {
    const targetCategoryId = classifyProductToOfficialCategory(product.name, product.technical_specs?.atributos || []);
    
    if (product.category_id !== targetCategoryId) {
      product.category_id = targetCategoryId;
      await product.save();
      reclassifiedCount++;
    }
  }

  console.log(`✅ ${reclassifiedCount} productos re-clasificados correctamente a sus subcategorías oficiales.`);

  // Delete duplicate categories safely
  if (duplicateCatIds.length > 0) {
    const deletedCount = await Category.destroy({
      where: { id: { [Op.in]: duplicateCatIds } }
    });
    console.log(`🧹 ${deletedCount} categorías duplicadas eliminadas exitosamente de la base de datos.`);
  }

  console.log('🎉 Proceso de limpieza y re-clasificación finalizado con éxito!');
}

runCleanupAndReclassify().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Error en script de limpieza:', err);
  process.exit(1);
});
