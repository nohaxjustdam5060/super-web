import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, Flame } from 'lucide-react';
import LocationMap from '../components/LocationMap';
import HeroCarousel from '../components/HeroCarousel';
import ProductCarousel from '../components/ProductCarousel';
import axiosClient from '../api/axiosClient';

export default function Home() {
  const [newestProducts, setNewestProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingNewest, setLoadingNewest] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    // 1. Fetch Newest Products for single-row carousel
    axiosClient.get('/products?sort=newest&limit=10')
      .then((res) => {
        if (res.data.success) {
          setNewestProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error('[NEWEST_PRODUCTS_ERROR]', err))
      .finally(() => setLoadingNewest(false));

    // 2. Fetch Featured Products for single-row carousel
    axiosClient.get('/products?is_featured=true&limit=10')
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

      {/* 2. Categorías Principales (Estilo Circular con Imagen de Producto - Estado Original Exacto) */}
      <section className="max-w-[1440px] mx-auto px-4">
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
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-b from-slate-100 to-gray-200/80 border border-gray-200/80 shadow-sm p-4 flex items-center justify-center overflow-hidden group-hover:scale-105 group-hover:shadow-xl group-hover:border-brand-red/40 transition-all duration-300 ease-out isolate transform-gpu">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300 ease-out transform-gpu will-change-transform"
                />
                {/* Subtle Inner Ring Glow */}
                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/5 pointer-events-none" />
              </div>

              {/* Title & Badge Underneath */}
              <div className="mt-4 text-center space-y-1">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 group-hover:text-brand-red transition-colors duration-200 leading-tight">
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

      {/* 3. Productos Destacados (Carrusel 1 sola fila: 5 en Desktop, 2 en Móvil) */}
      <ProductCarousel
        title="Productos Destacados"
        subtitle="Hardware seleccionado por rendimiento y disponibilidad inmediata"
        icon={Flame}
        iconClassName="w-6 h-6 text-brand-red fill-brand-red"
        viewAllLink="/catalog?is_featured=true"
        viewAllText="Ver Todo"
        products={featuredProducts}
        loading={loadingFeatured}
        limit={10}
      />

      {/* 4. Bloques Promocionales Grandes (2 Banners 100% Clicables y Optimizados) */}
      <section className="max-w-[1440px] mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Promo Banner 1: Tablets & Móviles */}
          <Link
            to="/catalog?category_id=moviles-y-wearables"
            className="relative rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl min-h-[340px] sm:min-h-[380px] group border border-slate-800/90 hover:border-slate-700/80 flex flex-col justify-end p-8 text-white transition-all duration-300 ease-out cursor-pointer block isolate transform-gpu"
          >
            {/* Background Image */}
            <img
              src="https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop"
              alt="Tablets & Móviles"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out z-0 transform-gpu will-change-transform"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/30 z-10 pointer-events-none" />
            {/* Red Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red via-brand-red-accent to-transparent z-10" />

            {/* Content */}
            <div className="space-y-3 max-w-md z-20">
              <span className="inline-block text-[11px] font-black text-brand-red-accent uppercase tracking-widest bg-brand-red/20 border border-brand-red/30 px-3 py-1 rounded-md">
                LO MÁS NUEVO EN
              </span>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-none font-heading text-white group-hover:text-brand-red-accent transition-colors duration-200">
                Tablets & Móviles
              </h3>
              <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                Tablets táctiles, celulares inteligentes y dispositivos móviles para máxima productividad y entretenimiento.
              </p>
              <div className="pt-2 flex items-center text-xs font-black uppercase tracking-wider text-white group-hover:text-brand-red transition-colors duration-200 space-x-1.5">
                <span>VER TODO</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300 ease-out" />
              </div>
            </div>
          </Link>

          {/* Promo Banner 2: Workstations & All in One */}
          <Link
            to="/catalog?category_id=computadoras-y-componentes"
            className="relative rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl min-h-[340px] sm:min-h-[380px] group border border-slate-800/90 hover:border-slate-700/80 flex flex-col justify-end p-8 text-white transition-all duration-300 ease-out cursor-pointer block isolate transform-gpu"
          >
            {/* Background Image */}
            <img
              src="/images/laptop_hogar_banner.jpg"
              alt="Workstations & All in One"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out z-0 transform-gpu will-change-transform"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/30 z-10 pointer-events-none" />
            {/* Red Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red-accent via-amber-400 to-transparent z-10" />

            {/* Content */}
            <div className="space-y-3 max-w-md z-20">
              <span className="inline-block text-[11px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-md">
                EQUIPAMIENTO PROFESIONAL
              </span>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-none font-heading text-white group-hover:text-amber-300 transition-colors duration-200">
                Workstations & All in One
              </h3>
              <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                Estaciones de trabajo de alto rendimiento preparadas para renderizado 3D, IA y desarrollo.
              </p>
              <div className="pt-2 flex items-center text-xs font-black uppercase tracking-wider text-white group-hover:text-amber-400 transition-colors duration-200 space-x-1.5">
                <span>VER TODO</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300 ease-out" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 5. Novedades (Carrusel 1 sola fila: 5 en Desktop, 2 en Móvil) */}
      <ProductCarousel
        title="Novedades"
        subtitle="Productos añadidos recientemente"
        icon={Sparkles}
        iconClassName="w-6 h-6 text-brand-red"
        viewAllLink="/catalog?sort=newest"
        viewAllText="Ver Todas"
        products={newestProducts}
        loading={loadingNewest}
        limit={10}
      />

      {/* 6. Location Map Section */}
      <LocationMap />
    </div>
  );
}
