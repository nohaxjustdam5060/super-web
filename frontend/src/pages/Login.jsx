import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const [email, setEmail] = useState('cliente@supertech.com');
  const [password, setPassword] = useState('cliente123456');
  const [errorMsg, setErrorMsg] = useState('');
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const res = await login(email, password);
    if (res.success) {
      const fromPath = location.state?.from;
      if (fromPath) {
        navigate(fromPath, { replace: true });
      } else if (res.user.role === 'admin' || res.user.role === 'super_admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/profile', { replace: true });
      }
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex bg-brand-red text-white p-3 rounded-2xl shadow-md mb-2">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Iniciar Sesión</h2>
          <p className="text-xs text-gray-500">Accede a tus pedidos, direcciones y lista de deseos en SUPER Tech</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-700">Contraseña</label>
              <Link to="/forgot-password" className="text-xs font-bold text-brand-blue hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-transform active:scale-95 text-sm"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="bg-gray-50 p-4 rounded-xl text-xs space-y-1 border border-gray-200">
          <p className="font-bold text-gray-700">Cuentas Demo para Prueba Rapida:</p>
          <p><span className="text-brand-blue font-semibold">Cliente:</span> cliente@supertech.com / cliente123456</p>
          <p><span className="text-brand-red font-semibold">Admin:</span> admin@supertech.com / admin123456</p>
        </div>

        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          ¿No tienes una cuenta aún?{' '}
          <Link to="/register" state={location.state} className="text-brand-red font-bold hover:underline">
            Regístrate aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
