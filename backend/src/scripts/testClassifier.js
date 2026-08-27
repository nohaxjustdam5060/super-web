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

function categorizarProducto(productName, attributes = []) {
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

// Unit Tests for the 6 Cases
const testCases = [
  {
    name: 'ASUS TUF Gaming A15 FA506NCG-HN360W AMD Ryzen 7-8845HS 16GB 512GB SSD RTX 3050',
    expected: OFFICIAL.LAPTOPS_GAMING,
    label: 'Case 1: ASUS TUF Gaming A15'
  },
  {
    name: 'ACER NITRO V 16 ANV16-72-933F INTEL CORE 9-270H 16GB 1TB SSD NVIDIA RTX 5070-8GB 16" WUXGA 165HZ WIN11',
    expected: OFFICIAL.LAPTOPS_GAMING,
    label: 'Case 2: ACER NITRO V 16'
  },
  {
    name: 'MSI THIN 15 B13VE-3015PE INTEL CORE I5-13420H 16GB 512GB SSD NVIDIA GEFORCE RTX4050-6GB 15.6" FHD 144HZ WIN11 HOME',
    expected: OFFICIAL.LAPTOPS_GAMING,
    label: 'Case 3: MSI THIN 15'
  },
  {
    name: 'DISCO MECANICO TOSHIBA 500GB 2.5" 5400RPM SATA3',
    expected: OFFICIAL.ALMACENAMIENTO,
    label: 'Case 4: DISCO MECANICO TOSHIBA'
  },
  {
    name: 'MINI PC HP PRO MINI 400 G9 INTEL CORE I7-14700T 16GB 512GB SSD WIN11 PRO REMANUFACTURADO',
    expected: OFFICIAL.MINI_PCS,
    label: 'Case 5: MINI PC HP PRO MINI 400 G9'
  },
  {
    name: 'PC HP PRODESK PRO 400 G9 SFF INTEL I7-12700 2.10GHZ 8GB DDR4-3200MHZ 1TB SSD WIN 11 PRO',
    expected: OFFICIAL.PCS_ESCRITORIO,
    label: 'Case 6: PC HP PRODESK PRO 400 G9 SFF'
  }
];

console.log('🧪 RUNNING UNIT TESTS FOR CLASSIFIER FIXES...\n');
let passed = 0;
testCases.forEach((tc, idx) => {
  const result = categorizarProducto(tc.name);
  const ok = result === tc.expected;
  if (ok) passed++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${tc.label}`);
  console.log(`   Input: "${tc.name.slice(0, 75)}..."`);
  console.log(`   Result ID: ${result} | Expected ID: ${tc.expected}\n`);
});

console.log(`RESULT: ${passed}/${testCases.length} tests passed.`);
process.exit(passed === testCases.length ? 0 : 1);
