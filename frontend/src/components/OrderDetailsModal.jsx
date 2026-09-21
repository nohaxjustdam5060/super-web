import React, { memo, useState } from 'react';
import { 
  Package, X, Printer, User, MapPin, Calendar, CreditCard, Clock, Info,
  CheckCircle2, AlertTriangle, FileText, ExternalLink
} from 'lucide-react';

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

const OrderDetailsModal = memo(function OrderDetailsModal({ selectedOrder, loadingDetail, onClose }) {
  const [toastNotice, setToastNotice] = useState(null);

  if (!selectedOrder) return null;

  const isInvoiceIssued = selectedOrder.invoice_status === 'issued';
  const isInvoiceRejected = selectedOrder.invoice_status === 'rejected' || selectedOrder.invoice_status === 'failed';
  const seriesNum = (selectedOrder.invoice_series && selectedOrder.invoice_number) 
    ? `${selectedOrder.invoice_series}-${selectedOrder.invoice_number}` 
    : '';

  const handlePendingPrint = () => {
    setToastNotice('El comprobante electrónico aún no ha sido emitido o está pendiente de confirmación de pago.');
    setTimeout(() => {
      setToastNotice(null);
    }, 4000);
  };

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
              <h2 className="text-2xl font-black text-gray-900">Orden #{selectedOrder.order_number}</h2>
              {renderShippingBadge(selectedOrder.shipping_method, selectedOrder.shipping_address)}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                {new Date(selectedOrder.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                selectedOrder.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : selectedOrder.status === 'payment_review'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-gray-100 text-gray-600 border-gray-300'
              }`}>
                Estado: {selectedOrder.status === 'paid' ? 'Pagado' : selectedOrder.status === 'payment_review' ? 'En Revisión (24h)' : selectedOrder.status}
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

        {/* SUNAT / NubeFact Rejection or Failure Alert Box */}
        {isInvoiceRejected && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 sm:p-5 space-y-3 animate-fadeIn shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-100 text-red-700 rounded-xl flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-red-900 flex items-center">
                    ⚠️ Comprobante Rechazado por SUNAT / Fallo de Emisión
                  </h4>
                  {selectedOrder.invoice_response_code && (
                    <span className="bg-red-200 text-red-900 font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                      Código SUNAT: {selectedOrder.invoice_response_code}
                    </span>
                  )}
                </div>
                <p className="text-xs text-red-800 font-bold leading-relaxed">
                  {selectedOrder.invoice_error_message || 'El comprobante electrónico fue rechazado por el servicio de SUNAT / NubeFact.'}
                </p>
              </div>
            </div>

            {/* Summary of Fiscal Data Sent by Client for Fast Inspection */}
            <div className="bg-white/90 rounded-xl p-3.5 border border-red-200 text-xs space-y-2 text-gray-800">
              <p className="font-extrabold text-[11px] text-red-900 uppercase tracking-wider border-b border-red-100 pb-1">
                Datos Fiscales Enviados por el Cliente para Emisión:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500 font-semibold block">Tipo de Comprobante:</span>
                  <span className="font-bold uppercase text-brand-blue">
                    {selectedOrder.invoice_info?.invoice_type === 'factura' ? 'Factura Electrónica' : 'Boleta de Venta'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold block">
                    {selectedOrder.invoice_info?.document_type || (selectedOrder.invoice_info?.invoice_type === 'factura' ? 'RUC' : 'DNI')}:
                  </span>
                  <span className="font-mono font-bold text-gray-900 select-all">
                    {selectedOrder.invoice_info?.document_number || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold block">Razón Social / Nombre:</span>
                  <span className="font-bold text-gray-900 select-all">
                    {selectedOrder.invoice_info?.company_name || selectedOrder.shipping_address?.recipient_name || selectedOrder.user?.name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold block">Código Único / Ref NubeFact:</span>
                  <span className="font-mono font-bold text-gray-900 select-all">
                    {selectedOrder.order_number}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-500 font-semibold block">Domicilio Fiscal:</span>
                  <span className="font-medium text-gray-800 select-all">
                    {selectedOrder.invoice_info?.fiscal_address || selectedOrder.shipping_address?.address_line1 || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body: Products List */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider flex items-center text-brand-blue">
            <Package className="w-4 h-4 mr-1.5 text-brand-red" /> Productos del Pedido ({(selectedOrder.items || []).length})
          </h4>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 divide-y divide-gray-200/60 max-h-56 overflow-y-auto space-y-2">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-6 space-x-2 text-xs text-gray-500">
                <Clock className="w-4 h-4 animate-spin text-brand-blue" />
                <span>Cargando detalle e imágenes de productos...</span>
              </div>
            ) : (selectedOrder.items || []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 font-medium">No hay items registrados en el detalle de esta orden.</p>
            ) : (
              (selectedOrder.items || []).map((item) => {
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
              <p><strong>Cliente / Destinatario:</strong> {selectedOrder.shipping_address?.recipient_name || selectedOrder.user?.name || 'Cliente'}</p>
              {selectedOrder.user?.name && selectedOrder.shipping_address?.recipient_name && selectedOrder.user.name.trim().toLowerCase() !== selectedOrder.shipping_address.recipient_name.trim().toLowerCase() && (
                <p className="text-gray-500 text-[11px]"><strong>Titular de la cuenta:</strong> {selectedOrder.user.name}</p>
              )}
              <p><strong>Email:</strong> {selectedOrder.user?.email || 'No especificado'}</p>
              <p><strong>Teléfono:</strong> {selectedOrder.shipping_address?.phone || selectedOrder.user?.phone || 'No especificado'}</p>
              
              <div className="pt-2 border-t border-gray-200 mt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p><strong>Tipo:</strong> <span className="uppercase font-bold text-brand-blue">{selectedOrder.invoice_info?.invoice_type || 'Boleta'}</span></p>
                  {isInvoiceIssued ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-600" /> Aceptado por SUNAT
                    </span>
                  ) : isInvoiceRejected ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                      <AlertTriangle className="w-2.5 h-2.5 mr-1 text-red-600" /> SUNAT: Rechazado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                      Pendiente
                    </span>
                  )}
                </div>

                <p><strong>{selectedOrder.invoice_info?.document_type || 'DNI'}:</strong> <span className="font-mono font-bold text-gray-900">{selectedOrder.invoice_info?.document_number || '—'}</span></p>
                {selectedOrder.invoice_info?.company_name && <p><strong>Razón Social:</strong> {selectedOrder.invoice_info.company_name}</p>}
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
              <p><strong>Método:</strong> {selectedOrder.shipping_method || 'Envío a Domicilio'}</p>
              <p><strong>Dirección:</strong> {selectedOrder.shipping_address?.address_line1 || 'Sin dirección'}</p>
              {selectedOrder.shipping_address?.address_line2 && <p><strong>Ref / Dpto:</strong> {selectedOrder.shipping_address.address_line2}</p>}
              <p><strong>Ubicación:</strong> {[selectedOrder.shipping_address?.district, selectedOrder.shipping_address?.province, selectedOrder.shipping_address?.department].filter(Boolean).join(', ') || 'Lima, Perú'}</p>
              {selectedOrder.notes && <p className="pt-1 text-amber-700 font-medium"><strong>Notas:</strong> {selectedOrder.notes}</p>}
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
              <span className="font-mono font-bold">S/ {Number(selectedOrder.subtotal).toFixed(2)}</span>
            </div>
            {Number(selectedOrder.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Descuento ({selectedOrder.coupon_code || 'Cupón'}):</span>
                <span className="font-mono font-bold">- S/ {Number(selectedOrder.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Costo de Envío:</span>
              <span className="font-mono font-bold">S/ {Number(selectedOrder.shipping_cost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-slate-200">
              <span>Monto Total:</span>
              <span className="text-brand-red font-mono">S/ {Number(selectedOrder.total).toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-gray-500 space-y-1 border-t border-slate-200 mt-2">
            <p><strong>Forma de Pago:</strong> {selectedOrder.payment_method === 'bank_transfer' ? 'Transferencia Bancaria Directa' : 'Mercado Pago'}</p>
            {selectedOrder.mp_payment_id && <p><strong>ID Pago Mercado Pago:</strong> <span className="font-mono text-gray-800 font-bold">{selectedOrder.mp_payment_id}</span></p>}
            {selectedOrder.preference_id && <p><strong>ID Preferencia MP:</strong> <span className="font-mono text-gray-400 text-[10px]">{selectedOrder.preference_id}</span></p>}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-200">
          {isInvoiceIssued && selectedOrder.invoice_pdf_url ? (
            <a
              href={selectedOrder.invoice_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Descargar / Imprimir Comprobante (PDF)</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
            </a>
          ) : isInvoiceRejected ? (
            <div className="w-full sm:w-auto text-xs text-red-600 font-bold flex items-center space-x-1.5 py-1">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Emisión de comprobante bloqueada por rechazo de SUNAT</span>
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
            className="w-full sm:w-auto bg-brand-dark hover:bg-gray-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-md"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
});

export default OrderDetailsModal;
