import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Grid, List, Search, RefreshCw, ChevronDown, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import axiosClient from '../api/axiosClient';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Items per page limit (default 12)
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Pagination Metadata state returned from backend
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1
  });

  // Filter Options State (Dynamic counts from backend)
  const [filterOptions, setFilterOptions] = useState({
    processors: [],
    ramOptions: [],
    storageOptions: [],
    screenOptions: [],
    brandOptions: []
  });

  // Filter States from URL search params
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category_id') || '';
  const brandId = searchParams.get('brand_id') || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const inStock = searchParams.get('in_stock') || '';
  const sort = searchParams.get('sort') || 'newest';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Spec Multi-select filter values (comma-separated string in URL params)
  const selectedProcessors = (searchParams.get('processor_family') || '').split(',').filter(Boolean);
  const selectedRam = (searchParams.get('ram_gb') || '').split(',').filter(Boolean);
  const selectedStorage = (searchParams.get('storage') || '').split(',').filter(Boolean);
  const selectedScreen = (searchParams.get('screen_range') || '').split(',').filter(Boolean);

  const [categoriesTree, setCategoriesTree] = useState([]);

  // Fetch Filter Sidebar Options & Categories tree once on mount
  useEffect(() => {
    axiosClient.get('/products/filters')
      .then((res) => {
        if (res.data.success && res.data.filters) {
          setFilterOptions(res.data.filters);
        }
      })
      .catch((err) => console.error('Error fetching filter options:', err));

    axiosClient.get('/products/categories')
      .then((res) => {
        if (res.data.success && res.data.categories) {
          setCategoriesTree(res.data.categories);
        }
      })
      .catch((err) => console.error('Error fetching categories list:', err));
  }, []);

  // Fetch Paginated Products from Backend whenever searchParams or itemsPerPage change
  useEffect(() => {
    setLoading(true);
    setProducts([]); // Immediately clear previous products to prevent flash
    const params = new URLSearchParams(searchParams);
    
    // Ensure page and limit parameters are explicitly sent to backend
    if (!params.has('page')) params.set('page', String(currentPage));
    if (!params.has('limit')) params.set('limit', String(itemsPerPage));

    const query = params.toString();

    axiosClient.get(`/products?${query}`)
      .then((res) => {
        if (res.data.success) {
          setProducts(res.data.products || []);
          if (res.data.pagination) {
            setPaginationInfo(res.data.pagination);
          } else {
            const tot = res.data.total || (res.data.products || []).length;
            const lim = Number(params.get('limit')) || 12;
            const pg = Number(params.get('page')) || 1;
            setPaginationInfo({
              total: tot,
              page: pg,
              limit: lim,
              totalPages: Math.ceil(tot / lim) || 1
            });
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [searchParams, itemsPerPage]);

  // Handler for single-select filters (category, brand, min_price, max_price, sort)
  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Always reset to page 1 when changing any filter
    newParams.delete('page');
    setSearchParams(newParams);
  };

  // Handler for multi-select spec filters
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
    // Always reset to page 1 when changing any filter
    newParams.delete('page');
    setSearchParams(newParams);
  };

  // Handler for page navigation buttons
  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    if (newPage > 1) {
      newParams.set('page', String(newPage));
    } else {
      newParams.delete('page');
    }
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler for changing items per page limit
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('limit', String(newLimit));
    newParams.delete('page'); // Reset to page 1
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

  // Pagination Display Calculations
  const { total, page: backendPage, limit: backendLimit, totalPages } = paginationInfo;
  const safeCurrentPage = Math.min(Math.max(backendPage || currentPage, 1), totalPages || 1);

  const startIndex = total > 0 ? (safeCurrentPage - 1) * backendLimit + 1 : 0;
  const endIndex = Math.min(safeCurrentPage * backendLimit, total);

  // Helper to generate dynamic page numbers list with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let start = Math.max(2, safeCurrentPage - 1);
      let end = Math.min(totalPages - 1, safeCurrentPage + 1);

      if (safeCurrentPage <= 3) {
        end = 4;
      } else if (safeCurrentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }
    return pages;
  };

  // Lookup official Category or Subcategory Name by slug or id
  const getCategoryName = (slugOrId) => {
    if (!slugOrId) return '';
    if (categoriesTree && categoriesTree.length > 0) {
      for (const parent of categoriesTree) {
        if (parent.slug === slugOrId || parent.id === slugOrId) return parent.name;
        if (parent.subcategories) {
          for (const sub of parent.subcategories) {
            if (sub.slug === slugOrId || sub.id === slugOrId) return sub.name;
          }
        }
      }
    }
    return slugOrId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Lookup Brand Name by slug or id
  const getBrandName = (brandSlugOrId) => {
    if (!brandSlugOrId) return '';
    const found = filterOptions.brandOptions?.find(
      (b) => b.slug === brandSlugOrId || b.id === brandSlugOrId
    );
    if (found) return found.name;
    return brandSlugOrId.replace(/-/g, ' ').toUpperCase();
  };

  // Dynamic Title h1 Computation
  const getDynamicTitle = () => {
    if (search) {
      return `Resultados para: "${search}"`;
    }
    if (categoryId) {
      const catName = getCategoryName(categoryId);
      return catName.toUpperCase();
    }
    if (brandId) {
      const bName = getBrandName(brandId);
      return `PRODUCTOS ${bName.toUpperCase()}`;
    }
    if (searchParams.get('is_featured') === 'true') {
      return 'OFERTAS TOP Y DESTACADOS';
    }
    return 'Catálogo de Productos';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight">
            {getDynamicTitle()}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            {total > 0
              ? `Mostrando ${startIndex} - ${endIndex} de ${total} productos (pág. ${safeCurrentPage} de ${totalPages})`
              : 'No se encontraron productos coincidentes'}
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
              className="bg-gray-100 border border-gray-300 text-[11px] sm:text-xs md:text-sm font-bold rounded-xl px-2.5 py-1.5 sm:py-2 focus:ring-2 focus:ring-brand-red max-w-[150px] sm:max-w-xs truncate text-gray-800 cursor-pointer"
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

        {/* Product Grid & Backend Pagination */}
        <main className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="space-y-6">
              {/* Centered Fluid Loading State Indicator */}
              <div className="bg-white p-8 sm:p-12 rounded-lg border border-gray-200 text-center py-10 flex flex-col items-center justify-center space-y-3 shadow-sm">
                <Loader2 className="w-10 h-10 text-brand-red animate-spin" />
                <p className="text-sm sm:text-base font-extrabold text-gray-900">Cargando productos...</p>
                <p className="text-xs text-gray-500 font-medium">Buscando los mejores equipos disponibles en el catálogo</p>
              </div>

              {/* Grid of Skeleton Placeholder Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-200/80 animate-pulse h-80 rounded-lg border border-gray-200" />
                ))}
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white p-8 sm:p-12 rounded-lg border border-gray-200 text-center space-y-4 shadow-sm">
              <Search className="w-12 h-12 mx-auto text-gray-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                {search ? `No se encontraron productos para "${search}"` : categoryId ? `No hay productos disponibles en esta categoría` : brandId ? `No hay productos de esta marca` : 'No se encontraron productos'}
              </h3>
              <p className="text-gray-500 text-xs sm:text-sm">
                No se encontraron productos que coincidan con los filtros seleccionados. Intenta ajustar o limpiar tu búsqueda.
              </p>
              <button
                onClick={clearFilters}
                className="bg-brand-red text-white font-bold px-6 py-2.5 rounded-md text-xs sm:text-sm hover:bg-brand-red-hover shadow active:scale-95 transition-all cursor-pointer"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <>
              {/* Product Grid / List */}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6' : 'space-y-4'}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination Controls Bar */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm">
                  {/* Items Counter Info */}
                  <div className="text-xs font-bold text-gray-500 text-center sm:text-left">
                    Mostrando <span className="text-gray-900 font-extrabold">{startIndex}</span> - <span className="text-gray-900 font-extrabold">{endIndex}</span> de <span className="text-gray-900 font-extrabold">{total}</span> productos
                  </div>

                  {/* Navigation Arrows & Number Buttons */}
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(safeCurrentPage - 1)}
                      disabled={safeCurrentPage === 1}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                        safeCurrentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                          : 'bg-gray-100 text-gray-700 hover:bg-brand-red hover:text-white shadow-sm active:scale-95 cursor-pointer'
                      }`}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>

                    {/* Page Numbers */}
                    {getPageNumbers().map((pg, idx) => (
                      typeof pg === 'number' ? (
                        <button
                          key={idx}
                          onClick={() => handlePageChange(pg)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            safeCurrentPage === pg
                              ? 'bg-brand-red text-white shadow-md shadow-brand-red/30 scale-105'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                          }`}
                        >
                          {pg}
                        </button>
                      ) : (
                        <span key={idx} className="w-8 h-9 flex items-center justify-center text-xs font-bold text-gray-400">
                          ...
                        </span>
                      )
                    ))}

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(safeCurrentPage + 1)}
                      disabled={safeCurrentPage === totalPages}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                        safeCurrentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                          : 'bg-gray-100 text-gray-700 hover:bg-brand-red hover:text-white shadow-sm active:scale-95 cursor-pointer'
                      }`}
                      aria-label="Página siguiente"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Items Per Page Dropdown */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-500">Por página:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="bg-gray-100 border border-gray-300 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-brand-red text-gray-800 cursor-pointer"
                    >
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
