import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Check, X } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New Product Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    offer_price: '',
    stock: '',
    category_id: '',
    brand_id: '',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop'
  });

  const fetchProducts = () => {
    setLoading(true);
    axiosClient.get('/products?limit=50')
      .then((res) => {
        if (res.data.success) {
          setProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
    axiosClient.get('/products/categories').then((res) => setCategories(res.data.categories || []));
    axiosClient.get('/products/brands').then((res) => setBrands(res.data.brands || []));
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post('/products', {
        ...formData,
        price: Number(formData.price),
        offer_price: formData.offer_price ? Number(formData.offer_price) : null,
        stock: Number(formData.stock),
        images: [{ url: formData.image_url }]
      });

      if (res.data.success) {
        alert('¡Producto creado exitosamente!');
        setShowModal(false);
        fetchProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al crear producto');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center">
            <Package className="w-6 h-6 mr-2 text-brand-red" /> Gestión de Productos e Inventario
          </h1>
          <p className="text-xs text-gray-500">Administración de catálogo, precios y control de stock</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-brand-red hover:bg-brand-red-hover text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center shadow"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo Producto
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 font-black text-gray-400 uppercase">
              <th className="p-4">Producto</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Categoría</th>
              <th className="p-4">Precio</th>
              <th className="p-4">Oferta</th>
              <th className="p-4">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-4 flex items-center space-x-3">
                  <img
                    src={p.images?.find((i) => i.is_primary)?.image_url || p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop'}
                    alt=""
                    className="w-10 h-10 object-contain rounded bg-gray-50 p-1 border"
                  />
                  <span className="font-bold text-gray-900 line-clamp-1 max-w-xs">{p.name}</span>
                </td>
                <td className="p-4 font-mono">{p.sku}</td>
                <td className="p-4">{p.category?.name}</td>
                <td className="p-4 font-bold">S/ {Number(p.price).toFixed(2)}</td>
                <td className="p-4 text-brand-red font-black">
                  {p.offer_price ? `S/ ${Number(p.offer_price).toFixed(2)}` : '—'}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded font-black ${p.stock <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {p.stock} unids
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal New Product */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-black text-lg text-gray-900">Agregar Nuevo Producto</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-50 border rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-gray-50 border rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-gray-50 border rounded-xl p-2.5"
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
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-gray-50 border rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Precio Oferta (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.offer_price}
                    onChange={(e) => setFormData({ ...formData, offer_price: e.target.value })}
                    className="w-full bg-gray-50 border rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categoría</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-gray-50 border rounded-xl p-2.5"
                  >
                    <option value="">Seleccionar...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Marca</label>
                  <select
                    required
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                    className="w-full bg-gray-50 border rounded-xl p-2.5"
                  >
                    <option value="">Seleccionar...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">URL Imagen Principal</label>
                <input
                  type="text"
                  required
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full bg-gray-50 border rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-50 border rounded-xl p-2.5"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-red text-white font-bold py-3 rounded-xl hover:bg-brand-red-hover text-sm shadow"
              >
                Guardar Producto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
