import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Scale, Star, ShieldCheck, Truck, RefreshCw, CheckCircle, Plus, Minus, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useCompareStore } from '../store/useCompareStore';
import ProductCard from '../components/ProductCard';
import axiosClient from '../api/axiosClient';

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
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
          const primaryImg = res.data.product.images?.find((img) => img.is_primary)?.image_url || res.data.product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop';
          setSelectedImage(primaryImg);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [slug]);

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
        {/* Images Gallery */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-100 flex items-center justify-center h-64 sm:h-96 relative overflow-hidden">
            <img
              src={selectedImage}
              alt={product.name}
              className="max-h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
            />
          </div>
          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-xl p-1.5 sm:p-2 border-2 transition-all flex-shrink-0 ${
                    selectedImage === img.image_url ? 'border-brand-red scale-95 shadow' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-contain" />
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

            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
              {product.description}
            </p>

            {/* Stock Alert */}
            <div className="flex items-center text-xs sm:text-sm font-semibold text-emerald-600">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              Stock Disponible ({product.stock} unidades en almacén Lima)
            </div>
          </div>

          {/* Action Controllers */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center justify-between border border-gray-300 rounded-xl bg-gray-50 self-start sm:self-auto">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-gray-600 hover:bg-gray-200 rounded-l-xl"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 font-bold text-base text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="p-3 text-gray-600 hover:bg-gray-200 rounded-r-xl"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex space-x-2 flex-1">
                <button
                  onClick={() => addItem(product, quantity)}
                  className="flex-1 bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all text-sm sm:text-base"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Agregar al Carrito</span>
                </button>

                <button
                  onClick={() => toggleCompare(product)}
                  className={`p-3.5 rounded-xl border transition-colors flex items-center justify-center ${
                    isCompared ? 'bg-brand-blue text-white border-brand-blue' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Comparar"
                >
                  <Scale className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Trust highlights */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-brand-red" />
                <span>Envío express 24h</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-brand-blue" />
                <span>Garantía oficial 12 meses</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specifications Table */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <h3 className="text-xl font-black text-gray-900 border-b border-gray-200 pb-4">
          Especificaciones Técnicas
        </h3>
        {product.technical_specs && Object.keys(product.technical_specs).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(product.technical_specs).map(([key, val], idx) => (
              <div key={idx} className="flex justify-between py-2.5 px-4 bg-gray-50 rounded-xl text-sm border border-gray-100">
                <span className="font-bold text-gray-700">{key}:</span>
                <span className="text-gray-900 font-semibold">{val}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No hay especificaciones detalladas registradas.</p>
        )}
      </div>

      {/* Customer Reviews */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <h3 className="text-xl font-black text-gray-900 border-b border-gray-200 pb-4">
          Reseñas y Opiniones de Clientes
        </h3>

        {/* Reviews List */}
        <div className="space-y-4">
          {product.reviews && product.reviews.length > 0 ? (
            product.reviews.map((rev) => (
              <div key={rev.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-800">{rev.user?.name || 'Cliente Verificado'}</span>
                  <div className="flex text-amber-400">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{rev.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">Aún no hay opiniones para este producto. ¡Sé el primero en calificarlo!</p>
          )}
        </div>

        {/* Add Review Form */}
        <form onSubmit={handleAddReview} className="pt-4 border-t border-gray-100 space-y-4 max-w-xl">
          <h4 className="font-bold text-sm text-gray-800">Escribir una Opinión</h4>
          {reviewSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl">
              ¡Gracias! Tu reseña ha sido publicada.
            </div>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-600">Puntuación:</span>
            <select
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              className="bg-gray-100 border border-gray-300 text-xs font-bold rounded-lg px-2 py-1"
            >
              <option value={5}>⭐⭐⭐⭐⭐ (5 - Excelente)</option>
              <option value={4}>⭐⭐⭐⭐ (4 - Muy Bueno)</option>
              <option value={3}>⭐⭐⭐ (3 - Regular)</option>
              <option value={2}>⭐⭐ (2 - Malo)</option>
              <option value={1}>⭐ (1 - Muy Malo)</option>
            </select>
          </div>
          <textarea
            placeholder="Escribe tu opinión sobre el rendimiento, temperatura y calidad de empaque..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            required
            className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-red"
            rows={3}
          />
          <button
            type="submit"
            className="bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow"
          >
            Enviar Reseña
          </button>
        </form>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-2xl font-black text-gray-900">Productos Relacionados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
