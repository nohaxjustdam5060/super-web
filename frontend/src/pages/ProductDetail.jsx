import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShoppingBag, ShieldCheck, Truck, RefreshCw, CheckCircle, Plus, Minus, 
  ArrowLeft, ChevronLeft, ChevronRight, MessageSquare, Clock, XCircle, Cpu, HardDrive, 
  Database, Monitor, Layers, Wrench, FileText, Check 
} from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import axiosClient from '../api/axiosClient';
import { generateWhatsAppOrderUrl } from '../utils/whatsappMessage';

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  const addItem = useCartStore((state) => state.addItem);

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
      const validImages = product.images.filter((img) => img?.image_url && typeof img.image_url === 'string' && img.image_url.trim() !== '');
      if (validImages.length > 0) {
        return [...validImages].sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.order ?? 0) - (b.order ?? 0);
        });
      }
    }
    if (product.image_url && typeof product.image_url === 'string' && product.image_url.trim() !== '') {
      return [{ image_url: product.image_url, is_primary: true, order: 0 }];
    }
    return [];
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
    specs.push({ key: 'Garantía Directa', val: '1 Año Oficial SUPERLAPTOP', icon: ShieldCheck, highlight: false });
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
    return <div className="max-w-[1440px] mx-auto px-4 py-16 text-center text-gray-500 font-bold">Cargando detalles del producto...</div>;
  }

  if (!product) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-black text-gray-900">Producto no encontrado</h2>
        <Link to="/catalog" className="text-brand-red font-bold hover:underline">Volver al Catálogo</Link>
      </div>
    );
  }

  const hasOffer = Boolean(product.offer_price && Number(product.offer_price) < Number(product.price));
  const price = Number(product.price);
  const offerPrice = Number(product.offer_price);
  const stockCount = Number(product.stock ?? 0);
  const isAvailable = stockCount > 0;

  const highlightedSpecs = specsData.filter(s => s.highlight);

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8 space-y-10">
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
      <div className="bg-white p-6 sm:p-8 rounded-lg border border-gray-200 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Images Gallery Carousel */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-100 flex items-center justify-center h-64 sm:h-96 relative overflow-hidden group select-none">
            <div className="w-full h-full flex items-center justify-center">
              <ProductImage
                src={imagesList[currentImageIndex]?.image_url || product.image_url || null}
                alt={product.name}
                className="max-h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
                size="lg"
              />
            </div>

            {/* Carousel Navigation Arrows */}
            {imagesList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-slate-900/60 hover:bg-brand-red text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all active:scale-95 z-10 opacity-90 group-hover:opacity-100 cursor-pointer"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-slate-900/60 hover:bg-brand-red text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all active:scale-95 z-10 opacity-90 group-hover:opacity-100 cursor-pointer"
                  aria-label="Siguiente imagen"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Counter indicator */}
                <span className="absolute bottom-3 right-3 bg-slate-900/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-md backdrop-blur-sm z-10 shadow">
                  {currentImageIndex + 1} / {imagesList.length}
                </span>
              </>
            )}
          </div>

          {/* Synchronized Thumbnails */}
          {imagesList.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto pb-2 pt-1 px-1 scrollbar-none">
              {imagesList.map((img, idx) => {
                const isActive = currentImageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex items-center justify-center p-1 bg-white transition-all cursor-pointer relative flex-shrink-0 ${
                      isActive
                        ? 'border border-transparent ring-2 ring-red-600 shadow-sm scale-102 opacity-100 z-10'
                        : 'border border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                    }`}
                    title={`Ver imagen ${idx + 1}`}
                  >
                    <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-md">
                      <ProductImage
                        src={img.image_url}
                        alt={`Miniatura ${idx + 1}`}
                        className="w-full h-full object-contain"
                        size="xs"
                        showText={false}
                      />
                    </div>
                    {img.is_primary && (
                      <span
                        className="absolute top-1 left-1 w-3.5 h-3.5 bg-red-600 text-white rounded-full flex items-center justify-center p-0.5 text-[9px] z-10 shadow-xs leading-none font-bold pointer-events-none"
                        title="Imagen Principal"
                      >
                        ★
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Purchase & Info Box */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Meta: Brand, SKU & Stock Status Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-xs font-bold text-brand-blue uppercase bg-brand-blue-light px-3 py-1 rounded-md border border-brand-blue/20">
                  {product.brand?.name || 'SUPERLAPTOP'}
                </span>

                {/* DYNAMIC STOCK BADGE */}
                {stockCount > 3 ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Disponible en Stock ({stockCount} unids)</span>
                  </span>
                ) : stockCount > 0 ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>¡Últimas {stockCount} unidades disponibles!</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-extrabold bg-red-100 text-red-800 border border-red-200 shadow-sm">
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

            {/* Price Container with Offer Highlights */}
            <div className="bg-gray-50 p-4 sm:p-5 rounded-lg border border-gray-100 flex flex-wrap items-baseline justify-between gap-3">
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

            {/* Compact Highlighted Specs Mini-Cards */}
            {highlightedSpecs.length > 0 && (
              <div className="pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                  {highlightedSpecs.map((sp, idx) => {
                    const IconComp = sp.icon;
                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200/90 rounded-lg p-2 sm:p-2.5 flex items-center space-x-2 min-w-0 shadow-2xs hover:border-brand-red/30 transition-colors"
                      >
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-brand-red/10 text-brand-red flex items-center justify-center flex-shrink-0">
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider block truncate leading-none mb-0.5">
                            {sp.key}
                          </span>
                          <span className="text-[11px] sm:text-xs font-extrabold text-gray-900 block truncate leading-tight">
                            {sp.val}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Controls & Stock Validation */}
          <div className="space-y-3 sm:space-y-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-4">
              {/* Quantity Selector */}
              <div className="flex items-center border border-gray-300 rounded-md bg-gray-50 flex-shrink-0">
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
                className={`flex-1 font-extrabold py-2.5 sm:py-3.5 px-3 sm:px-6 rounded-md flex items-center justify-center space-x-1.5 sm:space-x-2 shadow-lg transition-transform active:scale-95 text-[11px] sm:text-xs md:text-sm text-center leading-tight whitespace-normal break-words min-h-[44px] ${
                  isAvailable
                    ? 'bg-brand-red hover:bg-brand-red-hover text-white cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                }`}
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="break-words">{isAvailable ? 'Agregar al Carrito' : 'Agotado'}</span>
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
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold py-2.5 sm:py-3.5 px-3 sm:px-6 rounded-md flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-[11px] sm:text-xs md:text-sm text-center leading-tight whitespace-normal break-words min-h-[44px]"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="break-words">Consultar / Comprar por WhatsApp</span>
            </a>

            {/* Service Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-[10px] sm:text-xs pt-1">
              <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 p-2 sm:p-2.5 rounded-md border border-gray-100 min-w-0">
                <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-blue flex-shrink-0" />
                <span className="break-words leading-tight">Envío express en 24 horas</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 p-2 sm:p-2.5 rounded-md border border-gray-100 min-w-0">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                <span className="break-words leading-tight">Garantía Oficial SUPERLAPTOP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TECHNICAL SPECIFICATIONS SECTION */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/80 px-6 py-4 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-brand-red" />
          <h3 className="text-base sm:text-lg font-extrabold text-gray-900">Especificaciones Técnicas</h3>
        </div>

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
                    <div key={idx} className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-md flex flex-col justify-between space-y-2 shadow-md hover:scale-102 transition-transform min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-brand-red flex items-center justify-center flex-shrink-0">
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

            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-xs w-full bg-white">
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

          
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-black text-gray-900 flex items-center">
            <RefreshCw className="w-5 h-5 mr-2 text-brand-red" /> Productos Relacionados
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
