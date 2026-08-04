import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, getSubtotal } = useCartStore();
  const navigate = useNavigate();
  const subtotal = getSubtotal();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-2 sm:pl-10">
        <div className="w-[92vw] sm:w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 bg-brand-dark text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-brand-red-accent" />
              <h2 className="font-bold text-lg">Tu Carrito SUPER</h2>
              <span className="bg-brand-red text-white text-xs font-black px-2 py-0.5 rounded-full">
                {items.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            </div>
            <button onClick={closeCart} className="text-gray-400 hover:text-white p-1 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300 stroke-1" />
                <p className="font-semibold text-lg text-gray-700">Tu carrito está vacío</p>
                <p className="text-sm text-gray-400 mt-1">Explora nuestro catálogo de componentes informáticos.</p>
                <button
                  onClick={() => { closeCart(); navigate('/catalog'); }}
                  className="mt-6 bg-brand-red text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-brand-red-hover transition-colors"
                >
                  Ir al Catálogo
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 border border-gray-200 rounded-xl relative group">
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=150&auto=format&fit=crop'}
                    alt={item.name}
                    className="w-16 h-16 object-contain rounded-lg bg-white p-1 border border-gray-100"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-gray-900 line-clamp-2">{item.name}</h4>
                    <p className="text-xs text-brand-red font-black mt-1">
                      S/ {Number(item.price).toFixed(2)}
                    </p>
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                        <button
                          onClick={() => updateQuantity(item.product_id || item.id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-100 text-gray-600 rounded-l-lg"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-gray-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id || item.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100 text-gray-600 rounded-r-lg"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.product_id || item.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-5 border-t border-gray-200 bg-gray-50 space-y-3">
              <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                <span>Subtotal Estimado:</span>
                <span className="text-lg font-black text-gray-900">S/ {subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500">Impuestos y costo de envío express calculados en el checkout.</p>
              <button
                onClick={() => { closeCart(); navigate('/checkout'); }}
                className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-sm"
              >
                <span>Proceder al Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
