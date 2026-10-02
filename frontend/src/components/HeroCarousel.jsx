import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShieldCheck, Truck, CreditCard } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    image: '/images/BANER1.jpg',
    alt: 'SuperLaptop Banner 1',
    link: '/catalog'
  },
  {
    id: 2,
    image: '/images/baner2.jpg',
    alt: 'SuperLaptop Banner 2',
    link: '/catalog?category_id=laptops-gaming'
  },
  {
    id: 3,
    image: '/images/baner-3.jpg',
    alt: 'SuperLaptop Banner 3',
    link: '/catalog?is_featured=true'
  }
];

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Pre-decode banner images into memory cache on mount
  useEffect(() => {
    SLIDES.forEach((slide) => {
      const img = new Image();
      img.src = slide.image;
    });
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Autoplay Effect (Every 4.5 seconds unless hovered)
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, currentIndex]);

  return (
    <div className="w-full relative overflow-hidden bg-slate-950 text-white select-none">
      {/* Clean Full-Width Advertising Banner Slider Box */}
      <div
        className="w-full relative h-[160px] xs:h-[200px] sm:h-[280px] md:h-[380px] lg:h-[460px] xl:h-[520px] 2xl:h-[580px] overflow-hidden bg-slate-950"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === currentIndex;

          return (
            <div
              key={slide.id}
              style={{ willChange: 'opacity' }}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                isActive
                  ? 'opacity-100 z-10 pointer-events-auto'
                  : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Link
                to={slide.link}
                className="block w-full h-full relative cursor-pointer"
                title={slide.alt}
              >
                <img
                  src={slide.image}
                  alt={slide.alt}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="w-full h-full object-cover object-center"
                />
              </Link>
            </div>
          );
        })}

        {/* Navigation Arrow: Previous */}
        <button
          onClick={prevSlide}
          aria-label="Diapositiva Anterior"
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-slate-900/60 hover:bg-brand-red text-white border border-white/15 flex items-center justify-center backdrop-blur-md shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
        </button>

        {/* Navigation Arrow: Next */}
        <button
          onClick={nextSlide}
          aria-label="Siguiente Diapositiva"
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-slate-900/60 hover:bg-brand-red text-white border border-white/15 flex items-center justify-center backdrop-blur-md shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
        </button>

        {/* Pagination Dots (Bottom Center) */}
        <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-1.5 sm:space-x-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Ir a diapositiva ${idx + 1}`}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'w-5 sm:w-8 bg-brand-red shadow-lg' : 'w-1.5 sm:w-2 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Full-Width Informative Value Proposition Bar (Edge-to-Edge) */}
      <div className="w-full bg-slate-900 border-t border-b border-slate-800 py-1.5 sm:py-2 px-4 overflow-hidden flex items-center min-h-[36px] sm:min-h-[50px]">
        {/* Mobile View: Continuous Infinite Marquee Loop (< md) */}
        <div className="md:hidden overflow-hidden w-full flex items-center">
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused] cursor-pointer items-center">
            {/* Track Set 1 */}
            <div className="flex items-center space-x-6 pr-6">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-md bg-slate-800/70 border border-slate-700/60 flex items-center justify-center shrink-0">
                  <Truck className="w-3.5 h-3.5 text-brand-red" strokeWidth={2} />
                </div>
                <span className="text-white font-bold text-xs whitespace-nowrap">Envío Express a Todo el Perú</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-md bg-slate-800/70 border border-slate-700/60 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-red" strokeWidth={2} />
                </div>
                <span className="text-white font-bold text-xs whitespace-nowrap">Garantía Oficial E-Commerce</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-md bg-slate-800/70 border border-slate-700/60 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5 text-brand-red" strokeWidth={2} />
                </div>
                <span className="text-white font-bold text-xs whitespace-nowrap">Medios de Pago Seguros</span>
              </div>
            </div>

            {/* Track Set 2 (Identical Duplicate for Seamless Infinite Loop) */}
            <div className="flex items-center space-x-6 pr-6">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-md bg-slate-800/70 border border-slate-700/60 flex items-center justify-center shrink-0">
                  <Truck className="w-3.5 h-3.5 text-brand-red" strokeWidth={2} />
                </div>
                <span className="text-white font-bold text-xs whitespace-nowrap">Envío Express a Todo el Perú</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-md bg-slate-800/70 border border-slate-700/60 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-red" strokeWidth={2} />
                </div>
                <span className="text-white font-bold text-xs whitespace-nowrap">Garantía Oficial E-Commerce</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-md bg-slate-800/70 border border-slate-700/60 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5 text-brand-red" strokeWidth={2} />
                </div>
                <span className="text-white font-bold text-xs whitespace-nowrap">Medios de Pago Seguros</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View: Centered Horizontal Row (md:) */}
        <div className="hidden md:flex items-center justify-center gap-6 lg:gap-12 max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-slate-800/70 border border-slate-700/60 flex items-center justify-center shrink-0">
              <Truck className="w-3.5 h-3.5 text-brand-red" strokeWidth={2} />
            </div>
            <span className="text-white font-bold text-xs sm:text-xs md:text-sm whitespace-nowrap">Envío Express a Todo el Perú</span>
          </div>

          <div className="w-px h-4 bg-slate-800 shrink-0" />

          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-slate-800/70 border border-slate-700/60 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-red" strokeWidth={2} />
            </div>
            <span className="text-white font-bold text-xs sm:text-xs md:text-sm whitespace-nowrap">Garantía Oficial E-Commerce</span>
          </div>

          <div className="w-px h-4 bg-slate-800 shrink-0" />

          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-slate-800/70 border border-slate-700/60 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5 text-brand-red" strokeWidth={2} />
            </div>
            <span className="text-white font-bold text-xs sm:text-xs md:text-sm whitespace-nowrap">Medios de Pago Seguros</span>
          </div>
        </div>
      </div>
    </div>
  );
}
