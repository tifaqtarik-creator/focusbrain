import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '../lib/i18n';

const FEATURES = [
  { label: 'Sessions/semaine', free: '3 max', premium: 'Illimitées' },
  { label: 'Durée session', free: '25 min', premium: '15/25/50/75 min' },
  { label: 'Quiet Mode', free: '❌', premium: '✅' },
  { label: 'Cercle de Confiance', free: '1', premium: '5 partenaires' },
  { label: 'Bruits de fond TDAH', free: '1', premium: '10 options' },
  { label: 'Task Paralysis Rescue', free: '❌', premium: '✅' },
  { label: 'Historique', free: '30 jours', premium: 'Complet' },
  { label: 'Forum communautaire', free: 'Lecture', premium: 'Participation' },
];

export default function Pricing() {
  const { t } = useI18n();
  const p = t.pricing;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link to="/" className="text-teal-500 font-black text-xl" style={{ fontFamily: 'DM Sans' }}>🧠 FocusBrain</Link>
          <h1 className="text-3xl font-black mt-6 mb-2 text-gray-900">{p.title}</h1>
          <p className="text-gray-500">{p.sub}</p>
        </div>

        {/* 2 cartes côte à côte — 1 décision simple */}
        <div className="grid md:grid-cols-2 gap-5 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 p-8"
          >
            <h2 className="text-xl font-black text-gray-900 mb-1">{p.free}</h2>
            <div className="text-4xl font-black text-gray-900 mb-1">{p.freePrice}</div>
            <p className="text-gray-400 text-sm mb-6">{p.freeSub}</p>
            <Link to="/register" className="block text-center bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors">
              {p.startFree}
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-teal-500 rounded-2xl p-8 text-white relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
              Recommandé
            </div>
            <h2 className="text-xl font-black mb-1">{p.premium}</h2>
            <div className="text-4xl font-black mb-1">
              {p.premiumPrice} <span className="text-2xl opacity-70">{p.premiumPer}</span>
            </div>
            <p className="opacity-70 text-sm mb-6">{p.premiumSub}</p>
            <Link to="/register" className="block text-center bg-white text-teal-600 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-colors">
              {p.startTrial}
            </Link>
          </motion.div>
        </div>

        {/* Tableau comparatif — simple, lisible */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-4 pl-6 text-sm font-bold text-gray-500">Fonctionnalité</th>
                <th className="text-center p-4 text-sm font-bold text-gray-500">{p.free}</th>
                <th className="text-center p-4 text-sm font-bold text-teal-600">{p.premium}</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={f.label} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                  <td className="p-4 pl-6 text-sm text-gray-700">{f.label}</td>
                  <td className="p-4 text-center text-sm text-gray-400">{f.free}</td>
                  <td className="p-4 text-center text-sm text-teal-600 font-semibold">{f.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">{p.cancel}</p>
      </div>
    </div>
  );
}
