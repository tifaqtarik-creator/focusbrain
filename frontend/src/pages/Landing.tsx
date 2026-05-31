import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const mechanisms = [
  {
    icon: '⚡',
    title: 'Activation dopaminergique',
    desc: 'La présence visuelle d\'une autre personne stimule ton système de récompense sociale et crée la dopamine nécessaire pour démarrer.',
  },
  {
    icon: '👁️',
    title: 'Régulation de l\'attention',
    desc: 'La présence d\'un observateur, même passif, maintient ton attention sur la tâche. Ce n\'est pas de la honte — c\'est un régulateur externe.',
  },
  {
    icon: '⏱️',
    title: 'Ancrage temporel',
    desc: 'La session crée un cadre temporel partagé avec un début, une fin et un timer commun. Cela compense la "time blindness" TDAH.',
  },
];

const steps = [
  { num: '1', title: 'Chercher', desc: '1 bouton. Le système trouve ton partenaire TDAH en moins de 90 secondes.' },
  { num: '2', title: 'Se connecter', desc: 'Vidéo ou audio uniquement. Check-in rapide sur ton énergie du moment.' },
  { num: '3', title: 'Travailler', desc: 'Timer synchronisé, pause Brain Break à mi-session, célébration à la fin.' },
];

const testimonials = [
  { name: 'Yasmine, 31 ans', type: 'TDAH Inattentif', text: 'Pour la première fois je termine mes livrables sans la spirale de honte. FocusBrain a changé mon rapport au travail.' },
  { name: 'Adam, 24 ans', type: 'TDAH Hyperactif', text: 'Les sessions de 15 min c\'est parfait pour moi. Je peux faire plusieurs courtes sessions sans me forcer à rester assis 2h.' },
  { name: 'Nadia, 38 ans', type: 'TDAH Combiné + Anxiété', text: 'Le mode audio uniquement m\'a sauvée. Je peux bénéficier du Body Doubling sans l\'anxiété sociale des visios.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-2xl font-black text-teal-500" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          🧠 FocusBrain
        </span>
        <div className="flex gap-4">
          <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2">
            Connexion
          </Link>
          <Link
            to="/register"
            className="bg-teal-500 text-white font-bold px-6 py-2 rounded-full hover:bg-teal-600 transition-colors"
          >
            Commencer — gratuit
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-block bg-violet-100 text-violet-700 font-semibold px-4 py-1 rounded-full text-sm mb-6">
            Neurodivergent-First · Evidence-Based
          </span>
          <h1 className="text-5xl font-black text-gray-900 leading-tight mb-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Tu travailles mieux quand<br />
            <span className="text-teal-500">quelqu'un est là.</span><br />
            Maintenant c'est possible à distance.
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            FocusBrain est la première plateforme de Body Doubling conçue <strong>exclusivement</strong> pour les adultes TDAH.
            Chaque décision est basée sur les spécificités de ton cerveau.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-teal-500 text-white font-bold text-xl px-10 py-4 rounded-2xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200"
            >
              Trouver un partenaire maintenant →
            </Link>
            <a href="#comment" className="text-gray-600 font-medium text-xl px-10 py-4 rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition-colors">
              Comment ça marche ?
            </a>
          </div>
          <p className="text-gray-400 text-sm mt-4">Inscription en 90 secondes · Pas de carte bleue requise</p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-teal-50 py-12">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: '4-5%', label: 'des adultes ont un TDAH' },
            { val: '70%', label: 'ont du mal à terminer leurs tâches' },
            { val: '-40 à 60%', label: 'temps de démarrage réduit' },
            { val: '366M', label: 'personnes TDAH dans le monde' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-black text-teal-600">{s.val}</div>
              <div className="text-sm text-gray-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Science */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-black text-center mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Pourquoi ça marche pour le cerveau TDAH
        </h2>
        <p className="text-center text-gray-500 mb-12">3 mécanismes neurologiques documentés</p>
        <div className="grid md:grid-cols-3 gap-8">
          {mechanisms.map(m => (
            <div key={m.title} className="bg-white border-2 border-gray-100 rounded-2xl p-8">
              <div className="text-4xl mb-4">{m.icon}</div>
              <h3 className="font-bold text-lg mb-3">{m.title}</h3>
              <p className="text-gray-600">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-12" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Comment ça marche — en 30 secondes
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(s => (
              <div key={s.num} className="text-center">
                <div className="w-16 h-16 bg-teal-500 text-white rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="font-bold text-xl mb-2">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-black text-center mb-12" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Ce que disent les cerveaux TDAH
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map(t => (
            <div key={t.name} className="bg-teal-50 rounded-2xl p-8">
              <p className="text-gray-800 italic mb-6">"{t.text}"</p>
              <div>
                <div className="font-bold">{t.name}</div>
                <div className="text-teal-600 text-sm">{t.type}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-teal-500 py-20 text-center text-white">
        <h2 className="text-4xl font-black mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Ton cerveau TDAH n'est pas cassé.
        </h2>
        <p className="text-xl opacity-90 mb-8">Il a besoin d'un environnement différent.</p>
        <Link
          to="/register"
          className="bg-white text-teal-600 font-black text-xl px-12 py-4 rounded-2xl hover:bg-gray-50 transition-colors shadow-xl"
        >
          Commencer gratuitement →
        </Link>
        <p className="mt-4 opacity-70">Inscription en 90 secondes · Aucune carte requise</p>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        <p>© 2026 FocusBrain · Données TDAH protégées RGPD · Jamais partagées avec des tiers</p>
        <Link to="/pricing" className="underline mt-2 inline-block">Voir les tarifs</Link>
      </footer>
    </div>
  );
}
