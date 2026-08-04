import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, MapPin, LogOut, Clock, CheckCircle2, Truck, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import axiosClient from '../api/axiosClient';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    axiosClient.get('/orders')
      .then((res) => {
        if (res.data.success) {
          setOrders(res.data.orders || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingOrders(false));
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full">PAGADO</span>;
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-1 rounded-full">PENDIENTE DE PAGO</span>;
      case 'shipped':
        return <span className="bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-1 rounded-full">EN CAMINO</span>;
      case 'delivered':
        return <span className="bg-purple-100 text-purple-800 text-xs font-black px-2.5 py-1 rounded-full">ENTREGADO</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-black px-2.5 py-1 rounded-full">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-brand-red text-white font-black text-2xl rounded-2xl flex items-center justify-center shadow-lg">
            {user?.name?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{user?.name}</h1>
            <p className="text-xs text-gray-500">{user?.email} • Tel: {user?.phone || 'Sin registrar'}</p>
            <span className="inline-block bg-brand-blue-light text-brand-blue text-xs font-bold px-2.5 py-0.5 rounded-full mt-1">
              Rol: {user?.role?.toUpperCase()}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 font-bold px-4 py-2 rounded-xl text-xs flex items-center transition-colors border border-gray-200"
        >
          <LogOut className="w-4 h-4 mr-1.5" /> Cerrar Sesión
        </button>
      </div>

      {/* Orders Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <h2 className="text-xl font-black text-gray-900 flex items-center border-b border-gray-200 pb-4">
          <Package className="w-5 h-5 mr-2 text-brand-red" /> Historial de Pedidos ({orders.length})
        </h2>

        {loadingOrders ? (
          <div className="text-center text-gray-400 text-sm py-8">Cargando tus compras...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 space-y-2">
            <Package className="w-12 h-12 mx-auto text-gray-300 stroke-1" />
            <p className="font-bold text-gray-700">Aún no has realizado pedidos</p>
            <p className="text-xs text-gray-400">Tus compras con Mercado Pago aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => (
              <div key={ord.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-200 pb-3">
                  <div>
                    <span className="font-black text-sm text-gray-900">Orden #{ord.order_number}</span>
                    <p className="text-xs text-gray-500">Fecha: {new Date(ord.createdAt).toLocaleDateString('es-PE')}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(ord.status)}
                    <span className="text-lg font-black text-brand-red">S/ {Number(ord.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 text-xs text-gray-700 font-semibold">
                  {ord.items?.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>• {item.product_name} (x{item.quantity})</span>
                      <span>S/ {Number(item.total_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
