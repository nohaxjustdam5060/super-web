import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Scale, Star, ShieldCheck, Truck, RefreshCw, CheckCircle, Plus, Minus, ArrowLeft, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useCompareStore } from '../store/useCompareStore';
import ProductCard from '../components/ProductCard';
import axiosClient from '../api/axiosClient';
import { generateWhatsAppOrderUrl } from '../utils/whatsappMessage';

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const { toggleCompare, comparedProducts } = useCompareStore();

  useEffect(() => {
    setLoading(true);
    axiosClient.get(`/products/${slug}`)
      .then((res) => {
        if (res.data.success) {
          setProduct(res.data.product);
          setRelatedProducts(res.data.relatedProducts || []);
          setCurrentImageIndex(0);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [slug]);

  // Compute ordered images list (Primary image first, then ordered by 'order' field)
  const imagesList = useMemo(() => {
    if (!product) return [];
    if (product.images && product.images.length > 0) {
      return [...product.images].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.order ?? 0) - (b.order ?? 0);
      });
    }
    if (product.image_url) {
      return [{ image_url: product.image_url, is_primary: true, order: 0 }];
    }
    return [{ image_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop', is_primary: true, order: 0 }];
  }, [product]);

  const handlePrevImage = () => {
    if (imagesList.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + imagesList.length) % imagesList.length);
  };

  const handleNextImage = () => {
    if (imagesList.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % imagesList.length);
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500 font-bold">Cargando detalles del producto...</div>;
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-black text-gray-900">Producto no encontrado</h2>
        <Link to="/catalog" className="text-brand-red font-bold hover:underline">Volver al Catálogo</Link>
      </div>
    );
  }

  const isCompared = comparedProducts.some((p) => p.id === product.id);
  const hasOffer = Boolean(product.offer_price && Number(product.offer_price) < Number(product.price));
  const price = Number(product.price);
  const offerPrice = Number(product.offer_price);

  const handleAddReview = (e) => {
    e.preventDefault();
    axiosClient.post('/products/reviews', {
      product_id: product.id,
      rating: reviewRating,
      comment: reviewComment
    })
      .then(() => {
        setReviewSuccess(true);
        setReviewComment('');
      })
      .catch((err) => alert(err.response?.data?.message || 'Debes iniciar sesión para dejar una reseña'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Link to="/catalog" className="hover:text-brand-red flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Catálogo
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-800">{product.category?.name}</span>
        <span>/</span>
        <span className="text-gray-400 truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Detail Grid */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Images Gallery with Carousel Arrows */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-100 flex items-center justify-center h-64 sm:h-96 relative overflow-hidden group select-none">
            <img
              src={imagesList[currentImageIndex]?.image_url || product.image_url}
              alt={product.name}
              className="max-h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
            />

            {/* Navigation Arrows (Rendered only if imagesList > 1) */}
            {imagesList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/60 hover:bg-brand-red text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all active:scale-95 z-10 opacity-90 group-hover:opacity-100"
                  title="Imagen anterior"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/60 hover:bg-brand-red text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all active:scale-95 z-10 opacity-90 group-hover:opacity-100"
                  title="Siguiente imagen"
                  aria-label="Siguiente imagen"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Image counter indicator */}
                <span className="absolute bottom-3 right-3 bg-slate-900/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm z-10 shadow">
                  {currentImageIndex + 1} / {imagesList.length}
                </span>
              </>
            )}
          </div>

          {/* Synchronized Thumbnails */}
          {imagesList.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-xl p-1.5 sm:p-2 border-2 transition-all flex-shrink-0 relative ${
                    currentImageIndex === idx
                      ? 'border-brand-red ring-2 ring-brand-red/30 scale-105 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={img.image_url} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-contain" />
                  {img.is_primary && (
                    <span className="absolute top-1 left-1 bg-brand-red text-white text-[8px] font-black px-1 rounded shadow" title="Imagen Principal">
                      ★
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Purchase Box */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-brand-blue uppercase bg-brand-blue-light px-3 py-1 rounded-full">
                {product.brand?.name || 'SUPER Tech'}
              </span>
              <span className="text-xs text-gray-400 font-mono">SKU: {product.sku}</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Ratings */}
            <div className="flex items-center space-x-2">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-xs font-bold text-gray-600">5.0 (Calificación Excelente)</span>
            </div>

            {/* Price Box */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-wrap items-baseline gap-2 sm:gap-3">
              {hasOffer ? (
                <>
                  <span className="text-2xl sm:text-3xl font-black text-brand-red">
                    S/ {offerPrice.toFixed(2)}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-400 line-through">
                    S/ {price.toFixed(2)}
                  </span>
                  <span className="bg-brand-red text-white text-xs font-bold px-2 py-0.5 rounded">
                    AHORRAS S/ {(price - offerPrice).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-gray-900">
                  S/ {price.toFixed(2)}
                </span>
              )}
            </div>

            {/* Product Features Summary */}
            <p className="text-sm text-gray-600 leading-relaxed pt-2">
              {product.description || 'Producto tecnológico de alto rendimiento garantizado por SUPER Tech. Cuenta con garantía directa de fábrica y despacho rápido a todo el país.'}
            </p>
          </div>

          {/* Action Controls */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-gray-300 rounded-xl bg-gray-50">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2.5 text-gray-600 hover:text-brand-red transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 font-bold text-sm text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2.5 text-gray-600 hover:text-brand-red transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => addItem(product, quantity)}
                className="flex-1 bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-sm"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Agregar al Carrito</span>
              </button>

              <button
                onClick={() => toggleCompare(product)}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isCompared ? 'bg-brand-blue text-white border-brand-blue' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                title="Comparar producto"
              >
                <Scale className="w-5 h-5" />
              </button>
            </div>

            {/* Direct WhatsApp Purchase Button */}
            <a
              href={generateWhatsAppOrderUrl([{
                name: product.name,
                sku: product.sku,
                quantity,
                price: Number(product.offer_price || product.price)
              }])}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-sm"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Comprar por WhatsApp</span>
            </a>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <Truck className="w-4 h-4 text-brand-blue" />
                <span>Envío express en 24h</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Garantía Oficial 1 Año</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews & Technical Specs Tabs */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <h3 className="text-xl font-black text-gray-900 border-b border-gray-200 pb-3">
          Reseñas y Opiniones de Clientes
        </h3>

        {/* Existing Reviews */}
        <div className="space-y-4">
          {product.reviews && product.reviews.length > 0 ? (
            product.reviews.map((rev) => (
              <div key={rev.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-gray-900">{rev.user?.name || 'Cliente Verificado'}</span>
                  <div className="flex text-amber-400">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-600">{rev.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 italic">Aún no hay reseñas registradas para este producto. ¡Sé el primero en dejar una opinión!</p>
          )}
        </div>

        {/* Add Review Form */}
        <form onSubmit={handleAddReview} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 pt-4">
          <h4 className="font-bold text-xs text-gray-800">Escribir una reseña</h4>
          {reviewSuccess && (
            <div className="p-2.5 bg-emerald-100 text-emerald-800 text-xs rounded-xl font-bold">
              ¡Gracias! Tu reseña ha sido enviada para moderación.
            </div>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-700">Puntuación:</span>
            <select
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              className="bg-white border rounded-lg p-1 text-xs font-bold"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{r} Estrellas</option>
              ))}
            </select>
          </div>
          <textarea
            required
            rows={2}
            placeholder="Escribe tu opinión sobre el producto..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            className="w-full bg-white border rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-brand-red font-medium"
          />
          <button
            type="submit"
            className="bg-brand-dark hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
          >
            Enviar Reseña
          </button>
        </form>
      </div>

      {/* Related Products Carousel */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-black text-gray-900 flex items-center">
            <RefreshCw className="w-5 h-5 mr-2 text-brand-red" /> Productos Relacionados
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
