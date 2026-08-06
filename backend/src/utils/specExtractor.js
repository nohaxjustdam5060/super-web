/**
 * Utility function to parse semi-structured product strings from external databases.
 * Pure function: Zero database dependencies.
 *
 * Example string:
 * "Laptop Lenovo IdeaPad Slim 3 15IAH8 Intel Core i5 12450H Ram 8GB Disco 512GB SSD 15.6 pulgadas FHD FreeDos, codigo 83ER001CLM"
 */
function extraerEspecificaciones(nombreCompleto) {
  if (!nombreCompleto || typeof nombreCompleto !== 'string') {
    return {
      processor_family: null,
      ram_gb: null,
      storage_gb: null,
      storage_type: null,
      screen_size: null,
      full_name: nombreCompleto || '',
      needs_review: true
    };
  }

  const str = nombreCompleto;

  // 1. Processor Family Extraction
  let processor_family = null;
  const intelMatch = str.match(/Core\s*(i[3579])/i);
  const amdMatch = str.match(/Ryzen\s*([3579])/i);

  if (intelMatch) {
    processor_family = `I${intelMatch[1].replace(/i/i, '')}`.toUpperCase();
  } else if (amdMatch) {
    processor_family = `RYZEN ${amdMatch[1]}`.toUpperCase();
  }

  // 2. RAM Extraction ("Ram 8GB", "8GB Ram", "16GB RAM")
  let ram_gb = null;
  const ramMatch1 = str.match(/Ram\s*(\d+)\s*GB/i);
  const ramMatch2 = str.match(/(\d+)\s*GB\s*Ram/i);
  const ramMatchFallback = str.match(/(\d+)\s*GB\b/i);

  if (ramMatch1) {
    ram_gb = parseInt(ramMatch1[1], 10);
  } else if (ramMatch2) {
    ram_gb = parseInt(ramMatch2[1], 10);
  } else if (ramMatchFallback) {
    ram_gb = parseInt(ramMatchFallback[1], 10);
  }

  // 3. Storage Extraction & Normalization to GB
  let storage_gb = null;
  let storage_type = null;

  // Detect storage type (SSD / HDD) anywhere near disk/storage specification
  const typeMatch = str.match(/\b(SSD|HDD)\b/i);
  if (typeMatch) {
    storage_type = typeMatch[1].toUpperCase();
  }

  // Detect value & unit (e.g. "Disco 512GB", "Disco 1TB", "1TB SSD", "512GB SSD", "Disco SSD 1TB")
  const storageMatch1 = str.match(/Disco\s*(?:SSD|HDD)?\s*(\d+)\s*(GB|TB)/i);
  const storageMatch2 = str.match(/(\d+)\s*(GB|TB)\s*(?:SSD|HDD)/i);
  const storageMatchFallback = str.match(/Disco\s*(\d+)\s*(GB|TB)/i);

  let numStr = null;
  let unitStr = null;

  if (storageMatch1) {
    numStr = storageMatch1[1];
    unitStr = storageMatch1[2];
  } else if (storageMatch2) {
    numStr = storageMatch2[1];
    unitStr = storageMatch2[2];
  } else if (storageMatchFallback) {
    numStr = storageMatchFallback[1];
    unitStr = storageMatchFallback[2];
  }

  if (numStr && unitStr) {
    let val = parseInt(numStr, 10);
    if (unitStr.toUpperCase() === 'TB') {
      val = val * 1024;
    }
    storage_gb = val;
  }

  // 4. Screen Size Extraction (e.g. 15.6", 15.6 pulgadas, 14.0 pulg)
  let screen_size = null;
  const screenMatch1 = str.match(/(\d+\.?\d*)"/);
  const screenMatch2 = str.match(/(\d+\.?\d*)\s*(?:pulgadas|pulg)/i);

  if (screenMatch1) {
    screen_size = parseFloat(screenMatch1[1]);
  } else if (screenMatch2) {
    screen_size = parseFloat(screenMatch2[1]);
  }

  // 5. Fallback Review Flag: true if any spec failed to extract
  const needs_review = Boolean(
    !processor_family ||
    !ram_gb ||
    !storage_gb ||
    !storage_type ||
    !screen_size
  );

  return {
    processor_family,
    ram_gb,
    storage_gb,
    storage_type,
    screen_size,
    full_name: str,
    needs_review
  };
}

module.exports = {
  extraerEspecificaciones
};
