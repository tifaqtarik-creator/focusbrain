import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full text-center"
      >
        <p className="text-5xl mb-4">😊</p>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Pas de souci !</h1>
        <p className="text-gray-500 mb-8">
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
