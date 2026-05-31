import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';

const step1Schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
});

const step2Schema = z.object({
  name: z.string().min(1, 'Prénom requis').max(50),
  tdahType: z.enum(['INATTENTIF', 'HYPERACTIF', 'COMBINE', 'NON_SPECIFIE', 'PREFERE_NE_PAS_DIRE']).optional(),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

const tdahOptions = [
  { value: 'INATTENTIF', label: 'Inattentif (ADD)' },
  { value: 'HYPERACTIF', label: 'Hyperactif-Impulsif' },
  { value: 'COMBINE', label: 'Combiné' },
  { value: 'NON_SPECIFIE', label: 'Non spécifié' },
  { value: 'PREFERE_NE_PAS_DIRE', label: 'Préfère ne pas dire' },
];

export default function Register() {
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAppStore(s => s.setAuth);
  const navigate = useNavigate();

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) });

  const onStep1 = (data: Step1) => {
    setStep1Data(data);
    setStep(2);
  };

  const onStep2 = async (data: Step2) => {
    if (!step1Data) return;
    setLoading(true);
    setError('');
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await api.post('/auth/register', { ...step1Data, ...data, timezone });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <span className="text-3xl font-black text-teal-500" style={{ fontFamily: 'DM Sans' }}>🧠 FocusBrain</span>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2].map(n => (
              <div key={n} className={`h-2 w-12 rounded-full transition-colors ${n <= step ? 'bg-teal-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-2">Étape {step} sur 2</p>
        </div>

        {step === 1 && (
          <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-5">
            <h2 className="text-2xl font-bold">Ton email et mot de passe</h2>
            <div>
              <label className="block font-medium mb-1">Email</label>
              <input
                {...form1.register('email')}
                type="email"
                placeholder="toi@email.com"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none"
                autoFocus
              />
              {form1.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">{form1.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block font-medium mb-1">Mot de passe</label>
              <input
                {...form1.register('password')}
                type="password"
                placeholder="Minimum 8 caractères"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none"
              />
              {form1.formState.errors.password && (
                <p className="text-red-500 text-sm mt-1">{form1.formState.errors.password.message}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-teal-500 text-white font-bold py-4 rounded-xl text-lg hover:bg-teal-600 transition-colors"
            >
              Continuer →
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-5">
            <h2 className="text-2xl font-bold">Ton prénom</h2>
            <div>
              <label className="block font-medium mb-1">Prénom</label>
              <input
                {...form2.register('name')}
                type="text"
                placeholder="Comment tu veux qu'on t'appelle ?"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none"
                autoFocus
              />
              {form2.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">{form2.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block font-medium mb-1">
                Ton profil TDAH <span className="text-gray-400 font-normal">(optionnel, modifiable à tout moment)</span>
              </label>
              <select
                {...form2.register('tdahType')}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none"
              >
                <option value="">Préfère ne pas préciser</option>
                {tdahOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl p-3">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 text-white font-bold py-4 rounded-xl text-lg hover:bg-teal-600 transition-colors disabled:opacity-60"
            >
              {loading ? 'Création en cours...' : 'Créer mon compte →'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-gray-500 text-sm">
              ← Retour
            </button>
          </form>
        )}

        <p className="text-center text-gray-500 text-sm mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-teal-600 font-semibold">Connexion</Link>
        </p>
      </motion.div>
    </div>
  );
}
