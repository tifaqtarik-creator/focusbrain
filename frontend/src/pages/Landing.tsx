import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n, LANGUAGES } from '../lib/i18n';
import { useState } from 'react';

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

      {/* Nav — simple, 3 éléments max */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="text-xl font-black text-teal-500" style={{ fontFamily: 'DM Sans' }}>
          🧠 FocusBrain
        </span>
        <div className="flex items-center gap-3">
          {/* Sélecteur langue */}
          <div className="relative">
            <button
              onClick={() => setShowLang(v => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
            >
              {LANGUAGES.find(l => l.code === lang)?.flag} <span className="uppercase text-xs text-gray-500">{lang}</span>
            </button>
            {showLang && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 w-44 z-50"
              >
                {LANGUAGES.map(lg => (
                  <button key={lg.code} onClick={() => { setLang(lg.code); setShowLang(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-teal-50 transition-colors ${lang === lg.code ? 'text-teal-600 font-bold' : 'text-gray-700'}`}>
                    <span>{lg.flag}</span><span>{lg.label}</span>
                    {lang === lg.code && <span className="ml-auto">✓</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          <Link to="/donate" className="text-purple-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-purple-50 transition-colors flex items-center gap-1">
            💜 Soutenir
          </Link>
          <Link to="/login" className="text-gray-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            {t.auth.connect}
          </Link>
          <Link to="/register" className="bg-teal-500 text-white font-bold px-5 py-2 rounded-xl hover:bg-teal-600 transition-colors text-sm shadow-sm">
            {l.cta}
          </Link>
        </div>
      </nav>

      {/* Hero — 1 seul message, 1 seul CTA */}
      <section className="max-w-3xl mx-auto text-center px-6 py-20">
        <motion.div {...fade}>
          <span className="inline-block bg-teal-50 text-teal-700 font-semibold px-4 py-1.5 rounded-full text-sm mb-8">
            {l.badge}
          </span>
          <h1 className="text-5xl font-black text-gray-900 leading-tight mb-6" style={{ fontFamily: 'DM Sans' }}>
            {l.hero1}<br />
            <span className="text-teal-500">{l.hero2}</span><br />
            {l.hero3}
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            {l.sub}
          </p>
          {/* 1 seul CTA principal */}
          <Link
            to="/register"
            className="inline-block bg-teal-500 text-white font-black text-xl px-12 py-4 rounded-2xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-100"
          >
            {l.cta}
          </Link>
          <p className="text-gray-400 text-sm mt-4">{l.ctaSub}</p>
        </motion.div>
      </section>

      {/* Stats — 4 chiffres, simple */}
      <section className="bg-teal-50 py-10">
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { val: l.stat1val, label: l.stat1 },
            { val: l.stat2val, label: l.stat2 },
            { val: l.stat3val, label: l.stat3 },
            { val: l.stat4val, label: l.stat4 },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-black text-teal-600">{s.val}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Science — 3 cartes, max */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black mb-2" style={{ fontFamily: 'DM Sans' }}>{l.scienceTitle}</h2>
          <p className="text-gray-500">{l.scienceSub}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '⚡', title: l.m1title, desc: l.m1 },
            { icon: '👁️', title: l.m2title, desc: l.m2 },
            { icon: '⏱️', title: l.m3title, desc: l.m3 },
          ].map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="bg-white border border-gray-100 rounded-2xl p-7"
            >
              <div className="text-4xl mb-4">{m.icon}</div>
              <h3 className="font-bold text-lg mb-2">{m.title}</h3>
              <p className="text-gray-500 leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comment ça marche — 3 étapes */}
      <section id="comment" className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-12" style={{ fontFamily: 'DM Sans' }}>{l.howTitle}</h2>
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
                <div className="w-14 h-14 bg-teal-500 text-white rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="font-bold text-xl mb-2">{s.title}</h3>
                <p className="text-gray-500">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages — 3 cartes */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-black text-center mb-12" style={{ fontFamily: 'DM Sans' }}>{l.quoteTitle}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-teal-50 rounded-2xl p-7"
            >
              <p className="text-gray-700 italic leading-relaxed mb-5">"{t.textKey}"</p>
              <div>
                <div className="font-bold text-gray-900">{t.name}</div>
                <div className="text-teal-600 text-sm">{t.type}</div>
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
          className="bg-gradient-to-br from-purple-50 to-teal-50 rounded-3xl p-10 text-center border border-purple-100 shadow-sm"
        >
          <span className="text-4xl block mb-4">💜</span>
          <h2 className="text-3xl font-black text-gray-900 mb-3" style={{ fontFamily: 'DM Sans' }}>
            Tu crois en ce projet ?
          </h2>
          <p className="text-gray-500 text-lg mb-2 max-w-xl mx-auto leading-relaxed">
            FocusBrain est construit par un adulte TDAH, seul, pour notre communauté.
            Un petit don peut changer beaucoup.
          </p>
          <p className="text-gray-400 text-sm mb-8">
            Paiement sécurisé via PayPal · À partir de 5€ · Aucun compte requis
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {[5, 10, 20].map(amount => (
              <Link
                key={amount}
                to={`/donate`}
                className="bg-white border-2 border-purple-200 hover:border-purple-400 text-gray-900 font-black px-6 py-3 rounded-2xl transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                {amount}€
              </Link>
            ))}
          </div>
          <Link
            to="/donate"
            className="inline-block bg-gradient-to-r from-purple-500 to-teal-500 text-white font-black text-lg px-10 py-4 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            💜 Soutenir FocusBrain
          </Link>
        </motion.div>
      </section>

      {/* CTA final — 1 message, 1 bouton */}
      <section className="bg-teal-500 py-20 text-center text-white">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-4xl font-black mb-3" style={{ fontFamily: 'DM Sans' }}>{l.finalTitle}</h2>
          <p className="text-xl opacity-80 mb-8">{l.finalSub}</p>
          <Link
            to="/register"
            className="inline-block bg-white text-teal-600 font-black text-xl px-12 py-4 rounded-2xl hover:bg-gray-50 transition-colors shadow-xl"
          >
            {l.cta}
          </Link>
          <p className="mt-3 opacity-60 text-sm">{l.ctaSub}</p>
        </motion.div>
      </section>

      <footer className="text-center py-6 text-gray-400 text-sm">
        <p>{l.footer}</p>
      </footer>
    </div>
  );
}
