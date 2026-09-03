import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, CreditCard, RefreshCw, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-gray-300 border-t border-gray-800 pt-12 pb-8">
      {/* Features Bar */}
      <div className="max-w-7xl mx-auto px-4 pb-10 border-b border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center space-x-3 bg-gray-900/60 p-4 rounded-md border border-gray-800">
          <Truck className="w-8 h-8 text-brand-red-accent flex-shrink-0" />
          <div>
            <h4 className="text-white font-bold text-sm">Envíos a Todo el Perú</h4>
            <p className="text-xs text-gray-400">Despacho express a Lima y provincias</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 bg-gray-900/60 p-4 rounded-md border border-gray-800">
          <ShieldCheck className="w-8 h-8 text-brand-blue-bright flex-shrink-0" />
          <div>
            <h4 className="text-white font-bold text-sm">Garantía 100% Oficial</h4>
            <p className="text-xs text-gray-400">Productos con sello de fabricante</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 bg-gray-900/60 p-4 rounded-md border border-gray-800">
          <CreditCard className="w-8 h-8 text-emerald-400 flex-shrink-0" />
          <div>
            <h4 className="text-white font-bold text-sm">Mercado Pago Seguro</h4>
            <p className="text-xs text-gray-400">Tarjetas de crédito/débito y cuotas</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 bg-gray-900/60 p-4 rounded-md border border-gray-800">
          <RefreshCw className="w-8 h-8 text-amber-400 flex-shrink-0" />
          <div>
            <h4 className="text-white font-bold text-sm">Soporte Especializado</h4>
            <p className="text-xs text-gray-400">Asesoría por WhatsApp</p>
          </div>
        </div>
      </div>

      {/* Main Footer Links (5 Balanced Columns) */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Col 1: Brand Info */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="bg-brand-red text-white px-2 py-1 rounded-md font-black tracking-widest text-lg">
              SUPER
            </div>
            <span className="text-lg font-extrabold text-white">
              TECH<span className="text-brand-red">.</span>
            </span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            Tu tienda de confianza en hardware y componentes de alto rendimiento. Las mejores marcas del mundo al mejor precio.
          </p>
          <div className="space-y-2 text-sm text-gray-400">
            <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-brand-red-accent flex-shrink-0" /> Av. Javier Prado Este 1234, Lima</p>
            <p className="flex items-center"><Phone className="w-4 h-4 mr-2 text-brand-red-accent flex-shrink-0" /> +51 933 347 488</p>
            <p className="flex items-center"><Mail className="w-4 h-4 mr-2 text-brand-red-accent flex-shrink-0" /> ventas@supertech.com</p>
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
          <h4 className="text-white font-bold text-base mb-4 border-b border-brand-blue-bright inline-block pb-1">Servicio al Cliente</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/profile" className="hover:text-white transition-colors">Estado de mi Pedido</Link></li>
            <li><Link to="/catalog" className="hover:text-white transition-colors">Guía de Compras y Armado</Link></li>
            <li><Link to="/compare" className="hover:text-white transition-colors">Comparador de Componentes</Link></li>
            <li><a href="#politicas" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
            <li><a href="#garantia" className="hover:text-white transition-colors">Políticas de Garantía</a></li>
          </ul>
        </div>

        {/* Col 5: Medios de Pago */}
        <div>
          <h4 className="text-white font-bold text-base mb-4 border-b border-emerald-400 inline-block pb-1">Medios de Pago</h4>
          <p className="text-xs text-gray-400 mb-4">Aceptamos todas las tarjetas:</p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-200">
            <span className="bg-gray-800 px-3 py-1.5 rounded-md border border-gray-700">💳 Visa</span>
            <span className="bg-gray-800 px-3 py-1.5 rounded-md border border-gray-700">💳 Mastercard</span>
            <span className="bg-gray-800 px-3 py-1.5 rounded-md border border-gray-700">💳 Diners / Amex</span>
            <span className="bg-gray-800 px-3 py-1.5 rounded-md border border-gray-700">📱 Yape / Plin</span>
            <span className="bg-gray-800 px-3 py-1.5 rounded-md border border-gray-700">🏦 PagoEfectivo</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} SUPER Tech E-commerce. Todos los derechos reservados. Diseñado para alto rendimiento y producción.
      </div>
    </footer>
  );
}
