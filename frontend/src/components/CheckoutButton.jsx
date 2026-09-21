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
  onBeforePay = null,
  onError = null
}) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePayWithMercadoPago = async () => {
    if (disabled) return;
    setErrorMessage('');

    if (onBeforePay) {
      const canProceed = onBeforePay();
      if (!canProceed) return;
    }

    const payload = getOrderPayload ? getOrderPayload() : orderPayload;

    if (!payload && !orderId) {
      const msg = 'Error: Datos del pedido no encontrados.';
      setErrorMessage(msg);
      if (onError) onError(msg);
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
        const msg = 'No se pudo generar el enlace de pago con Mercado Pago.';
        setErrorMessage(msg);
        if (onError) onError(msg);
      }
    } catch (err) {
      console.error('❌ [CheckoutButton Error]:', err.response?.data || err.message);
      const msg = err.response?.data?.message || 'Ocurrió un error al conectar con Mercado Pago.';
      setErrorMessage(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handlePayWithMercadoPago}
        disabled={loading || disabled}
        className={`w-full bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg hover:shadow-red-600/20 transition-all active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Redirigiendo a Mercado Pago...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Pagar con Tarjeta/Yape/Mercado Pago</span>
          </>
        )}
      </button>
      {errorMessage && (
        <p className="text-xs text-red-600 font-medium text-center">{errorMessage}</p>
      )}
    </div>
  );
}
