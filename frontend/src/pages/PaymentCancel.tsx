import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-card p-12 max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 text-rose-400">
            <Heart size={32} strokeWidth={2} />
          </span>
        </div>
        <h1 className="text-2xl font-black text-ink-900 mb-2">Pas de souci !</h1>
        <p className="text-ink-500 mb-8">
          Le paiement a été annulé. Tu peux réessayer quand tu veux, sans pression.
        </p>
        <Link to="/pricing"
          className="inline-block bg-teal-500 text-white font-black px-8 py-3 rounded-2xl hover:bg-teal-600 transition-colors">
          Voir les offres
        </Link>
      </motion.div>
    </div>
  );
}
