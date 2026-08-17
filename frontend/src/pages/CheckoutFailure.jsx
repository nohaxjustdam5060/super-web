import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, ShoppingBag } from 'lucide-react';

export default function CheckoutFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-3xl border border-red-200 shadow-lg text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <XCircle className="w-12 h-12" />
        </div>
        <span className="text-xs font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full">
          Pago No Completado
        </span>
        <h1 className="text-3xl font-black text-gray-900">
          EL PAGO FUE RECHAZADO O CANCELADO
        </h1>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          No se pudo completar la transacción con Mercado Pago. Puedes reintentar con otra tarjeta o seleccionar un método alternativo como Transferencia Bancaria.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
          <button
            onClick={() => navigate('/checkout')}
            className="w-full sm:w-auto bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-8 rounded-xl shadow-lg transition-transform active:scale-95 text-sm flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar Pago</span>
          </button>
          <button
            onClick={() => navigate('/catalog')}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold py-3.5 px-8 rounded-xl text-sm flex items-center justify-center space-x-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Volver al Catálogo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
