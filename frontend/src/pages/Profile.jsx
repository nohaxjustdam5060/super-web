import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Package, LogOut, KeyRound, Lock, CheckCircle2, AlertCircle, ShoppingBag, Truck, CreditCard } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import axiosClient from '../api/axiosClient';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Change Password Form State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

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

  // Defensive filtering: exclude cancelled, abandoned, failed, or pending orders from customer view
  const activeOrders = useMemo(() => {
    const EXCLUDED_STATUSES = ['cancelled', 'canceled', 'abandoned', 'failed', 'pending'];
    return (orders || []).filter(
      (ord) => ord && ord.status && !EXCLUDED_STATUSES.includes(ord.status.toLowerCase().trim())
    );
  }, [orders]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'La confirmación de la contraseña no coincide.' });
      return;
    }

    setLoadingPassword(true);
    try {
      const res = await axiosClient.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });

      if (res.data.success) {
        setPasswordMsg({ type: 'success', text: res.data.message || 'Contraseña actualizada correctamente.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error al cambiar la contraseña. Verifica tu contraseña actual.'
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap">PAGADO</span>;
      case 'payment_review':
        return <span className="bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap">EN REVISIÓN</span>;
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap">PENDIENTE</span>;
      case 'shipped':
        return <span className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap">EN CAMINO</span>;
      case 'delivered':
        return <span className="bg-purple-100 text-purple-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap">ENTREGADO</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap">CANCELADO</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-red text-white font-black text-xl sm:text-2xl rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            {user?.name?.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 truncate">{user?.name}</h1>
              {/* Bloque responsivo: apilado en móviles (<640px) y en una sola línea desde sm */}
              <div className="text-[11px] sm:text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center min-w-0 mt-0.5">
                <span className="truncate">{user?.email}</span>
                <span className="hidden sm:inline mx-1.5">•</span>
                <span className="truncate">Tel: {user?.phone || 'Sin registrar'}</span>
              </div>
            
            <span className="inline-block bg-brand-blue-light text-brand-blue text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full mt-1">
              Rol: {user?.role?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="flex-1 sm:flex-initial bg-gray-100 hover:bg-slate-200 text-gray-800 font-bold px-3 sm:px-4 py-2 rounded-xl text-xs flex items-center justify-center transition-colors border border-gray-200"
          >
            <KeyRound className="w-4 h-4 mr-1.5 text-brand-red flex-shrink-0" />
            <span className="truncate">{showPasswordForm ? 'Ocultar Cambio' : 'Cambiar Contraseña'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 sm:flex-initial bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 sm:px-4 py-2 rounded-xl text-xs flex items-center justify-center transition-colors border border-red-200"
          >
            <LogOut className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Change Password Form Section */}
      {showPasswordForm && (
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-md max-w-xl mx-auto space-y-4">
          <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center border-b border-gray-100 pb-3">
            <Lock className="w-5 h-5 mr-2 text-brand-red flex-shrink-0" /> Cambiar Contraseña
          </h3>

          {passwordMsg.text && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
              passwordMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {passwordMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Contraseña Actual</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nueva Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPassword}
              className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3 px-4 rounded-xl shadow transition-transform active:scale-95 text-xs"
            >
              {loadingPassword ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        </div>
      )}

      {/* Orders Section */}
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center border-b border-gray-200 pb-3 sm:pb-4">
          <Package className="w-5 h-5 mr-2 text-brand-red flex-shrink-0" /> Historial de Pedidos ({activeOrders.length})
        </h2>

        {loadingOrders ? (
          <div className="text-center text-gray-400 text-xs sm:text-sm py-8">Cargando tus compras...</div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-10 sm:py-12 text-gray-500 space-y-3">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 stroke-1" />
            <div className="space-y-1">
              <p className="font-bold text-gray-700 text-sm sm:text-base">Aún no tienes pedidos registrados</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Explora nuestro catálogo para encontrar laptops, componentes y tecnología con garantía oficial.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/catalog"
                className="inline-flex items-center space-x-2 bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Ir al Catálogo de Productos</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {activeOrders.map((ord) => (
              <div key={ord.id} className="p-4 sm:p-5 md:p-6 bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-200 space-y-3 sm:space-y-4 shadow-sm hover:border-gray-300 transition-colors">
                {/* Header Card: Order ID, Date, Status, Total (Stacking on mobile, side-by-side on sm+) */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 sm:gap-4 border-b border-gray-200 pb-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-black text-sm sm:text-base text-gray-900 tracking-tight break-all block">
                      Orden #{ord.order_number}
                    </span>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      Fecha: {new Date(ord.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-200/60">
                    <div className="flex-shrink-0">
                      {getStatusBadge(ord.status)}
                    </div>
                    <div className="text-right">
                      <span className="text-base sm:text-lg md:text-xl font-black text-brand-red whitespace-nowrap">
                        S/ {Number(ord.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items List with Fluid Multi-line Wrapping */}
                <div className="space-y-2">
                  <p className="text-[10px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">
                    Productos del Pedido
                  </p>
                  <div className="divide-y divide-gray-200/70 border-t border-b border-gray-200/70 py-1">
                    {ord.items?.map((item) => (
                      <div key={item.id} className="py-2 flex flex-col xs:flex-row sm:flex-row justify-between sm:items-center gap-1.5 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex items-start space-x-2 min-w-0 flex-1">
                          <span className="text-brand-red font-black text-sm leading-none flex-shrink-0 mt-0.5">•</span>
                          <p className="font-semibold text-gray-800 break-words leading-snug">
                            {item.product_name}
                            <span className="inline-block font-bold text-gray-500 text-[11px] sm:text-xs ml-1.5 px-1.5 py-0.5 bg-gray-200/60 rounded">
                              x{item.quantity}
                            </span>
                          </p>
                        </div>
                        <div className="flex justify-between sm:justify-end items-center pl-4 sm:pl-0 flex-shrink-0">
                          <span className="sm:hidden text-[11px] text-gray-400 font-medium">Subtotal:</span>
                          <span className="font-bold text-gray-900 text-xs sm:text-sm whitespace-nowrap">
                            S/ {Number(item.total_price).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Footer Details (Shipping method / Payment method / WhatsApp Help) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] sm:text-xs text-gray-500">
                  <div className="flex flex-wrap items-center gap-2">
                    {ord.shipping_method && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 font-medium">
                        <Truck className="w-3.5 h-3.5 text-gray-800 flex-shrink-0" strokeWidth={1.8} />
                        <span>{ord.shipping_method}</span>
                      </span>
                    )}
                    {ord.payment_method && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 font-medium capitalize">
                        <CreditCard className="w-3.5 h-3.5 text-gray-800 flex-shrink-0" strokeWidth={1.8} />
                        <span>
                          {ord.payment_method === 'bank_transfer' ? 'Transferencia Bancaria' : 'Mercado Pago'}
                        </span>
                      </span>
                    )}
                  </div>
                  <a
                    href={`https://wa.me/51978529826?text=${encodeURIComponent(`Hola SUPERLAPTOP, tengo una consulta sobre mi orden #${ord.order_number}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-brand-blue hover:text-brand-red font-bold transition-colors self-start sm:self-auto"
                  >
                    Consultar por WhatsApp →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
