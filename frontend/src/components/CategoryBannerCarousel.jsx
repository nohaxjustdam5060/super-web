import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';

export default function CategoryBannerCarousel({
  title,
  // subtitle,
  icon: Icon,
  iconClassName = 'w-6 h-6 text-brand-red',
  viewAllLink,
  viewAllText = 'Ver Todo',
  // Banner Props
  bannerTitle,
  bannerSubtitle,
  bannerTag,
  bannerImage,
  bannerLink,
  bannerTagBg = 'bg-brand-red/20 border-brand-red/30 text-brand-red-accent',
  bannerBorderColor = 'border-slate-800/90 hover:border-brand-red/60',
  // Products & Carousel Props
  products = [],
  loading = false,
  limit = 10,
  autoScrollInterval = 5000
}) {
  const scrollRef = useRef(null);
  const isPausedRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        el.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [products, loading, checkScrollability]);

  // Continuous auto-scroll every X seconds (with hover/touch pause & smooth restart at end)
  useEffect(() => {
    if (loading || !products || products.length <= 1) return;

    const timer = setInterval(() => {
      if (isPausedRef.current) return;
      const container = scrollRef.current;
      if (!container) return;

      const card = container.children[0];
      const nextCard = container.children[1];
      const scrollStep = (card && nextCard)
        ? (nextCard.offsetLeft - card.offsetLeft)
        : (container.clientWidth * 0.5);

      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollStep, behavior: 'smooth' });
      }
    }, autoScrollInterval);

    return () => clearInterval(timer);
  }, [products, loading, limit, autoScrollInterval]);

  const handleScroll = (direction) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const card = container.children[0];
    const nextCard = container.children[1];
    const scrollStep = (card && nextCard)
      ? (nextCard.offsetLeft - card.offsetLeft)
      : (container.clientWidth * 0.75);

    container.scrollBy({
      left: direction === 'left' ? -scrollStep : scrollStep,
      behavior: 'smooth'
    });
  };

  const finalViewAllLink = viewAllLink || bannerLink;

  return (
    <section
      className="max-w-[1440px] mx-auto px-4"
      onMouseEnter={() => { isPausedRef.current = true; }}
      onMouseLeave={() => { isPausedRef.current = false; }}
      onTouchStart={() => { isPausedRef.current = true; }}
      onTouchEnd={() => { isPausedRef.current = false; }}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
            {title}
          </h2>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          {finalViewAllLink && (
            <Link
              to={finalViewAllLink}
              className="text-brand-red font-bold text-sm flex items-center hover:underline whitespace-nowrap mr-1"
            >
              <span>{viewAllText}</span>
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </Link>
          )}

          {/* Navigation Arrows for Desktop (Hidden on mobile/tablet < lg) */}
          <div className="hidden lg:flex items-center space-x-1.5">
            <button
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Desplazar hacia la izquierda"
              className={`p-2 rounded-lg border transition-all ${
                canScrollLeft
                  ? 'bg-white text-gray-800 border-gray-300 hover:bg-brand-red hover:text-white hover:border-brand-red shadow-sm active:scale-95 cursor-pointer'
                  : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed opacity-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              aria-label="Desplazar hacia la derecha"
              className={`p-2 rounded-lg border transition-all ${
                canScrollRight
                  ? 'bg-white text-gray-800 border-gray-300 hover:bg-brand-red hover:text-white hover:border-brand-red shadow-sm active:scale-95 cursor-pointer'
                  : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed opacity-50'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Left Banner + Right Product Carousel */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-stretch">
        {/* Left Column: Vertical Promotional Banner */}
        <div className="w-full lg:w-[280px] xl:w-[320px] 2xl:w-[340px] flex-shrink-0 flex flex-col py-1.5">
          <Link
            to={bannerLink}
            className={`relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl border ${bannerBorderColor} flex flex-col justify-end p-6 sm:p-7 text-white transition-all duration-300 ease-out cursor-pointer isolate transform-gpu w-full h-[220px] sm:h-[260px] lg:h-full lg:min-h-0 flex-1 group hover:scale-[1.01]`}
          >
            {/* Background Image */}
            <img
              src={bannerImage}
              alt={bannerTitle || title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out z-0 transform-gpu will-change-transform"
            />
            {/* Dark Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/25 z-10 pointer-events-none" />
            {/* Top Accent Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red via-brand-red-accent to-transparent z-10" />

            {/* Banner Overlay Content */}
            <div className="space-y-2.5 z-20">
              {bannerTag && (
                <span className={`inline-block text-[10px] sm:text-[11px] font-black uppercase tracking-widest border px-2.5 py-0.5 rounded-md ${bannerTagBg}`}>
                  {bannerTag}
                </span>
              )}
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight font-heading text-white group-hover:text-brand-red-accent transition-colors duration-200">
                {bannerTitle || title}
              </h3>
              {bannerSubtitle && (
                <p className="text-xs text-gray-200 line-clamp-2 font-medium">
                  {bannerSubtitle}
                </p>
              )}

              <div className="pt-2 flex items-center text-xs font-black uppercase tracking-wider text-white group-hover:text-brand-red transition-colors duration-200 space-x-1.5">
                <span>VER CATÁLOGO</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300 ease-out" />
              </div>
            </div>
          </Link>
        </div>

        {/* Right Column: Responsive Product Carousel */}
        <div className="flex-1 min-w-0 relative group/carousel flex flex-col justify-center">
          {/* Mobile/Tablet Floating Navigation Arrows (< lg) */}
          {products.length > 1 && !loading && (
            <>
              <button
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Anterior"
                className={`lg:hidden absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 rounded-full border border-gray-200 shadow-md backdrop-blur-sm transition-all duration-200 active:scale-95 ${
                  canScrollLeft
                    ? 'bg-white/90 text-gray-800 hover:bg-brand-red hover:text-white hover:border-brand-red cursor-pointer opacity-95 hover:opacity-100'
                    : 'bg-white/50 text-gray-300 border-gray-100 cursor-not-allowed opacity-0 pointer-events-none'
                }`}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Siguiente"
                className={`lg:hidden absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 rounded-full border border-gray-200 shadow-md backdrop-blur-sm transition-all duration-200 active:scale-95 ${
                  canScrollRight
                    ? 'bg-white/90 text-gray-800 hover:bg-brand-red hover:text-white hover:border-brand-red cursor-pointer opacity-95 hover:opacity-100'
                    : 'bg-white/50 text-gray-300 border-gray-100 cursor-not-allowed opacity-0 pointer-events-none'
                }`}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}
          {loading ? (
            <div
              ref={scrollRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1.5 px-1"
            >
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="min-w-[calc((100%-0.75rem)/2)] max-w-[calc((100%-0.75rem)/2)] flex-[0_0_calc((100%-0.75rem)/2)] sm:min-w-[calc((100%-1.5rem)/3)] sm:max-w-[calc((100%-1.5rem)/3)] sm:flex-[0_0_calc((100%-1.5rem)/3)] lg:min-w-[calc((100%-1.5rem)/2)] lg:max-w-[calc((100%-1.5rem)/2)] lg:flex-[0_0_calc((100%-1.5rem)/2)] xl:min-w-[calc((100%-3rem)/4)] xl:max-w-[calc((100%-3rem)/4)] xl:flex-[0_0_calc((100%-3rem)/4)] bg-gray-200/80 animate-pulse h-[440px] rounded-lg border border-gray-200"
                />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div
              ref={scrollRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar py-1.5 px-1 h-full items-stretch"
            >
              {products.slice(0, limit).map((product) => (
                <div
                  key={product.id}
                  className="min-w-[calc((100%-0.75rem)/2)] max-w-[calc((100%-0.75rem)/2)] flex-[0_0_calc((100%-0.75rem)/2)] sm:min-w-[calc((100%-1.5rem)/3)] sm:max-w-[calc((100%-1.5rem)/3)] sm:flex-[0_0_calc((100%-1.5rem)/3)] lg:min-w-[calc((100%-1.5rem)/2)] lg:max-w-[calc((100%-1.5rem)/2)] lg:flex-[0_0_calc((100%-1.5rem)/2)] xl:min-w-[calc((100%-3rem)/4)] xl:max-w-[calc((100%-3rem)/4)] xl:flex-[0_0_calc((100%-3rem)/4)] snap-start flex self-stretch"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-gray-50 rounded-xl text-center border border-gray-200 text-gray-500 text-sm h-full flex items-center justify-center">
              No hay productos disponibles en esta categoría actualmente.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
