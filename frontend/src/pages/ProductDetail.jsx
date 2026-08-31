import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShoppingBag, Scale, Star, ShieldCheck, Truck, RefreshCw, CheckCircle, Plus, Minus, 
  ArrowLeft, ChevronLeft, ChevronRight, MessageSquare, Clock, XCircle, Cpu, HardDrive, 
  Database, Monitor, Layers, Wrench, FileText, Check 
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' or 'reviews'

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
          setQuantity(1);
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

  // Extract key technical specs dynamically for display
  const specsData = useMemo(() => {
    if (!product) return [];
    const specs = [];

    // 1. Processor
    let cpu = product.processor_family;
    if (!cpu) {
      const match = product.name.match(/\b(intel\s*core\s*i[3579]-?\d*|ryzen\s*[3579]-?\d*|core\s*ultra\s*[579]|athlon|pentium|celeron)\b/i);
      if (match) cpu = match[0].toUpperCase();
    }
    if (cpu) specs.push({ key: 'Procesador', val: cpu, icon: Cpu, highlight: true });

    // 2. RAM
    let ram = product.ram_gb ? `${product.ram_gb} GB` : null;
    if (!ram) {
      const match = product.name.match(/\b(\d{1,2}\s*gb)\s*(ddr[45]|ram)?\b/i);
      if (match) ram = match[0].toUpperCase();
    }
    if (ram) specs.push({ key: 'Memoria RAM', val: ram, icon: HardDrive, highlight: true });

    // 3. Storage
    let storage = null;
    if (product.storage_gb) {
      const cap = product.storage_gb >= 1024 ? `${product.storage_gb / 1024} TB` : `${product.storage_gb} GB`;
      storage = `${cap} ${product.storage_type || 'SSD'}`;
    } else {
      const match = product.name.match(/\b(\d{3,4}\s*gb|\d\s*tb)\s*(ssd|hdd|nvme|m\.2)?\b/i);
      if (match) storage = match[0].toUpperCase();
    }
    if (storage) specs.push({ key: 'Almacenamiento', val: storage, icon: Database, highlight: true });

    // 4. Screen Size / Display
    let screen = product.screen_size ? `${product.screen_size}"` : null;
    if (!screen) {
      const match = product.name.match(/\b(13\.\d"|14"|15\.6"|16"|17\.3"|fhd|wuxga|qhd|uhd|144hz|165hz)\b/i);
      if (match) screen = match[0].toUpperCase();
    }
    if (screen) specs.push({ key: 'Pantalla', val: screen, icon: Monitor, highlight: true });

    // 5. GPU / Graphics
    const gpuMatch = product.name.match(/\b(nvidia\s*geforce\s*rtx\s*\d{4}[^\s]*|rtx\s*\d{4}[^\s]*|gtx\s*\d{4}|intel\s*graphics|intel\s*iris|radeon[^\s]*)\b/i);
    if (gpuMatch) {
      specs.push({ key: 'Gráficos (GPU)', val: gpuMatch[0].toUpperCase(), icon: Wrench, highlight: false });
    }

    // General product info
    if (product.brand?.name) specs.push({ key: 'Marca', val: product.brand.name, icon: Layers, highlight: false });
    if (product.sku) specs.push({ key: 'SKU / Código', val: product.sku, icon: Layers, highlight: false });
    if (product.category?.name) specs.push({ key: 'Categoría', val: product.category.name, icon: Layers, highlight: false });
    specs.push({ key: 'Garantía Directa', val: '1 Año Oficial SUPER Tech', icon: ShieldCheck, highlight: false });
    specs.push({ key: 'Estado del Producto', val: 'Nuevo / 100% Original Sellado', icon: CheckCircle, highlight: false });

    // Parse and expand ALL attributes from technical_specs (specs_map, atributos array, or plain object)
    if (product.technical_specs) {
      let rawMap = {};

      if (typeof product.technical_specs === 'string') {
        try {
          const parsed = JSON.parse(product.technical_specs);
          rawMap = parsed.specs_map || parsed;
          if (Array.isArray(parsed.atributos)) {
            parsed.atributos.forEach((item) => {
              if (item && item.nombre && item.valor) {
                rawMap[item.nombre.trim()] = String(item.valor).trim();
              }
            });
          }
        } catch (e) {
          console.warn('Could not parse technical_specs string:', e);
        }
      } else if (typeof product.technical_specs === 'object') {
        if (product.technical_specs.specs_map && typeof product.technical_specs.specs_map === 'object') {
          rawMap = { ...product.technical_specs.specs_map };
        } else {
          rawMap = { ...product.technical_specs };
        }

        // Check if there is an 'atributos' array [{ nombre, valor }]
        if (Array.isArray(product.technical_specs.atributos)) {
          product.technical_specs.atributos.forEach((item) => {
            if (item && item.nombre && item.valor) {
              rawMap[item.nombre.trim()] = String(item.valor).trim();
            }
          });
        }
      }

      // Append all raw attributes to the specs table (filtering non-display metadata keys)
      Object.entries(rawMap).forEach(([key, val]) => {
        if (
          val &&
          typeof val === 'string' &&
          key !== 'specs_map' &&
          key !== 'atributos' &&
          key !== 'needs_review' &&
          key !== 'full_name' &&
          !specs.some((s) => s.key.toLowerCase() === key.toLowerCase())
        ) {
          specs.push({
            key: key.charAt(0).toUpperCase() + key.slice(1),
            val: val,
            icon: Layers,
            highlight: false
          });
        }
      });
    }

    return specs;
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
  const stockCount = Number(product.stock ?? 0);
  const isAvailable = stockCount > 0;

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

  const highlightedSpecs = specsData.filter(s => s.highlight);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 flex-wrap gap-y-1">
        <Link to="/catalog" className="hover:text-brand-red flex items-center transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Catálogo
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-800">{product.category?.name || 'General'}</span>
        <span>/</span>
        <span className="text-gray-400 truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Detail Grid Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Images Gallery Carousel */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-100 flex items-center justify-center h-64 sm:h-96 relative overflow-hidden group select-none">
            <img
              src={imagesList[currentImageIndex]?.image_url || product.image_url}
              alt={product.name}
              className="max-h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
            />

            {/* Carousel Navigation Arrows */}
            {imagesList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/60 hover:bg-brand-red text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all active:scale-95 z-10 opacity-90 group-hover:opacity-100 cursor-pointer"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/60 hover:bg-brand-red text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all active:scale-95 z-10 opacity-90 group-hover:opacity-100 cursor-pointer"
                  aria-label="Siguiente imagen"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Counter indicator */}
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
                  className={`w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-xl p-1.5 sm:p-2 border-2 transition-all flex-shrink-0 relative cursor-pointer ${
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

        {/* Product Purchase & Info Box */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Meta: Brand, SKU & Stock Status Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-xs font-bold text-brand-blue uppercase bg-brand-blue-light px-3 py-1 rounded-full border border-brand-blue/20">
                  {product.brand?.name || 'SUPER Tech'}
                </span>

                {/* DYNAMIC STOCK BADGE */}
                {stockCount > 3 ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Disponible en Stock ({stockCount} unids)</span>
                  </span>
                ) : stockCount > 0 ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>¡Últimas {stockCount} unidades disponibles!</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-200 shadow-sm">
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>Agotado / Sin Stock</span>
                  </span>
                )}
              </div>

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

            {/* Price Container with Offer Highlights */}
            <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-100 flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                {hasOffer ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-black text-brand-red">
                      S/ {offerPrice.toFixed(2)}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-400 line-through">
                      S/ {price.toFixed(2)}
                    </span>
                    <span className="bg-brand-red text-white text-xs font-extrabold px-2.5 py-0.5 rounded-md shadow">
                      AHORRAS S/ {(price - offerPrice).toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-gray-900">
                    S/ {price.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-gray-500 block">
                  {isAvailable ? `Disponibilidad: ${stockCount} unidades` : 'Sin unidades en almacén'}
                </span>
                <span className="text-[10px] text-emerald-600 font-extrabold flex items-center justify-end">
                  <Check className="w-3 h-3 mr-0.5" /> Entrega Inmediata
                </span>
              </div>
            </div>

            {/* Product Summary */}
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pt-1">
              {product.description || 'Producto tecnológico de alto rendimiento garantizado por SUPER Tech. Cuenta con garantía directa de fábrica y despacho rápido a todo el país.'}
            </p>
          </div>

          {/* Action Controls & Stock Validation */}
          <div className="space-y-3 sm:space-y-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-4">
              {/* Quantity Selector */}
              <div className="flex items-center border border-gray-300 rounded-xl bg-gray-50 flex-shrink-0">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={!isAvailable}
                  className="p-2 sm:p-2.5 text-gray-600 hover:text-brand-red transition-colors disabled:opacity-40 cursor-pointer"
                  aria-label="Disminuir cantidad"
                >
                  <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <span className="px-2.5 sm:px-3.5 font-extrabold text-xs sm:text-sm text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(stockCount, quantity + 1))}
                  disabled={!isAvailable || quantity >= stockCount}
                  className="p-2 sm:p-2.5 text-gray-600 hover:text-brand-red transition-colors disabled:opacity-40 cursor-pointer"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Add to Cart Button (Fluid typography and multi-line wrapping text) */}
              <button
                onClick={() => addItem(product, quantity)}
                disabled={!isAvailable}
                className={`flex-1 font-extrabold py-2.5 sm:py-3.5 px-3 sm:px-6 rounded-xl flex items-center justify-center space-x-1.5 sm:space-x-2 shadow-lg transition-transform active:scale-95 text-[11px] sm:text-xs md:text-sm text-center leading-tight whitespace-normal break-words min-h-[44px] ${
                  isAvailable
                    ? 'bg-brand-red hover:bg-brand-red-hover text-white cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                }`}
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="break-words">{isAvailable ? 'Agregar al Carrito' : 'Agotado'}</span>
              </button>

              {/* Compare Button */}
              <button
                onClick={() => toggleCompare(product)}
                className={`p-2.5 sm:p-3.5 rounded-xl border transition-colors cursor-pointer flex-shrink-0 ${
                  isCompared ? 'bg-brand-blue text-white border-brand-blue' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                title="Comparar producto"
              >
                <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Direct WhatsApp Purchase Button (Fluid typography and multi-line wrapping text) */}
            <a
              href={generateWhatsAppOrderUrl([{
                name: product.name,
                sku: product.sku,
                quantity,
                price: Number(product.offer_price || product.price)
              }])}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold py-2.5 sm:py-3.5 px-3 sm:px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-[11px] sm:text-xs md:text-sm text-center leading-tight whitespace-normal break-words min-h-[44px]"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="break-words">Consultar / Comprar por WhatsApp</span>
            </a>

            {/* Service Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-[10px] sm:text-xs pt-1">
              <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 p-2 sm:p-2.5 rounded-xl border border-gray-100 min-w-0">
                <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-blue flex-shrink-0" />
                <span className="break-words leading-tight">Envío express en 24 horas</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 p-2 sm:p-2.5 rounded-xl border border-gray-100 min-w-0">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                <span className="break-words leading-tight">Garantía Oficial SUPER Tech</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TECHNICAL SPECIFICATIONS & REVIEWS SECTION */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-6">
        {/* Navigation Tabs Header */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-6 pt-4 space-x-4">
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-4 text-sm sm:text-base font-extrabold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'specs'
                ? 'border-brand-red text-brand-red'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Especificaciones Técnicas</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 text-sm sm:text-base font-extrabold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-brand-red text-brand-red'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Reseñas y Calificaciones {product.reviews?.length ? `(${product.reviews.length})` : ''}</span>
          </button>
        </div>

        {/* TAB 1: TECHNICAL SPECIFICATIONS */}
        {activeTab === 'specs' && (
          <div className="p-6 sm:p-8 space-y-8">
            {/* High-level Feature Cards (Processor, RAM, Storage, Screen) */}
            {highlightedSpecs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  Características Destacadas
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {highlightedSpecs.map((sp, idx) => {
                    const IconComp = sp.icon;
                    return (
                      <div key={idx} className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between space-y-2 shadow-md hover:scale-102 transition-transform min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-brand-red flex items-center justify-center flex-shrink-0">
                          <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] sm:text-[10px] font-extrabold text-gray-400 uppercase block truncate">{sp.key}</span>
                          <span className="text-xs sm:text-sm font-black break-words leading-tight block">{sp.val}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Complete Specifications Key-Value Responsive Container */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-gray-900 flex items-center">
                <Layers className="w-4 h-4 mr-2 text-brand-red" /> Ficha Técnica Detallada
              </h4>

              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs w-full bg-white">
                <div className="divide-y divide-gray-100">
                  {specsData.map((item, idx) => {
                    const IconC = item.icon;
                    return (
                      <div
                        key={idx}
                        className={`p-3 sm:py-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-start transition-colors gap-1 sm:gap-4 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'
                        } hover:bg-red-50/30`}
                      >
                        {/* Property Key Label */}
                        <div className="font-bold text-gray-600 w-full sm:w-1/3 flex items-center space-x-1.5 flex-shrink-0 text-[11px] sm:text-xs md:text-sm">
                          <IconC className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-red flex-shrink-0" />
                          <span className="break-words leading-tight">{item.key}</span>
                        </div>

                        {/* Property Value (Auto-wrapping text with responsive sizing) */}
                        <div className="font-extrabold text-gray-900 w-full sm:w-2/3 break-words leading-snug text-[11px] sm:text-xs md:text-sm min-w-0 pl-5 sm:pl-0">
                          {item.val}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Full Product Description Box */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                Descripción Completa del Fabricante
              </h4>
              <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-100 text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {product.description || 'Este producto cuenta con todas las especificaciones y características oficiales homologadas por el fabricante. Para consultas técnicas avanzadas o cotizaciones corporativas, puedes comunicarte directamente con nuestro equipo de atención.'}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REVIEWS & RATING FORM */}
        {activeTab === 'reviews' && (
          <div className="p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-black text-gray-900">Opiniones de Compradores</h3>

            {/* Existing Reviews List */}
            <div className="space-y-3">
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-gray-900">{rev.user?.name || 'Cliente Verificado'}</span>
                      <div className="flex text-amber-400">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{rev.comment}</p>
                  </div>
                ))
              ) : (
                <div className="p-6 bg-gray-50 rounded-2xl text-center border border-gray-100">
                  <p className="text-xs text-gray-500 italic">Aún no hay reseñas registradas para este producto. ¡Sé el primero en dejar una opinión!</p>
                </div>
              )}
            </div>

            {/* Add Review Form */}
            <form onSubmit={handleAddReview} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-xs text-gray-900">Escribir una valoración</h4>
              {reviewSuccess && (
                <div className="p-3 bg-emerald-100 text-emerald-800 text-xs rounded-xl font-bold flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                  ¡Gracias! Tu reseña ha sido enviada para moderación.
                </div>
              )}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-gray-700">Puntuación:</span>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="bg-white border border-gray-300 rounded-lg p-1.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-brand-red"
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>{r} Estrellas</option>
                  ))}
                </select>
              </div>
              <textarea
                required
                rows={3}
                placeholder="Comparte tu experiencia con este producto..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-red font-medium text-gray-800"
              />
              <button
                type="submit"
                className="bg-brand-dark hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow"
              >
                Publicar Reseña
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Related Products Section */}
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
