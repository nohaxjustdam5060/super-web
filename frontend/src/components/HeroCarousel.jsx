import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Flame, ShieldCheck, Truck, CreditCard, Sparkles } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    badge: 'Nuevos Lanzamientos 2026',
    badgeIcon: Flame,
    title: 'POTENCIA TU RIG AL',
    highlightTitle: 'SIGUIENTE NIVEL.',
    description: 'Consigue las últimas tarjetas gráficas RTX 4080/4090, procesadores AMD Ryzen 3D V-Cache y SSDs NVMe Gen 5 con garantía oficial en Perú.',
    primaryBtnText: 'Explorar Catálogo',
    primaryBtnLink: '/catalog',
    secondaryBtnText: 'Ver Ofertas Top',
    secondaryBtnLink: '/catalog?is_featured=true',
    image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&auto=format&fit=crop',
    gradient: 'from-slate-950 via-slate-900 to-brand-dark'
  },
  {
    id: 2,
    badge: 'Tecnología Pro 2026',
    badgeIcon: Sparkles,
    title: 'LAPTOPS GAMER & WORKSTATIONS',
    highlightTitle: 'DE ALTO RENDIMIENTO.',
    description: 'Equipos empresariales Intel Core i9 y AMD Ryzen 9 diseñados para gaming competitivo, renderizado 3D y diseño avanzado.',
    primaryBtnText: 'Laptops Empresariales',
    primaryBtnLink: '/catalog?category_id=laptops-empresariales',
    secondaryBtnText: 'Laptops Gamer',
    secondaryBtnLink: '/catalog?category_id=laptops-gaming',
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=1200&auto=format&fit=crop',
    gradient: 'from-blue-950 via-slate-900 to-slate-950'
  },
  {
    id: 3,
    badge: 'Garantía Oficial en Perú',
    badgeIcon: ShieldCheck,
    title: 'COMPONENTES & PERIFÉRICOS',
    highlightTitle: 'DE ÚLTIMA GENERACIÓN.',
    description: 'Memorias RAM DDR5 de alta velocidad, refrigeración líquida de precisión y audífonos gamer con envío express asegurado.',
    primaryBtnText: 'Ver Periféricos',
    primaryBtnLink: '/catalog?category_id=audifonos',
    secondaryBtnText: 'Ver Catálogo',
    secondaryBtnLink: '/catalog',
    image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=1200&auto=format&fit=crop',
    gradient: 'from-purple-950 via-slate-900 to-slate-950'
  }
];

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Autoplay Effect (Changes slide every 4.5 seconds unless hovered)
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  return (
    <div className="w-full relative overflow-hidden bg-slate-950 text-white select-none">
      {/* Carousel Outer Slider Box */}
      <div
        className="w-full relative h-[440px] sm:h-[500px] lg:h-[540px]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === currentIndex;
          const BadgeIcon = slide.badgeIcon;

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out transform ${
                isActive
                  ? 'opacity-100 translate-x-0 z-10 pointer-events-auto'
                  : 'opacity-0 translate-x-8 z-0 pointer-events-none'
              }`}
            >
              {/* Background Image with Dark Overlay Gradient */}
              <div className="absolute inset-0 w-full h-full">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity scale-100 transition-transform duration-1000"
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} opacity-90`} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />
              </div>

              {/* Slide Text & Content Grid (Centered Content inside max-w-7xl) */}
              <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full py-8">
                  {/* Left Column: Headline & Action Buttons */}
                  <div className="lg:col-span-8 space-y-4 sm:space-y-6">
                    <span className="inline-flex items-center space-x-2 bg-brand-red/20 text-brand-red-accent border border-brand-red/40 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                      <BadgeIcon className="w-4 h-4 animate-bounce" />
                      <span>{slide.badge}</span>
                    </span>

                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-none font-heading break-words">
                      {slide.title}{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red-accent via-amber-400 to-amber-300">
                        {slide.highlightTitle}
                      </span>
                    </h1>

                    <p className="text-gray-300 text-sm sm:text-base lg:text-lg max-w-2xl leading-relaxed">
                      {slide.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                      <Link
                        to={slide.primaryBtnLink}
                        className="bg-brand-red hover:bg-brand-red-hover text-white font-extrabold px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl shadow-lg hover:shadow-brand-red/40 transition-all flex items-center space-x-2 text-sm sm:text-base active:scale-95 cursor-pointer"
                      >
                        <span>{slide.primaryBtnText}</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Link>

                      <Link
                        to={slide.secondaryBtnLink}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl transition-colors text-sm sm:text-base cursor-pointer backdrop-blur-sm"
                      >
                        {slide.secondaryBtnText}
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Featured Image Graphic (Hidden on mobile for clean vertical alignment) */}
                  <div className="hidden lg:flex lg:col-span-4 justify-center items-center">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-brand-red/20 rounded-3xl blur-2xl group-hover:bg-brand-red/30 transition-colors" />
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="relative z-10 w-full max-w-sm object-contain rounded-2xl border border-white/10 shadow-2xl drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] transform transition-transform duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Navigation Arrow: Previous */}
        <button
          onClick={prevSlide}
          aria-label="Diapositiva Anterior"
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900/60 hover:bg-brand-red text-white border border-white/10 flex items-center justify-center backdrop-blur-md shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Navigation Arrow: Next */}
        <button
          onClick={nextSlide}
          aria-label="Siguiente Diapositiva"
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900/60 hover:bg-brand-red text-white border border-white/10 flex items-center justify-center backdrop-blur-md shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Pagination Dots (Bottom Center) */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Ir a diapositiva ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'w-8 bg-brand-red shadow-lg' : 'w-2.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Full-Width Informative Value Proposition Bar (Edge-to-Edge) */}
      <div className="w-full bg-slate-900 border-t border-b border-slate-800/80 py-3.5 px-4 overflow-hidden">
        {/* Mobile View: Continuous Infinite Marquee Loop (< sm) */}
        <div className="md:hidden overflow-hidden w-full">
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused] cursor-pointer">
            {/* Track Set 1 */}
            <div className="flex items-center space-x-8 pr-8">
              <div className="flex items-center space-x-3 text-gray-300 flex-shrink-0">
                <div className="p-2 bg-brand-red/10 text-brand-red-accent rounded-xl border border-brand-red/20 flex-shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-white block">Envío Express a Todo el Perú</span>
                  <span className="text-[11px] text-gray-400">Entregas en 24-48 horas garantizadas</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-300 flex-shrink-0">
                <div className="p-2 bg-brand-blue/10 text-brand-blue-bright rounded-xl border border-brand-blue/20 flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-white block">Garantía Oficial E-Commerce</span>
                  <span className="text-[11px] text-gray-400">100% productos nuevos y sellados</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-300 flex-shrink-0">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 flex-shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-white block">Medios de Pago Seguros</span>
                  <span className="text-[11px] text-gray-400">Tarjeta, Yape, Plin y transferencia</span>
                </div>
              </div>
            </div>

            {/* Track Set 2 (Identical Duplicate for Seamless Infinite Loop) */}
            <div className="flex items-center space-x-8 pr-8">
              <div className="flex items-center space-x-3 text-gray-300 flex-shrink-0">
                <div className="p-2 bg-brand-red/10 text-brand-red-accent rounded-xl border border-brand-red/20 flex-shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-white block">Envío Express a Todo el Perú</span>
                  <span className="text-[11px] text-gray-400">Entregas en 24-48 horas garantizadas</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-300 flex-shrink-0">
                <div className="p-2 bg-brand-blue/10 text-brand-blue-bright rounded-xl border border-brand-blue/20 flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-white block">Garantía Oficial E-Commerce</span>
                  <span className="text-[11px] text-gray-400">100% productos nuevos y sellados</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-300 flex-shrink-0">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 flex-shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-white block">Medios de Pago Seguros</span>
                  <span className="text-[11px] text-gray-400">Tarjeta, Yape, Plin y transferencia</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View: Centered Static 3-Column Grid (sm:) */}
        <div className="hidden md:grid sm:grid-cols-3 gap-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-start space-x-3 text-gray-300">
            <div className="p-2 bg-brand-red/10 text-brand-red-accent rounded-xl border border-brand-red/20 flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-white block">Envío Express a Todo el Perú</span>
              <span className="text-[11px] text-gray-400">Entregas en 24-48 horas garantizadas</span>
            </div>
          </div>

          <div className="flex items-center justify-start space-x-3 text-gray-300 border-l border-slate-800 pl-6">
            <div className="p-2 bg-brand-blue/10 text-brand-blue-bright rounded-xl border border-brand-blue/20 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-white block">Garantía Oficial E-Commerce</span>
              <span className="text-[11px] text-gray-400">100% productos nuevos y sellados</span>
            </div>
          </div>

          <div className="flex items-center justify-start space-x-3 text-gray-300 border-l border-slate-800 pl-6">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-white block">Medios de Pago Seguros</span>
              <span className="text-[11px] text-gray-400">Tarjeta, Yape, Plin y transferencia</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
