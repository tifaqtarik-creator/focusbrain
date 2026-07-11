import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Coffee, Heart, Rocket, Users, Microscope, Globe, Gift,
  CreditCard, Wallet, Smartphone, Apple, Lock, PartyPopper, ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// PayPal.me fonctionne dans tous les pays (pas de restriction ONG)
// Pour activer : va sur https://www.paypal.com/paypalme et crée ton lien
const PAYPAL_ME = 'Tariktifaq'; // → paypal.me/Tariktifaq

const AMOUNTS: { value: number; label: string; icon: LucideIcon; desc: string }[] = [
  { value: 5,  label: '5€',  icon: Coffee, desc: 'Un café solidaire' },
  { value: 10, label: '10€', icon: Brain,  desc: 'Soutenir 1 semaine de dev' },
  { value: 20, label: '20€', icon: Heart,  desc: 'Devenir ambassadeur TDAH' },
  { value: 50, label: '50€', icon: Rocket, desc: 'Propulser FocusBrain' },
];

const IMPACT: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Users,      title: '10 000+ adultes TDAH', desc: 'en isolement qui cherchent quelqu\'un qui les comprend' },
  { icon: Microscope, title: 'Scientifiquement prouvé', desc: 'Le Body Doubling augmente la productivité de 300% pour le TDAH' },
  { icon: Globe,      title: 'Maroc → Monde', desc: 'La 1ère plateforme TDAH francophone pensée par et pour nous' },
];

// Méthodes de paiement acceptées
const PAY_METHODS: { icon: LucideIcon; label: string }[] = [
  { icon: CreditCard, label: 'Carte CB' },
  { icon: Wallet,     label: 'PayPal' },
  { icon: Smartphone, label: 'Google Pay' },
  { icon: Apple,      label: 'Apple Pay' },
];


export default function Donate() {
  const [selected, setSelected]   = useState<number>(10);
  const [custom, setCustom]       = useState('');
  const [useCustom, setUseCustom] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-b from-surface-soft via-white to-teal-50">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <Link to="/" className="flex items-center gap-1.5 text-xl font-black text-teal-600" style={{ fontFamily: 'DM Sans' }}>
          <Brain size={22} strokeWidth={2} />FocusBrain
        </Link>
        <Link to="/login" className="flex items-center gap-1.5 text-ink-500 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-surface-soft transition-colors">
          Se connecter<ArrowRight size={16} strokeWidth={2} />
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
            <div className="bg-teal-500 text-white rounded-2xl px-6 py-4 text-center shadow-card">
              <p className="flex items-center justify-center gap-2 text-2xl font-black mb-1"><PartyPopper size={24} strokeWidth={2} /> Merci infiniment !</p>
              <p className="opacity-90 flex items-center justify-center gap-1.5">Ton don aide la communauté TDAH à trouver sa place. Tu es incroyable <Heart size={16} strokeWidth={2} className="fill-current" /></p>
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
          <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 font-bold px-4 py-1.5 rounded-full text-sm mb-6">
            <Heart size={14} strokeWidth={2} className="fill-current" /> Soutenir FocusBrain
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-ink-900 mb-4 leading-tight" style={{ fontFamily: 'DM Sans' }}>
            Aide-moi à construire<br />
            <span className="text-violet-600">la plateforme TDAH</span><br />
            dont on avait tous besoin
          </h1>
          <p className="text-lg text-ink-500 max-w-xl mx-auto leading-relaxed">
            Je suis Tarik, adulte TDAH. J'ai créé FocusBrain seul, la nuit, après ma journée de travail.
            Chaque don me permet de continuer à développer cet outil pour notre communauté.
          </p>
        </motion.div>
      </section>

      {/* Impact */}
      <section className="max-w-4xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-3 gap-4">
          {IMPACT.map((item, i) => {
            const Icon = item.icon;
            return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-line rounded-2xl p-5 text-center shadow-soft"
            >
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-50 text-violet-600 mb-3"><Icon size={26} strokeWidth={2} /></span>
              <p className="font-black text-ink-900 mb-1">{item.title}</p>
              <p className="text-ink-500 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
            );
          })}
        </div>
      </section>

      {/* Formulaire donation */}
      <section className="max-w-lg mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl shadow-card border border-line p-8"
        >
          <h2 className="text-2xl font-black text-ink-900 mb-1">Faire un don</h2>
          <p className="text-ink-400 text-sm mb-6">Paiement 100% sécurisé via PayPal</p>

          {/* Montants prédéfinis */}
          <p className="text-xs text-ink-400 font-bold uppercase mb-3">Choisir un montant</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {AMOUNTS.map(a => {
              const Icon = a.icon;
              const active = !useCustom && selected === a.value;
              return (
              <button
                key={a.value}
                onClick={() => { setSelected(a.value); setUseCustom(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                  active
                    ? 'border-violet-500 bg-violet-50 shadow-soft'
                    : 'border-line hover:border-violet-400 hover:bg-violet-50/50'
                }`}
              >
                <Icon size={24} strokeWidth={2} className={active ? 'text-violet-600' : 'text-ink-500'} />
                <div>
                  <p className="font-black text-ink-900">{a.label}</p>
                  <p className="text-xs text-ink-400">{a.desc}</p>
                </div>
              </button>
              );
            })}
          </div>

          {/* Montant libre */}
          <div className="mb-5">
            <button
              onClick={() => setUseCustom(true)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${
                useCustom ? 'border-violet-500 bg-violet-50' : 'border-line hover:border-violet-400'
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-ink-700"><Gift size={18} strokeWidth={2} className="text-ink-500" /> Autre montant</span>
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
                    className="w-20 text-right font-black text-ink-900 bg-transparent border-none outline-none text-lg"
                    autoFocus
                  />
                  <span className="font-black text-ink-400">€</span>
                </div>
              )}
            </button>
          </div>

          {/* Bouton principal — PayPal.me */}
          <button
            onClick={handleDonate}
            disabled={finalAmount < 1}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-teal-500 hover:from-violet-600 hover:to-teal-600 disabled:opacity-40 text-white font-black text-lg py-4 rounded-2xl transition-all shadow-card hover:shadow-card hover:-translate-y-0.5 active:translate-y-0"
          >
            {finalAmount >= 1
              ? <><Heart size={20} strokeWidth={2} className="fill-current" /> Donner {finalAmount}€ via PayPal</>
              : 'Choisir un montant'}
          </button>

          {/* Méthodes acceptées */}
          <div className="mt-4 bg-surface-soft rounded-2xl p-3">
            <p className="text-xs text-ink-400 text-center font-bold mb-2">Méthodes acceptées</p>
            <div className="flex justify-center items-center gap-4">
              {PAY_METHODS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <Icon size={20} strokeWidth={2} className="text-ink-500" />
                  <span className="text-xs text-ink-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400 text-center mt-3">
            <Lock size={14} strokeWidth={2} /> Paiement sécurisé · Aucun compte PayPal requis
          </p>
        </motion.div>
      </section>

      {/* Appel honnête — pas de faux témoignages */}
      <section className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <h2 className="flex items-center justify-center gap-2 text-2xl font-black text-ink-900 mb-2"><Heart size={22} strokeWidth={2} className="fill-current text-violet-500" /> Sois parmi les premiers à soutenir</h2>
        <p className="text-ink-400 text-sm">Chaque don, même petit, aide directement le développement du projet.</p>
      </section>

      {/* Message personnel */}
      <section className="max-w-2xl mx-auto px-6 pb-20 text-center">
        <div className="bg-gradient-to-br from-violet-50 to-teal-50 rounded-3xl p-8 border border-line">
          <div className="w-16 h-16 bg-violet-500 rounded-full flex items-center justify-center text-white font-black text-2xl mx-auto mb-4">T</div>
          <p className="text-ink-700 leading-relaxed italic mb-4">
            "Je suis adulte TDAH et j'ai passé ma vie à me sentir incompris. FocusBrain est né de cette douleur —
            l'envie de créer un espace où notre cerveau différent est une force, pas un défaut.
            Chaque don, même petit, me permet de continuer à construire cet outil pour nous tous."
          </p>
          <p className="font-black text-ink-900">Tarik — Fondateur FocusBrain</p>
          <p className="text-violet-600 text-sm">TDAH Combiné · Marrakech, Maroc</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-ink-400 text-sm border-t border-line">
        <p className="flex items-center justify-center gap-1.5">FocusBrain · Fait avec <Heart size={14} strokeWidth={2} className="fill-current text-violet-500" /> par et pour la communauté TDAH</p>
        <p className="mt-1">
          <Link to="/" className="text-teal-600 hover:underline">Retour à l'accueil</Link>
          {' · '}
          <a href="mailto:tifaqtarik@gmail.com" className="text-teal-600 hover:underline">Contact</a>
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
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-card text-center"
              initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 mb-4"><Heart size={30} strokeWidth={2} className="fill-current" /></span>
              <h3 className="text-2xl font-black text-ink-900 mb-2">Confirmer le don</h3>
              <p className="text-ink-500 mb-1">Tu vas donner</p>
              <p className="text-4xl font-black text-violet-600 mb-1">{finalAmount}€</p>
              <p className="text-ink-400 text-sm mb-4">
                Tu seras redirigé(e) vers <strong>PayPal.me</strong> — tu peux payer par carte bancaire, Google Pay ou compte PayPal, sans restriction de pays.
              </p>
              {/* Méthodes */}
              <div className="flex justify-center gap-4 mb-5 text-ink-500">
                <CreditCard size={24} strokeWidth={2} aria-label="Carte bancaire" />
                <Wallet size={24} strokeWidth={2} aria-label="PayPal" />
                <Smartphone size={24} strokeWidth={2} aria-label="Google Pay" />
                <Apple size={24} strokeWidth={2} aria-label="Apple Pay" />
              </div>
              <button
                onClick={confirmDonate}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-teal-500 text-white font-black py-4 rounded-2xl mb-3 hover:shadow-card transition-all"
              >
                Continuer vers PayPal <Lock size={18} strokeWidth={2} />
              </button>
              <button onClick={() => setShowConfirm(false)} className="text-ink-400 text-sm">
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
