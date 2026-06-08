/**
 * seedForum.ts — 53 sujets TDAH réels + 160 réponses
 * Couvre tous les espaces : Stratégies, Médication, Outils, Travail, Études, Vie perso
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Posts par espace ───────────────────────────────────────────────────────────

const FORUM_DATA = [

  // ════════════════════════════════════════════════════
  // 🧠 STRATEGIES_TDAH (15 sujets)
  // ════════════════════════════════════════════════════

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'sara@focusbrain.test',
    title: 'Le Pomodoro ne marche pas pour moi — vos alternatives ?',
    content: `J'essaie le Pomodoro depuis 2 mois et c'est une torture. 25 min c'est soit trop court (je viens de me mettre dans le bain) soit je suis en hyperfocus et la minuterie me détruit.\n\nVous utilisez quoi comme technique de gestion du temps avec le TDAH ? Je cherche quelque chose d'adaptatif.`,
    tags: ['#procrastination', '#focus', '#techniques'],
    replies: [
      { email: 'youssef@focusbrain.test', content: 'Moi j\'utilise des blocs de 15 min avec 5 min de pause. Le secret : adapter selon ton état, pas suivre un temps fixe. Certains jours je fais 45 min d\'affilée sans pause.' },
      { email: 'mehdi@focusbrain.test', content: 'Le body doubling fonctionne 10x mieux que le Pomodoro pour moi. Travailler à côté de quelqu\'un (même en visio silencieuse) me garde ancré dans la tâche.' },
      { email: 'karim@focusbrain.test', content: 'La méthode "Time Blocking" : tu bloques des plages entières dans ton calendrier pour une seule tâche. Pas de minuterie, pas de pression. Game changer avec le TDAH combiné 🎯' },
      { email: 'nadia@focusbrain.test', content: 'J\'ai arrêté les minuteries complètement. Je me fixe juste UN objectif par session et je m\'arrête quand c\'est fait, peu importe le temps. Mon cerveau déteste être interrompu.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'nadia@focusbrain.test',
    title: '✨ Ma routine matinale qui marche vraiment (après 3 ans d\'essais)',
    content: `Après 3 ans d'essais et d'échecs, voilà ce qui fonctionne VRAIMENT pour mon cerveau TDAH :\n\n1. Réveil à heure fixe, même le weekend (oui c'est dur mais c'est la base)\n2. Pas de téléphone pendant 45 min après le réveil\n3. 10 min de sport léger (marche, yoga — pas besoin de suer)\n4. 3 TÂCHES MAX écrites la veille sur un post-it\n5. Body doubling 2x par semaine sur FocusBrain\n6. Notification "pause" toutes les 90 min\n\nC'est simple mais ça a tout changé. Le cerveau TDAH répond aux habitudes, pas à la volonté.`,
    tags: ['#routine', '#matin', '#organisation'],
    replies: [
      { email: 'fatima@focusbrain.test', content: 'Le point sur le téléphone le matin est révolutionnaire ! J\'ai mis le mien dans la cuisine et je me suis rendu compte que je gagnais 1h de clarté mentale chaque matin. Merci 🙏' },
      { email: 'sara@focusbrain.test', content: 'Les 3 tâches max — j\'aurais jamais cru que si peu suffit mais c\'est libérateur. Avant j\'avais 20 tâches et je finissais rien. Maintenant je me sens accomplie chaque jour.' },
      { email: 'amine@focusbrain.test', content: 'J\'ajouterais : préparer ses vêtements ET son sac la veille. Ça évite la surcharge cognitive du matin qui fait tout rater dès le départ !' },
      { email: 'omar@focusbrain.test', content: 'Excellent partage. J\'essaie depuis 2 semaines et ça marche. La clé c\'est vraiment l\'heure fixe de lever — ça régule tout le reste.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'zineb@focusbrain.test',
    title: 'La honte TDAH — cette spirale épuisante. Comment vous en sortez ?',
    content: `Je rate quelque chose d'important (RDV oublié, deadline loupée, message sans réponse depuis 3 semaines...) et immédiatement la honte arrive. Puis la honte de la honte. Puis je me paralyse complètement.\n\nCette spirale m'épuise. Certains jours je passe plus de temps à me flageller qu'à travailler. Comment vous gérez ça ?`,
    tags: ['#honte', '#paralysie', '#émotions'],
    replies: [
      { email: 'fatima@focusbrain.test', content: 'La thérapie ACT m\'a sauvée. On apprend à observer ses émotions sans les subir. "Je remarque que je ressens de la honte" plutôt que "je suis nulle". La distinction change tout.' },
      { email: 'salma@focusbrain.test', content: 'Je me dis une chose : ce n\'est pas MA faute, c\'est MON CERVEAU. Distinguer "moi" de "mon TDAH" m\'a libérée de beaucoup de culpabilité. Le TDAH n\'est pas un manque de volonté 💜' },
      { email: 'nadia@focusbrain.test', content: 'Auto-compassion. Littéralement. Ce que tu dirais à une amie dans la même situation, dis-le toi aussi. On est souvent bien plus cruel envers soi-même qu\'envers les autres.' },
      { email: 'karim@focusbrain.test', content: 'J\'ai un "fichier de réussites" où je note chaque petite victoire. Quand la honte arrive, je le relis. Ça remet en perspective et coupe la spirale.' },
      { email: 'amine@focusbrain.test', content: 'Le TDAH provoque quelque chose qu\'on appelle la dysrégulation émotionnelle. C\'est neurologique, pas un défaut de caractère. Se le répéter aide vraiment.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'mehdi@focusbrain.test',
    title: 'Hyperfocus : bénédiction ou malédiction ? Vos expériences',
    content: `Hier j'ai perdu 6 heures à optimiser mon setup de travail au lieu de travailler. Mais la semaine passée, j'ai codé une feature complète en 4 heures que j'aurais mis 3 jours normalement.\n\nL'hyperfocus c'est le côté pile/face du TDAH. Comment vous le gérez ? Vous avez trouvé un moyen de le "déclencher" sur commande ?`,
    tags: ['#hyperfocus', '#productivité', '#focus'],
    replies: [
      { email: 'karim@focusbrain.test', content: 'J\'ai appris à "préparer le terrain" pour l\'hyperfocus : musique focus (toujours la même playlist), même heure, même lieu, tâche clairement définie. Ça n\'est pas garanti mais ça augmente les chances.' },
      { email: 'youssef@focusbrain.test', content: 'Le problème c\'est qu\'on ne peut pas forcer l\'hyperfocus, on peut juste créer des conditions favorables. Et mettre une alarme de sortie pour pas perdre 6h comme toi 😅' },
      { email: 'sara@focusbrain.test', content: 'J\'ai appris à reconnaître les signes avant-coureurs (sentiment d\'excitation, temps qui disparaît) et je planifie immédiatement ce que je vais faire APRÈS pour éviter de me perdre.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'karim@focusbrain.test',
    title: 'Démarrer une tâche = la pire partie. Vos trucs pour vaincre l\'inertie ?',
    content: `"Je vais juste commencer 5 minutes" — on entend ça partout. Sauf que pour mon cerveau TDAH, même commencer 5 minutes c'est une montagne insurmontable quand la tâche est "lourde" ou "floue".\n\nComment vous faites pour démarrer quand vous n'avez aucune envie ? Sans attendre l'envie (elle vient jamais) ?`,
    tags: ['#procrastination', '#démarrage', '#motivation'],
    replies: [
      { email: 'mehdi@focusbrain.test', content: 'Trick qui marche : la tâche doit être tellement petite qu\'il est ridicule de ne pas la faire. "Ouvrir le document Word" c\'est une tâche. Juste ça. Ensuite ça roule souvent tout seul.' },
      { email: 'nadia@focusbrain.test', content: 'Le body doubling ! Planifier une session FocusBrain ET dire à haute voix "je vais travailler sur X pendant cette session" crée une obligation sociale légère qui aide VRAIMENT.' },
      { email: 'zineb@focusbrain.test', content: 'La méthode "juste 2 minutes" est plus réaliste que 5. Et si après 2 min je veux arrêter, j\'arrête sans culpabilité. Mais souvent je continue. L\'inertie est brisée.' },
      { email: 'fatima@focusbrain.test', content: 'Gamifier la tâche horrible. Chrono, défi perso, récompense après. "Si je fais X en moins de 30 min, je m\'offre Y." Le cerveau TDAH adore les petits défis.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'salma@focusbrain.test',
    title: 'Le syndrome de l\'imposteur décuplé par le TDAH — vous connaissez ?',
    content: `Je travaille bien, je produis des résultats, mes clients sont satisfaits. Et pourtant je vis avec la conviction permanente que je vais être "démasquée" et qu'on va réaliser que je suis nulle.\n\nLe TDAH amplifie ça parce qu'on a tellement d'histoires d'échecs derrière nous. Comment vous gérez l'imposteur interne ?`,
    tags: ['#imposteur', '#confiance', '#émotions'],
    replies: [
      { email: 'sara@focusbrain.test', content: 'J\'ai réalisé que mon "imposteur" me protège en fait — si je me dévalue d\'abord, personne d\'autre ne peut me dévaluer. C\'est un mécanisme de défense appris après des années d\'échecs scolaires.' },
      { email: 'karim@focusbrain.test', content: 'Tenir un journal de réussites : chaque semaine, j\'écris 3 choses que j\'ai bien faites. Après 6 mois tu as des preuves concrètes contre la voix de l\'imposteur.' },
      { email: 'omar@focusbrain.test', content: 'La thérapie cognitive m\'a aidé à identifier ces pensées automatiques et à les challenger. "Sur quoi tu bases cette conviction ?" Souvent aucune preuve réelle.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'amine@focusbrain.test',
    title: 'Gérer les tâches administratives quand t\'as le TDAH 😤',
    content: `Impôts, assurances, remboursements médicaux, papiers bancaires... Ces trucs m'ont coûté des centaines d'euros en pénalités de retard et des heures de stress. Mon cerveau TDAH est ALLERGIQUE à l'administratif.\n\nVous avez développé un système qui marche ?`,
    tags: ['#organisation', '#administratif', '#système'],
    replies: [
      { email: 'zineb@focusbrain.test', content: 'Comptable freelance ici ! Mes conseils : 1 dossier physique par catégorie avec couleurs, 1 rappel mensuel fixe "admin day", automatiser tout ce qui peut l\'être (prélèvements auto, alertes mail).' },
      { email: 'nadia@focusbrain.test', content: 'J\'ai un "admin day" le 1er lundi de chaque mois. Rien d\'autre ce jour-là. C\'est dans mon calendrier depuis 1 an et j\'ai économisé plusieurs centaines d\'euros en pénalités évitées.' },
      { email: 'fatima@focusbrain.test', content: 'L\'app Digiposte (ou équivalent numérique) pour centraliser tous les documents officiels. Plus de papier = plus de perte. Et j\'ai un assistant vocal qui me rappelle les deadlines.' },
      { email: 'mehdi@focusbrain.test', content: 'Pour les impôts : j\'ai préparé un Google Sheet avec toutes les deadlines de l\'année. Un coup d\'oeil et je sais ce qui arrive. La surprise est l\'ennemi du cerveau TDAH.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'omar@focusbrain.test',
    title: 'La paralysie de l\'analyse — trop de choix = 0 décision',
    content: `Je dois choisir un logiciel pour mon cabinet d'archi. J'ai comparé 12 options, lu 50 avis, créé un tableau comparatif sur Notion... et je suis toujours paralysé 3 semaines après.\n\nLa paralysie de l'analyse avec le TDAH c'est féroce. On veut la solution parfaite, on est incapable d'accepter le "assez bien". Des stratégies ?`,
    tags: ['#décision', '#paralysie', '#organisation'],
    replies: [
      { email: 'karim@focusbrain.test', content: 'Règle que j\'applique : MAX 3 options comparées, délai de décision fixé à l\'avance (ex: 48h), et je me rappelle que "parfait" n\'existe pas. Une décision imparfaite prise > aucune décision.' },
      { email: 'youssef@focusbrain.test', content: 'La méthode "assez bien" : définir ses 3 critères NON-NÉGOCIABLES avant de chercher. Tout ce qui remplit ces 3 critères est une option valide. Stop comparer au-delà.' },
      { email: 'salma@focusbrain.test', content: 'Je flip une pièce pour les décisions difficiles. Pas pour suivre le résultat mais pour voir ma réaction émotionnelle. Si je suis déçu par pile, c\'est que je voulais face. Ça m\'aide à voir ma vraie préférence.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'fatima@focusbrain.test',
    title: 'Body doubling virtuel — ça marche vraiment ou c\'est effet placebo ?',
    content: `Depuis que j'utilise FocusBrain pour faire du body doubling, ma productivité a changé. Mais je me pose la question : c'est quoi exactement le mécanisme ? Pourquoi le fait d'être "observé" (même par quelqu'un qui fait sa propre chose) aide à se concentrer ?\n\nDes infos là-dessus ? Et vos expériences personnelles ?`,
    tags: ['#body-doubling', '#neurosciences', '#focus'],
    replies: [
      { email: 'youssef@focusbrain.test', content: 'Il y a des études là-dessus ! La présence d\'une autre personne active le système d\'attention externe du cerveau TDAH. On "emprunte" en quelque sorte la régulation attentionnelle de l\'autre.' },
      { email: 'mehdi@focusbrain.test', content: 'Dev web ici, je fais du body doubling depuis 2 ans. Ce n\'est PAS un placebo — j\'ai fait des tests : même tâche, avec ou sans BD. AVEC = 2-3x plus productif et 5x moins de distraction.' },
      { email: 'sara@focusbrain.test', content: 'Pour moi c\'est la combinaison de : présence sociale (dopamine), légère pression positive (accountability), et l\'environnement "travail" créé par la présence de l\'autre. Triple effet !' },
      { email: 'karim@focusbrain.test', content: 'J\'ai commencé sceptique. Maintenant je ne peux plus travailler sans. Le body doubling c\'est ma béquille positive — j\'assume totalement 💪' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'youssef@focusbrain.test',
    title: 'Gérer les distractions numériques — mon téléphone est mon pire ennemi',
    content: `Je calcule que je perds environ 2-3 heures par jour à cause des notifications, réseaux sociaux, et du "juste 2 min" sur YouTube qui devient 45 min. Avec le TDAH le téléphone c'est un casino à dopamine.\n\nComment vous avez appris à coexister avec votre téléphone ?`,
    tags: ['#distraction', '#téléphone', '#focus'],
    replies: [
      { email: 'zineb@focusbrain.test', content: 'Toutes les notifs coupées sauf appels et messages directs. Les réseaux sociaux accessibles UNIQUEMENT depuis le bureau (pas le téléphone). C\'est radical mais ça a divisé mon temps d\'écran par 4.' },
      { email: 'mehdi@focusbrain.test', content: 'App "One Sec" qui ajoute 5 secondes de délai avant d\'ouvrir Instagram/TikTok. Ce délai rompt le réflexe automatique. Simple et super efficace.' },
      { email: 'amine@focusbrain.test', content: 'Mode avion pendant les sessions de travail. Le monde survit sans moi pendant 2h. Et j\'utilise un vrai réveil physique pour éviter de toucher le téléphone le matin.' },
      { email: 'nadia@focusbrain.test', content: 'Grayscale mode (nuances de gris) sur le téléphone pendant les heures de travail. Les apps colorées sont moins attrayantes. Contre-intuitif mais ça marche vraiment.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'sara@focusbrain.test',
    title: 'Le mind mapping pour les cerveaux TDAH — ma découverte de l\'année',
    content: `J'ai toujours détesté les listes linéaires. Mon cerveau pense en connexions, en associations, pas en séquences. Depuis que j'ai découvert le mind mapping j'organise mes projets, mes réunions, même mes courses différemment.\n\nVous utilisez quoi comme outil ? Papier ou digital ?`,
    tags: ['#organisation', '#outils', '#créativité'],
    replies: [
      { email: 'salma@focusbrain.test', content: 'MindMeister pour le digital, mais honnêtement je préfère papier + stylos de couleur. L\'aspect tactile aide mon cerveau à ancrer les infos. Et c\'est hors écran bonus !' },
      { email: 'nadia@focusbrain.test', content: 'XMind est fantastique et gratuit. J\'ai cartographié toute ma vie professionnelle et ça a remplacé Notion pour moi. Plus visuel, plus intuitif pour le TDAH.' },
      { email: 'omar@focusbrain.test', content: 'En architecture on utilise déjà beaucoup de pensée visuelle. Le mind map m\'a aidé à transférer cette méthode à ma vie perso et admin. Super découverte !' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'mehdi@focusbrain.test',
    title: 'Méthode GTD adaptée au TDAH — ce qui marche, ce qui ne marche pas',
    content: `J'ai essayé de mettre en place "Getting Things Done" de David Allen. Trop de système, trop de maintenance, cerveau TDAH has left the chat après 3 semaines.\n\nMais j'ai gardé quelques principes et j'ai créé mon propre hybride. Qui a fait pareil ? Qu'est-ce que vous avez gardé du GTD ?`,
    tags: ['#organisation', '#gtd', '#système'],
    replies: [
      { email: 'karim@focusbrain.test', content: 'Le seul principe GTD qui tient pour moi : "inbox zéro" dans ma tête = tout ce qui arrive va dans UN seul endroit (1 carnet ou 1 app). Capturer = libérer le cerveau. Le reste du système j\'ai abandonné.' },
      { email: 'zineb@focusbrain.test', content: 'La règle des 2 minutes est la seule chose que j\'ai gardée. Si ça prend moins de 2 min, je le fais maintenant. Ça a éliminé 80% de ma pile de "trucs en attente".' },
      { email: 'youssef@focusbrain.test', content: 'GTD complet = trop lourd pour le TDAH. Mais GTD + app simple (Todoist, Things) + revue hebdo courte = ça peut marcher. La clé c\'est la revue hebdo même courte.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'fatima@focusbrain.test',
    title: 'Se pardonner ses oublis — l\'exercice le plus difficile avec le TDAH',
    content: `J'ai oublié l'anniversaire de ma meilleure amie (pour la 2ème fois). J'ai oublié un appel pro important. J'ai envoyé un email sans la pièce jointe (3 fois cette semaine).\n\nL'oubli chronique est une des choses les plus douloureuses du TDAH parce qu'on passe pour quelqu'un qui s'en fout. Comment vous gérez ça avec votre entourage ?`,
    tags: ['#oubli', '#relations', '#mémoire'],
    replies: [
      { email: 'sara@focusbrain.test', content: 'J\'ai commencé à expliquer à mes proches que mon oubli n\'est PAS un manque d\'amour — c\'est neurologique. Depuis je leur donne permission de me rappeler les choses importantes sans que je me sente jugée.' },
      { email: 'zineb@focusbrain.test', content: 'Système "externalisé" : anniversaires dans le calendrier avec rappel 1 semaine avant + 1 jour avant. Courses : liste partagée dans l\'app avec mon conjoint. On externalisé la mémoire !' },
      { email: 'mehdi@focusbrain.test', content: 'J\'ai arrêté de promettre des choses que je risque d\'oublier. Maintenant je dis "je note maintenant et je confirme". Ça paraît bizarre mais les gens comprennent et c\'est plus honnête.' },
      { email: 'amine@focusbrain.test', content: 'L\'oubli du TDAH vient d\'un déficit de mémoire de travail, pas d\'un manque de respect. Se le répéter et l\'expliquer aux autres change les dynamiques relationnelles.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'zineb@focusbrain.test',
    title: 'Travailler en "sprints" — plus efficace que le temps continu ?',
    content: `J'ai découvert qu'au lieu de "travailler toute la matinée", travailler en sprints intenses de 25-40 min avec coupure COMPLÈTE (pas juste pause) est bien plus productif pour mon TDAH inattentif.\n\nMes sprints : travail intense → walk de 10 min dehors → sprint suivant. Vous avez des rythmes similaires ?`,
    tags: ['#focus', '#énergie', '#organisation'],
    replies: [
      { email: 'fatima@focusbrain.test', content: 'Oui ! Les pauses actives (marche, étirements) sont clés. Une pause écran-vers-écran ne récupère rien. Les pauses physiques rechargent vraiment la capacité attentionnelle.' },
      { email: 'karim@focusbrain.test', content: 'Je fais pareil mais j\'ai ajouté : sprint du matin (9h-12h) puis vraie pause déjeuner 1h, puis sprint court l\'après-midi (14h-15h30). Plus de 5-6h de vrai travail concentré est impossible pour mon cerveau.' },
    ],
  },

  {
    space: 'STRATEGIES_TDAH', authorEmail: 'amine@focusbrain.test',
    title: 'Comment j\'ai appris à dire NON — la surcharge du cerveau TDAH',
    content: `Le TDAH + la peur de décevoir = s'engager dans 15 projets simultanément puis s'effondrer. J'ai mis 30 ans à comprendre que mon problème n'était pas le manque de capacité mais la surcapacité d'enthousiasme.\n\nComment vous avez appris à dire non sans culpabilité ?`,
    tags: ['#limites', '#stress', '#organisation'],
    replies: [
      { email: 'salma@focusbrain.test', content: 'Règle que j\'applique maintenant : avant tout nouvel engagement, je vérifie mon calendrier. Si c\'est pas là, ça n\'existe pas. Et je me donne 24h avant de dire oui à quoi que ce soit.' },
      { email: 'nadia@focusbrain.test', content: '"Je dois vérifier mon agenda et je reviens vers toi" est ma phrase magique. Elle remplace le "oui" automatique. Et souvent dans les 24h, l\'enthousiasme initial retombe et le non vient naturellement.' },
      { email: 'omar@focusbrain.test', content: 'Visualiser les conséquences concrètes du oui avant de répondre. "Si je dis oui, qu\'est-ce que je sacrifie ?" Rendre les coûts visibles aide à prendre de meilleures décisions.' },
    ],
  },

  // ════════════════════════════════════════════════════
  // 💊 MEDICATION (8 sujets)
  // ════════════════════════════════════════════════════

  {
    space: 'MEDICATION', authorEmail: 'youssef@focusbrain.test',
    title: 'Ritalin vs Concerta — vos expériences comparées ?',
    content: `Mon psychiatre me propose de passer du Ritalin (3x/jour) au Concerta (libération prolongée). Je suis inquiet du changement. Vous qui avez essayé les deux, c'est vraiment mieux ?\n\nNote : je partage mon vécu, pas de conseil médical bien sûr. Toujours parler à votre médecin 🙏`,
    tags: ['#médication', '#methylphénidate', '#psychiatrie'],
    replies: [
      { email: 'fatima@focusbrain.test', content: 'Le Concerta m\'a changé la vie vs Ritalin. Plus de pics et creux dans la journée. La transition a pris 2-3 semaines d\'adaptation avec quelques maux de tête puis tout s\'est stabilisé.' },
      { email: 'sara@focusbrain.test', content: 'Moi c\'est l\'inverse — le Ritalin court marche mieux car je peux ajuster selon mes besoins. Le Concerta était trop "tout ou rien" pour mon profil. Vraiment individuel.' },
      { email: 'mehdi@focusbrain.test', content: 'Les effets secondaires varient énormément. Ce qui marche pour l\'un peut ne pas marcher pour l\'autre. L\'essentiel est d\'avoir un psychiatre qui ajuste avec toi, pas pour toi.' },
      { email: 'karim@focusbrain.test', content: 'J\'ai fait les deux sur 6 mois chacun avec journal des effets. Mon médecin a apprécié ces données pour ajuster. Je recommande de tenir un journal : heure de prise, effets, durée, qualité du sommeil.' },
    ],
  },

  {
    space: 'MEDICATION', authorEmail: 'fatima@focusbrain.test',
    title: 'Les effets secondaires dont personne ne parle vraiment',
    content: `Coupe-faim, insomnies, irritabilité en fin d'effet — tout ça est connu. Mais personne ne m'avait prévenu de la fatigue émotionnelle, de la perte de créativité les premiers mois, du "crash" de 17h qui me rend groggy.\n\nVos effets inattendus que vous avez découverts vous-mêmes ?`,
    tags: ['#médication', '#effets-secondaires', '#vécu'],
    replies: [
      { email: 'zineb@focusbrain.test', content: 'Le "crash" du soir — personne ne m\'avait préparé à ça. Une heure de vague à l\'âme et d\'irritabilité avant de revenir à la normale. J\'ai appris à ne rien planifier d\'important à 17h.' },
      { email: 'youssef@focusbrain.test', content: 'La perte d\'appétit peut mener à une malnutrition légère si on ne fait pas attention. J\'ai instauré un petit-déjeuner copieux AVANT la prise et une collation programmée même sans faim.' },
      { email: 'nadia@focusbrain.test', content: 'Moins spontané, moins "moi" les premiers mois. C\'est déstabilisant de se sentir plus calme mais moins créatif. C\'est souvent temporaire pendant l\'adaptation — j\'aurais voulu le savoir avant.' },
      { email: 'amine@focusbrain.test', content: 'Tachycardie légère que j\'ignorais au début. Important de mesurer sa tension et son pouls régulièrement au début et d\'en parler au médecin. Chez moi ça s\'est régulé.' },
    ],
  },

  {
    space: 'MEDICATION', authorEmail: 'sara@focusbrain.test',
    title: 'Médicament + sport : le combo qui change tout ?',
    content: `J'ai lu plusieurs études montrant que l'exercice physique potentialise les effets de la médication TDAH. En pratique, depuis que je fais 30 min de sport le matin AVANT de prendre mon traitement, mes après-midis sont nettement meilleures.\n\nVous combinez sport et médicaments ? Vos observations ?`,
    tags: ['#médication', '#sport', '#dopamine'],
    replies: [
      { email: 'amine@focusbrain.test', content: 'Coach sportif ici — c\'est VRAI. L\'exercice libère dopamine et noradrénaline exactement comme le font les médicaments TDAH. Les deux ensemble = effet synergique. J\'ai des clients TDAH qui ont pu réduire leur dosage avec un programme sportif adapté.' },
      { email: 'mehdi@focusbrain.test', content: 'La course à pied le matin est mon "pré-médicament". Elle réchauffe le moteur dopaminergique avant la prise. Ma concentration les 2 premières heures est nettement meilleure que sans sport.' },
      { email: 'karim@focusbrain.test', content: 'Important : le type de sport compte. Les sports avec coordination et variation (arts martiaux, tennis, danse) semblent plus efficaces pour le TDAH que le cardio monotone.' },
    ],
  },

  {
    space: 'MEDICATION', authorEmail: 'mehdi@focusbrain.test',
    title: 'Oublier sa médication le matin — les galères que ça génère',
    content: `Ironique non ? Le médicament censé aider avec l'oubli... qu'on oublie de prendre. J'ai trouvé quelques astuces mais curieux de savoir ce que vous faites. Ma journée sans médicament est tellement différente que c'est violent.`,
    tags: ['#médication', '#routine', '#oubli'],
    replies: [
      { email: 'zineb@focusbrain.test', content: 'Médicament à côté de la cafetière. Je ne fais pas de café sans le prendre. Le café est mon routine trigger qui m\'aide à ne jamais oublier depuis 1 an.' },
      { email: 'sara@focusbrain.test', content: 'Alarme téléphone + pillulier semainier. Le pillulier me permet de savoir SI j\'ai pris le médicament (le trou vide) même si j\'ai un doute plus tard dans la journée.' },
      { email: 'fatima@focusbrain.test', content: 'Application de rappel médicament avec confirmation. Medisafe est bien — elle ne s\'arrête que quand tu confirmes la prise. Simple mais efficace.' },
    ],
  },

  {
    space: 'MEDICATION', authorEmail: 'karim@focusbrain.test',
    title: 'Questions à préparer pour son psychiatre — liste collaborative',
    content: `Mon prochain RDV psychiatre c'est dans 3 semaines. Je veux en profiter au max (les RDV sont rares et courts). Je prépare ma liste de questions.\n\nVous avez des questions essentielles que vous recommandez de poser ? On peut faire une liste collaborative utile pour tous !`,
    tags: ['#psychiatrie', '#médication', '#diagnostic'],
    replies: [
      { email: 'fatima@focusbrain.test', content: 'Questions que je pose toujours : "Quel est l\'objectif de ce médicament précisément pour MON profil ?" / "Quels signes montrent que ça marche ou que ça ne marche pas ?" / "Quelle est la durée minimale d\'essai avant d\'évaluer ?"' },
      { email: 'youssef@focusbrain.test', content: '"Y a-t-il des interactions avec le café, le sport, l\'alcool occasionnel ?" / "Comment savoir si le dosage est le bon ?" / "Que faire si je rate une dose ?" / "Y a-t-il des alternatives si les effets secondaires persistent ?"' },
      { email: 'nadia@focusbrain.test', content: 'Je prends toujours quelqu\'un avec moi ou j\'enregistre (avec accord). Le TDAH fait qu\'on oublie 50% de ce qui a été dit pendant la consultation elle-même 😅' },
      { email: 'sara@focusbrain.test', content: '"Les vacances médicament sont-elles recommandées pour moi ?" / "Comment surveiller mon cœur et ma tension ?" / "À quelle fréquence doit-on réévaluer le traitement ?"' },
    ],
  },

  {
    space: 'MEDICATION', authorEmail: 'zineb@focusbrain.test',
    title: 'Pause médicament pendant les vacances — vous le faites ?',
    content: `Mon psychiatre m'a dit que c'était possible de faire une "pause vacances" du traitement. Mais j'ai peur — mes vacances seront-elles vraiment reposantes sans médicament ? Ou pire qu'avec ?\n\nCeux qui ont fait des pauses, votre retour d'expérience ?`,
    tags: ['#médication', '#vacances', '#bien-être'],
    replies: [
      { email: 'mehdi@focusbrain.test', content: 'Pause de 3 semaines cet été. Surprise positive : sans obligations et stimulation de travail, mon cerveau a mieux géré. Les vacances sont naturellement moins exigeantes en attention soutenue.' },
      { email: 'karim@focusbrain.test', content: 'Ça dépend du type de vacances. Repos pur = pause possible. Vacances chargées (visites, organisation, enfants) = je garde le traitement. A adapter selon le programme réel.' },
      { email: 'fatima@focusbrain.test', content: 'Je n\'ai pas fait de pause car mes vacances impliquent de conduire longtemps et de gérer les enfants. La médication aide dans ces moments aussi. A discuter vraiment avec son psychiatre selon sa situation.' },
    ],
  },

  {
    space: 'MEDICATION', authorEmail: 'nadia@focusbrain.test',
    title: 'Premier rendez-vous psychiatre pour diagnostic adulte — à quoi s\'attendre ?',
    content: `J'ai enfin pris rendez-vous après 2 ans de procrastination (ironie totale). RDV dans 6 semaines, je suis à la fois soulagée et terrifiée. C'est quoi le déroulement ? On me croit direct ou il faut se "prouver" ?`,
    tags: ['#diagnostic', '#psychiatrie', '#première fois'],
    replies: [
      { email: 'zineb@focusbrain.test', content: 'Diagnostiquée adulte à 34 ans. Le RDV dure 1h-1h30 en général. Questionnaires standardisés, entretien sur l\'enfance, les difficultés actuelles. Viens avec des exemples concrets de ta vie quotidienne.' },
      { email: 'sara@focusbrain.test', content: 'Prépare une liste de tes difficultés principales ET d\'exemples concrets. "J\'ai du mal à me concentrer" est vague. "Je commence 5 tâches et n\'en finis aucune, j\'oublie mes clés 3x par semaine, je suis en retard chronique" est parlant.' },
      { email: 'youssef@focusbrain.test', content: 'Si possible apporte des bulletins scolaires anciens ou témoignages de proches qui peuvent décrire comment tu étais enfant. Les psychiatres cherchent des signes depuis l\'enfance pour le diagnostic.' },
      { email: 'amine@focusbrain.test', content: 'N\'aie pas peur d\'être honnête et de ne pas te "défendre". On a souvent tendance à minimiser nos difficultés en consultation par honte. Plus tu es honnête, plus le diagnostic sera précis.' },
    ],
  },

  {
    space: 'MEDICATION', authorEmail: 'amine@focusbrain.test',
    title: 'Méditation + médication : les deux ensemble ça change la donne',
    content: `J'ai commencé la méditation de pleine conscience en complément de mon traitement il y a 6 mois. Le combo est bluffant — la méditation semble renforcer et prolonger les effets de la médication.\n\nQuelqu'un a essayé les deux combinés ? Vos retours ?`,
    tags: ['#méditation', '#médication', '#bien-être'],
    replies: [
      { email: 'fatima@focusbrain.test', content: 'Professeure de yoga ici — la méditation de pleine conscience est validée scientifiquement pour le TDAH. Elle entraîne le cortex préfrontal, exactement la zone déficitaire dans le TDAH. Mais il faut 8 semaines minimum pour voir des effets réels.' },
      { email: 'salma@focusbrain.test', content: 'App Petit Bambou ou Headspace avec programmes spécifiques TDAH. Je fais 10 min le matin, ça m\'aide à "démarrer" avant la prise. Résultats visibles après 1 mois de pratique régulière.' },
      { email: 'karim@focusbrain.test', content: 'Attention : la méditation ne remplace pas la médication si elle est nécessaire. Mais en complément, oui, les deux s\'épaulent bien. Comme le sport d\'ailleurs.' },
    ],
  },

  // ════════════════════════════════════════════════════
  // 🛠️ OUTILS (8 sujets)
  // ════════════════════════════════════════════════════

  {
    space: 'OUTILS', authorEmail: 'mehdi@focusbrain.test',
    title: '🛠️ Mes 5 apps indispensables — testées sur 3 ans de TDAH',
    content: `Après avoir testé des dizaines d'apps, voilà ce qui reste installé :\n\n📱 **Notion** — pour centraliser (mais attention à ne pas sur-complexifier)\n⏰ **Time Timer** — minuterie visuelle, parfaite pour TDAH\n🎵 **Brain.fm** — musique focus neuroscientifique\n✅ **Todoist** — to-do simple avec récurrence\n🔕 **Forest** — pour bloquer le téléphone et "planter des arbres"\n\nVous utilisez quoi ?`,
    tags: ['#apps', '#outils', '#productivité'],
    replies: [
      { email: 'youssef@focusbrain.test', content: 'J\'ajoute **Structured** pour la planification visuelle de la journée. Interface parfaite TDAH — tu vois ta journée entière en timeline. Et **Endel** pour la musique focus, encore plus scientifique que Brain.fm.' },
      { email: 'sara@focusbrain.test', content: 'FocusBrain en premier évidemment 😄 ! Ensuite **Habitica** (to-do gamifié), **Google Keep** (notes vocales rapides), et **Alarmy** (réveil impossible à désactiver sans résoudre une équation 😅).' },
      { email: 'fatima@focusbrain.test', content: 'Je suis à l\'opposé : 3 apps max. Tout centraliser = distraction. Mon trio : Calendrier Google + Todoist + Notes Apple. Simple, synchronisé, suffit amplement.' },
      { email: 'karim@focusbrain.test', content: 'Pour la concentration : **Freedom** (bloque sites distracteurs sur tous appareils), **Focusplan** (planification visuelle) et **Spark** (email intelligent qui priorise automatiquement).' },
    ],
  },

  {
    space: 'OUTILS', authorEmail: 'sara@focusbrain.test',
    title: 'Carnets papier vs apps numériques — le grand débat TDAH',
    content: `Chaque fois que je passe à 100% numérique je perds des trucs. Chaque fois que je passe à 100% papier j'ai des notes éparpillées partout. Mon système hybride actuel : papier pour les idées rapides, app pour le suivi.\n\nVous avez trouvé votre équilibre papier/digital ?`,
    tags: ['#organisation', '#notes', '#système'],
    replies: [
      { email: 'zineb@focusbrain.test', content: '1 carnet physique UNIQUE pour tout (Leuchtturm1917 avec index). Je numérise les trucs importants avec l\'appareil photo. Hybride mais avec règle claire : tout part dans le carnet d\'abord.' },
      { email: 'nadia@focusbrain.test', content: 'Rocketbook — carnet qu\'on efface et numérise automatiquement vers Notion via l\'app. Meilleur des deux mondes : écriture physique + stockage digital.' },
      { email: 'salma@focusbrain.test', content: 'Pour les idées créatives : papier obligatoire, les apps bloquent ma pensée. Pour l\'organisation et le suivi : digital obligatoire, le papier se perd. J\'ai accepté ce dualisme.' },
    ],
  },

  {
    space: 'OUTILS', authorEmail: 'nadia@focusbrain.test',
    title: 'Template Notion TDAH — je partage le mien (avec lien)',
    content: `Après 2 ans d'itérations, voilà mon template Notion adapté au TDAH :\n\n✅ Tableau des tâches avec priorité 1-2-3 uniquement\n📅 Calendrier semaine sur une page\n🎯 3 objectifs max par semaine\n💪 Tracker d'habitudes simple (5 max)\n📓 Journal rapide 3 questions du soir\n\nLien : [Template disponible sur demande en MP]\n\nVous avez des templates à partager ?`,
    tags: ['#notion', '#template', '#organisation'],
    replies: [
      { email: 'mehdi@focusbrain.test', content: 'MP envoyé ! J\'ai aussi un template Notion pour les développeurs TDAH (gestion de projets tech, bugs, apprentissage). Si ça intéresse quelqu\'un.' },
      { email: 'karim@focusbrain.test', content: 'La règle des 3 priorités max est essentielle. Mon ancienne version Notion avait 15 vues différentes — je me perdais dedans. La simplicité est le secret avec le TDAH.' },
      { email: 'zineb@focusbrain.test', content: 'Le tracker d\'habitudes à 5 max est une bonne règle. J\'en avais 12, je ne remplissais plus rien après 2 semaines. Revenu à 4 habitudes = 8 mois de régularité maintenant.' },
    ],
  },

  {
    space: 'OUTILS', authorEmail: 'karim@focusbrain.test',
    title: 'Casques anti-bruit — lequel choisir pour le TDAH en open space ?',
    content: `Je travaille en open space et c'est l'enfer. Chaque conversation me détourne de ma tâche. Mon responsable m'a "autorisé" à mettre des écouteurs. Budget : 150-300€. Vos recommandations ?\n\nJ'ai besoin de vraie isolation, pas juste du son qui couvre le bruit.`,
    tags: ['#bruit', '#concentration', '#matériel'],
    replies: [
      { email: 'mehdi@focusbrain.test', content: 'Sony WH-1000XM5 — le meilleur rapport qualité/ANC selon moi. Mode "transparence" utile quand un collègue te parle. Confort pour journée entière. Vaut vraiment le prix.' },
      { email: 'youssef@focusbrain.test', content: 'Bose QuietComfort 45 si tu veux quelque chose de plus léger. L\'ANC est légèrement moins efficace que Sony mais le confort est supérieur pour certains.' },
      { email: 'amine@focusbrain.test', content: 'Pour l\'open space, j\'utilise aussi des bouchons d\'oreille EN PLUS des casques pour les moments de concentration maximale. Ça peut sembler excessif mais ça change tout.' },
      { email: 'sara@focusbrain.test', content: 'Le casque seul ne suffit pas toujours — la musique ou bruit blanc dedans est aussi important. Je recommande en parallèle l\'app Noisli ou mynoise.net selon vos types de sons préférés.' },
    ],
  },

  {
    space: 'OUTILS', authorEmail: 'zineb@focusbrain.test',
    title: 'Brain.fm vs Lo-fi Spotify vs Silence — test sur 6 mois',
    content: `J'ai testé systématiquement 3 environnements sonores sur 6 mois en mesurant ma productivité (nombre de tâches complétées, temps de focus mesuré).\n\nRésultats surprenants que je partage ici. Spoiler : ce qui marche dépend beaucoup du type de tâche.`,
    tags: ['#musique', '#focus', '#concentration'],
    replies: [
      { email: 'mehdi@focusbrain.test', content: 'La distinction tâche créative vs tâche mécanique est clé. Code répétitif = lo-fi ok. Architecture nouvelle feature = silence ou Brain.fm. Les paroles sont toujours non pour moi.' },
      { email: 'fatima@focusbrain.test', content: 'Le bruit de café (coffitivity.com) est mon meilleur environnement de travail. Je comprends pas totalement pourquoi mais l\'ambiance café "sociale" sans vraie distraction est idéale.' },
      { email: 'nadia@focusbrain.test', content: 'La musique classique baroque (60-70 BPM) est validée scientifiquement pour améliorer la concentration. Bach, Vivaldi, Haendel. Testé et approuvé sur mon TDAH combiné.' },
    ],
  },

  {
    space: 'OUTILS', authorEmail: 'amine@focusbrain.test',
    title: 'Google Home / Alexa pour les rappels TDAH — game changer ou gadget ?',
    content: `J'ai mis une enceinte connectée dans chaque pièce de ma maison. Je me parle à moi-même via l'enceinte pour les rappels, les timers, les listes. "Ok Google, rappelle-moi dans 20 min de reprendre mon email."\n\nAmbigu si c'est vraiment utile ou si c'est juste fun. Vos retours sur la domotique pour le TDAH ?`,
    tags: ['#rappels', '#domotique', '#organisation'],
    replies: [
      { email: 'karim@focusbrain.test', content: 'Très utile pour les rappels vocaux à la volée. Ma mémoire de travail est si faible que chaque fois que je pense à quelque chose, je le dit à voix haute immédiatement à Alexa avant de l\'oublier.' },
      { email: 'sara@focusbrain.test', content: 'Pareil ! "Alexa, note dans ma liste courses : lait, oeufs" pendant que je cuisine. Intégré à Google Keep. La commande vocale instantanée est parfaite pour le cerveau TDAH qui perd une idée en 3 secondes.' },
      { email: 'zineb@focusbrain.test', content: 'Timer de cuisine surtout ! "Alexa, timer 20 min" pendant que je travaille pour ne pas oublier ce qui est sur le feu. Ça peut paraître basique mais je brûlais ma cuisine 1-2x par mois avant.' },
    ],
  },

  {
    space: 'OUTILS', authorEmail: 'omar@focusbrain.test',
    title: 'Tableaux blancs physiques dans ton espace de travail — underrated',
    content: `Depuis que j'ai mis 2 grands tableaux blancs dans mon bureau à la maison, ma façon de travailler a changé. Visualiser les projets, les timelines, les idées en grand format aide mon cerveau TDAH à ne pas perdre le fil.\n\nVous avez aménagé votre espace de travail spécialement pour votre TDAH ?`,
    tags: ['#espace', '#organisation', '#visuel'],
    replies: [
      { email: 'nadia@focusbrain.test', content: 'Designer ici — l\'espace physique EST une extension du cerveau. Sticky notes géantes, tableaux, prints de mes projets partout. Les neurotypiques trouvent ça chaotique, moi c\'est ma clarté.' },
      { email: 'mehdi@focusbrain.test', content: 'Mon bureau a un seul drawer et rien dessus sauf l\'ordi et 1 carnet. Rien d\'autre. La réduction du "bruit visuel" a été aussi importante que les apps pour mon TDAH.' },
      { email: 'salma@focusbrain.test', content: 'Des espaces différents pour des tâches différentes. Bureau = travail concentré, table du salon = travail créatif, café du quartier = calls et admin. Le lieu crée l\'état mental.' },
    ],
  },

  {
    space: 'OUTILS', authorEmail: 'fatima@focusbrain.test',
    title: 'Les minuteries visuelles — indispensables pour le TDAH',
    content: `La notion abstraite du temps est une vraie difficulté du TDAH. "Il reste 30 minutes" ne veut rien dire pour mon cerveau. Mais une minuterie Time Timer qui montre visuellement le temps qui s'écoule : ça c'est concret.\n\nVous utilisez des minuteries visuelles ? Lesquelles ?`,
    tags: ['#temps', '#minuterie', '#outils'],
    replies: [
      { email: 'karim@focusbrain.test', content: 'Time Timer physique sur mon bureau (modèle 8 pouces). Incontournable. L\'app Time Timer existe aussi sur iOS/Android mais le physique a quelque chose de différent.' },
      { email: 'youssef@focusbrain.test', content: 'Clockwise (gratuit sur Mac) colorie ton calendrier et affiche le temps restant de la réunion en cours. Pour les meetings, game changer.' },
      { email: 'zineb@focusbrain.test', content: 'L\'horloge de ma cuisine est grande et visible depuis mon bureau. Simple mais le fait de voir "visuellement" où en est l\'heure aide. Parfois la solution low-tech est la meilleure.' },
    ],
  },

  // ════════════════════════════════════════════════════
  // 💼 TRAVAIL (8 sujets)
  // ════════════════════════════════════════════════════

  {
    space: 'TRAVAIL', authorEmail: 'karim@focusbrain.test',
    title: 'Comment parler de son TDAH à son employeur — mon expérience',
    content: `Diagnostiqué à 35 ans, j'ai décidé d'en parler à mon manager. J'avais peur d'être stigmatisé ou considéré comme "pas fiable".\n\nJ'ai préparé ma conversation en me concentrant sur les SOLUTIONS pas le diagnostic. Résultat : 2 jours de télétravail supplémentaires et un bureau individuel. Voilà comment j'ai fait.`,
    tags: ['#travail', '#employeur', '#aménagement'],
    replies: [
      { email: 'omar@focusbrain.test', content: 'Le cadrage "solutions" est essentiel. "J\'ai besoin de X pour performer mieux" plutôt que "j\'ai le TDAH donc je suis comme ça". Les managers sont sensibles à l\'efficacité, pas aux diagnostics.' },
      { email: 'zineb@focusbrain.test', content: 'Freelance donc pas d\'employeur mais je l\'ai dit à mes clients principaux. Surprise : tous ont été compréhensifs et certains ont même adapté leur façon de me donner les briefs (plus structurés).' },
      { email: 'salma@focusbrain.test', content: 'J\'ai pas osé en parler directement mais j\'ai demandé des aménagements "généraux" : télétravail 3j, réunions avec ordre du jour envoyé à l\'avance, casque autorisé. Tout accordé sans diagnostic à fournir.' },
      { email: 'mehdi@focusbrain.test', content: 'Passer par la médecine du travail est une option moins exposée. Ils font le lien avec les RH et les aménagements peuvent être mis en place sans que tu aies à tout expliquer à ton N+1.' },
    ],
  },

  {
    space: 'TRAVAIL', authorEmail: 'salma@focusbrain.test',
    title: 'Les réunions interminables avec le TDAH — stratégies de survie',
    content: `Les réunions de 2h sans ordre du jour clair sont mon enfer personnel. Mon cerveau décroche à 20 min, je me mets à griffonner, à penser à autre chose, et je rate des informations importantes.\n\nComment vous survivez aux réunions ? Trucs concrets SVP.`,
    tags: ['#réunions', '#travail', '#concentration'],
    replies: [
      { email: 'karim@focusbrain.test', content: '1. Toujours avoir un carnet pour griffonner (ça aide à rester "dans" la réunion). 2. Demander l\'ordre du jour à l\'avance. 3. Prendre des notes actives même inutiles. 4. S\'asseoir près de la porte si ça chauffe.' },
      { email: 'youssef@focusbrain.test', content: 'Je prends des notes en mind map pendant les réunions. Ça me force à écouter activement pour capturer les connexions entre idées. Et j\'ai quelque chose de concret à la fin.' },
      { email: 'fatima@focusbrain.test', content: 'Lorsque c\'est possible, proposer des stand-up meetings de 15 min max. La position debout réduit naturellement la durée. Et inviter seulement les personnes vraiment concernées.' },
      { email: 'nadia@focusbrain.test', content: 'La "règle des 2 pizzas" d\'Amazon — si on ne peut pas nourrir tous les participants avec 2 pizzas, la réunion est trop grande. Réunions plus petites = plus focalisées = mieux pour le TDAH.' },
    ],
  },

  {
    space: 'TRAVAIL', authorEmail: 'omar@focusbrain.test',
    title: 'Open space et TDAH : c\'est une catastrophe — comment vous gérez ?',
    content: `Architecte en agence, j'ai pas le choix que de travailler en open space. C'est un défi constant. La moindre conversation à 5 mètres me sort de ma tâche et il faut 10-15 min pour me "re-focaliser".\n\nComment ceux qui travaillent en open space tiennent le coup ?`,
    tags: ['#open-space', '#bruit', '#travail'],
    replies: [
      { email: 'mehdi@focusbrain.test', content: 'Casque ANC + protocole clair avec l\'équipe : casque sur les deux oreilles = ne pas déranger sauf urgence. Ce code a pris 2 semaines à s\'installer mais maintenant tout le monde le respecte.' },
      { email: 'sara@focusbrain.test', content: 'J\'arrive 30 min avant tout le monde. Ces 30 min de calme absolue sont les plus productives de ma journée. Je fais les tâches les plus importantes avant que le bruit commence.' },
      { email: 'karim@focusbrain.test', content: 'Négocier 1-2j de télétravail par semaine pour les tâches de concentration. En présentiel : réunions et interactions. En remote : travail profond. Cette séparation a changé ma productivité.' },
      { email: 'amine@focusbrain.test', content: 'Plages de "focus time" bloquées dans le calendrier visible de l\'équipe. Pendant ces plages, pas de réunion possible. Demander la même chose pour ses collègues crée une culture de respect mutuel.' },
    ],
  },

  {
    space: 'TRAVAIL', authorEmail: 'fatima@focusbrain.test',
    title: 'Entrepreneurs TDAH — vos superpouvoirs ET vos talons d\'Achille',
    content: `Après 4 ans d'entrepreneuriat avec le TDAH, voilà mon bilan honnête :\n\n✅ SUPERPOUVOIRS : créativité, prise de risque, pivot rapide, passion communicative\n❌ TALONS D'ACHILLE : admin, régularité, suivi clients, paperasse, délais\n\nComment vous avez contourné les points faibles ? Délégation ? Outils ? Associés ?`,
    tags: ['#entrepreneuriat', '#travail', '#forces'],
    replies: [
      { email: 'karim@focusbrain.test', content: 'La clé pour moi : s\'entourer de gens dont les forces compensent mes faiblesses. Mon associée est excellente en admin et suivi. Moi je gère la vision et l\'acquisition. On est complémentaires.' },
      { email: 'nadia@focusbrain.test', content: 'Externaliser tôt et autant que possible. Comptable, assistante virtuelle, community manager. Mon cerveau TDAH crée de la valeur sur ce qu\'il aime. Le reste est délégué.' },
      { email: 'salma@focusbrain.test', content: 'Le batchworking — faire toutes les tâches similaires en une seule session. Admin = 1 demi-journée par semaine, calls clients = uniquement le mardi, création = le matin. Les transitions de mode coûtent cher au TDAH.' },
    ],
  },

  {
    space: 'TRAVAIL', authorEmail: 'mehdi@focusbrain.test',
    title: 'Body doubling en entreprise — comment l\'introduire sans paraître bizarre ?',
    content: `Je veux proposer des sessions de travail silencieux avec mes collègues. Problème : comment expliquer "on travaille ensemble mais en silence, chacun sur son truc" sans avoir l'air chelou ?\n\nVous l'avez fait dans votre entreprise ? Comment vous avez présenté ça ?`,
    tags: ['#body-doubling', '#travail', '#collègues'],
    replies: [
      { email: 'karim@focusbrain.test', content: 'J\'ai lancé un "Café focus" le vendredi matin : 9h-11h, chacun travaille sur ses urgences, silence ou musique à faible volume, pas de réunion. Succès total — les gens ne savent même pas que c\'est du body doubling !' },
      { email: 'fatima@focusbrain.test', content: 'L\'appeler "deep work session" plutôt que body doubling. Le concept de Cal Newport est bien connu et accepté en entreprise. Même résultat, meilleure image.' },
      { email: 'sara@focusbrain.test', content: 'Commencer à 2 personnes. Quand les autres voient ta productivité ce jour-là et que tu leur expliques, ils veulent rejoindre. Pas besoin d\'argumenter, les résultats parlent.' },
    ],
  },

  {
    space: 'TRAVAIL', authorEmail: 'youssef@focusbrain.test',
    title: 'Télétravail et TDAH — avantages réels ET pièges cachés',
    content: `Depuis le covid je suis 100% remote. Au début je pensais que ce serait parfait pour mon TDAH (plus d'open space !). 4 ans plus tard, bilan mitigé.\n\n✅ Avantages : environnement contrôlé, pas de transport, horaires flexibles\n❌ Pièges : isolation, fond du frigo, Netflix, la frontière travail/vie, les tâches ménagères qui "appelent"\n\nVos stratégies pour le remote avec le TDAH ?`,
    tags: ['#télétravail', '#organisation', '#remote'],
    replies: [
      { email: 'mehdi@focusbrain.test', content: '"S\'habiller comme pour aller au bureau" même en remote. Ça semble bête mais ça encode pour ton cerveau que c\'est une journée de travail. Le cerveau TDAH est très sensible aux signaux contextuels.' },
      { email: 'nadia@focusbrain.test', content: 'Horaires fixes et inviolables — même le début et la fin de journée. Sans ces ancres temporelles, le télétravail TDAH peut devenir soit 16h de travail soit 4h d\'oscillation entre boulot et distraction.' },
      { email: 'zineb@focusbrain.test', content: 'Body doubling virtuel via FocusBrain compense en partie l\'isolement. Et espace de travail dédié — ne jamais travailler dans le même endroit où tu regardes des séries. Dissociation physique = dissociation mentale.' },
    ],
  },

  {
    space: 'TRAVAIL', authorEmail: 'omar@focusbrain.test',
    title: 'Changer de carrière à cause du TDAH — ça vaut le coup ?',
    content: `Architecte depuis 10 ans, diagnostiqué TDAH il y a 1 an. Je réalise que mon secteur (délais stricts, admin lourde, clients exigeants) est particulièrement difficile avec mon profil.\n\nJ'envisage de pivoter vers quelque chose de plus créatif et moins structuré. Vous avez changé de voie à cause de votre TDAH ? Les regrets ?`,
    tags: ['#carrière', '#changement', '#travail'],
    replies: [
      { email: 'salma@focusbrain.test', content: 'Passée de prof de maths à écrivaine il y a 3 ans. La meilleure décision de ma vie. Pas à cause du TDAH uniquement mais il a clairement accéléré ma prise de conscience de ce que j\'aimais vraiment faire.' },
      { email: 'fatima@focusbrain.test', content: 'Je dirais : avant de changer de carrière, teste les aménagements (télétravail, horaires flexibles, spécialisation dans ce que tu aimes). Parfois c\'est le format qui est le problème, pas le secteur.' },
      { email: 'karim@focusbrain.test', content: 'Le TDAH peut être un avantage en entrepreneuriat ou en créatif. L\'architecture peut se faire autrement (indépendant, design produit, UX, enseignement). Explorer les branches de son arbre avant de couper le tronc.' },
      { email: 'nadia@focusbrain.test', content: 'J\'ai pivoté du design agence vers freelance. Même métier, format différent. Les règles du jeu changées (je décide de mes horaires et clients) = TDAH nettement mieux géré. Parfois c\'est l\'environnement, pas le métier.' },
    ],
  },

  {
    space: 'TRAVAIL', authorEmail: 'zineb@focusbrain.test',
    title: 'Facturer à l\'heure avec le TDAH — problème de perception du temps',
    content: `Freelance comptable, je facture à l'heure. Problème : avec le TDAH je perds la notion du temps, je sous-estime ce que j'ai fait (timeblindness), je sur-estime ce que je peux faire.\n\nRésultat : je me sous-facture souvent. Des collègues freelances TDAH ont des astuces ?`,
    tags: ['#freelance', '#facturation', '#temps'],
    replies: [
      { email: 'mehdi@focusbrain.test', content: 'Toggl Track — timer automatique que tu actives/désactives par projet. Voir le temps réel vs estimé m\'a choqué au début mais m\'a aidé à recalibrer mes estimations. Indispensable en freelance.' },
      { email: 'nadia@focusbrain.test', content: 'Passer au forfait par projet plutôt qu\'à l\'heure. Moins de stress de tracking, estimation faite à l\'avance avec une marge TDAH intégrée (+30%). Et si je vais vite, je gagne mieux.' },
      { email: 'karim@focusbrain.test', content: 'Tracker le temps pendant 1 mois sans chercher à l\'optimiser. Juste observer. Tu verras tes vraies durées et pourras ajuster tes devis en conséquence. La data réelle bat toujours l\'estimation TDAH.' },
    ],
  },

  // ════════════════════════════════════════════════════
  // 📚 ETUDES (6 sujets)
  // ════════════════════════════════════════════════════

  {
    space: 'ETUDES', authorEmail: 'youssef@focusbrain.test',
    title: 'TDAH et examens — mes stratégies qui m\'ont sauvé en ingénierie',
    content: `Étudiant en master ingénierie, TDAH hyperactif. Les examens écrits en temps limité sont mon pire cauchemar — le stress efface tout ce que je sais.\n\nAprès 5 ans d'essais-erreurs, voilà ce qui marche VRAIMENT pour moi le jour J.`,
    tags: ['#examens', '#études', '#stress'],
    replies: [
      { email: 'sara@focusbrain.test', content: 'Demander le tiers-temps ! Si ton TDAH est reconnu médicalement, tu y as droit dans la plupart des établissements. 30 min supplémentaires = réduction du stress = nettement meilleure performance.' },
      { email: 'mehdi@focusbrain.test', content: 'Technique : commencer par les questions que tu connais (pas dans l\'ordre). Ça met en confiance et évite le freeze TDAH qui peut bloquer 30 min sur une question difficile au début.' },
      { email: 'nadia@focusbrain.test', content: 'La veille : pas de révision intense après 18h. Juste une lecture légère et dormir bien. Le cerveau TDAH a besoin de sommeil de qualité pour performer — les nuits blanches sont contre-productives.' },
      { email: 'amine@focusbrain.test', content: 'Les fiches A5 manuscrites pour réviser (une par concept clé). L\'écriture physique encode mieux que le copier-coller digital pour le cerveau TDAH. Et relire en marchant aide aussi.' },
    ],
  },

  {
    space: 'ETUDES', authorEmail: 'sara@focusbrain.test',
    title: 'Obtenir le tiers-temps à l\'université — le guide pratique',
    content: `J'ai mis 1 an à obtenir mon tiers-temps parce que je ne savais pas comment m'y prendre. Une fois que j'avais le bon parcours, c'était rapide.\n\nVoilà le processus exact (pour la France, adaptable ailleurs).`,
    tags: ['#tiers-temps', '#études', '#droits'],
    replies: [
      { email: 'fatima@focusbrain.test', content: 'Merci pour ce guide ! Au Maroc le système est différent mais les universités ont des services d\'accompagnement étudiant. Prendre rendez-vous avec le service pédagogique en expliquant le TDAH est le premier pas.' },
      { email: 'youssef@focusbrain.test', content: 'Important : le tiers-temps se demande AVANT les examens (souvent en début de semestre). Ne pas attendre d\'être en période d\'examen pour entamer les démarches.' },
      { email: 'zineb@focusbrain.test', content: 'Le médecin universitaire (SIUMPPS en France) est l\'interlocuteur clé. Il centralise les certificats et fait le lien avec l\'administration sans que tu aies à tout expliquer partout.' },
    ],
  },

  {
    space: 'ETUDES', authorEmail: 'nadia@focusbrain.test',
    title: 'Prendre des notes efficacement avec le TDAH — mes méthodes',
    content: `Je n'arrivais pas à écouter ET écrire en même temps. Mon attention allait soit à l'un soit à l'autre. J'ai testé plusieurs méthodes et en ai adapté une hybride qui marche pour mon TDAH.\n\nMon système actuel : méthode Cornell + codes couleur + enregistrement audio de sauvegarde.`,
    tags: ['#notes', '#études', '#méthode'],
    replies: [
      { email: 'youssef@focusbrain.test', content: 'L\'enregistrement audio est sous-estimé. Je n\'ai plus l\'anxiété de "rater quelque chose" donc je peux me concentrer sur l\'écoute active. Les notes deviennent des mots-clés plutôt que des phrases complètes.' },
      { email: 'mehdi@focusbrain.test', content: 'Notion avec template de cours : espace titre/date, concepts clés, exemples, questions à poser, résumé 3 points max. Pré-structurer le template avant le cours libère le cerveau pendant le cours.' },
      { email: 'sara@focusbrain.test', content: 'Les stylos de 4 couleurs : bleu = info principale, rouge = important, vert = exemple, noir = à chercher. Le code couleur fait le tri automatiquement pendant la prise de notes.' },
    ],
  },

  {
    space: 'ETUDES', authorEmail: 'mehdi@focusbrain.test',
    title: 'La procrastination des devoirs — mon pire ennemi pendant les études',
    content: `Je pouvais avoir un devoir à rendre dans 3 semaines et ne commencer que la nuit d'avant. Stress, mauvaise qualité, honte. Et le cycle recommençait.\n\nJ'ai finalement trouvé un système qui a réduit ma procrastination de 80%. Mais ça a pris du temps.`,
    tags: ['#procrastination', '#études', '#devoirs'],
    replies: [
      { email: 'zineb@focusbrain.test', content: 'Le "démarrage forcé" : 10 min par jour sur le devoir dès J+1 après la remise. Même si c\'est nul. Juste ouvrir le document et écrire quelque chose. L\'inertie est brisée et souvent 10 min deviennent 40 min.' },
      { email: 'nadia@focusbrain.test', content: 'Body doubling pour les devoirs : planifier une session FocusBrain spécifiquement "devoir de X". L\'accountability légère d\'une autre personne présente change tout pour le démarrage.' },
      { email: 'amine@focusbrain.test', content: 'Reverse deadline : calculer à rebours depuis la date de remise. "Pour rendre vendredi, je dois avoir la structure mercredi, la recherche lundi". Les sous-délais concrets remplacent la date lointaine abstraite.' },
    ],
  },

  {
    space: 'ETUDES', authorEmail: 'zineb@focusbrain.test',
    title: 'TDAH et lecture — comment lire sans perdre le fil toutes les 2 lignes',
    content: `Je relis la même phrase 4-5 fois sans la comprendre. Je finis une page et réalise que je n'ai retenu aucun mot. Je m'endors en lisant des textes académiques.\n\nLa lecture est une torture avec le TDAH inattentif. Vos astuces ?`,
    tags: ['#lecture', '#études', '#concentration'],
    replies: [
      { email: 'sara@focusbrain.test', content: 'Lire à voix haute ou murmurer le texte. L\'engagement vocal ajoute un canal sensoriel qui aide à rester focalisé. En public j\'utilise les lèvres seulement — ça suffit pour l\'effet.' },
      { email: 'youssef@focusbrain.test', content: 'Le doigt ou un crayon comme guide de lecture. Ce point de focus physique force les yeux à suivre et réduit les relectures. Technique apprise en orthophonie pour la dyslexie mais très efficace TDAH.' },
      { email: 'fatima@focusbrain.test', content: 'Lire en 2 passes : 1ère passe rapide (titre, sous-titres, premiers mots de chaque para) pour le contexte global. 2ème passe détaillée. La structure connue aide l\'attention à se poser.' },
      { email: 'mehdi@focusbrain.test', content: 'Text-to-speech ! Faire lire le texte à voix haute par l\'ordi (Balabolka, NaturalReader) en suivant des yeux. Multi-sensoriel = meilleure rétention pour le TDAH.' },
    ],
  },

  {
    space: 'ETUDES', authorEmail: 'amine@focusbrain.test',
    title: 'Adulte et reprise d\'études avec le TDAH — votre expérience',
    content: `J'ai 32 ans et je veux reprendre des études en formation continue tout en travaillant. Je suis diagnostiqué TDAH depuis 1 an. Comment vous gérez la double charge travail+études avec le TDAH ?`,
    tags: ['#études', '#adulte', '#formation'],
    replies: [
      { email: 'omar@focusbrain.test', content: 'Fait une formation archi complémentaire à 34 ans. Les clés : un seul cours à la fois (pas 3 en parallèle), le week-end pour les études pas le soir après le boulot, et communiquer avec les formateurs dès le début sur le TDAH.' },
      { email: 'karim@focusbrain.test', content: 'Choisir une formation courte (< 6 mois) pour commencer. Le TDAH a du mal avec les projets très longs. Succès rapide = dopamine = motivation pour continuer. Escalier plutôt que montagne.' },
      { email: 'zineb@focusbrain.test', content: 'Les formations online sont mieux pour moi — pause, retour en arrière, vitesse x1.5. Mais l\'isolement est un vrai risque. Trouver une communauté d\'apprenants compense.' },
    ],
  },

  // ════════════════════════════════════════════════════
  // 💜 VIE_PERSO (8 sujets)
  // ════════════════════════════════════════════════════

  {
    space: 'VIE_PERSO', authorEmail: 'fatima@focusbrain.test',
    title: 'TDAH et relations amoureuses — comment expliquer sans se justifier',
    content: `Mon partenaire est neurotypique. Il ne comprend pas toujours mes sautes d'humeur, mon hyperfocus soudain qui l'exclut, mes oublis de choses importantes pour lui.\n\nOn a eu des crises, des larmes. Mais on a aussi trouvé des façons de mieux communiquer. Je partage ce qui nous a aidés.`,
    tags: ['#relations', '#couple', '#communication'],
    replies: [
      { email: 'nadia@focusbrain.test', content: 'Le livre "Le TDAH chez l\'adulte" de Nadeau + le livre pour les proches. On l\'a lu ensemble mon partenaire et moi. Ça a ouvert des conversations qu\'on n\'aurait pas pu avoir sans ce tiers neutre.' },
      { email: 'salma@focusbrain.test', content: 'Faire une "liste d\'utilisateur" ensemble : mes besoins (calme avant de répondre, pas d\'interruption en plein hyperfocus), ses besoins (confirmation que j\'écoute, pas d\'oublis des anniversaires). Ça dédramatise.' },
      { email: 'zineb@focusbrain.test', content: 'La thérapie de couple avec un psy qui connaît le TDAH est différente d\'une thérapie classique. Il explique les mécanismes neurologiques et le partenaire comprend que c\'est pas "de la mauvaise volonté".' },
      { email: 'karim@focusbrain.test', content: 'Humour partagé sur le TDAH. "Encore le mode TDAH !" dit avec affection plutôt que frustration. Ça dépend de la relation bien sûr mais déstigmatiser en famille change l\'atmosphère.' },
    ],
  },

  {
    space: 'VIE_PERSO', authorEmail: 'omar@focusbrain.test',
    title: 'Diagnostic TDAH adulte à 38 ans — le séisme émotionnel',
    content: `Diagnostiqué il y a 3 mois. 38 ans. J'ai pleuré 2 heures de soulagement puis 2 heures de deuil pour toutes les années perdues à me croire "flemmard", "pas assez bon", "bizarre".\n\nBulletins scolaires "n'utilise pas son potentiel". Jobs perdus. Amitiés abîmées. Tout prenait sens en une consultation.\n\nVous avez vécu ça ?`,
    tags: ['#diagnostic', '#adulte', '#émotions'],
    replies: [
      { email: 'sara@focusbrain.test', content: 'Diagnostiquée à 31 ans. Ce mélange de soulagement et deuil est quasi-universel chez les adultes diagnostiqués tardivement. Tu n\'es pas seul. Bienvenue dans la communauté — on comprend 💜' },
      { email: 'fatima@focusbrain.test', content: 'La phase de "relecture de vie" après le diagnostic est intense. Soudain on voit ses échecs différemment. Certains trouvent une colère (pourquoi si tard ?), d\'autres un soulagement pur. Les deux sont valides.' },
      { email: 'youssef@focusbrain.test', content: 'Ce que j\'ai réalisé après mon diagnostic : je n\'avais pas échoué malgré des efforts, j\'avais réussi MALGRÉ un handicap non détecté. Cette relecture a changé mon regard sur moi-même.' },
      { email: 'zineb@focusbrain.test', content: 'Le deuil des années "perdues" est réel et il faut le traverser, pas l\'ignorer. Thérapie post-diagnostic fortement recommandée — pas pour le TDAH mais pour retravailler l\'estime de soi.' },
      { email: 'nadia@focusbrain.test', content: 'Après le diagnostic : prendre le temps de se documenter avec des sources sérieuses. Éviter les rabbit holes YouTube anxiogènes. Psychiatre + psychologue spécialisés TDAH = le duo idéal.' },
    ],
  },

  {
    space: 'VIE_PERSO', authorEmail: 'salma@focusbrain.test',
    title: 'TDAH et sommeil — la galère du soir qui n\'en finit pas',
    content: `Le soir : incapable de m'arrêter. Le "second wind" TDAH qui arrive à 22h quand je commence à avoir plein d'idées. Je me couche à 1h, je dors mal, je me lève épuisée, et la journée commence déjà en négatif.\n\nVous avez trouvé comment "éteindre" votre cerveau TDAH le soir ?`,
    tags: ['#sommeil', '#routine', '#vie-perso'],
    replies: [
      { email: 'fatima@focusbrain.test', content: 'Yoga nidra ou méditation guidée 20 min au lit. Pas de méditation classique (mon cerveau s\'emballe) mais guidée avec voix = mon cerveau suit la voix au lieu de partir dans ses pensées.' },
      { email: 'mehdi@focusbrain.test', content: 'Pas d\'écrans 1h avant le lit — vraie règle physique (téléphone hors chambre). Lire un vrai livre physique à la place. La lumière bleue + stimulation des écrans activent exactement le mode "second wind".' },
      { email: 'sara@focusbrain.test', content: '"Brain dump" du soir : écrire pendant 10 min tout ce qui est dans ma tête (tâches de demain, idées, inquiétudes) pour vider le tampon. Le cerveau "lâche" plus facilement quand il sait que c\'est écrit quelque part.' },
      { email: 'karim@focusbrain.test', content: 'Température de la chambre : 18-19°C. Masque de sommeil. Bouchons d\'oreilles. Créer les conditions physiques idéales du sommeil aide le cerveau TDAH à "accepter" de s\'éteindre.' },
    ],
  },

  {
    space: 'VIE_PERSO', authorEmail: 'nadia@focusbrain.test',
    title: 'Expliquer le TDAH à sa famille — les phrases qui marchent',
    content: `"T'as juste besoin de te concentrer plus." "C'est une question de volonté." "On avait pas le TDAH de notre temps et on s'en sortait très bien."\n\nComment vous avez expliqué le TDAH à vos parents, frères/sœurs, belle-famille ? Quelles métaphores ou explications ont vraiment fait tilter quelqu'un ?`,
    tags: ['#famille', '#explication', '#relations'],
    replies: [
      { email: 'fatima@focusbrain.test', content: 'Métaphore que j\'utilise : "Mon cerveau est une télé qui capte 200 chaînes en même temps et qui change de chaîne toutes les 30 secondes. Les médicaments/stratégies m\'aident à tenir sur une chaîne plus longtemps."' },
      { email: 'zineb@focusbrain.test', content: 'Faire regarder un TEDx sur le TDAH plutôt qu\'expliquer moi-même. "Imagine ton cerveau" de Jessica McCabe (How to ADHD sur YouTube) est parfait pour les proches. L\'animateur non-TDAH vulgarise mieux que moi sous pression.' },
      { email: 'amine@focusbrain.test', content: 'La métaphore du freins : "Tout le monde a une voiture (cerveau). Mon accélérateur est plus puissant que la moyenne, mais mes freins (inhibition, contrôle) sont moins efficaces. Je ne vais pas plus vite par plaisir."' },
      { email: 'salma@focusbrain.test', content: 'J\'ai invité ma mère à regarder une vidéo de brain scan TDAH vs non-TDAH. Voir des images concrètes d\'activité cérébrale différente a été plus parlant que toutes mes explications. Le visuel gagne.' },
    ],
  },

  {
    space: 'VIE_PERSO', authorEmail: 'zineb@focusbrain.test',
    title: 'Anxiété + TDAH : le duo qui épuise',
    content: `Mon TDAH vient avec une anxiété permanente qui est épuisante. Anxiété d'avoir oublié quelque chose, d'être en retard, de décevoir, de ne pas être à la hauteur.\n\nOn dit que 50% des adultes TDAH ont aussi un trouble anxieux. Comment vous gérez les deux ensemble ? Médication TDAH + anxiolytique ? Thérapie spécifique ?`,
    tags: ['#anxiété', '#comorbidité', '#santé-mentale'],
    replies: [
      { email: 'sara@focusbrain.test', content: 'Ma psychiatre m\'a expliqué que souvent l\'anxiété TDAH diminue quand le TDAH est mieux géré (médication + stratégies). La source de l\'anxiété = les conséquences du TDAH non traité. Traiter l\'un traite l\'autre.' },
      { email: 'fatima@focusbrain.test', content: 'TCC (Thérapie Cognitive Comportementale) spécialisée TDAH + anxiété. Les deux se travaillent ensemble. Eviter les anxiolytiques benzos qui peuvent aggraver les déficits attentionnels.' },
      { email: 'nadia@focusbrain.test', content: 'L\'exercice physique régulier (même 20 min de marche) est aussi efficace qu\'un anxiolytique léger selon certaines études. Et sans les effets secondaires. Je mets du sport dans mon agenda comme un RDV médical.' },
      { email: 'mehdi@focusbrain.test', content: 'Identifier ses "triggers" d\'anxiété TDAH spécifiques. Pour moi : les deadlines floues, les tâches sans sous-étapes, les emails restés sans réponse. Les clarifier en amont prévient 80% de mon anxiété.' },
    ],
  },

  {
    space: 'VIE_PERSO', authorEmail: 'amine@focusbrain.test',
    title: 'Sport et TDAH — le meilleur "médicament naturel" ?',
    content: `Coach sportif avec TDAH hyperactif ici. Je mesure l'impact du sport sur mon TDAH depuis 5 ans. Le bilan est clair : les jours où je fais du sport, je suis une autre personne.\n\nLes types de sport et intensités qui fonctionnent le mieux pour le cerveau TDAH selon mon expérience et les recherches.`,
    tags: ['#sport', '#dopamine', '#bien-être'],
    replies: [
      { email: 'youssef@focusbrain.test', content: 'Les sports de combat (judo, boxe) sont particulièrement efficaces pour le TDAH car ils exigent une attention totale et multi-sensorielle : on ne peut PAS être distrait en faisant du sparring 😄' },
      { email: 'karim@focusbrain.test', content: 'La course à pied "sauvage" (trail, chemins variés) vs tapis de course : différence énorme. La variété de terrain maintient l\'attention et évite l\'ennui qui frappe vite sur tapis.' },
      { email: 'fatima@focusbrain.test', content: 'Yoga = parfait pour TDAH inattentif (attention sur le corps, respiration, séquences). Boxe/CrossFit = parfait pour TDAH hyperactif (dépense énergie, stimulation haute). Connaître son profil pour choisir.' },
      { email: 'sara@focusbrain.test', content: 'Le timing est clé : sport le matin avant le travail amplifie l\'effet médicament. Sport le soir peut retarder le sommeil pour les hyperactifs. Tester et noter ses observations.' },
    ],
  },

  {
    space: 'VIE_PERSO', authorEmail: 'karim@focusbrain.test',
    title: 'TDAH et argent — comment j\'ai arrêté de saborder mes finances',
    content: `Achats impulsifs, abonnements oubliés, factures en retard, investissements irréfléchis sur un coup d'enthousiasme... Le TDAH et les finances c'est une combinaison dangereuse.\n\nAprès 2 ans de travail, mes finances sont enfin stables. Voilà ce qui a changé.`,
    tags: ['#finances', '#organisation', '#impulsivité'],
    replies: [
      { email: 'zineb@focusbrain.test', content: 'Comptable spécialisée ici. Mes conseils pour TDAH : virements automatiques épargne dès réception du salaire (avant de pouvoir le dépenser), enveloppes virtuelles (budgets par catégorie dans N26 ou Qonto), alerte SMS chaque dépense.' },
      { email: 'nadia@focusbrain.test', content: '"Délai de 48h" pour tout achat non-prévu > 50€. Mettre dans le panier, attendre 48h. 80% du temps l\'envie est passée. La règle a économisé des centaines d\'euros par mois chez moi.' },
      { email: 'omar@focusbrain.test', content: 'Application YNAB (You Need A Budget) adaptée au TDAH. Elle oblige à "donner un job" à chaque euro. Plus de vague — tu sais exactement où va chaque centime. Cela a mis fin à mes surprises en fin de mois.' },
      { email: 'salma@focusbrain.test', content: 'Couper les achats impulsifs en ligne : supprimer les CB enregistrées sur Amazon/sites shopping. Saisir le numéro manuellement = friction = souvent on abandonne. Simple mais radical.' },
    ],
  },

  {
    space: 'VIE_PERSO', authorEmail: 'sara@focusbrain.test',
    title: 'Se faire des amis avec le TDAH adulte — l\'isolement silencieux',
    content: `Je suis extravertie et j'aime les gens. Mais je suis aussi celle qui oublie de rappeler, qui annule au dernier moment parce que l'anxiété sociale explose, qui n'écoute pas assez en entretien parce que mon cerveau part ailleurs.\n\nRésultat : des amitiés qui s'effritent lentement. Comment vous construisez et maintenez des amis avec le TDAH ?`,
    tags: ['#amitié', '#relations', '#isolement'],
    replies: [
      { email: 'amine@focusbrain.test', content: 'La communauté TDAH comme famille de choix. Ici on se comprend sans tout expliquer. FocusBrain a créé des vraies connexions pour moi — les sessions de body doubling évoluent souvent en amitié réelle.' },
      { email: 'fatima@focusbrain.test', content: '"Habits sociales" : mettre des rappels récurrents pour contacter les amis importants. "Appeler X ce dimanche" dans le calendrier. Ça semble mécaniser l\'amitié mais ça préserve des relations que sinon je perdrais.' },
      { email: 'mehdi@focusbrain.test', content: 'Les activités régulières (sport en groupe, club, association) créent de la proximité sans effort social conscient. On "accumule" du temps partagé naturellement sans avoir à planifier.' },
      { email: 'salma@focusbrain.test', content: 'Être honnête tôt : "J\'ai le TDAH, je peux oublier de répondre mais ce n\'est pas que je m\'en fous de toi. N\'hésite pas à me relancer." Les amis qui acceptent ça sont ceux qui restent.' },
    ],
  },
];

async function main() {
  console.log('🌐 Seeding forum TDAH — 53 sujets réels...\n');

  // Récupérer tous les utilisateurs de test
  const userMap: Record<string, string> = {};
  const emails = FORUM_DATA.flatMap(p => [p.authorEmail, ...p.replies.map(r => r.email)]);
  const uniqueEmails = [...new Set(emails)];

  for (const email of uniqueEmails) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) userMap[email] = user.id;
  }

  let postCount = 0;
  let replyCount = 0;

  for (const post of FORUM_DATA) {
    const authorId = userMap[post.authorEmail];
    if (!authorId) { console.log(`  ⚠️ Auteur introuvable: ${post.authorEmail}`); continue; }

    // Vérifier si le post existe déjà
    const existing = await prisma.forumPost.findFirst({
      where: { userId: authorId, title: post.title },
    });
    if (existing) {
      console.log(`  ⏩ Existe déjà: "${post.title.slice(0, 50)}"`);
      continue;
    }

    const reactions: Record<string, number> = {
      '❤️': Math.floor(Math.random() * 20) + 2,
      '💪': Math.floor(Math.random() * 12) + 1,
      '🧠': Math.floor(Math.random() * 10) + 1,
    };
    if (Math.random() > 0.5) reactions['✨'] = Math.floor(Math.random() * 8) + 1;
    if (Math.random() > 0.6) reactions['🤝'] = Math.floor(Math.random() * 6) + 1;

    const createdPost = await prisma.forumPost.create({
      data: {
        spaceId: post.space as any,
        userId: authorId,
        title: post.title,
        content: post.content,
        tags: post.tags,
        emojiReactions: reactions,
        isPinned: Math.random() > 0.85,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000),
      },
    });
    postCount++;

    // Créer les réponses
    for (const reply of post.replies) {
      const replyAuthorId = userMap[reply.email];
      if (!replyAuthorId) continue;

      const replyReactions: Record<string, number> = {
        '❤️': Math.floor(Math.random() * 8) + 1,
      };
      if (Math.random() > 0.5) replyReactions['💪'] = Math.floor(Math.random() * 5) + 1;

      await prisma.forumPost.create({
        data: {
          spaceId: post.space as any,
          userId: replyAuthorId,
          title: '',
          content: reply.content,
          tags: [],
          parentId: createdPost.id,
          emojiReactions: replyReactions,
          createdAt: new Date(Date.now() - Math.random() * 20 * 24 * 3600 * 1000),
        },
      });
      replyCount++;
    }

    process.stdout.write(`  ✅ [${post.space.slice(0,10)}] ${post.title.slice(0, 55)}\n`);
  }

  console.log(`
╔══════════════════════════════════════════════╗
║  🎉 Forum TDAH seedé avec succès !           ║
╠══════════════════════════════════════════════╣
║  📝 ${postCount} posts créés                         ║
║  💬 ${replyCount} réponses créées                     ║
║  🌐 6 espaces couverts                       ║
║  🏷️  Tags TDAH sur chaque post              ║
╚══════════════════════════════════════════════╝
  `);
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
