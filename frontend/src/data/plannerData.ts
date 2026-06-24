/**
 * plannerData.ts — Données du planificateur TDAH (catégories, badges, niveaux, XP, conseils)
 */
import {
  Sparkles, Droplets, HeartPulse, Utensils, SprayCan, Briefcase, Brain,
  HeartHandshake, UsersRound, FileText, CircleUser, Palette,
  Flame, Trophy, Rocket, Zap, Star, CheckCircle2, Medal, Gem, CalendarCheck,
  // Suggestions rapides
  BookOpen, ShowerHead, Brush, Shirt, Pill, PersonStanding, Activity, GlassWater,
  Dumbbell, BedDouble, Stethoscope, Scale, Glasses, Egg, Salad, ShoppingCart,
  WashingMachine, Mail, Timer, Phone, NotebookPen, Target, Pause, BellOff, Coffee,
  House, Gift, MessageCircle, Receipt, CalendarPlus, FolderOpen, ShoppingBag, Wallet, Gamepad2,
  // Jeu d'icônes personnalisables (catégories/suggestions perso)
  Music, Sun, Moon, Plane, Car, Smile, Camera, Code, Leaf, PenTool,
  type LucideIcon,
} from 'lucide-react';

// ── Jeu d'icônes pour les éléments PERSONNALISÉS (clé string ↔ composant) ─────
// On stocke la clé (string) en localStorage, et on rend le composant via ICON_SET.
export const ICON_SET: Record<string, LucideIcon> = {
  briefcase: Briefcase, book: BookOpen, sante: HeartPulse, sport: Dumbbell, maison: House,
  courses: ShoppingCart, phone: Phone, cafe: Coffee, cerveau: Brain, etoiles: Sparkles,
  palette: Palette, medic: Pill, lit: BedDouble, cible: Target, etoile: Star,
  jeu: Gamepad2, argent: Wallet, repas: Utensils, eau: GlassWater, cadeau: Gift,
  gens: UsersRound, flamme: Flame, douche: ShowerHead, balance: Scale, lunettes: Glasses,
  dossier: FolderOpen, facture: Receipt, mail: Mail, marche: PersonStanding, energie: Activity,
  musique: Music, soleil: Sun, lune: Moon, avion: Plane, voiture: Car,
  sourire: Smile, photo: Camera, code: Code, feuille: Leaf, stylo: PenTool,
};
export const ICON_KEYS = Object.keys(ICON_SET);

// ── Palette de couleurs pour les catégories personnalisées ────────────────────
export const CATEGORY_COLORS: { color: string; textColor: string; borderColor: string }[] = [
  { color: '#E7F4EE', textColor: '#14573A', borderColor: '#2E9E68' },
  { color: '#E1F4F8', textColor: '#0A5360', borderColor: '#1BA0B5' },
  { color: '#E6F1FB', textColor: '#0C447C', borderColor: '#185FA5' },
  { color: '#EEEDFE', textColor: '#3C3489', borderColor: '#534AB7' },
  { color: '#FCE8E4', textColor: '#8A2F1D', borderColor: '#CD4A30' },
  { color: '#FBEAF0', textColor: '#72243E', borderColor: '#993556' },
  { color: '#FAEEDA', textColor: '#633806', borderColor: '#BA7517' },
  { color: '#FAECE7', textColor: '#712B13', borderColor: '#993C1D' },
];

export interface Category {
  id: string; label: string; emoji: string; Icon: LucideIcon;
  color: string; textColor: string; borderColor: string;
  xpMultiplier: number; tip: string; custom?: boolean;
}

export const CATEGORIES: Record<string, Category> = {
  spiritualite: { id: 'spiritualite', label: 'Spiritualité',      emoji: '🕌', Icon: Sparkles,      color: '#E7F4EE', textColor: '#14573A', borderColor: '#2E9E68', xpMultiplier: 1.3, tip: 'La régularité spirituelle ancre ta journée et apaise le mental' },
  hygiene:  { id: 'hygiene',  label: 'Hygiène & routine',    emoji: '💧', Icon: Droplets,      color: '#E1F4F8', textColor: '#0A5360', borderColor: '#1BA0B5', xpMultiplier: 1.1, tip: 'Une routine d\'hygiène stable réduit la charge mentale TDAH' },
  health:   { id: 'health',   label: 'Santé & bien-être',    emoji: '❤️', Icon: HeartPulse,    color: '#E1F5EE', textColor: '#085041', borderColor: '#1D9E75', xpMultiplier: 1.3, tip: 'La santé passe avant tout — ne la repousse pas' },
  meals:    { id: 'meals',    label: 'Repas & nutrition',    emoji: '🍽️', Icon: Utensils,      color: '#FCF1DA', textColor: '#6E4E08', borderColor: '#C99417', xpMultiplier: 1.0, tip: 'Manger à heures régulières stabilise ton énergie et ta concentration' },
  home:     { id: 'home',     label: 'Maison & ménage',      emoji: '🧹', Icon: SprayCan,      color: '#ECEFF3', textColor: '#36414E', borderColor: '#5C6B7C', xpMultiplier: 0.9, tip: 'Range une seule zone à la fois — 10 min suffisent' },
  work:     { id: 'work',     label: 'Travail / études',     emoji: '💼', Icon: Briefcase,     color: '#E6F1FB', textColor: '#0C447C', borderColor: '#185FA5', xpMultiplier: 1.0, tip: 'Fractionne en sous-tâches de max 25 min' },
  adhd:     { id: 'adhd',     label: 'Gestion TDAH',         emoji: '🧠', Icon: Brain,         color: '#EAF3DE', textColor: '#27500A', borderColor: '#3B6D11', xpMultiplier: 1.5, tip: 'Gérer ton TDAH est ta priorité absolue' },
  family:   { id: 'family',   label: 'Famille & amis',       emoji: '👨‍👩‍👧', Icon: HeartHandshake, color: '#FCE8E4', textColor: '#8A2F1D', borderColor: '#CD4A30', xpMultiplier: 1.1, tip: 'Garder le lien avec tes proches nourrit ton équilibre émotionnel' },
  social:   { id: 'social',   label: 'Social & sorties',     emoji: '👥', Icon: UsersRound,    color: '#FBEAF0', textColor: '#72243E', borderColor: '#993556', xpMultiplier: 1.0, tip: 'Le soutien social est un médicament naturel' },
  admin:    { id: 'admin',    label: 'Administratif',         emoji: '📄', Icon: FileText,      color: '#FAEEDA', textColor: '#633806', borderColor: '#BA7517', xpMultiplier: 1.2, tip: 'Fais-le maintenant, ça ne disparaît pas seul' },
  personal: { id: 'personal', label: 'Personnel',            emoji: '🏠', Icon: CircleUser,    color: '#EEEDFE', textColor: '#3C3489', borderColor: '#534AB7', xpMultiplier: 0.9, tip: 'Les tâches perso méritent autant d\'attention' },
  hobby:    { id: 'hobby',    label: 'Loisirs & créativité', emoji: '🎨', Icon: Palette,       color: '#FAECE7', textColor: '#712B13', borderColor: '#993C1D', xpMultiplier: 0.8, tip: 'Les loisirs rechargent ton énergie cognitive' },
};

// ── Suggestions de tâches par catégorie (1 clic = ajoutée, anti-paralysie TDAH) ──
export interface TaskSuggestion {
  title: string;
  Icon: LucideIcon;
  duration?: number;
  priority?: 'high' | 'med' | 'low';
  needsName?: boolean;   // true → demande le nom d'une personne (Famille & amis)
  template?: string;     // ex: 'Appeler {nom}' → titre final après saisie du nom
}

export const SUGGESTIONS: Record<string, TaskSuggestion[]> = {
  spiritualite: [
    { title: 'Prière Fajr', Icon: Sparkles, duration: 10, priority: 'high' },
    { title: 'Prière Dhuhr', Icon: Sparkles, duration: 10, priority: 'high' },
    { title: 'Prière Asr', Icon: Sparkles, duration: 10, priority: 'high' },
    { title: 'Prière Maghrib', Icon: Sparkles, duration: 10, priority: 'high' },
    { title: 'Prière Isha', Icon: Sparkles, duration: 10, priority: 'high' },
    { title: 'Lecture du Coran 10 min', Icon: BookOpen, duration: 10, priority: 'med' },
  ],
  hygiene: [
    { title: 'Douche', Icon: ShowerHead, duration: 15, priority: 'med' },
    { title: 'Brossage des dents', Icon: Brush, duration: 5, priority: 'high' },
    { title: 'Préparer mes vêtements', Icon: Shirt, duration: 10, priority: 'low' },
  ],
  health: [
    { title: 'Prendre ma médication', Icon: Pill, duration: 5, priority: 'high' },
    { title: 'Marcher 10 min', Icon: PersonStanding, duration: 10, priority: 'med' },
    { title: 'Étirements 5 min', Icon: Activity, duration: 5, priority: 'low' },
    { title: 'Boire de l\'eau', Icon: GlassWater, duration: 5, priority: 'low' },
    { title: 'Sport 30 min', Icon: Dumbbell, duration: 30, priority: 'high' },
    { title: 'Sieste 20 min', Icon: BedDouble, duration: 20, priority: 'low' },
    { title: 'Traitement des dents', Icon: Stethoscope, duration: 30, priority: 'med' },
    { title: 'Traitement de la peau', Icon: Droplets, duration: 15, priority: 'med' },
    { title: 'Suivi poids / obésité', Icon: Scale, duration: 15, priority: 'med' },
    { title: 'Acheter mes lunettes', Icon: Glasses, duration: 45, priority: 'med' },
  ],
  meals: [
    { title: 'Petit-déjeuner', Icon: Egg, duration: 20, priority: 'high' },
    { title: 'Déjeuner', Icon: Salad, duration: 30, priority: 'high' },
    { title: 'Dîner', Icon: Utensils, duration: 30, priority: 'med' },
    { title: 'Préparer les repas', Icon: Utensils, duration: 45, priority: 'med' },
    { title: 'Boire 2L d\'eau', Icon: GlassWater, duration: 5, priority: 'med' },
  ],
  home: [
    { title: 'Vaisselle', Icon: Utensils, duration: 15, priority: 'med' },
    { title: 'Lessive', Icon: WashingMachine, duration: 20, priority: 'low' },
    { title: 'Ranger 1 zone 10 min', Icon: SprayCan, duration: 10, priority: 'low' },
    { title: 'Faire le lit', Icon: BedDouble, duration: 5, priority: 'low' },
    { title: 'Courses', Icon: ShoppingCart, duration: 45, priority: 'med' },
  ],
  work: [
    { title: 'Trier mes emails', Icon: Mail, duration: 20, priority: 'med' },
    { title: 'Tâche prioritaire (Pomodoro)', Icon: Timer, duration: 25, priority: 'high' },
    { title: 'Appels à passer', Icon: Phone, duration: 15, priority: 'med' },
    { title: 'Planifier demain', Icon: NotebookPen, duration: 10, priority: 'med' },
  ],
  adhd: [
    { title: 'Brain dump (vider ma tête)', Icon: Brain, duration: 10, priority: 'high' },
    { title: 'Choisir mes 3 priorités', Icon: Target, duration: 5, priority: 'high' },
    { title: 'Pause sensorielle', Icon: Pause, duration: 10, priority: 'med' },
    { title: 'Couper les notifications', Icon: BellOff, duration: 5, priority: 'med' },
  ],
  family: [
    { title: 'Appeler',                  Icon: Phone,         template: 'Appeler {nom}',                  needsName: true, duration: 15, priority: 'med' },
    { title: 'Café avec',                Icon: Coffee,        template: 'Café avec {nom}',                needsName: true, duration: 60, priority: 'low' },
    { title: 'Rendre visite à',          Icon: House,         template: 'Rendre visite à {nom}',          needsName: true, duration: 90, priority: 'med' },
    { title: 'Cadeau pour',              Icon: Gift,          template: 'Cadeau pour {nom}',              needsName: true, duration: 30, priority: 'low' },
    { title: 'Prendre des nouvelles de', Icon: MessageCircle, template: 'Prendre des nouvelles de {nom}', needsName: true, duration: 10, priority: 'med' },
    { title: 'Repas avec',               Icon: Utensils,      template: 'Repas avec {nom}',               needsName: true, duration: 90, priority: 'low' },
  ],
  social: [
    { title: 'Sortie entre amis', Icon: UsersRound, duration: 120, priority: 'low' },
    { title: 'Répondre à mes messages', Icon: MessageCircle, duration: 15, priority: 'med' },
  ],
  admin: [
    { title: 'Payer une facture', Icon: Receipt, duration: 15, priority: 'high' },
    { title: 'Prendre un rendez-vous', Icon: CalendarPlus, duration: 10, priority: 'med' },
    { title: 'Classer mes papiers', Icon: FolderOpen, duration: 20, priority: 'low' },
  ],
  personal: [
    { title: 'Course personnelle', Icon: ShoppingBag, duration: 30, priority: 'low' },
    { title: 'Gérer mon budget', Icon: Wallet, duration: 20, priority: 'med' },
  ],
  hobby: [
    { title: 'Lecture plaisir', Icon: BookOpen, duration: 30, priority: 'low' },
    { title: 'Activité créative', Icon: Palette, duration: 45, priority: 'low' },
    { title: 'Temps de jeu', Icon: Gamepad2, duration: 30, priority: 'low' },
  ],
};

// Les 5 prières (clé API Aladhan → libellé de tâche)
export const PRAYERS: { key: string; label: string; arabic: string }[] = [
  { key: 'Fajr',    label: 'Fajr',    arabic: 'الفجر' },
  { key: 'Dhuhr',   label: 'Dhuhr',   arabic: 'الظهر' },
  { key: 'Asr',     label: 'Asr',     arabic: 'العصر' },
  { key: 'Maghrib', label: 'Maghrib', arabic: 'المغرب' },
  { key: 'Isha',    label: 'Isha',    arabic: 'العشاء' },
];

// Villes préréglées pour les horaires de prière (configurable)
export const PRAYER_CITIES = [
  { city: 'Marrakech',  country: 'Morocco' },
  { city: 'Casablanca', country: 'Morocco' },
  { city: 'Rabat',      country: 'Morocco' },
  { city: 'Fès',        country: 'Morocco' },
  { city: 'Tanger',     country: 'Morocco' },
  { city: 'Agadir',     country: 'Morocco' },
  { city: 'Paris',      country: 'France' },
  { city: 'Bruxelles',  country: 'Belgium' },
  { city: 'Montréal',   country: 'Canada' },
];

export interface Badge {
  id: string; label: string; emoji: string; Icon: LucideIcon; description: string;
  condition: (profile: any, tasksByDate: Record<string, any[]>) => boolean;
  xpBonus: number;
}

const totalDone = (tbd: Record<string, any[]>, cat?: string) =>
  Object.values(tbd).flat().filter((t: any) => t.done && (!cat || t.category === cat)).length;

export const BADGES: Badge[] = [
  { id: 'streak_3',  label: '3 jours de suite',   emoji: '🔥', Icon: Flame,        description: '1 tâche complétée 3 jours consécutifs', condition: p => p.streak >= 3,  xpBonus: 50 },
  { id: 'streak_7',  label: 'Semaine parfaite',   emoji: '🔥', Icon: Flame,        description: '7 jours de suite actif',                 condition: p => p.streak >= 7,  xpBonus: 150 },
  { id: 'streak_30', label: 'Mois de champion',   emoji: '🏆', Icon: Trophy,       description: '30 jours de suite',                     condition: p => p.streak >= 30, xpBonus: 500 },
  { id: 'tasks_10',  label: 'Premier décollage',  emoji: '🚀', Icon: Rocket,       description: '10 tâches complétées',                  condition: (_p, t) => totalDone(t) >= 10,  xpBonus: 100 },
  { id: 'tasks_50',  label: 'Machine à faire',    emoji: '⚡', Icon: Zap,          description: '50 tâches complétées',                  condition: (_p, t) => totalDone(t) >= 50,  xpBonus: 300 },
  { id: 'tasks_100', label: 'Centenaire',         emoji: '⭐', Icon: Star,         description: '100 tâches complétées',                 condition: (_p, t) => totalDone(t) >= 100, xpBonus: 800 },
  { id: 'perfect_day', label: 'Journée parfaite', emoji: '✅', Icon: CheckCircle2, description: '100% des tâches d\'une journée',        condition: (_p, t) => Object.values(t).some(ts => ts.length > 0 && ts.every((x: any) => x.done)), xpBonus: 200 },
  { id: 'health_hero', label: 'Héros de la santé', emoji: '💚', Icon: HeartPulse,  description: '20 tâches Santé complétées',           condition: (_p, t) => totalDone(t, 'health') >= 20, xpBonus: 250 },
  { id: 'adhd_master', label: 'Maître du TDAH',    emoji: '🧠', Icon: Brain,       description: '10 tâches Gestion TDAH complétées',    condition: (_p, t) => totalDone(t, 'adhd') >= 10,   xpBonus: 300 },
  { id: 'prayers_5',   label: '5 prières en 1 jour', emoji: '🕌', Icon: Sparkles,  description: 'Accomplir les 5 prières dans une journée',
    condition: (_p, t) => Object.values(t).some(day => day.filter((x: any) => x.done && x.category === 'spiritualite' && x.title.includes('Prière')).length >= 5), xpBonus: 200 },
  { id: 'level_5',  label: 'Niveau 5 atteint',    emoji: '🎖️', Icon: Medal,        description: 'Atteindre le niveau 5',                condition: p => p.level >= 5,  xpBonus: 0 },
  { id: 'level_10', label: 'Niveau 10 — Expert',  emoji: '💎', Icon: Gem,          description: 'Atteindre le niveau 10',               condition: p => p.level >= 10, xpBonus: 0 },
  { id: 'planner',  label: 'Architecte du futur', emoji: '📅', Icon: CalendarCheck, description: 'Planifier 3 jours futurs', condition: (_p, t) => {
    const today = new Date().toISOString().split('T')[0];
    return Object.keys(t).filter(d => d > today && (t[d]?.length || 0) > 0).length >= 3;
  }, xpBonus: 100 },
];

export const LEVELS = [
  { level: 1, title: 'Débutant' }, { level: 2, title: 'En mouvement' }, { level: 3, title: 'Focalisé' },
  { level: 4, title: 'Régulier' }, { level: 5, title: 'Déterminé' }, { level: 6, title: 'Concentré' },
  { level: 7, title: 'Hyperactif pro' }, { level: 8, title: 'Maître du flow' }, { level: 9, title: 'Champion TDAH' },
  { level: 10, title: 'Légende TDAH' },
];

export const levelTitle = (lvl: number) => (LEVELS.find(l => l.level === lvl) || LEVELS[LEVELS.length - 1]).title;

// XP selon priorité + durée
export const computeTaskXP = (priority: string, durationMin: number): number => {
  const base: Record<string, number> = { high: 40, med: 25, low: 15 };
  return (base[priority] || 20) + Math.floor(durationMin / 30) * 10;
};

// Niveau depuis XP total (100 + 50/niveau)
export const computeLevel = (xp: number): number => {
  let level = 1, threshold = 100;
  while (xp >= threshold) { xp -= threshold; level++; threshold += 50; }
  return level;
};
export const xpForNextLevel = (level: number) => 100 + (level - 1) * 50;
export const xpProgressInLevel = (totalXP: number): { current: number; needed: number } => {
  let xp = totalXP, level = 1, threshold = 100;
  while (xp >= threshold) { xp -= threshold; level++; threshold += 50; }
  return { current: xp, needed: threshold };
};

export const ADHD_DAILY_TIPS = [
  'Le progrès, pas la perfection. Une tâche complétée vaut mieux que dix abandonnées.',
  'Commence par la tâche la plus facile pour lancer ton élan dopaminergique.',
  'Le cerveau TDAH excelle dans l\'urgence : donne-toi des mini-deadlines.',
  'Prends ta médication avant de planifier — ton cerveau sera plus réceptif.',
  'Une pause de 5 min toutes les 25 min (Pomodoro) évite la surcharge.',
  'Récompense-toi après chaque tâche difficile, même petitement.',
  'L\'exercice physique augmente la dopamine autant que la concentration.',
  'Décompose toute tâche abstraite en actions concrètes de moins de 15 min.',
  'Le désordre visuel augmente la distraction — garde ton espace minimal.',
  'Planifier le soir pour le lendemain libère la charge mentale au réveil.',
  'Dis non aux interruptions : le cerveau TDAH met 23 min à se refocaliser.',
  'Célèbre ton streak ! La régularité est ton super-pouvoir.',
  'La musique instrumentale aide le cerveau TDAH à se réguler.',
  'Tu n\'as pas besoin de tout faire. Choisis 3 tâches importantes max.',
  'Le sommeil régulier est le traitement TDAH le plus sous-estimé.',
];

export const getDailyTip = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return ADHD_DAILY_TIPS[dayOfYear % ADHD_DAILY_TIPS.length];
};
