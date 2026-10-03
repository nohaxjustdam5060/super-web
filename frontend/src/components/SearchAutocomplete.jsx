import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ChevronRight, X } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ProductImage from './ProductImage';

export default function SearchAutocomplete({
  variant = 'desktop', // 'desktop' | 'mobile'
  placeholder = 'Buscar laptops, procesadores, tarjetas gráficas, monitores...',
  onCloseMobileMenu,
  className = ''
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [loadingLiveSearch, setLoadingLiveSearch] = useState(false);
  const [showLiveSearch, setShowLiveSearch] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Debounce & AbortController Effect (280ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setLiveSearchResults([]);
      setShowLiveSearch(false);
      setLoadingLiveSearch(false);
      return;
    }

    setLoadingLiveSearch(true);
    setShowLiveSearch(true);

    const controller = new AbortController();

    const timer = setTimeout(() => {
      axiosClient
        .get(`/products?search=${encodeURIComponent(trimmed)}&limit=5`, {
          signal: controller.signal
        })
        .then((res) => {
          if (res.data.success) {
            setLiveSearchResults(res.data.products || []);
          } else {
            setLiveSearchResults([]);
          }
        })
        .catch((err) => {
          if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
            return;
          }
          console.error('[SearchAutocomplete] Error fetching results:', err);
          setLiveSearchResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoadingLiveSearch(false);
          }
        });
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // Click outside & Escape key listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowLiveSearch(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowLiveSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (searchQuery.trim()) {
      setShowLiveSearch(false);
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      if (onCloseMobileMenu) onCloseMobileMenu();
    }
  };

  const handleSelectProduct = (productSlug) => {
    setShowLiveSearch(false);
    navigate(`/product/${productSlug}`);
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleClear = () => {
    setSearchQuery('');
    setLiveSearchResults([]);
    setShowLiveSearch(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const isDesktop = variant === 'desktop';

  return (
    <div
      ref={containerRef}
      className={`relative ${isDesktop ? 'hidden md:flex flex-1 max-w-2xl mx-2 lg:mx-4' : 'flex w-full'} ${className}`}
    >
      <form
        onSubmit={handleSearchSubmit}
        className="w-full flex items-center relative outline-none focus:outline-none"
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim().length >= 2) setShowLiveSearch(true);
          }}
          className={
            isDesktop
              ? 'w-full bg-slate-800/60 border border-slate-700/60 focus:border-brand-red focus:bg-slate-800/90 rounded-md py-2 pl-4 pr-11 text-sm font-medium text-white placeholder:text-slate-400 outline-none focus:outline-none focus-visible:outline-none ring-0 ring-offset-0 focus:ring-0 shadow-inner transition-colors duration-200'
              : 'w-full bg-slate-800/80 border border-slate-700/70 focus:border-brand-red focus:bg-slate-800 rounded-l-xl py-2.5 pl-3 pr-8 text-xs font-medium text-white placeholder:text-slate-400 outline-none focus:outline-none focus-visible:outline-none ring-0 ring-offset-0 transition-colors duration-200'
          }
        />

        {/* Clear icon if search query is present on mobile */}
        {!isDesktop && searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-24 text-slate-400 hover:text-white p-1"
            title="Limpiar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="submit"
          className={
            isDesktop
              ? 'absolute right-2 text-slate-400 group-focus-within:text-brand-red hover:text-white p-1.5 rounded-md transition-colors duration-200 flex items-center justify-center cursor-pointer outline-none focus:outline-none focus-visible:outline-none ring-0 ring-offset-0'
              : 'bg-brand-red hover:bg-brand-red-hover text-white px-4 py-2.5 rounded-r-xl font-bold text-xs flex items-center justify-center flex-shrink-0 cursor-pointer shadow-sm transition-colors outline-none focus:outline-none focus-visible:outline-none'
          }
          title="Buscar"
          aria-label="Buscar"
        >
          <Search className={isDesktop ? 'w-5 h-5 transition-colors duration-200' : 'w-3.5 h-3.5 mr-1'} />
          {!isDesktop && <span>Buscar</span>}
        </button>
      </form>

      {/* Live Search Predictively Suggested Dropdown Menu */}
      {showLiveSearch && searchQuery.trim().length >= 2 && (
        <div className="absolute top-full left-0 w-full mt-1.5 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[380px] overflow-y-auto font-sans">
          {loadingLiveSearch ? (
            <div className="p-4 flex items-center justify-center space-x-2.5 text-gray-300">
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-brand-red-accent" />
              <span className="text-xs font-semibold">Buscando productos ...</span>
            </div>
          ) : liveSearchResults.length > 0 ? (
            <div className="divide-y divide-slate-800">
              {liveSearchResults.map((prod) => {
                const img =
                  prod.images?.find((i) => i.is_primary)?.image_url ||
                  prod.images?.[0]?.image_url ||
                  prod.image_url ||
                  null;
                const isOffer = Boolean(prod.offer_price && Number(prod.offer_price) < Number(prod.price));
                const currentPrice = Number(isOffer ? prod.offer_price : prod.price);
                const formattedPrice = `S/ ${currentPrice.toLocaleString('es-PE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProduct(prod.slug || prod.id)}
                    className="w-full text-left p-2.5 sm:p-3 hover:bg-slate-800/90 transition-colors flex items-center space-x-3 group cursor-pointer active:bg-slate-800"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-md p-1 flex-shrink-0 flex items-center justify-center border border-slate-700/60 overflow-hidden">
                      <ProductImage
                        src={img}
                        alt={prod.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        size="xs"
                        showText={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-extrabold text-white group-hover:text-brand-red-accent transition-colors truncate leading-snug">
                        {prod.name}
                      </h4>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-medium truncate">
                          {prod.brand?.name || prod.category?.name || 'SUPERLAPTOP'}
                        </span>
                        {prod.sku && (
                          <span className="text-[9px] text-gray-500 font-mono hidden xs:inline truncate">
                            SKU: {prod.sku}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-1">
                      <span className="text-xs font-black text-brand-red-accent block">
                        {formattedPrice}
                      </span>
                      {isOffer && (
                        <span className="text-[10px] text-gray-400 line-through block">
                          S/ {Number(prod.price).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Footer: View all results in Catalog */}
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="w-full bg-slate-950 hover:bg-slate-800 text-brand-red-accent hover:text-white p-2.5 sm:p-3 text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-colors border-t border-slate-800 cursor-pointer"
              >
                <span>Ver todos los resultados para "{searchQuery}"</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-5 text-center text-gray-400 space-y-1">
              <p className="text-xs font-bold text-gray-200">No se encontraron productos para "{searchQuery}"</p>
              <p className="text-[11px] text-gray-400">Prueba con términos como "Laptop", "RTX", "Ryzen" o "Monitor"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
