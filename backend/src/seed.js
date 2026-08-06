const { sequelize, User, Category, Brand, Product, ProductImage, Coupon } = require('./models');
const logger = require('./config/logger');

async function seedInitialData() {
  try {
    logger.info('[Seeder] Starting category & product seeding...');

    // Main 5 Parent Categories Definition
    const parentCategoriesData = [
      {
        name: 'Laptops',
        slug: 'laptops',
        description: 'Laptops gaming, ultrabooks, convertibles y para inteligencia artificial',
        icon_name: 'Laptop',
        subcategories: [
          { name: 'Laptops Gaming', slug: 'laptops-gaming', icon_name: 'Gamepad2' },
          { name: 'Laptops Empresariales', slug: 'laptops-empresariales', icon_name: 'Briefcase' },
          { name: 'Laptops de Consumo', slug: 'laptops-consumo', icon_name: 'Smile' },
          { name: 'Thinbooks & Ultrabooks', slug: 'thinbooks', icon_name: 'Feather' },
          { name: '2 en 1 / Convertibles', slug: 'convertibles', icon_name: 'RefreshCw' },
          { name: 'Laptops para IA', slug: 'laptops-ia', icon_name: 'Cpu' }
        ]
      },
      {
        name: 'Computadoras y Componentes',
        slug: 'computadoras-y-componentes',
        description: 'CPUs, GPUs, Memorias RAM, SSDs, Placas Madre y PCs armadas',
        icon_name: 'Cpu',
        subcategories: [
          { name: 'PCs de Escritorio', slug: 'pcs-escritorio', icon_name: 'Monitor' },
          { name: 'All in One', slug: 'all-in-one', icon_name: 'Tv' },
          { name: 'Mini PCs', slug: 'mini-pcs', icon_name: 'Box' },
          { name: 'Procesadores', slug: 'procesadores', icon_name: 'Cpu' },
          { name: 'Memorias RAM', slug: 'memorias-ram', icon_name: 'HardDrive' },
          { name: 'Almacenamiento', slug: 'almacenamiento', icon_name: 'Database' },
          { name: 'Tarjetas de Video', slug: 'tarjetas-de-video', icon_name: 'Monitor' },
          { name: 'Placas Madre', slug: 'placas-madre', icon_name: 'Layers' },
          { name: 'Fuentes de Poder', slug: 'fuentes-de-poder', icon_name: 'Zap' },
          { name: 'Monitores', slug: 'monitores', icon_name: 'Monitor' },
          { name: 'Componentes OEM', slug: 'componentes-oem', icon_name: 'Settings' }
        ]
      },
      {
        name: 'Móviles y Wearables',
        slug: 'moviles-y-wearables',
        description: 'Smartphones, tablets, smartwatches y accesorios móviles',
        icon_name: 'Smartphone',
        subcategories: [
          { name: 'Celulares', slug: 'celulares', icon_name: 'Smartphone' },
          { name: 'Tablets', slug: 'tablets', icon_name: 'Tablet' },
          { name: 'Smartwatches', slug: 'smartwatches', icon_name: 'Watch' }
        ]
      },
      {
        name: 'Periféricos y Accesorios',
        slug: 'perifericos-y-accesorios',
        description: 'Mouses, teclados, audífonos gaming, parlantes, mochilas y redes',
        icon_name: 'Headphones',
        subcategories: [
          { name: 'Mouse y Teclados', slug: 'mouse-y-teclados', icon_name: 'Keyboard' },
          { name: 'Mousepads', slug: 'mousepads', icon_name: 'Square' },
          { name: 'Audífonos Gaming', slug: 'audifonos-gaming', icon_name: 'Headphones' },
          { name: 'Audífonos Inalámbricos', slug: 'audifonos-inalambricos', icon_name: 'Radio' },
          { name: 'Parlantes y Micrófonos', slug: 'parlantes-y-microfonos', icon_name: 'Mic' },
          { name: 'Cargadores & Powerbanks', slug: 'cargadores', icon_name: 'BatteryCharging' },
          { name: 'Mochilas y Fundas', slug: 'mochilas', icon_name: 'ShoppingBag' },
          { name: 'Redes & Conectividad', slug: 'redes', icon_name: 'Wifi' },
          { name: 'Accesorios Varios', slug: 'accesorios-varios', icon_name: 'Sliders' }
        ]
      },
      {
        name: 'Oficina y Software',
        slug: 'oficina-y-software',
        description: 'Impresoras, proyectores, licencias de software y antivirus',
        icon_name: 'Printer',
        subcategories: [
          { name: 'Impresoras & Multifuncionales', slug: 'impresoras', icon_name: 'Printer' },
          { name: 'Proyectores', slug: 'proyectores', icon_name: 'Projector' },
          { name: 'Software & Antivirus', slug: 'software-antivirus', icon_name: 'ShieldCheck' }
        ]
      }
    ];

    const categoryMap = {};

    for (const parentItem of parentCategoriesData) {
      const { subcategories, ...parentData } = parentItem;
      let [parentCategory] = await Category.findOrCreate({
        where: { slug: parentData.slug },
        defaults: { ...parentData, parent_id: null }
      });

      if (parentCategory.parent_id !== null || parentCategory.icon_name !== parentData.icon_name) {
        parentCategory.parent_id = null;
        parentCategory.icon_name = parentData.icon_name;
        await parentCategory.save();
      }
      categoryMap[parentData.slug] = parentCategory;

      for (const subItem of subcategories) {
        let [subCategory] = await Category.findOrCreate({
          where: { slug: subItem.slug },
          defaults: {
            ...subItem,
            parent_id: parentCategory.id,
            description: `Subcategoría de ${parentData.name}`
          }
        });
        if (subCategory.parent_id !== parentCategory.id || subCategory.icon_name !== subItem.icon_name) {
          subCategory.parent_id = parentCategory.id;
          subCategory.icon_name = subItem.icon_name;
          await subCategory.save();
        }
        categoryMap[subItem.slug] = subCategory;
      }
    }

    const { extraerEspecificaciones } = require('./utils/specExtractor');

    // Seed Brands
    const brandNvidia = (await Brand.findOrCreate({ where: { slug: 'nvidia' }, defaults: { name: 'NVIDIA', logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop' } }))[0];
    const brandIntel = (await Brand.findOrCreate({ where: { slug: 'intel' }, defaults: { name: 'Intel', logo_url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=100&auto=format&fit=crop' } }))[0];
    const brandAMD = (await Brand.findOrCreate({ where: { slug: 'amd' }, defaults: { name: 'AMD', logo_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&auto=format&fit=crop' } }))[0];
    const brandAsus = (await Brand.findOrCreate({ where: { slug: 'asus-rog' }, defaults: { name: 'ASUS ROG', logo_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop' } }))[0];
    const brandSamsung = (await Brand.findOrCreate({ where: { slug: 'samsung' }, defaults: { name: 'Samsung Electronics', logo_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=100&auto=format&fit=crop' } }))[0];
    const brandCorsair = (await Brand.findOrCreate({ where: { slug: 'corsair' }, defaults: { name: 'Corsair', logo_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop' } }))[0];
    const brandLenovo = (await Brand.findOrCreate({ where: { slug: 'lenovo' }, defaults: { name: 'Lenovo', logo_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=100&auto=format&fit=crop' } }))[0];
    const brandHP = (await Brand.findOrCreate({ where: { slug: 'hp' }, defaults: { name: 'HP', logo_url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=100&auto=format&fit=crop' } }))[0];

    // Seed 18-20 Products with Semi-Structured Full Names for Parsing
    const productsRawData = [
      {
        external_id: 'EXT-LEN-83ER001CLM',
        full_name: 'Laptop Lenovo IdeaPad Slim 3 15IAH8 Intel Core i5 12450H Ram 8GB Disco 512GB SSD 15.6 pulgadas FHD FreeDos, codigo 83ER001CLM',
        name: 'Laptop Lenovo IdeaPad Slim 3 15.6" i5 8GB 512GB SSD',
        slug: 'laptop-lenovo-ideapad-slim-3-i5',
        sku: '83ER001CLM',
        description: 'Laptop multitarea liviana con procesador Intel i5 de 12va generación y pantalla Full HD de 15.6 pulgadas.',
        price: 2399.00,
        offer_price: 2199.00,
        stock: 15,
        is_featured: true,
        category_id: categoryMap['laptops-consumo']?.id || categoryMap['laptops'].id,
        brand_id: brandLenovo.id,
        image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-ASUS-G634JZ',
        full_name: 'Laptop ASUS ROG Strix SCAR 16 G634JZ Intel Core i9 14900HX 32GB Ram Disco 1TB SSD 16.0" QHD 240Hz Windows 11 (G634JZ-N4003W)',
        name: 'Laptop Gaming ASUS ROG Strix SCAR 16 i9 32GB 1TB SSD',
        slug: 'laptop-asus-rog-strix-scar-16-i9',
        sku: 'G634JZ-N4003W',
        description: 'Potencia gaming definitiva con procesador Intel Core i9-14900HX, 32GB RAM y pantalla de 16.0 pulgadas a 240Hz.',
        price: 11999.00,
        offer_price: 10999.00,
        stock: 8,
        is_featured: true,
        category_id: categoryMap['laptops-gaming']?.id || categoryMap['laptops'].id,
        brand_id: brandAsus.id,
        image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-HP-6F7U4LA',
        full_name: 'Laptop HP Pavilion 14-dv2000 Intel Core i7 1255U Ram 16GB Disco 512GB SSD 14.0" FHD Windows 11 (6F7U4LA)',
        name: 'Laptop HP Pavilion 14" i7 16GB 512GB SSD',
        slug: 'laptop-hp-pavilion-14-i7',
        sku: '6F7U4LA',
        description: 'Ultrabook elegante de 14.0 pulgadas con Intel Core i7, 16GB RAM y almacenamiento ultrarrápido SSD.',
        price: 3499.00,
        offer_price: 3199.00,
        stock: 12,
        is_featured: false,
        category_id: categoryMap['thinbooks']?.id || categoryMap['laptops'].id,
        brand_id: brandHP.id,
        image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-ACER-NXK8TAL',
        full_name: 'Laptop Acer Aspire 5 A515-57 AMD Ryzen 7 5700U 16GB Ram Disco 1TB HDD 15.6" FHD Linux (NX.K8TAL.002)',
        name: 'Laptop Acer Aspire 5 15.6" Ryzen 7 16GB 1TB HDD',
        slug: 'laptop-acer-aspire-5-ryzen-7',
        sku: 'NX.K8TAL.002',
        description: 'Excelente rendimiento con AMD Ryzen 7, 16GB RAM y 1TB de almacenamiento en disco HDD.',
        price: 2899.00,
        offer_price: 2699.00,
        stock: 20,
        is_featured: true,
        category_id: categoryMap['laptops-empresariales']?.id || categoryMap['laptops'].id,
        brand_id: brandLenovo.id,
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-DELL-INS3520',
        full_name: 'Laptop Dell Inspiron 3520 Intel Core i3 1215U Ram 8GB Disco 256GB SSD 15.6" FHD Windows 11 Home',
        name: 'Laptop Dell Inspiron 3520 i3 8GB 256GB SSD',
        slug: 'laptop-dell-inspiron-3520-i3',
        sku: 'INS-3520-I3',
        description: 'Laptop económica y confiable para estudio y hogar con procesador Intel i3 de 12va Gen.',
        price: 1799.00,
        offer_price: null,
        stock: 18,
        is_featured: false,
        category_id: categoryMap['laptops-consumo']?.id || categoryMap['laptops'].id,
        brand_id: brandIntel.id,
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-LEN-21EB003CLM',
        full_name: 'Laptop Lenovo ThinkPad E14 Gen 4 AMD Ryzen 5 5625U Ram 8GB Disco 512GB SSD 14.0" FHD FreeDOS (21EB003CLM)',
        name: 'Laptop Lenovo ThinkPad E14 Ryzen 5 8GB 512GB SSD',
        slug: 'laptop-lenovo-thinkpad-e14-ryzen-5',
        sku: '21EB003CLM',
        description: 'Seguridad y durabilidad empresarial militar con procesador AMD Ryzen 5 y pantalla IPS de 14 pulgadas.',
        price: 2999.00,
        offer_price: 2799.00,
        stock: 10,
        is_featured: true,
        category_id: categoryMap['laptops-empresariales']?.id || categoryMap['laptops'].id,
        brand_id: brandLenovo.id,
        image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-MSI-GF63-12VE',
        full_name: 'Laptop MSI Thin GF63 12VE Intel Core i5 12450H Ram 16GB Disco 512GB SSD 15.6" FHD 144Hz RTX 4050',
        name: 'Laptop Gaming MSI Thin GF63 i5 16GB 512GB SSD RTX 4050',
        slug: 'laptop-msi-thin-gf63-i5-rtx4050',
        sku: 'MSI-GF63-12VE',
        description: 'Chasis delgado y liviano para gaming portátil con procesador Intel i5 y gráfica RTX 4050.',
        price: 4199.00,
        offer_price: 3899.00,
        stock: 14,
        is_featured: true,
        category_id: categoryMap['laptops-gaming']?.id || categoryMap['laptops'].id,
        brand_id: brandAsus.id,
        image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-ASUS-UM3402',
        full_name: 'Laptop ASUS ZenBook 14 OLED AMD Ryzen 7 7730U Ram 16GB Disco 1TB SSD 14.0" 2.8K OLED Windows 11',
        name: 'Laptop ASUS ZenBook 14 OLED Ryzen 7 16GB 1TB SSD',
        slug: 'laptop-asus-zenbook-14-oled-ryzen-7',
        sku: 'UM3402YA-KM123W',
        description: 'Espectacular pantalla 2.8K OLED de 14 pulgadas con precisión de color profesional y procesador AMD Ryzen 7.',
        price: 4699.00,
        offer_price: 4299.00,
        stock: 7,
        is_featured: true,
        category_id: categoryMap['convertibles']?.id || categoryMap['laptops'].id,
        brand_id: brandAsus.id,
        image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-LEN-LEGION5',
        full_name: 'Laptop Lenovo Legion Pro 5 16ARX8 AMD Ryzen 9 7945HX 32GB Ram Disco 1TB SSD 16.0" WQXGA 240Hz RTX 4080',
        name: 'Laptop Lenovo Legion Pro 5 Ryzen 9 32GB 1TB SSD RTX 4080',
        slug: 'laptop-lenovo-legion-pro-5-ryzen-9',
        sku: 'LEGION-PRO5-R9',
        description: 'Potencia gaming desatada con AMD Ryzen 9 7945HX, 32GB RAM DDR5 y gráfica RTX 4080 de nivel profesional.',
        price: 9999.00,
        offer_price: 9299.00,
        stock: 5,
        is_featured: true,
        category_id: categoryMap['laptops-gaming']?.id || categoryMap['laptops'].id,
        brand_id: brandLenovo.id,
        image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-HP-VICTUS15',
        full_name: 'Laptop HP Victus 15-fa1093la Intel Core i5 13420H Ram 8GB Disco 512GB SSD 15.6" FHD 144Hz RTX 3050',
        name: 'Laptop HP Victus 15 i5 8GB 512GB SSD RTX 3050',
        slug: 'laptop-hp-victus-15-i5',
        sku: '15-FA1093LA',
        description: 'Entrada al mundo gaming con pantalla 144Hz, procesador Intel i5 de 13va Gen y gráfica GeForce RTX 3050.',
        price: 3299.00,
        offer_price: 2999.00,
        stock: 16,
        is_featured: false,
        category_id: categoryMap['laptops-gaming']?.id || categoryMap['laptops'].id,
        brand_id: brandHP.id,
        image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-DELL-G15-5530',
        full_name: 'Laptop Dell G15 5530 Intel Core i7 13650HX 16GB Ram Disco 512GB SSD 15.6" FHD 165Hz RTX 4060',
        name: 'Laptop Dell G15 15.6" i7 16GB 512GB SSD RTX 4060',
        slug: 'laptop-dell-g15-5530-i7',
        sku: 'DELL-G15-5530',
        description: 'Refrigeración avanzada inspirada en Alienware con Intel i7 de 13va Gen y gráfica RTX 4060.',
        price: 5299.00,
        offer_price: 4899.00,
        stock: 9,
        is_featured: true,
        category_id: categoryMap['laptops-gaming']?.id || categoryMap['laptops'].id,
        brand_id: brandIntel.id,
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-ACER-NITRO5',
        full_name: 'Laptop Acer Nitro 5 AN515-58 Intel Core i5 12500H Ram 8GB Disco 512GB SSD 15.6" FHD 144Hz RTX 3050',
        name: 'Laptop Acer Nitro 5 i5 8GB 512GB SSD RTX 3050',
        slug: 'laptop-acer-nitro-5-i5',
        sku: 'AN515-58-57Y8',
        description: 'Rendimiento sólido en juegos exigentes con doble ventilador CoolBoost y procesador i5 dodeca-core.',
        price: 3199.00,
        offer_price: 2899.00,
        stock: 11,
        is_featured: false,
        category_id: categoryMap['laptops-gaming']?.id || categoryMap['laptops'].id,
        brand_id: brandIntel.id,
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-ASUS-GO15',
        full_name: 'Laptop Asus Vivobook Go 15 AMD Ryzen 3 7320U Ram 8GB Disco 256GB SSD 15.6" FHD Windows 11',
        name: 'Laptop Asus Vivobook Go 15 Ryzen 3 8GB 256GB SSD',
        slug: 'laptop-asus-vivobook-go-15-ryzen-3',
        sku: 'E1504FA-NJ174W',
        description: 'Ligera, delgada y rápida para el trabajo diario con pantalla anti-reflejo FHD y procesador Ryzen 3.',
        price: 1899.00,
        offer_price: 1699.00,
        stock: 22,
        is_featured: false,
        category_id: categoryMap['laptops-consumo']?.id || categoryMap['laptops'].id,
        brand_id: brandAsus.id,
        image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-LEN-V15',
        full_name: 'Laptop Lenovo V15 G3 IAP Intel Core i3 1215U Ram 8GB Disco 512GB SSD 15.6" FHD FreeDOS',
        name: 'Laptop Lenovo V15 G3 i3 8GB 512GB SSD',
        slug: 'laptop-lenovo-v15-g3-i3',
        sku: '82TT002LLM',
        description: 'Productividad accesible para pequeñas empresas con procesador Intel i3 de 12va generación.',
        price: 1699.00,
        offer_price: 1549.00,
        stock: 19,
        is_featured: false,
        category_id: categoryMap['laptops-consumo']?.id || categoryMap['laptops'].id,
        brand_id: brandLenovo.id,
        image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-HP-PROBOOK',
        full_name: 'Laptop HP ProBook 450 G9 Intel Core i7 1255U 16GB Ram Disco 1TB SSD 15.6" FHD Windows 11 Pro',
        name: 'Laptop HP ProBook 450 G9 i7 16GB 1TB SSD Win11Pro',
        slug: 'laptop-hp-probook-450-g9-i7',
        sku: '6S6M4LT',
        description: 'Rendimiento y seguridad de nivel corporativo con chasis de aluminio pulido e Intel Core i7.',
        price: 4399.00,
        offer_price: 3999.00,
        stock: 13,
        is_featured: true,
        category_id: categoryMap['laptops-empresariales']?.id || categoryMap['laptops'].id,
        brand_id: brandHP.id,
        image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-PC-DESK-I9',
        full_name: 'PC de Escritorio Gaming ASUS ROG Intel Core i9 14900K 64GB Ram Disco 2TB SSD RTX 4090',
        name: 'PC de Escritorio ASUS ROG i9 64GB 2TB SSD RTX 4090',
        slug: 'pc-escritorio-asus-rog-i9-rtx4090',
        sku: 'PC-ROG-I9-4090',
        description: 'La computadora de escritorio armada definitiva para simulación, IA y gaming en 8K sin restricciones.',
        price: 16999.00,
        offer_price: 15999.00,
        stock: 4,
        is_featured: true,
        category_id: categoryMap['pcs-escritorio']?.id || categoryMap['computadoras-y-componentes'].id,
        brand_id: brandAsus.id,
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-HDD-WB-2TB',
        full_name: 'Disco Duro Interno 2TB HDD 3.5 pulgadas SATA 7200RPM para PC',
        name: 'Disco Duro Interno 2TB HDD SATA 7200RPM',
        slug: 'disco-duro-interno-2tb-hdd',
        sku: 'HDD-2TB-7200',
        description: 'Disco mecánico magnético de alta durabilidad para almacenamiento masivo de datos y respaldos.',
        price: 249.00,
        offer_price: null,
        stock: 35,
        is_featured: false,
        category_id: categoryMap['almacenamiento']?.id || categoryMap['computadoras-y-componentes'].id,
        brand_id: brandSamsung.id,
        image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop'
      },
      {
        external_id: 'EXT-CABLE-HDMI',
        full_name: 'Cable HDMI 4K Gold Plated 2 Metros High Speed Ultra HD',
        name: 'Cable HDMI 4K Gold Plated 2 Metros',
        slug: 'cable-hdmi-4k-2m',
        sku: 'ACC-HDMI-4K-2M',
        description: 'Cable de alta velocidad con conectores enchapados en oro para transmisión sin pérdidas de video 4K a 60Hz.',
        price: 39.00,
        offer_price: 29.00,
        stock: 100,
        is_featured: false,
        category_id: categoryMap['accesorios-varios']?.id || categoryMap['perifericos-y-accesorios'].id,
        brand_id: null,
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop'
      }
    ];

    for (const prodItem of productsRawData) {
      const { image, ...fields } = prodItem;
      const specs = extraerEspecificaciones(fields.full_name);

      const [product] = await Product.findOrCreate({
        where: { external_id: fields.external_id },
        defaults: {
          ...fields,
          processor_family: specs.processor_family,
          ram_gb: specs.ram_gb,
          storage_gb: specs.storage_gb,
          storage_type: specs.storage_type,
          screen_size: specs.screen_size,
          needs_review: specs.needs_review,
          is_active: true
        }
      });

      // Update fields if product already exists to ensure all new spec columns are populated
      await product.update({
        full_name: specs.full_name,
        processor_family: specs.processor_family,
        ram_gb: specs.ram_gb,
        storage_gb: specs.storage_gb,
        storage_type: specs.storage_type,
        screen_size: specs.screen_size,
        needs_review: specs.needs_review
      });

      const imageCount = await ProductImage.count({ where: { product_id: product.id } });
      if (imageCount === 0) {
        await ProductImage.create({
          product_id: product.id,
          image_url: image,
          is_primary: true,
          order: 0
        });
      }
    }

    // Seed Admin & Client Users if not present
    const usersCount = await User.count();
    if (usersCount === 0) {
      logger.info('[Seeder] Creating admin & test users...');
      await User.create({
        name: 'Administrador SUPER',
        email: 'admin@supertech.com',
        password_hash: 'admin123456',
        role: 'super_admin',
        phone: '+51 999 888 777'
      });

      await User.create({
        name: 'Cliente Demo',
        email: 'cliente@supertech.com',
        password_hash: 'cliente123456',
        role: 'cliente',
        phone: '+51 912 345 678'
      });
    }

    // Seed Coupon
    const couponsCount = await Coupon.count();
    if (couponsCount === 0) {
      await Coupon.create({
        code: 'SUPERTECH10',
        discount_type: 'percentage',
        discount_value: 10.00,
        min_purchase: 100.00,
        max_discount: 200.00,
        is_active: true
      });
    }

    logger.info('[Seeder] Category hierarchy & seed data completed successfully!');
  } catch (error) {
    logger.error('[Seeder] Error populating database:', error);
  }
}

if (require.main === module) {
  seedInitialData()
    .then(() => {
      logger.info('[Seeder] Seeding process completed.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('[Seeder] Seeding process failed:', err);
      process.exit(1);
    });
}

module.exports = seedInitialData;
