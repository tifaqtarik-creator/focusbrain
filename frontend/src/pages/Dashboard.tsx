import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAppStore } from '../stores/useStore';
import { connectSocket, getSocket } from '../lib/socket';
import api from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  status: 'available' | 'in_session' | 'searching' | 'busy' | 'offline';
  sessionsToday: number;
  connectedSince: string;
}

interface LiveActivity {
  id: string;
  type: 'session_created' | 'member_joined' | 'session_started' | 'session_ended' | 'invitation';
  message: string;
  time: string;
  avatar?: string;
}

interface DailyObjective {
  id: string;
  text: string;
  done: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  totalFocusMin: number;
  totalSessions: number;
  level: number;
  badges: string[];
  availability: string;
  interests: string[];
  recentSessions: number;
}

// ─── Session Templates ────────────────────────────────────────────────────────
const SESSION_TEMPLATES = [
  { label: 'Focus', duration: 15, color: '#5DCAA5', icon: '⚡' },
  { label: 'Pomodoro', duration: 25, color: '#7F77DD', icon: '🍅' },
  { label: 'Deep Work', duration: 45, color: '#EF9F27', icon: '🎯' },
  { label: 'Standard', duration: 60, color: '#3B82F6', icon: '📚' },
  { label: 'Long', duration: 90, color: '#EC4899', icon: '🚀' },
];

const STATUS_CONFIG = {
  available: { label: 'Disponible', color: 'bg-teal-400', dot: '🟢' },
  in_session: { label: 'En session', color: 'bg-blue-400', dot: '🔵' },
  searching: { label: 'Cherche un partner', color: 'bg-amber-400', dot: '🟡' },
  busy: { label: 'Occupé', color: 'bg-red-400', dot: '🔴' },
  offline: { label: 'Hors ligne', color: 'bg-gray-300', dot: '⚫' },
};

// ─── Mock data (remplacé par vrai socket en prod) ────────────────────────────
const MOCK_ONLINE_USERS: OnlineUser[] = [
  { id: '1', name: 'Yasmine', status: 'available', sessionsToday: 2, connectedSince: '09:30' },
  { id: '2', name: 'Adam', status: 'in_session', sessionsToday: 3, connectedSince: '08:15' },
  { id: '3', name: 'Nadia', status: 'searching', sessionsToday: 1, connectedSince: '10:00' },
  { id: '4', name: 'Karim', status: 'available', sessionsToday: 0, connectedSince: '10:45' },
  { id: '5', name: 'Sara', status: 'busy', sessionsToday: 4, connectedSince: '07:00' },
];

const MOCK_ACTIVITIES: LiveActivity[] = [
  { id: '1', type: 'session_started', message: 'Yasmine a démarré une session Deep Work', time: 'Il y a 2 min' },
  { id: '2', type: 'member_joined', message: 'Karim vient de se connecter', time: 'Il y a 5 min' },
  { id: '3', type: 'session_ended', message: 'Adam a terminé 25 min de focus 🎉', time: 'Il y a 8 min' },
  { id: '4', type: 'session_created', message: 'Nouvelle session Pomodoro créée pour 11h00', time: 'Il y a 12 min' },
  { id: '5', type: 'invitation', message: 'Nadia t\'a envoyé une invitation', time: 'Il y a 15 min' },
];

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const user = useAppStore(s => s.user);
  const navigate = useNavigate();
  const calendarRef = useRef<any>(null);

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>(MOCK_ONLINE_USERS);
  const [activities, setActivities] = useState<LiveActivity[]>(MOCK_ACTIVITIES);
  const [objectives, setObjectives] = useState<DailyObjective[]>([
    { id: '1', text: 'Compléter 3 sessions de focus', done: true },
    { id: '2', text: 'Finir le rapport client', done: false },
    { id: '3', text: 'Répondre aux emails importants', done: false },
  ]);
  const [newObjective, setNewObjective] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchState, setMatchState] = useState<'idle' | 'searching' | 'found'>('idle');
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [calendarEvents, setCalendarEvents] = useState([
    {
      id: '1', title: '🍅 Pomodoro — Yasmine', start: new Date().toISOString().slice(0, 10) + 'T09:00:00',
      end: new Date().toISOString().slice(0, 10) + 'T09:25:00', backgroundColor: '#7F77DD', borderColor: '#7F77DD',
    },
    {
      id: '2', title: '🎯 Deep Work — Adam', start: new Date().toISOString().slice(0, 10) + 'T10:30:00',
      end: new Date().toISOString().slice(0, 10) + 'T11:15:00', backgroundColor: '#EF9F27', borderColor: '#EF9F27',
    },
    {
      id: '3', title: '⚡ Focus — Toi', start: new Date().toISOString().slice(0, 10) + 'T14:00:00',
      end: new Date().toISOString().slice(0, 10) + 'T14:15:00', backgroundColor: '#5DCAA5', borderColor: '#5DCAA5',
    },
  ]);

  const stats = {
    focusMin: 78,
    sessions: 3,
    tasks: 2,
    streak: 7,
    goalPercent: 65,
    avgSession: 26,
    successRate: 85,
    partners: 4,
    energyLevel: 4,
  };

  useEffect(() => {
    connectSocket();
    const socket = getSocket();
    socket.on('match:found', ({ sessionId }: { sessionId: string }) => {
      setMatchState('found');
      setTimeout(() => navigate(`/session/${sessionId}`), 1000);
    });
    return () => { socket.off('match:found'); };
  }, [navigate]);

  // Chercher un Body Double
  const handleFindBodyDouble = () => {
    setShowMatchModal(true);
    setMatchState('searching');
    getSocket().emit('match:searching', { duration: 25, quietMode: false, cameraOff: false });
    setTimeout(() => {
      if (matchState !== 'found') setMatchState('idle');
    }, 90000);
  };

  // Créer un événement depuis le calendrier
  const handleDateSelect = (selectInfo: any) => {
    setSelectedSlot({ start: selectInfo.start, end: selectInfo.end });
    setShowCreateModal(true);
  };

  // Créer une session depuis template
  const createSession = (template: typeof SESSION_TEMPLATES[0]) => {
    if (!selectedSlot) return;
    const end = new Date(selectedSlot.start.getTime() + template.duration * 60000);
    const newEvent = {
      id: Date.now().toString(),
      title: `${template.icon} ${template.label} — Toi`,
      start: selectedSlot.start.toISOString(),
      end: end.toISOString(),
      backgroundColor: template.color,
      borderColor: template.color,
    };
    setCalendarEvents(prev => [...prev, newEvent]);
    setShowCreateModal(false);
    addActivity(`Tu as créé une session ${template.label} de ${template.duration} min`);
  };

  const addActivity = (message: string) => {
    setActivities(prev => [{
      id: Date.now().toString(), type: 'session_created', message, time: 'À l\'instant'
    }, ...prev.slice(0, 9)]);
  };

  const toggleObjective = (id: string) => {
    setObjectives(prev => prev.map(o => o.id === id ? { ...o, done: !o.done } : o));
  };

  const addObjective = () => {
    if (!newObjective.trim()) return;
    setObjectives(prev => [...prev, { id: Date.now().toString(), text: newObjective, done: false }]);
    setNewObjective('');
  };

  const doneCount = objectives.filter(o => o.done).length;
  const objectivePercent = objectives.length ? Math.round((doneCount / objectives.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">
            Bonjour {user?.name} 👋
          </h1>
          <p className="text-sm text-gray-500">
            {stats.streak} jours consécutifs 🔥 · Objectif du jour : {stats.goalPercent}% atteint
          </p>
        </div>

        {/* Bouton principal */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleFindBodyDouble}
          className="bg-teal-500 text-white font-black px-8 py-3 rounded-2xl text-lg shadow-lg shadow-teal-200 hover:bg-teal-600 transition-colors flex items-center gap-3"
        >
          <span className="text-2xl">🧠</span>
          J'ai besoin d'un Body Double
        </motion.button>

        {/* Notifications */}
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg hover:bg-gray-200 transition-colors">🔔</div>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center font-bold">3</span>
          </div>
        </div>
      </div>

      {/* ── Corps principal ── */}
      <div className="flex flex-1 overflow-hidden gap-0">

        {/* ── Colonne gauche : Utilisateurs en ligne ── */}
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-gray-700">En ligne maintenant</h2>
              <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {onlineUsers.filter(u => u.status !== 'offline').length}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {onlineUsers.map(u => (
              <motion.div
                key={u.id}
                whileHover={{ backgroundColor: '#F0FDFA' }}
                className="p-3 rounded-xl cursor-pointer transition-colors"
                onClick={() => setSelectedProfile({
                  id: u.id, name: u.name, totalFocusMin: 245, totalSessions: 18, level: 3,
                  badges: ['🌱', '⭐', '🧠'], availability: 'Matin & soir',
                  interests: ['Travail', 'Études'], recentSessions: u.sessionsToday,
                })}
              >
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center font-bold text-teal-600 text-sm">
                      {u.name[0]}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 text-xs">{STATUS_CONFIG[u.status].dot}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{STATUS_CONFIG[u.status].label}</p>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>Depuis {u.connectedSince}</span>
                  <span>{u.sessionsToday} sessions</span>
                </div>
                {/* Actions rapides */}
                <div className="flex gap-1 mt-2">
                  <button className="flex-1 text-xs bg-teal-50 text-teal-600 py-1 rounded-lg hover:bg-teal-100 transition-colors font-medium">
                    Inviter
                  </button>
                  {u.status === 'available' && (
                    <button className="flex-1 text-xs bg-violet-50 text-violet-600 py-1 rounded-lg hover:bg-violet-100 transition-colors font-medium">
                      Rejoindre
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Centre : Calendrier ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridDay"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                locale="fr"
                buttonText={{ today: "Aujourd'hui", month: 'Mois', week: 'Semaine', day: 'Jour' }}
                slotMinTime="07:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                editable={true}
                selectable={true}
                selectMirror={true}
                events={calendarEvents}
                select={handleDateSelect}
                eventClick={(info) => {
                  alert(`Session : ${info.event.title}\nDébut : ${info.event.start?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\nFin : ${info.event.end?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
                }}
                eventDrop={(info) => {
                  setCalendarEvents(prev => prev.map(e =>
                    e.id === info.event.id ? { ...e, start: info.event.start!.toISOString(), end: info.event.end!.toISOString() } : e
                  ));
                }}
                eventResize={(info) => {
                  setCalendarEvents(prev => prev.map(e =>
                    e.id === info.event.id ? { ...e, end: info.event.end!.toISOString() } : e
                  ));
                }}
                height="100%"
                expandRows={true}
                nowIndicator={true}
                slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              />
            </div>
          </div>
        </div>

        {/* ── Colonne droite : Stats + Objectifs + Activité ── */}
        <div className="w-72 bg-white border-l border-gray-100 overflow-y-auto flex flex-col">

          {/* Stats du jour */}
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-700 mb-3">📊 Mes stats du jour</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: `${Math.floor(stats.focusMin / 60)}h${stats.focusMin % 60}m`, label: 'Focus', icon: '⏱️', color: 'bg-teal-50 text-teal-700' },
                { val: stats.sessions, label: 'Sessions', icon: '🧠', color: 'bg-violet-50 text-violet-700' },
                { val: stats.tasks, label: 'Tâches', icon: '✅', color: 'bg-amber-50 text-amber-700' },
                { val: `${stats.streak}j`, label: 'Série', icon: '🔥', color: 'bg-red-50 text-red-700' },
              ].map(s => (
                <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                  <div className="text-lg mb-0.5">{s.icon}</div>
                  <div className="font-black text-lg">{s.val}</div>
                  <div className="text-xs opacity-70">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Objectif quotidien */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Objectif quotidien</span>
                <span className="font-bold text-teal-600">{stats.goalPercent}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.goalPercent}%` }}
                  transition={{ duration: 1 }}
                  className="h-full bg-teal-500 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-700 mb-3">🎯 Productivité</h2>
            <div className="space-y-2">
              {[
                { label: 'Durée moy. session', val: `${stats.avgSession} min` },
                { label: 'Taux de réussite', val: `${stats.successRate}%` },
                { label: 'Partenaires aujourd\'hui', val: stats.partners },
                { label: 'Niveau d\'énergie', val: '⚡'.repeat(stats.energyLevel) },
              ].map(k => (
                <div key={k.label} className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{k.label}</span>
                  <span className="font-bold text-gray-900">{k.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Objectifs du jour */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-gray-700">🎯 Objectifs du jour</h2>
              <span className="text-xs font-bold text-teal-600">{doneCount}/{objectives.length}</span>
            </div>

            {/* Barre de progression */}
            <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
              <motion.div
                animate={{ width: `${objectivePercent}%` }}
                className="h-full bg-teal-500 rounded-full"
              />
            </div>

            <div className="space-y-2">
              {objectives.map(obj => (
                <label key={obj.id} className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={obj.done}
                    onChange={() => toggleObjective(obj.id)}
                    className="mt-0.5 w-4 h-4 accent-teal-500 rounded"
                  />
                  <span className={`text-sm ${obj.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {obj.text}
                  </span>
                </label>
              ))}
            </div>

            {/* Ajouter un objectif */}
            <div className="flex gap-1 mt-3">
              <input
                value={newObjective}
                onChange={e => setNewObjective(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addObjective()}
                placeholder="Ajouter un objectif..."
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:border-teal-400 focus:outline-none"
              />
              <button
                onClick={addObjective}
                className="bg-teal-500 text-white text-xs px-2 py-1.5 rounded-lg hover:bg-teal-600 transition-colors font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Activité en direct */}
          <div className="p-4 flex-1">
            <h2 className="font-bold text-sm text-gray-700 mb-3">⚡ Activité en direct</h2>
            <div className="space-y-3">
              {activities.map(a => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2"
                >
                  <div className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-700">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal : Créer une session depuis le calendrier ── */}
      <AnimatePresence>
        {showCreateModal && selectedSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-black mb-2">Créer une session</h2>
              <p className="text-gray-500 text-sm mb-6">
                {selectedSlot.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} →{' '}
                {selectedSlot.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>

              <p className="font-semibold text-sm text-gray-700 mb-3">Modèle rapide :</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {SESSION_TEMPLATES.map(t => (
                  <button
                    key={t.duration}
                    onClick={() => createSession(t)}
                    className="p-3 rounded-xl border-2 border-gray-100 hover:border-teal-300 hover:bg-teal-50 transition-all text-center"
                  >
                    <div className="text-2xl">{t.icon}</div>
                    <div className="font-bold text-xs mt-1">{t.label}</div>
                    <div className="text-gray-400 text-xs">{t.duration} min</div>
                  </button>
                ))}
                <button
                  onClick={() => createSession({ label: 'Perso', duration: 30, color: '#6B7280', icon: '⏰' })}
                  className="p-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all text-center"
                >
                  <div className="text-2xl">⏰</div>
                  <div className="font-bold text-xs mt-1">Perso</div>
                  <div className="text-gray-400 text-xs">Durée libre</div>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: '🔒 Privée', desc: 'Invitation seule' },
                  { label: '🌐 Publique', desc: 'Tout le monde' },
                  { label: '👥 Groupe', desc: 'Plusieurs pers.' },
                ].map(t => (
                  <button key={t.label} className="p-2 rounded-xl border border-gray-100 hover:bg-gray-50 text-xs text-center transition-colors">
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-gray-400">{t.desc}</div>
                  </button>
                ))}
              </div>

              <button onClick={() => setShowCreateModal(false)} className="w-full mt-4 text-gray-400 text-sm">
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal : Recherche Body Double ── */}
      <AnimatePresence>
        {showMatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-center"
            >
              {matchState === 'searching' && (
                <>
                  <div className="w-20 h-20 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                  <h2 className="text-2xl font-black mb-2">Recherche en cours...</h2>
                  <p className="text-gray-500 mb-4">On cherche le partenaire TDAH parfait pour toi</p>

                  {/* Partenaires disponibles */}
                  <div className="bg-teal-50 rounded-2xl p-4 mb-6">
                    <p className="text-sm font-semibold text-teal-700 mb-3">Disponibles maintenant :</p>
                    <div className="flex justify-center gap-3">
                      {onlineUsers.filter(u => u.status === 'available').map(u => (
                        <button
                          key={u.id}
                          onClick={() => { setShowMatchModal(false); navigate('/session/demo'); }}
                          className="flex flex-col items-center gap-1 hover:scale-105 transition-transform"
                        >
                          <div className="w-10 h-10 bg-teal-200 rounded-full flex items-center justify-center font-bold text-teal-700">
                            {u.name[0]}
                          </div>
                          <span className="text-xs font-medium">{u.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => { setShowMatchModal(false); setMatchState('idle'); getSocket().emit('match:cancel'); }}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    Annuler
                  </button>
                </>
              )}
              {matchState === 'found' && (
                <>
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-black text-teal-600">Partenaire trouvé !</h2>
                  <p className="text-gray-500">Connexion en cours...</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Panneau profil utilisateur ── */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-end"
            onClick={() => setSelectedProfile(null)}
          >
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="bg-white h-full w-80 shadow-2xl p-6 overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setSelectedProfile(null)} className="text-gray-400 hover:text-gray-600 mb-4">
                ✕ Fermer
              </button>

              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center text-3xl font-black text-teal-600 mx-auto mb-3">
                  {selectedProfile.name[0]}
                </div>
                <h2 className="text-xl font-black">{selectedProfile.name}</h2>
                <p className="text-teal-600 font-semibold">Niveau {selectedProfile.level}</p>
                <div className="flex justify-center gap-1 mt-2 text-2xl">
                  {selectedProfile.badges.map((b, i) => <span key={i}>{b}</span>)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { val: `${Math.floor(selectedProfile.totalFocusMin / 60)}h`, label: 'Focus total', icon: '⏱️' },
                  { val: selectedProfile.totalSessions, label: 'Sessions', icon: '🧠' },
                  { val: selectedProfile.recentSessions, label: "Aujourd'hui", icon: '📅' },
                  { val: selectedProfile.level, label: 'Niveau', icon: '⭐' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div>{s.icon}</div>
                    <div className="font-black text-lg">{s.val}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">🕐 Disponibilité habituelle</p>
                <p className="text-sm text-gray-500">{selectedProfile.availability}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">🎯 Centres d'intérêt</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.interests.map(i => (
                    <span key={i} className="bg-teal-50 text-teal-700 text-xs px-3 py-1 rounded-full font-medium">{i}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => { setSelectedProfile(null); navigate('/session/demo'); }}
                  className="w-full bg-teal-500 text-white font-bold py-3 rounded-xl hover:bg-teal-600 transition-colors"
                >
                  🚀 Démarrer une session
                </button>
                <button className="w-full bg-violet-50 text-violet-600 font-bold py-3 rounded-xl hover:bg-violet-100 transition-colors">
                  ✉️ Envoyer une invitation
                </button>
                <button className="w-full bg-gray-50 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors">
                  💬 Démarrer un chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
