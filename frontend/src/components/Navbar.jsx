import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingBag, User, Cpu, Scale, Menu, X, ShieldCheck, Truck, Headphones,
  ChevronDown, ChevronRight, Laptop, Gamepad2, Briefcase, Smile, Feather, RefreshCw,
  Monitor, Tv, Box, HardDrive, Database, Layers, Zap, Settings, Smartphone, Tablet,
  Watch, Keyboard, Square, Radio, Mic, BatteryCharging, Wifi, Sliders, Printer,
  Projector, Sparkles, Flame, Loader2
} from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCompareStore } from '../store/useCompareStore';
import axiosClient from '../api/axiosClient';

// Map icon names from DB to Lucide Icon components
const ICON_MAP = {
  Laptop, Gamepad2, Briefcase, Smile, Feather, RefreshCw, Cpu, Monitor, Tv, Box,
  HardDrive, Database, Layers, Zap, Settings, Smartphone, Tablet, Watch, Headphones,
  Keyboard, Square, Radio, Mic, BatteryCharging, ShoppingBag, Wifi, Sliders, Printer,
  Projector, ShieldCheck
};

function DynamicIcon({ name, className = "w-4 h-4" }) {
  const IconComponent = ICON_MAP[name] || ChevronRight;
  return <IconComponent className={className} />;
}

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
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
  const comparedProducts = useCompareStore((state) => state.comparedProducts);

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Fetch dynamic categories tree from backend DB
  useEffect(() => {
    axiosClient.get('/products/categories')
      .then((res) => {
        if (res.data.success) {
          setCategories(res.data.categories || []);
        }
      })
      .catch((err) => console.error('[Navbar] Error loading categories:', err));
  }, []);

  // Live Search Debounce Effect (280ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setLiveSearchResults([]);
      setShowLiveSearch(false);
      return;
    }

    setLoadingLiveSearch(true);
    setShowLiveSearch(true);

    const timer = setTimeout(() => {
      axiosClient
        .get(`/products?search=${encodeURIComponent(trimmed)}&limit=6`)
        .then((res) => {
          if (res.data.success) {
            setLiveSearchResults(res.data.products || []);
          } else {
            setLiveSearchResults([]);
          }
        })
        .catch((err) => {
          console.error('[LiveSearch] Error fetching results:', err);
          setLiveSearchResults([]);
        })
        .finally(() => {
          setLoadingLiveSearch(false);
        });
    }, 100);

    return () => clearTimeout(timer);
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
    <header className="sticky top-0 z-50 bg-white border-b border-slate-700 shadow-sm transition-all" ref={navRef}>
      {/* Top Announcement Bar */}
      <div className="bg-brand-dark text-white text-[10px] sm:text-xs py-1.5 px-2.5 sm:px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2">
          <div className="flex items-center space-x-2 sm:space-x-6 min-w-0">
            <span className="flex items-center text-gray-300 font-medium truncate">
              <Truck className="w-3.5 h-3.5 mr-1.5 text-brand-red-accent flex-shrink-0" />
              <span>Envío Express a Todo el Perú (24-48h)</span>
            </span>
            <span className="hidden sm:flex items-center text-gray-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-brand-blue-bright flex-shrink-0" />
              Garantía Oficial 100% E-Commerce
            </span>
          </div>
          <div className="flex items-center space-x-3 text-gray-300 text-[10px] sm:text-xs">
            <span>Atención: +51 933 347 488 </span>
            {user?.role === 'admin' || user?.role === 'super_admin' ? (
              <Link to="/admin" className="text-brand-red-accent font-bold hover:underline">
                [ Panel Admin ]
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2 group">
          <div className="bg-brand-red text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-black tracking-widest text-base sm:text-xl shadow-md group-hover:scale-105 transition-transform">
            SUPER
          </div>
          <span className="text-base sm:text-xl font-black tracking-tight text-brand-blue">
            LAPTOP<span className="text-brand-red">.</span>
          </span>
        </Link>

        {/* Search Bar Desktop (Cohesive Unified Input with Live Search Autocomplete Dropdown) */}
        <form
          ref={searchContainerRef}
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-2xl relative mx-2 items-center"
        >
          <input
            type="text"
            placeholder="Buscar laptops, procesadores, tarjetas gráficas, monitores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setShowLiveSearch(true);
            }}
            className="w-full bg-white border-2 border-brand-red rounded-md py-2 pl-4 pr-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red/30 shadow-sm transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 text-brand-red hover:text-brand-red-hover p-1.5 rounded-md transition-colors flex items-center justify-center cursor-pointer"
            title="Buscar"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5 text-brand-red" />
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
                    const img = prod.images?.find((i) => i.is_primary)?.image_url || prod.images?.[0]?.image_url || prod.image_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=300&auto=format&fit=crop';
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
                          <img src={img} alt={prod.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
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

        {/* Header Right Actions (Profile, Cart & Hamburger ALWAYS VISIBLE; Compare HIDDEN on mobile) */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-wrap sm:flex-nowrap justify-end">
          {/* Compare Button (HIDDEN ON MOBILE, VISIBLE ON SM+) */}
          <Link
            to="/compare"
            className="hidden sm:flex items-center p-1.5 text-gray-700 hover:text-brand-red transition-colors relative"
            title="Comparar productos"
          >
            <Scale className="w-5 h-5" />
            {comparedProducts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-blue text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow">
                {comparedProducts.length}
              </span>
            )}
          </Link>

          {/* 1. User Profile / Login (ALWAYS VISIBLE) */}
          {user ? (
            <Link to="/profile" className="flex items-center space-x-1 text-xs font-bold text-gray-700 hover:text-brand-red p-1" title="Mi Cuenta">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-blue-light text-brand-blue font-black text-xs flex items-center justify-center border border-brand-blue/20">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="hidden lg:inline font-bold text-xs">{user.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-1 text-xs font-bold text-gray-700 hover:text-brand-red transition-colors bg-gray-100 px-2 sm:px-3 py-1.5 rounded-md"
              title="Iniciar Sesión"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>
          )}

          {/* 2. Cart Button (ALWAYS VISIBLE) */}
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

          {/* 3. Hamburger Menu Button (ALWAYS VISIBLE across ALL screen widths) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-700 hover:text-brand-red p-1.5 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Abrir Menú de Categorías"
            title="Menú de Categorías"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-brand-red" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Bar & Centered Full-Width Mega-Menu */}
      <nav
        className="bg-gray-900 text-gray-200 text-xs sm:text-sm font-medium border-t border-gray-800 relative hidden md:block"
        onMouseLeave={() => setActiveParentSlug(null)}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between">
          <div className="flex flex-wrap items-center space-x-1 py-0.5">
            {/* Catalog Link */}
            <Link
              to="/catalog"
              className="px-3 py-2.5 text-xs font-extrabold text-white bg-brand-red hover:bg-brand-red-hover flex items-center transition-colors uppercase tracking-wider rounded-md flex-shrink-0"
              onMouseEnter={() => setActiveParentSlug(null)}
            >
              <Cpu className="w-4 h-4 mr-1.5" /> Todo el Catálogo
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
                    className={`px-3 py-2.5 text-xs font-bold flex items-center transition-all ${
                      isActive
                        ? 'text-white bg-gray-800 border-b-2 border-brand-red rounded-t-md rounded-b-none'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-md'
                    }`}
                  >
                    <DynamicIcon name={parentCat.icon_name} className="w-4 h-4 mr-1.5 text-brand-red-accent flex-shrink-0" />
                    <span className="whitespace-nowrap">{parentCat.name}</span>
                    {hasSubcategories && <ChevronDown className={`w-3.5 h-3.5 ml-1 text-gray-400 transition-transform ${isActive ? 'rotate-180 text-white' : ''}`} />}
                  </button>
                </div>
              );
            })}

            {/* Integrated "Ofertas" Button (In same row) */}
            <Link
              to="/catalog?is_featured=true"
              className="px-3 py-2.5 text-xs font-black text-amber-400 hover:text-amber-300 flex items-center space-x-1 uppercase tracking-wider flex-shrink-0 rounded-md hover:bg-gray-800/60 transition-colors"
              onMouseEnter={() => setActiveParentSlug(null)}
            >
              <Flame className="w-4 h-4 mr-1 text-amber-400 animate-pulse" />
              <span>Ofertas</span>
            </Link>
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
              key={currentCategory.id}
              className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-200"
            >
              {/* Left Parent Category Featured Card */}
              <div className="bg-gradient-to-br from-brand-dark to-slate-800 text-white rounded-lg p-6 flex flex-col justify-between space-y-4 shadow-lg border border-slate-700">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-2.5 bg-brand-red text-white rounded-md shadow-md">
                      <DynamicIcon name={currentCategory.icon_name} className="w-6 h-6" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-red-accent bg-brand-red/10 px-2.5 py-0.5 rounded-md border border-brand-red/20">
                      Categoría Principal
                    </span>
                  </div>
                  <h3 className="text-xl font-black leading-snug">{currentCategory.name}</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {currentCategory.description || 'Componentes informáticos seleccionados con la mejor garantía oficial en Perú.'}
                  </p>
                </div>

                <Link
                  to={`/catalog?category_id=${currentCategory.slug}`}
                  onClick={() => setActiveParentSlug(null)}
                  className="bg-brand-red hover:bg-brand-red-hover text-white text-xs font-extrabold px-4 py-3 rounded-md flex items-center justify-between shadow transition-all active:scale-95 group/link"
                >
                  <span>Ver todo en {currentCategory.name}</span>
                  <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Right Subcategories Grid (Spans 3 Columns) */}
              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3 items-start">
                {currentCategory.subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSubcategoryClick(sub.slug)}
                    className="flex items-center space-x-3 p-3 rounded-md bg-gray-50 hover:bg-white border border-gray-100 hover:border-brand-red/40 hover:shadow-md transition-all text-left group/item cursor-pointer"
                  >
                    <span className="p-2.5 bg-white text-gray-700 rounded-md group-hover/item:bg-brand-red group-hover/item:text-white transition-colors shadow-sm flex-shrink-0 border border-gray-200/60">
                      <DynamicIcon name={sub.icon_name} className="w-4 h-4" />
                    </span>
                    <div className="overflow-hidden">
                      <span className="font-extrabold text-xs text-gray-900 group-hover/item:text-brand-red transition-colors block truncate">
                        {sub.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold block mt-0.5 group-hover/item:text-gray-600">
                        Explorar componentes →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Drawer Navigation (Accordion Style) */}
      {mobileMenuOpen && (
        <div className="bg-white border-b border-gray-200 p-4 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto border-t border-gray-100">
          {/* Search Mobile */}
          <form onSubmit={handleSearchSubmit} className="flex md:hidden">
            <input
              type="text"
              placeholder="Buscar en la tienda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border border-gray-300 rounded-l-xl py-2.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
            <button type="submit" className="bg-brand-red text-white px-4 rounded-r-xl font-bold text-xs flex items-center">
              <Search className="w-3.5 h-3.5 mr-1" /> Buscar
            </button>
          </form>

          {/* Mobile Direct Links */}
          <div className="flex gap-2">
            <Link
              to="/catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 bg-brand-red text-white text-center py-2.5 rounded-xl font-bold text-xs uppercase"
            >
              Todo el Catálogo
            </Link>
            <Link
              to="/catalog?is_featured=true"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 bg-amber-500 text-white text-center py-2.5 rounded-xl font-bold text-xs uppercase"
            >
              ⚡ Ofertas
            </Link>
          </div>

          {/* Categories Accordion */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Categorías de Productos</h4>
            {categories.map((parentCat) => {
              const isExpanded = expandedMobileCategory === parentCat.slug;
              const hasSubcategories = parentCat.subcategories && parentCat.subcategories.length > 0;

              return (
                <div key={parentCat.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedMobileCategory(isExpanded ? null : parentCat.slug)}
                    className="w-full p-3 bg-gray-50 flex items-center justify-between text-xs font-bold text-gray-900 active:bg-gray-100"
                  >
                    <span className="flex items-center">
                      <DynamicIcon name={parentCat.icon_name} className="w-4 h-4 mr-2 text-brand-red" />
                      {parentCat.name}
                    </span>
                    {hasSubcategories && (
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {isExpanded && hasSubcategories && (
                    <div className="p-3 bg-white space-y-2 border-t border-gray-100">
                      <button
                        onClick={() => handleSubcategoryClick(parentCat.slug)}
                        className="w-full text-left text-xs font-extrabold text-brand-red py-1"
                      >
                        Ver todo en {parentCat.name} →
                      </button>
                      {parentCat.subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleSubcategoryClick(sub.slug)}
                          className="w-full text-left text-xs font-semibold text-gray-700 py-2 px-2 hover:bg-gray-50 rounded-lg flex items-center"
                        >
                          <DynamicIcon name={sub.icon_name} className="w-3.5 h-3.5 mr-2 text-gray-400" />
                          {sub.name}
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
