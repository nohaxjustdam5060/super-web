import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Truck, CheckCircle2, ArrowRight, ArrowLeft, Building2, FileText, Check, Copy, Clock, MessageSquare, MapPin, Store } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import MercadoPagoBrick from '../components/MercadoPagoBrick';
import axiosClient from '../api/axiosClient';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [step, setStep] = useState(1); // 1: Envío, 2: Comprobante & Pago
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isBankTransferConfirmed, setIsBankTransferConfirmed] = useState(false);

  // Address Form - Persisted in localStorage & pre-filled from user profile
  const [shippingAddress, setShippingAddress] = useState(() => {
    try {
      const saved = localStorage.getItem('super_shipping_address');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      recipient_name: user?.name || '',
      phone: user?.phone || '',
      address_line1: '',
      department: 'Lima',
      province: 'Lima',
      district: '',
      apartment_notes: '',
      reference: '',
      save_info: true
    };
  });

  // Shipping Methods fetched from DB
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState(null);

  // Invoice / Receipt State (Boleta / Factura)
  const [invoiceInfo, setInvoiceInfo] = useState({
    invoice_type: 'boleta', // 'boleta' or 'factura'
    document_type: 'DNI',   // 'DNI' or 'RUC'
    document_number: '',
    company_name: ''
  });

  // Payment Method Selection ('mercadopago' or 'bank_transfer')
  const [paymentMethod, setPaymentMethod] = useState('mercadopago');

  useEffect(() => {
    if (user) {
      setShippingAddress((prev) => ({
        ...prev,
        recipient_name: prev.recipient_name || user.name || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    if (shippingAddress) {
      localStorage.setItem('super_shipping_address', JSON.stringify(shippingAddress));
    }
  }, [shippingAddress]);

  // Load Shipping Methods from API
  useEffect(() => {
    axiosClient.get('/orders/shipping-methods')
      .then((res) => {
        if (res.data.success && res.data.shippingMethods?.length > 0) {
          setShippingMethods(res.data.shippingMethods);
          setSelectedShippingMethod(res.data.shippingMethods[0]);
        }
      })
      .catch((err) => console.error('[Checkout] Error loading shipping methods:', err));
  }, []);

  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  const subtotal = getSubtotal();
  const shippingCost = selectedShippingMethod ? Number(selectedShippingMethod.cost) : 15.00;
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  if (items.length === 0 && !createdOrder) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-black text-gray-900">No hay productos en el carrito para procesar</h2>
        <button onClick={() => navigate('/catalog')} className="bg-brand-red text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-brand-red-hover shadow">
          Ir al Catálogo
        </button>
      </div>
    );
  }

  // Unauthenticated User Guard Screen
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
              Para asegurar tu pedido, emitir tu comprobante (Boleta o Factura) y poder realizar el seguimiento de tu envío en <strong>SUPER Tech</strong>, necesitas contar con una cuenta activa.
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

  // Step 1 Submission: Create or update draft order
  const handleProceedToPaymentStep = async (e) => {
    e.preventDefault();

    if (!shippingAddress.recipient_name || !shippingAddress.phone || !shippingAddress.address_line1 || !shippingAddress.district) {
      alert('Por favor completa todos los campos requeridos de envío.');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post('/orders', {
        items,
        shipping_address: shippingAddress,
        shipping_method: selectedShippingMethod ? selectedShippingMethod.name : 'Envío Express a Domicilio',
        shipping_cost: shippingCost,
        coupon_code: couponCode || null
      });

      if (res.data.success) {
        setCreatedOrder(res.data.order);
        setStep(2); // Advance to Payment & Invoice Step
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al generar la orden de compra.');
    } finally {
      setLoading(false);
    }
  };

  // Validate Invoice Info (DNI 8 digits, RUC 11 digits)
  const validateInvoiceInfo = () => {
    const num = invoiceInfo.document_number.trim();
    if (invoiceInfo.invoice_type === 'boleta') {
      if (!/^\d{8}$/.test(num)) {
        alert('Para Boleta de Venta, el DNI debe contener exactamente 8 dígitos numéricos.');
        return false;
      }
    } else if (invoiceInfo.invoice_type === 'factura') {
      if (!/^\d{11}$/.test(num)) {
        alert('Para Factura Electrónica, el RUC debe contener exactamente 11 dígitos numéricos.');
        return false;
      }
    }
    return true;
  };

  // Mercado Pago Submission
  const handleSubmitMercadoPago = async (paymentData) => {
    if (!validateInvoiceInfo()) return;

    try {
      const res = await axiosClient.post('/payments/process', {
        order_id: createdOrder.id,
        invoice_info: invoiceInfo,
        formData: paymentData,
        token: paymentData?.token,
        payment_method_id: paymentData?.payment_method_id,
        installments: paymentData?.installments,
        issuer_id: paymentData?.issuer_id,
        payer: paymentData?.payer
      });

      if (res.data.success) {
        setPaymentSuccess(true);
        clearCart();
      }
    } catch (err) {
      console.error('❌ [Error MercadoPago]:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Ocurrió un inconveniente al procesar el pago con Mercado Pago.');
    }
  };

  // Bank Transfer Submission
  const handleConfirmBankTransfer = async () => {
    if (!validateInvoiceInfo()) return;

    setLoading(true);
    try {
      const res = await axiosClient.post('/orders/bank-transfer', {
        order_id: createdOrder.id,
        shipping_address: shippingAddress,
        shipping_method: selectedShippingMethod ? selectedShippingMethod.name : 'Envío Express a Domicilio',
        shipping_cost: shippingCost,
        invoice_info: invoiceInfo
      });

      if (res.data.success) {
        setIsBankTransferConfirmed(true);
        clearCart();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al registrar el pedido por transferencia.');
    } finally {
      setLoading(false);
    }
  };

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '51978529826';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola SUPER Tech, adjunto mi comprobante de transferencia para el pedido #${createdOrder?.order_number || ''}`)}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Step Indicators */}
      <div className="flex items-center justify-center space-x-4 max-w-xl mx-auto">
        <div className={`flex items-center space-x-2 text-sm font-extrabold ${step === 1 ? 'text-brand-red' : 'text-gray-400'}`}>
          <span className="w-7 h-7 rounded-full bg-brand-red text-white flex items-center justify-center text-xs">1</span>
          <span>Envío & Método</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-300" />
        <div className={`flex items-center space-x-2 text-sm font-extrabold ${step === 2 ? 'text-brand-red' : 'text-gray-400'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-brand-red text-white' : 'bg-gray-300 text-gray-700'}`}>2</span>
          <span>Comprobante & Pago</span>
        </div>
      </div>

      {/* SUCCESS SCREEN 1: Mercado Pago Payment Approved */}
      {paymentSuccess ? (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-gray-200 shadow-xl text-center space-y-4">
          <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900">¡PAGO APROBADO CON ÉXITO!</h2>
          <p className="text-gray-600 text-sm">
            Tu pedido <strong className="text-brand-blue">#{createdOrder?.order_number}</strong> ha sido confirmado y está en preparación. Te enviamos el comprobante a tu correo electrónico.
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
      ) : isBankTransferConfirmed ? (
        /* SUCCESS SCREEN 2: Bank Transfer Reserved */
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-gray-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200">
            <Clock className="w-9 h-9" />
          </div>
          <div>
            <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Reserva Activa (24h)
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 pt-2">
              ¡PEDIDO #{createdOrder?.order_number} RESERVADO CON ÉXITO!
            </h2>
            <p className="text-sm text-gray-600 max-w-md mx-auto pt-1">
              Tu orden ha sido registrada en estado <strong>Pendiente de Verificación de Transferencia</strong>. Tus productos quedan separados por 24 horas.
            </p>
          </div>

          {/* Bank Accounts Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-3 text-xs">
            <p className="font-black text-slate-900 text-sm flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-brand-red" /> Datos Bancarios para Transferir:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-medium">
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="font-black text-brand-blue block">BCP Soles</span>
                <span className="text-gray-700 block font-mono text-[11px]">Cta: 191-98765432-0-89</span>
                <span className="text-gray-500 block text-[10px]">CCI: 002-191-0098765432089-54</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="font-black text-emerald-700 block">Interbank Soles</span>
                <span className="text-gray-700 block font-mono text-[11px]">Cta: 200-3001234567</span>
                <span className="text-gray-500 block text-[10px]">CCI: 003-200-003001234567-88</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="font-black text-blue-800 block">BBVA Soles</span>
                <span className="text-gray-700 block font-mono text-[11px]">Cta: 0011-0123-0200987654</span>
                <span className="text-gray-500 block text-[10px]">CCI: 011-123-000200987654-12</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 font-semibold pt-1">
              Titular de la cuenta: <strong>SUPER TECH E-COMMERCE S.A.C.</strong> | Monto exacto: <strong className="text-brand-red font-black">S/ {Number(createdOrder?.total || total).toFixed(2)}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-sm w-full sm:w-auto"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enviar Comprobante por WhatsApp</span>
            </a>
            <button
              onClick={() => navigate('/profile')}
              className="bg-brand-dark hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl text-sm w-full sm:w-auto"
            >
              Ver Mis Pedidos
            </button>
          </div>
        </div>
      ) : (
        /* MAIN CHECKOUT STEP FLOW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form & Step Contents */}
          <div className="lg:col-span-2 space-y-6">
            {step === 1 ? (
              /* STEP 1: SHIPPING ADDRESS & SHIPPING METHOD */
              <form onSubmit={handleProceedToPaymentStep} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                <h3 className="text-xl font-black text-gray-900 flex items-center border-b border-gray-100 pb-3">
                  <Truck className="w-5 h-5 mr-2 text-brand-red" /> 1. Datos de Envío y Destinatario
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de quien recibe *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Juan Pérez"
                      value={shippingAddress.recipient_name}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, recipient_name: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono de contacto *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. 987654321"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dirección (Calle, Avenida y Número) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Av. Javier Prado Este 1234, Dpto 402"
                    value={shippingAddress.address_line1}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address_line1: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                  />
                </div>

                {/* Peruvian Political Division: Departamento, Provincia, Distrito */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Departamento *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Lima"
                      value={shippingAddress.department}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, department: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Provincia *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Lima"
                      value={shippingAddress.province}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, province: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Distrito *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Miraflores"
                      value={shippingAddress.district}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, district: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Dpto / Interior (Opcional)</label>
                    <input
                      type="text"
                      placeholder="ej. Dpto 402, Torre B"
                      value={shippingAddress.apartment_notes}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, apartment_notes: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Referencia de ubicación (Opcional)</label>
                    <input
                      type="text"
                      placeholder="ej. Casa color verde al lado del grifo"
                      value={shippingAddress.reference}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, reference: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="save_info"
                    checked={shippingAddress.save_info}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, save_info: e.target.checked })}
                    className="w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red cursor-pointer"
                  />
                  <label htmlFor="save_info" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Guardar esta información como mi dirección por defecto para futuras compras
                  </label>
                </div>

                {/* SHIPPING METHOD SELECTION SECTION */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <h4 className="font-extrabold text-gray-900 text-sm flex items-center">
                    <MapPin className="w-4 h-4 mr-1.5 text-brand-red" /> Seleccionar Método de Envío
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {shippingMethods.map((method) => {
                      const isSelected = selectedShippingMethod?.id === method.id;
                      const isPickup = Number(method.cost) === 0;

                      return (
                        <div
                          key={method.id}
                          onClick={() => setSelectedShippingMethod(method)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-brand-red bg-red-50/20 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-brand-red bg-brand-red' : 'border-gray-300'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm flex items-center">
                                {isPickup ? <Store className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Truck className="w-4 h-4 mr-1.5 text-brand-blue" />}
                                {method.name}
                              </p>
                              <p className="text-xs text-gray-500">{method.description} ({method.estimated_delivery})</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`font-black text-sm ${isPickup ? 'text-emerald-600 uppercase tracking-wider' : 'text-gray-900'}`}>
                              {isPickup ? '¡Gratis!' : `S/ ${Number(method.cost).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-base"
                >
                  <span>Continuar al Paso 2: Pago</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            ) : (
              /* STEP 2: INVOICE SELECTOR & PAYMENT METHOD */
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-xl font-black text-gray-900 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-brand-red" /> 2. Comprobante & Método de Pago
                  </h3>
                  <button onClick={() => setStep(1)} className="text-xs text-brand-blue font-bold hover:underline flex items-center">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Volver a Envío
                  </button>
                </div>

                {/* RECEIPT / INVOICE TYPE SELECTOR (BOLETA vs FACTURA) */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                  <h4 className="font-extrabold text-gray-900 text-xs flex items-center uppercase tracking-wider text-brand-blue">
                    <FileText className="w-4 h-4 mr-1.5" /> Selección de Comprobante de Pago
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setInvoiceInfo({ ...invoiceInfo, invoice_type: 'boleta', document_type: 'DNI', document_number: '' })}
                      className={`p-3 rounded-xl font-extrabold text-xs border text-center transition-all ${
                        invoiceInfo.invoice_type === 'boleta'
                          ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Boleta de Venta (DNI)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceInfo({ ...invoiceInfo, invoice_type: 'factura', document_type: 'RUC', document_number: '' })}
                      className={`p-3 rounded-xl font-extrabold text-xs border text-center transition-all ${
                        invoiceInfo.invoice_type === 'factura'
                          ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Factura Electrónica (RUC)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        {invoiceInfo.invoice_type === 'boleta' ? 'Número de DNI (8 dígitos) *' : 'Número de RUC (11 dígitos) *'}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={invoiceInfo.invoice_type === 'boleta' ? 8 : 11}
                        placeholder={invoiceInfo.invoice_type === 'boleta' ? '12345678' : '20123456789'}
                        value={invoiceInfo.document_number}
                        onChange={(e) => setInvoiceInfo({ ...invoiceInfo, document_number: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-brand-blue"
                      />
                    </div>
                    {invoiceInfo.invoice_type === 'factura' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Razón Social (Empresa)</label>
                        <input
                          type="text"
                          placeholder="ej. MI EMPRESA S.A.C."
                          value={invoiceInfo.company_name}
                          onChange={(e) => setInvoiceInfo({ ...invoiceInfo, company_name: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-brand-blue"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* PAYMENT METHOD SELECTOR */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-gray-900 text-sm">Elegir Forma de Pago</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mercadopago')}
                      className={`p-4 rounded-2xl border-2 font-black text-xs text-left flex items-center justify-between transition-all ${
                        paymentMethod === 'mercadopago'
                          ? 'border-brand-red bg-red-50/20 text-brand-red shadow-sm'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-5 h-5" />
                        <span>Mercado Pago (Tarjeta, Yape)</span>
                      </div>
                      {paymentMethod === 'mercadopago' && <Check className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`p-4 rounded-2xl border-2 font-black text-xs text-left flex items-center justify-between transition-all ${
                        paymentMethod === 'bank_transfer'
                          ? 'border-brand-red bg-red-50/20 text-brand-red shadow-sm'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-5 h-5" />
                        <span>Transferencia Bancaria Directa</span>
                      </div>
                      {paymentMethod === 'bank_transfer' && <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* OPTION A: MERCADO PAGO CHECKOUT BRICKS */}
                {paymentMethod === 'mercadopago' ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-gray-500">
                      Ingresa los datos de tu tarjeta en el componente seguro de Mercado Pago:
                    </p>
                    <MercadoPagoBrick
                      amount={total}
                      orderId={createdOrder?.id}
                      onSubmitPayment={handleSubmitMercadoPago}
                    />
                  </div>
                ) : (
                  /* OPTION B: BANK TRANSFER DETAILS & RESERVATION */
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center space-x-2 text-brand-red">
                      <Building2 className="w-5 h-5" />
                      <h4 className="font-black text-sm">Cuentas Bancarias Oficiales de SUPER Tech</h4>
                    </div>

                    <p className="text-xs text-gray-600">
                      Realiza la transferencia por el monto exacto de <strong className="text-brand-red font-black">S/ {total.toFixed(2)}</strong> a cualquiera de nuestras cuentas bancarias:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-1">
                        <p className="font-black text-brand-blue">BCP Soles</p>
                        <p className="font-mono text-gray-800 text-[11px]">191-98765432-0-89</p>
                        <p className="text-[10px] text-gray-400">CCI: 002-191-0098765432089-54</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-1">
                        <p className="font-black text-emerald-700">Interbank Soles</p>
                        <p className="font-mono text-gray-800 text-[11px]">200-3001234567</p>
                        <p className="text-[10px] text-gray-400">CCI: 003-200-003001234567-88</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-1">
                        <p className="font-black text-blue-800">BBVA Soles</p>
                        <p className="font-mono text-gray-800 text-[11px]">0011-0123-0200987654</p>
                        <p className="text-[10px] text-gray-400">CCI: 011-123-000200987654-12</p>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 space-y-1">
                      <p className="font-bold flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-amber-600" /> Reserva garantizada por 24 horas
                      </p>
                      <p className="text-[11px] text-amber-700">
                        Una vez generada la orden, tus productos quedarán reservados durante 24h. Envía tu voucher adjuntando el número de orden por correo o WhatsApp para la verificación administrativa.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmBankTransfer}
                      disabled={loading}
                      className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-base"
                    >
                      <Building2 className="w-5 h-5" />
                      <span>Confirmar Pedido por Transferencia</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Order Summary Panel */}
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
                <span>Método de Envío:</span>
                <span className="font-bold text-gray-900">
                  {selectedShippingMethod
                    ? Number(selectedShippingMethod.cost) === 0
                      ? 'Gratis'
                      : `S/ ${Number(selectedShippingMethod.cost).toFixed(2)}`
                    : 'S/ 15.00'}
                </span>
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
