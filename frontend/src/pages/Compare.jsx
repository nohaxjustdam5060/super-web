import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCompareStore } from '../store/useCompareStore';
import { useCartStore } from '../store/useCartStore';

export default function Compare() {
  const { comparedProducts, clearCompare, toggleCompare } = useCompareStore();
  const addItem = useCartStore((state) => state.addItem);

  if (comparedProducts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <Scale className="w-16 h-16 mx-auto text-gray-300 stroke-1" />
        <h2 className="text-2xl font-black text-gray-900">No hay productos en comparación</h2>
        <p className="text-gray-500 text-sm">Selecciona productos desde el catálogo para comparar sus especificaciones frente a frente.</p>
        <Link to="/catalog" className="inline-block bg-brand-red text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-brand-red-hover">
          Ir al Catálogo
        </Link>
      </div>
    );
  }

  // Aggregate all unique spec keys
  const allSpecKeys = Array.from(
    new Set(comparedProducts.flatMap((p) => Object.keys(p.technical_specs || {})))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center">
            <Scale className="w-6 h-6 mr-2 text-brand-red" /> Comparador de Componentes
          </h1>
          <p className="text-xs text-gray-500">Matriz de comparación de especificaciones técnicas</p>
        </div>
        <button
          onClick={clearCompare}
          className="text-xs font-bold text-red-600 hover:underline flex items-center"
        >
          <Trash2 className="w-4 h-4 mr-1" /> Limpiar todo
        </button>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 text-xs font-black uppercase text-gray-400 w-1/4">Característica</th>
              {comparedProducts.map((p) => (
                <th key={p.id} className="p-4 text-center border-l border-gray-200 relative">
                  <button
                    onClick={() => toggleCompare(p)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <img
                    src={p.images?.find((i) => i.is_primary)?.image_url || p.images?.[0]?.image_url || p.image_url}
                    alt=""
                    className="w-24 h-24 object-contain mx-auto mb-2"
                  />
                  <h4 className="font-bold text-xs text-gray-900 line-clamp-2">{p.name}</h4>
                  <p className="text-sm font-black text-brand-red mt-1">S/ {Number(p.offer_price || p.price).toFixed(2)}</p>
                  <button
                    onClick={() => addItem(p, 1)}
                    className="mt-2 bg-brand-red text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1 mx-auto hover:bg-brand-red-hover"
                  >
                    <ShoppingBag className="w-3 h-3" /> <span>Agregar</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs text-gray-800 font-semibold">
            <tr>
              <td className="p-4 font-bold text-gray-500 bg-gray-50/50">Marca</td>
              {comparedProducts.map((p) => (
                <td key={p.id} className="p-4 text-center border-l border-gray-200">{p.brand?.name || 'SUPER'}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-bold text-gray-500 bg-gray-50/50">SKU</td>
              {comparedProducts.map((p) => (
                <td key={p.id} className="p-4 text-center border-l border-gray-200 font-mono">{p.sku}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-bold text-gray-500 bg-gray-50/50">Stock</td>
              {comparedProducts.map((p) => (
                <td key={p.id} className="p-4 text-center border-l border-gray-200 text-emerald-600 font-bold">{p.stock} unids</td>
              ))}
            </tr>
            {allSpecKeys.map((key, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                <td className="p-4 font-bold text-gray-500 bg-gray-50/50">{key}</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-4 text-center border-l border-gray-200">
                    {p.technical_specs?.[key] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
