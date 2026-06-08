import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';
import { useI18n } from '../lib/i18n';

export default function Register() {
  const { t } = useI18n();
  const a = t.auth;

  const step1Schema = z.object({
    email: z.string().email(a.emailInvalid),
    password: z.string().min(8, a.passwordMin),
  });
  const step2Schema = z.object({
    name: z.string().min(1, a.nameRequired).max(50),
    tdahType: z.enum(['INATTENTIF', 'HYPERACTIF', 'COMBINE', 'NON_SPECIFIE', 'PREFERE_NE_PAS_DIRE']).optional(),
  });
  type Step1 = z.infer<typeof step1Schema>;
  type Step2 = z.infer<typeof step2Schema>;

  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAppStore(s => s.setAuth);
  const navigate = useNavigate();

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) });

  const onStep1 = (data: Step1) => { setStep1Data(data); setStep(2); };

  const onStep2 = async (data: Step2) => {
    if (!step1Data) return;
    setLoading(true); setError('');
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await api.post('/auth/register', { ...step1Data, ...data, timezone });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/onboarding');
    } catch (e: any) {
      setError(e.response?.data?.error || a.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const tdahOptions = Object.entries(a.tdahTypes).filter(([k]) => k !== 'none');

  return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-sm p-10 w-full max-w-md"
      >
        {/* Logo + étapes */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-black text-teal-500" style={{ fontFamily: 'DM Sans' }}>🧠 FocusBrain</Link>
          <div className="flex justify-center gap-2 mt-5">
            {[1, 2].map(n => (
              <div key={n} className={`h-1.5 w-14 rounded-full transition-colors duration-300 ${n <= step ? 'bg-teal-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-gray-400 text-sm mt-2">{a.step} {step} {a.of} 2</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={form1.handleSubmit(onStep1)}
              className="space-y-5"
            >
              <h2 className="text-2xl font-black text-gray-900">{a.step1Title}</h2>

              <div>
                <label className="block font-semibold text-sm text-gray-700 mb-2">{a.emailLabel}</label>
                <input
                  {...form1.register('email')} type="email" placeholder={a.emailPlaceholder} autoFocus
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none transition-colors text-base"
                />
                {form1.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                    <span>⚠️</span> {form1.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-sm text-gray-700 mb-2">{a.passwordLabel}</label>
                <input
                  {...form1.register('password')} type="password" placeholder={a.passwordMin}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none transition-colors text-base"
                />
                {form1.formState.errors.password && (
                  <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                    <span>⚠️</span> {form1.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button type="submit" className="w-full bg-teal-500 text-white font-black py-4 rounded-xl text-lg hover:bg-teal-600 transition-colors">
                {a.continueBtn}
              </button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={form2.handleSubmit(onStep2)}
              className="space-y-5"
            >
              <h2 className="text-2xl font-black text-gray-900">{a.step2Title}</h2>

              <div>
                <label className="block font-semibold text-sm text-gray-700 mb-2">{a.nameLabel}</label>
                <input
                  {...form2.register('name')} type="text" placeholder={a.namePlaceholder} autoFocus
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none transition-colors text-base"
                />
                {form2.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1.5">⚠️ {form2.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-sm text-gray-700 mb-1">
                  {a.tdahLabel} <span className="text-gray-400 font-normal">{a.tdahOptional}</span>
                </label>
                <select
                  {...form2.register('tdahType')}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none transition-colors text-base bg-white"
                >
                  <option value="">{a.tdahTypes.none}</option>
                  {tdahOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
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
                {loading ? t.common.loading : a.createBtn}
              </button>

              <button type="button" onClick={() => setStep(1)} className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors py-1">
                {t.common.back}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-center text-gray-400 text-sm mt-6">
          {a.hasAccount}{' '}
          <Link to="/login" className="text-teal-600 font-bold hover:underline">{a.connect}</Link>
        </p>
      </motion.div>
    </div>
  );
}
