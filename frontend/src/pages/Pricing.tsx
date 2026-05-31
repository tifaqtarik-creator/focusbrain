import { Link } from 'react-router-dom';

const features = [
  { label: 'Sessions par semaine', free: '3 max', premium: 'Illimitées' },
  { label: 'Durée de session', free: '25 min uniquement', premium: '15 / 25 / 50 / 75 min' },
  { label: 'Quiet Mode', free: '❌', premium: '✅' },
  { label: 'Mode Audio uniquement', free: '✅', premium: '✅' },
  { label: 'Cercle de Confiance', free: '1 partenaire', premium: '5 partenaires' },
  { label: 'Bruits de fond TDAH', free: '1 option', premium: '10 options' },
  { label: 'Brain Break', free: '✅', premium: '✅' },
  { label: 'Task Paralysis Rescue', free: '❌', premium: '✅' },
  { label: 'Historique', free: '30 jours', premium: 'Complet' },
  { label: 'Forum communautaire', free: 'Lecture seule', premium: 'Participation complète' },
  { label: 'Accès coachs TDAH', free: 'Annuaire', premium: 'Booking direct' },
  { label: 'Support', free: 'FAQ', premium: 'Email prioritaire <48h' },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Link to="/" className="text-teal-500 font-black text-2xl" style={{ fontFamily: 'DM Sans' }}>🧠 FocusBrain</Link>
          <h1 className="text-4xl font-black mt-6 mb-4" style={{ fontFamily: 'DM Sans' }}>Tarifs simples et honnêtes</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Pourquoi le Premium aide vraiment ton cerveau TDAH : plus de flexibilité = moins de friction = plus de sessions = plus de progrès.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Gratuit */}
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-8">
            <h2 className="text-2xl font-black mb-1">Gratuit</h2>
            <div className="text-4xl font-black text-gray-900 mb-2">0 €</div>
            <p className="text-gray-500 mb-8">Pour découvrir le Body Doubling TDAH</p>
            <Link to="/register" className="block text-center bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors">
              Commencer gratuitement →
            </Link>
          </div>

          {/* Premium */}
          <div className="bg-teal-500 rounded-3xl p-8 text-white">
            <h2 className="text-2xl font-black mb-1">Premium</h2>
            <div className="text-4xl font-black mb-2">9 € <span className="text-2xl opacity-80">/mois</span></div>
            <p className="opacity-80 mb-8">Pour un usage quotidien, sans limites</p>
            <Link to="/register" className="block text-center bg-white text-teal-600 font-bold py-4 rounded-xl hover:bg-gray-50 transition-colors">
              Commencer l'essai →
            </Link>
          </div>
        </div>

        {/* Tableau comparatif */}
        <div className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left p-6 font-bold text-gray-700">Fonctionnalité</th>
                <th className="text-center p-6 font-bold text-gray-700">Gratuit</th>
                <th className="text-center p-6 font-bold text-teal-600">Premium</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr key={f.label} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-4 pl-6 text-gray-700">{f.label}</td>
                  <td className="p-4 text-center text-gray-500">{f.free}</td>
                  <td className="p-4 text-center text-teal-600 font-semibold">{f.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          Annulation à tout moment · Données TDAH jamais utilisées pour la pub
        </p>
      </div>
    </div>
  );
}
