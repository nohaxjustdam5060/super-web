import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Truck, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import MercadoPagoBrick from '../components/MercadoPagoBrick';
import axiosClient from '../api/axiosClient';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Address Form - Persisted in localStorage
  const [shippingAddress, setShippingAddress] = useState(() => {
    try {
      const saved = localStorage.getItem('super_shipping_address');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      recipient_name: user?.name || '',
      phone: user?.phone || '+51 999 888 777',
      address_line1: 'Av. Javier Prado 1234',
      address_line2: 'Dpto 402',
      city: 'Lima',
      state: 'Lima',
      postal_code: '15023'
    };
  });

  useEffect(() => {
    if (user) {
      setShippingAddress((prev) => ({
        ...prev,
        recipient_name: prev.recipient_name || user.name || '',
        phone: prev.phone && prev.phone !== '+51 999 888 777' ? prev.phone : (user.phone || '+51 999 888 777')
      }));
    }
  }, [user]);

  useEffect(() => {
    if (shippingAddress) {
      localStorage.setItem('super_shipping_address', JSON.stringify(shippingAddress));
    }
  }, [shippingAddress]);

  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  const subtotal = getSubtotal();
  const shippingCost = 15.00;
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  if (items.length === 0 && !createdOrder) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-black text-gray-900">No hay productos para procesar</h2>
        <button onClick={() => navigate('/catalog')} className="bg-brand-red text-white font-bold px-6 py-2.5 rounded-xl text-sm">
          Ir al Catálogo
        </button>
      </div>
    );
  }

  // Unauthenticated User Banner / Guard Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-gray-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-brand-red/10 text-brand-red rounded-3xl flex items-center justify-center mx-auto border border-brand-red/20 shadow-sm">
            <ShieldCheck className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black text-brand-red uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100">
              Paso Requerido
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 pt-1">
              Inicia sesión para continuar con tu compra
            </h2>
            <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
              Para asegurar tu pedido, emitir tu comprobante y poder realizar el seguimiento de tu envío en <strong>SUPER Tech</strong>, necesitas contar con una cuenta activa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-md mx-auto">
            <button
              onClick={() => navigate('/login', { state: { from: '/checkout' } })}
              className="bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-sm"
            >
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/register', { state: { from: '/checkout' } })}
              className="bg-brand-dark hover:bg-slate-800 text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 border border-slate-700 shadow transition-transform active:scale-95 text-sm"
            >
              <span>Crear Cuenta</span>
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
            🔒 Tu carrito de compras con ({items.length}) producto(s) permanecerá guardado.
          </div>
        </div>
      </div>
    );
  }

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'SUPERTECH10') {
      const disc = (subtotal * 10) / 100;
      setDiscountAmount(disc);
      alert('¡Cupon SUPERTECH10 aplicado! 10% de descuento.');
    } else {
      alert('Cupón no válido');
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    setLoading(true);
    try {
      const res = await axiosClient.post('/orders', {
        items,
        shipping_address: shippingAddress,
        shipping_method: 'Envío Express a Domicilio',
        coupon_code: couponCode || null
      });

      if (res.data.success) {
        setCreatedOrder(res.data.order);
        setStep(2); // Proceed to Mercado Pago Brick Payment Step
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al generar la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMercadoPago = async (paymentData) => {
    console.log('👉 [LOG PASO 2 - FRONTEND ENVÍA PETICIÓN AL BACKEND]:', {
      endpoint: '/payments/process',
      order_id: createdOrder?.id,
      paymentDataPayload: paymentData
    });

    try {
      const res = await axiosClient.post('/payments/process', {
        order_id: createdOrder.id,
        formData: paymentData,
        token: paymentData?.token,
        payment_method_id: paymentData?.payment_method_id,
        installments: paymentData?.installments,
        issuer_id: paymentData?.issuer_id,
        payer: paymentData?.payer
      });

      console.log('✅ [LOG PASO 2 - RESPUESTA RECIBIDA EN FRONTEND]:', res.data);

      if (res.data.success) {
        setPaymentSuccess(true);
        clearCart();
      }
    } catch (err) {
      console.error('❌ [Error al procesar pago en Checkout]:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Ocurrió un inconveniente al procesar el pago con Mercado Pago.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Step Indicators */}
      <div className="flex items-center justify-center space-x-4 max-w-xl mx-auto">
        <div className={`flex items-center space-x-2 text-sm font-extrabold ${step === 1 ? 'text-brand-red' : 'text-gray-400'}`}>
          <span className="w-7 h-7 rounded-full bg-brand-red text-white flex items-center justify-center text-xs">1</span>
          <span>Envío</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-300" />
        <div className={`flex items-center space-x-2 text-sm font-extrabold ${step === 2 ? 'text-brand-red' : 'text-gray-400'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-brand-red text-white' : 'bg-gray-300 text-gray-700'}`}>2</span>
          <span>Pago con Mercado Pago</span>
        </div>
      </div>

      {paymentSuccess ? (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-gray-200 shadow-xl text-center space-y-4">
          <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900">¡PAGO APROBADO CON ÉXITO!</h2>
          <p className="text-gray-600 text-sm">
            Tu pedido <strong className="text-brand-blue">#{createdOrder?.order_number}</strong> ha sido confirmado y está en preparación. Te enviamos un resumen a tu correo electrónico.
          </p>
          <div className="pt-4">
            <button
              onClick={() => navigate('/profile')}
              className="bg-brand-red text-white font-bold py-3 px-8 rounded-xl text-sm hover:bg-brand-red-hover shadow-lg"
            >
              Ver Mis Pedidos
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Step Content */}
          <div className="lg:col-span-2 space-y-6">
            {step === 1 ? (
              <form onSubmit={handleCreateOrder} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                <h3 className="text-xl font-black text-gray-900 flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-brand-red" /> 1. Datos de Envío
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo Recibidor</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.recipient_name}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, recipient_name: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono de Contacto</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dirección Completa (Calle, Av, Número)</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.address_line1}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address_line1: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ciudad</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Departamento</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Código Postal</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.postal_code}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-base"
                >
                  <span>Continuar al Pago</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-brand-red" /> 2. Mercado Pago Checkout Bricks
                  </h3>
                  <button onClick={() => setStep(1)} className="text-xs text-brand-blue font-bold hover:underline flex items-center">
                    <ArrowLeft className="w-3 h-3 mr-1" /> Editar Envío
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  Ingresa los datos de tu tarjeta en el componente seguro de Mercado Pago:
                </p>

                <MercadoPagoBrick
                  amount={total}
                  orderId={createdOrder?.id}
                  onSubmitPayment={handleSubmitMercadoPago}
                />
              </div>
            )}
          </div>

          {/* Order Summary Right Panel */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 h-fit">
            <h3 className="font-extrabold text-gray-900 text-base border-b border-gray-200 pb-3">
              Resumen de la Orden
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <div className="truncate pr-2">
                    <p className="font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-gray-500">Cant: {item.quantity} x S/ {Number(item.price).toFixed(2)}</p>
                  </div>
                  <span className="font-black text-gray-900">S/ {(item.quantity * item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Coupon input */}
            <div className="pt-3 border-t border-gray-100 flex space-x-2">
              <input
                type="text"
                placeholder="Código de cupón (ej: SUPERTECH10)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
              />
              <button
                type="button"
                onClick={applyCoupon}
                className="bg-brand-dark text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-slate-800"
              >
                Aplicar
              </button>
            </div>

            {/* Price Calculations */}
            <div className="pt-3 border-t border-gray-100 space-y-2 text-xs font-medium text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-gray-900">S/ {subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Descuento Cupón:</span>
                  <span>- S/ {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Envío Express a Domicilio:</span>
                <span className="font-bold text-gray-900">S/ {shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                <span>Monto Total:</span>
                <span className="text-brand-red">S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
