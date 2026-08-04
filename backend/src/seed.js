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

    // Seed Brands
    const brandNvidia = (await Brand.findOrCreate({ where: { slug: 'nvidia' }, defaults: { name: 'NVIDIA', logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop' } }))[0];
    const brandIntel = (await Brand.findOrCreate({ where: { slug: 'intel' }, defaults: { name: 'Intel', logo_url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=100&auto=format&fit=crop' } }))[0];
    const brandAMD = (await Brand.findOrCreate({ where: { slug: 'amd' }, defaults: { name: 'AMD', logo_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&auto=format&fit=crop' } }))[0];
    const brandAsus = (await Brand.findOrCreate({ where: { slug: 'asus-rog' }, defaults: { name: 'ASUS ROG', logo_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop' } }))[0];
    const brandSamsung = (await Brand.findOrCreate({ where: { slug: 'samsung' }, defaults: { name: 'Samsung Electronics', logo_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=100&auto=format&fit=crop' } }))[0];
    const brandCorsair = (await Brand.findOrCreate({ where: { slug: 'corsair' }, defaults: { name: 'Corsair', logo_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop' } }))[0];


    // Seed Products linked to subcategories
    const productsCount = await Product.count();
    if (productsCount === 0) {
      const productsData = [
        {
          name: 'NVIDIA GeForce RTX 4080 SUPER 16GB GDDR6X',
          slug: 'nvidia-geforce-rtx-4080-super-16gb',
          sku: 'GPU-RTX4080S-16G',
          description: 'Rendimiento extremo con arquitectura Ada Lovelace, DLSS 3.5 y Ray Tracing de 3ra generación. Diseñada para juegos a 4K ultra y creación de contenido pesado.',
          technical_specs: { "VRAM": "16 GB GDDR6X", "Bus": "256-bit", "Consumo": "320W", "Frecuencia Boost": "2550 MHz", "Puertos": "3x DisplayPort 1.4a, 1x HDMI 2.1a" },
          price: 4999.00,
          offer_price: 4599.00,
          stock: 12,
          is_featured: true,
          category_id: categoryMap['tarjetas-de-video']?.id || categoryMap['computadoras-y-componentes'].id,
          brand_id: brandNvidia.id,
          image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop'
        },
        {
          name: 'Procesador AMD Ryzen 7 7800X3D (8C/16T, 5.0GHz, 104MB Cache)',
          slug: 'amd-ryzen-7-7800x3d',
          sku: 'CPU-RYZEN7-7800X3D',
          description: 'El mejor procesador del mundo para gaming con tecnología 3D V-Cache de segunda generación. Socket AM5 y soporte PCIe 5.0.',
          technical_specs: { "Núcleos": "8", "Hilos": "16", "Cache L3": "96 MB 3D V-Cache", "Socket": "AM5", "TDP": "120W" },
          price: 1999.00,
          offer_price: 1849.00,
          stock: 25,
          is_featured: true,
          category_id: categoryMap['procesadores']?.id || categoryMap['computadoras-y-componentes'].id,
          brand_id: brandAMD.id,
          image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop'
        },
        {
          name: 'Laptop Gaming ASUS ROG Strix SCAR 16 (i9-14900HX, RTX 4080 12GB, 32GB RAM, 1TB SSD)',
          slug: 'laptop-gaming-asus-rog-strix-scar-16',
          sku: 'LAP-ASUS-SCAR16-RTX4080',
          description: 'Pantalla ROG Nebula HDR 240Hz Mini-LED, Intel i9 de 14va Gen y GPU RTX 4080 para gaming competitivo extremo.',
          technical_specs: { "Pantalla": "16\" QHD+ 240Hz Mini-LED", "Procesador": "Intel Core i9-14900HX", "GPU": "NVIDIA RTX 4080 12GB", "RAM": "32GB DDR5 5600MHz", "SSD": "1TB PCIe Gen 4" },
          price: 11999.00,
          offer_price: 10999.00,
          stock: 6,
          is_featured: true,
          category_id: categoryMap['laptops-gaming']?.id || categoryMap['laptops'].id,
          brand_id: brandAsus.id,
          image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop'
        },
        {
          name: 'Procesador Intel Core i9-14900K 24 Núcleos (8P + 16E) hasta 6.0GHz',
          slug: 'intel-core-i9-14900k',
          sku: 'CPU-INTEL-I9-14900K',
          description: 'Potencia bruta sin precedentes con 24 núcleos y frecuencia máxima de 6.0 GHz Thermal Velocity Boost. Compatible con Socket LGA 1700.',
          technical_specs: { "Núcleos": "24 (8P + 16E)", "Hilos": "32", "Max Clock": "6.0 GHz", "Socket": "LGA1700", "TDP": "125W Base / 253W Max" },
          price: 2699.00,
          offer_price: 2499.00,
          stock: 8,
          is_featured: true,
          category_id: categoryMap['procesadores']?.id || categoryMap['computadoras-y-componentes'].id,
          brand_id: brandIntel.id,
          image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop'
        },
        {
          name: 'SSD NVMe M.2 Samsung 990 PRO 2TB PCIe 4.0 (7450 MB/s)',
          slug: 'samsung-990-pro-2tb-nvme',
          sku: 'SSD-SAM-990PRO-2TB',
          description: 'El SSD de estado sólido definitivo para cargas de trabajo exigentes, edición 8K y cargas instantáneas en juegos PC y PS5.',
          technical_specs: { "Capacidad": "2 TB", "Lectura Secuencial": "7450 MB/s", "Escritura Secuencial": "6900 MB/s", "Interfaz": "PCIe Gen 4.0 x4, NVMe 2.0" },
          price: 899.00,
          offer_price: 799.00,
          stock: 40,
          is_featured: true,
          category_id: categoryMap['almacenamiento']?.id || categoryMap['computadoras-y-componentes'].id,
          brand_id: brandSamsung.id,
          image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop'
        },
        {
          name: 'Memoria RAM Corsair Vengeance RGB DDR5 32GB (2x16GB) 6000MHz CL30',
          slug: 'corsair-vengeance-rgb-ddr5-32gb-6000mhz',
          sku: 'RAM-COR-DDR5-32G-6000',
          description: 'Rendimiento optimizado para AMD Expo e Intel XMP 3.0 con iluminación RGB dinámicamente personalizable y disipador de aluminio negro.',
          technical_specs: { "Capacidad": "32 GB (2x16GB)", "Tipo": "DDR5", "Velocidad": "6000 MHz", "Latencia": "CL30", "Iluminación": "RGB Dynamic" },
          price: 649.00,
          offer_price: 589.00,
          stock: 30,
          is_featured: true,
          category_id: categoryMap['memorias-ram']?.id || categoryMap['computadoras-y-componentes'].id,
          brand_id: brandCorsair.id,
          image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=800&auto=format&fit=crop'
        }
      ];

      for (const prodItem of productsData) {
        const { image, ...productFields } = prodItem;
        const p = await Product.create(productFields);
        await ProductImage.create({
          product_id: p.id,
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
