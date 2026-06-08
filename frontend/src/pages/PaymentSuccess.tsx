import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../stores/useStore';
import api from '../lib/api';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { updateUser, user } = useAppStore();

  useEffect(() => {
    api.get('/users/me').then(r => {
      updateUser(r.data);
    }).catch(() => {});

    const t = setTimeout(() => navigate('/dashboard'), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 8, delay: 0.2 }}
          className="text-7xl mb-6"
        >
          🎉
        </motion.div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Paiement réussi !</h1>
        <p className="text-gray-500 mb-2">
          {user?.isPremium
            ? 'Ton compte Premium est maintenant actif.'
            : 'Merci pour ton soutien à FocusBrain 💜'}
        </p>
        <p className="text-teal-500 font-bold mb-8">Tu seras redirigé(e) dans 5 secondes...</p>

        <Link to="/dashboard"
          className="inline-block bg-teal-500 text-white font-black px-8 py-3 rounded-2xl hover:bg-teal-600 transition-colors">
          Aller au tableau de bord →
        </Link>
      </motion.div>
    </div>
  );
}
