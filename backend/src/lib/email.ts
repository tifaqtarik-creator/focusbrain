/**
 * email.ts — Envoi d'emails via Resend (API REST, sans dépendance npm).
 * Nécessite RESEND_API_KEY. NB : sans domaine vérifié, Resend n'envoie qu'à
 * l'adresse du compte (mode test). Vérifier un domaine pour la prod.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  // Lecture paresseuse (après dotenv.config())
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'FocusBrain <onboarding@resend.dev>';
  if (!key) { console.warn('[email] RESEND_API_KEY manquant — email ignoré'); return false; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) { console.warn('[email] echec', res.status, (await res.text()).slice(0, 200)); return false; }
    return true;
  } catch (e: any) { console.warn('[email] erreur', e.message); return false; }
}

export function reminderEmailHtml(name: string, when: string, duration: number, task?: string | null) {
  return `
  <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f0fdfa;border-radius:16px">
    <h2 style="color:#0f766e;margin:0 0 8px">⏰ Ta session de focus arrive !</h2>
    <p style="color:#334155;font-size:15px">Bonjour ${name},</p>
    <p style="color:#334155;font-size:15px">Ta session de Body Doubling commence bientôt :</p>
    <div style="background:#fff;border:1px solid #ccfbf1;border-radius:12px;padding:16px;margin:12px 0">
      <p style="margin:0;font-size:18px;font-weight:800;color:#0f766e">🕐 ${when} · ${duration} min</p>
      ${task ? `<p style="margin:8px 0 0;color:#475569">🎯 Objectif : « ${task} »</p>` : ''}
    </div>
    <p style="color:#334155;font-size:15px">Connecte-toi sur FocusBrain pour rejoindre ton partenaire 💜</p>
    <p style="color:#94a3b8;font-size:12px;margin-top:20px">Tu reçois ce rappel pour t'aider à ne pas oublier ta session. Le progrès, pas la perfection.</p>
  </div>`;
}
