import React, { memo, useState, useEffect } from 'react';
import { 
  Package, X, Printer, User, MapPin, Calendar, CreditCard, Clock, Info,
  CheckCircle2, AlertTriangle, FileText, ExternalLink, Copy, Check, Receipt, Save
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

const renderShippingBadge = (shippingMethodStr, shippingAddress) => {
  const sm = (shippingMethodStr || '').toLowerCase();
  const dept = (shippingAddress?.department || '').toLowerCase();

  if (sm.includes('recojo') || sm.includes('pickup') || sm.includes('tienda')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
        Recojo en Tienda
      </span>
    );
  }

  if (sm.includes('provincia') || sm.includes('agencia') || (dept && !dept.includes('lima') && !dept.includes('callao'))) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
        Envío a Provincia
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
      Envío a Lima y Callao
    </span>
  );
};

const OrderDetailsModal = memo(function OrderDetailsModal({ selectedOrder, loadingDetail, onClose, onOrderUpdated }) {
  const [toastNotice, setToastNotice] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [localOrder, setLocalOrder] = useState(selectedOrder);

  useEffect(() => {
    setLocalOrder(selectedOrder);
    setInvoiceNumberInput(selectedOrder?.invoice_number || '');
  }, [selectedOrder]);

  if (!localOrder) return null;

  const isInvoiceIssued = localOrder.invoice_status === 'issued' || Boolean(localOrder.invoice_number);
  const seriesNum = localOrder.invoice_number 
    ? (localOrder.invoice_series ? `${localOrder.invoice_series}-${localOrder.invoice_number}` : localOrder.invoice_number)
    : '';

  const copyToClipboard = (text, key) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceNumberInput.trim()) {
      setToastNotice('Por favor ingresa un número de comprobante válido (ej. B001-000123 o F001-000456).');
      return;
    }

    try {
      setIsSavingInvoice(true);
      const res = await axiosClient.patch(`/admin/orders/${localOrder.id}/invoice`, {
        invoice_number: invoiceNumberInput.trim(),
        invoice_status: 'issued'
      });

      if (res.data?.success) {
        const savedNumber = invoiceNumberInput.trim();
        setLocalOrder((prev) => ({
          ...prev,
          invoice_number: savedNumber,
          invoice_status: 'issued',
          invoice_error_message: null
        }));
        setToastNotice('✅ Comprobante fiscal registrado exitosamente en la orden.');
        if (onOrderUpdated) onOrderUpdated(res.data.order);
      }
    } catch (err) {
      setToastNotice(`❌ Error al guardar comprobante: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handlePendingPrint = () => {
    setToastNotice('El comprobante electrónico aún no ha sido registrado por el administrador.');
    setTimeout(() => {
      setToastNotice(null);
    }, 4000);
  };

  const invDocNum = localOrder.invoice_info?.document_number || '';
  const invName = localOrder.invoice_info?.company_name || localOrder.shipping_address?.recipient_name || localOrder.user?.name || '';
  const invAddress = localOrder.invoice_info?.fiscal_address || localOrder.shipping_address?.address_line1 || '';
  const invType = localOrder.invoice_info?.invoice_type === 'factura' ? 'Factura Electrónica' : 'Boleta de Venta';
  const invDocType = localOrder.invoice_info?.document_type || (localOrder.invoice_info?.invoice_type === 'factura' ? 'RUC' : 'DNI');

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-gray-200 shadow-2xl overflow-hidden my-8 space-y-6 p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        
        {/* Toast Notice Banner */}
        {toastNotice && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold p-3 rounded-2xl flex items-center justify-between animate-fadeIn shadow-sm">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-brand-blue flex-shrink-0" />
              <span>{toastNotice}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setToastNotice(null)} 
              className="text-blue-500 hover:text-blue-800 p-1 font-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h2 className="text-2xl font-black text-gray-900">Orden #{localOrder.order_number}</h2>
              {renderShippingBadge(localOrder.shipping_method, localOrder.shipping_address)}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                {new Date(localOrder.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                localOrder.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : localOrder.status === 'payment_review'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-gray-100 text-gray-600 border-gray-300'
              }`}>
                Estado: {localOrder.status === 'paid' ? 'Pagado' : localOrder.status === 'payment_review' ? 'En Revisión (24h)' : localOrder.status}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel de Facturación Manual & Copiado Rápido para NubeFact */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-4 shadow-md border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-brand-red" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Datos Tributarios para Emisión Manual (NubeFact / SUNAT)
              </h4>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-blue/30 text-blue-300 border border-blue-500/30">
                {invType}
              </span>
              {isInvoiceIssued ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  <span>Facturado ({localOrder.invoice_number})</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Pendiente de Emisión
                </span>
              )}
            </div>
          </div>

          {/* Quick 1-Click Copy Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {/* Document Number / RUC */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">{invDocType}:</span>
                <span className="font-mono font-black text-sm text-white select-all">{invDocNum || '—'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(invDocNum, 'doc')}
                disabled={!invDocNum}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold flex items-center space-x-1 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                title="Copiar número de documento"
              >
                {copiedKey === 'doc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'doc' ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {/* Business / Client Name */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-slate-400 font-bold block">Razón Social / Nombre:</span>
                <span className="font-bold text-xs text-white truncate block select-all" title={invName}>{invName || '—'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(invName, 'name')}
                disabled={!invName}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold flex items-center space-x-1 transition-all active:scale-95 disabled:opacity-40 flex-shrink-0 cursor-pointer"
                title="Copiar nombre / razón social"
              >
                {copiedKey === 'name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'name' ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {/* Fiscal Address */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between sm:col-span-2">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-slate-400 font-bold block">Domicilio Fiscal:</span>
                <span className="font-medium text-xs text-slate-300 truncate block select-all" title={invAddress}>{invAddress || '—'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(invAddress, 'address')}
                disabled={!invAddress}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold flex items-center space-x-1 transition-all active:scale-95 disabled:opacity-40 flex-shrink-0 cursor-pointer"
                title="Copiar dirección fiscal"
              >
                {copiedKey === 'address' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'address' ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Form to Register Manual Invoice Number */}
          <form onSubmit={handleSaveInvoice} className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={invoiceNumberInput}
                onChange={(e) => setInvoiceNumberInput(e.target.value)}
                placeholder="N° Comprobante emitido en NubeFact (ej. F001-000123 / B001-000456)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-red transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingInvoice}
              className="w-full sm:w-auto bg-brand-red hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex-shrink-0 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingInvoice ? 'Guardando...' : 'Guardar Comprobante'}</span>
            </button>
          </form>
        </div>

        {/* Modal Body: Products List */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider flex items-center text-brand-blue">
            <Package className="w-4 h-4 mr-1.5 text-brand-red" /> Productos del Pedido ({(localOrder.items || []).length})
          </h4>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 divide-y divide-gray-200/60 max-h-56 overflow-y-auto space-y-2">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-6 space-x-2 text-xs text-gray-500">
                <Clock className="w-4 h-4 animate-spin text-brand-blue" />
                <span>Cargando detalle e imágenes de productos...</span>
              </div>
            ) : (localOrder.items || []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 font-medium">No hay items registrados en el detalle de esta orden.</p>
            ) : (
              (localOrder.items || []).map((item) => {
                const prodImg = item.product?.images?.find((i) => i.is_primary)?.image_url || item.product?.images?.[0]?.image_url || '/placeholder-product.png';
                const unitPrice = Number(item.unit_price) || 0;
                const itemSubtotal = unitPrice * item.quantity;
                return (
                  <div key={item.id || item.product_id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <img
                        src={prodImg}
                        alt={item.product_name || item.product?.name || 'Producto'}
                        decoding="async"
                        loading="lazy"
                        className="w-12 h-12 object-cover rounded-xl border border-gray-200 bg-white flex-shrink-0"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&q=80&w=200'; }}
                      />
                      <div>
                        <p className="font-bold text-gray-900 line-clamp-1">{item.product_name || item.product?.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">SKU: {item.sku || item.product?.sku || 'N/A'}</p>
                        <p className="text-[11px] text-gray-600 font-semibold">S/ {unitPrice.toFixed(2)} × {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}</p>
                      </div>
                    </div>
                    <p className="font-black text-gray-900 text-sm whitespace-nowrap">S/ {itemSubtotal.toFixed(2)}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Body: Customer & Delivery Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Customer & Document Information */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
            <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider flex items-center text-brand-blue">
              <User className="w-3.5 h-3.5 mr-1.5 text-brand-red" /> Datos del Cliente & Comprobante
            </h4>
            <div className="space-y-1 text-gray-700">
              <p><strong>Cliente / Destinatario:</strong> {localOrder.shipping_address?.recipient_name || localOrder.user?.name || 'Cliente'}</p>
              {localOrder.user?.name && localOrder.shipping_address?.recipient_name && localOrder.user.name.trim().toLowerCase() !== localOrder.shipping_address.recipient_name.trim().toLowerCase() && (
                <p className="text-gray-500 text-[11px]"><strong>Titular de la cuenta:</strong> {localOrder.user.name}</p>
              )}
              <p><strong>Email:</strong> {localOrder.user?.email || 'No especificado'}</p>
              <p><strong>Teléfono:</strong> {localOrder.shipping_address?.phone || localOrder.user?.phone || 'No especificado'}</p>
              
              <div className="pt-2 border-t border-gray-200 mt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p><strong>Tipo:</strong> <span className="uppercase font-bold text-brand-blue">{localOrder.invoice_info?.invoice_type || 'Boleta'}</span></p>
                  {isInvoiceIssued ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-600" /> Facturado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                      Pendiente
                    </span>
                  )}
                </div>

                <p><strong>{localOrder.invoice_info?.document_type || 'DNI'}:</strong> <span className="font-mono font-bold text-gray-900">{localOrder.invoice_info?.document_number || '—'}</span></p>
                {localOrder.invoice_info?.company_name && <p><strong>Razón Social:</strong> {localOrder.invoice_info.company_name}</p>}
                {seriesNum && <p><strong>N° Comprobante:</strong> <span className="font-mono font-bold text-emerald-700">{seriesNum}</span></p>}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
            <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider flex items-center text-brand-blue">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-brand-red" /> Dirección de Entrega
            </h4>
            <div className="space-y-1 text-gray-700">
              <p><strong>Método:</strong> {localOrder.shipping_method || 'Envío a Domicilio'}</p>
              <p><strong>Dirección:</strong> {localOrder.shipping_address?.address_line1 || 'Sin dirección'}</p>
              {localOrder.shipping_address?.address_line2 && <p><strong>Ref / Dpto:</strong> {localOrder.shipping_address.address_line2}</p>}
              <p><strong>Ubicación:</strong> {[localOrder.shipping_address?.district, localOrder.shipping_address?.province, localOrder.shipping_address?.department].filter(Boolean).join(', ') || 'Lima, Perú'}</p>
              {localOrder.notes && <p className="pt-1 text-amber-700 font-medium"><strong>Notas:</strong> {localOrder.notes}</p>}
            </div>
          </div>
        </div>

        {/* Modal Body: Payment & Financial Summary */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center">
            <CreditCard className="w-3.5 h-3.5 mr-1.5 text-brand-blue" /> Resumen de Pago & Transacción
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal Productos:</span>
              <span className="font-mono font-bold">S/ {Number(localOrder.subtotal).toFixed(2)}</span>
            </div>
            {Number(localOrder.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Descuento ({localOrder.coupon_code || 'Cupón'}):</span>
                <span className="font-mono font-bold">- S/ {Number(localOrder.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Costo de Envío:</span>
              <span className="font-mono font-bold">S/ {Number(localOrder.shipping_cost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-slate-200">
              <span>Monto Total:</span>
              <span className="text-brand-red font-mono">S/ {Number(localOrder.total).toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-gray-500 space-y-1 border-t border-slate-200 mt-2">
            <p><strong>Forma de Pago:</strong> {localOrder.payment_method === 'bank_transfer' ? 'Transferencia Bancaria Directa' : 'Mercado Pago'}</p>
            {localOrder.mp_payment_id && <p><strong>ID Pago Mercado Pago:</strong> <span className="font-mono text-gray-800 font-bold">{localOrder.mp_payment_id}</span></p>}
            {localOrder.preference_id && <p><strong>ID Preferencia MP:</strong> <span className="font-mono text-gray-400 text-[10px]">{localOrder.preference_id}</span></p>}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-200">
          {isInvoiceIssued && localOrder.invoice_pdf_url ? (
            <a
              href={localOrder.invoice_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Descargar / Imprimir Comprobante (PDF)</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
            </a>
          ) : isInvoiceIssued ? (
            <div className="w-full sm:w-auto text-xs text-emerald-700 font-bold flex items-center space-x-1.5 py-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Comprobante registrado: {seriesNum}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePendingPrint}
              className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 border border-gray-300"
            >
              <Printer className="w-4 h-4 text-gray-400" />
              <span>Comprobante Pendiente de Emisión</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-brand-dark hover:bg-gray-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-md cursor-pointer"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
});

export default OrderDetailsModal;
