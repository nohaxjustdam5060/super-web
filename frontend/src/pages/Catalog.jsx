import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Grid, List, Search, RefreshCw, ChevronDown, CheckCircle } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import axiosClient from '../api/axiosClient';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter Options State
  const [filterOptions, setFilterOptions] = useState({
    processors: [],
    ramOptions: [],
    storageOptions: [],
    screenOptions: [],
    brandOptions: []
  });

  // Filter States
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category_id') || '';
  const brandId = searchParams.get('brand_id') || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const inStock = searchParams.get('in_stock') || '';
  const sort = searchParams.get('sort') || 'newest';

  // Spec Multi-select filter values (comma-separated string in URL params)
  const selectedProcessors = (searchParams.get('processor_family') || '').split(',').filter(Boolean);
  const selectedRam = (searchParams.get('ram_gb') || '').split(',').filter(Boolean);
  const selectedStorage = (searchParams.get('storage') || '').split(',').filter(Boolean);
  const selectedScreen = (searchParams.get('screen_range') || '').split(',').filter(Boolean);

  useEffect(() => {
    axiosClient.get('/products/filters')
      .then((res) => {
        if (res.data.success && res.data.filters) {
          setFilterOptions(res.data.filters);
        }
      })
      .catch((err) => console.error('Error fetching filter options:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams(searchParams).toString();
    axiosClient.get(`/products?${query}`)
      .then((res) => {
        if (res.data.success) {
          setProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleMultiSelectFilter = (paramKey, value) => {
    const newParams = new URLSearchParams(searchParams);
    const currentValues = (newParams.get(paramKey) || '').split(',').filter(Boolean);
    let updated;
    if (currentValues.includes(value)) {
      updated = currentValues.filter((v) => v !== value);
    } else {
      updated = [...currentValues, value];
    }
    if (updated.length > 0) {
      newParams.set(paramKey, updated.join(','));
    } else {
      newParams.delete(paramKey);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const activeFiltersCount = [
    brandId, minPrice, maxPrice, inStock, search,
    searchParams.get('processor_family'),
    searchParams.get('ram_gb'),
    searchParams.get('storage'),
    searchParams.get('screen_range')
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-gray-900">Catálogo de Hardware & Electrónica</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {search ? `Resultados de búsqueda para "${search}"` : categoryId ? `Filtrando por categoría: ${categoryId}` : 'Todos los productos disponibles'} ({products.length} encontrados)
          </p>
        </div>

        {/* View mode & Sort Controls Bar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-between sm:justify-end border-t border-gray-100 pt-3 md:pt-0 md:border-t-0 min-w-0">
          {/* Sort Selector */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap min-w-0">
            <label className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-wider flex-shrink-0">
              Ordenar:
            </label>
            <select
              value={sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="bg-gray-100 border border-gray-300 text-[11px] sm:text-xs md:text-sm font-bold rounded-xl px-2.5 py-1.5 sm:py-2 focus:ring-2 focus:ring-brand-red max-w-[150px] sm:max-w-xs truncate text-gray-800"
            >
              <option value="newest">Más recientes</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
              <option value="name">Nombre A-Z</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden bg-brand-dark hover:bg-slate-800 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center space-x-1.5 shadow active:scale-95 transition-all flex-shrink-0"
            >
              <Filter className="w-3.5 h-3.5 text-brand-red-accent flex-shrink-0" />
              <span className="truncate">Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
            </button>

            {/* Grid/List View Toggle (Hidden on Mobile < 640px) */}
            <div className="hidden sm:flex items-center border border-gray-300 rounded-xl bg-gray-100 p-1 flex-shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-brand-red font-bold' : 'text-gray-500'}`}
                aria-label="Vista cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow text-brand-red font-bold' : 'text-gray-500'}`}
                aria-label="Vista lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        {/* Filter Sidebar (Collapsible on Mobile, Fixed on Desktop) */}
        <aside className={`bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 h-fit ${mobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h3 className="font-extrabold text-gray-900 flex items-center text-sm sm:text-base">
              <Filter className="w-4 h-4 mr-2 text-brand-red" /> Filtros del Catálogo
            </h3>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-brand-red font-bold hover:underline flex items-center">
                <RefreshCw className="w-3 h-3 mr-1" /> Limpiar
              </button>
            )}
          </div>

          {/* Availability Filter */}
          {/*
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-gray-800 mb-2">Disponibilidad</h4>
            <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 cursor-pointer p-2 bg-gray-50 rounded-xl border border-gray-100">
              <input
                type="checkbox"
                checked={inStock === 'true'}
                onChange={(e) => handleFilterChange('in_stock', e.target.checked ? 'true' : '')}
                className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
              />
              <span className="flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                Solo en Stock Disponible
              </span>
            </label>
          </div>
          */}

          {/* Marcas Filter (Dynamic from getFilterOptions) */}
          {filterOptions.brandOptions && filterOptions.brandOptions.length > 0 && (
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-gray-800 mb-2">Marca</h4>
              <div className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2 border border-gray-100 p-2 rounded-xl bg-gray-50">
                {filterOptions.brandOptions.map((b) => (
                  <label key={b.id} className="flex items-center justify-between font-medium text-gray-700 cursor-pointer hover:text-brand-red transition-colors">
                    <span className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={brandId === b.slug || brandId === b.id}
                        onChange={(e) => handleFilterChange('brand_id', e.target.checked ? b.slug : '')}
                        className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
                      />
                      <span>{b.name}</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
                      {b.count}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Procesador Filter */}
          {filterOptions.processors && filterOptions.processors.length > 0 && (
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-gray-800 mb-2">Procesador</h4>
              <div className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2 border border-gray-100 p-2 rounded-xl bg-gray-50">
                {filterOptions.processors.map((p) => (
                  <label key={p.value} className="flex items-center justify-between font-medium text-gray-700 cursor-pointer hover:text-brand-red transition-colors">
                    <span className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedProcessors.includes(p.value)}
                        onChange={() => handleMultiSelectFilter('processor_family', p.value)}
                        className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
                      />
                      <span>{p.value}</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
                      {p.count}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Memoria RAM Filter */}
          {filterOptions.ramOptions && filterOptions.ramOptions.length > 0 && (
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-gray-800 mb-2">Memoria RAM</h4>
              <div className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2 border border-gray-100 p-2 rounded-xl bg-gray-50">
                {filterOptions.ramOptions.map((r) => {
                  const valStr = String(r.value);
                  return (
                    <label key={r.value} className="flex items-center justify-between font-medium text-gray-700 cursor-pointer hover:text-brand-red transition-colors">
                      <span className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedRam.includes(valStr)}
                          onChange={() => handleMultiSelectFilter('ram_gb', valStr)}
                          className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
                        />
                        <span>{r.value} GB</span>
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
                        {r.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Almacenamiento Filter */}
          {filterOptions.storageOptions && filterOptions.storageOptions.length > 0 && (
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-gray-800 mb-2">Almacenamiento</h4>
              <div className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2 border border-gray-100 p-2 rounded-xl bg-gray-50">
                {filterOptions.storageOptions.map((s) => {
                  const storageKey = `${s.storage_gb}_${s.storage_type}`;
                  const displayCap = s.storage_gb >= 1024 ? `${s.storage_gb / 1024} TB` : `${s.storage_gb} GB`;
                  return (
                    <label key={storageKey} className="flex items-center justify-between font-medium text-gray-700 cursor-pointer hover:text-brand-red transition-colors">
                      <span className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedStorage.includes(storageKey)}
                          onChange={() => handleMultiSelectFilter('storage', storageKey)}
                          className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
                        />
                        <span>{displayCap} {s.storage_type}</span>
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
                        {s.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tamaños de Pantalla Filter */}
          {filterOptions.screenOptions && filterOptions.screenOptions.length > 0 && (
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-gray-800 mb-2">Tamaño de Pantalla</h4>
              <div className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2 border border-gray-100 p-2 rounded-xl bg-gray-50">
                {filterOptions.screenOptions.map((sc) => (
                  <label key={sc.range} className="flex items-center justify-between font-medium text-gray-700 cursor-pointer hover:text-brand-red transition-colors">
                    <span className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedScreen.includes(sc.range)}
                        onChange={() => handleMultiSelectFilter('screen_range', sc.range)}
                        className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
                      />
                      <span>{sc.range}</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
                      {sc.count}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Rango de Precios Filter */}
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-gray-800 mb-2">Rango de Precio (S/)</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Mín"
                value={minPrice}
                onChange={(e) => handleFilterChange('min_price', e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-red"
              />
              <input
                type="number"
                placeholder="Máx"
                value={maxPrice}
                onChange={(e) => handleFilterChange('max_price', e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse h-80 rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-gray-200 text-center space-y-4">
              <Search className="w-12 h-12 mx-auto text-gray-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">No se encontraron productos</h3>
              <p className="text-gray-500 text-xs sm:text-sm">Intenta ajustar o limpiar tus filtros de búsqueda.</p>
              <button
                onClick={clearFilters}
                className="bg-brand-red text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm hover:bg-brand-red-hover shadow"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6' : 'space-y-4'}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
