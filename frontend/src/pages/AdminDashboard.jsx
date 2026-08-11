import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Users, AlertTriangle, DollarSign, Package, ShieldCheck, CheckCircle2, Clock, FileText, Building2, CreditCard, ExternalLink } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

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
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-extrabold text-gray-900 text-lg flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-brand-red" /> Gestión de Pedidos & Verificación de Pagos
            </h3>
            <p className="text-xs text-gray-500">Revisa órdenes recibidas, datos de envío, comprobantes y valida transferencias bancarias</p>
          </div>
          <span className="text-xs font-extrabold text-brand-blue bg-blue-50 px-3 py-1 rounded-full">
            Total: {orders.length} órdenes
          </span>
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
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-400 font-semibold">
                    No se registran órdenes creadas por el momento.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
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
                        <p className="font-bold text-gray-900 truncate">{ord.shipping_method || 'Envío a Domicilio'}</p>
                        <p className="text-[10px] text-gray-500 truncate">
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
                        {isReview && isBankTransfer ? (
                          <button
                            onClick={() => handleVerifyBankTransfer(ord.id)}
                            disabled={verifyingId === ord.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-[11px] inline-flex items-center space-x-1 shadow transition-all active:scale-95 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{verifyingId === ord.id ? 'Verificando...' : 'Verificar Pago'}</span>
                          </button>
                        ) : isPaid ? (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-end">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verificado
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">En Proceso</span>
                        )}
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
    </div>
  );
}
