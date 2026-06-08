/**
 * PaymentModal.tsx — Modal paiement universel
 *
 * Supporte : PayPal wallet · Carte bancaire · Google Pay
 * Utilise @paypal/react-paypal-js (SDK officiel)
 *
 * Usage :
 *   <PaymentModal
 *     isOpen={true}
 *     plan="PREMIUM_MONTHLY"
 *     onSuccess={() => ...}
 *     onClose={() => ...}
 *   />
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import api from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Plan = 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY' | 'DONATION';

interface Props {
  isOpen:      boolean;
  plan?:       Plan;
  donationAmount?: number;
  onSuccess:   (data: { plan: Plan; amount: number }) => void;
  onClose:     () => void;
}

const PLAN_INFO: Record<Plan, { label: string; price: string; emoji: string; features: string[] }> = {
  PREMIUM_MONTHLY: {
    label: 'Premium Mensuel',
    price: '9,99€/mois',
    emoji: '⭐',
    features: ['Sessions illimitées', 'Carte membres', 'LiveKit audio/vidéo', 'Cercle de confiance', 'Stats avancées'],
  },
  PREMIUM_YEARLY: {
    label: 'Premium Annuel',
    price: '79,99€/an',
    emoji: '🚀',
    features: ['Tout Premium mensuel', '2 mois offerts', 'Support prioritaire', 'Badge fondateur'],
  },
  DONATION: {
    label: 'Don libre',
    price: 'Libre',
    emoji: '💜',
    features: ['Soutenir le projet', 'Apparaître dans les donateurs', 'Karma TDAH infini 🧠'],
  },
};

// ── Boutons PayPal (séparé car nécessite le contexte PayPalScriptProvider) ────

function PayPalButtonsWrapper({
  orderId,
  onApprove,
  onError,
}: {
  orderId: string;
  onApprove: (method: string) => void;
  onError: (err: any) => void;
}) {
  const [{ isPending }] = usePayPalScriptReducer();

  return (
    <div>
      {isPending && (
        <div className="flex items-center justify-center py-6">
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
          <span className="ml-3 text-gray-500 text-sm">Chargement PayPal...</span>
        </div>
      )}
      <PayPalButtons
        style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 48 }}
        fundingSource={undefined} // Affiche tous les modes dispo (PayPal + carte + Google Pay)
        createOrder={() => Promise.resolve(orderId)}
        onApprove={async (data: any) => {
          onApprove(data.paymentSource || 'paypal');
        }}
        onError={(err) => {
          console.error('PayPal error:', err);
          onError(err);
        }}
        onCancel={() => {}}
      />
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────

export default function PaymentModal({ isOpen, plan = 'PREMIUM_MONTHLY', donationAmount, onSuccess, onClose }: Props) {
  const [step, setStep]             = useState<'plan' | 'pay' | 'processing' | 'success' | 'error'>('plan');
  const [orderId, setOrderId]       = useState<string | null>(null);
  const [clientId, setClientId]     = useState<string | null>(null);
  const [mode, setMode]             = useState<'sandbox' | 'live'>('sandbox');
  const [amount, setAmount]         = useState<number>(donationAmount || 10);
  const [errorMsg, setErrorMsg]     = useState('');
  const info = PLAN_INFO[plan];

  useEffect(() => {
    if (isOpen) { setStep('plan'); setOrderId(null); setErrorMsg(''); }
  }, [isOpen, plan]);

  // Étape 1 — Créer la commande
  const startPayment = async () => {
    setStep('processing');
    try {
      const { data } = await api.post('/payments/create-order', {
        plan,
        amount: plan === 'DONATION' ? amount : undefined,
      });
      setOrderId(data.orderId);
      setClientId(data.clientId);
      setMode(data.mode || 'sandbox');
      setStep('pay');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Erreur lors de la création de la commande');
      setStep('error');
    }
  };

  // Étape 2 — Capturer après approbation PayPal
  const handleApprove = async (paymentMethod: string) => {
    setStep('processing');
    try {
      const { data } = await api.post(`/payments/capture/${orderId}`, { paymentMethod });
      setStep('success');
      setTimeout(() => onSuccess({ plan, amount: data.amount || amount }), 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Erreur lors de la capture du paiement');
      setStep('error');
    }
  };

  const finalAmount = plan === 'DONATION' ? amount
    : plan === 'PREMIUM_YEARLY' ? 79.99 : 9.99;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={step !== 'processing' ? onClose : undefined}
        >
          <motion.div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            initial={{ scale: 0.93, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93 }}
            onClick={e => e.stopPropagation()}
          >

            {/* ── Étape 1 : Résumé du plan ──────────────────────────────── */}
            {step === 'plan' && (
              <div>
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 px-8 pt-8 pb-6 text-white">
                  <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl">✕</button>
                  <p className="text-3xl mb-2">{info.emoji}</p>
                  <h2 className="text-2xl font-black mb-1">{info.label}</h2>
                  <p className="text-3xl font-black">{plan === 'DONATION' ? `${amount}€` : info.price}</p>
                </div>

                <div className="px-8 py-6">
                  {/* Sélecteur montant pour les dons */}
                  {plan === 'DONATION' && (
                    <div className="mb-5">
                      <p className="text-xs text-gray-400 font-bold uppercase mb-2">Montant</p>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {[5, 10, 20, 50].map(a => (
                          <button key={a} onClick={() => setAmount(a)}
                            className={`py-2 rounded-xl font-black text-sm transition-all ${
                              amount === a ? 'bg-teal-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-teal-50'
                            }`}>
                            {a}€
                          </button>
                        ))}
                      </div>
                      <input type="number" min="1" max="9999" value={amount}
                        onChange={e => setAmount(Number(e.target.value))}
                        className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-3 py-2 text-sm outline-none"
                        placeholder="Montant libre..."
                      />
                    </div>
                  )}

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {info.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-teal-500 font-black">✓</span> {f}
                      </li>
                    ))}
                  </ul>

                  <button onClick={startPayment}
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white font-black py-4 rounded-2xl text-lg hover:shadow-lg transition-all hover:-translate-y-0.5">
                    Payer {finalAmount.toFixed(2)}€ →
                  </button>

                  <div className="flex items-center justify-center gap-3 mt-4 text-xs text-gray-400">
                    <span>🔒 Sécurisé PayPal</span>
                    <span>·</span>
                    <img src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-100px.png"
                      alt="PayPal" className="h-4 opacity-50" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Étape 2 : Boutons PayPal ──────────────────────────────── */}
            {step === 'pay' && orderId && clientId && (
              <div className="px-8 py-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">{info.emoji} Paiement</h3>
                    <p className="text-teal-600 font-black text-xl">{finalAmount.toFixed(2)}€</p>
                  </div>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">✕</button>
                </div>

                <p className="text-xs text-gray-400 font-bold uppercase mb-3">Choisir votre méthode</p>

                <PayPalScriptProvider options={{
                  clientId,
                  currency: 'EUR',
                  intent: 'capture',
                  components: 'buttons',
                  enableFunding: 'card,googlepay,venmo',
                  // @ts-ignore
                  'data-sdk-integration-source': 'focusbrain',
                }}>
                  <PayPalButtonsWrapper
                    orderId={orderId}
                    onApprove={handleApprove}
                    onError={(err) => { setErrorMsg('Paiement refusé ou annulé.'); setStep('error'); }}
                  />
                </PayPalScriptProvider>

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 justify-center">
                  <span>🔒 Paiement chiffré SSL</span>
                  <span>·</span>
                  <span>CB, Google Pay, PayPal</span>
                </div>

                <button onClick={() => setStep('plan')}
                  className="w-full text-gray-400 text-xs mt-3 hover:text-gray-600">
                  ← Retour
                </button>
              </div>
            )}

            {/* ── Étape 3 : Processing ──────────────────────────────────── */}
            {step === 'processing' && (
              <div className="px-8 py-16 text-center">
                <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-6" />
                <p className="font-black text-gray-900 text-lg mb-1">Traitement en cours...</p>
                <p className="text-gray-400 text-sm">Ne fermez pas cette fenêtre</p>
              </div>
            )}

            {/* ── Étape 4 : Succès ──────────────────────────────────────── */}
            {step === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-8 py-16 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, delay: 0.1 }}
                  className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl"
                >
                  ✅
                </motion.div>
                <h3 className="font-black text-gray-900 text-2xl mb-2">Paiement confirmé !</h3>
                <p className="text-gray-500 mb-2">
                  {plan === 'DONATION'
                    ? 'Merci pour ton soutien à FocusBrain 💜'
                    : 'Ton compte Premium est activé 🎉'}
                </p>
                <p className="text-teal-600 font-bold text-lg">{finalAmount.toFixed(2)}€</p>
              </motion.div>
            )}

            {/* ── Étape 5 : Erreur ──────────────────────────────────────── */}
            {step === 'error' && (
              <div className="px-8 py-12 text-center">
                <p className="text-4xl mb-4">😔</p>
                <h3 className="font-black text-gray-900 text-xl mb-2">Paiement non complété</h3>
                <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
                <button onClick={() => setStep('plan')}
                  className="w-full bg-teal-500 text-white font-bold py-3 rounded-xl hover:bg-teal-600 transition-colors">
                  Réessayer
                </button>
                <button onClick={onClose} className="w-full text-gray-400 text-sm mt-3">Fermer</button>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
