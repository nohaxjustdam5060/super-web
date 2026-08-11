import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Package, Check, X, ToggleLeft, ToggleRight, Sparkles, Filter, Trash2, UploadCloud, Star } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Cascading Category State
  const [selectedParentCatId, setSelectedParentCatId] = useState('');

  // Multi-Image Upload State (Max 3 images)
  const [imageItems, setImageItems] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form State
  const initialFormState = {
    name: '',
    sku: '',
    price: '',
    offer_price: '',
    stock: '',
    category_id: '',
    brand_id: '',
    description: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Helper to infer parent category ID from assigned category_id
  const findParentCatId = (catId, allCategories) => {
    if (!catId || !allCategories || allCategories.length === 0) return '';
    for (const parentCat of allCategories) {
      if (parentCat.id === catId) return parentCat.id;
      if (parentCat.subcategories?.some((sub) => sub.id === catId)) {
        return parentCat.id;
      }
    }
    return '';
  };

  const fetchProducts = () => {
    setLoading(true);
    // Request include_inactive=true so admin can view and manage inactive products
    axiosClient.get('/products?limit=100&include_inactive=true')
      .then((res) => {
        if (res.data.success) {
          setProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error('[FETCH_ADMIN_PRODUCTS_ERROR]', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
    axiosClient.get('/products/categories').then((res) => setCategories(res.data.categories || []));
    axiosClient.get('/products/brands').then((res) => setBrands(res.data.brands || []));
  }, []);

  const openCreateModal = () => {
    setEditingProductId(null);
    setSelectedParentCatId('');
    setFormData(initialFormState);
    setImageItems([]);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProductId(product.id);
    
    // Infer parent category from product's assigned category_id
    const parentId = findParentCatId(product.category_id, categories);
    setSelectedParentCatId(parentId);

    // Map existing product images
    const loadedImages = (product.images || []).map((img, idx) => ({
      id: img.id || `img-${idx}`,
      previewUrl: img.image_url,
      file: null,
      is_primary: img.is_primary !== undefined ? img.is_primary : idx === 0,
      is_existing: true,
      original_url: img.image_url
    }));

    if (loadedImages.length === 0 && product.image_url) {
      loadedImages.push({
        id: 'img-0',
        previewUrl: product.image_url,
        file: null,
        is_primary: true,
        is_existing: true,
        original_url: product.image_url
      });
    }

    setImageItems(loadedImages);

    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      price: product.price ? String(product.price) : '',
      offer_price: product.offer_price ? String(product.offer_price) : '',
      stock: product.stock !== undefined ? String(product.stock) : '0',
      category_id: product.category_id || '',
      brand_id: product.brand_id || '',
      description: product.description || ''
    });
    setShowModal(true);
  };

  const handleParentCategoryChange = (parentCatId) => {
    setSelectedParentCatId(parentCatId);
    const parentCat = categories.find((c) => c.id === parentCatId);
    const subcats = parentCat?.subcategories || [];

    if (subcats.length > 0) {
      setFormData((prev) => ({ ...prev, category_id: subcats[0].id }));
    } else {
      setFormData((prev) => ({ ...prev, category_id: parentCatId }));
    }
  };

  // Image Selection Handler (Up to 3 images limit)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = imageItems.length;
    const availableSlots = 3 - currentCount;

    if (availableSlots <= 0) {
      alert('Ya has alcanzado el límite máximo de 3 imágenes por producto.');
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    const newItems = filesToAdd.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}`,
      previewUrl: URL.createObjectURL(file),
      file,
      is_primary: currentCount === 0 && idx === 0,
      is_existing: false
    }));

    setImageItems((prev) => {
      const updated = [...prev, ...newItems];
      if (!updated.some((i) => i.is_primary) && updated.length > 0) {
        updated[0].is_primary = true;
      }
      return updated;
    });

    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageItems((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (updated.length > 0 && !updated.some((i) => i.is_primary)) {
        updated[0].is_primary = true;
      }
      return updated;
    });
  };

  const handleSetPrimaryImage = (indexToPrimary) => {
    setImageItems((prev) =>
      prev.map((item, idx) => ({
        ...item,
        is_primary: idx === indexToPrimary
      }))
    );
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (imageItems.length === 0) {
      alert('Por favor agrega al menos una imagen para el producto.');
      return;
    }

    setUploadingImages(true);
    try {
      // 1. Separate new local files from existing URLs
      const newFilesToUpload = imageItems.filter((i) => i.file !== null);
      let uploadedPublicUrls = [];

      if (newFilesToUpload.length > 0) {
        const uploadFormData = new FormData();
        newFilesToUpload.forEach((item) => {
          uploadFormData.append('images', item.file);
        });

        const uploadRes = await axiosClient.post('/products/upload-images', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (uploadRes.data.success && uploadRes.data.urls) {
          uploadedPublicUrls = uploadRes.data.urls;
        }
      }

      // 2. Map final image items with public URLs and guarantee order 0 for primary image
      let newFileCounter = 0;
      const primaryIdx = imageItems.findIndex((i) => i.is_primary);
      const targetPrimaryIdx = primaryIdx >= 0 ? primaryIdx : 0;

      const finalImages = imageItems.map((item, idx) => {
        let finalUrl = item.previewUrl;
        if (item.file !== null) {
          finalUrl = uploadedPublicUrls[newFileCounter++] || item.previewUrl;
        }
        const isPrimary = idx === targetPrimaryIdx;
        return {
          url: finalUrl,
          is_primary: isPrimary,
          order: isPrimary ? 0 : (idx < targetPrimaryIdx ? idx + 1 : idx)
        };
      });

      const primaryObj = finalImages.find((i) => i.is_primary) || finalImages[0];
      const primaryUrl = primaryObj ? primaryObj.url : '';

      const payload = {
        ...formData,
        price: Number(formData.price),
        offer_price: formData.offer_price ? Number(formData.offer_price) : null,
        stock: Number(formData.stock),
        image_url: primaryUrl,
        images: finalImages
      };

      if (editingProductId) {
        // Edit Mode (PUT)
        const res = await axiosClient.put(`/products/${editingProductId}`, payload);
        if (res.data.success) {
          setShowModal(false);
          fetchProducts();
        }
      } else {
        // Create Mode (POST)
        const res = await axiosClient.post('/products', payload);
        if (res.data.success) {
          setShowModal(false);
          fetchProducts();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar el producto');
    } finally {
      setUploadingImages(false);
    }
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
    } catch (err) {
      console.error('[TOGGLE_STATUS_ERROR]', err);
      // Revert on error
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: product.is_active } : p))
      );
      alert('Error al actualizar el estado del producto');
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'active') return p.is_active === true;
    if (statusFilter === 'inactive') return p.is_active === false;
    return true;
  });

  const activeCount = products.filter((p) => p.is_active).length;
  const inactiveCount = products.filter((p) => !p.is_active).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl border border-gray-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center">
            <Package className="w-6 h-6 mr-2 text-brand-red" /> Gestión de Productos e Inventario
          </h1>
          <p className="text-xs text-gray-500">Administración de catálogo, edición de precios y control de visibilidad</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs px-5 py-3 rounded-2xl flex items-center shadow-lg transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo Producto
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Solo Activos ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'inactive'
                ? 'bg-slate-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Solo Inactivos ({inactiveCount})
          </button>
        </div>

        <span className="text-xs font-semibold text-gray-500">
          Mostrando <strong className="text-gray-900">{filteredProducts.length}</strong> productos
        </span>
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
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400 font-semibold">
                  No se encontraron productos en este filtro.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50/80 transition-colors ${!p.is_active ? 'bg-slate-50/50 opacity-80' : ''}`}>
                  <td className="p-4 flex items-center space-x-3 min-w-[220px]">
                    <img
                      src={p.images?.find((i) => i.is_primary)?.image_url || p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop'}
                      alt=""
                      className="w-10 h-10 object-contain rounded-xl bg-gray-50 p-1 border border-gray-200 flex-shrink-0"
                    />
                    <div>
                      <span className="font-bold text-gray-900 line-clamp-1 max-w-xs">{p.name}</span>
                      <span className="text-[10px] text-gray-400 block">{p.brand?.name || 'SUPER Tech'}</span>
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

      {/* Modal Form: Create / Edit Product */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900 flex items-center">
                <Edit2 className="w-5 h-5 mr-2 text-brand-red" />
                {editingProductId ? 'Editar Producto' : 'Agregar Nuevo Producto'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Laptop Lenovo Legion i7 16GB SSD 512GB 15.6''"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-50 border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    placeholder="SKU-102030"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-gray-50 border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-gray-50 border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-brand-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Precio Normal (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="2999.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-gray-50 border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Precio Oferta (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="2799.00"
                    value={formData.offer_price}
                    onChange={(e) => setFormData({ ...formData, offer_price: e.target.value })}
                    className="w-full bg-gray-50 border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-brand-red"
                  />
                </div>
              </div>

              {/* Cascading Category Dropdowns */}
              <div className="grid grid-cols-2 gap-2">
                {/* Dropdown 1: Categoría Principal */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categoría Principal</label>
                  <select
                    required
                    value={selectedParentCatId}
                    onChange={(e) => handleParentCategoryChange(e.target.value)}
                    className="w-full bg-gray-50 border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-brand-red"
                  >
                    <option value="">Seleccionar Categoría...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Dropdown 2: Subcategoría Específica */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Subcategoría Específica</label>
                  {(() => {
                    const currentParent = categories.find((c) => c.id === selectedParentCatId);
                    const subcats = currentParent?.subcategories || [];
                    const hasSubcats = subcats.length > 0;

                    return (
                      <select
                        required={hasSubcats}
                        disabled={!selectedParentCatId || !hasSubcats}
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        className="w-full bg-gray-50 border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-brand-red disabled:opacity-50 disabled:bg-gray-100"
                      >
                        {!selectedParentCatId ? (
                          <option value="">Elige categoría primero...</option>
                        ) : !hasSubcats ? (
                          <option value={selectedParentCatId}>Sin subcategorías disponibles</option>
                        ) : (
                          <>
                            <option value="">Seleccionar Subcategoría...</option>
                            {subcats.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </>
                        )}
                      </select>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Marca</label>
                <select
                  required
                  value={formData.brand_id}
                  onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                  className="w-full bg-gray-50 border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-brand-red"
                >
                  <option value="">Seleccionar Marca...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Multi-Image Upload Component (Max 3 Images) */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block font-bold text-gray-800">Imágenes del Producto (Máximo 3)</label>
                  <span className="text-[11px] font-extrabold text-brand-blue">
                    {imageItems.length}/3 agregadas
                  </span>
                </div>

                {/* Thumbnails Grid */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {imageItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`relative bg-white border-2 rounded-2xl p-2 flex flex-col items-center justify-between transition-all ${
                        item.is_primary
                          ? 'border-brand-red ring-4 ring-brand-red/15 shadow-md scale-[1.02]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="relative w-full h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center group">
                        <img
                          src={item.previewUrl}
                          alt={`Vista previa ${idx + 1}`}
                          className="w-full h-full object-contain p-1"
                        />
                        {item.is_primary ? (
                          <span className="absolute top-1.5 left-1.5 bg-brand-red text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                            <span>Principal</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(idx)}
                            className="absolute top-1.5 left-1.5 bg-slate-900/70 hover:bg-amber-500 text-white p-1 rounded-full backdrop-blur-sm transition-all shadow"
                            title="Marcar como imagen principal"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1.5 right-1.5 bg-slate-900/80 hover:bg-red-600 text-white p-1 rounded-full opacity-90 transition-colors shadow"
                          title="Quitar imagen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-full pt-2">
                        {item.is_primary ? (
                          <div className="w-full py-1 text-[10px] font-black text-brand-red bg-red-50 rounded-xl border border-red-200 flex items-center justify-center space-x-1 shadow-sm">
                            <Star className="w-3 h-3 fill-brand-red" />
                            <span>Principal</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(idx)}
                            className="w-full py-1 text-[10px] font-bold text-gray-600 hover:text-brand-red bg-gray-50 hover:bg-red-50 rounded-xl border border-gray-200 hover:border-red-200 transition-all flex items-center justify-center space-x-1"
                          >
                            <Star className="w-3 h-3 text-gray-400" />
                            <span>Hacer Principal</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Upload Trigger Slot */}
                  {imageItems.length < 3 && (
                    <label className="border-2 border-dashed border-gray-300 hover:border-brand-red bg-white hover:bg-red-50/20 rounded-2xl h-32 flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center shadow-sm">
                      <UploadCloud className="w-6 h-6 text-brand-red mb-1 animate-pulse" />
                      <span className="text-[11px] font-bold text-gray-800">Subir Imagen</span>
                      <span className="text-[9px] text-gray-400">JPG, PNG, WEBP (Máx 5MB)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple={imageItems.length < 2}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {imageItems.length >= 3 && (
                  <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 p-2 rounded-xl border border-amber-200 text-center">
                    Límite máximo de 3 imágenes alcanzado para este producto.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  placeholder="Descripción detallada del producto..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-50 border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploadingImages}
                  className="w-full bg-brand-red text-white font-extrabold py-3 rounded-xl hover:bg-brand-red-hover text-sm shadow-md transition-transform active:scale-95 disabled:opacity-50"
                >
                  {uploadingImages
                    ? 'Subiendo imágenes...'
                    : editingProductId
                    ? 'Guardar Cambios'
                    : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
