import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Scale, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useCompareStore } from '../store/useCompareStore';

export default function ProductCard({ product }) {
  const addItem = useCartStore((state) => state.addItem);
  const { toggleCompare, comparedProducts } = useCompareStore();

  const isCompared = comparedProducts.some((p) => p.id === product.id);
  const primaryImage = product.images?.find((img) => img.is_primary)?.image_url || product.images?.[0]?.image_url || product.image_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop';
  const hasOffer = Boolean(product.offer_price && Number(product.offer_price) < Number(product.price));

  const price = Number(product.price);
  const offerPrice = Number(product.offer_price);
  const discountPercent = hasOffer ? Math.round(((price - offerPrice) / price) * 100) : 0;

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-brand-red/40 transition-all duration-300 flex flex-col justify-between overflow-hidden relative">
      {/* Top Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {hasOffer && (
          <span className="bg-brand-red text-white text-xs font-black px-2.5 py-1 rounded-md shadow-md animate-pulse">
            -{discountPercent}% OFF
          </span>
        )}
        {product.is_featured && (
          <span className="bg-amber-500 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-md shadow">
            Destacado
          </span>
        )}
      </div>

      {/* Compare Button */}
      <button
        onClick={() => toggleCompare(product)}
        title={isCompared ? "Quitar de comparación" : "Comparar producto"}
        className={`absolute top-3 right-3 z-10 p-2 rounded-full shadow-md backdrop-blur-md transition-colors ${
          isCompared ? 'bg-brand-blue text-white' : 'bg-white/80 text-gray-600 hover:text-brand-blue'
        }`}
      >
        <Scale className="w-4 h-4" />
      </button>

      {/* Product Image */}
      <Link to={`/product/${product.slug}`} className="block p-6 bg-gray-50/50 group-hover:bg-white transition-colors relative overflow-hidden">
        <img
          src={primaryImage}
          alt={product.name}
          className="w-full h-48 object-contain object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </Link>

      {/* Content Info */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span className="font-semibold text-brand-blue uppercase">{product.brand?.name || 'SUPER Tech'}</span>
            <span className="text-gray-400">SKU: {product.sku}</span>
          </div>

          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-bold text-gray-900 text-sm line-clamp-2 hover:text-brand-red transition-colors mb-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center space-x-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-xs font-semibold text-gray-500 ml-1">(5.0)</span>
          </div>
        </div>

        {/* Price & Cart CTA */}
        <div className="pt-3 border-t border-gray-100 mt-2">
          <div className="flex items-baseline space-x-2 mb-3">
            {hasOffer ? (
              <>
                <span className="text-xl font-black text-brand-red">
                  S/ {offerPrice.toFixed(2)}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  S/ {price.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-xl font-black text-gray-900">
                S/ {price.toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center text-xs text-emerald-600 font-medium mb-3">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Stock Disponible ({product.stock} unids)
          </div>

          <button
            onClick={() => addItem(product, 1)}
            className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Agregar al Carrito</span>
          </button>
        </div>
      </div>
    </div>
  );
}
