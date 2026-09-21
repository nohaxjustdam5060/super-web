import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Package, Check, X, ToggleLeft, ToggleRight, Sparkles, Filter, Search, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ProductFormModal from '../components/ProductFormModal';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Pagination & Filtering State
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState({ all: 0, active: 0, inactive: 0 });

  const fetchProducts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', String(itemsPerPage));
    params.set('include_inactive', 'true');

    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }

    axiosClient.get(`/products?${params.toString()}`)
      .then((res) => {
        if (res.data.success) {
          setProducts(res.data.products || []);
          setTotalProductsCount(res.data.total || 0);
          setTotalPages(res.data.totalPages || 1);
        }
      })
      .catch((err) => console.error('[FETCH_ADMIN_PRODUCTS_ERROR]', err))
      .finally(() => setLoading(false));
  };

  const fetchStatusCounts = () => {
    Promise.all([
      axiosClient.get('/products?limit=1&include_inactive=true'),
      axiosClient.get('/products?limit=1&status=active'),
      axiosClient.get('/products?limit=1&status=inactive')
    ]).then(([allRes, actRes, inactRes]) => {
      setStatusCounts({
        all: allRes.data.total || 0,
        active: actRes.data.total || 0,
        inactive: inactRes.data.total || 0
      });
    }).catch((err) => console.error('[FETCH_STATUS_COUNTS_ERROR]', err));
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, itemsPerPage, statusFilter, searchQuery]);

  useEffect(() => {
    fetchStatusCounts();
    axiosClient.get('/products/categories').then((res) => setCategories(res.data.categories || []));
    axiosClient.get('/products/brands').then((res) => setBrands(res.data.brands || []));
  }, []);

  const openCreateModal = () => {
    setSelectedProduct(null);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  // Toggle Active/Inactive status optimistically
  const handleToggleStatus = async (product) => {
    const newStatus = !product.is_active;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: newStatus } : p))
    );

    try {
      await axiosClient.put(`/products/${product.id}`, { is_active: newStatus });
      fetchStatusCounts();
    } catch (err) {
      console.error('[TOGGLE_STATUS_ERROR]', err);
      // Revert on error
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: product.is_active } : p))
      );
      alert('Error al actualizar el estado del producto');
    }
  };

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
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

  const startIndex = totalProductsCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, totalProductsCount);

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8 space-y-6">
      {/* Header Bar */}
      <div className="bg-brand-dark text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-brand-red-accent font-black text-xs uppercase tracking-widest">[ PANEL ADMINISTRATIVO SUPER ]</span>
          <h1 className="text-2xl font-black mt-1 flex items-center">
            <Package className="w-6 h-6 mr-2 text-brand-red" /> Gestión de Productos e Inventario
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Administración de catálogo, edición de precios y control de visibilidad</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Link
            to="/admin"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-extrabold text-xs px-5 py-3 rounded-2xl transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4 text-brand-red-accent" />
            <span>Volver al Dashboard</span>
          </Link>
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusFilterChange('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({statusCounts.all})
          </button>
          <button
            onClick={() => handleStatusFilterChange('active')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Solo Activos ({statusCounts.active})
          </button>
          <button
            onClick={() => handleStatusFilterChange('inactive')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-slate-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Solo Inactivos ({statusCounts.inactive})
          </button>
        </div>

        {/* Search Box in Admin */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-gray-100 border border-gray-300 rounded-xl py-2 px-3 pl-9 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 font-black text-gray-400 uppercase tracking-wider text-[11px]">
              <th className="p-4 whitespace-nowrap">Producto</th>
              <th className="p-4 whitespace-nowrap">SKU</th>
              <th className="p-4 whitespace-nowrap">Categoría / Subcategoría</th>
              <th className="p-4 whitespace-nowrap">Precio</th>
              <th className="p-4 whitespace-nowrap">Oferta</th>
              <th className="p-4 whitespace-nowrap">Stock</th>
              <th className="p-4 text-center whitespace-nowrap">Estado Público</th>
              <th className="p-4 text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400 font-semibold">
                  Cargando productos...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400 font-semibold">
                  No se encontraron productos coincidentes.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50/80 transition-colors ${!p.is_active ? 'bg-slate-50/50 opacity-80' : ''}`}>
                  <td className="p-4 flex items-center space-x-3 min-w-[220px]">
                    <img
                      src={p.images?.find((i) => i.is_primary)?.image_url || p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop'}
                      alt=""
                      className="w-10 h-10 object-contain rounded-xl bg-gray-50 p-1 border border-gray-200 flex-shrink-0"
                    />
                    <div>
                      <span className="font-bold text-gray-900 line-clamp-1 max-w-xs">{p.name}</span>
                      <span className="text-[10px] text-gray-400 block">{p.brand?.name || 'SUPERLAPTOP'}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-gray-500 whitespace-nowrap">{p.sku}</td>
                  <td className="p-4 text-gray-600 whitespace-nowrap">{p.category?.name || '—'}</td>
                  <td className="p-4 font-bold text-gray-900 whitespace-nowrap">S/ {Number(p.price).toFixed(2)}</td>
                  <td className="p-4 text-brand-red font-black whitespace-nowrap">
                    {p.offer_price ? `S/ ${Number(p.offer_price).toFixed(2)}` : '—'}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full font-black text-[10px] sm:text-[11px] ${p.stock <= 5 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                      {p.stock} unids
                    </span>
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    {/* Active / Inactive Switch Toggle */}
                    <button
                      onClick={() => handleToggleStatus(p)}
                      title={p.is_active ? 'Desactivar producto (Ocultar del catálogo)' : 'Activar producto (Mostrar en catálogo)'}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-black text-[10px] sm:text-[11px] border transition-all shadow-sm active:scale-95 whitespace-nowrap ${
                        p.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{p.is_active ? 'Activo' : 'Inactivo'}</span>
                    </button>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(p)}
                      className="bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/20 font-bold px-3 py-1.5 rounded-xl text-xs inline-flex items-center space-x-1 transition-colors whitespace-nowrap"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-gray-600">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span>Mostrar:</span>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="bg-gray-100 border border-gray-300 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-red cursor-pointer"
            >
              <option value={10}>10 por pág.</option>
              <option value={20}>20 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
            </select>
          </div>
          <span className="text-gray-500 font-medium">
            Mostrando <strong className="text-gray-900">{startIndex} - {endIndex}</strong> de <strong className="text-gray-900">{totalProductsCount}</strong> productos
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center space-x-1.5 flex-wrap justify-end">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all cursor-pointer flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              <span>Anterior</span>
            </button>

            {getPageNumbers().map((page, idx) => (
              <button
                key={idx}
                onClick={() => typeof page === 'number' && setCurrentPage(page)}
                disabled={page === '...'}
                className={`w-8 h-8 rounded-xl font-black transition-all flex items-center justify-center cursor-pointer ${
                  page === currentPage
                    ? 'bg-brand-red text-white shadow-md'
                    : page === '...'
                    ? 'bg-transparent text-gray-400 cursor-default'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all cursor-pointer flex items-center"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        )}
      </div>
      <ProductFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        product={selectedProduct}
        categories={categories}
        brands={brands}
        onSaveSuccess={() => {
          fetchProducts();
          fetchStatusCounts();
        }}
      />
    </div>
  );
}
