/**
 * usePrayerTimes.ts — Horaires de prière (Salat) via l'API Aladhan
 * Méthode 21 = Maroc (Ministère des Habous). Cache localStorage par date+ville.
 */
import { useState, useEffect } from 'react';

export interface PrayerTimings {
  Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string;
  Sunrise?: string;
}

const cacheKey = (date: string, city: string, country: string) => `adah_prayer_${date}_${city}_${country}`;
const clean = (t: string) => (t || '').split(' ')[0].trim();          // "04:42 (+01)" → "04:42"
const toApiDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}-${m}-${y}`; };
const todayStr = () => new Date().toISOString().split('T')[0];

export function usePrayerTimes(date: string, city: string, country: string, enabled = true) {
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [now, setNow]         = useState(() => Date.now());

  // ── Récupération (cache d'abord, sinon API) ───────────────────────────────
  useEffect(() => {
    if (!enabled || !date || !city) { setTimings(null); return; }
    let cancelled = false;
    const key = cacheKey(date, city, country);

    try {
      const cached = localStorage.getItem(key);
      if (cached) { setTimings(JSON.parse(cached)); return; }   // horaires figés pour une date+ville
    } catch { /* ignore */ }

    setLoading(true); setError(null);
    const url = `https://api.aladhan.com/v1/timingsByCity/${toApiDate(date)}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=21`;
    fetch(url)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        if (j.code === 200 && j.data?.timings) {
          const tg: PrayerTimings = {
            Fajr: clean(j.data.timings.Fajr),     Dhuhr: clean(j.data.timings.Dhuhr),
            Asr: clean(j.data.timings.Asr),       Maghrib: clean(j.data.timings.Maghrib),
            Isha: clean(j.data.timings.Isha),     Sunrise: clean(j.data.timings.Sunrise),
          };
          setTimings(tg);
          try { localStorage.setItem(key, JSON.stringify(tg)); } catch { /* ignore */ }
        } else { setError('Horaires indisponibles'); }
      })
      .catch(() => { if (!cancelled) setError('Connexion impossible'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [date, city, country, enabled]);

  // ── Horloge (1s) pour le compte à rebours — uniquement utile aujourd'hui ──
  useEffect(() => {
    if (date !== todayStr()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [date]);

  // ── Prochaine prière + compte à rebours ───────────────────────────────────
  let nextKey: string | null = null;
  let countdown = '';
  const passed: Record<string, boolean> = {};
  if (timings && date === todayStr()) {
    const order: (keyof PrayerTimings)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const nowD = new Date(now);
    for (const k of order) {
      const t = timings[k]; if (!t) continue;
      const [h, m] = t.split(':').map(Number);
      const pt = new Date(nowD); pt.setHours(h, m, 0, 0);
      if (pt.getTime() <= nowD.getTime()) { passed[k] = true; continue; }
      if (!nextKey) {
        nextKey = k as string;
        const inMs = pt.getTime() - nowD.getTime();
        const totMin = Math.floor(inMs / 60000);
        const hh = Math.floor(totMin / 60), mm = totMin % 60, ss = Math.floor((inMs % 60000) / 1000);
        countdown = hh > 0 ? `${hh}h ${String(mm).padStart(2, '0')}min` : mm > 0 ? `${mm}min ${String(ss).padStart(2, '0')}s` : `${ss}s`;
      }
    }
    if (!nextKey) { nextKey = 'Fajr'; countdown = 'demain'; }   // après Isha
  }

  return { timings, loading, error, nextKey, countdown, passed };
}
