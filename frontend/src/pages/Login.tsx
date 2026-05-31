import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';
import { useI18n } from '../lib/i18n';

export default function Login() {
  const { t } = useI18n();
  const a = t.auth;
  const schema = z.object({
    email: z.string().email(a.emailInvalid),
    password: z.string().min(1, 'Requis'),
  });
  type Form = z.infer<typeof schema>;

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAppStore(s => s.setAuth);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.error || a.errorCredentials);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-sm p-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-black text-teal-500" style={{ fontFamily: 'DM Sans' }}>🧠 FocusBrain</Link>
          <h2 className="text-2xl font-black mt-5 text-gray-900">{a.loginTitle}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block font-semibold text-sm text-gray-700 mb-2">{a.emailLabel}</label>
            <input
              {...register('email')} type="email" placeholder={a.emailPlaceholder} autoFocus
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none transition-colors text-base"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1.5">⚠️ {errors.email.message}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-sm text-gray-700">{a.passwordLabel}</label>
              <Link to="/forgot-password" className="text-teal-600 text-sm hover:underline">{a.forgot}</Link>
            </div>
            <input
              {...register('password')} type="password"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none transition-colors text-base"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1.5">⚠️ {errors.password.message}</p>}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-600 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-teal-500 text-white font-black py-4 rounded-xl text-lg hover:bg-teal-600 transition-colors disabled:opacity-60"
          >
            {loading ? t.common.loading : a.loginBtn}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          {a.noAccount}{' '}
          <Link to="/register" className="text-teal-600 font-bold hover:underline">{a.free}</Link>
        </p>
      </motion.div>
    </div>
  );
}
