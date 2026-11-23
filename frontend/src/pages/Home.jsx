import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, Flame } from 'lucide-react';
import LocationMap from '../components/LocationMap';
import HeroCarousel from '../components/HeroCarousel';
import ProductCarousel from '../components/ProductCarousel';
import CategoryBannerCarousel from '../components/CategoryBannerCarousel';
import axiosClient from '../api/axiosClient';

export default function Home() {
  const [newestProducts, setNewestProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingNewest, setLoadingNewest] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  // States for the 4 Category Banner Carousels
  const [gamingProducts, setGamingProducts] = useState([]);
  const [consumoProducts, setConsumoProducts] = useState([]);
  const [convertiblesProducts, setConvertiblesProducts] = useState([]);
  const [computadorasProducts, setComputadorasProducts] = useState([]);

  const [loadingGaming, setLoadingGaming] = useState(true);
  const [loadingConsumo, setLoadingConsumo] = useState(true);
  const [loadingConvertibles, setLoadingConvertibles] = useState(true);
  const [loadingComputadoras, setLoadingComputadoras] = useState(true);

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

    // 3. Fetch Laptops Gaming
    axiosClient.get('/products?category_id=laptops-gaming&limit=10')
      .then((res) => {
        if (res.data.success) {
          setGamingProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error('[GAMING_PRODUCTS_ERROR]', err))
      .finally(() => setLoadingGaming(false));

    // 4. Fetch Laptops de Consumo
    axiosClient.get('/products?category_id=laptops-consumo&limit=10')
      .then((res) => {
        if (res.data.success) {
          setConsumoProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error('[CONSUMO_PRODUCTS_ERROR]', err))
      .finally(() => setLoadingConsumo(false));

    // 5. Fetch Convertibles + ThinkBook
    axiosClient.get('/products?category_id=convertibles,thinbooks&limit=10')
      .then((res) => {
        if (res.data.success) {
          setConvertiblesProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error('[CONVERTIBLES_PRODUCTS_ERROR]', err))
      .finally(() => setLoadingConvertibles(false));

    // 6. Fetch Computadoras y Componentes
    axiosClient.get('/products?category_id=computadoras-y-componentes&limit=10')
      .then((res) => {
        if (res.data.success) {
          setComputadorasProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error('[COMPUTADORAS_PRODUCTS_ERROR]', err))
      .finally(() => setLoadingComputadoras(false));
  }, []);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Full-Width Edge-to-Edge Hero Slider Carousel */}
      <HeroCarousel />

      {/* 2. Categorías Principales (Estilo Circular con Imagen de Producto - Estado Original Exacto) */}
      <section className="max-w-[1440px] mx-auto px-4">
        

        <div className="grid grid-cols-4 gap-2 sm:gap-5 md:gap-8 justify-items-center max-w-5xl mx-auto">
          {[
            {
              name: 'Laptops Gaming',
              slug: 'laptops-gaming',
              image: '/images/categoria-laptops-gaming.jpg',
              imageClass: 'scale-[1.55] group-hover:scale-[1.7]',
              badge: ''
            },
            {
              name: 'Laptops de Consumo',
              slug: 'laptops-consumo',
              image: '/images/categoria-laptops-consumo.jpg',
              badge: ''
            },
            {
              name: 'Laptops Empresariales',
              slug: 'laptops-empresariales',
              image: '/images/categoria-laptops-empresariales.jpg',
              badge: ''
            },
            {
              name: '2 en 1 / Convertibles',
              slug: 'convertibles',
              image: '/images/categoria-convertibles.jpg',
              badge: ''
            }
          ].map((cat, idx) => (
            <Link
              key={idx}
              to={`/catalog?category_id=${cat.slug}`}
              className="group flex flex-col items-center cursor-pointer w-full max-w-[176px] min-w-0"
            >
              {/* Circular Product Image Container (Fluid proportional scaling across all screen widths) */}
              <div className="relative w-full aspect-square max-w-[176px] rounded-full border border-gray-200/80 shadow-sm overflow-hidden group-hover:shadow-xl group-hover:border-brand-red/40 transition-all duration-300 ease-out isolate bg-gray-100 flex items-center justify-center">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className={`w-full h-full object-cover transition-transform duration-300 ease-out ${cat.imageClass || 'group-hover:scale-110'}`}
                />
              </div>

              {/* Title & Badge Underneath (Scales smoothly with container) */}
              <div className="mt-2 sm:mt-3 md:mt-4 text-center space-y-0.5 sm:space-y-1 w-full px-0.5">
                <h3 className="font-semibold text-[clamp(10px,2.5vw,16px)] text-slate-800 group-hover:text-brand-red transition-colors duration-200 leading-tight break-words">
                  {cat.name}
                </h3>
                {cat.badge && (
                  <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 block">
                    {cat.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Productos Destacados (Carrusel 1 sola fila: 5 en Desktop, 2 en Móvil) */}
      <ProductCarousel
        title="Productos Destacados"
        subtitle=""
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
            className="relative rounded-md overflow-hidden shadow-xl hover:shadow-2xl min-h-[340px] sm:min-h-[380px] group border border-slate-800/90 hover:border-slate-700/80 flex flex-col justify-end p-8 text-white transition-all duration-300 ease-out cursor-pointer block isolate transform-gpu bg-white"
          >
            {/* Background Image */}
            <img
              src="/images/promo-tablets-moviles.png"
              alt="Tablets & Móviles"
              className="absolute inset-0 w-full h-full object-contain p-4 sm:p-6 pb-14 sm:pb-16 group-hover:scale-105 transition-transform duration-500 ease-out z-0 transform-gpu will-change-transform"
            />
            {/* Gradient Overlay (Reduced opacity for better product visibility) */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent z-10 pointer-events-none" />
            {/* Red Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red via-brand-red-accent to-transparent z-10" />

            {/* Content */}
            <div className="space-y-3 max-w-md z-20">
              <span className="inline-block text-[11px] font-semibold text-brand-red-accent uppercase tracking-widest bg-brand-red/20 border border-brand-red/30 px-3 py-1 rounded-md">
                LO MÁS NUEVO EN
              </span>
              <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-none font-heading text-white group-hover:text-brand-red-accent transition-colors duration-200">
                Tablets & Móviles
              </h3>

              <div className="pt-2 flex items-center text-xs font-semibold uppercase tracking-wider text-white group-hover:text-brand-red transition-colors duration-200 space-x-1.5">
                <span>VER TODO</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300 ease-out" />
              </div>
            </div>
          </Link>

          {/* Promo Banner 2: Workstations & All in One */}
          <Link
            to="/catalog?category_id=computadoras-y-componentes"
            className="relative rounded-md overflow-hidden shadow-xl hover:shadow-2xl min-h-[340px] sm:min-h-[380px] group border border-slate-800/90 hover:border-slate-700/80 flex flex-col justify-end p-8 text-white transition-all duration-300 ease-out cursor-pointer block isolate transform-gpu bg-white"
          >
            {/* Background Image */}
            <img
              src="/images/promo-workstations-all-in-one.jpg"
              alt="Workstations & All in One"
              className="absolute inset-0 w-full h-full object-contain p-4 sm:p-6 pb-14 sm:pb-16 group-hover:scale-105 transition-transform duration-500 ease-out z-0 transform-gpu will-change-transform"
            />
            {/* Gradient Overlay (Reduced opacity for better product visibility) */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent z-10 pointer-events-none" />
            {/* Red Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red-accent via-amber-400 to-transparent z-10" />

            {/* Content */}
            <div className="space-y-3 max-w-md z-20">
              <span className="inline-block text-[11px] font-semibold text-amber-400 uppercase tracking-widest bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-md">
                EQUIPAMIENTO PROFESIONAL
              </span>
              <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-none font-heading text-white group-hover:text-amber-300 transition-colors duration-200">
                Workstations & All in One
              </h3>
              <div className="pt-2 flex items-center text-xs font-semibold uppercase tracking-wider text-white group-hover:text-amber-400 transition-colors duration-200 space-x-1.5">
                <span>VER TODO</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300 ease-out" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 5. Sección con Banner Lateral: Laptops Gaming */}
      <CategoryBannerCarousel
        title="Laptops Gaming"
        viewAllLink="/catalog?category_id=laptops-gaming"
        viewAllText="Ver Todo Gaming"
        bannerTitle="Laptops Gaming"
        bannerBorderColor="border-brand-red/40 hover:border-brand-red/80"
        bannerImage="/images/banner-gaming-strix.jpg"
        bannerImageMobile="/images/banner-gaming-strix-horizontal.jpg"
        bannerLink="/catalog?category_id=laptops-gaming"
        products={gamingProducts}
        loading={loadingGaming}
        limit={10}
      />

      {/* 6. Sección con Banner Lateral: Laptops de Consumo */}
      <CategoryBannerCarousel
        title="Laptops de Consumo"
        viewAllLink="/catalog?category_id=laptops-consumo"
        viewAllText="Ver Todo Consumo"
        bannerTitle="Laptops de Consumo"
        bannerBorderColor="border-slate-800/90 hover:border-sky-500/60"
        bannerImage="/images/banner-consumo-hp.jpg"
        bannerImageMobile="/images/banner-consumo-hp-horizontal.jpg"
        bannerLink="/catalog?category_id=laptops-consumo"
        products={consumoProducts}
        loading={loadingConsumo}
        limit={10}
      />

      {/* 7. Sección con Banner Lateral: Convertibles & ThinkBook */}
      <CategoryBannerCarousel
        title="Convertibles & ThinkBook"
        viewAllLink="/catalog?category_id=laptops"
        viewAllText="Ver Todas las Laptops"
        bannerTitle="Convertibles & ThinkBook"
        bannerBorderColor="border-slate-800/90 hover:border-purple-500/60"
        bannerImage="/images/banner-thinkpad-l16.jpg"
        bannerImageMobile="/images/banner-thinkpad-l16-horizontal.jpg"
        bannerLink="/catalog?category_id=laptops"
        products={convertiblesProducts}
        loading={loadingConvertibles}
        limit={10}
      />

      {/* 8. Sección con Banner Lateral: Computadoras y Componentes */}
      <CategoryBannerCarousel
        title="Computadoras y Componentes"
        viewAllLink="/catalog?category_id=computadoras-y-componentes"
        viewAllText="Ver Todo Hardware"
        bannerTitle="Computadoras y Componentes"
        bannerBorderColor="border-slate-800/90 hover:border-amber-500/60"
        bannerImage="/images/banner-computadoras-asus.jpg"
        bannerImageMobile="/images/banner-computadoras-asus-horizontal.jpg"
        bannerLink="/catalog?category_id=computadoras-y-componentes"
        products={computadorasProducts}
        loading={loadingComputadoras}
        limit={10}
      />

      {/* 9. Novedades (Carrusel 1 sola fila: 5 en Desktop, 2 en Móvil) */}
      <ProductCarousel
        title="Novedades"
        subtitle=""
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
