import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  LayoutDashboard, ShoppingBag, Users, AlertTriangle, DollarSign, Package, 
  ShieldCheck, CheckCircle2, Clock, FileText, Building2, CreditCard, 
  ExternalLink, Filter, Truck, Eye, X, Printer, User, MapPin, Calendar,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import OrderDetailsModal from '../components/OrderDetailsModal';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const tableRef = useRef(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [shippingFilter, setShippingFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Cached Queries with 60s stale time (Instant 0ms transitions on return)
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['adminMetrics'],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/metrics');
      return res.data;
    },
    staleTime: 60000
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['adminOrders', page, limit, shippingFilter],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/orders', {
        params: { page, limit, shippingFilter }
      });
      return res.data;
    },
    staleTime: 60000
  });

  const metrics = metricsData?.metrics || null;
  const lowStock = metricsData?.topLowStock || [];
  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination || { total: orders.length, totalPages: 1, currentPage: page, limit };
  const totalOrdersCount = pagination.total || 0;
  const totalPages = pagination.totalPages || 1;
  const currentPage = pagination.currentPage || page;
  const startIndex = totalOrdersCount > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endIndex = Math.min(currentPage * limit, totalOrdersCount);

  const handleShippingFilterChange = (e) => {
    setShippingFilter(e.target.value);
    setPage(1);
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // Open modal instantly and fetch detailed items on-demand
  const handleOpenDetail = useCallback(async (ord) => {
    setSelectedOrder(ord);
    setLoadingDetail(true);
    try {
      const res = await axiosClient.get(`/admin/orders/${ord.id}`);
      if (res.data.success && res.data.order) {
        setSelectedOrder(res.data.order);
      }
    } catch (err) {
      console.error('[AdminDashboard] Error fetching order detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  const handleVerifyBankTransfer = async (orderId) => {
    if (!window.confirm('¿Confirmar que has verificado la transferencia bancaria para esta orden?')) return;

    setVerifyingId(orderId);
    try {
      const res = await axiosClient.put(`/orders/${orderId}/verify-bank-transfer`);
      if (res.data.success) {
        alert('¡Transferencia bancaria verificada exitosamente! La orden ha sido marcada como PAGADA.');
        queryClient.invalidateQueries({ queryKey: ['adminMetrics'] });
        queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => ({ ...prev, status: 'paid' }));
        }
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Bar */}
      <div className="bg-brand-dark text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-brand-red-accent font-black text-xs uppercase tracking-widest">[ PANEL ADMINISTRATIVO SUPER ]</span>
          <h1 className="text-2xl font-black mt-1">Dashboard & Gestión de Pedidos</h1>
        </div>
        <div className="flex space-x-3 text-xs font-bold w-full sm:w-auto">
          <Link
            to="/admin/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Gestionar Productos</span>
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
      <div ref={tableRef} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
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
                onChange={handleShippingFilterChange}
                className="bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold rounded-xl p-2 focus:ring-2 focus:ring-brand-blue outline-none cursor-pointer"
              >
                <option value="all">Todos los envíos</option>
                <option value="pickup">Recojo en Tienda</option>
                <option value="lima_callao">Envío a Lima y Callao</option>
                <option value="provincia_express">Envío a Provincia/express</option>
              </select>
            </div>
            
            <span className="text-xs font-extrabold text-brand-blue bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 whitespace-nowrap">
              Total: {totalOrdersCount} órdenes
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
              {ordersLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">
                    <div className="flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin text-brand-blue" />
                      <span>Cargando órdenes de la tienda...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
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
                            onClick={() => handleOpenDetail(ord)}
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

        {/* Pagination Footer Controls */}
        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-gray-600">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <span>Mostrar:</span>
              <select
                value={limit}
                onChange={handleLimitChange}
                className="bg-white border border-gray-300 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
              >
                <option value={10}>10 por pág.</option>
                <option value={20}>20 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>
            </div>
            <span className="text-gray-500 font-medium">
              Mostrando <strong className="text-gray-900">{startIndex} - {endIndex}</strong> de <strong className="text-gray-900">{totalOrdersCount}</strong> pedidos
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1.5 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all cursor-pointer flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-0.5" />
                <span>Anterior</span>
              </button>

              {getPageNumbers().map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => typeof p === 'number' && handlePageChange(p)}
                  disabled={p === '...'}
                  className={`w-8 h-8 rounded-xl font-black transition-all flex items-center justify-center cursor-pointer ${
                    p === currentPage
                      ? 'bg-brand-red text-white shadow-md'
                      : p === '...'
                      ? 'bg-transparent text-gray-400 cursor-default'
                      : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all cursor-pointer flex items-center"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          )}
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
      <OrderDetailsModal 
        selectedOrder={selectedOrder} 
        loadingDetail={loadingDetail} 
        onClose={handleCloseModal} 
      />
    </div>
  );
}
