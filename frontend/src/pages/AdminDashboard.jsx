import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, Users, AlertTriangle, DollarSign, Package, 
  ShieldCheck, CheckCircle2, Clock, FileText, Building2, CreditCard, 
  ExternalLink, Filter, Truck, Eye, X, Printer, User, MapPin, Calendar 
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [shippingFilter, setShippingFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchAdminData = () => {
    setLoading(true);
    Promise.all([
      axiosClient.get('/admin/metrics'),
      axiosClient.get('/admin/orders')
    ])
      .then(([metricsRes, ordersRes]) => {
        if (metricsRes.data.success) {
          setMetrics(metricsRes.data.metrics);
          setLowStock(metricsRes.data.topLowStock || []);
        }
        if (ordersRes.data.success) {
          setOrders(ordersRes.data.orders || []);
        }
      })
      .catch((err) => console.error('[AdminDashboard] Error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleVerifyBankTransfer = async (orderId) => {
    if (!window.confirm('¿Confirmar que has verificado la transferencia bancaria para esta orden?')) return;

    setVerifyingId(orderId);
    try {
      const res = await axiosClient.put(`/orders/${orderId}/verify-bank-transfer`);
      if (res.data.success) {
        alert('¡Transferencia bancaria verificada exitosamente! La orden ha sido marcada como PAGADA.');
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al verificar la transferencia bancaria.');
    } finally {
      setVerifyingId(null);
    }
  };

  // Render distinctive color badges for shipping methods
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

    // Default: Envío a Lima y Callao / Express
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
        Envío a Lima y Callao
      </span>
    );
  };

  // Filter orders by selected shipping method
  const filteredOrders = orders.filter((ord) => {
    if (shippingFilter === 'all') return true;

    const sm = (ord.shipping_method || '').toLowerCase();
    const dept = (ord.shipping_address?.department || '').toLowerCase();

    const isPickup = sm.includes('recojo') || sm.includes('pickup') || sm.includes('tienda');
    const isProvincia = sm.includes('provincia') || sm.includes('agencia') || (dept && !dept.includes('lima') && !dept.includes('callao'));

    if (shippingFilter === 'pickup') {
      return isPickup;
    }

    if (shippingFilter === 'provincia_express') {
      return isProvincia && !isPickup;
    }

    if (shippingFilter === 'lima_callao') {
      return !isPickup && !isProvincia;
    }

    return true;
  });

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center font-bold text-gray-500">Cargando panel de administración...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Bar */}
      <div className="bg-brand-dark text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-brand-red-accent font-black text-xs uppercase tracking-widest">[ PANEL ADMINISTRATIVO SUPER ]</span>
          <h1 className="text-2xl font-black mt-1">Dashboard & Gestión de Pedidos</h1>
        </div>
        <div className="flex space-x-3 text-xs font-bold">
          <Link to="/admin/products" className="bg-brand-red px-5 py-2.5 rounded-xl hover:bg-brand-red-hover transition-colors shadow">
            Gestionar Productos
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Ventas Totales</span>
            <DollarSign className="w-6 h-6 bg-emerald-50 p-1 rounded-lg" />
          </div>
          <p className="text-3xl font-black text-gray-900">S/ {metrics?.totalRevenue || '0.00'}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-brand-blue">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Órdenes Generadas</span>
            <ShoppingBag className="w-6 h-6 bg-blue-50 p-1 rounded-lg" />
          </div>
          <p className="text-3xl font-black text-gray-900">{metrics?.ordersCount || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Clientes Registrados</span>
            <Users className="w-6 h-6 bg-indigo-50 p-1 rounded-lg" />
          </div>
          <p className="text-3xl font-black text-gray-900">{metrics?.totalUsers || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Alerta Stock Bajo</span>
            <AlertTriangle className="w-6 h-6 bg-amber-50 p-1 rounded-lg" />
          </div>
          <p className="text-3xl font-black text-amber-600">{metrics?.lowStockProducts || 0}</p>
        </div>
      </div>

      {/* Orders Management Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-extrabold text-gray-900 text-lg flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-brand-red" /> Gestión de Pedidos & Verificación de Pagos
            </h3>
            <p className="text-xs text-gray-500">Revisa órdenes recibidas, datos de envío, comprobantes y valida transferencias bancarias</p>
          </div>
          
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={shippingFilter}
                onChange={(e) => setShippingFilter(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold rounded-xl p-2 focus:ring-2 focus:ring-brand-blue outline-none cursor-pointer"
              >
                <option value="all">Todos los envíos</option>
                <option value="pickup">Recojo en Tienda</option>
                <option value="lima_callao">Envío a Lima y Callao</option>
                <option value="provincia_express">Envío a Provincia/express</option>
              </select>
            </div>
            
            <span className="text-xs font-extrabold text-brand-blue bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 whitespace-nowrap">
              Total: {filteredOrders.length} {filteredOrders.length !== orders.length ? `/ ${orders.length}` : ''} órdenes
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 font-black text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="p-3 whitespace-nowrap">N° Orden</th>
                <th className="p-3 whitespace-nowrap">Cliente</th>
                <th className="p-3 whitespace-nowrap">Envío / Dirección</th>
                <th className="p-3 whitespace-nowrap">Comprobante</th>
                <th className="p-3 whitespace-nowrap">Forma de Pago</th>
                <th className="p-3 whitespace-nowrap">Monto Total</th>
                <th className="p-3 text-center whitespace-nowrap">Estado</th>
                <th className="p-3 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-400 font-semibold">
                    {orders.length === 0 ? 'No se registran órdenes creadas por el momento.' : 'No hay órdenes que coincidan con el filtro de envío seleccionado.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const addr = ord.shipping_address || {};
                  const inv = ord.invoice_info || {};
                  const isBankTransfer = ord.payment_method === 'bank_transfer';
                  const isReview = ord.status === 'payment_review';
                  const isPaid = ord.status === 'paid';

                  return (
                    <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                        #{ord.order_number}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <p className="font-bold text-gray-900">{ord.user?.name || addr.recipient_name || 'Cliente'}</p>
                        <p className="text-[10px] text-gray-400">{ord.user?.email || addr.phone}</p>
                      </td>
                      <td className="p-3 max-w-xs truncate">
                        <div className="mb-1">
                          {renderShippingBadge(ord.shipping_method, addr)}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate font-medium">
                          {addr.address_line1 ? `${addr.address_line1}, ${addr.district || ''} - ${addr.department || ''}` : 'Sin dirección'}
                        </p>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-gray-900 uppercase">
                          {inv.invoice_type || 'Boleta'}
                        </span>
                        <span className="text-[10px] text-gray-500 block font-mono">
                          {inv.document_type || 'DNI'}: {inv.document_number || '—'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                          isBankTransfer
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-blue-50 text-blue-800 border-blue-300'
                        }`}>
                          {isBankTransfer ? <Building2 className="w-3 h-3 mr-1" /> : <CreditCard className="w-3 h-3 mr-1" />}
                          {isBankTransfer ? 'Transferencia' : 'Mercado Pago'}
                        </span>
                      </td>
                      <td className="p-3 font-black text-brand-red whitespace-nowrap text-sm">
                        S/ {Number(ord.total).toFixed(2)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isReview
                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                            : 'bg-gray-100 text-gray-600 border-gray-300'
                        }`}>
                          {isPaid ? 'Pagado' : isReview ? 'En Revisión (24h)' : ord.status}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="bg-slate-100 hover:bg-slate-200 text-gray-800 font-extrabold px-2.5 py-1.5 rounded-xl text-[11px] inline-flex items-center space-x-1 transition-all active:scale-95 border border-slate-200"
                            title="Ver detalle completo de la orden"
                          >
                            <Eye className="w-3.5 h-3.5 text-brand-blue" />
                            <span>Ver detalle</span>
                          </button>

                          {isReview && isBankTransfer && (
                            <button
                              type="button"
                              onClick={() => handleVerifyBankTransfer(ord.id)}
                              disabled={verifyingId === ord.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-[11px] inline-flex items-center space-x-1 shadow transition-all active:scale-95 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{verifyingId === ord.id ? 'Verificando...' : 'Verificar Pago'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock Alert List */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-gray-900 text-base text-amber-600 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" /> Productos con Stock Crítico
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {lowStock.map((prod) => (
            <div key={prod.id} className="p-3 bg-amber-50/50 rounded-2xl flex justify-between items-center border border-amber-100">
              <div>
                <p className="font-bold text-gray-900 line-clamp-1">{prod.name}</p>
                <p className="text-gray-500">SKU: {prod.sku}</p>
              </div>
              <span className="bg-amber-200 text-amber-900 font-black px-2.5 py-1 rounded-lg flex-shrink-0">
                {prod.stock} unids restantes
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-gray-200 shadow-2xl overflow-hidden my-8 space-y-6 p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h2 className="text-2xl font-black text-gray-900">Orden #{selectedOrder.order_number}</h2>
                  {renderShippingBadge(selectedOrder.shipping_method, selectedOrder.shipping_address)}
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-500 font-medium">
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
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Products List */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider flex items-center text-brand-blue">
                <Package className="w-4 h-4 mr-1.5 text-brand-red" /> Productos del Pedido ({(selectedOrder.items || []).length})
              </h4>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 divide-y divide-gray-200/60 max-h-56 overflow-y-auto space-y-2">
                {(selectedOrder.items || []).length === 0 ? (
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
                            alt={item.product_name}
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
                  <p><strong>Cliente:</strong> {selectedOrder.user?.name || selectedOrder.shipping_address?.recipient_name || 'Cliente'}</p>
                  <p><strong>Email:</strong> {selectedOrder.user?.email || 'No especificado'}</p>
                  <p><strong>Teléfono:</strong> {selectedOrder.shipping_address?.phone || selectedOrder.user?.phone || 'No especificado'}</p>
                  <div className="pt-2 border-t border-gray-200 mt-2 space-y-1">
                    <p><strong>Tipo Comprobante:</strong> <span className="uppercase font-bold text-brand-blue">{selectedOrder.invoice_info?.invoice_type || 'Boleta'}</span></p>
                    <p><strong>{selectedOrder.invoice_info?.document_type || 'DNI'}:</strong> <span className="font-mono font-bold text-gray-900">{selectedOrder.invoice_info?.document_number || '—'}</span></p>
                    {selectedOrder.invoice_info?.company_name && <p><strong>Razón Social:</strong> {selectedOrder.invoice_info.company_name}</p>}
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
                <p><strong>Forma de Pago:</strong> {selectedOrder.payment_method === 'bank_transfer' ? 'Transferencia Bancaria Directa' : 'Mercado Pago (Checkout Pro)'}</p>
                {selectedOrder.mp_payment_id && <p><strong>ID Pago Mercado Pago:</strong> <span className="font-mono text-gray-800 font-bold">{selectedOrder.mp_payment_id}</span></p>}
                {selectedOrder.preference_id && <p><strong>ID Preferencia MP:</strong> <span className="font-mono text-gray-400 text-[10px]">{selectedOrder.preference_id}</span></p>}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => alert('La impresión de comprobantes en PDF estará disponible cuando se habilite el guardado en base de datos de la tabla invoices.')}
                className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 border border-gray-300"
              >
                <Printer className="w-4 h-4 text-brand-blue" />
                <span>Imprimir Guía de Despacho / Comprobante</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full sm:w-auto bg-brand-dark hover:bg-gray-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-md"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
