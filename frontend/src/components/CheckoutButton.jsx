import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function CheckoutButton({
  orderId,
  invoiceInfo,
  orderPayload = null,
  getOrderPayload = null,
  onSuccess = null,
  className = '',
  disabled = false,
  onBeforePay = null
}) {
  const [loading, setLoading] = useState(false);

  const handlePayWithMercadoPago = async () => {
    if (disabled) return;

    if (onBeforePay) {
      const canProceed = onBeforePay();
      if (!canProceed) return;
    }

    const payload = getOrderPayload ? getOrderPayload() : orderPayload;

    if (!payload && !orderId) {
      alert('Error: Datos del pedido no encontrados.');
      return;
    }

    setLoading(true);
    try {
      const body = payload
        ? { ...payload, invoice_info: payload.invoice_info || invoiceInfo }
        : { order_id: orderId, invoice_info: invoiceInfo };

      const res = await axiosClient.post('/payments/create-preference', body);

      if (res.data.success && res.data.init_point) {
        if (onSuccess && res.data.order) {
          onSuccess(res.data.order);
        }
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
      disabled={loading || disabled}
      className={`w-full bg-[#009EE3] hover:bg-[#0087C4] text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
