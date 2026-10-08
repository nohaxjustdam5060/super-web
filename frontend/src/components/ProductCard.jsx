import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, CheckCircle, Tag } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import ProductImage from './ProductImage';

// Helper to format price with small superscript cents
const formatPriceWithSup = (amount, colorClass = "text-gray-900") => {
  const num = Number(amount) || 0;
  const intPart = Math.floor(num);
  const decPart = (num % 1).toFixed(2).slice(2);
  return (
    <span className={`inline-flex items-baseline font-black ${colorClass}`}>
      <span>S/ {intPart.toLocaleString('es-PE')}</span>
      <sup className="text-[10px] sm:text-xs ml-0.5 font-bold leading-none">{decPart}</sup>
    </span>
  );
};

export default function ProductCard({ product }) {
  const addItem = useCartStore((state) => state.addItem);

  const primaryImage = product.images?.find((img) => img.is_primary)?.image_url || product.images?.[0]?.image_url || product.image_url || null;

  const price = Number(product.price) || 0;
  const previousPrice = Number(product.previous_price) || 0;
  const hasVisualOffer = Boolean(previousPrice && previousPrice > price);
  const discountPercent = hasVisualOffer ? Math.round(((previousPrice - price) / previousPrice) * 100) : 0;

  return (
    <div className="group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-xl hover:border-brand-red/40 transition-all duration-300 flex flex-col justify-between overflow-hidden relative">
      {/* Top Badges */}
      <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 z-10 flex flex-col gap-1 sm:gap-1.5">
        {product.is_featured && (
          <span className="bg-amber-500 text-white text-[10px] sm:text-xs font-extrabold px-2 sm:px-2.5 py-0.5 rounded-md shadow">
            Destacado
          </span>
        )}
      </div>

      {/* Product Image */}
      <Link to={`/product/${product.slug}`} className="block p-3 sm:p-5 md:p-6 bg-gray-50/50 group-hover:bg-white transition-colors relative overflow-hidden">
        <div className="w-full h-36 sm:h-44 md:h-48 flex items-center justify-center">
          <ProductImage
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300"
            size="md"
          />
        </div>
      </Link>

      {/* Content Info */}
      <div className="p-3.5 sm:p-4 md:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-1.5">
            <span className="font-semibold text-brand-blue uppercase truncate">{product.brand?.name || 'SUPERLAPTOP'}</span>
            <span className="text-gray-400 hidden sm:inline">SKU: {product.sku}</span>
          </div>

          {/* Discount Badge above title (when visual offer is active) */}
          {hasVisualOffer && (
            <div className="mb-1.5 flex items-center">
              <span className="inline-flex items-center gap-1 bg-red-50 text-brand-red border border-red-200 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md shadow-2xs">
                <Tag className="w-3 h-3 text-brand-red flex-shrink-0" />
                <span>{discountPercent}% de descuento</span>
              </span>
            </div>
          )}

          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-bold text-gray-900 text-xs sm:text-sm line-clamp-2 hover:text-brand-red transition-colors mb-1.5 sm:mb-2 leading-snug">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Price & Cart CTA */}
        <div className="pt-2.5 sm:pt-3 border-t border-gray-100 mt-1 sm:mt-2">
          <div className="flex items-baseline space-x-2 mb-2 sm:mb-3 flex-wrap">
            {/* Real Selling Price (Charged in Cart & Checkout) */}
            <div className="text-base sm:text-lg lg:text-xl font-black">
              {formatPriceWithSup(price, hasVisualOffer ? "text-brand-red" : "text-gray-900")}
            </div>

            {/* Previous Strikethrough Price */}
            {hasVisualOffer && (
              <div className="text-xs sm:text-sm text-gray-400 line-through font-semibold flex items-baseline">
                <span>S/ {Math.floor(previousPrice).toLocaleString('es-PE')}</span>
                <sup className="text-[9px] sm:text-[10px] ml-0.5 leading-none">{(previousPrice % 1).toFixed(2).slice(2)}</sup>
              </div>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center text-[10px] sm:text-xs text-emerald-600 font-medium mb-2 sm:mb-3">
            <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 flex-shrink-0" />
            <span className="truncate">Stock ({product.stock})</span>
          </div>

          <button
            onClick={() => addItem(product, 1)}
            className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-bold py-2 sm:py-2.5 px-2 sm:px-4 rounded-md flex items-center justify-center space-x-1.5 sm:space-x-2 shadow-md active:scale-95 transition-all text-xs sm:text-sm cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">Agregar al Carrito</span>
          </button>
        </div>
      </div>
    </div>
  );
}
