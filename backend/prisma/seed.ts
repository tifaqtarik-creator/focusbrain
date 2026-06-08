import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── 10 membres TDAH — avatars DiceBear variés, profils riches ─────────────────
const MEMBERS = [
  {
    name: 'Sara Benali', email: 'sara@focusbrain.test',
    tdahType: 'INATTENTIF' as const, workStyle: 'SOCIAL' as const,
    gender: 'FEMME' as const, diagnosisStatus: 'DIAGNOSTIQUE' as const,
    workObjectives: ['FOCUS_TRAVAIL', 'TROUVER_PARTENAIRES'] as any,
    availabilities: ['MATIN', 'APRES_MIDI'] as any,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara&backgroundColor=b6e3f4&hair=long&accessories=round',
    lat: 31.6295, lng: -8.0083, city: 'Marrakech',
    bio: 'Travaille souvent le matin dans les cafés de Gueliz 🌅',
  },
  {
    name: 'Youssef Tahiri', email: 'youssef@focusbrain.test',
    tdahType: 'HYPERACTIF' as const, workStyle: 'SILENCIEUX' as const,
    gender: 'HOMME' as const, diagnosisStatus: 'DIAGNOSTIQUE' as const,
    workObjectives: ['FOCUS_TRAVAIL', 'CREER_ROUTINES'] as any,
    availabilities: ['APRES_MIDI', 'SOIR'] as any,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Youssef&backgroundColor=c0aede&top=shortHair&facialHair=beardLight',
    lat: 31.6350, lng: -8.0120, city: 'Marrakech',
    bio: 'Étudiant en ingénierie — préfère la bibliothèque 📚',
  },
  {
    name: 'Nadia Alami', email: 'nadia@focusbrain.test',
    tdahType: 'COMBINE' as const, workStyle: 'FLEXIBLE' as const,
    gender: 'FEMME' as const, diagnosisStatus: 'AUTO_DIAGNOSTIQUE' as const,
    workObjectives: ['RENCONTRER_TDAH', 'PARTAGER_EXPERIENCE'] as any,
    availabilities: ['MATIN', 'WEEKEND'] as any,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia&backgroundColor=ffdfbf&hair=longButNotTooLong&clothesColor=262e33',
    lat: 31.6220, lng: -8.0150, city: 'Marrakech',
    bio: 'Freelance designer — flexible sur les horaires 🎨',
  },
  {
    name: 'Karim Mansouri', email: 'karim@focusbrain.test',
    tdahType: 'INATTENTIF' as const, workStyle: 'SOCIAL' as const,
    gender: 'HOMME' as const, diagnosisStatus: 'DIAGNOSTIQUE' as const,
    workObjectives: ['FOCUS_TRAVAIL', 'TROUVER_PARTENAIRES', 'RENCONTRER_TDAH'] as any,
    availabilities: ['APRES_MIDI', 'SOIR'] as any,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karim&backgroundColor=d1d4f9&top=shortHair&facialHair=moustacheFancy',
    lat: 31.6400, lng: -8.0050, city: 'Marrakech',
    bio: 'Entrepreneur TDAH — coworking Hivernage 💼',
  },
  {
    name: 'Fatima Zahra', email: 'fatima@focusbrain.test',
    tdahType: 'INATTENTIF' as const, workStyle: 'FLEXIBLE' as const,
    gender: 'FEMME' as const, diagnosisStatus: 'DIAGNOSTIQUE' as const,
    workObjectives: ['GERER_EMOTIONS', 'CREER_ROUTINES'] as any,
    availabilities: ['MATIN', 'SOIR'] as any,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima&backgroundColor=ffd5dc&hair=straight&accessories=wayfarers',
    lat: 31.6180, lng: -8.0080, city: 'Marrakech',
    bio: 'Prof de yoga — TDAH diagnostiqué à 32 ans 🧘',
  },
  {
    name: 'Mehdi Chraibi', email: 'mehdi@focusbrain.test',
    tdahType: 'HYPERACTIF' as const, workStyle: 'SILENCIEUX' as const,
    gender: 'HOMME' as const, diagnosisStatus: 'EN_COURS' as const,
    workObjectives: ['FOCUS_TRAVAIL', 'TROUVER_PARTENAIRES'] as any,
    availabilities: ['SOIR', 'NUIT'] as any,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mehdi&backgroundColor=b6e3f4&top=dreads&clothes=hoodie',
    lat: 31.6310, lng: -8.0200, city: 'Marrakech',
    bio: 'Dev web — body doubling depuis 2 ans 💻',
  },
  {
    name: 'Salma Ouali', email: 'salma@focusbrain.test',
    tdahType: 'COMBINE' as const, workStyle: 'SOCIAL' as const,
    gender: 'FEMME' as const, diagnosisStatus: 'AUTO_DIAGNOSTIQUE' as const,
    workObjectives: ['RENCONTRER_TDAH', 'PARTAGER_EXPERIENCE', 'FOCUS_TRAVAIL'] as any,
    availabilities: ['MATIN', 'WEEKEND'] as any,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Salma&backgroundColor=c0aede&hair=curly&clothesColor=ff488e',
    lat: 31.6270, lng: -7.9980, city: 'Marrakech',
    bio: 'Écrivaine — cherche coworking régulier le mercredi ✍️',
  },
  {
    name: 'Omar Filali', email: 'omar@focusbrain.test',
    tdahType: 'NON_SPECIFIE' as const, workStyle: 'FLEXIBLE' as const,
    gender: 'HOMME' as const, diagnosisStatus: 'EN_COURS' as const,
    workObjectives: ['FOCUS_TRAVAIL', 'CREER_ROUTINES'] as any,
    availabilities: ['MATIN', 'APRES_MIDI'] as any,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omar&backgroundColor=ffdfbf&top=shortHair&clothes=blazerShirt',
    lat: 31.6450, lng: -8.0100, city: 'Marrakech',
    bio: 'Architecte — diagnostiqué TDAH récemment 🏛️',
  },
  {
    name: 'Zineb Rachidi', email: 'zineb@focusbrain.test',
    tdahType: 'INATTENTIF' as const, workStyle: 'SILENCIEUX' as const,
    gender: 'FEMME' as const, diagnosisStatus: 'DIAGNOSTIQUE' as const,
    workObjectives: ['FOCUS_TRAVAIL', 'GERER_EMOTIONS'] as any,
    availabilities: ['MATIN'] as any,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zineb&backgroundColor=d1d4f9&hair=bigHair&accessories=prescription01',
    lat: 31.6150, lng: -8.0030, city: 'Marrakech',
    bio: 'Comptable freelance — disponible le matin ☀️',
  },
  {
    name: 'Amine Bouazza', email: 'amine@focusbrain.test',
    tdahType: 'HYPERACTIF' as const, workStyle: 'SOCIAL' as const,
    gender: 'HOMME' as const, diagnosisStatus: 'DIAGNOSTIQUE' as const,
    workObjectives: ['FOCUS_TRAVAIL', 'RENCONTRER_TDAH', 'PARTAGER_EXPERIENCE'] as any,
    availabilities: ['MATIN', 'APRES_MIDI', 'WEEKEND'] as any,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amine&backgroundColor=ffd5dc&top=shortHairFrizzle&clothes=sportShirt',
    lat: 31.6380, lng: -8.0250, city: 'Marrakech',
    bio: 'Coach sportif — énergie TDAH canalisée dans le sport ⚡',
  },
];

// ── Posts forum réalistes TDAH ─────────────────────────────────────────────────
const FORUM_POSTS = [
  {
    space: 'STRATEGIES_TDAH' as const, authorIdx: 0,
    title: 'La technique Pomodoro ne marche pas pour moi — alternatives ?',
    content: 'Bonjour à tous ! J\'essaie le Pomodoro depuis 2 mois et je n\'arrive pas à m\'y faire. 25 min c\'est soit trop court (je viens juste de me mettre dedans) soit trop long quand je suis en hyperfocus. Vous utilisez quoi comme technique de gestion du temps avec le TDAH ? 🕐',
    replies: [
      { authorIdx: 1, content: 'Moi j\'utilise des blocs de 15 min avec 5 min de pause. Le secret c\'est d\'adapter selon ton état du jour, pas de suivre un temps fixe !' },
      { authorIdx: 5, content: 'Le body doubling fonctionne mieux que le Pomodoro pour moi. Travailler à côté de quelqu\'un (même en visio) me garde ancré.' },
      { authorIdx: 3, content: 'J\'ai testé la méthode "Time Blocking" — tu bloque des plages entières dans ton calendrier pour une seule tâche. Game changer avec le TDAH combiné 🎯' },
    ],
  },
  {
    space: 'TRAVAIL' as const, authorIdx: 1,
    title: 'Comment expliquer mon TDAH à mon employeur sans perdre ma crédibilité ?',
    content: 'J\'ai été diagnostiqué il y a 3 mois et je voudrais demander des aménagements au travail (télétravail, horaires flexibles). Mais j\'ai peur d\'être mal vu. Comment vous avez géré ça ? 😰',
    replies: [
      { authorIdx: 2, content: 'J\'en ai parlé directement à mon manager en me concentrant sur les solutions, pas le diagnostic. "J\'ai besoin de X pour performer mieux" plutôt que "J\'ai le TDAH".' },
      { authorIdx: 4, content: 'Moi j\'ai passé par la médecine du travail. Ils ont fait le lien avec les RH sans que j\'ai à tout expliquer moi-même. Très utile !' },
      { authorIdx: 9, content: 'Le cadre légal aide : en France et au Maroc il y a des protections pour les travailleurs avec troubles cognitifs reconnus. Renseigne-toi sur tes droits !' },
    ],
  },
  {
    space: 'STRATEGIES_TDAH' as const, authorIdx: 2,
    title: '✨ Ce qui a vraiment changé ma vie avec le TDAH (partage)',
    content: 'Après 5 ans de galère j\'ai enfin trouvé ma routine. Je partage ce qui marche VRAIMENT pour moi :\n\n1. Se lever à la même heure TOUS les jours (même weekend)\n2. 10 min de sport le matin (pas le soir !)\n3. 3 tâches max par jour écrites la veille\n4. Body doubling 2x par semaine\n5. Pas de téléphone pendant les 2 premières heures\n\nC\'est simple mais ça a tout changé 💚',
    replies: [
      { authorIdx: 6, content: 'Merci pour ce partage ! Le point sur le téléphone est tellement vrai. J\'ai mis le mien dans une autre pièce le matin et ma productivité a doublé.' },
      { authorIdx: 0, content: 'Les 3 tâches max — j\'aurais jamais pensé que si peu suffit mais c\'est révolutionnaire. Avant j\'avais 20 tâches et je finissais rien 😅' },
    ],
  },
  {
    space: 'MEDICATION' as const, authorIdx: 3,
    title: 'Ritalin vs Concerta — vos expériences ?',
    content: 'Mon psychiatre me propose de passer du Ritalin au Concerta (libération prolongée). Vous qui avez essayé les deux, c\'est vraiment mieux ? Les effets sur la concentration sont différents ? ⚕️\n\n(Je précise : je partage mon expérience, pas de conseil médical)',
    replies: [
      { authorIdx: 7, content: 'Le Concerta m\'a changé la vie par rapport au Ritalin. Plus de pics/creux dans la journée. La transition a pris 2 semaines d\'adaptation.' },
      { authorIdx: 4, content: 'Moi j\'ai eu des effets secondaires avec le Concerta (maux de tête). Mon médecin a ajusté le dosage et maintenant ça va. À surveiller de près au début !' },
    ],
  },
  {
    space: 'VIE_PERSO' as const, authorIdx: 4,
    title: 'TDAH et relations amoureuses — comment vous gérez ?',
    content: 'Mon copain est neurotypique et il ne comprend pas toujours mes sautes d\'humeur, mon hyperfocus soudain, mon oubli des choses importantes. Des ressources ou conseils pour mieux communiquer sur notre TDAH à nos proches ? 💕',
    replies: [
      { authorIdx: 2, content: 'Le livre "TDAH : mode d\'emploi pour les couples" m\'a beaucoup aidée. Et aussi les thérapies de couple avec un psy qui connaît le TDAH.' },
      { authorIdx: 6, content: 'J\'ai fait une liste de mes "particularités" avec mon partenaire — on en a ri ensemble ! Déstigmatiser et en faire quelque chose de léger ça aide beaucoup.' },
      { authorIdx: 9, content: 'Le plus important pour moi : expliquer que mon oubli N\'est PAS un manque d\'amour ou d\'intérêt. C\'est neurologique. Une fois compris, tout change.' },
    ],
  },
  {
    space: 'OUTILS' as const, authorIdx: 5,
    title: '🛠️ Mes 5 apps indispensables pour gérer le TDAH au quotidien',
    content: 'Après avoir testé des dizaines d\'apps, voilà ce qui reste dans mon téléphone :\n\n📱 **Notion** — pour centraliser tout (mais attention à ne pas le complexifier !)\n⏰ **Focusplan** — planification visuelle\n🔔 **Time Timer** — minuterie visuelle TDAH-friendly\n🎵 **Brain.fm** — musique focus scientifique\n✅ **Habitica** — to-do liste gamifiée\n\nVous utilisez quoi ?',
    replies: [
      { authorIdx: 1, content: 'FocusBrain bien sûr 😄 ! Mais sérieusement, j\'ajoute Structured pour la planification visuelle de la journée. Interface parfaite TDAH.' },
      { authorIdx: 8, content: 'Moi c\'est simple : post-its physiques sur mon bureau. La technologie me distrait parfois plus qu\'elle aide 😅' },
      { authorIdx: 3, content: 'Brain.fm est incroyable pour la concentration. Bien plus efficace que Spotify lo-fi pour moi. Et les études neuroscientifiques derrière sont sérieuses.' },
    ],
  },
  {
    space: 'ETUDES' as const, authorIdx: 6,
    title: 'TDAH et examens — comment vous survivez ?',
    content: 'Je suis en master et les examens me terrorisent. J\'arrive à bien travailler tout l\'année mais les examens en conditions de temps limité, le stress fait tout crasher. Des stratégies pour le jour J ? 📝',
    replies: [
      { authorIdx: 1, content: 'Demande un tiers-temps ! Dans la plupart des pays ça existe pour les étudiants avec handicap reconnu (TDAH = handicap invisible). Ça a changé ma scolarité.' },
      { authorIdx: 5, content: 'Technique : commence par les questions que tu connais. Ne reste JAMAIS bloqué sur une question difficile. Ça évite le freeze TDAH qui fait perdre 30 min.' },
      { authorIdx: 2, content: 'La veille : pas de révision intense. Juste une lecture légère et dormir bien. Le cerveau TDAH a besoin de récupération pour performer. 💤' },
    ],
  },
  {
    space: 'TRAVAIL' as const, authorIdx: 7,
    title: 'Body doubling en entreprise — vous en parlez à vos collègues ?',
    content: 'Je voulais proposer des sessions de travail silencieux avec des collègues mais je ne sais pas comment amener le sujet sans avoir l\'air bizarre. "Hey on travaille ensemble en silence ?" 😅 Vous l\'avez fait ?',
    replies: [
      { authorIdx: 3, content: 'J\'ai lancé un "café focus" le vendredi matin au bureau — chacun travaille sur ses trucs en silence, pas de réunions. Succès total et les gens ne savent même pas que c\'est du body doubling !' },
      { authorIdx: 0, content: 'Sur FocusBrain on peut faire ça virtuellement ! Je fais des sessions avec Sara le mardi et c\'est très productif. Les collègues physiques c\'est une prochaine étape 😊' },
    ],
  },
  {
    space: 'STRATEGIES_TDAH' as const, authorIdx: 8,
    title: 'La honte TDAH — comment vous la gérez ?',
    content: 'Je me retrouve souvent envahi par la honte après avoir raté quelque chose d\'important (oublié un RDV, pas rendu un travail à temps...). Cette spirale de honte qui mène à la paralysie, c\'est épuisant. Comment vous sortez de là ? 💔',
    replies: [
      { authorIdx: 4, content: 'La thérapie ACT (Acceptance and Commitment Therapy) m\'a beaucoup aidée. On apprend à observer les émotions sans les subir. Cherche un psy spécialisé TDAH.' },
      { authorIdx: 6, content: 'Je me dis une chose : "ce n\'est pas ma faute, c\'est mon cerveau". La distinction entre moi et mon TDAH m\'a libérée de beaucoup de culpabilité.' },
      { authorIdx: 2, content: 'Autocompassion. Ce que tu dirais à un ami dans la même situation, dis-le toi aussi. Le TDAH n\'est pas un manque de volonté 💜' },
    ],
  },
  {
    space: 'VIE_PERSO' as const, authorIdx: 9,
    title: 'Diagnostic à 28 ans — tout comprendre en un instant 🧠',
    content: 'Diagnostiqué il y a 2 semaines. J\'ai pleuré de soulagement pendant une heure. Toute ma vie prenait soudain sens. Les bulletins scolaires "n\'utilise pas son potentiel", les jobs ratés, les amis perdus à cause de l\'oubli...\n\nVous avez vécu le même moment de révélation ? Comment vous avez géré l\'après-diagnostic ?',
    replies: [
      { authorIdx: 0, content: 'Diagnostiquée à 31 ans. Ce mélange de soulagement et de deuil (pour toutes les années "perdues") est très commun. Tu n\'es pas seul. Bienvenue dans notre communauté 💜' },
      { authorIdx: 3, content: 'Après le diagnostic : prends le temps de te documenter avec des sources sérieuses. Et trouve un psychiatre + un psychologue TDAH. Les deux ensemble c\'est l\'idéal.' },
      { authorIdx: 7, content: 'Le plus important maintenant : ne pas vouloir tout changer d\'un coup. Une petite amélioration à la fois. Le cerveau TDAH déteste les changements massifs.' },
    ],
  },
];

// ── Slots de body doubling prédéfinis ──────────────────────────────────────────
function futureDate(daysFromNow: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log('🌱 Seeding FocusBrain — données complètes...\n');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ── 1. Créer les 10 membres ──────────────────────────────────────────────────
  console.log('👥 Création des 10 membres TDAH...');
  const users: any[] = [];

  for (const member of MEMBERS) {
    const { lat, lng, city, bio, workObjectives, availabilities, gender, diagnosisStatus, ...userData } = member;

    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: {
        name: member.name, avatar: member.avatar,
        tdahType: member.tdahType, workStyle: member.workStyle,
        bio, gender, diagnosisStatus,
        workObjectives: workObjectives as any,
        availabilities: availabilities as any,
        onboardingDone: true, emailVerified: true,
      },
      create: {
        ...userData,
        bio, gender, diagnosisStatus,
        workObjectives: workObjectives as any,
        availabilities: availabilities as any,
        passwordHash,
        timezone: 'Africa/Casablanca',
        emailVerified: true,
        onboardingDone: true,
      },
    });

    await prisma.userLocation.upsert({
      where: { userId: user.id },
      update: { lat, lng, city, isVisible: true },
      create: { userId: user.id, lat, lng, city, country: 'MA', isVisible: true },
    });

    users.push(user);
    console.log(`  ✅ ${member.name} (${member.tdahType}) — ${city}`);
  }

  // ── 2. Cercle de confiance — liaisons amicales entre membres ─────────────────
  console.log('\n💜 Création du Cercle de Confiance...');
  const circlePairs = [
    [0, 1], [0, 3], [1, 5], [2, 6], [3, 7],
    [4, 8], [5, 9], [6, 9], [2, 4], [7, 8],
  ];
  for (const [a, b] of circlePairs) {
    await prisma.circleMember.upsert({
      where: { userId_partnerId: { userId: users[a].id, partnerId: users[b].id } },
      update: { sessionCount: Math.floor(Math.random() * 8) + 1 },
      create: { userId: users[a].id, partnerId: users[b].id, sessionCount: Math.floor(Math.random() * 5) + 1 },
    }).catch(() => {});
  }
  console.log(`  ✅ ${circlePairs.length} liens de cercle créés`);

  // ── 3. Forum — posts et réponses ─────────────────────────────────────────────
  console.log('\n🌐 Remplissage du Forum...');

  for (const post of FORUM_POSTS) {
    // Vérifier si le post existe déjà (par contenu tronqué)
    const existing = await prisma.forumPost.findFirst({
      where: { userId: users[post.authorIdx].id, content: { startsWith: post.content.slice(0, 30) } },
    });
    if (existing) {
      console.log(`  ⏩ Post déjà existant : "${post.title.slice(0, 40)}..."`);
      continue;
    }

    // Le titre est intégré en début de content (le modèle n'a pas de champ title)
    const fullContent = `**${post.title}**\n\n${post.content}`;

    const createdPost = await prisma.forumPost.create({
      data: {
        spaceId: post.space,
        userId: users[post.authorIdx].id,
        content: fullContent,
        emojiReactions: { '👍': Math.floor(Math.random() * 20) + 3 },
      },
    });

    // Les réponses sont des ForumPost avec parentId
    for (const reply of post.replies) {
      await prisma.forumPost.create({
        data: {
          spaceId: post.space,
          userId: users[reply.authorIdx].id,
          content: reply.content,
          parentId: createdPost.id,
          emojiReactions: { '👍': Math.floor(Math.random() * 8) + 1 },
        },
      });
    }

    console.log(`  ✅ [${post.space}] "${post.title.slice(0, 45)}..."`);
  }

  // ── 4. Slots de body doubling disponibles ────────────────────────────────────
  console.log('\n📅 Création des créneaux body doubling...');
  const slotDefs = [
    { creatorIdx: 0, days: 1,  hour: 9,  duration: 50 },
    { creatorIdx: 1, days: 2,  hour: 14, duration: 25 },
    { creatorIdx: 2, days: 1,  hour: 10, duration: 50 },
    { creatorIdx: 5, days: 3,  hour: 20, duration: 25 },
    { creatorIdx: 6, days: 2,  hour: 9,  duration: 50 },
    { creatorIdx: 9, days: 4,  hour: 15, duration: 25 },
    { creatorIdx: 3, days: 1,  hour: 16, duration: 50 },
    { creatorIdx: 7, days: 5,  hour: 8,  duration: 25 },
  ];

  for (const s of slotDefs) {
    await prisma.slot.create({
      data: {
        creatorId: users[s.creatorIdx].id,
        startTime: futureDate(s.days, s.hour),
        duration: s.duration,
        status: 'OPEN',
      },
    }).catch(() => {});
  }
  console.log(`  ✅ ${slotDefs.length} créneaux OPEN créés`);

  // ── 5. Messages entre membres ────────────────────────────────────────────────
  console.log('\n💬 Création des messages...');
  const messagePairs = [
    { from: 0, to: 1, msgs: ['Salut Youssef ! Tu es dispo pour une session demain matin ?', 'Avec plaisir ! 9h ça te va ?', 'Parfait, à demain 💪'] },
    { from: 2, to: 6, msgs: ['Nadia ici ! J\'ai vu ton post sur le forum, très intéressant 😊', 'Merci ! Tu travailles aussi en freelance ?', 'Oui ! On devrait faire une session ensemble'] },
    { from: 3, to: 7, msgs: ['Omar, tu es architecte ? Super ! Moi entrepreneur. On a sûrement des défis similaires avec le TDAH', 'Absolument ! La gestion de projet avec le TDAH c\'est un défi quotidien 😅'] },
    { from: 4, to: 8, msgs: ['Bonjour Zineb ! J\'ai vu que tu es dispo le matin. Je cherche une partenaire de body doubling 🌅', 'Bonjour Fatima ! Avec plaisir. Le mardi et jeudi matin tu es libre ?'] },
    { from: 5, to: 9, msgs: ['Amine ! Partenaire body doubling ? 💻⚡', 'Oui ! T\'es sur quel projet en ce moment ?', 'Une app React. Et toi ?', 'Coaching en ligne — je structure mes contenus'] },
  ];

  for (const pair of messagePairs) {
    for (const content of pair.msgs) {
      const fromIdx = pair.msgs.indexOf(content) % 2 === 0 ? pair.from : pair.to;
      const toIdx   = fromIdx === pair.from ? pair.to : pair.from;
      await prisma.message.create({
        data: { fromId: users[fromIdx].id, toId: users[toIdx].id, content },
      }).catch(() => {});
    }
  }
  console.log(`  ✅ Messages entre ${messagePairs.length} paires de membres`);

  // ── 6. Propositions de rencontre ─────────────────────────────────────────────
  console.log('\n🤝 Création des propositions de rencontre...');
  const meetings = [
    { from: 0, to: 3, type: 'CAFE', days: 3, location: 'Café Clock, Médina Marrakech', msg: 'Un café de travail ensemble ? Je travaille souvent là-bas le matin 🌅', status: 'ACCEPTED' },
    { from: 1, to: 5, type: 'LIBRARY', days: 5, location: 'Bibliothèque universitaire Marrakech', msg: 'Session focus silencieuse ? Chacun sur son projet 🤫', status: 'PENDING' },
    { from: 6, to: 2, type: 'COWORKING', days: 7, location: 'Spaces Marrakech, Hivernage', msg: 'Tu connais ce coworking ? L\'ambiance est super pour être productif !', status: 'ACCEPTED' },
    { from: 9, to: 4, type: 'OUTDOOR', days: 10, location: 'Jardin Majorelle, Marrakech', msg: 'Session créative en plein air ? 🌳', status: 'PENDING' },
  ];

  for (const m of meetings) {
    const proposedAt = new Date();
    proposedAt.setDate(proposedAt.getDate() + m.days);
    proposedAt.setHours(10, 0, 0, 0);

    await prisma.meetingProposal.create({
      data: {
        fromId: users[m.from].id,
        toId: users[m.to].id,
        type: m.type,
        proposedAt,
        location: m.location,
        message: m.msg,
        status: m.status,
      },
    }).catch(() => {});
  }
  console.log(`  ✅ ${meetings.length} propositions de rencontre créées`);

  // ── Résumé ───────────────────────────────────────────────────────────────────
  console.log(`
╔════════════════════════════════════════════════════╗
║  🎉 SEED COMPLET — FocusBrain est prêt à tester ! ║
╠════════════════════════════════════════════════════╣
║  👥 10 membres TDAH avec avatars & profils riches  ║
║  💜 10 liens Cercle de Confiance                   ║
║  🌐 10 posts forum + 27 réponses                   ║
║  📅  8 créneaux body doubling disponibles          ║
║  💬  Messages entre 5 paires de membres           ║
║  🤝  4 propositions de rencontre                   ║
╠════════════════════════════════════════════════════╣
║  📧 Email  : prenom@focusbrain.test                ║
║  🔑 Mdp    : password123                           ║
║  ex: sara@focusbrain.test / password123            ║
╚════════════════════════════════════════════════════╝
  `);
}

main()
  .catch(e => { console.error('❌ Erreur seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
