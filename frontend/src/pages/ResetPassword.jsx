import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/reset-password', {
        token,
        password
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Tu contraseña ha sido restablecida exitosamente.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'El enlace de recuperación es inválido o ha expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto my-12 px-4 text-center">
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-gray-900">Enlace No Válido</h2>
          <p className="text-xs text-gray-500">No se proporcionó un token de restablecimiento de contraseña.</p>
          <button
            onClick={() => navigate('/forgot-password')}
            className="bg-brand-red text-white font-bold px-6 py-2.5 rounded-xl text-xs"
          >
            Solicitar nuevo enlace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex bg-brand-red text-white p-3.5 rounded-2xl shadow-md mb-2">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Restablecer Contraseña</h2>
          <p className="text-xs text-gray-500">Ingresa tu nueva contraseña para tu cuenta de SUPER Tech</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg ? (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="text-lg font-black text-emerald-900">¡Contraseña Restablecida!</h3>
            <p className="text-xs text-emerald-700 font-semibold">{successMsg}</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="bg-brand-red hover:bg-brand-red-hover text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-lg inline-block"
              >
                Iniciar Sesión Ahora
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-transform active:scale-95 text-sm"
            >
              {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
