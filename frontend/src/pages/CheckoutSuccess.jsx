import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, Clock, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import axiosClient from '../api/axiosClient';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clearCart = useCartStore((state) => state.clearCart);

  const orderId = searchParams.get('order_id');
  const collectionStatus = searchParams.get('collection_status');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // Verify real order status from backend (updated by Mercado Pago Webhook)
    axiosClient.get(`/orders/${orderId}`)
      .then((res) => {
        if (res.data.success && res.data.order) {
          const fetchedOrder = res.data.order;
          setOrder(fetchedOrder);

          // Clear cart only if order is verified as paid or in review
          if (fetchedOrder.status === 'paid' || fetchedOrder.status === 'payment_review' || collectionStatus === 'approved') {
            clearCart();
          }
        }
      })
      .catch((err) => {
        console.error('[CheckoutSuccess Error]:', err);
        setError('No se pudo verificar el estado de la orden. Por favor revisa tu perfil.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId, collectionStatus, clearCart]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-brand-red" />
        <h2 className="text-xl font-bold text-gray-900">Verificando el estado de tu pago con Mercado Pago...</h2>
        <p className="text-sm text-gray-500">Estamos confirmando la transacción y generando tu comprobante.</p>
      </div>
    );
  }

  const isPaid = order?.status === 'paid' || collectionStatus === 'approved';
  const isReview = order?.status === 'payment_review';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg text-center space-y-6">
        {isPaid ? (
          <>
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
              Pago Acreditado
            </span>
            <h1 className="text-3xl font-black text-gray-900">
              ¡PAGO CONFIRMADO Y PEDIDO REGISTRADO!
            </h1>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Tu compra ha sido verificada en tiempo real. Hemos recibido tu pago y estamos preparando el envío de tu paquete.
            </p>
          </>
        ) : isReview ? (
          <>
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-12 h-12" />
            </div>
            <span className="text-xs font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full">
              En Revisión
            </span>
            <h1 className="text-3xl font-black text-gray-900">
              PAGO EN PROCESO DE VERIFICACIÓN
            </h1>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Mercado Pago está acreditando tu transacción. Recibirás una notificación y tu comprobante electrónico en cuanto sea confirmado.
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <ShoppingBag className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-gray-900">
              PEDIDO REGISTRADO
            </h1>
          </>
        )}

        {order && (
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-left space-y-3 text-sm max-w-xl mx-auto">
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500 font-medium">Número de Orden:</span>
              <span className="font-extrabold text-gray-900">#{order.order_number}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500 font-medium">Monto Total:</span>
              <span className="font-black text-brand-red text-base">S/ {Number(order.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500 font-medium">Método de Envío:</span>
              <span className="font-bold text-gray-800">{order.shipping_method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Comprobante Solicitarlo:</span>
              <span className="font-bold uppercase text-brand-blue">
                {order.invoice_info?.invoice_type === 'factura' ? 'Factura Electrónica' : 'Boleta de Venta'}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
          <button
            onClick={() => navigate('/profile')}
            className="w-full sm:w-auto bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-8 rounded-xl shadow-lg transition-transform active:scale-95 text-sm flex items-center justify-center space-x-2"
          >
            <span>Ver Estado de Mis Pedidos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/catalog')}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold py-3.5 px-8 rounded-xl text-sm"
          >
            Seguir Comprando
          </button>
        </div>
      </div>
    </div>
  );
}
