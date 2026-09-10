import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Truck, CheckCircle2, ArrowRight, ArrowLeft, Building2, FileText, Check, Copy, Clock, MessageSquare, MapPin, Store, AlertCircle, Info } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import CheckoutButton from '../components/CheckoutButton';
import axiosClient from '../api/axiosClient';

// Helper: Anti-fraud filter for fake or obvious sequential documents
function isFakeOrSequentialDocument(doc) {
  const clean = String(doc || '').trim();
  if (!clean) return false;
  // All digits repeated (e.g., 00000000, 11111111, 99999999999)
  if (/^(\w)\1+$/.test(clean)) return true;
  // Obvious ascending or descending sequences
  const fakes = [
    '12345678', '87654321', '01234567', '76543210',
    '12345678901', '10123456789', '20123456789', '11111111111', '00000000000'
  ];
  return fakes.includes(clean);
}

// Helper: Validate minimum Peruvian phone length
function isValidPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 9;
}

// Helper: Auto-detect Peruvian document type (DNI vs Carné de Extranjería)
function detectDocumentType(doc) {
  const clean = String(doc || '').trim();
  if (!clean) return 'DNI';
  // Exactly 8 numeric digits -> DNI
  if (/^\d{8}$/.test(clean)) return 'DNI';
  // If contains letters, or length is greater than 8 chars (up to 12 alphanumeric) -> CE
  if (/[a-zA-Z]/.test(clean) || clean.length > 8) return 'CE';
  return 'DNI';
}

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

  // Terms and conditions acceptance
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
      recipient_document: '', // DNI o Carné de Extranjería
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
    document_type: 'DNI',   // 'DNI' or 'CE' for boleta; 'RUC' for factura
    document_number: '',
    company_name: '',
    fiscal_address: ''
  });

  // Dedicated Draft Buffers per document type to avoid destructive truncations
  const [documentDrafts, setDocumentDrafts] = useState({
    DNI: '',
    CE: '',
    RUC: ''
  });

  // Checkbox for autocompleting fiscal address with delivery address
  const [useDeliveryAsFiscalAddress, setUseDeliveryAsFiscalAddress] = useState(false);

  // Payment Method Selection ('mercadopago' or 'bank_transfer')
  const [paymentMethod, setPaymentMethod] = useState('mercadopago');

  // Check whether current selected shipping method is Store Pickup
  const isPickup = Boolean(
    selectedShippingMethod?.code === 'pickup' ||
    Number(selectedShippingMethod?.cost) === 0 ||
    selectedShippingMethod?.name?.toLowerCase().includes('recojo')
  );

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

  // Reactive Sync: Whenever recipient_document in Step 1 changes, populate draft buffer & keep Boleta document updated
  useEffect(() => {
    const doc = String(shippingAddress.recipient_document || '').trim();
    if (doc) {
      const detectedType = detectDocumentType(doc);
      const formattedDoc = detectedType === 'DNI'
        ? doc.replace(/\D/g, '').slice(0, 8)
        : doc.toUpperCase().slice(0, 12);

      // Keep type-specific buffer updated with Step 1 data
      setDocumentDrafts((prev) => {
        if (prev[detectedType] !== formattedDoc) {
          return { ...prev, [detectedType]: formattedDoc };
        }
        return prev;
      });

      // Update active Boleta invoice info without overwriting if in Factura
      if (invoiceInfo.invoice_type === 'boleta') {
        setInvoiceInfo((prev) => {
          if (prev.document_number !== formattedDoc || prev.document_type !== detectedType) {
            return {
              ...prev,
              document_type: detectedType,
              document_number: formattedDoc
            };
          }
          return prev;
        });
      }
    }
  }, [shippingAddress.recipient_document, invoiceInfo.invoice_type]);

  // Reactive Sync: If delivery address changes while useDeliveryAsFiscalAddress is active, keep fiscal address in sync
  useEffect(() => {
    if (useDeliveryAsFiscalAddress && !isPickup) {
      const formatted = [
        shippingAddress.address_line1,
        shippingAddress.apartment_notes,
        shippingAddress.district,
        shippingAddress.province,
        shippingAddress.department
      ].filter(Boolean).join(', ');

      setInvoiceInfo((prev) => {
        if (prev.fiscal_address !== formatted) {
          return { ...prev, fiscal_address: formatted };
        }
        return prev;
      });
    }
  }, [
    useDeliveryAsFiscalAddress,
    isPickup,
    shippingAddress.address_line1,
    shippingAddress.apartment_notes,
    shippingAddress.district,
    shippingAddress.province,
    shippingAddress.department
  ]);

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
              Para asegurar tu pedido, emitir tu comprobante (Boleta o Factura) y poder realizar el seguimiento de tu envío en <strong>SUPERLAPTOP</strong>, necesitas contar con una cuenta activa.
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
    const upper = couponCode.trim().toUpperCase();
    if (upper === 'SUPERLAPTOP10' || upper === 'SUPERTECH10') {
      const disc = (subtotal * 10) / 100;
      setDiscountAmount(disc);
      alert(`¡Cupón ${upper} aplicado! 10% de descuento.`);
    } else {
      alert('Cupón no válido');
    }
  };

  // Helper: Build consolidated order payload for final payment submission
  const getConsolidatedPayload = (overridePaymentMethod) => {
    const payloadShippingAddress = isPickup
      ? {
          ...shippingAddress,
          is_pickup: true,
          address_line1: 'Jr. Velarde 172, Cercado de Lima (Tienda Física SUPERLAPTOP)',
          department: 'Lima',
          province: 'Lima',
          district: 'Cercado de Lima',
          reference: 'Retiro presencial en tienda física'
        }
      : {
          ...shippingAddress,
          is_pickup: false
        };

    return {
      items,
      shipping_address: payloadShippingAddress,
      shipping_method: selectedShippingMethod ? selectedShippingMethod.name : 'Envío Express a Domicilio',
      shipping_cost: shippingCost,
      coupon_code: couponCode || null,
      invoice_info: invoiceInfo,
      payment_method: overridePaymentMethod || paymentMethod
    };
  };

  // Step 1 Submission: Validate and advance to Payment & Invoice Step instantly (0ms)
  const handleProceedToPaymentStep = (e) => {
    e.preventDefault();

    // 1. Common validations: Name and Phone
    if (!shippingAddress.recipient_name?.trim()) {
      alert(`Por favor completa el nombre y apellidos de quien ${isPickup ? 'recoge' : 'recibe'}.`);
      return;
    }

    if (!shippingAddress.phone?.trim()) {
      alert('El teléfono de contacto es obligatorio.');
      return;
    }

    if (!isValidPhone(shippingAddress.phone)) {
      alert('Por favor ingresa un número de teléfono de contacto válido (mínimo 9 dígitos).');
      return;
    }

    // 2. Conditional validations by method
    if (isPickup) {
      if (!shippingAddress.recipient_document?.trim()) {
        alert('Por favor ingresa el DNI o Carné de Extranjería de la persona que recogerá en tienda.');
        return;
      }
      if (isFakeOrSequentialDocument(shippingAddress.recipient_document)) {
        alert('El documento de identidad ingresado no es válido o contiene una secuencia repetida.');
        return;
      }
    } else {
      if (!shippingAddress.address_line1?.trim()) {
        alert('Por favor ingresa la dirección completa de entrega.');
        return;
      }
      if (!shippingAddress.department?.trim() || !shippingAddress.province?.trim() || !shippingAddress.district?.trim()) {
        alert('Por favor completa el Departamento, Provincia y Distrito de entrega.');
        return;
      }
    }

    // UX Optimization: Sincronización reactiva de Boleta con los datos más recientes del Paso 1
    if (invoiceInfo.invoice_type === 'boleta') {
      const docStep1 = String(shippingAddress.recipient_document || '').trim();
      if (docStep1) {
        const detectedType = detectDocumentType(docStep1);
        const formatted = detectedType === 'DNI'
          ? docStep1.replace(/\D/g, '').slice(0, 8)
          : docStep1.toUpperCase().slice(0, 12);

        setDocumentDrafts((prev) => ({
          ...prev,
          [detectedType]: formatted
        }));

        setInvoiceInfo((prev) => ({
          ...prev,
          document_type: detectedType,
          document_number: formatted
        }));
      }
    } else if (invoiceInfo.invoice_type === 'factura' && useDeliveryAsFiscalAddress && !isPickup) {
      const updatedFiscal = [
        shippingAddress.address_line1,
        shippingAddress.apartment_notes,
        shippingAddress.district,
        shippingAddress.province,
        shippingAddress.department
      ].filter(Boolean).join(', ');
      setInvoiceInfo((prev) => ({
        ...prev,
        fiscal_address: updatedFiscal
      }));
    }

    // Instant transition (0ms): purely client-side state
    setStep(2);
  };

  // Comprehensive Invoice & Terms Validator (SUNAT & Anti-fraud rules)
  const validateBeforePayment = () => {
    if (!acceptedTerms) {
      alert('Debes aceptar los Términos y Condiciones y las Políticas de Garantía para continuar.');
      return false;
    }

    const num = String(invoiceInfo.document_number || '').trim();

    if (invoiceInfo.invoice_type === 'boleta') {
      if (!num) {
        alert('Para Boleta de Venta, debes ingresar tu documento de identidad (DNI o Carné de Extranjería).');
        return false;
      }

      if (invoiceInfo.document_type === 'DNI') {
        if (!/^\d{8}$/.test(num)) {
          alert('Para Boleta de Venta con DNI, debe contener exactamente 8 dígitos numéricos.');
          return false;
        }
        if (isFakeOrSequentialDocument(num)) {
          alert('El número de DNI ingresado no es válido o corresponde a una secuencia numérica no permitida.');
          return false;
        }
      } else if (invoiceInfo.document_type === 'CE') {
        if (!/^[a-zA-Z0-9]{8,12}$/.test(num)) {
          alert('Para Boleta de Venta con Carné de Extranjería (CE), debe contener entre 8 y 12 caracteres alfanuméricos.');
          return false;
        }
        if (isFakeOrSequentialDocument(num)) {
          alert('El Carné de Extranjería ingresado no es válido.');
          return false;
        }
      }
    } else if (invoiceInfo.invoice_type === 'factura') {
      if (!num) {
        alert('Para Factura Electrónica, debes ingresar el número de RUC.');
        return false;
      }
      if (!/^\d{11}$/.test(num)) {
        alert('Para Factura Electrónica, el RUC debe contener exactamente 11 dígitos numéricos.');
        return false;
      }
      if (!/^(10|20|15|17)\d{9}$/.test(num)) {
        alert('El RUC ingresado no es válido para SUNAT. Debe comenzar con 10, 20, 15 o 17.');
        return false;
      }
      if (isFakeOrSequentialDocument(num)) {
        alert('El número de RUC ingresado contiene una secuencia no permitida o es inválido.');
        return false;
      }
      if (!invoiceInfo.company_name?.trim()) {
        alert('Por favor ingresa la Razón Social de la empresa para la Factura Electrónica.');
        return false;
      }
      if (!invoiceInfo.fiscal_address?.trim()) {
        alert('Por favor ingresa el Domicilio Fiscal de la empresa para la Factura Electrónica.');
        return false;
      }
    }

    return true;
  };

  // Toggle autocompletion of fiscal address using the delivery address
  const handleToggleFiscalAddress = (e) => {
    const checked = e.target.checked;
    setUseDeliveryAsFiscalAddress(checked);
    if (checked) {
      const deliveryFormatted = [
        shippingAddress.address_line1,
        shippingAddress.apartment_notes,
        shippingAddress.district,
        shippingAddress.province,
        shippingAddress.department
      ].filter(Boolean).join(', ');
      setInvoiceInfo((prev) => ({ ...prev, fiscal_address: deliveryFormatted }));
    }
  };

  // Bank Transfer Submission (Consolidated atomic checkout)
  const handleConfirmBankTransfer = async () => {
    if (!validateBeforePayment()) return;

    setLoading(true);
    try {
      const payload = getConsolidatedPayload('bank_transfer');
      const res = await axiosClient.post('/orders/bank-transfer', payload);

      if (res.data.success && res.data.order) {
        setCreatedOrder(res.data.order);
        setIsBankTransferConfirmed(true);
        clearCart();
      }
    } catch (err) {
      console.error('[BankTransferError]:', err);
      alert(err.response?.data?.message || 'Error al registrar el pedido por transferencia.');
    } finally {
      setLoading(false);
    }
  };

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '51978529826';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola SUPERLAPTOP, adjunto mi comprobante de transferencia para el pedido #${createdOrder?.order_number || ''}`)}`;

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
              Titular de la cuenta: <strong>SUPERLAPTOP E-COMMERCE S.A.C.</strong> | Monto exacto: <strong className="text-brand-red font-black">S/ {Number(createdOrder?.total || total).toFixed(2)}</strong>
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
              /* STEP 1: SHIPPING METHOD (TOP) & CONDITIONAL ADDRESS FORM */
              <form onSubmit={handleProceedToPaymentStep} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-xl font-black text-gray-900 flex items-center">
                    <Truck className="w-5 h-5 mr-2 text-brand-red" /> 1. Método de Entrega y Datos de Despacho
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Selecciona cómo deseas recibir tu compra antes de completar tus datos.
                  </p>
                </div>

                {/* 1.1 SHIPPING METHOD SELECTION (PLACED AT THE TOP) */}
                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-brand-blue">
                    Selecciona el Método de Entrega *
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {shippingMethods.map((method) => {
                      const isSelected = selectedShippingMethod?.id === method.id;
                      const methodIsPickup = method.code === 'pickup' || Number(method.cost) === 0 || method.name?.toLowerCase().includes('recojo');

                      return (
                        <div
                          key={method.id}
                          onClick={() => setSelectedShippingMethod(method)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-brand-red bg-red-50/20 shadow-md ring-1 ring-brand-red/30'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-brand-red bg-brand-red' : 'border-gray-300'}`}>
                                {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                              </div>
                              <span className={`font-black text-xs px-2 py-0.5 rounded-full ${methodIsPickup ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-800'}`}>
                                {methodIsPickup ? '¡Gratis!' : `S/ ${Number(method.cost).toFixed(2)}`}
                              </span>
                            </div>

                            <p className="font-extrabold text-gray-900 text-sm flex items-center pt-1">
                              {methodIsPickup ? <Store className="w-4 h-4 mr-1.5 text-emerald-600 flex-shrink-0" /> : <Truck className="w-4 h-4 mr-1.5 text-brand-blue flex-shrink-0" />}
                              <span>{method.name}</span>
                            </p>

                            <p className="text-[11px] text-gray-500 leading-tight">
                              {method.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-gray-100 mt-2 text-[10px] text-gray-400 font-bold">
                            ⏱ {method.estimated_delivery}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 1.2 CONDITIONAL FIELDS BASED ON METHOD */}
                {isPickup ? (
                  /* CASE A: STORE PICKUP */
                  <div className="space-y-6 pt-2">
                    {/* Store Physical Info Card */}
                    <div className="bg-emerald-50/70 border-2 border-emerald-200/80 rounded-2xl p-5 space-y-3 shadow-sm">
                      <div className="flex items-center space-x-2 text-emerald-900 font-black text-sm">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-emerald-900 leading-tight">Punto Oficial de Retiro en Tienda Física</p>
                          <p className="text-[11px] text-emerald-700 font-medium">SUPERLAPTOP — Centro de Lima</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-emerald-950 font-medium">
                        <div className="bg-white/80 p-3 rounded-xl border border-emerald-100">
                          <span className="text-[11px] font-bold text-emerald-800 block">📍 Dirección:</span>
                          <span className="font-black text-gray-900">Jr. Velarde 172, Lima</span>
                          <span className="text-[10px] text-gray-500 block">(Ref: Altura Wilson y Av. Bolivia, Cercado de Lima)</span>
                        </div>
                        <div className="bg-white/80 p-3 rounded-xl border border-emerald-100">
                          <span className="text-[11px] font-bold text-emerald-800 block">🕒 Horarios de Atención:</span>
                          <span className="font-black text-gray-900">Lunes a Sábado: 9:30 AM – 7:30 PM</span>
                          <span className="text-[10px] text-gray-500 block">Domingos y feriados no hay atención</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-emerald-800 bg-emerald-100/50 p-2.5 rounded-xl border border-emerald-200/60 leading-relaxed font-semibold">
                        ℹ️ <strong>Requisitos de retiro:</strong> Para retirar tu pedido en tienda, la persona indicada debe presentar su documento de identidad físico (DNI o Carné de Extranjería) y el código de pedido.
                      </p>
                    </div>

                    {/* Store Pickup Form Fields */}
                    <div className="space-y-4">
                      <h4 className="font-black text-gray-900 text-sm flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-1.5 text-brand-red" /> Datos de la Persona que Recoge en Tienda
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Nombre y Apellidos de quien recoge *</label>
                          <input
                            type="text"
                            required
                            placeholder="ej. Juan Carlos Pérez Rojas"
                            value={shippingAddress.recipient_name}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, recipient_name: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            DNI o Carné de Extranjería de quien recoge *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={12}
                            placeholder="ej. 71234567 o CE00123456"
                            value={shippingAddress.recipient_document}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, recipient_document: e.target.value.trim() })}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                          />
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            💡 Se autocompletará en tu Boleta de Venta en el Paso 2.
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Teléfono de contacto celular *
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={15}
                          placeholder="ej. 987654321"
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value.replace(/[^\d+ ]/g, '') })}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                        />
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          Te notificaremos por WhatsApp o llamada cuando tus productos estén listos para el recojo.
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CASE B: HOME / PROVINCE DELIVERY */
                  <div className="space-y-4 pt-2">
                    <h4 className="font-black text-gray-900 text-sm flex items-center">
                      <Truck className="w-4 h-4 mr-1.5 text-brand-red" /> Datos de Envío y Destinatario
                    </h4>

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
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Teléfono de contacto celular *
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={15}
                          placeholder="ej. 987654321"
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value.replace(/[^\d+ ]/g, '') })}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          DNI o Carné de Extranjería de quien recibe (Opcional)
                        </label>
                        <input
                          type="text"
                          maxLength={12}
                          placeholder="ej. 71234567"
                          value={shippingAddress.recipient_document}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, recipient_document: e.target.value.trim() })}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                        />
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          Requerido para envíos por agencia y autocompletado de Boleta.
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Dirección (Calle, Avenida y Número) *</label>
                        <input
                          type="text"
                          required
                          placeholder="ej. Av. Javier Prado Este 1234"
                          value={shippingAddress.address_line1}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, address_line1: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red font-semibold"
                        />
                      </div>
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
                          placeholder="ej. Altura cuadra 12 de Javier Prado, frente al parque"
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
                      <label htmlFor="save_info" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                        Guardar esta información como mi dirección por defecto para futuras compras
                      </label>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-base"
                >
                  <span>Continuar al Paso 2: Comprobante & Pago</span>
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
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-brand-blue font-bold hover:underline flex items-center bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 transition-colors hover:bg-blue-100"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Volver a Envío
                  </button>
                </div>

                {/* RECEIPT / INVOICE TYPE SELECTOR (BOLETA vs FACTURA) */}
                <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-200 space-y-4">
                  <h4 className="font-extrabold text-gray-900 text-xs flex items-center uppercase tracking-wider text-brand-blue">
                    <FileText className="w-4 h-4 mr-1.5" /> Selección de Comprobante Electrónico (SUNAT)
                  </h4>

                  {/* Top Buttons: Boleta vs Factura */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        // Guardar RUC actual en su draft
                        if (invoiceInfo.invoice_type === 'factura' && invoiceInfo.document_number) {
                          setDocumentDrafts((prev) => ({ ...prev, RUC: invoiceInfo.document_number }));
                        }

                        // Determinar el tipo de documento adecuado para Boleta
                        const docStep1 = String(shippingAddress.recipient_document || '').trim();
                        const detectedStep1 = detectDocumentType(docStep1);

                        // Si había un tipo previo en boleta distinto de RUC, o el tipo detectado del paso 1
                        const targetType = invoiceInfo.document_type === 'RUC' ? detectedStep1 : invoiceInfo.document_type;
                        const targetDoc = documentDrafts[targetType] || (detectedStep1 === targetType ? docStep1 : '');

                        setInvoiceInfo((prev) => ({
                          ...prev,
                          invoice_type: 'boleta',
                          document_type: targetType,
                          document_number: targetType === 'DNI'
                            ? targetDoc.replace(/\D/g, '').slice(0, 8)
                            : targetDoc.toUpperCase().slice(0, 12)
                        }));
                      }}
                      className={`p-3 rounded-xl font-extrabold text-xs border text-center transition-all ${
                        invoiceInfo.invoice_type === 'boleta'
                          ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Boleta de Venta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Guardar el documento actual en su respectivo draft antes de conmutar a Factura
                        if (invoiceInfo.invoice_type === 'boleta' && invoiceInfo.document_number) {
                          setDocumentDrafts((prev) => ({
                            ...prev,
                            [invoiceInfo.document_type]: invoiceInfo.document_number
                          }));
                        }

                        setInvoiceInfo((prev) => ({
                          ...prev,
                          invoice_type: 'factura',
                          document_type: 'RUC',
                          document_number: documentDrafts.RUC || ''
                        }));
                      }}
                      className={`p-3 rounded-xl font-extrabold text-xs border text-center transition-all ${
                        invoiceInfo.invoice_type === 'factura'
                          ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Factura Electrónica (RUC)
                    </button>
                  </div>

                  {/* CASE 1: BOLETA DE VENTA FIELDS */}
                  {invoiceInfo.invoice_type === 'boleta' ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Tipo de Documento de Identidad *
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Preservar el valor actual de CE en su buffer antes de cambiar a DNI
                              if (invoiceInfo.document_type === 'CE' && invoiceInfo.document_number) {
                                setDocumentDrafts((prev) => ({ ...prev, CE: invoiceInfo.document_number }));
                              }

                              const docStep1 = String(shippingAddress.recipient_document || '').trim();
                              let targetDNI = documentDrafts.DNI;
                              if (!targetDNI) {
                                if (detectDocumentType(docStep1) === 'DNI') {
                                  targetDNI = docStep1.replace(/\D/g, '').slice(0, 8);
                                } else if (invoiceInfo.document_number) {
                                  targetDNI = invoiceInfo.document_number.replace(/\D/g, '').slice(0, 8);
                                }
                              }

                              setInvoiceInfo((prev) => ({
                                ...prev,
                                document_type: 'DNI',
                                document_number: targetDNI
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                              invoiceInfo.document_type === 'DNI'
                                ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            DNI (8 dígitos)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // Preservar el valor actual de DNI en su buffer antes de cambiar a CE
                              if (invoiceInfo.document_type === 'DNI' && invoiceInfo.document_number) {
                                setDocumentDrafts((prev) => ({ ...prev, DNI: invoiceInfo.document_number }));
                              }

                              const docStep1 = String(shippingAddress.recipient_document || '').trim();
                              let targetCE = documentDrafts.CE;
                              if (!targetCE) {
                                if (detectDocumentType(docStep1) === 'CE') {
                                  targetCE = docStep1.toUpperCase().slice(0, 12);
                                } else {
                                  targetCE = invoiceInfo.document_number;
                                }
                              }

                              setInvoiceInfo((prev) => ({
                                ...prev,
                                document_type: 'CE',
                                document_number: targetCE
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                              invoiceInfo.document_type === 'CE'
                                ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            Carné de Extranjería (CE)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          {invoiceInfo.document_type === 'DNI' ? 'DNI (exactamente 8 dígitos numéricos) *' : 'Carné de Extranjería (8 a 12 caracteres alfanuméricos) *'}
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={invoiceInfo.document_type === 'DNI' ? 8 : 12}
                          placeholder={invoiceInfo.document_type === 'DNI' ? 'ej. 71234567' : 'ej. 001234567'}
                          value={invoiceInfo.document_number}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (invoiceInfo.document_type === 'DNI') {
                              // Si el usuario escribe letras o más de 8 caracteres, auto-conmutar a CE sin perder caracteres
                              if (/[a-zA-Z]/.test(raw) || raw.trim().length > 8) {
                                const cleanCE = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
                                setDocumentDrafts((prev) => ({ ...prev, CE: cleanCE }));
                                setInvoiceInfo((prev) => ({
                                  ...prev,
                                  document_type: 'CE',
                                  document_number: cleanCE
                                }));
                              } else {
                                const cleanDNI = raw.replace(/\D/g, '').slice(0, 8);
                                setDocumentDrafts((prev) => ({ ...prev, DNI: cleanDNI }));
                                setInvoiceInfo((prev) => ({
                                  ...prev,
                                  document_number: cleanDNI
                                }));
                              }
                            } else {
                              // Modo CE: alfanumérico hasta 12 caracteres
                              const cleanCE = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
                              setDocumentDrafts((prev) => ({ ...prev, CE: cleanCE }));
                              setInvoiceInfo((prev) => ({
                                ...prev,
                                document_number: cleanCE
                              }));
                            }
                          }}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-brand-blue"
                        />
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          Autocompletado desde los datos del paso anterior si ingresaste tu documento.
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* CASE 2: FACTURA ELECTRÓNICA (RUC) FIELDS */
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Número de RUC (11 dígitos, inicia con 10, 20, 15 o 17) *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={11}
                            placeholder="ej. 20601234567"
                            value={invoiceInfo.document_number}
                            onChange={(e) => {
                              const cleanRUC = e.target.value.replace(/\D/g, '').slice(0, 11);
                              setDocumentDrafts((prev) => ({ ...prev, RUC: cleanRUC }));
                              setInvoiceInfo((prev) => ({ ...prev, document_number: cleanRUC }));
                            }}
                            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-brand-blue"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Razón Social (Empresa) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="ej. CORPORACION TECH S.A.C."
                            value={invoiceInfo.company_name}
                            onChange={(e) => setInvoiceInfo({ ...invoiceInfo, company_name: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-brand-blue"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-gray-700">
                            Domicilio Fiscal de la Empresa *
                          </label>
                          {!isPickup && shippingAddress.address_line1 && (
                            <label className="flex items-center space-x-1 text-[11px] font-bold text-brand-blue cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={useDeliveryAsFiscalAddress}
                                onChange={handleToggleFiscalAddress}
                                className="w-3.5 h-3.5 text-brand-blue rounded border-gray-300 focus:ring-brand-blue cursor-pointer"
                              />
                              <span>Usar dirección de entrega como Domicilio Fiscal</span>
                            </label>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="ej. Av. Rivera Navarrete 501, San Isidro, Lima"
                          value={invoiceInfo.fiscal_address}
                          onChange={(e) => {
                            setUseDeliveryAsFiscalAddress(false);
                            setInvoiceInfo({ ...invoiceInfo, fiscal_address: e.target.value });
                          }}
                          className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-brand-blue"
                        />
                      </div>
                    </div>
                  )}
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

                {/* TERMS AND CONDITIONS CHECKBOX (REQUIRED BEFORE PAYMENT) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start space-x-3 transition-colors hover:bg-slate-100/70">
                  <input
                    type="checkbox"
                    id="terms_agree"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red cursor-pointer"
                  />
                  <label htmlFor="terms_agree" className="text-xs text-gray-700 font-bold cursor-pointer select-none leading-relaxed">
                    He leído y acepto los <span className="text-brand-blue underline hover:text-blue-700">Términos y Condiciones de Compra</span> y las <span className="text-brand-blue underline hover:text-blue-700">Políticas de Garantía</span> de SUPERLAPTOP (*)
                  </label>
                </div>

                {/* OPTION A: MERCADO PAGO CHECKOUT PRO */}
                {paymentMethod === 'mercadopago' ? (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-gray-500">
                      Al hacer clic en el botón, serás redirigido a la plataforma segura de Mercado Pago para completar tu pago con tarjeta de crédito, débito, Yape o efectivo:
                    </p>
                    <CheckoutButton
                      orderId={createdOrder?.id}
                      invoiceInfo={invoiceInfo}
                      getOrderPayload={() => getConsolidatedPayload('mercadopago')}
                      onSuccess={(order) => setCreatedOrder(order)}
                      disabled={!acceptedTerms}
                      onBeforePay={validateBeforePayment}
                    />
                    {!acceptedTerms && (
                      <p className="text-[11px] text-amber-600 font-bold flex items-center justify-center">
                        ⚠️ Debes marcar la casilla de Términos y Condiciones para habilitar el botón de pago.
                      </p>
                    )}
                  </div>
                ) : (
                  /* OPTION B: BANK TRANSFER DETAILS & RESERVATION */
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center space-x-2 text-brand-red">
                      <Building2 className="w-5 h-5" />
                      <h4 className="font-black text-sm">Cuentas Bancarias Oficiales de SUPERLAPTOP</h4>
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
                      disabled={loading || !acceptedTerms}
                      className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Building2 className="w-5 h-5" />
                      <span>Confirmar Pedido por Transferencia</span>
                    </button>
                    {!acceptedTerms && (
                      <p className="text-[11px] text-amber-600 font-bold flex items-center justify-center">
                        ⚠️ Debes marcar la casilla de Términos y Condiciones para habilitar la confirmación.
                      </p>
                    )}
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
                placeholder="Código de cupón (ej: SUPERLAPTOP10)"
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
