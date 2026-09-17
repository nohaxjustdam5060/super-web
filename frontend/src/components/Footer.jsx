import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, CreditCard, RefreshCw, Mail, Phone, MapPin, BookOpen } from 'lucide-react';
import PaymentBadges from './PaymentBadges';

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-gray-300 border-t border-gray-800 pt-12 pb-8">
      {/* Features Bar */}
      <div className="max-w-[1440px] mx-auto px-4 pb-10 border-b border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center space-x-3.5 bg-gray-900/60 p-4 rounded-xl border border-gray-800/80 hover:border-gray-700/80 transition-all duration-200">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex-shrink-0 flex items-center justify-center">
            <Truck className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm">Envíos a Todo el Perú</h4>
            <p className="text-sm text-gray-400">Despacho express a Lima y provincias</p>
          </div>
        </div>
        <div className="flex items-center space-x-3.5 bg-gray-900/60 p-4 rounded-xl border border-gray-800/80 hover:border-gray-700/80 transition-all duration-200">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex-shrink-0 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm">Garantía 100% Oficial</h4>
            <p className="text-sm text-gray-400">Productos con sello de fabricante</p>
          </div>
        </div>
        <div className="flex items-center space-x-3.5 bg-gray-900/60 p-4 rounded-xl border border-gray-800/80 hover:border-gray-700/80 transition-all duration-200">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex-shrink-0 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm">Mercado Pago Seguro</h4>
            <p className="text-sm text-gray-400">Tarjetas de crédito/débito y cuotas</p>
          </div>
        </div>
        <div className="flex items-center space-x-3.5 bg-gray-900/60 p-4 rounded-xl border border-gray-800/80 hover:border-gray-700/80 transition-all duration-200">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex-shrink-0 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm">Soporte Especializado</h4>
            <p className="text-sm text-gray-400">Asesoría por WhatsApp</p>
          </div>
        </div>
      </div>

      {/* Main Footer Links (5 Balanced Columns) */}
      <div className="max-w-[1440px] mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Col 1: Brand Info */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="bg-brand-red text-white px-2 py-1 rounded-md font-black tracking-widest text-lg">
              SUPER
            </div>
            <span className="text-lg font-extrabold text-white">
              LAPTOP<span className="text-brand-red">.</span>
            </span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            Tu tienda de confianza en hardware y componentes de alto rendimiento. Las mejores marcas del mundo al mejor precio.
          </p>
          <div className="space-y-2 text-sm text-gray-400">
            <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-brand-red-accent flex-shrink-0" /> Jr.Velarde 172, Lima</p>
            <p className="flex items-center"><Phone className="w-4 h-4 mr-2 text-brand-red-accent flex-shrink-0" /> +51 933 347 488</p>
            <p className="flex items-center"><Mail className="w-4 h-4 mr-2 text-brand-red-accent flex-shrink-0" /> ventas@superlaptop.pe</p>
          </div>
        </div>

        {/* Col 2: Categorías Principales */}
        <div>
          <h4 className="text-white font-bold text-base mb-4 border-b border-brand-red inline-block pb-1">Categorías Principales</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/catalog?category_id=laptops" className="hover:text-brand-red-accent transition-colors">Laptops</Link></li>
            <li><Link to="/catalog?category_id=computadoras-y-componentes" className="hover:text-brand-red-accent transition-colors">Computadoras y Componentes</Link></li>
            <li><Link to="/catalog?category_id=moviles-y-wearables" className="hover:text-brand-red-accent transition-colors">Móviles y Wearables</Link></li>
            <li><Link to="/catalog?category_id=perifericos-y-accesorios" className="hover:text-brand-red-accent transition-colors">Periféricos y Accesorios</Link></li>
            <li><Link to="/catalog?category_id=oficina-y-software" className="hover:text-brand-red-accent transition-colors">Oficina y Software</Link></li>
            
          </ul>
        </div>

        {/* Col 3: Componentes de PC */}
        <div>
          <h4 className="text-white font-bold text-base mb-4 border-b border-brand-red-accent inline-block pb-1">Componentes de PC</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/catalog?category_id=procesadores" className="hover:text-brand-red-accent transition-colors">Procesadores</Link></li>
            <li><Link to="/catalog?category_id=tarjetas-de-video" className="hover:text-brand-red-accent transition-colors">Tarjetas de Video</Link></li>
            <li><Link to="/catalog?category_id=memorias-ram" className="hover:text-brand-red-accent transition-colors">Memorias RAM</Link></li>
            <li><Link to="/catalog?category_id=almacenamiento" className="hover:text-brand-red-accent transition-colors">Almacenamiento</Link></li>
            <li><Link to="/catalog?category_id=placas-madre" className="hover:text-brand-red-accent transition-colors">Placas Madre</Link></li>
          </ul>
        </div>

        {/* Col 4: Servicio al Cliente */}
        <div>
          <h4 className="text-white font-bold text-base mb-4 border-b border-brand-red-accent inline-block pb-1">Servicio al Cliente</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/profile" className="hover:text-white transition-colors">Estado de mi Pedido</Link></li>
            <li><Link to="/politicas?tab=envios" className="hover:text-white transition-colors">Envíos y Despacho</Link></li>
            <li><Link to="/compare" className="hover:text-white transition-colors">Comparador de Componentes</Link></li>
            <li><Link to="/libro-de-reclamaciones" className="hover:text-brand-red-accent transition-colors font-medium text-gray-200">Libro de Reclamaciones</Link></li>
            <li><Link to="/politicas?tab=terminos" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
            <li><Link to="/politicas?tab=garantia" className="hover:text-white transition-colors">Políticas de Garantía</Link></li>
            <li><Link to="/politicas?tab=devoluciones" className="hover:text-white transition-colors">Devoluciones y Cambios</Link></li>
          </ul>
        </div>

        {/* Col 5: Medios de Pago & Libro de Reclamaciones */}
        <div>
          <h4 className="text-white font-bold text-base mb-4 border-b border-brand-red-accent inline-block pb-1">Medios de Pago</h4>
          <p className="text-xs text-gray-400 mb-3">Aceptamos todas las tarjetas y pagos digitales:</p>
          <PaymentBadges />

          {/* INDECOPI Virtual Complaints Book Badge */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            <Link
              to="/libro-de-reclamaciones"
              className="group flex items-center space-x-3 bg-gray-900/90 hover:bg-gray-800/90 border border-gray-700/70 hover:border-brand-red/50 p-3 rounded-xl transition-all duration-200"
            >
              <div className="p-2 bg-brand-red/10 border border-brand-red/30 rounded-lg group-hover:scale-105 transition-transform flex-shrink-0">
                <BookOpen className="w-5 h-5 text-brand-red" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block group-hover:text-brand-red-accent transition-colors">
                  Libro de Reclamaciones
                </span>
                <span className="text-[10px] text-gray-400 block">
                  Virtual • D.S. 011-2011-PCM
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} SUPERLAPTOP. Todos los derechos reservados. Diseñado para alto rendimiento y producción.
      </div>
    </footer>
  );
}
