import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';
import { useI18n } from '../lib/i18n';
import { Brain, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
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
        className="bg-white rounded-3xl shadow-card p-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-black text-teal-600 inline-flex items-center gap-2" style={{ fontFamily: 'DM Sans' }}>
            <Brain size={24} strokeWidth={2} className="text-teal-600" /> FocusBrain
          </Link>
          <h2 className="text-2xl font-black mt-5 text-ink-900">{a.loginTitle}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block font-semibold text-sm text-ink-700 mb-2">{a.emailLabel}</label>
            <div className="relative">
              <Mail size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
              <input
                {...register('email')} type="email" placeholder={a.emailPlaceholder} autoFocus
                className="w-full border-2 border-line rounded-xl pl-11 pr-4 py-3 focus:border-teal-500 focus:outline-none transition-colors text-base"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                <AlertCircle size={14} strokeWidth={2} /> {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-sm text-ink-700">{a.passwordLabel}</label>
              {/* Lien « mot de passe oublié » retiré : la fonctionnalité n'existe pas encore
                  côté serveur — le remettre quand l'envoi d'email de réinitialisation sera implémenté */}
            </div>
            <div className="relative">
              <Lock size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
              <input
                {...register('password')} type={showPassword ? 'text' : 'password'}
                className="w-full border-2 border-line rounded-xl pl-11 pr-11 py-3 focus:border-teal-500 focus:outline-none transition-colors text-base"
              />
              <button
                type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
                aria-label={showPassword ? a.passwordLabel : a.passwordLabel}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                <AlertCircle size={14} strokeWidth={2} /> {errors.password.message}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} strokeWidth={2} className="shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-teal-500 text-white font-black py-4 rounded-xl text-lg hover:bg-teal-600 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {loading ? t.common.loading : a.loginBtn}
            {!loading && <ArrowRight size={20} strokeWidth={2.5} />}
          </button>
        </form>

        <p className="text-center text-ink-400 text-sm mt-6">
          {a.noAccount}{' '}
          <Link to="/register" className="text-teal-600 font-bold hover:underline">{a.free}</Link>
        </p>
      </motion.div>
    </div>
  );
}
