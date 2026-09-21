import React, { useState, useEffect, useMemo, memo } from 'react';
import { X, Edit2, PlusCircle, Star, Trash2, UploadCloud, AlertCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient';

// Helper to find parent category ID from category_id
const findParentCatId = (catId, categoriesList) => {
  if (!catId || !categoriesList) return '';
  for (const parentCat of categoriesList) {
    if (parentCat.id === catId) {
      return parentCat.id;
    }
    const foundSub = (parentCat.subcategories || []).find((s) => s.id === catId);
    if (foundSub) {
      return parentCat.id;
    }
  }
  return '';
};

const initialFormState = {
  name: '',
  sku: '',
  price: '',
  offer_price: '',
  stock: '0',
  category_id: '',
  brand_id: '',
  description: ''
};

const ProductFormModal = memo(function ProductFormModal({
  isOpen,
  onClose,
  product = null,
  categories = [],
  brands = [],
  onSaveSuccess
}) {
  const [formData, setFormData] = useState(initialFormState);
  const [selectedParentCatId, setSelectedParentCatId] = useState('');
  const [imageItems, setImageItems] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const isEditing = Boolean(product && product.id);

  // Initialize or reset form whenever modal opens or active product changes
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      return;
    }

    if (product) {
      const parentId = findParentCatId(product.category_id, categories);
      setSelectedParentCatId(parentId);

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
    } else {
      setSelectedParentCatId('');
      setFormData(initialFormState);
      setImageItems([]);
    }
    setErrorMessage(null);
  }, [isOpen, product, categories]);

  // Memoize subcategories calculation for instant dropdown rendering
  const availableSubcategories = useMemo(() => {
    if (!selectedParentCatId) return [];
    const parentCat = categories.find((c) => c.id === selectedParentCatId);
    return parentCat?.subcategories || [];
  }, [categories, selectedParentCatId]);

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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = imageItems.length;
    const availableSlots = 3 - currentCount;

    if (availableSlots <= 0) {
      setErrorMessage('Ya has alcanzado el límite máximo de 3 imágenes por producto.');
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

    setErrorMessage(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (imageItems.length === 0) {
      setErrorMessage('Por favor agrega al menos una imagen para el producto.');
      return;
    }

    setUploadingImages(true);
    try {
      // 1. Upload new local files
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

      // 2. Map final image items with public URLs
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

      if (isEditing) {
        const res = await axiosClient.put(`/products/${product.id}`, payload);
        if (res.data.success) {
          onClose();
          if (onSaveSuccess) onSaveSuccess();
        }
      } else {
        const res = await axiosClient.post('/products', payload);
        if (res.data.success) {
          onClose();
          if (onSaveSuccess) onSaveSuccess();
        }
      }
    } catch (err) {
      console.error('[PRODUCT_SAVE_ERROR]', err);
      setErrorMessage(err.response?.data?.message || 'Error al guardar el producto. Verifica los datos ingresados.');
    } finally {
      setUploadingImages(false);
    }
  };

  if (!isOpen) return null;

  const hasSubcats = availableSubcategories.length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-100 my-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="font-black text-lg text-gray-900 flex items-center">
            {isEditing ? (
              <>
                <Edit2 className="w-5 h-5 mr-2 text-brand-red" />
                Editar Producto
              </>
            ) : (
              <>
                <PlusCircle className="w-5 h-5 mr-2 text-brand-red" />
                Agregar Nuevo Producto
              </>
            )}
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-2xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-brand-red" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Nombre del Producto</label>
            <input
              type="text"
              required
              placeholder="ej. Laptop Lenovo Legion i7 16GB SSD 512GB 15.6''"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all cursor-pointer"
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
              <select
                required={hasSubcats}
                disabled={!selectedParentCatId || !hasSubcats}
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all disabled:opacity-50 disabled:bg-gray-100 cursor-pointer"
              >
                {!selectedParentCatId ? (
                  <option value="">Elige categoría primero...</option>
                ) : !hasSubcats ? (
                  <option value={selectedParentCatId}>Sin subcategorías disponibles</option>
                ) : (
                  <>
                    <option value="">Seleccionar Subcategoría...</option>
                    {availableSubcategories.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Marca</label>
            <select
              required
              value={formData.brand_id}
              onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all cursor-pointer"
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
                        className="absolute top-1.5 left-1.5 bg-slate-900/80 hover:bg-amber-500 text-white p-1 rounded-full transition-all shadow"
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={uploadingImages}
              className="w-full bg-brand-red text-white font-extrabold py-3 rounded-xl hover:bg-brand-red-hover text-sm shadow-md transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {uploadingImages
                ? 'Subiendo imágenes y guardando...'
                : isEditing
                ? 'Guardar Cambios'
                : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default ProductFormModal;
