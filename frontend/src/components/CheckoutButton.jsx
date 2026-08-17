import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function CheckoutButton({ orderId, invoiceInfo, className = '' }) {
  const [loading, setLoading] = useState(false);

  const handlePayWithMercadoPago = async () => {
    if (!orderId) {
      alert('Error: ID de la orden no encontrado.');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post('/payments/create-preference', {
        order_id: orderId,
        invoice_info: invoiceInfo
      });

      if (res.data.success && res.data.init_point) {
        // Redirect to Mercado Pago Checkout Pro hosted environment
        window.location.href = res.data.init_point;
      } else {
        alert('No se pudo generar el enlace de pago con Mercado Pago.');
      }
    } catch (err) {
      console.error('❌ [CheckoutButton Error]:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Ocurrió un error al conectar con Mercado Pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePayWithMercadoPago}
      disabled={loading}
      className={`w-full bg-[#009EE3] hover:bg-[#0087C4] text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95 text-base disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Redirigiendo a Mercado Pago...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          <span>Pagar con Mercado Pago (Checkout Pro)</span>
        </>
      )}
    </button>
  );
}
