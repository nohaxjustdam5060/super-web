import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, Monitor, HardDrive, Database, Zap, Layers, ChevronRight, Flame, ArrowRight, Sparkles, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import LocationMap from '../components/LocationMap';
import axiosClient from '../api/axiosClient';

export default function Home() {
  const [newestProducts, setNewestProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingNewest, setLoadingNewest] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    // 1. Fetch 4 Newest Products
    axiosClient.get('/products?sort=newest&limit=4')
      .then((res) => {
        if (res.data.success) {
          setNewestProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error('[NEWEST_PRODUCTS_ERROR]', err))
      .finally(() => setLoadingNewest(false));

    // 2. Fetch 4 Featured Products
    axiosClient.get('/products?is_featured=true&limit=4')
      .then((res) => {
        if (res.data.success) {
          setFeaturedProducts(res.data.products || []);
        }
      })
      .catch((err) => console.error('[FEATURED_PRODUCTS_ERROR]', err))
      .finally(() => setLoadingFeatured(false));
  }, []);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Hero Banner Section */}
      <section className="relative bg-gradient-to-r from-brand-dark via-slate-900 to-brand-blue text-white overflow-hidden py-16 px-4 rounded-3xl max-w-7xl mx-auto shadow-2xl mt-6 border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/20 rounded-full blur-3xl -z-10" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center space-x-2 bg-brand-red/20 text-brand-red-accent border border-brand-red/40 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
              <Flame className="w-4 h-4 animate-bounce" />
              Nuevos Lanzamientos 2026
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none font-heading">
              POTENCIA TU RIG AL <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red-accent to-amber-400">SIGUIENTE NIVEL.</span>
            </h1>
            <p className="text-gray-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Consigue las últimas tarjetas gráficas RTX 4080/4090, procesadores AMD Ryzen 3D V-Cache y SSDs NVMe Gen 5 con garantía oficial en Perú.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/catalog"
                className="bg-brand-red hover:bg-brand-red-hover text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg hover:shadow-brand-red/40 transition-all flex items-center space-x-2 text-base active:scale-95"
              >
                <span>Explorar Catálogo</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/catalog?is_featured=true"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-6 py-3.5 rounded-2xl transition-colors text-base"
              >
                Ver Ofertas Top
              </Link>
            </div>
          </div>
          <div className="relative flex justify-center">
            <img
              src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop"
              alt="NVIDIA RTX GPU SUPER"
              className="w-full max-w-md object-contain drop-shadow-[0_20px_30px_rgba(220,38,38,0.3)] hover:scale-105 transition-transform duration-500 rounded-2xl"
            />
          </div>
        </div>
      </section>

      {/* 2. Categorías Principales */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Categorías Principales</h2>
            <p className="text-sm text-gray-500">Encuentra exactamente los componentes para tu ensamble</p>
          </div>
          <Link to="/catalog" className="text-brand-red font-bold text-sm flex items-center hover:underline">
            Ver todas <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Procesadores', slug: 'procesadores', icon: Cpu, color: 'text-blue-600 bg-blue-50' },
            { name: 'Tarjetas Video', slug: 'tarjetas-de-video', icon: Monitor, color: 'text-red-600 bg-red-50' },
            { name: 'Memorias RAM', slug: 'memorias-ram', icon: HardDrive, color: 'text-emerald-600 bg-emerald-50' },
            { name: 'Almacenamiento', slug: 'almacenamiento', icon: Database, color: 'text-purple-600 bg-purple-50' },
            { name: 'Placas Madre', slug: 'placas-madre', icon: Layers, color: 'text-amber-600 bg-amber-50' },
            { name: 'Fuentes Poder', slug: 'fuentes-de-poder', icon: Zap, color: 'text-indigo-600 bg-indigo-50' },
          ].map((cat, idx) => {
            const IconComponent = cat.icon;
            return (
              <Link
                key={idx}
                to={`/catalog?category_id=${cat.slug}`}
                className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-brand-red/40 hover:shadow-lg transition-all text-center group flex flex-col items-center justify-center space-y-3"
              >
                <div className={`p-4 rounded-2xl ${cat.color} group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-7 h-7" />
                </div>
                <span className="font-bold text-sm text-gray-800 group-hover:text-brand-red transition-colors">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Productos Destacados (limitado a 4 productos) */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center space-x-2">
              <span>Productos Destacados</span>
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            </h2>
            <p className="text-sm text-gray-500">Hardware seleccionado por rendimiento y disponibilidad inmediata</p>
          </div>
          <Link to="/catalog?is_featured=true" className="text-brand-red font-bold text-sm flex items-center hover:underline">
            Ver Todo <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse h-80 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Bloques Promocionales Grandes (2 Banners) */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Promo Banner 1: Laptops Gamer Pro */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[340px] sm:min-h-[380px] group border border-slate-800 flex flex-col justify-end p-8 text-white">
            {/* Background Image */}
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmQEtGYoAzwlm7fCZFYKq2LvhpzguxSHtacidthcUwgw&s=10"
              alt="Laptops Gamer Pro"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 -z-20"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/30 -z-10" />
            {/* Red Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red via-brand-red-accent to-transparent" />

            {/* Content */}
            <div className="space-y-3 max-w-md">
              <span className="inline-block text-[11px] font-black text-brand-red-accent uppercase tracking-widest bg-brand-red/20 border border-brand-red/30 px-3 py-1 rounded-full">
                LO MÁS NUEVO EN
              </span>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-none font-heading text-white">
                Laptops Gamer Pro
              </h3>
              <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                Potencia portátil con procesadores i7/i9/Ryzen y gráficos dedicados de última generación.
              </p>
              <div className="pt-2">
                <Link
                  to="/catalog?search=laptop"
                  className="inline-flex items-center space-x-2 bg-brand-blue-bright hover:bg-brand-blue-hover text-white font-black text-xs px-6 py-2.5 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 uppercase tracking-wider"
                >
                  <span>VER TODO</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Promo Banner 2: Workstations & All in One */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[340px] sm:min-h-[380px] group border border-slate-800 flex flex-col justify-end p-8 text-white">
            {/* Background Image */}
            <img
              src="https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=1000&auto=format&fit=crop"
              alt="Workstations & All in One"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 -z-20"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/30 -z-10" />
            {/* Red Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red-accent via-amber-400 to-transparent" />

            {/* Content */}
            <div className="space-y-3 max-w-md">
              <span className="inline-block text-[11px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full">
                EQUIPAMIENTO PROFESIONAL
              </span>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-none font-heading text-white">
                Workstations & All in One
              </h3>
              <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                Estaciones de trabajo de alto rendimiento preparadas para renderizado 3D, IA y desarrollo.
              </p>
              <div className="pt-2">
                <Link
                  to="/catalog?ram_gb=32,64"
                  className="inline-flex items-center space-x-2 bg-brand-blue-bright hover:bg-brand-blue-hover text-white font-black text-xs px-6 py-2.5 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 uppercase tracking-wider"
                >
                  <span>VER TODO</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Novedades (4 productos más nuevos) */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center space-x-2">
              <span>Novedades</span>
              <Sparkles className="w-6 h-6 text-amber-500" />
            </h2>
            <p className="text-sm text-gray-500">Productos añadidos recientemente</p>
          </div>
          <Link to="/catalog?sort=newest" className="text-brand-red font-bold text-sm flex items-center hover:underline">
            Ver Todas <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {loadingNewest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse h-80 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newestProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 6. Location Map Section */}
      <LocationMap />
    </div>
  );
}
