import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingBag, User, Cpu, Scale, Menu, X, ShieldCheck, Truck, Headphones,
  ChevronDown, ChevronRight, Laptop, Gamepad2, Briefcase, Smile, Feather, RefreshCw,
  Monitor, Tv, Box, HardDrive, Database, Layers, Zap, Settings, Smartphone, Tablet,
  Watch, Keyboard, Square, Radio, Mic, BatteryCharging, Wifi, Sliders, Printer,
  Projector, Sparkles, Flame
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const handleSubcategoryClick = (slug) => {
    setActiveParentSlug(null);
    setMobileMenuOpen(false);
    navigate(`/catalog?category_id=${slug}`);
  };

  const activeCategory = categories.find((c) => c.slug === activeParentSlug);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm" ref={navRef}>
      {/* Top Announcement Bar */}
      <div className="bg-brand-dark text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-1 sm:gap-2">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <span className="flex items-center text-gray-300 font-medium">
              <Truck className="w-3.5 h-3.5 mr-1.5 text-brand-red-accent flex-shrink-0" />
              Envío Express a Todo el Perú (24-48h)
            </span>
            <span className="hidden sm:flex items-center text-gray-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-brand-blue-bright flex-shrink-0" />
              Garantía Oficial 100% E-Commerce
            </span>
          </div>
          <div className="flex items-center space-x-3 text-gray-300">
            <span>Atención: (01) 700-SUPER</span>
            {user?.role === 'admin' || user?.role === 'super_admin' ? (
              <Link to="/admin" className="text-brand-red-accent font-bold hover:underline">
                [ Panel Admin ]
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2 group flex-shrink-0">
          <div className="bg-brand-red text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl font-black tracking-widest text-base sm:text-xl shadow-md group-hover:scale-105 transition-transform">
            SUPER
          </div>
          <span className="text-base sm:text-xl font-black tracking-tight text-brand-blue">
            TECH<span className="text-brand-red">.</span>
          </span>
        </Link>

        {/* Search Bar Desktop */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-2xl relative mx-2">
          <input
            type="text"
            placeholder="Buscar laptops, procesadores, tarjetas gráficas, monitores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 border border-gray-300 rounded-l-xl py-2 px-3.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
          />
          <button
            type="submit"
            className="bg-brand-red hover:bg-brand-red-hover text-white px-4 rounded-r-xl font-bold text-sm flex items-center justify-center transition-colors shadow"
          >
            <Search className="w-4 h-4 mr-1.5" />
            Buscar
          </button>
        </form>

        {/* Header Right Actions (CRITICAL ELEMENTS ALWAYS VISIBLE ACROSS ALL SCREEN SIZES) */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
          {/* Compare Button */}
          <Link
            to="/compare"
            className="flex items-center p-1.5 text-gray-700 hover:text-brand-red transition-colors relative"
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
            <Link to="/profile" className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 hover:text-brand-red p-1" title="Mi Cuenta">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-blue-light text-brand-blue font-black text-xs flex items-center justify-center border border-brand-blue/20">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="hidden lg:inline font-bold text-xs">{user.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-1 text-xs font-bold text-gray-700 hover:text-brand-red transition-colors bg-gray-100 px-2 sm:px-3 py-1.5 rounded-xl"
              title="Iniciar Sesión"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>
          )}

          {/* 2. Cart Button (ALWAYS VISIBLE) */}
          <button
            onClick={openCart}
            className="relative bg-brand-red hover:bg-brand-red-hover text-white px-2.5 sm:px-3.5 py-1.5 rounded-xl flex items-center space-x-1 sm:space-x-1.5 shadow-md transition-transform active:scale-95"
            title="Ver Carrito"
          >
            <ShoppingBag className="w-4 h-4 sm:w-4 h-4 flex-shrink-0" />
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
            className="text-gray-700 hover:text-brand-red p-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-center"
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
              className="px-3 py-2.5 text-xs font-extrabold text-white bg-brand-red hover:bg-brand-red-hover flex items-center transition-colors uppercase tracking-wider rounded-lg flex-shrink-0"
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
                    className={`px-3 py-2.5 text-xs font-bold flex items-center transition-all rounded-lg ${
                      isActive ? 'text-white bg-gray-800 border-b-2 border-brand-red' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
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
              className="px-3 py-2.5 text-xs font-black text-amber-400 hover:text-amber-300 flex items-center space-x-1 uppercase tracking-wider flex-shrink-0 rounded-lg hover:bg-gray-800/60 transition-colors"
              onMouseEnter={() => setActiveParentSlug(null)}
            >
              <Flame className="w-4 h-4 mr-1 text-amber-400 animate-pulse" />
              <span>Ofertas</span>
            </Link>
          </div>
        </div>

        {/* FULL-WIDTH CENTERED MEGA-MENU PANEL */}
        {activeCategory && activeCategory.subcategories && activeCategory.subcategories.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full w-full bg-white text-gray-900 shadow-2xl border-b border-gray-200 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
            onMouseEnter={() => setActiveParentSlug(activeCategory.slug)}
            onMouseLeave={() => setActiveParentSlug(null)}
          >
            <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Parent Category Featured Card */}
              <div className="bg-gradient-to-br from-brand-dark to-slate-800 text-white rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-lg border border-slate-700">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-2.5 bg-brand-red text-white rounded-xl shadow-md">
                      <DynamicIcon name={activeCategory.icon_name} className="w-6 h-6" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-red-accent bg-brand-red/10 px-2.5 py-0.5 rounded-md border border-brand-red/20">
                      Categoría Principal
                    </span>
                  </div>
                  <h3 className="text-xl font-black leading-snug">{activeCategory.name}</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {activeCategory.description || 'Componentes informáticos seleccionados con la mejor garantía oficial en Perú.'}
                  </p>
                </div>

                <Link
                  to={`/catalog?category_id=${activeCategory.slug}`}
                  onClick={() => setActiveParentSlug(null)}
                  className="bg-brand-red hover:bg-brand-red-hover text-white text-xs font-extrabold px-4 py-3 rounded-xl flex items-center justify-between shadow transition-all active:scale-95 group/link"
                >
                  <span>Ver todo en {activeCategory.name}</span>
                  <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Right Subcategories Grid (Spans 3 Columns) */}
              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3 items-start">
                {activeCategory.subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSubcategoryClick(sub.slug)}
                    className="flex items-center space-x-3 p-3 rounded-2xl bg-gray-50 hover:bg-white border border-gray-100 hover:border-brand-red/40 hover:shadow-md transition-all text-left group/item"
                  >
                    <span className="p-2.5 bg-white text-gray-700 rounded-xl group-hover/item:bg-brand-red group-hover/item:text-white transition-colors shadow-sm flex-shrink-0 border border-gray-200/60">
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
          </div>
        )}
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
