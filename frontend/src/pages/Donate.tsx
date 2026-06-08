import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// PayPal.me fonctionne dans tous les pays (pas de restriction ONG)
// Pour activer : va sur https://www.paypal.com/paypalme et crée ton lien
const PAYPAL_ME = 'Tariktifaq'; // → paypal.me/Tariktifaq

const AMOUNTS = [
  { value: 5,  label: '5€',  emoji: '☕', desc: 'Un café solidaire' },
  { value: 10, label: '10€', emoji: '🧠', desc: 'Soutenir 1 semaine de dev' },
  { value: 20, label: '20€', emoji: '💜', desc: 'Devenir ambassadeur TDAH' },
  { value: 50, label: '50€', emoji: '🚀', desc: 'Propulser FocusBrain' },
];

const IMPACT = [
  { icon: '👥', title: '10 000+ adultes TDAH', desc: 'en isolement qui cherchent quelqu\'un qui les comprend' },
  { icon: '🔬', title: 'Scientifiquement prouvé', desc: 'Le Body Doubling augmente la productivité de 300% pour le TDAH' },
  { icon: '🌍', title: 'Maroc → Monde', desc: 'La 1ère plateforme TDAH francophone pensée par et pour nous' },
];

const DONORS = [
  { name: 'Yasmine B.', amount: '20€', msg: 'Enfin une appli qui nous comprend ! ❤️' },
  { name: 'Adam R.', amount: '10€', msg: 'Continue Tarik, c\'est révolutionnaire' },
  { name: 'Anonyme', amount: '5€',  msg: 'Petit geste pour une grande cause 💜' },
];

export default function Donate() {
  const [selected, setSelected]   = useState<number>(10);
  const [custom, setCustom]       = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [name, setName]           = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const finalAmount = useCustom ? parseFloat(custom) || 0 : selected;

  const handleDonate = () => {
    if (finalAmount < 1) return;
    setShowConfirm(true);
  };

  const confirmDonate = () => {
    // PayPal.me/{username}/{amount} — fonctionne dans tous les pays
    // Le donateur peut payer par CB, Google Pay, ou compte PayPal
    const url = `https://www.paypal.com/paypalme/${PAYPAL_ME}/${finalAmount}`;
    window.open(url, '_blank');
    setShowConfirm(false);
  };

  const isMerci = new URLSearchParams(window.location.search).get('merci') === '1';

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-teal-50">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <Link to="/" className="text-xl font-black text-teal-500" style={{ fontFamily: 'DM Sans' }}>
          🧠 FocusBrain
        </Link>
        <Link to="/login" className="text-gray-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          Se connecter →
        </Link>
      </nav>

      {/* Merci banner */}
      <AnimatePresence>
        {isMerci && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto px-6 mb-6"
          >
            <div className="bg-teal-500 text-white rounded-2xl px-6 py-4 text-center shadow-lg">
              <p className="text-2xl mb-1">🎉 Merci infiniment !</p>
              <p className="opacity-90">Ton don aide la communauté TDAH à trouver sa place. Tu es incroyable 💜</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block bg-purple-100 text-purple-700 font-bold px-4 py-1.5 rounded-full text-sm mb-6">
            💜 Soutenir FocusBrain
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 leading-tight" style={{ fontFamily: 'DM Sans' }}>
            Aide-moi à construire<br />
            <span className="text-purple-600">la plateforme TDAH</span><br />
            dont on avait tous besoin
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Je suis Tarik, adulte TDAH. J'ai créé FocusBrain seul, la nuit, après ma journée de travail.
            Chaque don me permet de continuer à développer cet outil pour notre communauté.
          </p>
        </motion.div>
      </section>

      {/* Impact */}
      <section className="max-w-4xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-3 gap-4">
          {IMPACT.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm"
            >
              <span className="text-3xl block mb-3">{item.icon}</span>
              <p className="font-black text-gray-900 mb-1">{item.title}</p>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Formulaire donation */}
      <section className="max-w-lg mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8"
        >
          <h2 className="text-2xl font-black text-gray-900 mb-1">Faire un don</h2>
          <p className="text-gray-400 text-sm mb-6">Paiement 100% sécurisé via PayPal</p>

          {/* Montants prédéfinis */}
          <p className="text-xs text-gray-400 font-bold uppercase mb-3">Choisir un montant</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {AMOUNTS.map(a => (
              <button
                key={a.value}
                onClick={() => { setSelected(a.value); setUseCustom(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                  !useCustom && selected === a.value
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <div>
                  <p className="font-black text-gray-900">{a.label}</p>
                  <p className="text-xs text-gray-400">{a.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Montant libre */}
          <div className="mb-5">
            <button
              onClick={() => setUseCustom(true)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${
                useCustom ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <span className="font-semibold text-gray-700">💝 Autre montant</span>
              {useCustom && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={custom}
                    onChange={e => setCustom(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="0"
                    className="w-20 text-right font-black text-gray-900 bg-transparent border-none outline-none text-lg"
                    autoFocus
                  />
                  <span className="font-black text-gray-400">€</span>
                </div>
              )}
            </button>
          </div>

          {/* Nom optionnel */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 font-bold uppercase mb-2">Ton prénom (optionnel)</p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Yasmine"
              maxLength={30}
              className="w-full border-2 border-gray-200 focus:border-purple-400 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">Apparaîtra dans le mur des donateurs 💜</p>
          </div>

          {/* Bouton principal — PayPal.me */}
          <button
            onClick={handleDonate}
            disabled={finalAmount < 1}
            className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 disabled:opacity-40 text-white font-black text-lg py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            {finalAmount >= 1 ? `💜 Donner ${finalAmount}€ via PayPal` : 'Choisir un montant'}
          </button>

          {/* Méthodes acceptées */}
          <div className="mt-4 bg-slate-50 rounded-2xl p-3">
            <p className="text-xs text-gray-400 text-center font-bold mb-2">Méthodes acceptées</p>
            <div className="flex justify-center items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">💳</span>
                <span className="text-xs text-gray-500">Carte CB</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">🅿️</span>
                <span className="text-xs text-gray-500">PayPal</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">📱</span>
                <span className="text-xs text-gray-500">Google Pay</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">🍎</span>
                <span className="text-xs text-gray-500">Apple Pay</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            🔒 Paiement sécurisé · Aucun compte PayPal requis
          </p>
        </motion.div>
      </section>

      {/* Mur des donateurs */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-black text-center text-gray-900 mb-2">💜 Ils ont déjà soutenu</h2>
        <p className="text-gray-400 text-center text-sm mb-8">La communauté TDAH qui croit au projet</p>
        <div className="grid md:grid-cols-3 gap-4">
          {DONORS.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-black text-purple-600">
                  {d.name[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{d.name}</p>
                  <p className="text-purple-600 font-black text-sm">{d.amount}</p>
                </div>
              </div>
              <p className="text-gray-500 text-sm italic">"{d.msg}"</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Message personnel */}
      <section className="max-w-2xl mx-auto px-6 pb-20 text-center">
        <div className="bg-gradient-to-br from-purple-50 to-teal-50 rounded-3xl p-8 border border-purple-100">
          <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white font-black text-2xl mx-auto mb-4">T</div>
          <p className="text-gray-700 leading-relaxed italic mb-4">
            "Je suis adulte TDAH et j'ai passé ma vie à me sentir incompris. FocusBrain est né de cette douleur —
            l'envie de créer un espace où notre cerveau différent est une force, pas un défaut.
            Chaque don, même petit, me permet de continuer à construire cet outil pour nous tous."
          </p>
          <p className="font-black text-gray-900">Tarik — Fondateur FocusBrain</p>
          <p className="text-purple-500 text-sm">TDAH Combiné · Marrakech, Maroc</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-400 text-sm border-t border-gray-100">
        <p>FocusBrain · Fait avec 💜 par et pour la communauté TDAH</p>
        <p className="mt-1">
          <Link to="/" className="text-teal-500 hover:underline">Retour à l'accueil</Link>
          {' · '}
          <a href="mailto:tifaqtarik@gmail.com" className="text-teal-500 hover:underline">Contact</a>
        </p>
      </footer>

      {/* Modal confirmation */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
              initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-4xl mb-4">💜</p>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Confirmer le don</h3>
              <p className="text-gray-500 mb-1">Tu vas donner</p>
              <p className="text-4xl font-black text-purple-600 mb-1">{finalAmount}€</p>
              {name && <p className="text-gray-400 text-sm mb-4">en tant que <strong>{name}</strong></p>}
              <p className="text-gray-400 text-sm mb-4">
                Tu seras redirigé(e) vers <strong>PayPal.me</strong> — tu peux payer par carte bancaire, Google Pay ou compte PayPal, sans restriction de pays.
              </p>
              {/* Méthodes */}
              <div className="flex justify-center gap-4 mb-5 text-2xl">
                <span title="Carte bancaire">💳</span>
                <span title="PayPal">🅿️</span>
                <span title="Google Pay">📱</span>
                <span title="Apple Pay">🍎</span>
              </div>
              <button
                onClick={confirmDonate}
                className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white font-black py-4 rounded-2xl mb-3 hover:shadow-lg transition-all"
              >
                Continuer vers PayPal 🔒
              </button>
              <button onClick={() => setShowConfirm(false)} className="text-gray-400 text-sm">
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
