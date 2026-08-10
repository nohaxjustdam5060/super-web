import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await axiosClient.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
      setSubmitted(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex bg-brand-red/10 text-brand-red p-3.5 rounded-2xl border border-brand-red/20 shadow-sm mb-2">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">¿Olvidaste tu contraseña?</h2>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Ingresa tu correo electrónico registrado y te enviaremos un enlace seguro para restablecerla.
          </p>
        </div>

        {submitted ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-emerald-900 leading-relaxed">
              {message}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center text-xs font-bold text-brand-blue hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Volver a Iniciar Sesión
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@supertech.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-transform active:scale-95 text-sm"
            >
              {loading ? 'Enviando...' : 'Enviar Instrucciones'}
            </button>
          </form>
        )}

        {!submitted && (
          <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
            <Link to="/login" className="text-brand-blue font-bold hover:underline flex items-center justify-center">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Volver a Iniciar Sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
