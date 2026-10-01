import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingBag, User, Cpu, Menu, X, ShieldCheck, Truck, Headphones,
  ChevronDown, ChevronRight, Laptop, Gamepad2, Briefcase, Smile, Feather, RefreshCw,
  Monitor, Tv, Box, HardDrive, Database, Layers, Zap, Settings, Smartphone, Tablet,
  Watch, Keyboard, Square, Radio, Mic, BatteryCharging, Wifi, Sliders, Printer,
  Projector, Sparkles, Flame, Loader2, TabletSmartphone, BrainCircuit, Minimize2,
  CircuitBoard, MemoryStick, Server, SlidersHorizontal, Backpack, Volume2
} from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { WHATSAPP_NUMBER, STORE_NAME, STORE_PHONE_DISPLAY } from '../utils/whatsappMessage';
import axiosClient from '../api/axiosClient';
import ProductImage from './ProductImage';

// Direct semantic mapping for categories & subcategories
const CATEGORY_ICON_MAP = {
  // A. Laptops (6)
  'convertibles': TabletSmartphone,
  '2 en 1 / convertibles': TabletSmartphone,
  'laptops-consumo': Laptop,
  'laptops de consumo': Laptop,
  'laptops-empresariales': Briefcase,
  'laptops empresariales': Briefcase,
  'laptops-gaming': Gamepad2,
  'laptops gaming': Gamepad2,
  'laptops-ia': BrainCircuit,
  'laptops para ia': BrainCircuit,
  'thinbooks': Minimize2,
  'thinbooks & ultrabooks': Minimize2,

  // B. Computadoras y Componentes (11)
  'all-in-one': Tv,
  'all in one': Tv,
  'almacenamiento': HardDrive,
  'componentes-oem': Settings,
  'componentes oem': Settings,
  'fuentes-de-poder': Zap,
  'fuentes de poder': Zap,
  'memorias-ram': MemoryStick,
  'memorias ram': MemoryStick,
  'mini-pcs': Box,
  'mini pcs': Box,
  'monitores': Monitor,
  'pcs-escritorio': Server,
  'pcs de escritorio': Server,
  'placas-madre': CircuitBoard,
  'placas madre': CircuitBoard,
  'procesadores': Cpu,
  'tarjetas-de-video': Layers,
  'tarjetas de video': Layers,

  // C. Periféricos y Accesorios (8)
  'accesorios-varios': SlidersHorizontal,
  'accesorios varios': SlidersHorizontal,
  'audifonos': Headphones,
  'audífonos': Headphones,
  'cargadores': BatteryCharging,
  'cargadores & powerbanks': BatteryCharging,
  'mochilas': Backpack,
  'mochilas y fundas': Backpack,
  'mouse-y-teclados': Keyboard,
  'mouse y teclados': Keyboard,
  'mousepads': Square,
  'parlantes-y-microfonos': Volume2,
  'parlantes y micrófonos': Volume2,
  'redes': Wifi,
  'redes & conectividad': Wifi,

  // D. Móviles y Wearables (3)
  'celulares': Smartphone,
  'smartwatches': Watch,
  'tablets': Tablet,

  // E. Oficina y Software (3)
  'impresoras': Printer,
  'impresoras & multifuncionales': Printer,
  'proyectores': Projector,
  'software-antivirus': ShieldCheck,
  'software & antivirus': ShieldCheck,

  // Parent categories
  'laptops': Laptop,
  'computadoras-y-componentes': Cpu,
  'moviles-y-wearables': Smartphone,
  'perifericos-y-accesorios': Headphones,
  'oficina-y-software': Printer
};

// Fallback lookup by icon_name string if category slug not in map
const FALLBACK_ICON_NAME_MAP = {
  Laptop, Gamepad2, Briefcase, Smile, Feather, RefreshCw, Cpu, Monitor, Tv, Box,
  HardDrive, Database, Layers, Zap, Settings, Smartphone, Tablet, Watch, Headphones,
  Keyboard, Square, Radio, Mic, BatteryCharging, ShoppingBag, Wifi, Sliders, Printer,
  Projector, ShieldCheck, TabletSmartphone, BrainCircuit, Minimize2, CircuitBoard,
  MemoryStick, Server, SlidersHorizontal, Backpack, Volume2
};

function DynamicIcon({ item, name, className = "w-4 h-4" }) {
  let IconComponent = ChevronRight;

  if (item) {
    const slugKey = (item.slug || '').toLowerCase();
    const nameKey = (item.name || '').toLowerCase();
    const iconName = item.icon_name || '';

    IconComponent =
      CATEGORY_ICON_MAP[slugKey] ||
      CATEGORY_ICON_MAP[nameKey] ||
      FALLBACK_ICON_NAME_MAP[iconName] ||
      ChevronRight;
  } else if (name) {
    IconComponent = FALLBACK_ICON_NAME_MAP[name] || ChevronRight;
  }

  return <IconComponent className={className} />;
}

// Representative category images located in /public/images/
const CATEGORY_IMAGE_MAP = {
  'laptops': '/images/compressed-laptop-gaming.webp',
  'computadoras-y-componentes': '/images/compressed-pc-gaming.webp',
  'perifericos-y-accesorios': '/images/audifonos.png',
  'oficina-y-software': '/images/impresora.png',
  'moviles-y-wearables': '/images/tablet.png'
};

function getCategoryImage(category) {
  if (!category) return null;
  const slugKey = (category.slug || '').toLowerCase();
  return CATEGORY_IMAGE_MAP[slugKey] || null;
}

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [hasOffers, setHasOffers] = useState(false);
  const [activeParentSlug, setActiveParentSlug] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState(null);

  // Live Search States & Ref
  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [loadingLiveSearch, setLoadingLiveSearch] = useState(false);
  const [showLiveSearch, setShowLiveSearch] = useState(false);
  const searchContainerRef = useRef(null);

  const navigate = useNavigate();
  const navRef = useRef(null);

  const cartItems = useCartStore((state) => state.items);
  const openCart = useCartStore((state) => state.openCart);
  const user = useAuthStore((state) => state.user);

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Fetch dynamic categories tree from backend DB
  useEffect(() => {
    axiosClient.get('/products/categories')
      .then((res) => {
        if (res.data.success) {
          setCategories(res.data.categories || []);
          setHasOffers(Boolean(res.data.hasOffers));
        }
      })
      .catch((err) => console.error('[Navbar] Error loading categories:', err));
  }, []);

  // Live Search Debounce & AbortController Effect (280ms)
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
        .get(`/products?search=${encodeURIComponent(trimmed)}&limit=6`, {
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
          // Silently ignore aborted / canceled requests to avoid console noise or stale state updates
          if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
            return;
          }
          console.error('[LiveSearch] Error fetching results:', err);
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

  // Click Outside & Escape key listener to close Live Search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
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
      setMobileMenuOpen(false);
    }
  };

  const handleSelectProduct = (productSlug) => {
    setShowLiveSearch(false);
    navigate(`/product/${productSlug}`);
  };

  const handleSubcategoryClick = (slug) => {
    setActiveParentSlug(null);
    setMobileMenuOpen(false);
    navigate(`/catalog?category_id=${slug}`);
  };

  const [displayedCategory, setDisplayedCategory] = useState(null);
  const [menuHeight, setMenuHeight] = useState(0);
  const menuContentRef = useRef(null);

  const activeCategory = categories.find((c) => c.slug === activeParentSlug);

  useEffect(() => {
    if (activeCategory && activeCategory.subcategories && activeCategory.subcategories.length > 0) {
      setDisplayedCategory(activeCategory);
    }
  }, [activeCategory]);

  const isMenuOpen = Boolean(activeCategory && activeCategory.subcategories && activeCategory.subcategories.length > 0);
  const currentCategory = isMenuOpen ? activeCategory : displayedCategory;

  // Dynamic Height calculation via ResizeObserver for smooth dimension transition
  useEffect(() => {
    if (menuContentRef.current) {
      setMenuHeight(menuContentRef.current.offsetHeight);
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target) {
            setMenuHeight(entry.target.offsetHeight);
          }
        }
      });
      observer.observe(menuContentRef.current);
      return () => observer.disconnect();
    }
  }, [currentCategory, displayedCategory]);

  return (
    <header className="sticky top-0 z-50 bg-brand-dark border-b border-white/10 shadow-md transition-all" ref={navRef}>
      {/* Top Announcement Bar */}
      <div className="bg-brand-dark text-white text-[10px] sm:text-xs py-1.5 px-2.5 sm:px-4">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2">
          <div className="flex items-center space-x-2 sm:space-x-6 min-w-0">
            <span className="flex items-center text-gray-300 font-medium truncate">
              <Truck className="w-3.5 h-3.5 mr-1.5 text-brand-red flex-shrink-0" />
              <span>Envío Express a Todo el Perú (24-48h)</span>
            </span>
            <span className="hidden sm:flex items-center text-gray-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-brand-red flex-shrink-0" />
              Garantía Oficial 100% E-Commerce
            </span>
          </div>
          <div className="flex items-center space-x-3 text-gray-300 text-[10px] sm:text-xs">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, tengo una consulta sobre un producto en ${STORE_NAME}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer transition-colors hover:text-brand-red flex items-center"
            >
              Atención: {STORE_PHONE_DISPLAY}
            </a>
            {user?.role === 'admin' || user?.role === 'super_admin' ? (
              <Link to="/admin" className="text-slate-100 font-bold hover:text-brand-red-accent hover:underline">
                [ Panel Admin ]
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 bg-brand-dark min-h-[56px] sm:min-h-[64px]">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2 group flex-shrink-0">
          <div className="bg-brand-red text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-black tracking-widest text-sm sm:text-xl shadow-md group-hover:scale-105 transition-transform">
            SUPER
          </div>
          <span className="text-sm sm:text-xl font-black tracking-tight text-white">
            LAPTOP<span className="text-brand-red">.</span>
          </span>
        </Link>

        {/* Search Bar Desktop (Cohesive Unified Input with Live Search Autocomplete Dropdown) */}
        <form
          ref={searchContainerRef}
          onSubmit={handleSearchSubmit}
          className="group hidden md:flex flex-1 max-w-2xl relative mx-2 items-center outline-none focus:outline-none"
        >
          <input
            type="text"
            placeholder="Buscar laptops, procesadores, tarjetas gráficas, monitores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setShowLiveSearch(true);
            }}
            className="w-full bg-slate-800/60 border border-slate-700/60 focus:border-brand-red focus:bg-slate-800/90 rounded-md py-2 pl-4 pr-11 text-sm font-medium text-white placeholder:text-slate-400 outline-none focus:outline-none focus-visible:outline-none ring-0 ring-offset-0 focus:ring-0 shadow-inner transition-colors duration-200"
          />
          <button
            type="submit"
            className="absolute right-2 text-slate-400 group-focus-within:text-brand-red hover:text-white p-1.5 rounded-md transition-colors duration-200 flex items-center justify-center cursor-pointer outline-none focus:outline-none focus-visible:outline-none ring-0 ring-offset-0"
            title="Buscar"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5 transition-colors duration-200" />
          </button>

          {/* Live Search Predictively Suggested Dropdown Menu */}
          {showLiveSearch && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl z-50 overflow-hidden max-h-[420px] overflow-y-auto font-sans">
              {loadingLiveSearch ? (
                <div className="p-4 flex items-center justify-center space-x-2.5 text-gray-300">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-red-accent" />
                  <span className="text-xs font-semibold">Buscando productos ...</span>
                </div>
              ) : liveSearchResults.length > 0 ? (
                <div className="divide-y divide-slate-800">
                  {liveSearchResults.map((prod) => {
                    const img = prod.images?.find((i) => i.is_primary)?.image_url || prod.images?.[0]?.image_url || prod.image_url || null;
                    const isOffer = Boolean(prod.offer_price && Number(prod.offer_price) < Number(prod.price));
                    const currentPrice = Number(isOffer ? prod.offer_price : prod.price);
                    const formattedPrice = `S/ ${currentPrice.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleSelectProduct(prod.slug || prod.id)}
                        className="w-full text-left p-3 hover:bg-slate-800/80 transition-colors flex items-center space-x-3.5 group cursor-pointer"
                      >
                        <div className="w-11 h-11 bg-white rounded-md p-1 flex-shrink-0 flex items-center justify-center border border-slate-700/60 overflow-hidden">
                          <ProductImage
                            src={img}
                            alt={prod.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            size="xs"
                            showText={false}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-extrabold text-white group-hover:text-brand-red-accent transition-colors truncate">
                            {prod.name}
                          </h4>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-medium truncate">
                              {prod.brand?.name || prod.category?.name || 'SUPERLAPTOP'}
                            </span>
                            {prod.sku && (
                              <span className="text-[9px] text-gray-500 font-mono">
                                SKU: {prod.sku}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
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
                    className="w-full bg-slate-950 hover:bg-slate-800 text-brand-red-accent hover:text-white p-3 text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-colors border-t border-slate-800 cursor-pointer"
                  >
                    <span>Ver todos los resultados para "{searchQuery}"</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 space-y-1">
                  <p className="text-xs font-bold text-gray-200">No se encontraron productos para "{searchQuery}"</p>
                  <p className="text-[11px] text-gray-400">Prueba con términos como "Laptop", "RTX", "Ryzen" o "Monitor"</p>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Header Right Actions (Profile, Cart & Hamburger on Mobile/Tablet) */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-nowrap justify-end flex-shrink-0">
          {/* 1. User Profile / Login */}
          {user ? (
            <Link to="/profile" className="flex items-center space-x-1.5 text-xs font-bold text-slate-200 hover:text-white p-1" title="Mi Cuenta">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 text-brand-red-accent font-black text-xs flex items-center justify-center border border-slate-700">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="hidden lg:inline font-bold text-xs">{user.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-1 text-xs font-bold text-slate-200 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700/90 border border-slate-700 px-2 sm:px-3 py-1.5 rounded-md"
              title="Iniciar Sesión"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>
          )}

          {/* 2. Cart Button */}
          <button
            onClick={openCart}
            className="relative bg-brand-red hover:bg-brand-red-hover text-white px-2.5 sm:px-3.5 py-1.5 rounded-md flex items-center space-x-1 sm:space-x-1.5 shadow-md transition-transform active:scale-95 cursor-pointer"
            title="Ver Carrito"
          >
            <ShoppingBag className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline font-black text-xs uppercase tracking-wider">Carrito</span>
            {totalCartCount > 0 && (
              <span className="bg-white text-brand-red font-black text-xs px-1.5 py-0.5 rounded-full shadow">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* 3. Hamburger Menu Button (Visible on mobile/tablet, hidden on desktop lg+) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-slate-200 hover:text-white p-1.5 rounded-md border border-slate-700 hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Abrir Menú de Categorías"
            title="Menú de Categorías"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-brand-red-accent" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Bar & Centered Full-Width Mega-Menu */}
      <nav
        className="bg-brand-dark text-gray-200 text-xs sm:text-sm font-medium relative hidden md:block"
        onMouseLeave={() => setActiveParentSlug(null)}
      >
        <div className="max-w-[1440px] mx-auto px-4 flex flex-wrap items-center justify-between">
          <div className="flex flex-wrap items-center space-x-1 py-0.5">
            {/* Catalog Link */}
            <Link
              to="/catalog"
              className="px-3 py-2.5 text-xs font-extrabold text-white bg-brand-red hover:bg-brand-red-hover flex items-center transition-colors uppercase tracking-wider rounded-md flex-shrink-0"
              onMouseEnter={() => setActiveParentSlug(null)}
            >
              Todo el Catálogo
            </Link>

            {/* Dynamic Parent Categories Tabs */}
            {categories.map((parentCat) => {
              const isActive = activeParentSlug === parentCat.slug;
              const hasSubcategories = parentCat.subcategories && parentCat.subcategories.length > 0;

              return (
                <div
                  key={parentCat.id}
                  className="flex-shrink-0"
                  onMouseEnter={() => setActiveParentSlug(parentCat.slug)}
                >
                  <button
                    onClick={() => handleSubcategoryClick(parentCat.slug)}
                    className={`px-3.5 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                      isActive
                        ? 'text-white border-brand-red'
                        : 'text-gray-300 hover:text-white border-transparent hover:border-brand-red/60'
                    }`}
                  >
                    <span className="whitespace-nowrap">{parentCat.name}</span>
                    {hasSubcategories && <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isActive ? 'rotate-180 text-white' : ''}`} />}
                  </button>
                </div>
              );
            })}

            {/* Integrated "Ofertas" Button (Visible only if there are active offers) */}
            {hasOffers && (
              <Link
                to="/catalog?is_featured=true"
                className="px-3 py-2.5 text-xs font-black text-amber-400 hover:text-amber-300 flex items-center space-x-1 uppercase tracking-wider flex-shrink-0 border-b-2 border-transparent hover:border-amber-400 transition-colors"
                onMouseEnter={() => setActiveParentSlug(null)}
              >
                <Flame className="w-4 h-4 mr-1 text-amber-400 animate-pulse" />
                <span>Ofertas</span>
              </Link>
            )}
          </div>
        </div>

        {/* FULL-WIDTH CENTERED MEGA-MENU PANEL WITH SMOOTH DROPDOWN & HEIGHT TRANSITION */}
        <div
          className={`absolute left-0 right-0 top-full w-full bg-white text-gray-900 shadow-2xl z-50 overflow-hidden transition-[height,opacity,transform] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] transform rounded-b-md ${
            isMenuOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto visible border-b border-gray-200'
              : 'opacity-0 -translate-y-2 pointer-events-none invisible border-b-0'
          }`}
          style={{ height: isMenuOpen ? `${menuHeight}px` : '0px' }}
          onMouseEnter={() => currentCategory && setActiveParentSlug(currentCategory.slug)}
          onMouseLeave={() => setActiveParentSlug(null)}
        >
          {currentCategory && currentCategory.subcategories && currentCategory.subcategories.length > 0 && (
            <div
              ref={menuContentRef}
              className={`max-w-[1440px] mx-auto px-6 py-4 sm:py-5 grid grid-cols-1 lg:grid-cols-4 gap-6 ${
                currentCategory.subcategories.length <= 3 ? 'items-center' : 'items-start'
              }`}
            >
              {/* Left Parent Category Showcase (Open White Background with Floating Image) */}
              <div className="flex flex-col items-center lg:items-start justify-between gap-3 p-1 lg:pr-6 lg:border-r lg:border-slate-200/70 group/left h-fit w-full">
                {/* Category Featured Image Floating on White with Smooth Fade Animation */}
                {getCategoryImage(currentCategory) && (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 flex items-center justify-center flex-shrink-0 mx-auto lg:mx-0 relative overflow-hidden">
                    <img
                      key={currentCategory.slug}
                      src={getCategoryImage(currentCategory)}
                      alt={currentCategory.name}
                      className="max-h-full max-w-full object-contain drop-shadow-sm group-hover/left:scale-105 transition-transform duration-300 select-none animate-menu-image"
                      loading="eager"
                    />
                  </div>
                )}

                <div
                  key={`desc-${currentCategory.slug}`}
                  className="space-y-1.5 text-center lg:text-left w-full animate-menu-content"
                >
                  <div className="flex items-center justify-center lg:justify-start space-x-1.5">
                    <span className="p-1 bg-red-50 text-red-600 rounded-md">
                      <DynamicIcon item={currentCategory} className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600">
                      Categoría Principal
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {currentCategory.name}
                  </h3>

                  <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                    {currentCategory.description || 'Explora nuestra selección oficial con la mejor garantía en Perú.'}
                  </p>

                  <Link
                    to={`/catalog?category_id=${currentCategory.slug}`}
                    onClick={() => setActiveParentSlug(null)}
                    className="bg-brand-red hover:bg-brand-red-hover text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl flex items-center justify-center lg:justify-between shadow-sm transition-all active:scale-95 group/link mt-2.5 w-full"
                  >
                    <span>Ver todo en {currentCategory.name}</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Right Subcategories Grid (Spans 3 Columns with Adaptive Layout & Smooth Content Fade) */}
              <div
                key={`subs-${currentCategory.slug}`}
                className={`lg:col-span-3 grid animate-menu-content ${
                  currentCategory.subcategories.length <= 3
                    ? 'grid-cols-1 sm:grid-cols-3 gap-3'
                    : 'grid-cols-2 lg:grid-cols-3 gap-2.5 items-start'
                }`}
              >
                {currentCategory.subcategories.map((sub) => {
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSubcategoryClick(sub.slug)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-red-500/50 hover:bg-slate-50 transition-all cursor-pointer group bg-white shadow-xs text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-red-50 group-hover:text-red-600 transition-colors shrink-0">
                        <DynamicIcon item={sub} className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-red-600 transition-colors truncate">
                        {sub.name}
                      </span>
                      <ChevronRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Drawer Navigation (Accordion Style) */}
      {mobileMenuOpen && (
        <div className="bg-brand-dark border-b border-slate-800 p-4 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto border-t border-slate-800 text-white">
          {/* Search Mobile */}
          <form onSubmit={handleSearchSubmit} className="group flex md:hidden outline-none focus:outline-none">
            <input
              type="text"
              placeholder="Buscar en la tienda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700/60 focus:border-brand-red focus:bg-slate-800/90 rounded-l-xl py-2.5 px-3 text-xs text-white placeholder:text-slate-400 outline-none focus:outline-none focus-visible:outline-none ring-0 ring-offset-0 transition-colors duration-200"
            />
            <button type="submit" className="bg-brand-red text-white px-4 rounded-r-xl font-bold text-xs flex items-center outline-none focus:outline-none focus-visible:outline-none ring-0 ring-offset-0">
              <Search className="w-3.5 h-3.5 mr-1" /> Buscar
            </button>
          </form>

          {/* Mobile Direct Links */}
          <div className="flex gap-2">
            <Link
              to="/catalog"
              onClick={() => setMobileMenuOpen(false)}
              className={`${hasOffers ? 'flex-1' : 'w-full'} bg-brand-red text-white text-center py-2.5 rounded-xl font-bold text-xs uppercase shadow`}
            >
              Todo el Catálogo
            </Link>
            {hasOffers && (
              <Link
                to="/catalog?is_featured=true"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 bg-amber-500 text-slate-950 font-black text-center py-2.5 rounded-xl text-xs uppercase shadow"
              >
                ⚡ Ofertas
              </Link>
            )}
          </div>

          {/* Categories Accordion */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Categorías de Productos</h4>
            {categories.map((parentCat) => {
              const isExpanded = expandedMobileCategory === parentCat.slug;
              const hasSubcategories = parentCat.subcategories && parentCat.subcategories.length > 0;

              return (
                <div key={parentCat.id} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                  <button
                    onClick={() => setExpandedMobileCategory(isExpanded ? null : parentCat.slug)}
                    className="w-full p-3 bg-slate-800/80 flex items-center justify-between text-xs font-bold text-white active:bg-slate-800"
                  >
                    <span className="flex items-center">
                      <DynamicIcon item={parentCat} className="w-4 h-4 mr-2 text-brand-red-accent" />
                      {parentCat.name}
                    </span>
                    {hasSubcategories && (
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                    )}
                  </button>

                  {isExpanded && hasSubcategories && (
                    <div className="p-3 bg-slate-900 space-y-2 border-t border-slate-800">
                      <button
                        onClick={() => handleSubcategoryClick(parentCat.slug)}
                        className="w-full text-left text-xs font-extrabold text-brand-red-accent py-1 hover:underline"
                      >
                        Ver todo en {parentCat.name} →
                      </button>
                      {parentCat.subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleSubcategoryClick(sub.slug)}
                          className="w-full text-left text-xs font-semibold text-slate-300 py-2.5 px-3 hover:bg-slate-800/90 rounded-lg flex items-center justify-between transition-colors group"
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span className="p-1.5 rounded-md bg-slate-800 text-slate-400 group-hover:text-brand-red-accent group-hover:bg-slate-700 transition-colors shrink-0">
                              <DynamicIcon item={sub} className="w-3.5 h-3.5" />
                            </span>
                            <span className="truncate">{sub.name}</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
