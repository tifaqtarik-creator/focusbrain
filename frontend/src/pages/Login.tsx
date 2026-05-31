import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAppStore(s => s.setAuth);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-3xl font-black text-teal-500" style={{ fontFamily: 'DM Sans' }}>🧠 FocusBrain</span>
          <h2 className="text-2xl font-bold mt-4">Content de te revoir !</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block font-medium mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="toi@email.com"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none"
              autoFocus
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block font-medium mb-1">Mot de passe</label>
            <input
              {...register('password')}
              type="password"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <p className="text-sm text-right">
            <Link to="/forgot-password" className="text-teal-600">Je me souviens de rien 😅</Link>
          </p>

          {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl p-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-500 text-white font-bold py-4 rounded-xl text-lg hover:bg-teal-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-teal-600 font-semibold">C'est gratuit →</Link>
        </p>
      </motion.div>
    </div>
  );
}
