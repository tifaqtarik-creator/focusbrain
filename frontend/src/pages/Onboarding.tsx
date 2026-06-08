/**
 * Onboarding.tsx — Wizard 4 étapes (réduit depuis 7 pour limiter l'abandon TDAH)
 * KPI ciblé : taux de complétion > 70%
 */
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Select from 'react-select';
import { Country, City } from 'country-state-city';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';

// ── Données ────────────────────────────────────────────────────────────────────

const GENDERS = [
  { value: 'HOMME',               label: '👨 Homme' },
  { value: 'FEMME',               label: '👩 Femme' },
  { value: 'NON_BINAIRE',         label: '🧑 Non-binaire' },
  { value: 'PREFERE_NE_PAS_DIRE', label: '🔒 Ne pas préciser' },
];

const TDAH_TYPES = [
  { value: 'INATTENTIF',          emoji: '🌊', label: 'Inattentif',            desc: 'Difficultés de concentration, rêveries' },
  { value: 'HYPERACTIF',          emoji: '⚡', label: 'Hyperactif / Impulsif', desc: 'Énergie débordante, impulsivité' },
  { value: 'COMBINE',             emoji: '🌀', label: 'Combiné',               desc: 'Les deux à la fois' },
  { value: 'NON_SPECIFIE',        emoji: '❓', label: 'Je ne sais pas encore', desc: '' },
  { value: 'PREFERE_NE_PAS_DIRE', emoji: '🔒', label: 'Ne pas préciser',       desc: '' },
];

const DIAGNOSIS_STATUS = [
  { value: 'DIAGNOSTIQUE',       emoji: '✅', label: 'Diagnostiqué(e) officiellement' },
  { value: 'EN_COURS',          emoji: '🔍', label: 'En cours de diagnostic' },
  { value: 'AUTO_DIAGNOSTIQUE', emoji: '💭', label: 'Auto-diagnostiqué(e)' },
  { value: 'NON_DIAGNOSTIQUE',  emoji: '🤔', label: 'Je découvre le sujet' },
];

const OBJECTIVES = [
  { value: 'FOCUS_TRAVAIL',       emoji: '💼', label: 'Mieux me concentrer au travail' },
  { value: 'TROUVER_PARTENAIRES', emoji: '👥', label: 'Trouver des partenaires body doubling' },
  { value: 'RENCONTRER_TDAH',     emoji: '🤝', label: 'Rencontrer d\'autres adultes TDAH' },
  { value: 'CREER_ROUTINES',      emoji: '📅', label: 'Créer des routines stables' },
  { value: 'GERER_EMOTIONS',      emoji: '🧘', label: 'Gérer procrastination & anxiété' },
  { value: 'PARTAGER_EXPERIENCE', emoji: '💬', label: 'Partager & aider la communauté' },
];

const WORK_STYLES = [
  { value: 'SILENCIEUX', emoji: '🤫', label: 'En silence', desc: 'Concentration max' },
  { value: 'SOCIAL',     emoji: '👥', label: 'Avec du monde', desc: 'L\'énergie des autres' },
  { value: 'FLEXIBLE',   emoji: '🔀', label: 'Flexible', desc: 'Selon l\'humeur' },
];

const AVAILABILITIES = [
  { value: 'MATIN',      emoji: '🌅', label: 'Matin',      desc: '6h–12h' },
  { value: 'APRES_MIDI', emoji: '☀️', label: 'Après-midi', desc: '12h–18h' },
  { value: 'SOIR',       emoji: '🌙', label: 'Soir',       desc: '18h–23h' },
  { value: 'NUIT',       emoji: '🌃', label: 'Nuit',       desc: '23h–6h' },
  { value: 'WEEKEND',    emoji: '📅', label: 'Week-end',   desc: 'Sam & Dim' },
];

const DICEBEAR_AVATARS = [
  { seed: 'Felix',   bg: 'b6e3f4' },
  { seed: 'Zoe',     bg: 'ffd5dc' },
  { seed: 'Max',     bg: 'c0aede' },
  { seed: 'Aria',    bg: 'ffdfbf' },
  { seed: 'Leo',     bg: 'd1d4f9' },
  { seed: 'Mia',     bg: 'b6e3f4' },
  { seed: 'Noah',    bg: 'ffd5dc' },
  { seed: 'Luna',    bg: 'c0aede' },
  { seed: 'Ethan',   bg: 'ffdfbf' },
  { seed: 'Sophie',  bg: 'd1d4f9' },
  { seed: 'Oliver',  bg: 'b6e3f4' },
  { seed: 'Emma',    bg: 'ffd5dc' },
];

const TOTAL_STEPS = 4;

interface OnboardingData {
  // Étape 1
  gender: string; birthDay: string; birthMonth: string; birthYear: string; phone: string;
  // Étape 2
  avatar: string | null; avatarFile: File | null;
  countryCode: string; country: string; city: string;
  // Étape 3
  tdahType: string; diagnosisStatus: string; workObjectives: string[];
  // Étape 4
  workStyle: string; availabilities: string[];
}

export default function Onboarding() {
  const navigate  = useNavigate();
  const { updateUser } = useAppStore();
  const fileRef   = useRef<HTMLInputElement>(null);

  const [step, setStep]         = useState(1);
  const [dir,  setDir]          = useState(1);
  const [saving, setSaving]     = useState(false);
  const [geoLoad, setGeoLoad]   = useState(false);

  const [d, setD] = useState<OnboardingData>({
    gender: '', birthDay: '', birthMonth: '', birthYear: '', phone: '',
    avatar: null, avatarFile: null,
    countryCode: 'MA', country: 'Maroc', city: '',
    tdahType: '', diagnosisStatus: '', workObjectives: [],
    workStyle: '', availabilities: [],
  });

  const set = (k: keyof OnboardingData, v: any) => setD(p => ({ ...p, [k]: v }));
  const next = () => { setDir(1);  setStep(s => Math.min(s + 1, TOTAL_STEPS)); };
  const prev = () => { setDir(-1); setStep(s => Math.max(s - 1, 1)); };

  // Géoloc + reverse geocoding Maptiler
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setGeoLoad(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords;
        const res = await fetch(
          `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=oer00nopMf2v9886mVRZ&language=fr`
        );
        const json = await res.json();
        const ctx  = json.features?.[0]?.context || [];
        const city    = ctx.find((c: any) => c.id?.startsWith('place'))?.text || '';
        const country = ctx.find((c: any) => c.id?.startsWith('country'))?.text || '';
        const cc      = ctx.find((c: any) => c.id?.startsWith('country'))?.short_code?.toUpperCase() || 'MA';
        if (city)    set('city', city);
        if (country) set('country', country);
        if (cc)      set('countryCode', cc);
      } catch { /* silencieux */ }
      setGeoLoad(false);
    }, () => setGeoLoad(false));
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set('avatar', URL.createObjectURL(file));
    set('avatarFile', file);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const birthDate = d.birthYear && d.birthMonth && d.birthDay
        ? `${d.birthYear}-${d.birthMonth.padStart(2,'0')}-${d.birthDay.padStart(2,'0')}`
        : null;

      const payload: any = {
        gender: d.gender || undefined,
        birthDate: birthDate || undefined,
        phone: d.phone || undefined,
        tdahType: d.tdahType || undefined,
        diagnosisStatus: d.diagnosisStatus || undefined,
        workObjectives: d.workObjectives,
        workStyle: d.workStyle || undefined,
        availabilities: d.availabilities,
        onboardingDone: true,
      };

      // Avatar DiceBear ou URL
      if (d.avatar && !d.avatarFile) payload.avatar = d.avatar;

      const res = await api.patch('/users/me', payload);

      if (d.city || d.country) {
        await api.post('/map/location', {
          lat: 31.63, lng: -8.0,
          city: d.city, country: d.countryCode,
        }).catch(() => {});
      }

      if (d.avatarFile) {
        const fd = new FormData();
        fd.append('avatar', d.avatarFile);
        await api.post('/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }

      updateUser(res.data);
      navigate('/dashboard');
    } catch {
      setSaving(false);
    }
  };

  // Options pays
  const countryOptions = Country.getAllCountries().map(c => ({ value: c.isoCode, label: `${c.flag} ${c.name}`, name: c.name }));
  const cityOptions    = City.getCitiesOfCountry(d.countryCode)?.map(c => ({ value: c.name, label: c.name })) || [];

  const selectStyles = {
    control:  (b: any) => ({ ...b, borderRadius: '12px', border: '2px solid #e2e8f0', padding: '2px', boxShadow: 'none', '&:hover': { borderColor: '#14b8a6' } }),
    option:   (b: any, s: any) => ({ ...b, backgroundColor: s.isSelected ? '#14b8a6' : s.isFocused ? '#f0fdfa' : 'white', borderRadius: '8px' }),
    menuList: (b: any) => ({ ...b, maxHeight: '200px' }),
  };

  const variants = {
    enter:  (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  const stepTitles = ['Ton identité', 'Photo & Localisation', 'Ton profil TDAH', 'Ton style de travail'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-purple-50 flex flex-col">

      {/* Header progression */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-teal-500 font-black">🧠 FocusBrain</span>
            <span className="text-gray-400 text-sm">Étape {step}/{TOTAL_STEPS} · {stepTitles[step - 1]}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <motion.div
              className="bg-gradient-to-r from-teal-400 to-teal-500 h-2.5 rounded-full"
              animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            {['👤','📸','🧠','⏰'].map((e, i) => (
              <div key={i} className={`flex items-center gap-1 text-xs transition-colors ${i + 1 <= step ? 'text-teal-500 font-bold' : 'text-gray-300'}`}>
                <span>{e}</span>
                <span className="hidden sm:inline">{stepTitles[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >

              {/* ══ ÉTAPE 1 — Identité ═══════════════════════════════════════ */}
              {step === 1 && (
                <div>
                  <Header emoji="👤" title="Qui es-tu ?" sub="Quelques infos pour personnaliser ton FocusBrain" />

                  {/* Genre */}
                  <Label>Genre</Label>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {GENDERS.map(g => (
                      <Chip key={g.value} selected={d.gender === g.value} onClick={() => set('gender', g.value)} label={g.label} />
                    ))}
                  </div>

                  {/* Date de naissance */}
                  <Label optional>Date de naissance</Label>
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                      { key: 'birthDay', placeholder: 'Jour', options: Array.from({length:31},(_,i)=>({v:`${i+1}`,l:`${i+1}`})) },
                      { key: 'birthMonth', placeholder: 'Mois', options: ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'].map((m,i)=>({v:`${i+1}`,l:m})) },
                      { key: 'birthYear', placeholder: 'Année', options: Array.from({length:55},(_,i)=>({v:`${2008-i}`,l:`${2008-i}`})) },
                    ].map(({key, placeholder, options}) => (
                      <select key={key} value={(d as any)[key]} onChange={e => set(key as any, e.target.value)}
                        className="border-2 border-gray-200 focus:border-teal-400 rounded-xl px-3 py-2.5 text-sm outline-none bg-white">
                        <option value="">{placeholder}</option>
                        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    ))}
                  </div>

                  {/* Téléphone */}
                  <Label optional>Téléphone</Label>
                  <div className="mb-6">
                    <PhoneInput country="ma" value={d.phone} onChange={v => set('phone', v)}
                      preferredCountries={['ma','fr','be','dz','tn','ca']}
                      inputStyle={{ width:'100%', border:'2px solid #e2e8f0', borderRadius:'12px', padding:'10px 14px 10px 54px', fontSize:'14px' }}
                      buttonStyle={{ border:'none', background:'transparent', paddingLeft:'8px' }}
                      containerStyle={{ width:'100%' }}
                    />
                  </div>

                  <Actions onNext={next} nextOk />
                </div>
              )}

              {/* ══ ÉTAPE 2 — Photo + Localisation ══════════════════════════ */}
              {step === 2 && (
                <div>
                  <Header emoji="📸" title="Photo & localisation" sub="Pour que les membres te reconnaissent sur la carte" />

                  {/* Photo */}
                  <Label optional>Photo de profil</Label>
                  <div className="flex items-center gap-4 mb-4">
                    <div onClick={() => fileRef.current?.click()}
                      className={`w-20 h-20 rounded-full border-4 border-dashed cursor-pointer flex items-center justify-center overflow-hidden shrink-0 transition-colors ${d.avatar && !d.avatarFile ? '' : 'hover:border-teal-400'} ${d.avatar ? 'border-teal-400' : 'border-gray-300 bg-gray-50'}`}>
                      {d.avatar
                        ? <img src={d.avatar} className="w-full h-full object-cover" alt="preview" />
                        : <div className="text-center"><p className="text-2xl">📷</p><p className="text-xs text-gray-400">Choisir</p></div>
                      }
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Ou choisis un avatar :</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {DICEBEAR_AVATARS.map(av => {
                          const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${av.seed}&backgroundColor=${av.bg}`;
                          return (
                            <button key={av.seed} onClick={() => { set('avatar', url); set('avatarFile', null); }}
                              className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${d.avatar === url ? 'border-teal-500 ring-2 ring-teal-300 scale-110' : 'border-gray-200'}`}>
                              <img src={url} alt={av.seed} className="w-full h-full" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  </div>

                  {/* Géolocalisation */}
                  <Label>Localisation</Label>
                  <button onClick={detectLocation} disabled={geoLoad}
                    className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl mb-3 transition-colors">
                    {geoLoad
                      ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Détection...</>
                      : <><span>📍</span>Détecter ma position automatiquement</>
                    }
                  </button>

                  {d.city && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2 mb-3 text-sm text-teal-700 flex items-center gap-2">
                      <span>✅</span><strong>{d.city}, {d.country}</strong>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Pays</p>
                      <Select options={countryOptions} styles={selectStyles} isSearchable
                        defaultValue={countryOptions.find(c => c.value === 'MA')}
                        onChange={(o: any) => { set('countryCode', o.value); set('country', o.name); set('city', ''); }}
                        placeholder="Pays..." />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Ville</p>
                      {cityOptions.length > 0
                        ? <Select options={cityOptions} styles={selectStyles} isSearchable
                            value={d.city ? { value: d.city, label: d.city } : null}
                            onChange={(o: any) => set('city', o.value)}
                            placeholder="Ville..." noOptionsMessage={() => 'Aucune'} />
                        : <input value={d.city} onChange={e => set('city', e.target.value)}
                            placeholder="Ta ville..." className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-3 py-2.5 text-sm outline-none" />
                      }
                    </div>
                  </div>

                  <Actions onNext={next} onPrev={prev} nextOk />
                </div>
              )}

              {/* ══ ÉTAPE 3 — Profil TDAH ═══════════════════════════════════ */}
              {step === 3 && (
                <div>
                  <Header emoji="🧠" title="Ton profil TDAH" sub="Aucune mauvaise réponse — chaque cerveau est unique" />

                  {/* Type TDAH */}
                  <Label>Type de TDAH</Label>
                  <div className="space-y-2 mb-5">
                    {TDAH_TYPES.map(t => (
                      <button key={t.value} onClick={() => set('tdahType', t.value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${d.tdahType === t.value ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-200 hover:border-teal-300'}`}>
                        <span className="text-2xl">{t.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm">{t.label}</p>
                          {t.desc && <p className="text-xs text-gray-400">{t.desc}</p>}
                        </div>
                        {d.tdahType === t.value && <span className="text-teal-500">✓</span>}
                      </button>
                    ))}
                  </div>

                  {/* Diagnostic */}
                  <Label>Statut de diagnostic</Label>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {DIAGNOSIS_STATUS.map(ds => (
                      <button key={ds.value} onClick={() => set('diagnosisStatus', ds.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left text-xs font-medium transition-all ${d.diagnosisStatus === ds.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                        <span className="text-base">{ds.emoji}</span>{ds.label}
                      </button>
                    ))}
                  </div>

                  {/* Objectifs */}
                  <Label>Objectifs <span className="text-gray-400 font-normal">(max 3)</span></Label>
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {OBJECTIVES.map(o => {
                      const sel   = d.workObjectives.includes(o.value);
                      const maxed = !sel && d.workObjectives.length >= 3;
                      return (
                        <button key={o.value} disabled={maxed}
                          onClick={() => set('workObjectives', sel ? d.workObjectives.filter(v => v !== o.value) : [...d.workObjectives, o.value])}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left text-xs font-medium transition-all ${sel ? 'border-teal-500 bg-teal-50 text-teal-700' : maxed ? 'border-gray-100 opacity-40 cursor-not-allowed text-gray-400' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
                          <span className="text-base">{o.emoji}</span><span>{o.label}</span>
                          {sel && <span className="ml-auto text-teal-500">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  <Actions onNext={next} onPrev={prev} nextOk />
                </div>
              )}

              {/* ══ ÉTAPE 4 — Style & dispo ══════════════════════════════════ */}
              {step === 4 && (
                <div>
                  <Header emoji="⏰" title="Comment tu travailles ?" sub="On te trouve les meilleurs partenaires body doubling" />

                  {/* Style */}
                  <Label>Style de travail préféré</Label>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {WORK_STYLES.map(s => (
                      <button key={s.value} onClick={() => set('workStyle', s.value)}
                        className={`flex flex-col items-center gap-1.5 px-2 py-3.5 rounded-xl border-2 transition-all ${d.workStyle === s.value ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-200 hover:border-teal-300'}`}>
                        <span className="text-2xl">{s.emoji}</span>
                        <p className="font-bold text-gray-900 text-xs text-center">{s.label}</p>
                        <p className="text-gray-400 text-xs text-center">{s.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Disponibilités */}
                  <Label>Disponibilités <span className="text-gray-400 font-normal">(multi-choix)</span></Label>
                  <div className="grid grid-cols-2 gap-2.5 mb-6">
                    {AVAILABILITIES.map(a => {
                      const sel = d.availabilities.includes(a.value);
                      return (
                        <button key={a.value}
                          onClick={() => set('availabilities', sel ? d.availabilities.filter(v => v !== a.value) : [...d.availabilities, a.value])}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${sel ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-200 hover:border-teal-300'}`}>
                          <span className="text-xl">{a.emoji}</span>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{a.label}</p>
                            <p className="text-gray-400 text-xs">{a.desc}</p>
                          </div>
                          {sel && <span className="ml-auto text-teal-500 font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bouton final */}
                  <button onClick={finish} disabled={saving}
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-60 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                    {saving
                      ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Sauvegarde...</span>
                      : '🚀 Accéder à FocusBrain !'
                    }
                  </button>
                  <button onClick={prev} className="w-full text-gray-400 text-sm mt-3 hover:text-gray-600">← Retour</button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Micro-composants ───────────────────────────────────────────────────────────

function Header({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div className="text-center mb-6">
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}
        className="text-5xl block mb-2">{emoji}</motion.span>
      <h2 className="text-2xl font-black text-gray-900">{title}</h2>
      <p className="text-gray-500 text-sm mt-1">{sub}</p>
    </div>
  );
}

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase mb-2">
      {children}{optional && <span className="text-gray-300 font-normal normal-case ml-1">(optionnel)</span>}
    </p>
  );
}

function Chip({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${selected ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
      {selected && <span className="text-teal-500 text-xs">✓</span>}{label}
    </button>
  );
}

function Actions({ onNext, onPrev }: { onNext: () => void; onPrev?: () => void; nextOk?: boolean }) {
  return (
    <div className="space-y-2">
      <button onClick={onNext}
        className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white font-black py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
        Continuer →
      </button>
      <div className="flex gap-2">
        {onPrev && <button onClick={onPrev} className="flex-1 text-gray-400 text-sm py-2 hover:text-gray-600">← Retour</button>}
        <button onClick={onNext} className="flex-1 text-gray-400 text-sm py-2 hover:text-gray-600">Passer →</button>
      </div>
    </div>
  );
}
