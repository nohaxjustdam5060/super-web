import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';

export default function ProductCarousel({
  title,
  subtitle,
  icon: Icon,
  iconClassName = "w-6 h-6 text-brand-red",
  viewAllLink,
  viewAllText = 'Ver Todo',
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

  // Continuous auto-scroll every 5 seconds (with hover/touch pause & smooth restart at end)
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

      // Smooth return to beginning if reached the end
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

  return (
    <section 
      className="max-w-[1440px] mx-auto px-4"
      onMouseEnter={() => { isPausedRef.current = true; }}
      onMouseLeave={() => { isPausedRef.current = false; }}
      onTouchStart={() => { isPausedRef.current = true; }}
      onTouchEnd={() => { isPausedRef.current = false; }}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center space-x-2">
            <span>{title}</span>
            {Icon && <Icon className={iconClassName} />}
          </h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="text-brand-red font-bold text-sm flex items-center hover:underline mr-1"
            >
              <span>{viewAllText}</span>
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </Link>
          )}

          {/* Navigation Arrows */}
          <div className="flex items-center space-x-1.5">
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

      {/* 1-Row Carousel Container with Responsive Card Widths */}
      {loading ? (
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto no-scrollbar py-4 sm:py-5 px-1.5 sm:px-2 -my-2 sm:-my-3"
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="min-w-[calc((100%-0.75rem)/2)] max-w-[calc((100%-0.75rem)/2)] flex-[0_0_calc((100%-0.75rem)/2)] sm:min-w-[calc((100%-2rem)/3)] sm:max-w-[calc((100%-2rem)/3)] sm:flex-[0_0_calc((100%-2rem)/3)] md:min-w-[calc((100%-3.75rem)/4)] md:max-w-[calc((100%-3.75rem)/4)] md:flex-[0_0_calc((100%-3.75rem)/4)] xl:min-w-[calc((100%-5rem)/5)] xl:max-w-[calc((100%-5rem)/5)] xl:flex-[0_0_calc((100%-5rem)/5)] bg-gray-200/80 animate-pulse h-80 rounded-lg border border-gray-200"
            />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar py-4 sm:py-5 px-1.5 sm:px-2 -my-2 sm:-my-3"
        >
          {products.slice(0, limit).map((product) => (
            <div
              key={product.id}
              className="min-w-[calc((100%-0.75rem)/2)] max-w-[calc((100%-0.75rem)/2)] flex-[0_0_calc((100%-0.75rem)/2)] sm:min-w-[calc((100%-2rem)/3)] sm:max-w-[calc((100%-2rem)/3)] sm:flex-[0_0_calc((100%-2rem)/3)] md:min-w-[calc((100%-3.75rem)/4)] md:max-w-[calc((100%-3.75rem)/4)] md:flex-[0_0_calc((100%-3.75rem)/4)] xl:min-w-[calc((100%-5rem)/5)] xl:max-w-[calc((100%-5rem)/5)] xl:flex-[0_0_calc((100%-5rem)/5)] snap-start flex self-stretch"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-xl text-center border border-gray-200 text-gray-500 text-sm">
          No hay productos disponibles en este momento.
        </div>
      )}
    </section>
  );
}
