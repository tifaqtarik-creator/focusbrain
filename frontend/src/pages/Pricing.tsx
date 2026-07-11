import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Brain, Check, X, Star, CreditCard, Smartphone, Landmark, Wallet, Lock } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useAppStore } from '../stores/useStore';
import PaymentModal from '../components/payment/PaymentModal';

// ── Régions & devises ──────────────────────────────────────────────────────────
const REGIONS = [
  { id: 'maghreb', flag: '🇲🇦', label: 'Maghreb', currency: 'MAD', monthly: 99, yearly: 799, symbol: 'MAD' },
  { id: 'europe',  flag: '🇪🇺', label: 'Europe',  currency: 'EUR', monthly: 9.99, yearly: 79.99, symbol: '€' },
  { id: 'usa',     flag: '🇺🇸', label: 'USA / UK', currency: 'USD', monthly: 9.99, yearly: 79.99, symbol: '$' },
];

// ── Fonctionnalités ────────────────────────────────────────────────────────────
const FEATURES = [
  { label: 'Sessions body doubling',     labelEn: 'Body doubling sessions',    labelAr: 'جلسات body doubling', free: '3/semaine', premium: 'Illimitées' },
  { label: 'ADAH AI — Chat TCC',         labelEn: 'ADAH AI — CBT Chat',        labelAr: 'ADAH AI — دردشة', free: '3/mois', premium: 'Illimité' },
  { label: 'ADAH AI — Mode vocal',       labelEn: 'ADAH AI — Voice mode',      labelAr: 'ADAH AI — وضع صوتي', free: '❌', premium: '✅' },
  { label: 'Mémoire IA long terme',      labelEn: 'AI long-term memory',       labelAr: 'ذاكرة الذكاء الاصطناعي', free: '❌', premium: '✅' },
  { label: 'Carte membres TDAH',         labelEn: 'ADHD members map',          labelAr: 'خريطة الأعضاء', free: '✅', premium: '✅ + priorité cercle' },
  { label: 'Forum communautaire',        labelEn: 'Community forum',           labelAr: 'منتدى المجتمع', free: 'Lecture', premium: 'Participation' },
  { label: 'Cercle de confiance',        labelEn: 'Circle of trust',           labelAr: 'دائرة الثقة', free: '1', premium: '5 partenaires' },
  { label: 'Sessions vidéo LiveKit',     labelEn: 'LiveKit video sessions',    labelAr: 'جلسات فيديو', free: '❌', premium: '✅' },
  { label: 'Sons TDAH focus',           labelEn: 'ADHD focus sounds',         labelAr: 'أصوات التركيز', free: '1', premium: '10 options' },
  { label: 'Stats personnelles',         labelEn: 'Personal stats',            labelAr: 'إحصاءاتي', free: 'Basique', premium: 'Complet + IA' },
  { label: 'Support prioritaire',        labelEn: 'Priority support',          labelAr: 'دعم أولوي', free: '❌', premium: '✅' },
];

// Rend une valeur de cellule : ✅/❌ → icône, sinon texte brut
function renderValue(v: string, tone: 'free' | 'premium') {
  if (v === '✅') return <Check size={16} strokeWidth={2.5} className={`inline ${tone === 'premium' ? 'text-teal-600' : 'text-ink-500'}`} />;
  if (v === '❌') return <X size={16} strokeWidth={2.5} className="inline text-ink-400" />;
  return <>{v}</>;
}

// ── Moyens de paiement par région ───────────────────────────────────────────────
const PAYMENTS: Record<string, { icon: typeof CreditCard; label: string }[]> = {
  maghreb: [
    { icon: CreditCard, label: 'CMI (Carte Marocaine)' },
    { icon: Wallet,     label: 'PayPal' },
    { icon: Smartphone, label: 'Cash Plus' },
  ],
  europe: [
    { icon: CreditCard, label: 'Carte bancaire' },
    { icon: Wallet,     label: 'PayPal' },
    { icon: Landmark,   label: 'SEPA / Virement' },
    { icon: Smartphone, label: 'Apple Pay / Google Pay' },
  ],
  usa: [
    { icon: CreditCard, label: 'Visa / Mastercard' },
    { icon: Wallet,     label: 'PayPal' },
    { icon: Smartphone, label: 'Apple Pay / Google Pay' },
    { icon: Landmark,   label: 'ACH Bank Transfer' },
  ],
};

export default function Pricing() {
  const { t, lang } = useI18n();
  const p = t.pricing;
  const [region, setRegion] = useState(lang === 'ar' ? 'maghreb' : lang === 'en' ? 'usa' : 'europe');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [showPayment, setShowPayment] = useState(false);
  const isLoggedIn = useAppStore(s => !!s.accessToken);
  const navigate = useNavigate();

  const currentRegion = REGIONS.find(r => r.id === region) || REGIONS[1];
  const price = billing === 'yearly'
    ? `${currentRegion.symbol}${(currentRegion.yearly / 12).toFixed(2)}`
    : `${currentRegion.symbol}${currentRegion.monthly}`;
  const saving = Math.round((1 - currentRegion.yearly / (currentRegion.monthly * 12)) * 100);
  const isRTL = lang === 'ar';

  return (
    <div className="min-h-screen bg-surface-soft px-4 py-12" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-teal-600 font-black text-xl">
            <Brain size={22} strokeWidth={2} />FocusBrain
          </Link>
          <h1 className="text-3xl font-black mt-6 mb-2 text-ink-900">{p.title}</h1>
          <p className="text-ink-500 mb-6">{p.sub}</p>

          {/* Sélecteur région */}
          <div className="inline-flex bg-white border border-line rounded-2xl p-1 gap-1 mb-4">
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => setRegion(r.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  region === r.id ? 'bg-teal-500 text-white shadow-sm' : 'text-ink-500 hover:bg-surface-soft'
                }`}>
                <span>{r.flag}</span><span>{r.label}</span>
              </button>
            ))}
          </div>

          {/* Toggle mensuel/annuel */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-ink-900' : 'text-ink-400'}`}>Mensuel</span>
            <button onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
              className={`w-12 h-6 rounded-full transition-colors relative ${billing === 'yearly' ? 'bg-teal-500' : 'bg-ink-400'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === 'yearly' ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-ink-900' : 'text-ink-400'}`}>
              Annuel <span className="bg-teal-100 text-teal-700 text-xs px-1.5 py-0.5 rounded-full ml-1 font-bold">-{saving}%</span>
            </span>
          </div>
        </div>

        {/* Cartes de prix */}
        <div className="grid md:grid-cols-2 gap-5 mb-10">
          {/* Plan Gratuit */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-line p-8">
            <h2 className="text-xl font-black text-ink-900 mb-1">{p.free}</h2>
            <div className="text-4xl font-black text-ink-900 mb-1">{p.freePrice}</div>
            <p className="text-ink-400 text-sm mb-4">{p.freeSub}</p>
            <ul className="space-y-2 mb-6 text-sm text-ink-500">
              <li className="flex items-center gap-2"><Check size={16} strokeWidth={2.5} className="text-teal-600 shrink-0" /> 3 sessions body doubling/semaine</li>
              <li className="flex items-center gap-2"><Check size={16} strokeWidth={2.5} className="text-teal-600 shrink-0" /> 3 sessions ADAH AI/mois</li>
              <li className="flex items-center gap-2"><Check size={16} strokeWidth={2.5} className="text-teal-600 shrink-0" /> Carte membres TDAH</li>
              <li className="flex items-center gap-2"><Check size={16} strokeWidth={2.5} className="text-teal-600 shrink-0" /> Forum (lecture)</li>
            </ul>
            <Link to="/register" className="block text-center bg-surface-muted text-ink-700 font-bold py-3.5 rounded-xl hover:bg-line transition-colors">
              {p.startFree}
            </Link>
          </motion.div>

          {/* Plan Premium */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-card">
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
              <Star size={14} strokeWidth={2} /> Recommandé
            </div>
            <h2 className="text-xl font-black mb-1">{p.premium}</h2>
            <div className="flex items-end gap-2 mb-0.5">
              <span className="text-4xl font-black">{price}</span>
              <span className="text-white/70 text-lg mb-1">/mois</span>
            </div>
            {billing === 'yearly' && (
              <p className="text-white/60 text-xs mb-1">
                Facturé {currentRegion.symbol}{currentRegion.yearly}/an · Économie {currentRegion.symbol}{(currentRegion.monthly * 12 - currentRegion.yearly).toFixed(0)}
              </p>
            )}
            {region !== 'europe' && (
              <p className="text-white/60 text-xs mb-1">
                Facturation en euros via PayPal : {billing === 'yearly' ? '79,99 €/an' : '9,99 €/mois'}
              </p>
            )}
            <p className="opacity-70 text-sm mb-4">{p.premiumSub}</p>
            <ul className="space-y-2 mb-6 text-sm text-white/90">
              <li className="flex items-center gap-2"><Check size={16} strokeWidth={2.5} className="text-white shrink-0" /> Tout le plan gratuit</li>
              <li className="flex items-center gap-2"><Check size={16} strokeWidth={2.5} className="text-white shrink-0" /> <strong>ADAH AI illimité</strong> (chat + voix)</li>
              <li className="flex items-center gap-2"><Check size={16} strokeWidth={2.5} className="text-white shrink-0" /> Mémoire IA long terme</li>
              <li className="flex items-center gap-2"><Check size={16} strokeWidth={2.5} className="text-white shrink-0" /> Sessions body doubling illimitées</li>
              <li className="flex items-center gap-2"><Check size={16} strokeWidth={2.5} className="text-white shrink-0" /> Vidéo TCC (Daily.co)</li>
              <li className="flex items-center gap-2"><Check size={16} strokeWidth={2.5} className="text-white shrink-0" /> Cercle de confiance 5 membres</li>
            </ul>
            {isLoggedIn ? (
              <button onClick={() => setShowPayment(true)}
                className="block w-full text-center bg-white text-teal-600 font-black py-3.5 rounded-xl hover:bg-surface-soft transition-colors">
                {p.startTrial}
              </button>
            ) : (
              <Link to="/register"
                className="block text-center bg-white text-teal-600 font-black py-3.5 rounded-xl hover:bg-surface-soft transition-colors">
                {p.startTrial}
              </Link>
            )}
          </motion.div>
        </div>

        {/* Tunnel d'achat Premium (utilisateur connecté) */}
        <PaymentModal
          isOpen={showPayment}
          plan={billing === 'yearly' ? 'PREMIUM_YEARLY' : 'PREMIUM_MONTHLY'}
          onSuccess={() => { setShowPayment(false); navigate('/dashboard'); }}
          onClose={() => setShowPayment(false)}
        />

        {/* Tableau comparatif */}
        <div className="bg-white rounded-2xl border border-line overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-soft">
                <th className="text-left p-4 pl-6 text-sm font-bold text-ink-500">Fonctionnalité</th>
                <th className="text-center p-4 text-sm font-bold text-ink-500">{p.free}</th>
                <th className="text-center p-4 text-sm font-bold text-teal-600">{p.premium}</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={f.label} className={i % 2 === 0 ? 'bg-surface-soft/60' : ''}>
                  <td className="p-4 pl-6 text-sm text-ink-700">
                    {isRTL ? f.labelAr : lang === 'en' ? f.labelEn : f.label}
                  </td>
                  <td className="p-4 text-center text-sm text-ink-400">{renderValue(f.free, 'free')}</td>
                  <td className="p-4 text-center text-sm text-teal-600 font-semibold">{renderValue(f.premium, 'premium')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Moyens de paiement par région */}
        <div className="bg-white rounded-2xl border border-line p-5 mb-6 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400 font-bold uppercase mb-3">
            <CreditCard size={14} strokeWidth={2} /> Moyens de paiement — {currentRegion.flag} {currentRegion.label}
          </p>
          <div className="flex justify-center gap-4 text-sm text-ink-500 flex-wrap">
            {(PAYMENTS[region] || []).map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <Icon size={16} strokeWidth={2} className="text-ink-500" />{label}
              </span>
            ))}
          </div>
        </div>

        {/* Conformité */}
        <div className="text-center space-y-1">
          <p className="text-ink-400 text-sm">{p.cancel}</p>
          <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400">
            <Lock size={14} strokeWidth={2} /> Conforme RGPD (Europe) · CCPA (USA) · CNDP (Maroc) · Données chiffrées
          </p>
        </div>
      </div>
    </div>
  );
}
