import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, Monitor, HardDrive, Database, Zap, Layers, ChevronRight, Flame, ArrowRight, Sparkles, Star, Gamepad2, Laptop, Briefcase, RefreshCw } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import LocationMap from '../components/LocationMap';
import HeroCarousel from '../components/HeroCarousel';
import axiosClient from '../api/axiosClient';

export default function Home() {
  const [newestProducts, setNewestProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingNewest, setLoadingNewest] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    // 1. Fetch 4 Newest Products
    axiosClient.get('/products?sort=newest&limit=4')
      .then((res) => {
        if (res.data.success) {
          setNewestProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error('[NEWEST_PRODUCTS_ERROR]', err))
      .finally(() => setLoadingNewest(false));

    // 2. Fetch 4 Featured Products
    axiosClient.get('/products?is_featured=true&limit=4')
      .then((res) => {
        if (res.data.success) {
          setFeaturedProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error('[FEATURED_PRODUCTS_ERROR]', err))
      .finally(() => setLoadingFeatured(false));
  }, []);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Full-Width Edge-to-Edge Hero Slider Carousel */}
      <HeroCarousel />

      {/* 2. Categorías Principales (Estilo Circular con Imagen de Producto) */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Categorías Principales</h2>
            <p className="text-sm text-gray-500">Encuentra el equipo ideal para tu trabajo, estudio o gaming</p>
          </div>
          <Link to="/catalog?category_id=laptops" className="text-brand-red font-bold text-sm flex items-center hover:underline">
            Ver todas las laptops <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 justify-items-center max-w-5xl mx-auto">
          {[
            {
              name: 'Laptops Gaming',
              slug: 'laptops-gaming',
              image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&auto=format&fit=crop',
              badge: 'Alto Rendimiento'
            },
            {
              name: 'Laptops de Consumo',
              slug: 'laptops-consumo',
              image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop',
              badge: 'Estudio y Trabajo'
            },
            {
              name: 'Laptops Empresariales',
              slug: 'laptops-empresariales',
              image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&auto=format&fit=crop',
              badge: 'Seguridad & Pro'
            },
            {
              name: '2 en 1 / Convertibles',
              slug: 'convertibles',
              image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&auto=format&fit=crop',
              badge: 'Pantalla Táctil 360°'
            }
          ].map((cat, idx) => (
            <Link
              key={idx}
              to={`/catalog?category_id=${cat.slug}`}
              className="group flex flex-col items-center cursor-pointer w-full max-w-[200px]"
            >
              {/* Circular Product Image Container */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-b from-slate-100 to-gray-200/80 border border-gray-200/80 shadow-sm p-4 flex items-center justify-center overflow-hidden group-hover:scale-105 group-hover:shadow-xl group-hover:border-brand-red/40 transition-all duration-300">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500"
                />
                {/* Subtle Inner Ring Glow */}
                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/5" />
              </div>

              {/* Title & Badge Underneath */}
              <div className="mt-4 text-center space-y-1">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 group-hover:text-brand-red transition-colors leading-tight">
                  {cat.name}
                </h3>
                <span className="text-[11px] font-semibold text-gray-400 block">
                  {cat.badge}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Productos Destacados (limitado a 4 productos) */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center space-x-2">
              <span>Productos Destacados</span>
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            </h2>
            <p className="text-sm text-gray-500">Hardware seleccionado por rendimiento y disponibilidad inmediata</p>
          </div>
          <Link to="/catalog?is_featured=true" className="text-brand-red font-bold text-sm flex items-center hover:underline">
            Ver Todo <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse h-80 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Bloques Promocionales Grandes (2 Banners) */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Promo Banner 1: Tablets & Móviles */}
          <div className="relative rounded-lg overflow-hidden shadow-2xl min-h-[340px] sm:min-h-[380px] group border border-slate-800 flex flex-col justify-end p-8 text-white">
            {/* Background Image */}
            <img
              src="https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop"
              alt="Tablets & Móviles"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 z-0"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/30 z-10" />
            {/* Red Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red via-brand-red-accent to-transparent z-10" />

            {/* Content */}
            <div className="space-y-3 max-w-md z-20">
              <span className="inline-block text-[11px] font-black text-brand-red-accent uppercase tracking-widest bg-brand-red/20 border border-brand-red/30 px-3 py-1 rounded-md">
                LO MÁS NUEVO EN
              </span>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-none font-heading text-white">
                Tablets & Móviles
              </h3>
              <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                Tablets táctiles, celulares inteligentes y dispositivos móviles para máxima productividad y entretenimiento.
              </p>
              <div className="pt-2">
                <Link
                  to="/catalog?category_id=moviles-y-wearables"
                  className="inline-flex items-center space-x-2 bg-brand-blue-bright hover:bg-brand-blue-hover text-white font-black text-xs px-6 py-2.5 rounded-md shadow-lg transition-all transform hover:scale-105 active:scale-95 uppercase tracking-wider"
                >
                  <span>VER TODO</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Promo Banner 2: Workstations & All in One */}
          <div className="relative rounded-lg overflow-hidden shadow-2xl min-h-[340px] sm:min-h-[380px] group border border-slate-800 flex flex-col justify-end p-8 text-white">
            {/* Background Image */}
            <img
              src="/images/laptop_hogar_banner.jpg"
              alt="Workstations & All in One"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 z-0"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/30 z-10" />
            {/* Red Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red-accent via-amber-400 to-transparent z-10" />

            {/* Content */}
            <div className="space-y-3 max-w-md z-20">
              <span className="inline-block text-[11px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-md">
                EQUIPAMIENTO PROFESIONAL
              </span>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-none font-heading text-white">
                Workstations & All in One
              </h3>
              <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                Estaciones de trabajo de alto rendimiento preparadas para renderizado 3D, IA y desarrollo.
              </p>
              <div className="pt-2">
                <Link
                  to="/catalog?category_id=computadoras-y-componentes"
                  className="inline-flex items-center space-x-2 bg-brand-blue-bright hover:bg-brand-blue-hover text-white font-black text-xs px-6 py-2.5 rounded-md shadow-lg transition-all transform hover:scale-105 active:scale-95 uppercase tracking-wider"
                >
                  <span>VER TODO</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Novedades (4 productos más nuevos) */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center space-x-2">
              <span>Novedades</span>
              <Sparkles className="w-6 h-6 text-amber-500" />
            </h2>
            <p className="text-sm text-gray-500">Productos añadidos recientemente</p>
          </div>
          <Link to="/catalog?sort=newest" className="text-brand-red font-bold text-sm flex items-center hover:underline">
            Ver Todas <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {loadingNewest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse h-80 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newestProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 6. Location Map Section */}
      <LocationMap />
    </div>
  );
}
