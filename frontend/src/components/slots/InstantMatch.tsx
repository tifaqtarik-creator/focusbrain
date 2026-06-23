/**
 * InstantMatch.tsx — Matching instantané « hybride »
 * 1) Recherche d'un partenaire en temps réel (file socket)
 * 2) Proposition : on voit la CARTE du partenaire (photo + infos) → Accepter / Refuser
 * 3) Double accord → Slot CONFIRMED côté serveur → redirection vers la salle live
 */
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket, connectSocket } from '../../lib/socket';
import {
  Loader2, X, Check, Clock, Globe, Target, Brain, ShieldCheck, Zap, Volume2, MessageSquare,
} from 'lucide-react';

export interface InstantIntent {
  duration: number;
  category?: string;
  ambiance?: string;
  energy?: string;
  tasks: string[];
}

interface PartnerCard {
  userId: string;
  name: string;
  avatar: string | null;
  tdahType?: string;
  workStyle?: string;
  sessionsCompleted: number;
  sessionsNoShow: number;
  preferredLanguages: string[];
  duration: number;
  tasks: string[];
  category?: string;
  ambiance?: string;
  energy?: string;
}

const TDAH_LABEL: Record<string, string> = {
  INATTENTIF: 'TDAH inattentif', HYPERACTIF: 'TDAH hyperactif',
  COMBINE: 'TDAH combiné', NON_SPECIFIE: 'TDAH', PREFERE_NE_PAS_DIRE: 'TDAH',
};
const AMBIANCE_LABEL: Record<string, string> = { silence: 'Silence total', echanges: 'Petits échanges' };

function reliability(c: number, n: number): { label: string; good: boolean } {
  const total = c + n;
  if (total === 0) return { label: 'Nouveau membre', good: false };
  const rate = Math.round((c / total) * 100);
  return { label: `${rate}% de présence`, good: rate >= 80 };
}

export default function InstantMatch({
  intent, onClose, onMatched,
}: { intent: InstantIntent; onClose: () => void; onMatched: (slotId: string) => void }) {
  const [phase, setPhase]   = useState<'searching' | 'proposal'>('searching');
  const [partner, setPartner] = useState<PartnerCard | null>(null);
  const [myAccept, setMyAccept] = useState(false);
  const [partnerAccept, setPartnerAccept] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Connexion + écoute des évènements de matching ──
  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    const backToSearch = () => {
      setPhase('searching'); setPartner(null); setMyAccept(false); setPartnerAccept(false);
      if (cdRef.current) clearInterval(cdRef.current);
    };

    const onWaiting  = () => setPhase('searching');
    const onProposal = (d: { partner: PartnerCard; ttl: number }) => {
      setPartner(d.partner); setMyAccept(false); setPartnerAccept(false); setPhase('proposal');
      const secs = Math.round((d.ttl || 15000) / 1000);
      setCountdown(secs);
      if (cdRef.current) clearInterval(cdRef.current);
      cdRef.current = setInterval(() => setCountdown(s => (s <= 1 ? 0 : s - 1)), 1000);
    };
    const onPartnerAccepted = () => setPartnerAccept(true);
    const onEnded   = () => backToSearch();
    const onMatch   = (d: { slotId: string }) => { if (cdRef.current) clearInterval(cdRef.current); onMatched(d.slotId); };

    socket.on('instant:waiting', onWaiting);
    socket.on('instant:proposal', onProposal);
    socket.on('instant:partner_accepted', onPartnerAccepted);
    socket.on('instant:proposal_ended', onEnded);
    socket.on('session:matched', onMatch);

    // Lancer la recherche
    socket.emit('instant:search', {
      duration: intent.duration, category: intent.category,
      ambiance: intent.ambiance, energy: intent.energy, tasks: intent.tasks,
    });

    return () => {
      socket.emit('instant:cancel');
      socket.off('instant:waiting', onWaiting);
      socket.off('instant:proposal', onProposal);
      socket.off('instant:partner_accepted', onPartnerAccepted);
      socket.off('instant:proposal_ended', onEnded);
      socket.off('session:matched', onMatch);
      if (cdRef.current) clearInterval(cdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accept  = () => { setMyAccept(true); getSocket().emit('instant:accept'); };
  const decline = () => { getSocket().emit('instant:decline'); };
  const cancel  = () => { getSocket().emit('instant:cancel'); onClose(); };

  const rel = partner ? reliability(partner.sessionsCompleted, partner.sessionsNoShow) : null;

  return (
    <motion.div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="bg-white rounded-3xl w-full max-w-sm shadow-card overflow-hidden"
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}>

        <AnimatePresence mode="wait">
          {/* ── PHASE 1 — RECHERCHE ── */}
          {phase === 'searching' && (
            <motion.div key="search" className="p-8 text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-5">
                <Loader2 size={30} strokeWidth={2.25} className="animate-spin" />
              </span>
              <h3 className="font-black text-ink-900 text-xl mb-1">Recherche d'un partenaire…</h3>
              <p className="text-ink-500 text-sm mb-1">Session instantanée de {intent.duration} min</p>
              <p className="text-ink-400 text-xs mb-6">On te connecte dès qu'une personne est disponible. Reste sur cette page ✨</p>
              <button onClick={cancel}
                className="w-full border-2 border-line text-ink-600 font-bold py-3 rounded-xl text-sm hover:bg-surface-soft transition-colors">
                Annuler
              </button>
            </motion.div>
          )}

          {/* ── PHASE 2 — PROPOSITION (carte partenaire) ── */}
          {phase === 'proposal' && partner && (
            <motion.div key="proposal"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              {/* En-tête carte */}
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 px-6 pt-6 pb-8 text-center text-white relative">
                <span className="absolute top-3 right-4 text-xs font-bold bg-white/20 rounded-full px-2.5 py-1 inline-flex items-center gap-1">
                  <Clock size={12} strokeWidth={2.5} /> {countdown}s
                </span>
                <div className="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden border-4 border-white/40 bg-white/20 flex items-center justify-center">
                  {partner.avatar
                    ? <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
                    : <span className="text-3xl font-black">{partner.name?.[0]?.toUpperCase()}</span>}
                </div>
                <h3 className="font-black text-xl">{partner.name}</h3>
                {partner.tdahType && (
                  <p className="text-white/85 text-sm inline-flex items-center gap-1.5 mt-0.5">
                    <Brain size={14} strokeWidth={2} /> {TDAH_LABEL[partner.tdahType] || 'TDAH'}
                  </p>
                )}
              </div>

              {/* Infos */}
              <div className="p-5 space-y-2.5">
                {rel && (
                  <Row Icon={ShieldCheck} tint={rel.good ? 'text-teal-600' : 'text-ink-400'}>
                    <span className="font-semibold text-ink-700">{partner.sessionsCompleted} sessions</span>
                    <span className="text-ink-400"> · {rel.label}</span>
                  </Row>
                )}
                <Row Icon={Clock}><span className="text-ink-700">{partner.duration} min de focus</span></Row>
                {partner.ambiance && (
                  <Row Icon={partner.ambiance === 'silence' ? Volume2 : MessageSquare}>
                    <span className="text-ink-700">{AMBIANCE_LABEL[partner.ambiance] || partner.ambiance}</span>
                  </Row>
                )}
                {partner.preferredLanguages?.length > 0 && (
                  <Row Icon={Globe}><span className="text-ink-700 uppercase">{partner.preferredLanguages.join(' · ')}</span></Row>
                )}
                {partner.tasks?.length > 0 && (
                  <Row Icon={Target}>
                    <span className="text-ink-700">{partner.tasks.slice(0, 3).join(', ')}</span>
                  </Row>
                )}

                {/* État d'acceptation */}
                {(myAccept || partnerAccept) && (
                  <div className="bg-teal-50 text-teal-700 text-xs font-semibold rounded-xl px-3 py-2 flex items-center gap-1.5 mt-1">
                    <Check size={14} strokeWidth={2.5} />
                    {myAccept && partnerAccept ? 'Vous êtes tous les deux partants !'
                      : myAccept ? "En attente de la réponse de ton partenaire…"
                      : `${partner.name} veut démarrer avec toi !`}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button onClick={decline} disabled={myAccept}
                    className="flex-1 border-2 border-line text-ink-600 font-bold py-3 rounded-xl text-sm hover:bg-surface-soft disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-1.5">
                    <X size={17} strokeWidth={2.25} /> Passer
                  </button>
                  <button onClick={accept} disabled={myAccept}
                    className="flex-[1.4] bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-black py-3 rounded-xl text-sm inline-flex items-center justify-center gap-1.5 transition-colors">
                    {myAccept ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} strokeWidth={2.5} />}
                    {myAccept ? 'En attente…' : 'Accepter'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function Row({ Icon, tint, children }: { Icon: any; tint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon size={16} strokeWidth={2} className={tint || 'text-teal-500'} />
      <div className="min-w-0 truncate">{children}</div>
    </div>
  );
}
