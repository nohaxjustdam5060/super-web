import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, ShoppingBag } from 'lucide-react';

export default function CheckoutPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-3xl border border-amber-200 shadow-lg text-center space-y-6">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-12 h-12" />
        </div>
        <span className="text-xs font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full">
          Pago Pendiente de Acreditación
        </span>
        <h1 className="text-3xl font-black text-gray-900">
          TU PAGO ESTÁ EN PROCESO
        </h1>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Mercado Pago está procesando la acreditación de tu dinero (ej. pago en efectivo o transferencia). En cuanto se confirme, actualizaremos tu pedido automáticamente y emitiremos tu comprobante.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
          <button
            onClick={() => navigate('/profile')}
            className="w-full sm:w-auto bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-8 rounded-xl shadow-lg transition-transform active:scale-95 text-sm flex items-center justify-center space-x-2"
          >
            <span>Ver Mis Pedidos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/catalog')}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold py-3.5 px-8 rounded-xl text-sm flex items-center justify-center space-x-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ir al Catálogo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
