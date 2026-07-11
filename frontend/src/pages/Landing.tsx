import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n, LANGUAGES } from '../lib/i18n';
import { useState } from 'react';
import { Brain, HeartHandshake, Check, Zap, Eye, Timer, Heart, ArrowRight, Users, Sparkles } from 'lucide-react';

const TESTIMONIALS = [
  { name: 'Yasmine, 31 ans', type: 'TDAH Inattentif', textKey: 'Pour la première fois je termine mes livrables sans la spirale de honte.' },
  { name: 'Adam, 24 ans', type: 'TDAH Hyperactif', textKey: 'Les sessions de 15 min c\'est parfait. Je n\'ai plus besoin de me forcer 2h.' },
  { name: 'Nadia, 38 ans', type: 'TDAH Combiné', textKey: 'Le mode audio m\'a sauvée. Body Doubling sans l\'anxiété sociale.' },
];

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

export default function Landing() {
  const { t, lang, setLang } = useI18n();
  const l = t.landing;
  const [showLang, setShowLang] = useState(false);

  return (
    <div className="min-h-screen bg-white" dir={lang === 'ar' ? 'rtl' : 'ltr'}>

      {/* Nav — sticky, fond translucide, 3 éléments max */}
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-line">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-6xl mx-auto">
          <span className="text-xl font-black text-teal-600 inline-flex items-center gap-2" style={{ fontFamily: 'DM Sans' }}>
            <span className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center">
              <Brain size={20} strokeWidth={2.2} className="text-white" />
            </span>
            FocusBrain
          </span>
          <div className="flex items-center gap-3">
            {/* Sélecteur langue */}
            <div className="relative">
              <button
                onClick={() => setShowLang(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold bg-surface-soft hover:bg-surface-muted border border-line transition-colors"
              >
                {LANGUAGES.find(l => l.code === lang)?.flag} <span className="uppercase text-xs text-ink-500">{lang}</span>
              </button>
              {showLang && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 bg-white rounded-2xl shadow-card border border-line py-2 w-44 z-50"
                >
                  {LANGUAGES.map(lg => (
                    <button key={lg.code} onClick={() => { setLang(lg.code); setShowLang(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-teal-50 transition-colors ${lang === lg.code ? 'text-teal-600 font-bold' : 'text-ink-700'}`}>
                      <span>{lg.flag}</span><span>{lg.label}</span>
                      {lang === lg.code && <Check size={16} strokeWidth={2.5} className="ml-auto text-teal-600" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <Link to="/donate" className="hidden sm:flex text-violet-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-violet-50 transition-colors items-center gap-1.5">
              <Heart size={15} strokeWidth={2} className="text-violet-600" /> Soutenir
            </Link>
            <Link to="/login" className="text-ink-500 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-surface-soft transition-colors">
              {t.auth.connect}
            </Link>
            <Link to="/register" className="bg-teal-500 text-white font-bold px-5 py-2 rounded-xl hover:bg-teal-600 transition-colors text-sm shadow-sm">
              {l.cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — 1 seul message, 1 seul CTA, fond bleu très doux */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 via-white to-white">
        {/* halos décoratifs */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-100/60 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-violet-100/50 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div {...fade} className="text-center lg:text-left rtl:lg:text-right">
            <span className="inline-flex items-center gap-2 bg-white border border-teal-200 text-teal-700 font-semibold px-4 py-1.5 rounded-full text-sm mb-7 shadow-soft">
              <Sparkles size={15} strokeWidth={2} className="text-teal-500" />
              {l.badge}
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-ink-900 leading-tight mb-6" style={{ fontFamily: 'DM Sans' }}>
              {l.hero1}<br />
              <span className="text-teal-500">{l.hero2}</span><br />
              {l.hero3}
            </h1>
            <p className="text-xl text-ink-500 mb-9 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {l.sub}
            </p>
            {/* 1 seul CTA principal */}
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-teal-500 text-white font-black text-xl px-12 py-4 rounded-2xl hover:bg-teal-600 transition-colors shadow-card"
            >
              {l.cta}
              <ArrowRight size={20} strokeWidth={2.5} className="rtl:rotate-180" />
            </Link>
            <p className="text-ink-400 text-sm mt-4">{l.ctaSub}</p>
          </motion.div>

          {/* Aperçu d'une session — carte illustrative, zéro image externe */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
            className="hidden lg:block"
            aria-hidden
          >
            <div className="relative mx-auto max-w-md">
              <div className="bg-white rounded-3xl shadow-card border border-line p-7">
                <div className="flex items-center justify-between mb-6">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    Session en cours
                  </span>
                  <span className="text-ink-400 text-sm font-semibold">25 min</span>
                </div>
                <div className="flex items-center justify-center gap-8 mb-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 font-black text-xl flex items-center justify-center mb-2">Y</div>
                    <div className="text-xs font-semibold text-ink-500">Yasmine</div>
                  </div>
                  <div className="w-24 h-24 rounded-full border-[6px] border-teal-500 flex items-center justify-center">
                    <span className="font-black text-2xl text-ink-900 tabular-nums">17:42</span>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-700 font-black text-xl flex items-center justify-center mb-2">A</div>
                    <div className="text-xs font-semibold text-ink-500">Adam</div>
                  </div>
                </div>
                <div className="bg-surface-soft rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Users size={18} strokeWidth={2} className="text-teal-600 shrink-0" />
                  <p className="text-sm text-ink-700 font-medium">Deux cerveaux TDAH, une même tâche, zéro jugement.</p>
                </div>
              </div>
              {/* petite carte flottante */}
              <div className="absolute -bottom-5 -left-6 bg-white rounded-2xl shadow-card border border-line px-4 py-3 flex items-center gap-2">
                <Check size={16} strokeWidth={3} className="text-teal-500" />
                <span className="text-sm font-bold text-ink-900">Tâche démarrée en 90s</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats — 4 chiffres, bande bleue */}
      <section className="bg-teal-500 py-12">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: l.stat1val, label: l.stat1 },
            { val: l.stat2val, label: l.stat2 },
            { val: l.stat3val, label: l.stat3 },
            { val: l.stat4val, label: l.stat4 },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-black text-white">{s.val}</div>
              <div className="text-sm text-teal-100 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Science — 3 cartes, max */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-ink-900 mb-2" style={{ fontFamily: 'DM Sans' }}>{l.scienceTitle}</h2>
          <p className="text-ink-500">{l.scienceSub}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { Icon: Zap, title: l.m1title, desc: l.m1 },
            { Icon: Eye, title: l.m2title, desc: l.m2 },
            { Icon: Timer, title: l.m3title, desc: l.m3 },
          ].map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="bg-white border border-line rounded-2xl p-7 shadow-soft hover:shadow-card transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                <m.Icon size={26} strokeWidth={2} className="text-teal-600" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-ink-900">{m.title}</h3>
              <p className="text-ink-500 leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comment ça marche — 3 étapes */}
      <section id="comment" className="bg-surface-soft py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center text-ink-900 mb-12" style={{ fontFamily: 'DM Sans' }}>{l.howTitle}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '1', title: l.step1, desc: l.step1d },
              { num: '2', title: l.step2, desc: l.step2d },
              { num: '3', title: l.step3, desc: l.step3d },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-teal-500 text-white rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-soft">
                  {s.num}
                </div>
                <h3 className="font-bold text-xl mb-2 text-ink-900">{s.title}</h3>
                <p className="text-ink-500">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages — 3 cartes */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-black text-center text-ink-900 mb-12" style={{ fontFamily: 'DM Sans' }}>{l.quoteTitle}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-teal-50 border border-teal-100 rounded-2xl p-7"
            >
              <p className="text-ink-700 italic leading-relaxed mb-5">"{t.textKey}"</p>
              <div>
                <div className="font-bold text-ink-900">{t.name}</div>
                <div className="text-teal-600 text-sm font-semibold">{t.type}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Section Donation ────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-violet-50 to-teal-50 rounded-3xl p-10 text-center border border-line shadow-card"
        >
          <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <HeartHandshake size={30} strokeWidth={2} className="text-violet-600" />
          </div>
          <h2 className="text-3xl font-black text-ink-900 mb-3" style={{ fontFamily: 'DM Sans' }}>
            Tu crois en ce projet ?
          </h2>
          <p className="text-ink-500 text-lg mb-2 max-w-xl mx-auto leading-relaxed">
            FocusBrain est construit par un adulte TDAH, seul, pour notre communauté.
            Un petit don peut changer beaucoup.
          </p>
          <p className="text-ink-400 text-sm mb-8">
            Paiement sécurisé via PayPal · À partir de 5€ · Aucun compte requis
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {[5, 10, 20].map(amount => (
              <Link
                key={amount}
                to={`/donate`}
                className="bg-white border-2 border-violet-200 hover:border-violet-400 text-ink-900 font-black px-6 py-3 rounded-2xl transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                {amount}€
              </Link>
            ))}
          </div>
          <Link
            to="/donate"
            className="inline-flex items-center gap-2 bg-violet-500 text-white font-black text-lg px-10 py-4 rounded-2xl hover:bg-violet-600 hover:shadow-card transition-all hover:-translate-y-0.5"
          >
            <Heart size={18} strokeWidth={2} /> Soutenir FocusBrain
          </Link>
        </motion.div>
      </section>

      {/* CTA final — 1 message, 1 bouton, dégradé bleu */}
      <section className="bg-gradient-to-br from-teal-600 via-teal-500 to-teal-700 py-20 text-center text-white">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-4xl font-black mb-3" style={{ fontFamily: 'DM Sans' }}>{l.finalTitle}</h2>
          <p className="text-xl text-teal-100 mb-8">{l.finalSub}</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-teal-700 font-black text-xl px-12 py-4 rounded-2xl hover:bg-teal-50 transition-colors shadow-card"
          >
            {l.cta}
            <ArrowRight size={20} strokeWidth={2.5} className="rtl:rotate-180" />
          </Link>
          <p className="mt-3 text-teal-100/80 text-sm">{l.ctaSub}</p>
        </motion.div>
      </section>

      <footer className="text-center py-6 text-ink-400 text-sm">
        <p>{l.footer}</p>
      </footer>
    </div>
  );
}
