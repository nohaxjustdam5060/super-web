import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Users, AlertTriangle, DollarSign, Package, ShieldCheck } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/admin/metrics')
      .then((res) => {
        if (res.data.success) {
          setMetrics(res.data.metrics);
          setRecentOrders(res.data.recentOrders || []);
          setLowStock(res.data.topLowStock || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center font-bold text-gray-500">Cargando métricas de administración...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-brand-dark text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex justify-between items-center">
        <div>
          <span className="text-brand-red-accent font-black text-xs uppercase tracking-widest">[ PANEL ADMINISTRATIVO SUPER ]</span>
          <h1 className="text-2xl font-black mt-1">Dashboard General de Métricas</h1>
        </div>
        <div className="flex space-x-3 text-xs font-bold">
          <Link to="/admin/products" className="bg-brand-red px-4 py-2 rounded-xl hover:bg-brand-red-hover transition-colors">
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

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-gray-900 text-base">Últimos Pedidos</h3>
          <div className="space-y-2 text-xs">
            {recentOrders.map((ord) => (
              <div key={ord.id} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center border border-gray-100">
                <div>
                  <p className="font-bold text-gray-900">#{ord.order_number}</p>
                  <p className="text-gray-500">{ord.user?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-brand-red">S/ {Number(ord.total).toFixed(2)}</p>
                  <span className="text-[10px] font-bold uppercase text-gray-600">{ord.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert List */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-gray-900 text-base text-amber-600 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" /> Productos con Stock Crítico
          </h3>
          <div className="space-y-2 text-xs">
            {lowStock.map((prod) => (
              <div key={prod.id} className="p-3 bg-amber-50/50 rounded-xl flex justify-between items-center border border-amber-100">
                <div>
                  <p className="font-bold text-gray-900 line-clamp-1">{prod.name}</p>
                  <p className="text-gray-500">SKU: {prod.sku}</p>
                </div>
                <span className="bg-amber-200 text-amber-900 font-black px-2.5 py-1 rounded-lg">
                  {prod.stock} unids restantes
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
