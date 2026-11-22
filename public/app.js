(function () {
  const cfg = window.FAUCET_CONFIG;
  const TK = cfg.TOKEN;
  // Langues : choix memorise, sinon langue du navigateur, sinon anglais.
  const LANGS = { en: ["English", "en-US"], fr: ["Français", "fr-FR"], es: ["Español", "es-ES"], pt: ["Português", "pt-BR"], id: ["Indonesia", "id-ID"], ru: ["Русский", "ru-RU"], tr: ["Türkçe", "tr-TR"] };
  const lang = (() => {
    let saved = null;
    try { saved = localStorage.getItem("cc.lang"); } catch { /* navigation privee */ }
    if (saved && LANGS[saved]) return saved;
    for (const l of navigator.languages || [navigator.language || ""]) {
      const c = String(l).slice(0, 2).toLowerCase();
      if (LANGS[c]) return c;
    }
    return "en";
  })();
  const FR = lang === "fr";
  const LOCALE = LANGS[lang][1];
  const L = (window.FAUCET_I18N || {})[lang] || {};
  // Texte d'une paire [francais, anglais], traduit si la langue choisie a la cle.
  const tr = (pair, key) => (FR ? pair[0] : L[key] ?? pair[1]);
  document.documentElement.lang = lang;
  document.title = cfg.SITE_NAME;

  // Textes : [francais, anglais]
  const W = {
    gateSub: ["Minage virtuel de sats, retraits sur FaucetPay", "Virtual sats mining, withdrawals to FaucetPay"],
    fpField: ["Ton e-mail, pseudo ou adresse FaucetPay", "Your FaucetPay email, username or address"],
    enter: ["Entrer et jouer", "Enter and play"],
    passwordShort: ["Mot de passe", "Password"],
    passwordAsk: ["Ce compte est protégé par un mot de passe.", "This account is protected by a password."],
    noFp: ["Pas de compte FaucetPay ?", "No FaucetPay account?"], createFp: ["Créer un compte gratuit", "Create a free account"],
    chipInstant: ["Retrait instantané", "Instant withdrawal"], chipFree: ["100 % gratuit", "100% free"], chipJackpot: ["Jackpot", "Jackpot"],
    home: ["Accueil", "Home"], earn: ["Gagner", "Earn"], games: ["Jeux", "Games"], wallet: ["Portefeuille", "Wallet"], profile: ["Profil", "Profile"],
    balance: ["Solde", "Balance"], claims: ["Tirages", "Rolls"], streak: ["Série", "Streak"], level: ["Niveau", "Level"],
    days: ["jours", "days"], today: ["aujourd'hui", "today"], toNext: ["avant le niveau", "to level"],
    payout: ["Table des gains", "Payout table"], jackpot: ["Jackpot", "Jackpot"],
    roll: ["Tirage", "Roll"], rollBtn: ["Lancer le tirage", "Roll now"], next: ["Prochain tirage dans", "Next roll in"],
    rolling: ["Tirage en cours…", "Rolling…"], closed: ["Faucet fermé", "Faucet closed"],
    won: ["gagnés !", "won!"], free: ["Gratuit, sans mise. Fais 99 999 et tu décroches le jackpot !", "Free, no stake. Hit 99,999 to win the jackpot!"],
    rollHead: ["Tente ta chance !", "Try your luck!"], lastWins: ["Derniers gains", "Latest wins"],
    streakLbl: ["jours de suite", "day streak"], energyLbl: ["énergie", "energy"], prizes: ["Les gains", "Prizes"],
    ptc: ["PTC", "PTC"], links: ["Shortlinks", "Shortlinks"], offers: ["Offres", "Offers"],
    pendingNote: ["Ces gains sont vérifiés, puis partent seuls sur FaucetPay au paiement de chaque heure.", "These earnings are reviewed, then sent to FaucetPay automatically every hour."],
    pickTask: ["Choisis une tâche", "Pick a task"], ptcShort: ["Regarde une pub quelques secondes.", "Watch an ad for a few seconds."],
    linksShort: ["Passe un lien raccourci jusqu’au bout.", "Go through a short link."],
    offersShort: ["Jeux, applis, inscriptions : les plus gros gains.", "Games, apps, sign-ups: the biggest rewards."],
    availableN: ["dispo", "available"], noneNow: ["Rien pour l’instant", "Nothing right now"], walls: ["réseaux", "networks"], wall1: ["réseau", "network"],
    nextPayout: ["Prochain paiement", "Next payout"],
    ptcHow: ["Ouvre la pub, laisse-la ouverte jusqu’à la fin du compteur, puis valide.", "Open the ad, keep it open until the timer ends, then confirm."],
    linksHow: ["Valide le captcha, ouvre un lien et va jusqu’au bout : tu reviens ici crédité.", "Complete the captcha, open a link and go to the end: you come back here credited."],
    offersHow: ["Choisis un réseau. Une offre terminée est créditée dès que le réseau la confirme.", "Pick a network. A completed offer is credited as soon as the network confirms it."],
    wallHint: ["Les gains arrivent dans « À valider ».", "Earnings show under “Under review”."],
    oneAtATime: ["Une pub à la fois.", "One ad at a time."], comeBack: ["Reviens demain", "Come back tomorrow"], doneToday: ["Fait", "Done"],
    surveys: ["Sondages", "Surveys"], surveysShort: ["Donne ton avis : chaque sondage rapporte gros.", "Share your opinion: every survey pays well."],
    surveysHow: ["Choisis un réseau de sondages. Un sondage terminé est crédité dès que le réseau le confirme.", "Pick a survey network. A finished survey is credited as soon as the network confirms it."],
    noSurveys: ["Aucun sondage pour le moment. Reviens plus tard.", "No surveys right now. Come back later."],
    go: ["Y aller", "Go"], claimQuest: ["Récupérer", "Claim"],
    q_claims: [["Fais {n} tirage", "Fais {n} tirages"], ["Make {n} roll", "Make {n} rolls"]],
    q_earned: [["Gagne {n}", "Gagne {n}"], ["Earn {n}", "Earn {n}"]],
    q_ptc: [["Regarde {n} pub", "Regarde {n} pubs"], ["Watch {n} ad", "Watch {n} ads"]],
    q_links: [["Passe {n} lien", "Passe {n} liens"], ["Complete {n} link", "Complete {n} links"]],
    q_surveys: [["Termine {n} sondage", "Termine {n} sondages"], ["Complete {n} survey", "Complete {n} surveys"]],
    q_offers: [["Termine {n} offre", "Termine {n} offres"], ["Complete {n} offer", "Complete {n} offers"]],
    unitPick: ["Afficher les montants en", "Show amounts in"], lvlShort: ["Niv.", "Lv."], shop: ["Boutique", "Shop"], shopText: ["Dépense tes Coins : bonus, VIP, pub et objets de style.", "Spend your Coins: boosts, VIP, ads and style items."],
    bonuses: ["Bonus", "Boosts"], boostName: ["Boost", "Boost"],
    boostText: ["En plus sur les pubs, liens, offres, sondages, le bonus quotidien et les quêtes, pendant", "Extra on ads, links, offers, surveys, the daily bonus and quests, for"],
    activeFor: ["Actif encore", "Active for"], extend: ["Prolonger", "Extend"], details: ["Voir le détail", "See details"],
    adCoinsText: ["Paie ta campagne avec tes Coins.", "Pay for your campaign with your Coins."],
    frames: ["Cadres d’avatar", "Avatar frames"], colors: ["Couleur du pseudo", "Name color"], titles: ["Titres", "Titles"],
    equip: ["Porter", "Wear"], unequip: ["Retirer", "Remove"], confirmBuy: ["Confirmer", "Confirm"], bought: ["Acheté !", "Bought!"],
    shopFair: ["Tout est à effet connu d’avance : aucun achat ne donne de tirage, de tour de roue ou de chance en plus.", "Every item has a known effect: nothing here buys extra rolls, spins or winning chances."],
    shopTile: ["Boutique", "Shop"], shopTileText: ["Boosts, VIP, pub et objets de style avec tes Coins.", "Boosts, VIP, ads and style items with your Coins."],
    payCoins: ["Payer en Coins", "Pay with Coins"],
    tourney: ["Tournoi de la semaine", "Weekly tournament"], endsIn: ["Fin dans", "Ends in"], d: ["j", "d"], you: ["Toi", "You"],
    tourneyEmpty: ["Personne n’a encore marqué de points cette semaine. Fais un tirage pour prendre la tête !", "Nobody has scored yet this week. Make a roll to take the lead!"],
    tourneyText: ["Gratuit : chaque Coin gagné cette semaine compte (tirages, jeux, tâches, parrainage ; pas les quêtes). Les", "Free: every Coin earned this week counts (rolls, games, tasks, referrals; not quests). The top"],
    tourneyText2: ["premiers sont payés lundi matin.", "players are paid on Monday morning."],
    // Minage virtuel
    faucet: ["Minage", "Mining"], sessions: ["Sessions", "Sessions"], kindBase: ["Session de base", "Base session"],
    miningStart: ["Lancer le minage", "Start mining"], miningStarted: ["Minage lancé :", "Mining started:"], miningPower: ["puissance", "power"],
    miningNow: ["Miné en ce moment", "Mining right now"], miningBoost: ["Booste ta puissance", "Boost your power"], adsHourLeft: ["pubs dispo cette heure", "ads left this hour"],
    miningBaseText: ["Lance ta session : elle mine pendant 8 h, puis tu la relances. Chaque pub regardée ouvre une session en plus.", "Start your session: it mines for 8 h, then you restart it. Every ad you watch opens an extra session."],
    miningFair: ["Minage virtuel financé par la publicité : aucun matériel, rien à acheter. La puissance ne s'achète pas, elle se gagne.", "Virtual mining funded by ads: no hardware, nothing to buy. Power can't be bought, only earned."],
    miningRunning: ["Session en cours", "Session running"], miningGo: ["Lance ta session de 8 h", "Start your 8 h session"],
    sessionOpened: ["Nouvelle session :", "New session:"], sessionsActive: ["Sessions en cours", "Active sessions"], sessionsDone: ["Terminées (24 h)", "Finished (24 h)"],
    noSessions: ["Aucune session en cours.", "No active session."], noSessionsDone: ["Rien de terminé ces dernières 24 h.", "Nothing finished in the last 24 h."],
    sessionsNote: ["La session de base est versée dans ton solde ; celles des pubs passent par « À valider », puis partent seules.", "The base session goes to your balance; ad sessions go through “Under review”, then are paid automatically."],
    simMining: ["Sessions de base par jour", "Base sessions per day"], simVideo: ["Vidéos par jour", "Videos per day"],
    // Tirage en 2 etapes, paiement automatique
    collectBtn: ["Récupérer mon gain", "Collect my prize"], revealIn: ["Ton gain dans", "Your prize in"], revealNow: ["Ton gain t'attend !", "Your prize is ready!"],
    autoPay: ["Paiement automatique : dès que ton solde atteint", "Automatic payout: as soon as your balance reaches"],
    autoPay2: ["il part tout seul sur FaucetPay, à chaque heure.", "it goes to FaucetPay on its own, every hour."],
    autoLeft: ["avant ton prochain paiement", "before your next payout"], autoSoon: ["Prêt : il part au prochain paiement horaire.", "Ready: it goes out with the next hourly payout."],
    // Energie, chat, Watch Ads, retrait minimum
    energyIn: ["dans", "in"], energyFull: ["Réserve pleine", "Full"], noEnergy: ["Plus d'énergie", "Out of energy"],
    energyHelp: ["1 énergie toutes les 20 minutes. Chaque tirage en consomme une.", "1 energy every 20 minutes. Each roll uses one."],
    wdMin: ["Retrait minimum :", "Minimum withdrawal:"],
    chat: ["Chat", "Chat"], menuCommunity: ["Communauté", "Community"], chatPlaceholder: ["Écris un message…", "Write a message…"],
    chatEmpty: ["Personne n'a encore écrit. Lance la discussion !", "Nobody has written yet. Start the chat!"],
    chatRulesShort: ["Respect, pas de liens", "Be nice, no links"],
    chatRules: ["Sois respectueux. Les liens, la pub et les contenus choquants sont bloqués automatiquement ; 3 messages bloqués = 30 minutes sans chat.", "Be respectful. Links, ads and shocking content are blocked automatically; 3 blocked messages = 30 minutes without chat."],
    watchAds: ["Watch Ads", "Watch Ads"], watchShort: ["Regarde une courte vidéo, valide la vue.", "Watch a short video, confirm the view."],
    watchText: ["Une vidéo, un captcha, et tu es crédité.", "One video, one captcha, and you're credited."],
    watchLeft: ["vidéos restantes aujourd'hui", "videos left today"], perView: ["par vue", "per view"], perViewShort: ["vue", "view"], perDay: ["par jour", "per day"],
    watchNone: ["Aucune vidéo pour le moment. Reviens plus tard.", "No videos right now. Come back later."],
    watchGo: ["Regarder une vidéo", "Watch a video"], watchNext: ["Prochaine vidéo dans", "Next video in"],
    watchHow: ["Laisse la vidéo jusqu'au bout, page visible : le compteur s'arrête si tu changes d'onglet. Les gains sont vérifiés puis payés avec les autres tâches.", "Let the video play to the end with the page visible: the timer stops if you switch tabs. Earnings are reviewed and paid with the other tasks."],
    watchStay: ["Reste sur la page", "Stay on the page"], watchValidate: ["Valider la vue", "Confirm view"],
    // Refonte
    dashboard: ["Tableau de bord", "Dashboard"], menuEarn: ["Gagner", "Earn"], menuGames: ["Jeux", "Games"],
    menuRewards: ["Récompenses", "Rewards"], menuShop: ["Boutique et VIP", "Shop and VIP"], menuWallet: ["Argent", "Money"], menuAccount: ["Compte", "Account"],
    achievements: ["Succès", "Achievements"], promo: ["Codes promo", "Promo codes"], support: ["Support", "Support"], faq: ["FAQ", "FAQ"], proofs: ["Preuves de paiement", "Payment proofs"],
    close: ["Fermer", "Close"], liveFeed: ["En direct", "Live"], withdrawal1: ["Retrait", "Withdrawal"], noActivity: ["Les premiers gains arrivent bientôt.", "First earnings coming soon."],
    rewardsShort: ["Récompenses", "Rewards"], more: ["Plus", "More"], menu: ["Menu", "Menu"],
    nextActions: ["À faire maintenant", "Up next"], readyNow: ["Prêt !", "Ready!"], toCollect: ["à récupérer", "to collect"], seeAll: ["Tout voir", "See all"],
    rwQuests: ["Objectifs du jour et de la semaine.", "Daily and weekly goals."], rwAch: ["Des badges permanents, chacun avec sa prime.", "Permanent badges, each with a bonus."],
    rwTourney: ["Classement gratuit, prix chaque lundi.", "Free leaderboard, prizes every Monday."], rwPromo: ["Des Coins offerts avec un code.", "Free Coins with a code."],
    notifications: ["Notifications", "Notifications"], noNotif: ["Rien de neuf pour l'instant.", "Nothing new yet."],
    achText: ["Débloque des badges en jouant, récupère la prime de chacun.", "Unlock badges as you play and collect each bonus."], unlocked: ["débloqués", "unlocked"],
    ak_claims: ["Tirages", "Rolls"], ak_streak: ["Série", "Streak"], ak_level: ["Niveaux", "Levels"], ak_ptc: ["PTC", "PTC"], ak_links: ["Shortlinks", "Shortlinks"],
    ak_surveys: ["Sondages", "Surveys"], ak_offers: ["Offres", "Offers"], ak_referrals: ["Parrainage", "Referrals"], ak_withdrawals: ["Retraits", "Withdrawals"], ak_quests: ["Quêtes", "Quests"],
    redeem: ["Valider le code", "Redeem code"], promoText: ["Les codes sont publiés sur notre Telegram et lors des événements. Un code ne sert qu'une fois par compte.", "Codes are posted on our Telegram and during events. Each code works once per account."],
    active: ["actif", "active"], inactive: ["inactif", "inactive"], noRef: ["Aucun filleul pour le moment. Partage ton lien !", "No referrals yet. Share your link!"],
    shareText1: ["Je gagne des cryptos gratuitement sur ce faucet, retrait instantané sur FaucetPay :", "I earn free crypto on this faucet, instant withdrawal to FaucetPay:"],
    shareText2: ["Tirages gratuits, sondages payés, PTC et jackpot de {jp} :", "Free rolls, paid surveys, PTC and a {jp} jackpot:"],
    shareReady: ["Messages prêts à partager", "Ready-to-share messages"], myRefs: ["Mes filleuls", "My referrals"],
    refRules: ["Un filleul est « actif » s'il a fait un tirage dans les 7 derniers jours. Les faux comptes sont bannis avec leur parrain.", "A referral is “active” if they rolled in the last 7 days. Fake accounts are banned along with their referrer."],
    ticketSubject: ["Sujet", "Subject"], ticketBody: ["Ton message", "Your message"], ticketReply: ["Répondre…", "Reply…"],
    tk_open: ["En attente", "Waiting"], tk_answered: ["Répondu", "Answered"], tk_closed: ["Fermé", "Closed"], supportTeam: ["Support", "Support"], send: ["Envoyer", "Send"],
    noTickets: ["Aucune demande.", "No tickets."], newTicket: ["Nouvelle demande", "New ticket"], myTickets: ["Mes demandes", "My tickets"],
    ticketText: ["Une question, un problème de retrait ? On répond en général sous 24 h. Regarde d'abord la", "A question or a withdrawal issue? We usually answer within 24 h. Check the"],
    ticketSent: ["Demande envoyée.", "Ticket sent."],
    faq_what_q: ["C'est quoi, ce site ?", "What is this site?"], faq_what_a: ["Un faucet : tu gagnes des Coins gratuitement (tirages, PTC, shortlinks, sondages, offres) et tu les retires en crypto sur ton compte FaucetPay.", "A faucet: you earn Coins for free (rolls, PTC, shortlinks, surveys, offers) and withdraw them as crypto to your FaucetPay account."],
    faq_pay_q: ["Comment je suis payé ?", "How do I get paid?"], faq_pay_a: ["Les Coins disponibles se retirent tout de suite vers FaucetPay. Les gains des tâches sont vérifiés puis partent seuls à chaque heure.", "Available Coins are withdrawn instantly to FaucetPay. Task earnings are reviewed and then sent automatically every hour."],
    faq_min_q: ["Y a-t-il un minimum de retrait ?", "Is there a minimum withdrawal?"], faq_min_a: ["Non, sauf le minimum propre à certaines cryptos sur FaucetPay. L'USDT accepte les plus petits montants.", "No, except the minimum some coins have on FaucetPay. USDT accepts the smallest amounts."],
    faq_pending_q: ["Pourquoi mes gains sont « à valider » ?", "Why are my earnings “under review”?"], faq_pending_a: ["Les pubs, liens, sondages et offres sont contrôlés contre la triche avant d'être payés. Ça prend en général quelques heures.", "Ads, links, surveys and offers are checked for cheating before payout. It usually takes a few hours."],
    faq_multi_q: ["Puis-je avoir plusieurs comptes ?", "Can I have several accounts?"], faq_multi_a: ["Non. Un compte par personne et par foyer. Les comptes en double sont bannis et perdent leur solde.", "No. One account per person and household. Duplicate accounts are banned and lose their balance."],
    faq_vpn_q: ["VPN, proxy, robots ?", "VPN, proxy, bots?"], faq_vpn_a: ["Interdits. Les tâches faites derrière un VPN ou par un script sont refusées.", "Not allowed. Tasks done behind a VPN or by a script are refused."],
    faq_ref_q: ["Comment marche le parrainage ?", "How do referrals work?"], faq_ref_a: ["Tu touches un pourcentage de tout ce que gagnent tes filleuls, à vie, sans que ça leur soit retiré.", "You earn a percentage of everything your referrals earn, for life, without taking anything from them."],
    faq_vip_q: ["Que donne le VIP ?", "What does VIP give?"], faq_vip_a: ["Zéro pub, un bonus fixe sur les tâches, une part de parrainage plus élevée et une réserve d'énergie de 5 au lieu de 3. Les chances de chaque tirage sont les mêmes pour tous.", "No ads, a fixed bonus on tasks, a higher referral share and an energy reserve of 5 instead of 3. The odds of each roll are the same for everyone."],
    faq_ads_q: ["Je peux faire de la pub ici ?", "Can I advertise here?"], faq_ads_a: ["Oui : crée une campagne depuis l'espace annonceur, en crypto ou avec tes Coins. Chaque vue est une vraie visite.", "Yes: create a campaign from the advertiser area, in crypto or with your Coins. Every view is a real visit."],
    faq_gamble_q: ["Y a-t-il des jeux d'argent ?", "Is there gambling?"], faq_gamble_a: ["Non. Le tirage est gratuit, sans mise : tu ne peux jamais perdre tes Coins.", "No. The roll is free, with no stake: you can never lose your Coins."],
    noProofs: ["Les premiers paiements apparaîtront ici.", "The first payouts will show here."],
    proofsText: ["Chaque retrait payé, en temps réel. Les adresses sont masquées.", "Every paid withdrawal, in real time. Addresses are masked."],
    simTitle: ["Combien je peux gagner ?", "How much can I earn?"], simFaucet: ["Tirages par jour", "Rolls per day"], simPtc: ["PTC par jour", "PTC per day"],
    simLinks: ["Shortlinks par jour", "Shortlinks per day"], simSurveys: ["Sondages par jour", "Surveys per day"], simDay: ["Par jour", "Per day"], simMonth: ["Par mois", "Per month"],
    simNote: ["Estimation basée sur les récompenses actuelles du site. Les sondages varient selon le pays et la durée.", "Estimate based on the site's current rewards. Surveys vary by country and length."],
    w_faucet: ["Minage virtuel de sats : une session de 8 h, des boosts à chaque pub.", "Virtual sats mining: an 8 h session, boosts with every ad."], w_ptc: ["Regarde une pub quelques secondes.", "Watch an ad for a few seconds."],
    w_links: ["Passe des liens raccourcis payés.", "Go through paid short links."], w_surveys: ["Les mieux payés : donne ton avis.", "Best paid: share your opinion."],
    w_offers: ["Jeux, applis, inscriptions.", "Games, apps, sign-ups."], w_games: ["Roue, Mines et Dice, gratuits.", "Wheel, Mines and Dice, free."],
    w_quests: ["Quêtes du jour et de la semaine, succès.", "Daily and weekly quests, achievements."], w_ref: ["Un pourcentage à vie sur tes filleuls.", "A lifetime share of your referrals."],
    heroEyebrow: ["Retrait instantané sur FaucetPay", "Instant withdrawal to FaucetPay"],
    heroTitle: ["Mine des sats gratuitement, sans matériel.", "Mine sats for free, no hardware."],
    heroLead: ["Minage virtuel financé par la pub : lance ta session, booste-la avec des vidéos et des PTC, retire dès 10 sats. Retire en BTC, LTC, DOGE, USDT… en un clic.", "Virtual mining funded by ads: start your session, boost it with videos and PTC, withdraw from 10 sats. Withdraw in BTC, LTC, DOGE, USDT… in one click."],
    members: ["membres", "members"], paidOut: ["versés", "paid out"], instant: ["Instantanés", "Instant"],
    waysTitle: ["Toutes les façons de gagner", "Every way to earn"], stepsTitle: ["Commence en 3 étapes", "Start in 3 steps"],
    step1: ["Entre ton adresse FaucetPay", "Enter your FaucetPay address"], step1t: ["Pas d'inscription longue, pas de dépôt.", "No long sign-up, no deposit."],
    step2: ["Joue et fais des tâches", "Play and do tasks"], step2t: ["Tirages, pubs, sondages, jeux, quêtes.", "Rolls, ads, surveys, games, quests."],
    step3: ["Retire en un clic", "Withdraw in one click"], step3t: ["Directement sur FaucetPay, dans la crypto de ton choix.", "Straight to FaucetPay, in the coin you like."],
    lvBonus: ["sur tes tirages : niveau", "on your rolls: level"],
    rollsTo: ["XP avant le niveau", "XP to level"], rollTo: ["XP avant le niveau", "XP to level"], maxLevel: ["Niveau maximum atteint !", "Max level reached!"],
    onRolls: ["sur les tirages", "on rolls"], levelUp: ["Niveau", "Level"], myOffers: ["Mes dernières offres", "My latest offers"],
    es_pending: ["À valider", "Under review"], es_validated: ["Validée", "Approved"], es_paying: ["En paiement", "Paying"], es_paid: ["Payée", "Paid"],
    es_rejected: ["Refusée", "Refused"], es_reversed: ["Annulée", "Reversed"],
    questsWeek: ["Quêtes de la semaine", "Weekly quests"], dayN: ["Jour", "Day"],
    adKind: ["Format", "Format"], kindWindow: ["Nouvel onglet", "New tab"], kindIframe: ["Dans la page", "In page"], kindVideo: ["Vidéo YouTube", "YouTube video"],
    kind_window: ["Onglet", "Tab"], kind_iframe: ["Dans la page", "In page"], kind_video: ["Vidéo", "Video"],
    views14: ["Vues sur 14 jours", "Views over 14 days"], saved: ["Enregistré.", "Saved."], pause: ["Mettre en pause", "Pause"], resume: ["Relancer", "Resume"],
    exportCsv: ["Exporter l'historique (CSV)", "Export history (CSV)"],
    frameHint: ["Reste sur cette page jusqu'à la fin du compteur", "Stay on this page until the timer ends"],
    noPtc: ["Aucune pub pour le moment. Reviens plus tard.", "No ads right now. Come back later."],
    noLinks: ["Aucun lien pour le moment. Reviens plus tard.", "No links right now. Come back later."],
    noOffers: ["Aucune offre pour le moment. Reviens plus tard.", "No offers right now. Come back later."],
    view: ["Voir", "View"], watch: ["Reste encore", "Stay"], confirm: ["Valider", "Confirm"], open: ["Ouvrir", "Open"], left: ["restants", "left"],
    credited: ["ajoutés, en attente de validation.", "added, under review."],
    wheel: ["Roue", "Wheel"], wheelText: ["Un tour gratuit toutes les quelques heures, après ton premier tirage du jour.", "A free spin every few hours, after your first roll of the day."],
    spin: ["Tourner la roue", "Spin the wheel"], spun: ["Reviens plus tard", "Come back later"], wheelWon: ["gagnés à la roue !", "won on the wheel!"],
    bonus: ["Bonus quotidien", "Daily bonus"], bonusText: ["Reviens chaque jour : ton bonus monte avec ta série.", "Come back every day: your bonus grows with your streak."],
    collect: ["Récupérer", "Collect"], done: ["Récupéré", "Collected"],
    quests: ["Quêtes du jour", "Daily quests"], rolls: ["tirages", "rolls"],
    available: ["Disponible", "Available"], pending: ["À valider", "Under review"], validated: ["Validé", "Approved"],
    withdrawNow: ["Retirer maintenant", "Withdraw now"], receiveIn: ["Recevoir en", "Receive in"], sentTo: ["Envoyé vers", "Sent to"],
    wdDelay: ["Le paiement peut mettre une à deux minutes à apparaître sur ton compte FaucetPay.", "The payment can take one to two minutes to show on your FaucetPay account."],
    wdDone: ["envoyés sur FaucetPay · paiement n°", "sent to FaucetPay · payout #"], wdValidated: ["partiront au prochain paiement horaire.", "will be sent with the next hourly payout."],
    withdrawals: ["Retraits", "Withdrawals"], activity: ["Activité", "Activity"], noWd: ["Aucun retrait pour le moment.", "No withdrawals yet."], noHistory: ["Aucun mouvement. Fais ton premier tirage !", "No activity yet. Make your first roll!"],
    worth: ["soit", "worth"], rate: [`10 000 ${TK} = 1 €`, `10,000 ${TK} = €1`],
    mines: ["Mines", "Mines"], minesText: ["Ouvre des cases pour faire monter ton gain, encaisse avant de tomber sur une des 5 bombes. Gratuit, sans mise.", "Open tiles to grow your prize and cash out before hitting one of the 5 bombs. Free, no stake."],
    newGame: ["Nouvelle partie", "New game"], playsLeft: ["parties restantes aujourd'hui", "games left today"], cashout: ["Encaisser", "Cash out"],
    gainNow: ["Gain actuel", "Current prize"], nextTile: ["case suivante", "next tile"], boom: ["Boum ! Partie perdue, tu ne perds rien.", "Boom! Game over, you lose nothing."],
    dice: ["Dice", "Dice"], diceText: ["Choisis ta cible : plus elle est basse, plus le gain est gros. Gratuit, sans mise.", "Pick your target: the lower it is, the bigger the prize. Free, no stake."],
    diceWin: ["Gagne si le dé fait moins de", "Win if the roll is under"], chance: ["chance", "chance"], diceGo: ["Lancer le dé", "Roll the die"],
    rollsLeft: ["lancers restants aujourd'hui", "rolls left today"], diceLost: ["Raté, retente ta chance !", "Missed, try again!"],
    needRoll: ["Fais d'abord un tirage au faucet aujourd'hui.", "Make a faucet roll first today."],
    vip: ["VIP", "VIP"], vipTitle: ["Passe VIP", "Go VIP"], vipActive: ["VIP actif", "VIP active"],
    vipText: ["Un abonnement simple pour profiter du site sans pub et gagner plus sur tes tâches.", "A simple subscription to enjoy the site ad-free and earn more on your tasks."],
    vipNoAds: ["Zéro pub sur le site", "No ads on the site"], vipNoAdsSub: ["Les bannières disparaissent partout.", "Banners disappear everywhere."],
    vipTasks: ["sur les pubs, liens et offres", "on ads, links and offers"], vipTasksSub: ["Ajouté automatiquement à chaque tâche validée.", "Added automatically to every approved task."],
    vipRef: ["de parrainage", "referral share"], vipRefInstead: ["au lieu de", "instead of"],
    vipBadge: ["Badge VIP doré", "Golden VIP badge"], vipBadgeSub: ["Couronne sur ton profil.", "Crown on your profile."],
    vipFor: ["jours", "days"], vipPay: ["Payer avec FaucetPay", "Pay with FaucetPay"], vipExtend: ["Prolonger", "Extend"],
    vipUntil: ["Actif jusqu’au", "Active until"], vipDelay: ["Après le paiement, l’activation prend une à deux minutes.", "After payment, activation takes one to two minutes."],
    vipFair: ["Le VIP agrandit ta réserve d'énergie (5 au lieu de 3) : tu peux t'absenter plus longtemps sans en perdre. La recharge et les chances de chaque tirage restent les mêmes pour tous. Pas de renouvellement automatique.", "VIP enlarges your energy reserve (5 instead of 3): you can be away longer without wasting any. Recharge and the odds of each roll stay the same for everyone. No automatic renewal."],
    vipRefresh: ["Actualiser", "Refresh"], vipLink: ["Zéro pub, plus de gains sur tes tâches.", "No ads, more from your tasks."],
    advertise: ["Advertise", "Advertise"], adText: ["Montre ton site à nos membres : chaque vue est une vraie visite de plusieurs secondes.", "Show your site to our members: every view is a real visit lasting several seconds."],
    adTitle: ["Titre de l'annonce", "Ad title"], adUrl: ["Adresse de ton site (https://…)", "Your site address (https://…)"], adDuration: ["Durée de chaque vue", "Length of each view"],
    adViews: ["Nombre de vues", "Number of views"], adPay: ["Payer avec FaucetPay", "Pay with FaucetPay"], adTotal: ["Total", "Total"],
    adRules: ["Chaque campagne est vérifiée avant diffusion. Contenus interdits : arnaques, adulte, logiciels malveillants, jeux d'argent.", "Every campaign is reviewed before it runs. Not allowed: scams, adult content, malware, gambling."],
    myAds: ["Mes campagnes", "My campaigns"], noAds: ["Aucune campagne pour le moment.", "No campaigns yet."],
    ad_pending: ["En attente de paiement", "Awaiting payment"], ad_review: ["En vérification", "Under review"], ad_active: ["Active", "Running"], ad_stopped: ["Arrêtée", "Stopped"],
    views: ["vues", "views"], back: ["Retour", "Back"],
    quests: ["Quêtes", "Quests"], questsTitle: ["Quêtes du jour", "Daily quests"],
    perWindow: ["sur", "per"], minutes: ["min", "min"],
    adHere: ["Ta pub ici", "Your ad here"], adHereSub: ["Montre ton site à tous nos joueurs", "Show your site to all our players"],
    pickGame: ["Choisis un jeu", "Pick a game"], play: ["Jouer", "Play"], ready: ["Disponible", "Available"],
    wheelNext: ["Prochain tour dans", "Next spin in"], wheelEvery: ["Un tour gratuit toutes les", "One free spin every"], hours: ["h", "h"],
    minesShort: ["Ouvre des cases, évite les bombes.", "Open tiles, dodge the bombs."], diceShort: ["Choisis ta cible, lance le dé.", "Pick your target, roll the die."],
    wheelShort: ["Fais tourner, gagne des Coins.", "Spin it, win Coins."],
    referral: ["Parrainage", "Referrals"], refText: ["de tout ce que gagnent tes filleuls te revient.", "of everything your referrals earn goes to you."],
    refLink: ["Ton lien", "Your link"], copy: ["Copier", "Copy"], copied: ["Lien copié.", "Link copied."], refCount: ["filleuls", "referrals"], refEarned: ["gagnés grâce à eux", "earned from them"],
    pseudo: ["Pseudo", "Username"], pseudoAsk: ["Choisis un pseudo : c'est lui qui s'affiche dans le chat et les gains en direct, jamais ton e-mail.", "Pick a username: it's what shows in the chat and live feed, never your email."],
    pseudoField: ["Pseudo (3 à 16 lettres, chiffres, . _ -)", "Username (3 to 16 letters, digits, . _ -)"], pseudoSave: ["Enregistrer le pseudo", "Save username"], pseudoDone: ["Pseudo enregistré.", "Username saved."],
    pseudoNow: ["Ton pseudo :", "Your username:"], secTitle: ["Sécurité de ton compte", "Your account security"], secLater: ["Plus tard", "Later"], secClose: ["C'est bon", "All good"],
    secWarn: ["Sans mot de passe, n'importe qui connaissant ton adresse FaucetPay peut entrer sur ton compte et retirer tes gains.", "Without a password, anyone who knows your FaucetPay address can enter your account and withdraw your earnings."],
    advertiseBtn: ["Faire ma pub", "Advertise"],
    wdFee: ["Frais de transfert (à ta charge) :", "Transfer fee (paid by you):"],
    wdFeeFree: ["0 sat : un envoi entre comptes FaucetPay est gratuit.", "0 sat: sending between FaucetPay accounts is free."],
    wdGet: ["Tu recevras", "You will receive"],
    wdFeeOut: ["Pour sortir tes BTC de FaucetPay vers un portefeuille externe, FaucetPay prend environ 1 000 sats de frais réseau (minimum 120 000 sats).", "To move your BTC from FaucetPay to an external wallet, FaucetPay charges about 1,000 sats network fee (minimum 120,000 sats)."],
    feeShort: ["frais", "fee"],
    ptcBack: ["En pause : retourne sur l'onglet de la pub pour continuer.", "Paused: go back to the ad tab to continue."],
    ptcClosed: ["Pub fermée trop tôt : rouvre-la pour continuer.", "Ad closed too early: reopen it to continue."], reopen: ["Rouvrir la pub", "Reopen the ad"],
    codeType: ["Recopie le code pour valider ta vue", "Type the code to confirm your view"],
    codeBad: ["Code incorrect, essais restants", "Wrong code, tries left"], codeLost: ["3 codes faux : cette vue est perdue.", "3 wrong codes: this view is lost."],
    security: ["Sécurité", "Security"], secOn: ["Ton compte est protégé par un mot de passe.", "Your account is protected by a password."],
    secOff: ["Sans mot de passe, ton adresse FaucetPay suffit pour entrer. Ajoute-en un pour protéger ton compte.", "Without a password, your FaucetPay address is enough to enter. Add one to protect your account."],
    secNew: ["Nouveau mot de passe (8 caractères minimum)", "New password (8 characters minimum)"], secSave: ["Protéger mon compte", "Protect my account"], secChange: ["Changer le mot de passe", "Change password"], secDone: ["Mot de passe enregistré.", "Password saved."],
    logout: ["Déconnexion", "Log out"], legal: ["Mentions et confidentialité", "Legal and privacy"],
    st_paid: ["Payé", "Paid"], st_failed: ["Refusé", "Refused"], st_unknown: ["En vérification", "Checking"], st_reserved: ["En cours", "Processing"],
    offline: ["Le site ne répond pas. Vérifie ta connexion et réessaie.", "The site isn't responding. Check your connection and try again."],
    needCaptcha: ["Valide le captcha, puis appuie de nouveau.", "Complete the captcha, then press again."],
    paused: ["Le site est en pause. Tes CryptoCoin restent sur ton compte.", "The site is paused. Your CryptoCoin stay on your account."],
  };
  // {jp} : le jackpot actuel en euros, lu dans la table des gains.
  const t = (k) => (W[k] ? tr(W[k], k) : k).replace("{jp}", () => eur(Math.max(0, ...(status?.roll_tiers || []).map((x) => x.tokens))));

  const ERR = {
    captcha: ["Le captcha a échoué. Valide-le de nouveau.", "The captcha failed. Complete it again."],
    invalid_address: ["FaucetPay ne connaît pas ce compte. Vérifie ton identifiant.", "FaucetPay doesn't know this account. Check your ID."],
    weak_password: ["Choisis un mot de passe d'au moins 8 caractères.", "Choose a password of at least 8 characters."],
    password_required: ["Ce compte est protégé : saisis ton mot de passe.", "This account is protected: enter your password."],
    bad_password: ["Mot de passe incorrect.", "Wrong password."],
    locked: ["Trop d'essais. Réessaie dans 15 minutes.", "Too many attempts. Try again in 15 minutes."],
    too_many_signups: ["Trop de comptes créés depuis cette connexion. Réessaie demain.", "Too many accounts from this connection. Try again tomorrow."],
    cooldown: ["Patiente jusqu'à la fin du compte à rebours.", "Wait until the countdown ends."],
    daily_limit: ["Limite du jour atteinte. Reviens demain.", "Daily limit reached. Come back tomorrow."],
    need_pseudo: ["Choisis d'abord un pseudo pour écrire dans le chat.", "Pick a username first to write in the chat."],
    bad_pseudo: ["Pseudo invalide : 3 à 16 caractères, lettres, chiffres, point, tiret ou souligné.", "Invalid username: 3 to 16 characters, letters, digits, dot, dash or underscore."],
    pseudo_taken: ["Ce pseudo est déjà pris.", "This username is taken."],
    bad_code: ["Code incorrect.", "Wrong code."],
    pseudo_refused: ["Ce pseudo n'est pas accepté.", "This username isn't allowed."],
    banned: ["Ce compte ne peut plus jouer ici.", "This account can no longer play here."],
    paused: W.paused,
    coin_empty: ["Le solde de cette crypto est vide. Tes CryptoCoin sont intacts.", "This coin has run dry. Your CryptoCoin are safe."],
    coin_unavailable: ["Cette crypto n'est plus disponible. Choisis-en une autre.", "This coin is no longer available. Pick another."],
    nothing_to_withdraw: ["Tu n'as rien à retirer pour le moment.", "Nothing to withdraw right now."],
    amount_too_small: ["Montant trop petit pour cette crypto. Choisis USDT ou gagne encore un peu.", "Amount too small for this coin. Pick USDT or earn a bit more."],
    pending: ["FaucetPay n'a pas encore confirmé. Vérifie ton compte dans quelques minutes.", "FaucetPay hasn't confirmed yet. Check your account in a few minutes."],
    try_later: ["Le service est occupé. Réessaie dans une minute.", "The service is busy. Try again in a minute."],
    already_done: ["Déjà fait aujourd'hui.", "Already done today."],
    not_reached: ["Objectif pas encore atteint.", "Goal not reached yet."],
    too_soon: ["Reste encore quelques secondes sur la page.", "Stay on the page a few more seconds."],
    ad_banned: ["Pub interdite : contenu sexuel. Ton compte est fermé et ton solde perdu, comme prévu par les conditions.", "Forbidden ad: sexual content. Your account is closed and your balance forfeited, as stated in the terms."],
    ad_forbidden: ["Pub refusée : les jeux d'argent et les promesses de gains sont interdits.", "Ad refused: gambling and profit promises are not allowed."],
    promo_invalid: ["Ce code n'existe pas ou a expiré.", "This code doesn't exist or has expired."],
    promo_used_up: ["Ce code a déjà été utilisé le nombre maximal de fois.", "This code has reached its maximum uses."],
    too_many_tickets: ["Tu as déjà 3 demandes ouvertes : attends notre réponse.", "You already have 3 open tickets: please wait for our reply."],
    bad_video: ["Pour une vidéo, mets l'adresse YouTube (youtube.com/watch?v=… ou youtu.be/…).", "For a video, use the YouTube address (youtube.com/watch?v=… or youtu.be/…)."],
    no_energy: ["Plus d'énergie : 1 énergie revient toutes les 20 minutes.", "Out of energy: 1 energy comes back every 20 minutes."],
    below_minimum: ["Pas encore assez pour un retrait : le minimum est de 100 Coins.", "Not enough to withdraw yet: the minimum is 100 Coins."],
    chat_need_roll: ["Fais d'abord un tirage pour pouvoir écrire dans le chat.", "Make a roll first to write in the chat."],
    chat_slow: ["Doucement : attends quelques secondes entre deux messages.", "Slow down: wait a few seconds between messages."],
    chat_duplicate: ["Tu viens d'envoyer ce message.", "You just sent this message."],
    chat_link: ["Les liens ne sont pas autorisés dans le chat.", "Links are not allowed in the chat."],
    chat_blocked: ["Message bloqué par la modération.", "Message blocked by moderation."],
    chat_muted: ["Tu ne peux plus écrire pour le moment", "You can't write for now"],
    roll_pending: ["Récupère d'abord ton tirage en cours.", "Collect your current roll first."],
    mining_active: ["Ta session de base tourne encore.", "Your base session is still running."],
    mining_ad_limit: ["Tu as atteint le maximum de pubs pour cette heure. Reviens un peu plus tard.", "You've reached the ad limit for this hour. Come back a bit later."],
    not_enough: ["Pas assez de Coins pour cet achat.", "Not enough Coins for this."],
    not_found: ["Plus disponible.", "No longer available."],
    unauthorized: ["Ta session a expiré. Reconnecte-toi.", "Your session expired. Log in again."],
    bad_request: ["Action impossible. Recharge la page et réessaie.", "Not possible. Reload the page and try again."],
    bad_title: ["Le titre doit faire entre 3 et 60 caractères.", "The title must be 3 to 60 characters long."],
    bad_url: ["L'adresse doit commencer par https://", "The address must start with https://"],
    bad_views: ["Choisis entre 100 et 100 000 vues.", "Pick between 100 and 100,000 views."],
    vip_unavailable: ["Le VIP ouvre bientôt. Reviens dans quelques jours.", "VIP opens soon. Come back in a few days."],
    ads_unavailable: ["L'espace annonceur ouvre bientôt. Reviens dans quelques jours.", "Advertising opens soon. Come back in a few days."],
  };
  const message = (r) => (r.code === "offline" ? t("offline") : (ERR[r.code] ? tr(ERR[r.code], `e:${r.code}`) : tr(ERR.try_later, "e:try_later")));

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* navigation privee */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* navigation privee */ } },
  };

  function h(tag, props, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (k in node && k !== "list") node[k] = v;
      else node.setAttribute(k, v);
    }
    node.append(...kids.flat().filter((c) => c !== null && c !== undefined && c !== false));
    return node;
  }

  const PATHS = {
    home: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    quests: "M9 5h10M9 12h10M9 19h10M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2",
    wheel: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0v9l6.4 6.4M12 12 3.6 9.6",
    dice: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3.5 4.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01",
    grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    earn: "M13 2 4 14h7l-1 8 9-12h-7z",
    games: "M6 12h4M8 10v4M15 11h.01M18 13h.01M7 6h10a5 5 0 0 1 4.9 6l-.8 4A3 3 0 0 1 16 17l-1-1H9l-1 1a3 3 0 0 1-5.1-1l-.8-4A5 5 0 0 1 7 6z",
    wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zm14 7h.01",
    profile: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
    mail: "M4 6h16v12H4zM4 7l8 6 8-6",
    lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
    bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
    fire: "M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 2-2 3-4 3 0-2 0-4-2-6-1 4-4 7-4 12a7 7 0 0 0 7 7z",
    star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    link: "M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1m2 4a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1",
    gift: "M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7S10 3 7.5 3 6 6 12 7zm0 0s2-4 4.5-4S18 6 12 7z",
    flag: "M5 21V4m0 0h12l-2 4 2 4H5",
    check: "M5 12l5 5L20 7",
    bomb: "M11 7a7 7 0 1 0 6 3.4M15 4l2 2M18 3v2M20 5h-2M15.5 7.5 17 6",
    crown: "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z",
    menu: "M4 6h16M4 12h16M4 18h16",
    chat: "M4 5h16v11H9l-5 4z",
    send: "M4 12l16-8-6 16-2-7z",
    play: "M7 4.5v15l12-7.5z",
    fan: "M12 10.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM12 10.2C11 6 12.5 3 15 3.5s2.5 3.5-1.3 5.2M13.8 12c4.2-1 7.2.5 6.7 3s-3.5 2.5-5.2-1.3M12 13.8c1 4.2-.5 7.2-3 6.7s-2.5-3.5 1.3-5.2M10.2 12C6 13 3 11.5 3.5 9s3.5-2.5 5.2 1.3",
    bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
    shop: "M5 8h14l-1.2 12H6.2zM9 8V6a3 3 0 0 1 6 0v2",
    trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 21h6M10 17h4z",
    check: "M5 12.5l4.5 4.5L19 7",
    megaphone: "M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1zm13-3a5 5 0 0 1 0 8",
  };
  function icon(name) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = `<path d="${PATHS[name]}"/>`;
    return s;
  }
  // Piece orange BitPool
  let coinSeq = 0;
  function coinSvg(cls = "coin") {
    const id = `cq${++coinSeq}`;
    const w = h("span", { style: "display:inline-flex" });
    w.innerHTML = `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe0b8"/><stop offset=".5" stop-color="#ff8a1f"/><stop offset="1" stop-color="#c4560a"/></linearGradient><linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa24d"/><stop offset="1" stop-color="#e86a00"/></linearGradient><radialGradient id="${id}s" cx=".3" cy=".22" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="31" fill="url(#${id}r)"/><circle cx="32" cy="32" r="25.5" fill="url(#${id}f)"/><circle cx="32" cy="32" r="28.2" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.6" stroke-dasharray="1.6 3.4"/><circle cx="32" cy="32" r="25.5" fill="none" stroke="rgba(120,50,0,.4)" stroke-width="1.5"/><path d="M39.5 24.2a10.4 10.4 0 1 0 0 15.6" fill="none" stroke="#fff" stroke-width="5.4" stroke-linecap="round"/><path d="M30 16.5v5M30 42.5v5" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="32" r="25.5" fill="url(#${id}s)"/></svg>`;
    return w.firstChild;
  }

  // Unite d'affichage : Coins (par defaut), euro, ou une crypto FaucetPay. Tout reste en Coins cote serveur.
  const UNITS = [["COINS"], ["EUR"], ["BTC", "bitcoin", "₿"], ["ETH", "ethereum", "Ξ"], ["LTC", "litecoin", "Ł"], ["DOGE", "dogecoin", "Ð"],
    ["BCH", "bitcoin-cash", "Ƀ"], ["DASH", "dash", "D"], ["DGB", "digibyte", "Ɗ"], ["TRX", "tron", "T"], ["USDT", "tether", "₮"],
    ["USDC", "usd-coin", "$"], ["BNB", "binancecoin", "B"], ["SOL", "solana", "◎"], ["ZEC", "zcash", "Z"]];
  let unit = store.get("cc.unit") || "BTC";
  let geckoRates = null;
  try { geckoRates = JSON.parse(store.get("cc.rates") || "null"); } catch { geckoRates = null; }
  // Taux d'affichage : ceux du site pour les cryptos de retrait, CoinGecko pour les autres (toutes les 10 min au plus).
  async function loadRates() {
    if (geckoRates && Date.now() - geckoRates.at < 600000) return;
    try {
      const ids = UNITS.filter((u) => u[1]).map((u) => u[1]).join(",");
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?vs_currencies=eur&ids=${ids}`);
      const b = await r.json();
      const perEur = {};
      for (const [code, id] of UNITS) if (id && b[id]?.eur > 0) perEur[code] = 1 / b[id].eur;
      geckoRates = { at: Date.now(), perEur };
      store.set("cc.rates", JSON.stringify(geckoRates));
    } catch { /* hors ligne : on garde les derniers taux, ou les Coins */ }
  }
  const perEurOf = (code) => Number(me?.coins?.find((c) => c.code === code)?.per_eur) || geckoRates?.perEur?.[code] || null;
  const unitInfo = () => {
    if (status?.mining_enabled && Number(status?.coins_per_sat) > 0) return { kind: "sat" };
    if (unit === "EUR") return { kind: "eur" };
    const p = unit === "COINS" ? null : perEurOf(unit);
    if (!p) return { kind: "coins" };
    // Crypto qui vaut plus de 1 000 euros : affichee en satoshis (1/100 000 000), comme sur FaucetPay.
    return { kind: "crypto", p, sat: p < 0.001 };
  };
  const unitLabel = () => {
    const u = unitInfo();
    return u.kind === "sat" ? "sat" : u.kind === "coins" ? TK : u.kind === "eur" ? "€" : u.sat ? (unit === "BTC" ? "sat" : `sat ${unit}`) : unit;
  };
  function num(tokens) {
    const u = unitInfo();
    if (u.kind === "coins") return Number(tokens).toLocaleString(LOCALE);
    if (u.kind === "sat") {
      const sat = tokens / Number(status.coins_per_sat);
      return sat.toLocaleString(LOCALE, { maximumFractionDigits: Math.abs(sat) < 100 ? 2 : 0 });
    }
    const e = tokens / (status?.tokens_per_eur || 10000);
    const loc = LOCALE;
    if (u.kind === "eur") return e.toLocaleString(loc, { minimumFractionDigits: e !== 0 && Math.abs(e) < 0.01 ? 4 : 2, maximumFractionDigits: 4 });
    const v = e * u.p;
    if (u.sat) { const sat = v * 1e8; return sat.toLocaleString(loc, { maximumFractionDigits: Math.abs(sat) < 10 ? 2 : 0 }); }
    return v === 0 ? "0" : v.toLocaleString(loc, { maximumSignificantDigits: 6 });
  }
  function coin(cls = "coin") {
    const u = unitInfo();
    if (u.kind === "coins") return coinSvg(cls);
    if (u.kind === "sat") return h("span", { class: `${cls} unit-badge u-BTC`, "aria-hidden": "true" }, "₿");
    const sym = u.kind === "eur" ? "€" : (UNITS.find((x) => x[0] === unit)?.[2] || unit.slice(0, 1));
    return h("span", { class: `${cls} unit-badge u-${unit}`, "aria-hidden": "true" }, sym);
  }

  // Drapeaux (SVG simplifies, rendus partout, y compris sous Windows)
  const FLAGS = {
    en: '<rect width="30" height="20" fill="#012169"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.4"/>',
    fr: '<rect width="10" height="20" fill="#0055a4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ef4135"/>',
    es: '<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/>',
    pt: '<rect width="30" height="20" fill="#009c3b"/><path d="M15 2.5L27 10 15 17.5 3 10z" fill="#ffdf00"/><circle cx="15" cy="10" r="4.6" fill="#002776"/><path d="M10.6 9.2q4.4-1.4 8.8 1.4" stroke="#fff" stroke-width=".9" fill="none"/>',
    id: '<rect width="30" height="10" fill="#e70011"/><rect y="10" width="30" height="10" fill="#fff"/>',
    ru: '<rect width="30" height="7" fill="#fff"/><rect y="6.6" width="30" height="6.8" fill="#0039a6"/><rect y="13.3" width="30" height="6.7" fill="#d52b1e"/>',
    tr: '<rect width="30" height="20" fill="#e30a17"/><circle cx="11.5" cy="10" r="5" fill="#fff"/><circle cx="12.8" cy="10" r="4" fill="#e30a17"/><path d="M15.6 10l3.9-1.3-2.4 3.3V8l2.4 3.3z" fill="#fff"/>',
  };
  const flag = (code) => {
    const w = h("span", { class: "flag", "aria-hidden": "true" });
    w.innerHTML = `<svg viewBox="0 0 30 20" preserveAspectRatio="none">${FLAGS[code]}</svg>`;
    return w;
  };
  function langPicker() {
    const box = h("details", { class: "lang-pick" },
      h("summary", { "aria-label": "Language" }, flag(lang), h("span", { class: "lang-code" }, lang.toUpperCase())),
      h("div", { class: "lang-menu", role: "menu" }, Object.entries(LANGS).map(([code, [name]]) => h("button", {
        type: "button", role: "menuitem", class: code === lang ? "on" : "",
        onclick: () => { store.set("cc.lang", code); location.reload(); },
      }, flag(code), h("span", {}, name)))));
    // Ferme le menu au clic ailleurs.
    document.addEventListener("click", (e) => { if (!box.contains(e.target)) box.open = false; });
    return box;
  }

  // Serveur ----------------------------------------------------------------
  let session = store.get("cc.session");
  let status = null;
  let me = null;

  async function api(action, body = {}) {
    let res, data;
    try {
      res = await fetch(`${cfg.API_BASE}/api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, session, ...body }),
      });
      data = await res.json();
    } catch {
      return { ok: false, code: "offline" };
    }
    if (res.status === 401 && data.code === "unauthorized" && session) {
      session = null;
      me = null;
      store.del("cc.session");
      render();
    }
    return data;
  }

  // Captcha : un widget par bloc
  const captchaState = new WeakMap();
  let turnstileReady = null;
  function loadTurnstile() {
    if (turnstileReady) return turnstileReady;
    turnstileReady = new Promise((resolve) => {
      window.onTurnstileReady = () => resolve(window.turnstile);
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileReady";
      s.async = true;
      document.head.append(s);
    });
    return turnstileReady;
  }
  function captchaBox() {
    const box = h("div", { class: "captcha" });
    const state = { token: "", widget: null };
    captchaState.set(box, state);
    if (cfg.TURNSTILE_SITE_KEY) {
      loadTurnstile().then((ts) => {
        if (!box.isConnected) return;
        state.widget = ts.render(box, {
          sitekey: cfg.TURNSTILE_SITE_KEY, language: lang, theme: "dark",
          callback: (tok) => { state.token = tok; },
          "expired-callback": () => { state.token = ""; },
          "error-callback": () => { state.token = ""; },
        });
      });
    }
    return box;
  }
  const captchaToken = (box) => captchaState.get(box)?.token || "";
  const captchaMissing = (box) => Boolean(cfg.TURNSTILE_SITE_KEY) && !captchaToken(box);
  function captchaReset(box) {
    const s = captchaState.get(box);
    if (!s) return;
    s.token = "";
    if (window.turnstile && s.widget !== null) window.turnstile.reset(s.widget);
  }

  // Mise en forme
  const locale = LOCALE;
  const fmtInt = (n) => Number(n).toLocaleString(locale);
  const tk = (n) => (unitInfo().kind === "coins" ? `${fmtInt(n)} ${Math.abs(n) <= 1 && TK.endsWith("s") ? TK.slice(0, -1) : TK}` : `${num(n)} ${unitLabel()}`);
  const eur = (tokens) => {
    const v = tokens / (status?.tokens_per_eur || 10000);
    return v.toLocaleString(locale, { minimumFractionDigits: v < 0.01 ? 4 : 2, maximumFractionDigits: 4 }) + " €";
  };
  const units = (u, d) => (u / 10 ** d).toFixed(d).replace(/\.?0+$/, "");
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const when = (iso) => new Date(iso).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
  const shortAddr = (a) => (a && a.length > 22 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a || "");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Niveau : calcule par le serveur a partir de l'XP (1 tirage = 1 XP).
  function levelOf() {
    const i = me?.level_info || {};
    const need = Number(i.need) || 0;
    const into = Number(i.into) || 0;
    return { lvl: i.level || 1, max: Boolean(i.max), mult: Number(i.mult) || 1, pct: need ? Math.min(100, (into / need) * 100) : 100, left: Math.max(0, need - into) };
  }
  const lvText = (lv) => (lv.max ? t("maxLevel") : `${fmtInt(lv.left)} ${t(lv.left > 1 ? "rollsTo" : "rollTo")} ${lv.lvl + 1}`);
  const multText = (m) => `×${m.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let toastTimer = null;
  function toast(text, kind = "info") {
    document.querySelector(".toast")?.remove();
    const el = h("div", { class: `notice toast ${kind}`, role: "status" }, text);
    document.body.append(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 5000);
  }

  // Gain : +N qui monte et pieces qui jaillissent depuis le bouton.
  function burst(fromEl, text) {
    if (reduceMotion || !fromEl) return;
    const r = fromEl.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top;
    const b = h("div", { class: "burst", style: `left:${x}px;top:${y}px` }, text);
    document.body.append(b);
    setTimeout(() => b.remove(), 1500);
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      const s = h("div", { class: "spark", style: `left:${x - 7}px;top:${y + 10}px;--dx:${Math.cos(a) * 90}px;--dy:${Math.sin(a) * 70 - 40}px` });
      document.body.append(s);
      setTimeout(() => s.remove(), 1000);
    }
  }

  // Emplacements pub ----------------------------------------------------------------
  // Codes : d'abord ceux du dashboard (settings.ad_slots), puis ceux de config.js. Plusieurs codes = rotation.
  // Charges seulement a l'approche de l'ecran ; place reservee pour que la page ne saute pas ; jamais pour les VIP.
  const HOUSE_SLOTS = new Set(["roll_top", "roll_bottom", "in_content", "side_right"]);
  const adCodes = (slot) => [].concat(status?.ad_slots?.[slot] || [], cfg.ADS?.[slot] || [])
    .filter((x) => typeof x === "string" && x.trim());
  let adSeen = new Set();
  let adTimer = null;
  const flushAds = () => {
    const slots = [...adSeen];
    adSeen = new Set();
    if (slots.length) api("ad_seen", { slots });
  };
  // Apres un tirage : chaque banniere de la page est rechargee (nouvel affichage, nouveau code de la rotation).
  // Le bandeau mobile ferme par le membre et la pub d apres-gain (deja neuve) ne bougent pas.
  function refreshAds() {
    document.querySelectorAll(".ad[data-slot]").forEach((el) => {
      const slot = el.dataset.slot;
      if (slot === "after_claim" || slot === "sticky_mobile" || !el.isConnected) return;
      const fresh = adSlot(slot);
      if (fresh) el.replaceWith(fresh);
    });
  }
  const adSlot = (slot) => {
    if (me?.vip) return null;
    if (slot === "sticky_mobile" && Number(store.get("cc.stickyOff") || 0) > Date.now()) return null;
    const codes = adCodes(slot);
    if (!codes.length) {
      if (!HOUSE_SLOTS.has(slot) || !session) return null;
      return h("a", { class: "ad-ph", href: "#advertise" },
        h("span", { class: "ad-ph-tag" }, "AD"),
        h("span", {}, h("b", {}, t("adHere")), h("span", { class: "ad-ph-sub" }, t("adHereSub"))),
        icon("megaphone"));
    }
    const box = h("div", { class: `ad ad-${slot}`, "data-slot": slot });
    const html = codes[Math.floor(Math.random() * codes.length)];
    let filled = false;
    const fill = () => {
      if (filled || !box.isConnected) return;
      filled = true;
      // createContextualFragment execute les scripts du reseau publicitaire.
      box.append(document.createRange().createContextualFragment(html));
      adSeen.add(slot);
      clearTimeout(adTimer);
      adTimer = setTimeout(flushAds, 3000);
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fill(); }
      }, { rootMargin: "250px" });
      requestAnimationFrame(() => io.observe(box));
    } else setTimeout(fill, 0);
    if (slot !== "sticky_mobile") return box;
    return h("div", { class: "sticky-ad" }, box, h("button", {
      type: "button", class: "sticky-close", ariaLabel: t("close"),
      onclick: (e) => { store.set("cc.stickyOff", String(Date.now() + 30 * 60000)); e.currentTarget.parentElement.remove(); },
    }, "✕"));
  };

  // Fond : bulles de lumiere qui montent et etincelles qui scintillent, en pause quand l'onglet est cache.
  function background() {
    if (document.querySelector(".bg")) return;
    const layer = h("div", { class: "bg", "aria-hidden": "true" });
    const canvas = h("canvas", {});
    layer.append(canvas);
    document.body.prepend(layer);
    if (reduceMotion) return;
    const ctx = canvas.getContext("2d");
    let w = 0, ht = 0, dpr = 1, pts = [];
    const tints = ["90, 170, 255", "120, 140, 255", "255, 210, 90"];
    const make = (anyY) => {
      const spark = Math.random() < 0.45;
      return {
        spark, x: Math.random() * w, y: anyY ? Math.random() * ht : ht + 40 * dpr,
        r: (spark ? 1.4 + Math.random() * 2.2 : 10 + Math.random() * 34) * dpr,
        vy: (spark ? 0.08 + Math.random() * 0.18 : 0.12 + Math.random() * 0.3) * dpr,
        a: spark ? 0.5 + Math.random() * 0.5 : 0.05 + Math.random() * 0.09,
        tint: tints[spark ? (Math.random() < 0.35 ? 2 : 0) : Math.floor(Math.random() * 2)], ph: Math.random() * 6.28,
      };
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = innerWidth * dpr;
      ht = canvas.height = innerHeight * dpr;
      const n = Math.round(Math.min(46, (innerWidth * innerHeight) / 26000));
      pts = Array.from({ length: n }, () => make(true));
    };
    resize();
    addEventListener("resize", resize);
    const frame = (time) => {
      if (!document.hidden) {
        ctx.clearRect(0, 0, w, ht);
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          p.y -= p.vy;
          if (p.y < -60 * dpr) { pts[i] = make(false); continue; }
          const x = p.x + Math.sin(time / 2600 + p.ph) * 12 * dpr;
          if (p.spark) {
            const tw = p.a * (0.55 + 0.45 * Math.sin(time / 420 + p.ph * 3));
            ctx.fillStyle = `rgba(${p.tint}, ${tw})`;
            ctx.beginPath();
            ctx.moveTo(x, p.y - p.r * 2.4); ctx.quadraticCurveTo(x, p.y, x + p.r * 2.4, p.y);
            ctx.quadraticCurveTo(x, p.y, x, p.y + p.r * 2.4); ctx.quadraticCurveTo(x, p.y, x - p.r * 2.4, p.y);
            ctx.quadraticCurveTo(x, p.y, x, p.y - p.r * 2.4); ctx.fill();
          } else {
            const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r);
            g.addColorStop(0, `rgba(${p.tint}, ${p.a})`);
            g.addColorStop(1, `rgba(${p.tint}, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // Paiement affiche en sats en mode minage (montant en Coins converti au cours du jour), sinon dans sa crypto.
  const payText = (r) => (unitInfo().kind === "sat" && r.tokens != null ? `+${num(r.tokens)} sat` : `+${units(r.amount_units, r.decimals)} ${r.coin}`);
  function ticker() {
    const list = status?.recent || [];
    if (!list.length) return null;
    const items = list.map((r) => h("span", { class: "ticker-item" }, r.who, h("b", {}, payText(r))));
    // Contenu double pour un defilement sans coupure.
    return h("div", { class: "ticker", "aria-label": FR ? "Derniers paiements" : "Latest payouts" },
      h("span", { class: "ticker-live" }, icon("star"), t("lastWins")),
      h("div", { class: "ticker-track" }, items, items.map((n) => n.cloneNode(true))));
  }

  // Ecran d'entree ---------------------------------------------------------
  function gate(embedded = false) {
    const address = h("input", { autocomplete: "username", autocapitalize: "off", spellcheck: false, maxLength: 128, required: true, placeholder: FR ? "toi@exemple.com" : "you@example.com", value: store.get("cc.address") || "", ariaLabel: t("fpField") });
    const pass = h("input", { type: "password", autocomplete: "current-password", ariaLabel: t("passwordShort"), placeholder: t("passwordShort") });
    const passWrap = h("div", { class: "input", hidden: true, style: "margin-top:10px" }, icon("lock"), pass);
    const msg = h("div", { role: "alert", style: "margin-top:12px" });
    const submit = h("button", { class: "btn big", type: "submit", style: "margin-top:14px" }, t("enter"));
    const form = h("form", {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        submit.disabled = true;
        const r = await api("login", { address: address.value, password: passWrap.hidden ? undefined : pass.value, ref: store.get("cc.ref") });
        submit.disabled = false;
        if (r.ok) {
          store.set("cc.address", address.value.trim());
          session = r.session;
          store.set("cc.session", session);
          location.hash = "";
          await boot();
          if (me) securityPopup();
        } else if (r.code === "password_required") {
          passWrap.hidden = false;
          msg.replaceChildren(h("div", { class: "notice info" }, t("passwordAsk")));
          pass.focus();
        } else {
          msg.replaceChildren(h("div", { class: "notice bad" }, message(r)));
        }
      },
    }, h("div", { class: "input" }, icon("mail"), address), passWrap, submit, msg);

    const card = h("section", { class: "gate-card" },
          coinSvg("coin coin-big"),
          h("h1", {}, cfg.SITE_NAME),
          h("p", { class: "gate-sub" }, t("gateSub")),
          !status ? h("div", { class: "notice bad", style: "margin-bottom:14px" }, t("offline")) : null,
          status?.paused ? h("div", { class: "notice warn", style: "margin-bottom:14px" }, t("paused")) : null,
          form,
          h("p", { class: "gate-foot" }, `${t("noFp")} `, h("a", { href: "https://faucetpay.io", rel: "noopener", target: "_blank" }, t("createFp"))),
          h("div", { class: "chips" },
            h("span", { class: "chip" }, icon("bolt"), t("chipInstant")),
            h("span", { class: "chip" }, icon("gift"), t("chipFree")),
            h("span", { class: "chip" }, icon("star"), `${t("chipJackpot")} ${eur(Math.max(0, ...(status?.roll_tiers || []).map((x) => x.tokens)))}`)));
    if (embedded) return card;
    return h("div", {}, ticker(), h("main", { class: "gate" }, card));
  }

  // Application ------------------------------------------------------------
  let earnTab = null;
  let walletTab = "withdrawals";
  let earn = null;
  let timers = [];
  const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearInterval); timers = []; };

  let meAt = Date.now();
  // Secondes restantes, recalculees a partir du profil recu.
  const since = () => Math.floor((Date.now() - meAt) / 1000);
  const energyNow = () => Math.min(me.energy_max ?? 3, (me.energy ?? 0) + ((me.energy ?? 0) < (me.energy_max ?? 3) && (me.energy_next ?? 0) - since() <= 0 ? 1 : 0));
  async function refreshMe() {
    const r = await api("me");
    if (r.ok) { me = r; meAt = Date.now(); updateHeader(); }
    return r;
  }

  let header = null;
  function updateHeader() {
    if (!header || !me) return;
    const lv = levelOf(me.earned_total || 0);
    header.replaceChildren(
      ...(miningOn() ? [] : [h("select", {
        class: "unit-pick", "aria-label": t("unitPick"), title: t("unitPick"),
        onchange: async (e) => { unit = e.target.value; store.set("cc.unit", unit); await loadRates(); render(); },
      }, UNITS.filter(([c]) => c === "COINS" || c === "EUR" || perEurOf(c)).map(([c]) =>
        h("option", { value: c, selected: c === unit }, c === "COINS" ? TK : c === "EUR" ? "€" : c)))]),
      langPicker(),
      h("a", { class: "icon-btn bell", href: "#notifications", "aria-label": t("notifications") }, icon("bell"),
        me.notif_unread > 0 ? h("span", { class: "bell-n" }, String(Math.min(me.notif_unread, 99))) : null),
      h("a", { class: "coin-pill", href: "#wallet", title: t("wallet") }, coin(), num(me.available), me.boost ? h("span", { class: "boost-dot", title: t("boostName") }, icon("bolt")) : null),
      h("a", { class: "who", href: "#profile" },
        h("div", { class: `avatar${me.vip ? " vip" : ""}${frameCls(me)}` }, (me.fp_address || "?").slice(0, 1).toUpperCase(), h("span", { class: "lvl" }, String(lv.lvl)),
          me.vip ? h("span", { class: "crown" }, icon("crown")) : null),
        h("div", { class: "who-text" },
          h("div", { class: `who-name${nameCls(me)}` }, me.pseudo || shortAddr(me.fp_address)),
          h("div", { class: "who-lvl" }, me.title && cosmeticName(me.title) ? `${cosmeticName(me.title)} · ${t("lvlShort")} ${lv.lvl}` : `${t("level")} ${lv.lvl}`))));
  }

  // Pub PTC dans la page (iframe) ou video YouTube integree.
  function openFrame(url, kind, title, secs) {
    const yt = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    const src = kind === "video" && yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0` : url;
    const layer = h("div", { class: "frame-layer" },
      h("div", { class: "frame-box" },
        h("div", { class: "frame-head" },
          h("div", { style: "min-width:0" }, h("b", {}, title), h("div", { class: "row-sub" }, `${t("frameHint")} (${secs} s)`)),
          h("button", { type: "button", class: "icon-btn", "aria-label": t("close"), onclick: () => layer.remove() }, "✕")),
        h("iframe", { src, allow: "autoplay; encrypted-media", referrerpolicy: "no-referrer", title })));
    document.body.append(layer);
    return layer;
  }

  function stat(ico, cls, label, value, sub) {
    return h("div", { class: "stat" },
      h("div", { class: `stat-ico ${cls}` }, icon(ico)),
      h("div", { class: "stat-label" }, label),
      h("div", { class: "stat-value" }, value),
      sub ? h("div", { class: "stat-sub" }, sub) : null);
  }

  function statsRow() {
    const lv = levelOf(me.earned_total || 0);
    const cnt = me.energy_max ?? 3;
    const ready = Math.max(0, Math.min(cnt, me.energy ?? 0));
    const timer = h("span", { class: "energy-timer" });
    const tickTimer = () => {
      const cool = Math.max(0, (me.retry_after || 0) - since());
      const nextE = Math.max(0, (me.energy_next || 0) - since());
      if (ready < 1 && nextE > 0) timer.textContent = `+1 ${t("energyIn")} ${clock(nextE)}`;
      else if (cool > 0) timer.textContent = `${t("next")} ${clock(cool)}`;
      else if (ready < cnt && nextE > 0) timer.textContent = `+1 ${t("energyIn")} ${clock(nextE)}`;
      else timer.textContent = ready >= cnt ? t("energyFull") : t("readyNow");
      if ((me.energy_next || 0) > 0 && nextE === 0 && ready < cnt) refreshMe().then(() => statsHost?.replaceChildren(statsRow()));
    };
    tickTimer();
    every(tickTimer, 1000);
    const powerChip = miningOn() ? (() => {
      const b = h("b", {}, mining ? fmtGhs(mining.power) : "…");
      if (!mining) loadMining().then(() => { b.textContent = fmtGhs(mining?.power || 0); });
      return h("a", { class: "pchip energy", href: "#" }, h("span", { class: "pchip-ico power" }, icon("fan")), b, h("span", {}, t("miningPower")));
    })() : null;
    return h("section", { class: "panel player" },
      h("div", { class: "player-top" },
        h("div", { class: "lvl-badge", title: t("level") }, icon("star"), h("b", {}, String(lv.lvl))),
        h("div", { class: "player-main" },
          h("div", { class: "player-name" }, `${t("level")} ${lv.lvl}`),
          h("div", { class: "xpbar" }, h("i", { style: `width:${lv.pct}%` })),
          h("div", { class: "player-sub" }, lvText(lv), lv.mult > 1 ? h("span", { class: "mult-tag" }, `${multText(lv.mult)} ${t("onRolls")}`) : null))),
      h("div", { class: "player-chips" },
        h("div", { class: "pchip fire" }, h("span", { class: "pchip-ico" }, icon("fire")),
          h("b", {}, fmtInt(me.streak)), h("span", {}, t("streakLbl"))),
        powerChip || h("div", { class: "pchip energy", title: t("energyHelp") },
          h("span", { class: "pips" }, [...Array(cnt).keys()].map((i) => h("i", { class: i < ready ? "on" : "" }))),
          h("b", {}, `${ready}/${cnt}`), h("span", {}, t("energyLbl")), timer),
        h("div", { class: "pchip money" }, coin(),
          h("b", {}, num(me.available)), h("span", {}, unitInfo().kind === "eur" ? unitLabel() : `${t("worth")} ${eur(me.available)}`))));
  }

  // Tirage du faucet
  function rows() {
    const base = status?.faucet_reward_tokens ?? 0;
    const tiers = [...(status?.roll_tiers || [])].sort((a, b) => a.from - b.from);
    const out = [];
    let start = 0;
    let reward = base;
    for (const tier of tiers) {
      if (tier.from > start) out.push({ from: start, to: tier.from - 1, tokens: reward });
      start = tier.from;
      reward = tier.tokens;
    }
    out.push({ from: start, to: 99999, tokens: reward });
    return out;
  }

  let statsHost = null;
  // Bonus fixe du niveau sur le tirage de base (meme regle que le serveur).
  const lvMult = () => levelOf().mult;
  function rollCard() {
    const table = rows();
    const max = Math.max(...table.map((r) => r.tokens));
    const rowEls = table.map((r, i) => h("div", { class: `payout-row t${Math.min(i, 3)}${r.tokens === max && table.length > 1 ? " jackpot" : ""}` },
      h("span", { class: "tier" }, icon(r.tokens === max && table.length > 1 ? "crown" : "star")),
      h("span", { class: "tier-range" }, r.from === r.to ? `${fmtInt(r.from)} · ${t("jackpot")}` : `${fmtInt(r.from)} – ${fmtInt(r.to)}`),
      h("b", {}, tk(r.tokens))));
    const reels = [...Array(5)].map(() => h("span", { class: "reel" }, "0"));
    const digits = h("div", { class: "reels", role: "img", "aria-label": "00000" }, reels);
    const after = h("div", { class: "after-claim" });
    const setReels = (n) => {
      const str = String(n).padStart(5, "0");
      reels.forEach((el, i) => { el.textContent = str[i]; });
      digits.setAttribute("aria-label", str);
    };
    const fill = h("i", {});
    const cap = captchaBox();
    const btn = h("button", { class: "btn big", type: "button" });
    let cooldown = Math.max(status?.cooldown_seconds ?? 30, me.retry_after || 0);
    let readyAt = Date.now() + (me.retry_after || 0) * 1000;
    let busy = false;
    // Tirage en 2 etapes : apres « Lancer », le gain attend pendingUntil puis « Recuperer mon gain ».
    const rollLabel = h("div", { class: "roll-label" }, t("rollHead"));
    let pendingUntil = me.pending_roll ? Date.now() + (me.pending_roll.retry_after || 0) * 1000 : 0;
    let idle = null;
    const startIdle = () => {
      if (reduceMotion || idle) return;
      reels.forEach((el) => { el.classList.remove("stop"); el.classList.add("spin"); });
      idle = every(() => reels.forEach((el) => { el.textContent = String(Math.floor(Math.random() * 10)); }), 90);
    };
    const stopIdle = () => { if (idle) { clearInterval(idle); idle = null; } };
    if (pendingUntil) startIdle();

    const tick = () => {
      const left = Math.ceil((readyAt - Date.now()) / 1000);
      fill.style.width = `${left > 0 ? (1 - left / cooldown) * 100 : 100}%`;
      if (busy) return;
      if (pendingUntil) {
        const wait = Math.ceil((pendingUntil - Date.now()) / 1000);
        btn.className = "btn big gold";
        btn.textContent = t("collectBtn");
        btn.disabled = wait > 0;
        rollLabel.textContent = wait > 0 ? `${t("revealIn")} ${wait}` : t("revealNow");
        if (wait <= 0) btn.classList.add("ready");
        return;
      }
      btn.className = "btn big";
      rollLabel.textContent = t("rollHead");
      if (status?.paused) { btn.disabled = true; btn.textContent = t("closed"); }
      else if (left > 0) { btn.disabled = true; btn.textContent = (me.energy ?? 1) < 1 ? t("noEnergy") : t("rollBtn"); }
      else { btn.disabled = false; btn.textContent = t("rollBtn"); btn.classList.add("ready"); }
    };
    tick();
    every(tick, 1000);

    const animateTo = (target) => new Promise((resolve) => {
      if (reduceMotion) { setReels(target); resolve(); return; }
      const str = String(target).padStart(5, "0");
      let stopped = 0;
      reels.forEach((el) => { el.classList.remove("stop"); el.classList.add("spin"); });
      const id = setInterval(() => { for (let i = stopped; i < 5; i++) reels[i].textContent = String(Math.floor(Math.random() * 10)); }, 55);
      reels.forEach((el, i) => setTimeout(() => {
        stopped = i + 1;
        el.textContent = str[i];
        el.classList.remove("spin");
        el.classList.add("stop");
        if (i === 4) { clearInterval(id); digits.setAttribute("aria-label", str); setTimeout(resolve, 250); }
      }, 700 + i * 220));
    });

    // Etape 2 : revele le resultat, credite le gain, recharge encore les bannieres.
    const collect = async () => {
      busy = true;
      btn.disabled = true;
      btn.classList.remove("ready");
      const r = await api("collect");
      if (!r.ok) {
        busy = false;
        if (r.code === "too_soon" && r.retry_after) pendingUntil = Date.now() + r.retry_after * 1000;
        else if (r.code === "not_found") { pendingUntil = 0; stopIdle(); }
        toast(message(r), "bad");
        tick();
        return;
      }
      pendingUntil = 0;
      stopIdle();
      await animateTo(r.roll ?? 0);
      const i = table.findIndex((row) => r.roll >= row.from && r.roll <= row.to);
      if (i >= 0) rowEls[i].classList.add("hit");
      after.replaceChildren(...[adSlot("after_claim")].filter(Boolean));
      refreshAds();
      burst(btn, `+${tk(r.tokens)}`);
      toast(r.level_up ? `${t("levelUp")} ${r.level} ! ${multText(levelOf().mult + (status?.level_mult_percent ?? 2) / 100)} ${t("onRolls")}` : `${tk(r.tokens)} ${t("won")}`, "good");
      await refreshMe();
      statsHost?.replaceChildren(statsRow());
      busy = false;
      tick();
    };

    btn.onclick = async () => {
      if (pendingUntil) { collect(); return; }
      if (captchaMissing(cap)) { toast(t("needCaptcha"), "bad"); return; }
      btn.classList.remove("ready");
      busy = true;
      btn.disabled = true;
      btn.textContent = t("rolling");
      rowEls.forEach((el) => el.classList.remove("hit"));
      const r = await api("claim", { captcha: captchaToken(cap) || "dev" });
      captchaReset(cap);
      if (r.ok && r.pending) {
        // Etape 1 faite : nouvelles bannieres, rouleaux qui tournent jusqu'a la recuperation.
        pendingUntil = Date.now() + (r.wait || 0) * 1000;
        cooldown = r.cooldown_seconds;
        readyAt = Date.now() + r.cooldown_seconds * 1000;
        refreshAds();
        startIdle();
        await refreshMe();
        statsHost?.replaceChildren(statsRow());
      } else if (r.code === "roll_pending") {
        pendingUntil = Date.now() + (r.retry_after || 0) * 1000;
        startIdle();
      } else if (r.ok) {
        await animateTo(r.roll ?? 0);
        const i = table.findIndex((row) => r.roll >= row.from && r.roll <= row.to);
        if (i >= 0) rowEls[i].classList.add("hit");
        cooldown = r.cooldown_seconds;
        after.replaceChildren(...[adSlot("after_claim")].filter(Boolean));
        refreshAds();
        readyAt = Date.now() + r.cooldown_seconds * 1000;
        burst(btn, `+${tk(r.tokens)}`);
        toast(r.level_up ? `${t("levelUp")} ${r.level} ! ${multText(levelOf().mult + (status?.level_mult_percent ?? 2) / 100)} ${t("onRolls")}` : `${tk(r.tokens)} ${t("won")}`, "good");
        await refreshMe();
        statsHost?.replaceChildren(statsRow());
      } else {
        if (r.retry_after) { cooldown = r.retry_after; readyAt = Date.now() + r.retry_after * 1000; }
        toast(message(r), "bad");
      }
      busy = false;
      tick();
    };

    return h("div", { class: "grid2 roll-grid" },
      h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("prizes"), h("span", { class: "badge" }, unitLabel())), rowEls),
      h("section", { class: "panel" },
        h("div", { class: "roll" }, rollLabel, digits),
        h("div", { class: "cooldown" }, fill),
        cap, adSlot("roll_top"), btn, adSlot("roll_bottom"), after,
        lvMult() > 1 ? h("p", { class: "lv-bonus" }, icon("star"), `${multText(lvMult())} ${t("lvBonus")} ${levelOf().lvl}`) : null,
        h("p", { class: "note", style: "text-align:center;margin:12px 0 0" }, t("free"))));
  }

  function homeView() {
    statsHost = h("div", {}, statsRow());
    return h("div", { class: "stack" }, statsHost, rollCard());
  }

  // Gagner : menu de categories, puis la liste choisie.
  async function loadEarn() {
    const r = await api("earn_list");
    if (r.ok) earn = r;
    return r;
  }

  const walls = (kind) => (earn?.offerwalls || []).filter((w) => (w.kind || "offers") === kind);
  const sumRewards = (list) => list.reduce((n, x) => n + (Number(x.reward_tokens) || 0) * (x.remaining ?? 1), 0);
  const nextPayout = () => {
    const d = new Date();
    const left = 3600 - (d.getUTCMinutes() * 60 + d.getUTCSeconds());
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  };
  const wallSel = {};

  function earnView() {
    const wrap = h("div", { class: "stack" }, h("section", { class: "panel" }, h("p", { class: "empty" }, "…")));
    const back = () => h("a", { class: "btn ghost small", href: "#earn", style: "align-self:flex-start;width:auto" }, `← ${t("pickTask")}`);

    // Bandeau : gains a valider, valides, et prochain paiement automatique (chaque heure pile).
    const payoutLine = h("b", {}, nextPayout());
    every(() => { payoutLine.textContent = nextPayout(); }, 1000);
    const summary = () => h("section", { class: "panel earn-sum" },
      h("div", {}, h("div", { class: "earn-sum-label" }, t("pending")),
        h("div", { class: "earn-sum-val" }, coin(), tk(me.pending || 0))),
      h("div", {}, h("div", { class: "earn-sum-label" }, t("validated")),
        h("div", { class: "earn-sum-val" }, coin(), tk(me.validated || 0))),
      h("div", {}, h("div", { class: "earn-sum-label" }, t("nextPayout")),
        h("div", { class: "earn-sum-val" }, payoutLine)));

    const menu = () => {
      const linksLeft = earn.shortlinks.reduce((a, p) => a + p.remaining, 0);
      const cats = [
        { key: "ptc", tone: "--c1:#4fd2ff;--c2:#2f6bff", ico: "eye", name: t("ptc"), text: t("ptcShort"), n: earn.ptc.length, sum: sumRewards(earn.ptc), unit: miningOn() ? "ghs" : undefined, ghs: status?.mining_ptc_ghs },
        { key: "watch", tone: "--c1:#ff8cc6;--c2:#e2367f", ico: "play", name: t("watchAds"), text: t("watchShort"), n: adCodes("watch").length ? (status?.watch_daily_limit ?? 30) : 0, sum: null, unit: miningOn() ? "ghs" : "videos", ghs: status?.mining_video_ghs },
        { key: "links", tone: "--c1:#b48cff;--c2:#6b3dff", ico: "link", name: t("links"), text: t("linksShort"), n: linksLeft, sum: sumRewards(earn.shortlinks) },
        { key: "surveys", tone: "--c1:#45e3a6;--c2:#11a771", ico: "quests", name: t("surveys"), text: t("surveysShort"), n: walls("surveys").length, sum: null },
        { key: "offers", tone: "--c1:#ff8cc6;--c2:#e2367f", ico: "gift", name: t("offers"), text: t("offersShort"), n: walls("offers").length, sum: null },
      ];
      return h("div", { class: "stack" },
        summary(),
        h("div", { class: "panel-title", style: "margin:2px 2px 0" }, t("pickTask")),
        h("div", { class: "game-menu four" }, cats.map((c) =>
          h("a", { class: `game-tile${c.n > 0 ? " ready" : ""}`, href: `#${c.key}` },
            h("span", { class: "game-ico", style: c.tone }, icon(c.ico)),
            h("span", { class: "game-name" }, c.name),
            h("span", { class: "game-text" }, c.text),
            h("span", { class: `badge ${c.n > 0 ? "good" : ""}` },
              c.n < 1 ? t("noneNow") : c.unit === "ghs" ? `${c.n} ${t("availableN")} · +${fmtGhs(c.ghs)} · ${status?.mining_hours ?? 8} h` : c.unit === "videos" ? `${c.n} ${t("perDay")} · ${num(status?.watch_reward ?? 0)} / ${t("perViewShort")}` : c.sum === null ? `${c.n} ${t(c.n > 1 ? "walls" : "wall1")}` : `${c.n} ${t("availableN")} · ${tk(c.sum)}`),
            h("span", { class: "btn small", style: "margin-top:auto" }, t("open"))))),
        h("p", { class: "note", style: "text-align:center" }, t("pendingNote")),
        adSlot("in_content"));
    };

    const emptyBox = (ico, text) => h("div", { class: "empty" }, h("div", { class: "empty-ico" }, icon(ico)), h("p", {}, text));

    // PTC : une carte par pub, barre de visionnage, puis captcha et validation sur place.
    const ptcPanel = () => {
      const list = earn.ptc;
      const head = h("div", { class: "panel-title" }, h("span", {}, t("ptc")),
        h("span", { class: "ptc-head-right" },
          list.length ? h("span", { class: "badge good" }, `${list.length} ${t("availableN")}`) : null,
          h("a", { class: "btn small", href: "#advertise", style: "width:auto" }, icon("megaphone"), t("advertiseBtn"))));
      if (!list.length) return h("section", { class: "panel" }, head, emptyBox("eye", t("noPtc")));
      let busy = false;
      const cards = list.map((c) => {
        const foot = h("div", { class: "task-foot" });
        const card = h("div", { class: "task" },
          h("div", { class: "task-top" },
            h("div", { class: "row-ico" }, icon("eye")),
            h("div", { class: "row-main" }, h("h3", {}, c.title), h("div", { class: "row-sub" }, `${c.duration_seconds} s`)),
            h("span", { class: "task-reward" }, ...(miningOn() ? [icon("fan"), `+${fmtGhs(status.mining_ptc_ghs)}`] : [coin(), num(c.reward_tokens)]))),
          foot);
        const start = h("button", {
          class: "btn small", type: "button",
          onclick: async () => {
            if (busy) { toast(t("oneAtATime"), "bad"); return; }
            busy = true;
            // Fenetre : nouvel onglet. Iframe et video : dans la page, compteur en pause si l'onglet est cache.
            const inPage = c.kind === "iframe" || c.kind === "video";
            let win = inPage ? null : window.open("about:blank", "_blank");
            const r = await api("ptc_start", { id: c.id });
            if (!r.ok) { busy = false; win?.close(); toast(message(r), "bad"); return; }
            if (win) { win.opener = null; win.location = r.url; }
            const frame = inPage ? openFrame(r.url, c.kind, c.title, r.duration_seconds) : null;
            card.classList.add("on");
            const total = r.duration_seconds;
            let left = total;
            const fill = h("i", {});
            const label = h("span", { class: "row-sub" }, `${t("watch")} ${left} s`);
            foot.replaceChildren(h("div", { class: "task-bar" }, fill), label);
            const reopen = h("button", { class: "btn small ghost", type: "button", style: "width:auto", onclick: () => { win = window.open(r.url, "_blank"); } }, t("reopen"));
            const id = every(() => {
              if (frame && (document.hidden || !frame.isConnected)) return;
              // Nouvel onglet : le compteur ne tourne que si la pub est ouverte et que le membre est dessus (pas sur ce site).
              if (win) {
                if (win.closed) { label.replaceChildren(t("ptcClosed"), " ", reopen); return; }
                if (!document.hidden && document.hasFocus()) { label.textContent = t("ptcBack"); return; }
              }
              left -= 1;
              fill.style.width = `${Math.min(100, ((total - left) / total) * 100)}%`;
              if (left > 0) { label.textContent = `${t("watch")} ${left} s`; return; }
              clearInterval(id);
              frame?.remove();
              const cap = captchaBox();
              const ok = h("button", {
                class: "btn small gold", type: "button",
                onclick: async () => {
                  if (captchaMissing(cap)) { toast(t("needCaptcha"), "bad"); return; }
                  ok.disabled = true;
                  const done = await api("ptc_complete", { id: c.id, captcha: captchaToken(cap) || "dev" });
                  if (done.mining) mining = null;
                  captchaReset(cap);
                  ok.disabled = false;
                  if (done.ok) burst(ok, done.mining ? `+${fmtGhs(done.ghs)}` : `+${tk(done.tokens)}`);
                  toast(done.ok ? (done.mining ? `${t("sessionOpened")} ${fmtGhs(done.ghs)} · ${done.hours} h` : `${tk(done.tokens)} ${t("credited")}`) : message(done), done.ok ? "good" : "bad");
                  if (done.ok || done.code === "already_done") { busy = false; await loadEarn(); await refreshMe(); render(); }
                },
              }, miningOn() ? `${t("confirm")} +${fmtGhs(status.mining_ptc_ghs)}` : `${t("confirm")} +${num(c.reward_tokens)}`);
              foot.replaceChildren(h("div", { class: "task-confirm" }, cap, ok));
            }, 1000);
          },
        }, t("view"));
        foot.append(start);
        return card;
      });
      return h("section", { class: "panel" }, head, h("p", { class: "note" }, t("ptcHow")),
        h("div", { class: "task-grid" }, cards.flatMap((c, i) => ((i + 1) % 6 === 0 ? [c, adSlot("list")] : [c])).filter(Boolean)));
    };

    // Raccourcis : un captcha commun, puis une carte par reseau avec ses passages restants.
    const linksPanel = () => {
      const list = earn.shortlinks;
      const total = list.reduce((a, p) => a + p.remaining, 0);
      const head = h("div", { class: "panel-title" }, h("span", {}, t("links")),
        list.length ? h("span", { class: `badge ${total ? "good" : ""}` }, `${total} ${t("left")}`) : null);
      if (!list.length) return h("section", { class: "panel" }, head, emptyBox("link", t("noLinks")));
      const cap = captchaBox();
      return h("section", { class: "panel" }, head,
        h("p", { class: "note" }, t("linksHow")),
        h("div", { class: "task-cap" }, cap),
        h("div", { class: "task-grid" }, list.map((p) => {
          const btn = h("button", {
            class: "btn small", type: "button", disabled: p.remaining < 1,
            onclick: async () => {
              if (captchaMissing(cap)) { toast(t("needCaptcha"), "bad"); return; }
              btn.disabled = true;
              const r = await api("shortlink_start", { id: p.id, captcha: captchaToken(cap) || "dev" });
              captchaReset(cap);
              if (r.ok) { location.href = r.url; return; }
              btn.disabled = false;
              toast(message(r), "bad");
            },
          }, p.remaining > 0 ? t("open") : t("doneToday"));
          return h("div", { class: `task${p.remaining < 1 ? " done" : ""}` },
            h("div", { class: "task-top" },
              h("div", { class: "row-ico" }, icon("link")),
              h("div", { class: "row-main" }, h("h3", {}, p.name),
                h("div", { class: "row-sub" }, p.remaining > 0 ? `${p.remaining} ${t("left")}` : t("comeBack"))),
              h("span", { class: "task-reward" }, coin(), num(p.reward_tokens))),
            h("div", { class: "task-foot" }, btn));
        })));
    };

    // Offerwalls : une tuile par reseau, le mur choisi s'ouvre en dessous.
    const offersPanel = (kind) => {
      const list = walls(kind);
      const sv = kind === "surveys";
      const head = h("div", { class: "panel-title" }, h("span", {}, t(sv ? "surveys" : "offers")),
        list.length ? h("span", { class: "badge" }, `${list.length} ${t(list.length > 1 ? "walls" : "wall1")}`) : null);
      if (!list.length) return h("section", { class: "panel" }, head, emptyBox(sv ? "quests" : "gift", t(sv ? "noSurveys" : "noOffers")));
      const area = h("div", {});
      const tiles = list.map((w) => h("button", { type: "button", class: "wall-tile", "data-code": w.code, onclick: () => pick(w) },
        h("span", { class: "wall-logo" }, w.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()),
        h("span", { class: "wall-name" }, w.name), w.bonus > 0 ? h("span", { class: "badge good" }, `+${Number(w.bonus)} %`) : null));
      function pick(w) {
        wallSel[kind] = w.code;
        tiles.forEach((x) => x.setAttribute("aria-selected", String(x.dataset.code === w.code)));
        area.replaceChildren(
          h("div", { class: "wall-bar" }, h("b", {}, w.name), h("span", { class: "row-sub" }, t("wallHint"))),
          h("iframe", { class: "wall", src: w.iframe_url.replaceAll("{user}", encodeURIComponent(me.ref_code)), title: w.name }));
      }
      pick(list.find((w) => w.code === wallSel[kind]) || list[0]);
      setTimeout(() => area.parentElement?.append(mine), 0);
      const mine = h("div", {});
      api("my_offers").then((r) => {
        const list2 = (r.list || []).filter((o) => o.kind === kind).slice(0, 10);
        if (!list2.length || !mine.isConnected) return;
        mine.replaceChildren(h("div", { class: "panel-title", style: "margin-top:16px" }, t("myOffers")),
          ...list2.map((o) => h("div", { class: "list-line" }, h("div", {}, h("div", { style: "color:var(--ink);font-weight:700" }, o.wall), h("div", { class: "row-sub" }, when(o.at))),
            h("span", { class: `badge ${o.status === "pending" ? "warn" : o.status === "rejected" || o.status === "reversed" ? "bad" : "good"}` }, t(`es_${o.status}`)),
            h("span", { class: "amount plus" }, `+${num(o.tokens)}`))));
      });
      return h("section", { class: "panel" }, head, h("p", { class: "note" }, t(sv ? "surveysHow" : "offersHow")), h("div", { class: "wall-grid" }, tiles), area);
    };

    const draw = () => {
      if (!earn) return;
      if (!earnTab) { wrap.replaceChildren(menu()); return; }
      const panel = earnTab === "ptc" ? ptcPanel() : earnTab === "links" ? linksPanel() : offersPanel(earnTab === "surveys" ? "surveys" : "offers");
      wrap.replaceChildren(...[back(), panel, adSlot("in_content")].filter(Boolean));
    };
    if (earn) draw();
    loadEarn().then(draw);
    return wrap;
  }

  // Boutique : depenser ses Coins, sans hasard -----------------------------
  let catalog = null;
  async function loadCatalog() {
    const r = await api("shop");
    if (r.ok) catalog = r;
    return r;
  }
  const cosmeticName = (code) => {
    const c = catalog?.cosmetics?.find((x) => x.code === code);
    return c ? (FR ? c.name : c.name_en) : "";
  };
  const frameCls = (u) => (u?.frame ? ` fr-${u.frame}` : "");
  const nameCls = (u) => (u?.name_color ? ` nc-${u.name_color}` : "");
  const hoursLeft = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 3600000));

  // Premier appui : demande confirmation. Deuxieme appui dans les 4 s : achete.
  function buyButton(label, price, onBuy, cls = "btn small gold") {
    let armed = false, timer = null;
    const content = () => [coinSvg(), fmtInt(price)];
    const btn = h("button", {
      class: cls, type: "button", disabled: me.available < price,
      onclick: async () => {
        if (!armed) {
          armed = true;
          btn.replaceChildren(`${t("confirmBuy")} `, ...content());
          timer = setTimeout(() => { armed = false; btn.replaceChildren(...(label ? [label, " · "] : []), ...content()); }, 4000);
          return;
        }
        clearTimeout(timer);
        btn.disabled = true;
        const r = await onBuy();
        if (r.ok) { burst(btn, `-${fmtInt(price)}`); toast(t("bought"), "good"); }
        else toast(message(r), "bad");
        await Promise.all([refreshMe(), loadCatalog()]);
        render();
      },
    }, ...(label ? [label, " · "] : []), ...content());
    return btn;
  }

  function shopView() {
    const wrap = h("div", { class: "stack" }, h("section", { class: "panel" }, h("p", { class: "empty" }, "…")));
    const draw = () => {
      if (!catalog) return;
      const b = catalog.boost;
      const boostCard = h("div", { class: "shop-card" },
        h("div", { class: "shop-ico", style: "--c1:#ffd34d;--c2:#ff8f1c" }, icon("bolt")),
        h("div", { class: "shop-main" },
          h("h3", {}, `${t("boostName")} +${b.percent} %`),
          h("p", { class: "row-sub" }, `${t("boostText")} ${b.hours} h.`),
          me.boost ? h("span", { class: "badge good" }, `${t("activeFor")} ${hoursLeft(me.boost_until)} h`) : null),
        buyButton(me.boost ? t("extend") : "", b.price, () => api("shop_buy", { item: "boost" })));
      const vipCard = h("div", { class: "shop-card" },
        h("div", { class: "shop-ico", style: "--c1:#ffe27a;--c2:#e09a12" }, icon("crown")),
        h("div", { class: "shop-main" },
          h("h3", {}, `VIP · ${catalog.vip.days} ${t("vipFor")}`),
          h("p", { class: "row-sub" }, t("vipLink")),
          h("a", { href: "#vip", class: "shop-more" }, t("details"))),
        buyButton(me.vip ? t("extend") : "", catalog.vip.price, () => api("shop_buy", { item: "vip" })));
      const adCard = h("a", { class: "shop-card ad-link", href: "#advertise" },
        h("div", { class: "shop-ico", style: "--c1:#4fd2ff;--c2:#2f6bff" }, icon("megaphone")),
        h("div", { class: "shop-main" }, h("h3", {}, t("advertise")), h("p", { class: "row-sub" }, t("adCoinsText"))),
        h("span", { class: "chev" }, "›"));

      const group = (kind, title) => {
        const items = catalog.cosmetics.filter((c) => c.kind === kind);
        const worn = { frame: me.frame, color: me.name_color, title: me.title }[kind];
        return h("section", { class: "panel" },
          h("div", { class: "panel-title" }, title),
          h("div", { class: "cos-grid" }, items.map((c) => {
            const on = worn === c.code;
            const preview = kind === "frame"
              ? h("div", { class: `avatar cos-avatar fr-${c.code}` }, (me.fp_address || "?").slice(0, 1).toUpperCase())
              : kind === "color"
                ? h("div", { class: `cos-name nc-${c.code}` }, shortAddr(me.fp_address).slice(0, 12))
                : h("span", { class: "title-tag" }, FR ? c.name : c.name_en);
            const action = !c.owned
              ? buyButton("", c.price, () => api("shop_buy", { item: c.code }), "btn small gold")
              : h("button", {
                  class: `btn small ${on ? "ghost" : ""}`, type: "button",
                  onclick: async () => {
                    const r = await api("shop_equip", { kind, code: on ? "" : c.code });
                    if (!r.ok) toast(message(r), "bad");
                    await refreshMe();
                    render();
                  },
                }, on ? t("unequip") : t("equip"));
            return h("div", { class: `cos-item${on ? " on" : ""}` },
              h("div", { class: "cos-preview" }, preview),
              h("div", { class: "cos-label" }, FR ? c.name : c.name_en),
              action);
          })));
      };

      wrap.replaceChildren(
        h("section", { class: "panel shop-hero" },
          h("div", { class: "shop-hero-ico" }, icon("shop")),
          h("div", {}, h("h2", {}, t("shop")), h("p", { class: "row-sub" }, t("shopText"))),
          h("div", { class: "coin-pill" }, coin(), num(me.available))),
        h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("bonuses")), h("div", { class: "shop-list" }, boostCard, vipCard, adCard)),
        group("frame", t("frames")), group("color", t("colors")), group("title", t("titles")),
        h("p", { class: "note", style: "text-align:center" }, t("shopFair")));
    };
    if (catalog) draw();
    loadCatalog().then(draw);
    return wrap;
  }

  // Tournoi de la semaine : gratuit, classement sur les Coins gagnes.
  function tournamentCard() {
    const box = h("section", { class: "panel tourney" }, h("div", { class: "panel-title" }, t("tourney")), h("p", { class: "empty" }, "…"));
    Promise.all([api("board"), catalog ? null : loadCatalog()]).then(([r]) => {
      if (!r.ok || !box.isConnected) return;
      const left = Math.max(0, Math.floor((new Date(r.ends_at) - Date.now()) / 1000));
      const ends = `${Math.floor(left / 86400)} ${t("d")} ${Math.floor((left % 86400) / 3600)} h`;
      const prizes = r.prizes || [];
      const medal = (rank) => h("span", { class: `rank r${Math.min(rank, 4)}` }, rank <= 3 ? icon("trophy") : String(rank));
      const rows = r.top.map((p) => h("div", { class: `board-row${p.me ? " me" : ""}` },
        medal(p.rank),
        h("div", { class: `avatar mini${frameCls(p)}` }, (p.who || "?").slice(0, 1).toUpperCase()),
        h("div", { class: "board-who" },
          h("div", { class: `board-name${nameCls(p)}` }, p.me ? t("you") : p.who),
          p.title && cosmeticName(p.title) ? h("span", { class: "title-tag small" }, cosmeticName(p.title)) : null),
        h("div", { class: "board-score" }, num(p.score), prizes[p.rank - 1] ? h("span", { class: "board-prize" }, `+${num(prizes[p.rank - 1])}`) : null)));
      const mine = r.me && r.me.rank > 10
        ? h("div", { class: "board-row me" }, medal(r.me.rank), h("div", { class: `avatar mini${frameCls(me)}` }, (me.fp_address || "?").slice(0, 1).toUpperCase()),
            h("div", { class: "board-who" }, h("div", { class: `board-name${nameCls(me)}` }, t("you"))), h("div", { class: "board-score" }, num(r.me.score)))
        : null;
      box.replaceChildren(
        h("div", { class: "panel-title" }, h("span", {}, t("tourney")), h("span", { class: "badge warn" }, `${t("endsIn")} ${ends}`)),
        h("div", { class: "podium" }, [1, 0, 2].map((i) => prizes[i] ? h("div", { class: `pod p${i + 1}` },
          h("span", { class: "pod-rank" }, `${i + 1}`), h("b", {}, num(prizes[i])), h("span", {}, unitLabel())) : null)),
        rows.length ? h("div", { class: "board" }, rows, mine) : h("p", { class: "empty" }, t("tourneyEmpty")),
        h("p", { class: "note", style: "margin:12px 0 0" }, `${t("tourneyText")} ${prizes.length} ${t("tourneyText2")}`));
    });
    return box;
  }

  // Jeux : roue, bonus, quetes
  function wheelCard() {
    const prizes = me.wheel_prizes || [];
    const n = Math.max(prizes.length, 1);
    const colors = ["#2f6bff", "#29b8ff", "#13265a", "#ff9f1c"];
    const stops = prizes.map((_, i) => `${colors[i % (n % 4 === 1 && i === n - 1 ? 3 : 4)]} ${(i / n) * 360}deg ${((i + 1) / n) * 360}deg`).join(", ");
    const disc = h("div", { class: "wheel-disc", style: `background:conic-gradient(${stops})` },
      prizes.map((p, i) => h("span", { class: "wheel-label", style: `transform:translate(-50%, -50%) rotate(${(i + 0.5) * 360 / n}deg) translateY(-78px)` }, String(p))));
    let turns = Number(store.get("cc.wheelTurn")) || 0;
    disc.style.transform = `rotate(${turns}deg)`;
    const btn = h("button", {
      class: "btn gold", style: "width:100%", disabled: me.wheel_done || me.claims_today < me.wheel_min_claims,
      onclick: async () => {
        btn.disabled = true;
        const r = await api("wheel");
        if (!r.ok) { toast(message(r), "bad"); btn.disabled = false; return; }
        const target = 360 - (r.index + 0.5) * 360 / n;
        turns = turns - (turns % 360) + 360 * 6 + target;
        store.set("cc.wheelTurn", String(turns % 360));
        disc.style.transition = reduceMotion ? "none" : "transform 4.2s cubic-bezier(.12,.85,.18,1)";
        disc.style.transform = `rotate(${turns}deg)`;
        setTimeout(async () => {
          burst(btn, `+${tk(r.tokens)}`);
          toast(`${tk(r.tokens)} ${t("wheelWon")}`, "good");
          await refreshMe();
          render();
        }, reduceMotion ? 50 : 4400);
      },
    }, t("spin"));
    if (me.wheel_done) {
      let left = me.wheel_retry_after || 0;
      const fmt = (x) => `${Math.floor(x / 3600)}:${String(Math.floor((x % 3600) / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
      btn.textContent = `${t("wheelNext")} ${fmt(left)}`;
      every(() => {
        left -= 1;
        if (left <= 0) { refreshMe().then(render); return; }
        btn.textContent = `${t("wheelNext")} ${fmt(left)}`;
      }, 1000);
    }
    return h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t("wheel"), h("span", { class: "badge" }, `${t("wheelEvery")} ${me.wheel_hours ?? 4} ${t("hours")}`)),
      h("p", { class: "note" }, t("wheelText")),
      h("div", { class: "wheel" }, h("div", { class: "wheel-pointer" }), disc, h("div", { class: "wheel-hub" })),
      h("div", { style: "margin-top:18px" }, btn));
  }

  // Boost en cours : le montant affiche est celui qui sera credite.
  const boosted = (n) => (me?.boost ? n + Math.floor((n * (status?.boost_percent || 0)) / 100) : n);

  function bonusCard() {
    const rewards = status?.daily_streak_rewards?.length ? status.daily_streak_rewards : [me.daily_bonus_tokens || 5];
    const streak = me.daily_streak || 0;
    const nextDaily = rewards[(me.daily_done ? Math.max(streak - 1, 0) : streak) % rewards.length];
    const btn = h("button", {
      class: "btn gold", style: "width:100%", disabled: me.daily_done || (!miningOn() && me.claims_today < 1),
      onclick: async (e) => {
        const target = e.currentTarget;
        const r = await api("daily");
        if (r.ok) burst(target, `+${tk(r.tokens)}`);
        toast(r.ok ? `${tk(r.tokens)} ${t("won")}` : message(r), r.ok ? "good" : "bad");
        await refreshMe();
        render();
      },
    }, me.daily_done ? t("done") : `${t("collect")} ${tk(boosted(nextDaily))}`);
    // Calendrier de 7 jours : la case du jour brille, les jours deja pris sont coches.
    const pos = streak > 0 ? ((streak - 1) % rewards.length) + 1 : 0;
    const todayBox = me.daily_done ? pos : (streak % rewards.length) + 1;
    return h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t("bonus"), streak > 0 ? h("span", { class: "badge warn" }, `${streak} ${t("streakLbl")}`) : null),
      h("div", { class: "cal" }, rewards.map((v, i) => h("div", { class: `cal-day${i + 1 < todayBox || (me.daily_done && i + 1 === todayBox) ? " got" : ""}${i + 1 === todayBox ? " today" : ""}` },
        h("span", {}, `${t("dayN")} ${i + 1}`), h("b", {}, num(boosted(v))), i + 1 < todayBox || (me.daily_done && i + 1 === todayBox) ? icon("check") : coin()))),
      h("p", { class: "note", style: "margin:12px 0" }, t("bonusText")),
      btn);
  }

  const QUEST = {
    claims: { ico: "bolt", go: () => { location.hash = "faucet"; } },
    earned: { ico: "wallet", go: () => { location.hash = "earn"; } },
    ptc: { ico: "eye", go: () => { location.hash = "ptc"; } },
    links: { ico: "link", go: () => { location.hash = "links"; } },
    surveys: { ico: "quests", go: () => { location.hash = "surveys"; } },
    offers: { ico: "gift", go: () => { location.hash = "offers"; } },
  };
  const questName = (c) => {
    const key = W[`q_${c.goal}`] ? `q_${c.goal}` : "q_claims";
    const w = [W[key][0], L[key] || W[key][1]];
    const n = c.goal === "earned" ? tk(c.target) : fmtInt(c.target);
    return w[FR ? 0 : 1][c.target > 1 ? 1 : 0].replace("{n}", n);
  };

  function questsCard(period = "day") {
    const list = (me.challenges || []).filter((c) => (c.period || "day") === period);
    if (!list.length) return null;
    const done = list.filter((c) => c.done).length;
    return h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t(period === "week" ? "questsWeek" : "questsTitle"), h("span", { class: `badge${done === list.length && list.length ? " good" : ""}` }, `${done}/${list.length}`)),
      list.map((c) => {
        const q = QUEST[c.goal] || QUEST.claims;
        const progress = Math.min(Number(c.progress) || 0, c.target);
        const ready = progress >= c.target && !c.done;
        const fmtP = (n) => (c.goal === "earned" ? fmtInt(n) : String(n));
        const btn = c.done
          ? h("button", { class: "btn small", type: "button", disabled: true }, icon("check"))
          : ready
            ? h("button", {
                class: "btn small gold", type: "button",
                onclick: async (e) => {
                  const target = e.currentTarget;
                  target.disabled = true;
                  const r = await api("challenge", { id: c.id });
                  if (r.ok) burst(target, `+${tk(r.tokens)}`);
                  toast(r.ok ? `${tk(r.tokens)} ${t("won")}` : message(r), r.ok ? "good" : "bad");
                  await refreshMe();
                  render();
                },
              }, `${t("claimQuest")}`)
            : h("button", { class: "btn small ghost", type: "button", onclick: q.go }, t("go"));
        return h("div", { class: `row quest${c.done ? " is-done" : ready ? " is-ready" : ""}` },
          h("div", { class: "row-ico" }, icon(c.done ? "check" : q.ico)),
          h("div", { class: "row-main" },
            h("h3", {}, questName(c)),
            h("div", { class: "progress" }, h("i", { style: `width:${(progress / c.target) * 100}%` })),
            h("div", { class: "quest-sub" },
              h("span", { class: "row-sub" }, `${fmtP(progress)} / ${fmtP(c.target)}`),
              h("span", { class: "reward" }, "+", coin(), num(boosted(c.reward_tokens))))),
          btn);
      }));
  }

  // Mines : grille 5 x 5, les bombes ne sont connues qu'en fin de partie.
  let minesEnd = null;
  function minesCard() {
    const g = me.games || {};
    const active = g.mines_active;
    const rewards = g.mines_rewards || [];
    const revealed = new Set(minesEnd?.revealed || active?.revealed || []);
    const bombs = new Set(minesEnd?.bombs || []);
    const playing = Boolean(active) && !minesEnd;
    const gain = active?.gain || 0;
    const grid = h("div", { class: "mines-grid" }, [...Array(25).keys()].map((c) => {
      const isBomb = bombs.has(c);
      const open = revealed.has(c);
      return h("button", {
        type: "button",
        class: `tile${open ? " open" : ""}${isBomb ? " bomb" : ""}${minesEnd?.bomb === c ? " hit" : ""}`,
        disabled: !playing || open, "aria-label": `Case ${c + 1}`,
        onclick: async (e) => {
          const r = await api("mines_reveal", { cell: c });
          if (!r.ok) { toast(message(r), "bad"); return; }
          if (r.status === "lost") { minesEnd = r; toast(t("boom"), "bad"); }
          else if (r.status === "won") { minesEnd = r; burst(e.currentTarget, `+${tk(r.tokens)}`); toast(`${tk(r.tokens)} ${t("won")}`, "good"); }
          await refreshMe();
          render();
        },
      }, open ? icon("star") : isBomb ? icon("bomb") : null);
    }));
    const startBtn = h("button", {
      class: "btn", style: "width:100%", disabled: (g.mines_left ?? 0) < 1 || me.claims_today < 1,
      onclick: async () => {
        const r = await api("mines_start");
        if (!r.ok) { toast(message(r), "bad"); return; }
        minesEnd = null;
        await refreshMe();
        render();
      },
    }, `${t("newGame")} · ${g.mines_left ?? 0}`);
    const cashBtn = h("button", {
      class: "btn gold", style: "width:100%", disabled: gain < 1,
      onclick: async (e) => {
        const target = e.currentTarget;
        const r = await api("mines_cashout");
        if (!r.ok) { toast(message(r), "bad"); return; }
        minesEnd = r;
        burst(target, `+${tk(r.tokens)}`);
        toast(`${tk(r.tokens)} ${t("won")}`, "good");
        await refreshMe();
        render();
      },
    }, `${t("cashout")} ${tk(gain)}`);
    return h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t("mines"), h("span", { class: "badge" }, `${g.mines_left ?? 0} ${t("playsLeft")}`)),
      h("p", { class: "note" }, me.claims_today < 1 ? t("needRoll") : t("minesText")),
      playing ? h("div", { class: "mines-bar" },
        h("span", {}, `${t("gainNow")} `, h("b", {}, tk(gain))),
        active.next ? h("span", {}, `${t("nextTile")} `, h("b", {}, tk(active.next))) : null) : null,
      grid,
      h("div", { style: "margin-top:14px" }, playing ? cashBtn : startBtn),
      !playing ? h("p", { class: "note", style: "margin:10px 0 0;text-align:center" }, rewards.map((r) => fmtInt(r)).join(" · ")) : null);
  }

  // Dice : cible au choix, gain inversement proportionnel a la chance.
  let diceTarget = 50;
  function diceCard() {
    const g = me.games || {};
    const unit = g.dice_unit || 0;
    const prize = () => Math.floor((unit * 100) / diceTarget);
    const info = h("p", { class: "dice-info" });
    const show = () => { info.replaceChildren(`${t("diceWin")} `, h("b", {}, String(diceTarget)), ` · ${diceTarget} % ${t("chance")} · `, h("b", { class: "gold-text" }, `+${tk(prize())}`)); };
    show();
    const digits = h("div", { class: "roll-digits dice-digits" }, "00");
    const range = h("input", { type: "range", min: 5, max: 95, value: diceTarget, class: "range", ariaLabel: t("diceWin"), oninput: (e) => { diceTarget = Number(e.target.value); show(); } });
    const btn = h("button", {
      class: "btn big", disabled: (g.dice_left ?? 0) < 1 || me.claims_today < 1,
      onclick: async () => {
        btn.disabled = true;
        const r = await api("dice", { target: diceTarget });
        if (!r.ok) { toast(message(r), "bad"); btn.disabled = false; return; }
        await new Promise((res) => {
          if (reduceMotion) return res();
          const id = setInterval(() => { digits.textContent = String(Math.floor(Math.random() * 100)).padStart(2, "0"); }, 50);
          setTimeout(() => { clearInterval(id); res(); }, 900);
        });
        digits.textContent = String(r.roll).padStart(2, "0");
        digits.classList.toggle("win", r.win);
        digits.classList.toggle("lose", !r.win);
        if (r.win) { burst(btn, `+${tk(r.tokens)}`); toast(`${tk(r.tokens)} ${t("won")}`, "good"); }
        else toast(t("diceLost"), "info");
        setTimeout(async () => { await refreshMe(); render(); }, 1600);
      },
    }, `${t("diceGo")} · ${g.dice_left ?? 0}`);
    return h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t("dice"), h("span", { class: "badge" }, `${g.dice_left ?? 0} ${t("rollsLeft")}`)),
      h("p", { class: "note" }, me.claims_today < 1 ? t("needRoll") : t("diceText")),
      h("div", { class: "roll" }, digits),
      info, range, btn);
  }

  let gameSel = null;
  function gamesView() {
    const g = me.games || {};
    const games = [
      { key: "wheel", tone: "--c1:#ffd34d;--c2:#ff8f1c", ico: "wheel", name: t("wheel"), text: t("wheelShort"), ok: !me.wheel_done && me.claims_today >= (me.wheel_min_claims ?? 1),
        state: me.wheel_done ? `${t("wheelNext")} ${Math.ceil((me.wheel_retry_after || 0) / 60)} ${t("minutes")}` : t("ready"), card: wheelCard },
      { key: "mines", tone: "--c1:#45e3a6;--c2:#11a771", ico: "grid", name: t("mines"), text: t("minesShort"), ok: (g.mines_left ?? 0) > 0 || Boolean(g.mines_active),
        state: `${g.mines_left ?? 0} ${t("playsLeft")}`, card: minesCard },
      { key: "dice", tone: "--c1:#b48cff;--c2:#6b3dff", ico: "dice", name: t("dice"), text: t("diceShort"), ok: (g.dice_left ?? 0) > 0,
        state: `${g.dice_left ?? 0} ${t("rollsLeft")}`, card: diceCard },
    ];
    const current = games.find((x) => x.key === gameSel);
    if (current) {
      return h("div", { class: "stack" },
        h("a", { class: "btn ghost small", href: "#games", style: "align-self:flex-start;width:auto" }, `← ${t("pickGame")}`),
        h("div", { class: "game-solo" }, current.card(), adSlot("game")));
    }
    return h("div", { class: "stack" },
      h("a", { class: "shop-banner", href: "#shop" },
        h("span", { class: "game-ico", style: "--c1:#ffd34d;--c2:#ff5f8f" }, icon("shop")),
        h("span", { class: "shop-banner-text" }, h("b", {}, t("shopTile")), h("span", {}, t("shopTileText"))),
        h("span", { class: "coin-pill" }, coin(), num(me.available))),
      h("div", { class: "panel-title", style: "margin:2px 2px 0" }, t("pickGame")),
      h("div", { class: "game-menu" }, games.map((x) =>
        h("a", { class: `game-tile${x.ok ? " ready" : ""}`, href: `#${x.key}` },
          h("span", { class: "game-ico", style: x.tone }, icon(x.ico)),
          h("span", { class: "game-name" }, x.name),
          h("span", { class: "game-text" }, x.text),
          h("span", { class: `badge ${x.ok ? "good" : ""}` }, x.state),
          h("span", { class: "btn small", style: "margin-top:auto" }, t("play"))))), adSlot("in_content"));
  }

  const questsView = () => h("div", { class: "stack" }, bonusCard(), questsCard("day"), adSlot("in_content"), questsCard("week"));

  // VIP : abonnement paye sur la page FaucetPay, active au retour du paiement.
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  function vipView() {
    const s = status || {};
    const usdt = Math.ceil(+((s.vip_price_eur || 0) * (s.usdt_per_eur || 1) * 10000).toFixed(6)) / 10000;
    const eur = (s.vip_price_eur || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const msg = h("div", { role: "alert" });
    const pay = h("button", {
      class: "btn big gold", type: "button", style: "width:100%",
      onclick: async () => {
        pay.disabled = true;
        const r = await api("vip_order");
        pay.disabled = false;
        if (!r.ok) { msg.replaceChildren(h("div", { class: "notice bad", style: "margin-top:12px" }, message(r))); return; }
        const f = h("form", { method: "post", action: r.form.action, style: "display:none" },
          Object.entries(r.form.fields).map(([name, value]) => h("input", { type: "hidden", name, value })));
        document.body.append(f);
        f.submit();
      },
    }, me.vip ? t("vipExtend") : t("vipPay"));
    const perk = (ico, title, sub) => h("div", { class: "vip-perk" },
      h("span", { class: "vip-perk-ico" }, icon(ico)), h("div", {}, h("b", {}, title), h("div", { class: "row-sub" }, sub)));
    return h("div", { class: "stack" },
      h("a", { class: "btn ghost small", href: "#profile", style: "align-self:flex-start;width:auto" }, `← ${t("back")}`),
      h("section", { class: "panel vip-hero" },
        h("div", { class: "vip-crown" }, icon("crown")),
        h("h2", {}, me.vip ? t("vipActive") : t("vipTitle")),
        me.vip ? h("p", { class: "vip-until" }, `${t("vipUntil")} ${fmtDate(me.vip_until)}`) : h("p", { class: "note", style: "margin:6px 0 0" }, t("vipText")),
        h("div", { class: "vip-price" }, h("b", {}, `${eur} €`), h("span", {}, ` / ${s.vip_days || 30} ${t("vipFor")}`)),
        h("div", { class: "row-sub" }, `≈ ${usdt.toLocaleString(locale, { maximumFractionDigits: 4 })} USDT`)),
      h("section", { class: "panel" },
        h("div", { class: "vip-perks" },
          perk("eye", t("vipNoAds"), t("vipNoAdsSub")),
          perk("earn", `+${s.vip_task_bonus ?? 0} % ${t("vipTasks")}`, t("vipTasksSub")),
          perk("profile", `${s.vip_referral_percent ?? 0} % ${t("vipRef")}`, `${t("vipRefInstead")} ${s.referral_percent ?? 0} %`),
          perk("crown", t("vipBadge"), t("vipBadgeSub"))),
        h("div", { style: "margin-top:16px" }, pay, msg),
        catalog?.vip ? h("div", { style: "margin-top:10px" }, buyButton(t("payCoins"), catalog.vip.price, () => api("shop_buy", { item: "vip" }), "btn big")) : null,
        h("p", { class: "note", style: "margin:10px 0 0;font-style:italic;text-align:center" }, t("vipDelay")),
        h("div", { style: "text-align:center;margin-top:8px" }, h("button", { class: "btn ghost small", type: "button",
          onclick: async () => { await refreshMe(); render(); } }, t("vipRefresh"))),
        h("p", { class: "note", style: "margin:14px 0 0" }, t("vipFair"))));
  }

  // Espace annonceur : l'annonceur paie sur la page FaucetPay, la campagne passe ensuite en verification.
  let adForm = { title: "", url: "https://", duration: 10, views: 1000, kind: "window" };
  function advertiseView() {
    const price = () => {
      const eurv = adForm.views * (status?.ad_price_eur_per_view || 0) * adForm.duration / 10;
      return { eur: eurv, usdt: Math.ceil(+(eurv * (status?.usdt_per_eur || 1) * 10000).toFixed(6)) / 10000 };
    };
    const total = h("div", { class: "ad-total" });
    const showTotal = () => { const p = price();
      const tok = Math.ceil(+(p.eur * (status?.tokens_per_eur || 10000)).toFixed(4));
      coinsLabel.replaceChildren(`${t("payCoins")} · `, coinSvg(), fmtInt(tok));
      payCoins.disabled = (me.available || 0) < tok; total.replaceChildren(h("span", {}, t("adTotal")), h("b", {}, `${p.usdt.toLocaleString(locale, { maximumFractionDigits: 4 })} USDT`), h("span", { class: "row-sub" }, `≈ ${p.eur.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`)); };
    const set = (k, cast = (v) => v) => (e) => { adForm[k] = cast(e.target.value); showTotal(); };
    const msg = h("div", { role: "alert" });
    const pay = h("button", { class: "btn big", type: "submit" }, t("adPay"));
    const coinsLabel = h("span", {});
    const payCoins = h("button", {
      class: "btn big gold", type: "button", style: "margin-top:10px",
      onclick: async () => {
        payCoins.disabled = true;
        const r = await api("ad_buy_tokens", adForm);
        payCoins.disabled = false;
        if (!r.ok) { msg.replaceChildren(h("div", { class: "notice bad", style: "margin-top:12px" }, message(r))); return; }
        burst(payCoins, `-${fmtInt(r.tokens)}`);
        msg.replaceChildren(h("div", { class: "notice good", style: "margin-top:12px" }, t("ad_review")));
        await refreshMe();
        render();
      },
    }, coinsLabel);
    showTotal();
    const list = h("div", {}, h("p", { class: "empty" }, "…"));
    api("ad_orders").then((r) => {
      if (!r.ok) return;
      const label = (o) => o.status === "pending" ? ["ad_pending", "warn"] : o.review ? ["ad_review", "warn"] : o.enabled ? ["ad_active", "good"] : ["ad_stopped", "bad"];
      list.replaceChildren(...(r.orders.length ? r.orders.map((o) => {
        const [k, cls] = label(o);
        const max = Math.max(1, ...(o.daily || []).map((d) => d.n));
        const canToggle = o.campaign_id && !o.review && o.status === "paid" && o.shown < o.views;
        return h("div", { class: "camp" },
          h("div", { class: "list-line", style: "border:0;padding:0" },
            h("div", { style: "min-width:0" }, h("div", { style: "color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, o.title),
              h("div", { class: "row-sub" }, `${t(`kind_${o.kind || "window"}`)} · ${fmtInt(o.shown)} / ${fmtInt(o.views)} ${t("views")} · ${o.duration} s · ${o.tokens_paid ? tk(o.tokens_paid) : `${Number(o.amount_usdt)} USDT`}`)),
            h("span", { class: `badge ${cls}` }, t(k))),
          h("div", { class: "progress" }, h("i", { style: `width:${Math.min(100, (o.shown / Math.max(o.views, 1)) * 100)}%` })),
          (o.daily || []).length ? h("div", { class: "bars", title: t("views14") }, (o.daily || []).map((d) => h("i", { style: `height:${Math.max(6, (d.n / max) * 100)}%`, title: `${d.day} : ${d.n}` }))) : null,
          canToggle ? h("button", { class: "btn small ghost", type: "button", onclick: async () => {
            const r2 = await api("ad_toggle", { id: o.campaign_id, enabled: !o.enabled });
            toast(r2.ok ? t("saved") : message(r2), r2.ok ? "good" : "bad");
            render();
          } }, o.enabled ? t("pause") : t("resume")) : null);
      }) : [h("p", { class: "empty" }, t("noAds"))]));
    });
    return h("div", { class: "stack" },
      h("section", { class: "panel" },
        h("div", { class: "panel-title" }, t("advertise")),
        h("p", { class: "note" }, t("adText")),
        h("form", {
          onsubmit: async (e) => {
            e.preventDefault();
            pay.disabled = true;
            const r = await api("ad_order", adForm);
            pay.disabled = false;
            if (!r.ok) { msg.replaceChildren(h("div", { class: "notice bad", style: "margin-top:12px" }, message(r))); return; }
            // Envoi classique du formulaire : l'annonceur arrive sur la page de paiement FaucetPay.
            const f = h("form", { method: "post", action: r.form.action, style: "display:none" },
              Object.entries(r.form.fields).map(([name, value]) => h("input", { type: "hidden", name, value })));
            document.body.append(f);
            f.submit();
          },
        },
          h("label", { class: "field" }, t("adTitle"), h("input", { value: adForm.title, maxLength: 60, required: true, oninput: set("title"), style: "margin-top:6px" })),
          h("label", { class: "field" }, t("adUrl"), h("input", { type: "url", value: adForm.url, required: true, oninput: set("url"), style: "margin-top:6px" })),
          h("div", { class: "grid2", style: "gap:12px" },
            h("label", { class: "field" }, t("adKind"), h("select", { style: "margin-top:6px", onchange: set("kind") },
              [["window", t("kindWindow")], ["iframe", t("kindIframe")], ["video", t("kindVideo")]].map(([v, l]) => h("option", { value: v, selected: v === adForm.kind }, l)))),
            h("label", { class: "field" }, t("adDuration"), h("select", { style: "margin-top:6px", onchange: set("duration", Number) },
              [10, 15, 20, 30].map((s) => h("option", { value: s, selected: s === adForm.duration }, `${s} s`)))),
            h("label", { class: "field" }, t("adViews"), h("input", { type: "number", min: 100, max: 100000, step: 100, value: adForm.views, oninput: set("views", Number), style: "margin-top:6px" }))),
          total, pay, payCoins, msg,
          h("p", { class: "note", style: "margin:12px 0 0" }, t("adRules")))),
      h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("myAds")), list));
  }

  // Portefeuille
  const SOURCE = {
    faucet: ["Tirage", "Roll"], daily: ["Bonus quotidien", "Daily bonus"], challenge: ["Quête", "Quest"], referral: ["Parrainage", "Referral"], wheel: ["Roue du jour", "Daily wheel"],
    ptc: ["Pub", "Ad"], shortlink: ["Lien", "Link"], offer: ["Offre", "Offer"], offer_reversed: ["Offre annulée", "Offer reversed"],
    mines: ["Mines", "Mines"], dice: ["Dice", "Dice"], validation: ["Validation", "Approval"], rejected: ["Gain refusé", "Refused"], withdrawal: ["Retrait", "Withdrawal"], withdrawal_refund: ["Retrait rendu", "Refund"],
    shop: ["Boutique", "Shop"], tournament: ["Tournoi", "Tournament"], achievement: ["Succès", "Achievement"], promo: ["Code promo", "Promo code"],
    mining: ["Minage", "Mining"], seized: ["Solde saisi", "Balance seized"], ad_refund: ["Pub refusée, Coins rendus", "Ad refused, Coins back"],
  };
  // « Des que ton solde atteint X, il part tout seul » + barre de progression.
  function autoPayBox() {
    if (!status?.auto_payout) return null;
    const min = status.min_withdraw_tokens || 1;
    const have = Math.max(0, me.available || 0);
    return h("div", { class: "autopay" },
      h("p", {}, icon("bolt"), `${t("autoPay")} ${tk(min)}, ${t("autoPay2")}`),
      h("div", { class: "progress" }, h("i", { style: `width:${Math.min(100, (have / min) * 100)}%` })),
      h("span", { class: "row-sub" }, have >= min ? t("autoSoon") : `${num(min - have)} ${unitLabel()} ${t("autoLeft")}`));
  }

  const wdAmount = (w) => (w.coin === "BTC" ? `${Number(w.amount_units).toLocaleString(LOCALE)} sat` : `${units(w.amount_units, w.decimals)} ${w.coin}`);
  function walletView() {
    const c = me.coins.find((x) => x.code === me.payout_coin) || me.coins[0];
    const est = c && me.available > 0 ? (me.available / (status?.tokens_per_eur || 10000)) * c.per_eur : 0;
    const btn = h("button", {
      class: "btn big", disabled: me.available <= 0 || me.available < (status?.min_withdraw_tokens || 1) || !c || status?.paused,
      onclick: async () => {
        btn.disabled = true;
        const r = await api("withdraw");
        if (r.ok) { burst(btn, wdAmount(r)); toast(`${wdAmount(r)} ${t("wdDone")} ${r.payout_id}`, "good"); }
        else toast(message(r), r.code === "pending" ? "info" : "bad");
        await refreshMe();
        render();
      },
    }, t("withdrawNow"));
    const seg = h("div", { class: "seg", role: "tablist" }, [["withdrawals", t("withdrawals")], ["activity", t("activity")]].map(([k, label]) =>
      h("button", { type: "button", role: "tab", "aria-selected": String(walletTab === k), onclick: () => { walletTab = k; render(); } }, label)));
    const bucket = { available: t("available"), pending: t("pending"), validated: t("validated") };
    const list = walletTab === "withdrawals"
      ? (me.withdrawals.length ? me.withdrawals.map((w) => h("div", { class: "list-line" },
          h("div", {}, h("div", { class: "amount" }, wdAmount(w)), h("div", { class: "row-sub" }, `${when(w.at)}${w.fee_units > 0 ? ` · ${t("feeShort")} ${w.fee_units} sat` : ""}`)),
          h("span", { class: `badge ${w.status === "paid" ? "good" : w.status === "failed" ? "bad" : "warn"}` }, t(`st_${w.status}`))))
        : h("p", { class: "empty" }, t("noWd")))
      : (me.history.length ? me.history.map((r) => h("div", { class: "list-line" },
          h("div", {}, h("div", { style: "color:var(--ink);font-weight:600" }, tr(SOURCE[r.source] || [r.source, r.source], `s:${r.source}`)), h("div", { class: "row-sub" }, `${when(r.at)} · ${bucket[r.bucket]}`)),
          h("span", { class: `amount ${r.delta > 0 ? "plus" : "minus"}` }, `${r.delta > 0 ? "+" : ""}${fmtInt(r.delta)}`)))
        : h("p", { class: "empty" }, t("noHistory")));

    return h("div", { class: "stack" },
      h("section", { class: "panel" },
        h("div", { class: "panel-title" }, t("available"), h("span", {}, t("rate"))),
        h("div", { class: "wallet-amount" }, coin(), num(me.available)),
        h("p", { class: "note", style: "margin:6px 0 14px" }, `${t("worth")} ${eur(me.available)}${c ? ` · ≈ ${est.toFixed(8).replace(/\.?0+$/, "")} ${c.code}` : ""}`),
        me.coins.length > 1 ? h("label", { class: "field" }, t("receiveIn"),
          h("select", {
            style: "margin-top:6px",
            onchange: async (e) => {
              const r = await api("set_coin", { coin: e.target.value });
              if (!r.ok) toast(message(r), "bad");
              await refreshMe();
              render();
            },
          }, me.coins.map((x) => h("option", { value: x.code, selected: x.code === me.payout_coin }, `${x.code} · ${x.name}`)))) : null,
        autoPayBox(),
        btn,
        (status?.min_withdraw_tokens || 1) > 1 ? h("p", { class: "note", style: "margin:10px 0 0;text-align:center" }, `${t("wdMin")} ${status.min_withdraw_sats > 0 && c?.code === "BTC" ? `${status.min_withdraw_sats} sat` : tk(status.min_withdraw_tokens)}`) : null,
        h("p", { class: "note", style: "margin:10px 0 0;font-style:italic;text-align:center" }, t("wdDelay")),
        h("p", { class: "note", style: "margin:12px 0 0;overflow-wrap:anywhere" }, `${t("sentTo")} `, h("b", { style: "color:var(--ink)" }, me.fp_address)),
        (me.pending > 0 || me.validated > 0) ? h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:12px" },
          me.pending > 0 ? h("span", { class: "badge warn" }, `${t("pending")} · ${tk(me.pending)}`) : null,
          me.validated > 0 ? h("span", { class: "badge good" }, `${t("validated")} · ${tk(me.validated)}`) : null) : null,
        me.validated > 0 ? h("p", { class: "note", style: "margin:8px 0 0" }, `${tk(me.validated)} ${t("wdValidated")}`) : null),
      h("section", { class: "panel" }, seg, list,
        h("button", { class: "btn small ghost", type: "button", style: "margin-top:12px;width:auto", onclick: exportHistory }, t("exportCsv"))));
  }

  // Formulaire du pseudo (chat, fenetre de securite, profil)
  function pseudoForm(onDone) {
    const input = h("input", { maxLength: 16, autocomplete: "nickname", value: me.pseudo || "", ariaLabel: t("pseudo"), pattern: "[A-Za-z0-9_.\\-]{3,16}" });
    const btn = h("button", { class: "btn", type: "submit", style: "width:100%" }, t("pseudoSave"));
    const msg = h("div", { role: "alert" });
    return h("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        btn.disabled = true;
        const r = await api("set_pseudo", { pseudo: input.value.trim() });
        btn.disabled = false;
        if (!r.ok) { msg.replaceChildren(h("div", { class: "notice bad", style: "margin-top:10px" }, message(r))); return; }
        me.pseudo = r.pseudo;
        toast(t("pseudoDone"), "good");
        updateHeader();
        onDone?.();
      },
    }, h("label", { class: "field" }, t("pseudoField"), h("div", { class: "input" }, icon("profile"), input)), btn, msg);
  }
  function passwordForm(onDone) {
    const pass = h("input", { type: "password", autocomplete: "new-password", minLength: 8, required: true });
    const msg = h("div", { role: "alert" });
    const save = h("button", { class: "btn", type: "submit", style: "width:100%" }, me.secured ? t("secChange") : t("secSave"));
    return h("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        save.disabled = true;
        const r = await api("set_password", { password: pass.value });
        save.disabled = false;
        if (r.ok) {
          session = r.session;
          store.set("cc.session", session);
          toast(t("secDone"), "good");
          await refreshMe();
          onDone?.();
        } else msg.replaceChildren(h("div", { class: "notice bad", style: "margin-top:10px" }, message(r)));
      },
    }, h("label", { class: "field" }, t("secNew"), h("div", { class: "input" }, icon("lock"), pass)), save, msg);
  }
  // Fenetre de securite, ouverte a chaque connexion.
  function securityPopup() {
    const close = () => { layer.remove(); document.body.classList.remove("no-scroll"); render(); };
    const box = h("div", { class: "sec-box panel" });
    const draw = () => box.replaceChildren(...[
      h("div", { class: "sec-head" }, h("span", { class: `sec-ico${me.secured ? " ok" : ""}` }, icon("lock")), h("h2", {}, t("secTitle"))),
      h("div", { class: `notice ${me.secured ? "good" : "warn"}` }, me.secured ? t("secOn") : t("secWarn")),
      passwordForm(draw),
      h("div", { class: "sec-sep" }),
      me.pseudo ? h("p", { class: "note" }, `${t("pseudoNow")} `, h("b", {}, me.pseudo)) : h("p", { class: "note" }, t("pseudoAsk")),
      me.pseudo ? null : pseudoForm(draw),
      h("button", { class: "btn ghost", type: "button", style: "width:100%;margin-top:12px", onclick: close }, me.secured && me.pseudo ? t("secClose") : t("secLater"))].filter(Boolean));
    const layer = h("div", { class: "frame-layer sec-layer", role: "dialog", "aria-modal": "true" }, box);
    draw();
    document.body.append(layer);
    document.body.classList.add("no-scroll");
  }

  // Profil : niveau, parrainage, securite
  function profileView() {
    const lv = levelOf(me.earned_total || 0);
    const url = `${location.origin}${location.pathname}?ref=${me.ref_code}`;
    const field = h("input", { readOnly: true, value: url, ariaLabel: t("refLink") });
    return h("div", { class: "stack" },
      h("section", { class: "panel", style: "text-align:center" },
        h("div", { class: `avatar${me.vip ? " vip" : ""}${frameCls(me)}`, style: "width:72px;height:72px;margin:0 auto;font-size:28px;border-radius:20px" }, (me.fp_address || "?").slice(0, 1).toUpperCase(), h("span", { class: "lvl" }, String(lv.lvl)),
          me.vip ? h("span", { class: "crown" }, icon("crown")) : null),
        me.vip ? h("div", { style: "margin-top:12px" }, h("span", { class: "badge vip-badge" }, icon("crown"), t("vip"))) : null,
        h("h2", { class: nameCls(me).trim() || null, style: "margin-top:14px;overflow-wrap:anywhere" }, me.fp_address),
        me.title && cosmeticName(me.title) ? h("div", { style: "margin-top:6px" }, h("span", { class: "title-tag" }, cosmeticName(me.title))) : null,
        h("p", { class: "note", style: "margin:4px 0 10px" }, `${t("level")} ${lv.lvl} · ${lvText(lv)} · ${multText(lv.mult)} ${t("onRolls")}`),
        h("div", { class: "xp", style: "width:100%;height:10px" }, h("i", { style: `width:${lv.pct}%` }))),
      h("div", { class: "grid2" },
        h("a", { class: "panel ref-card", href: "#referral" }, h("div", { class: "panel-title" }, t("referral")),
          h("p", { class: "note" }, `${me.vip ? status?.vip_referral_percent ?? 0 : status?.referral_percent ?? 0} % ${t("refText")}`),
          h("div", { class: "bal-grid" }, h("div", { class: "bal" }, h("span", {}, t("refCount")), h("b", {}, fmtInt(me.referrals))),
            h("div", { class: "bal" }, h("span", {}, t("refEarned")), h("b", {}, num(me.referral_earned))))),
        h("section", { class: "panel" },
          h("div", { class: "panel-title" }, t("security")),
          h("div", { class: `notice ${me.secured ? "good" : "info"}`, style: "margin-bottom:12px" }, me.secured ? t("secOn") : t("secOff")),
          passwordForm(render),
          h("div", { class: "sec-sep" }),
          h("div", { class: "panel-title" }, t("pseudo")),
          h("p", { class: "note" }, me.pseudo ? `${t("pseudoNow")} ${me.pseudo}` : t("pseudoAsk")),
          pseudoForm(render))),
      h("a", { class: "row ad-link", href: "#advertise" },
        h("div", { class: "row-ico", style: "background:rgba(255,204,61,.14);color:var(--gold)" }, icon("megaphone")),
        h("div", { class: "row-main" }, h("h3", {}, t("advertise")), h("div", { class: "row-sub" }, t("adText"))),
        h("span", { class: "chev" }, "›")),
      h("button", {
        class: "btn ghost", type: "button", style: "width:100%",
        onclick: async () => {
          await api("logout");
          session = null;
          me = null;
          store.del("cc.session");
          location.hash = "";
          render();
        },
      }, t("logout")),
      h("div", { class: "foot-links" }, h("a", { href: "legal.html" }, t("legal")), h("a", { href: "https://faucetpay.io", rel: "noopener", target: "_blank" }, "FaucetPay")));
  }

  // Coquille facon VieFaucet : barre du haut, menu lateral (tiroir sur mobile), 5 onglets en bas ------
  const EARN_SUB = ["ptc", "links", "surveys", "offers"];
  const GAME_SUB = ["wheel", "mines", "dice"];
  // [route, cle de texte, icone] par groupe du menu
  const MENU = [
    [null, [["", "dashboard", "home"]]],
    ["menuEarn", [["faucet", "faucet", "bolt"], ["sessions", "sessions", "quests"], ["ptc", "ptc", "eye"], ["links", "links", "link"], ["surveys", "surveys", "quests"], ["offers", "offers", "gift"]]],
    ["menuRewards", [["quests", "quests", "flag"], ["achievements", "achievements", "trophy"]]],
    ["menuCommunity", [["chat", "chat", "chat"], ["referral", "referral", "profile"]]],
    ["menuWallet", [["wallet", "wallet", "wallet"], ["advertise", "advertise", "megaphone"]]],
    ["menuAccount", [["profile", "profile", "profile"], ["support", "support", "mail"], ["faq", "faq", "quests"]]],
  ];
  const MENU_MINING = MENU.filter(([g]) => g !== null).map(([g, items]) => [g, items
    .filter(([k]) => k !== "sessions")
    .map((it) => (it[0] === "faucet" ? ["", it[1], it[2]] : it))]);
  const menuNow = () => (miningOn() ? MENU_MINING : MENU);
  const ROUTES = new Set(MENU.flatMap(([, items]) => items.map(([k]) => k)).concat(["earn", "rewards", "proofs", "notifications", "faucet", "sessions"]));
  const TABS_ALL = [["", "home", "home"], ["faucet", "faucet", "bolt"], ["earn", "earn", "earn"], ["rewards", "rewardsShort", "trophy"]];
  const TABS_MINING = [["", "faucet", "bolt"], ["earn", "earn", "earn"], ["rewards", "rewardsShort", "trophy"]];
  const routeNow = () => {
    const r = location.hash.replace("#", "").split("?")[0];
    return ROUTES.has(r) ? r : "";
  };

  // Pastilles : ce qui attend le membre
  function pending() {
    const rollReady = miningOn() ? Boolean(mining && !mining.base) : !status?.paused && (me.retry_after || 0) - since() <= 0 && energyNow() >= 1;
    const questsReady = (me.challenges || []).filter((c) => !c.done && (Number(c.progress) || 0) >= c.target).length;
    const dailyReady = !me.daily_done && me.claims_today >= 1;
    const wheelReady = !me.wheel_done && me.claims_today >= (me.wheel_min_claims ?? 1);
    const g = me.games || {};
    return {
      faucet: rollReady ? "!" : null,
      quests: questsReady + (dailyReady ? 1 : 0) || null,
      wheel: wheelReady ? "!" : null,
      mines: me.claims_today >= 1 && (g.mines_left ?? 0) > 0 ? g.mines_left : null,
      dice: me.claims_today >= 1 && (g.dice_left ?? 0) > 0 ? g.dice_left : null,
      rollReady, questsReady, dailyReady, wheelReady,
    };
  }

  function sideMenu(route, onPick) {
    const p = pending();
    return h("nav", { class: "side-menu", ariaLabel: "Menu" }, menuNow().map(([group, items]) => h("div", { class: "side-group" },
      group ? h("div", { class: "side-title" }, t(group)) : null,
      items.map(([k, label, ico]) => h("a", {
        class: "side-link", href: `#${k}`, "aria-current": k === route ? "page" : undefined, onclick: onPick,
      }, icon(ico), h("span", {}, t(label)), (p[k] || (k === "" && miningOn() && p.faucet)) ? h("span", { class: "side-badge" }, String(p[k] || p.faucet)) : null)))),
      h("div", { class: "side-foot" },
        h("a", { href: "#proofs" }, t("proofs")), h("a", { href: "legal.html" }, t("legal")),
        h("button", { type: "button", class: "side-out", onclick: logout }, t("logout"))));
  }

  async function logout() {
    await api("logout");
    session = null;
    me = null;
    store.del("cc.session");
    location.hash = "";
    render();
  }

  function openDrawer() {
    const close = () => { layer.remove(); document.body.classList.remove("no-scroll"); };
    const layer = h("div", { class: "drawer", onclick: (e) => { if (e.target === layer) close(); } },
      h("div", { class: "drawer-panel" },
        h("div", { class: "drawer-head" }, h("span", { class: "logo" }, coinSvg(), cfg.SITE_NAME),
          h("button", { type: "button", class: "icon-btn", ariaLabel: t("close"), onclick: close }, "✕")),
        sideMenu(routeNow(), close)));
    document.body.append(layer);
    document.body.classList.add("no-scroll");
  }

  // Fil d'activite : retraits recents (et gains valides quand le serveur les envoie).
  function liveFeed(limit = 8) {
    const list = (status?.recent || []).slice(0, limit);
    return h("section", { class: "panel live" },
      h("div", { class: "panel-title" }, h("span", { class: "live-dot" }, t("liveFeed"))),
      list.length ? list.map((r) => h("div", { class: "live-row" },
        h("span", { class: "live-who" }, r.who),
        h("span", { class: "live-what" }, r.kind ? r.kind : t("withdrawal1")),
        h("b", {}, payText(r)))) : h("p", { class: "empty" }, t("noActivity")));
  }

  function shell() {
    const route = routeNow();
    header = h("div", { class: "topbar-right" });
    updateHeader();
    const p = pending();
    const main = h("main", { class: "main", id: "main" },
      status?.paused ? h("div", { class: "notice warn", style: "margin-bottom:14px" }, t("paused")) : null,
      adSlot("header"),
      viewFor(route),
      adSlot("footer"));
    const tabs = h("nav", { class: "tabbar", ariaLabel: "Menu" },
      (miningOn() ? TABS_MINING : TABS_ALL).map(([k, label, ico]) => h("a", {
        class: "tab", href: `#${k}`,
        "aria-current": (k === route || (k === "earn" && EARN_SUB.includes(route))
          || (k === "rewards" && ["quests", "achievements"].includes(route))) ? "page" : undefined,
      }, icon(ico), h("span", { class: "tab-label" }, t(label)),
        ((k === "faucet" || (k === "" && miningOn())) && p.rollReady) || (k === "rewards" && p.quests) ? h("span", { class: "dot" }) : null)),
      h("button", { type: "button", class: "tab", onclick: openDrawer }, icon("menu"), h("span", { class: "tab-label" }, t("more"))));
    return h("div", { class: "app" },
      ticker(),
      h("header", { class: "topbar" },
        h("button", { type: "button", class: "icon-btn burger", ariaLabel: t("menu"), onclick: openDrawer }, icon("menu")),
        h("a", { class: "logo", href: "#" }, coinSvg(), h("span", {}, cfg.SITE_NAME)),
        header),
      h("div", { class: "layout" },
        h("aside", { class: "side" }, sideMenu(route), adSlot("side_left")),
        main,
        h("aside", { class: "rail" }, adSlot("side_right"), liveFeed())),
      adSlot("sticky_mobile"),
      tabs);
  }

  // Mini classement dans la colonne de droite
  function railBoard() {
    const box = h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("tourney")), h("p", { class: "empty" }, "…"));
    api("board").then((r) => {
      if (!r.ok || !box.isConnected) return;
      box.replaceChildren(h("div", { class: "panel-title" }, h("a", { href: "#tournament" }, t("tourney")), r.me ? h("span", { class: "badge" }, `#${r.me.rank}`) : null),
        ...(r.top.length ? r.top.slice(0, 5).map((x) => h("div", { class: `board-row${x.me ? " me" : ""}` },
          h("span", { class: `rank r${Math.min(x.rank, 4)}` }, String(x.rank)),
          h("div", { class: "board-who" }, h("div", { class: `board-name${nameCls(x)}` }, x.me ? t("you") : x.who)),
          h("div", { class: "board-score" }, num(x.score)))) : [h("p", { class: "empty" }, t("tourneyEmpty"))]));
    });
    return box;
  }

  function viewFor(route) {
    if (EARN_SUB.includes(route)) { earnTab = route; return earnView(); }
    if (route === "earn") { earnTab = null; return earnView(); }
    if (GAME_SUB.includes(route)) { gameSel = route; minesEnd = route === "mines" ? minesEnd : null; return gamesView(); }
    if (route === "games") { gameSel = null; return gamesView(); }
    const views = {
      "": dashboardView, faucet: () => (miningOn() ? miningView() : faucetView()), sessions: sessionsView, rewards: rewardsView, quests: questsView, tournament: () => h("div", { class: "stack" }, tournamentCard()),
      achievements: achievementsView, chat: chatView, watch: watchView, promo: promoView, shop: shopView, vip: vipView, referral: referralView,
      wallet: walletView, advertise: advertiseView, profile: profileView, support: supportView, faq: faqView, proofs: proofsView,
      notifications: notificationsView,
    };
    if (miningOn() && ["", "faucet", "sessions"].includes(route)) return miningView();
    return (views[route] || dashboardView)();
  }

  // Tableau de bord ---------------------------------------------------------
  function dashboardView() {
    const p = pending();
    const act = (ok, ico, title, sub, href, tone) => h("a", { class: `next${ok ? " ok" : ""}`, href },
      h("span", { class: "next-ico", style: tone }, icon(ico)),
      h("span", { class: "next-text" }, h("b", {}, title), h("span", {}, sub)),
      h("span", { class: "chev" }, "›"));
    const actions = h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t("nextActions")),
      h("div", { class: "next-list" },
        miningOn() ? act(p.rollReady, "bolt", t("faucet"), mining?.base ? t("miningRunning") : t("miningGo"), "#faucet", "--c1:#ffd34d;--c2:#ff8f1c") : act(p.rollReady, "bolt", t("rollBtn"), p.rollReady ? `${t("readyNow")} · ${me.energy ?? 0} ${t("energyLbl")}` : `${t("next")} ${clock(Math.max(0, (me.retry_after || 0) - since()))}`, "#faucet", "--c1:#4fd2ff;--c2:#2f6bff"),
        act(p.questsReady > 0 || p.dailyReady, "flag", t("questsTitle"),
          p.questsReady || p.dailyReady ? `${p.questsReady + (p.dailyReady ? 1 : 0)} ${t("toCollect")}` : `${(me.challenges || []).filter((c) => c.done).length}/${(me.challenges || []).length}`, "#quests", "--c1:#ffd34d;--c2:#ff8f1c"),
        act(true, "eye", t("earn"), t("pickTask"), "#earn", "--c1:#45e3a6;--c2:#11a771")));
    const payoutLine = h("b", {}, nextPayout());
    every(() => { payoutLine.textContent = nextPayout(); }, 1000);
    const balances = h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t("balance"), h("a", { href: "#wallet", class: "badge" }, t("withdrawNow"))),
      h("div", { class: "bal-grid" },
        h("div", { class: "bal main-bal" }, h("span", {}, t("available")), h("b", {}, coin(), num(me.available))),
        h("div", { class: "bal" }, h("span", {}, t("pending")), h("b", {}, num(me.pending || 0))),
        h("div", { class: "bal" }, h("span", {}, t("validated")), h("b", {}, num(me.validated || 0))),
        h("div", { class: "bal" }, h("span", {}, t("nextPayout")), payoutLine)));
    const activity = h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t("activity"), h("a", { href: "#wallet", class: "badge" }, t("seeAll"))),
      (me.history || []).length ? me.history.slice(0, 8).map((r) => h("div", { class: "list-line" },
        h("div", {}, h("div", { style: "color:var(--ink);font-weight:700" }, tr(SOURCE[r.source] || [r.source, r.source], `s:${r.source}`)), h("div", { class: "row-sub" }, when(r.at))),
        h("span", { class: `amount ${r.delta > 0 ? "plus" : "minus"}` }, `${r.delta > 0 ? "+" : ""}${num(r.delta)}`))) : h("p", { class: "empty" }, t("noHistory")));
    statsHost = h("div", {}, statsRow());
    balances.append(...[autoPayBox()].filter(Boolean));
    return h("div", { class: "stack" }, announcementBar(), statsHost,
      h("div", { class: "grid2" }, actions, balances),
      adSlot("in_content"),
      h("div", { class: "grid2" }, activity, liveFeed(6)));
  }

  function faucetView() {
    statsHost = h("div", {}, statsRow());
    return h("div", { class: "stack" }, statsHost, rollCard());
  }

  function rewardsView() {
    const tiles = [
      ["quests", "flag", t("questsTitle"), t("rwQuests"), "--c1:#ffd34d;--c2:#ff8f1c"],
      ["achievements", "trophy", t("achievements"), t("rwAch"), "--c1:#b48cff;--c2:#6b3dff"],
    ];
    return h("div", { class: "stack" }, h("div", { class: "panel-title", style: "margin:2px 2px 0" }, t("rewardsShort")),
      h("div", { class: "game-menu four" }, tiles.map(([k, ico, name, text, tone]) => h("a", { class: "game-tile", href: `#${k}` },
        h("span", { class: "game-ico", style: tone }, icon(ico)), h("span", { class: "game-name" }, name), h("span", { class: "game-text" }, text),
        h("span", { class: "btn small", style: "margin-top:auto" }, t("open"))))), adSlot("in_content"));
  }

  // Pages de la refonte -----------------------------------------------------------

  // Chat global -------------------------------------------------------------------
  let chatLast = 0;
  let chatCache = [];
  function chatView() {
    const list = h("div", { class: "chat-list", role: "log", "aria-live": "polite" });
    const input = h("input", { maxLength: 300, placeholder: t("chatPlaceholder"), ariaLabel: t("chatPlaceholder"), autocomplete: "off" });
    const send = h("button", { class: "btn", type: "submit" }, icon("send"));
    const line = (m) => h("div", { class: `chat-msg${m.me ? " me" : ""}` },
      h("div", { class: `avatar mini${frameCls(m)}${m.vip ? " vip" : ""}` }, (m.who || "?").slice(0, 1).toUpperCase()),
      h("div", { class: "chat-bubble" },
        h("div", { class: "chat-head" },
          h("b", { class: `chat-name${nameCls(m)}` }, m.me ? t("you") : m.who),
          h("span", { class: "chat-lvl" }, `${t("lvlShort")} ${m.level}`),
          m.vip ? h("span", { class: "chat-vip" }, icon("crown")) : null,
          m.title && cosmeticName(m.title) ? h("span", { class: "title-tag small" }, cosmeticName(m.title)) : null,
          h("span", { class: "row-sub" }, new Date(m.at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }))),
        h("p", {}, m.body)));
    const draw = (stick) => {
      const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
      list.replaceChildren(...(chatCache.length ? chatCache.map(line) : [h("p", { class: "empty" }, t("chatEmpty"))]));
      if (stick || atBottom) list.scrollTop = list.scrollHeight;
    };
    const poll = async (stick = false) => {
      if (document.hidden || !list.isConnected) return;
      const r = await api("chat", { after: chatLast });
      if (!r.ok || !r.list.length) { if (stick) draw(true); return; }
      chatCache = chatCache.concat(r.list).slice(-80);
      chatLast = chatCache[chatCache.length - 1].id;
      draw(stick);
    };
    every(() => poll(), 5000);
    setTimeout(() => poll(true), 0);
    const form = h("form", {
      class: "chat-form",
      onsubmit: async (e) => {
        e.preventDefault();
        const body = input.value.trim();
        if (!body) return;
        send.disabled = true;
        const r = await api("chat_send", { body });
        send.disabled = false;
        if (!r.ok) {
          toast(r.code === "chat_muted" && r.until ? `${message(r)} (${new Date(r.until).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })})` : message(r), "bad");
          return;
        }
        input.value = "";
        await poll(true);
        input.focus();
      },
    }, input, send);
    return h("div", { class: "stack" },
      h("section", { class: "panel chat" },
        h("div", { class: "panel-title" }, h("span", { class: "live-dot" }, t("chat")), h("span", { class: "badge" }, t("chatRulesShort"))),
        list, me.pseudo ? form : h("div", { class: "chat-pseudo" }, h("p", { class: "note" }, t("pseudoAsk")), pseudoForm(render)),
        h("p", { class: "note", style: "margin:10px 0 0" }, t("chatRules"))));
  }

  // Lecteur : compteur en pause si l'onglet est cache, puis captcha et validation.
  // Lecteur VAST (HilltopAds...) : lit la video du reseau, envoie ses mesures (affichage, quartiles, fin, clic).
  // Le compteur Watch Ads n'avance que pendant la lecture ; a la fin d'une pub, la suivante est chargee.
  function vastPlayer(url) {
    const video = h("video", { class: "vast-video", playsInline: true, preload: "auto" });
    video.setAttribute("playsinline", "");
    const note = h("div", { class: "vast-note" });
    const mute = h("button", { type: "button", class: "vast-mute", "aria-label": "Son", onclick: () => { video.muted = !video.muted; mute.textContent = video.muted ? "🔇" : "🔊"; } }, "🔊");
    const el = h("div", { class: "vast-wrap" }, video, mute, note);
    const ping = (list) => (list || []).forEach((u) => { if (u) { const i = new Image(); i.src = u; } });
    let ad = null;
    let stopped = false;
    const fetchAd = async (tag, depth = 0) => {
      const xml = new DOMParser().parseFromString(await (await fetch(tag, { credentials: "omit" })).text(), "text/xml");
      const ads = [...xml.querySelectorAll("Ad")];
      const inline = ads.find((a) => a.querySelector("InLine MediaFile"));
      const text = (node, sel) => [...node.querySelectorAll(sel)].map((x) => x.textContent.trim()).filter(Boolean);
      if (!inline) {
        const wrap = ads.find((a) => a.querySelector("Wrapper VASTAdTagURI"));
        if (wrap && depth < 3) {
          const inner = await fetchAd(wrap.querySelector("VASTAdTagURI").textContent.trim(), depth + 1);
          if (inner) { inner.imp.push(...text(wrap, "Impression")); }
          return inner;
        }
        return null;
      }
      const files = [...inline.querySelectorAll("MediaFile")].map((m) => ({ type: m.getAttribute("type"), w: Number(m.getAttribute("width")) || 0, src: m.textContent.trim() }));
      const file = files.filter((f) => f.type === "video/mp4").sort((a, b) => Math.abs(a.w - 480) - Math.abs(b.w - 480))[0] || files[0];
      if (!file?.src) return null;
      const track = {};
      inline.querySelectorAll("Tracking").forEach((x) => { (track[x.getAttribute("event")] ||= []).push(x.textContent.trim()); });
      return { src: file.src, imp: text(inline, "Impression"), track, click: text(inline, "ClickThrough")[0], clickTrack: text(inline, "ClickTracking"), fired: {} };
    };
    const next = async (tries = 0) => {
      if (stopped) return;
      note.textContent = "";
      try {
        ad = await fetchAd(url);
        if (!ad) throw new Error("vide");
        video.src = ad.src;
        try { await video.play(); } catch { video.muted = true; mute.textContent = "🔇"; await video.play().catch(() => {}); }
      } catch {
        if (tries < 2 && el.isConnected) setTimeout(() => next(tries + 1), 1500);
        else note.textContent = t("watchNone");
      }
    };
    const fire = (ev) => { if (ad && !ad.fired[ev]) { ad.fired[ev] = true; ping(ad.track[ev]); } };
    video.addEventListener("playing", () => { if (ad && !ad.fired.imp) { ad.fired.imp = true; ping(ad.imp); } fire("start"); });
    video.addEventListener("timeupdate", () => {
      const r = video.duration ? video.currentTime / video.duration : 0;
      if (r >= 0.25) fire("firstQuartile");
      if (r >= 0.5) fire("midpoint");
      if (r >= 0.75) fire("thirdQuartile");
    });
    video.addEventListener("ended", () => { fire("complete"); if (el.isConnected && !stopped) next(); });
    video.addEventListener("error", () => { if (el.isConnected && !stopped) setTimeout(() => next(1), 800); });
    video.addEventListener("click", () => { if (ad?.click) { ping(ad.clickTrack); window.open(ad.click, "_blank", "noopener"); } });
    next();
    return { el, counting: () => !video.paused && !video.ended && video.readyState > 2, stop: () => { stopped = true; video.pause(); video.removeAttribute("src"); video.load(); } };
  }

  function playWatchVideo(token, secs, html, reward, onDone) {
    let left = secs;
    const counter = h("b", { class: "watch-counter" }, String(left));
    const frame = h("div", { class: "watch-frame" });
    // Code « vast:URL » : notre lecteur VAST ; sinon le code HTML du reseau tel quel.
    const vast = html.trim().startsWith("vast:") ? vastPlayer(html.trim().slice(5)) : null;
    if (vast) frame.append(vast.el);
    else frame.append(document.createRange().createContextualFragment(html));
    const foot = h("div", { class: "watch-foot" }, h("span", {}, t("watchStay")), counter);
    const layer = h("div", { class: "frame-layer" },
      h("div", { class: "frame-box watch-box" },
        h("div", { class: "frame-head" }, h("b", {}, t("watchAds")), h("button", { type: "button", class: "icon-btn", "aria-label": t("close"), onclick: () => { vast?.stop(); layer.remove(); onDone(); } }, "✕")),
        frame, foot));
    document.body.append(layer);
    const id = setInterval(() => {
      if (!layer.isConnected) { clearInterval(id); vast?.stop(); return; }
      if (document.hidden) return;
      if (vast && !vast.counting()) return;
      left -= 1;
      counter.textContent = String(Math.max(left, 0));
      if (left > 0) return;
      clearInterval(id);
      vast?.stop();
      // Code a recopier, dessine (pas de texte a copier-coller), donne par le serveur seulement maintenant.
      const canvas = h("canvas", { class: "watch-code", width: 220, height: 64, "aria-hidden": "true" });
      const input = h("input", { inputMode: "numeric", autocomplete: "off", maxLength: 5, placeholder: "•••", ariaLabel: t("codeType"), class: "watch-code-input" });
      const drawCode = (digits) => {
        const g = canvas.getContext("2d");
        g.clearRect(0, 0, 220, 64);
        g.fillStyle = "#fff4ea"; g.fillRect(0, 0, 220, 64);
        for (let i = 0; i < 6; i++) { g.strokeStyle = `rgba(255,122,0,${0.15 + Math.random() * 0.25})`; g.beginPath(); g.moveTo(Math.random() * 220, Math.random() * 64); g.lineTo(Math.random() * 220, Math.random() * 64); g.stroke(); }
        const step = 200 / digits.length;
        [...digits].forEach((d, i) => {
          g.save();
          g.translate(14 + step * i + step / 2 - 10, 44 + (Math.random() * 8 - 4));
          g.rotate((Math.random() - 0.5) * 0.5);
          g.font = "700 34px Fredoka, Nunito, sans-serif"; g.fillStyle = "#2b1606"; g.fillText(d, 0, 0);
          g.restore();
        });
      };
      const getCode = async () => {
        const c = await api("watch_code", { token });
        if (c.ok) { drawCode(c.digits); input.focus(); return; }
        if (c.code === "too_soon") { setTimeout(getCode, (c.retry_after || 1) * 1000); return; }
        toast(message(c), "bad");
      };
      getCode();
      const ok = h("button", {
        class: "btn gold", type: "button",
        onclick: async () => {
          if (!/^[0-9]{3,5}$/.test(input.value.trim())) { toast(t("codeType"), "bad"); input.focus(); return; }
          ok.disabled = true;
          const r = await api("watch_complete", { token, code: input.value.trim() });
          if (r.ok) {
            burst(ok, r.mining ? `+${fmtGhs(r.ghs)}` : `+${tk(r.tokens)}`);
            toast(r.mining ? `${t("sessionOpened")} ${fmtGhs(r.ghs)} · ${r.hours} h` : `${tk(r.tokens)} ${t("credited")}`, "good");
            vast?.stop(); layer.remove(); mining = null; await refreshMe(); onDone(); return;
          }
          ok.disabled = false;
          input.value = "";
          if (r.code === "bad_code" && r.left > 0) { toast(`${t("codeBad")} (${r.left})`, "bad"); input.focus(); return; }
          toast(r.code === "bad_code" ? t("codeLost") : message(r), "bad");
          if (r.code === "bad_code") { layer.remove(); onDone(); }
        },
      }, miningOn() ? `${t("watchValidate")} +${fmtGhs(status.mining_video_ghs)}` : `${t("watchValidate")} +${num(reward)}`);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") ok.click(); });
      foot.replaceChildren(h("div", { class: "watch-code-box" }, h("span", { class: "row-sub" }, t("codeType")), canvas, input, ok));
    }, 1000);
  }

  // Lance directement une video (bouton de la page Minage) : sans passer par la page Watch Ads.
  async function startWatch(onDone) {
    const codes = adCodes("watch");
    if (!codes.length) { toast(t("watchNone"), "info"); return; }
    const r = await api("watch_start");
    if (!r.ok) { toast(message(r), "bad"); return; }
    playWatchVideo(r.token, r.seconds, codes[Math.floor(Math.random() * codes.length)], status?.watch_reward ?? 0, onDone);
  }

  // Watch Ads : video recompensee, captcha a la fin, bouton « Valider la vue ».
  function watchView() {
    const box = h("section", { class: "panel watch" }, h("p", { class: "empty" }, "…"));
    const codes = adCodes("watch");
    const load = async () => {
      const st = await api("watch_status");
      if (!st.ok || !box.isConnected) return;
      const head = h("div", { class: "watch-head" },
        h("div", { class: "shop-hero-ico", style: "background:linear-gradient(145deg,#ff8cc6,#e2367f);color:#fff" }, icon("play")),
        h("div", {}, h("h2", {}, t("watchAds")), h("p", { class: "row-sub" }, t("watchText"))),
        h("div", { class: "watch-stats" },
          h("div", {}, h("b", {}, `${st.left}/${st.limit}`), h("span", {}, t("watchLeft"))),
          h("div", {}, h("b", {}, ...(miningOn() ? [`+${fmtGhs(status.mining_video_ghs)}`] : [coin(), num(st.reward)])), h("span", {}, miningOn() ? `${status.mining_hours} h ${t("perView")}` : t("perView")))));
      if (!codes.length) { box.replaceChildren(head, h("div", { class: "empty" }, h("div", { class: "empty-ico" }, icon("play")), h("p", {}, t("watchNone")))); return; }
      const wait = h("span", { class: "row-sub" });
      const btn = h("button", { class: "btn big gold", type: "button", disabled: st.left < 1 }, st.left < 1 ? t("comeBack") : t("watchGo"));
      let next = st.next_in;
      if (st.left > 0 && next > 0) {
        btn.disabled = true;
        wait.textContent = `${t("watchNext")} ${clock(next)}`;
        every(() => {
          next -= 1;
          if (next > 0) { wait.textContent = `${t("watchNext")} ${clock(next)}`; return; }
          wait.textContent = ""; btn.disabled = false;
        }, 1000);
      }
      btn.onclick = async () => {
        btn.disabled = true;
        const r = await api("watch_start");
        if (!r.ok) { toast(message(r), "bad"); load(); return; }
        playWatchVideo(r.token, r.seconds, codes[Math.floor(Math.random() * codes.length)], st.reward, load);
      };
      box.replaceChildren(head, h("div", { class: "watch-go" }, btn, wait), h("p", { class: "note", style: "margin:12px 0 0" }, t("watchHow")));
    };
    load();
    return h("div", { class: "stack" }, box, adSlot("in_content"));
  }

  // Minage virtuel ---------------------------------------------------------------------
  const miningOn = () => Boolean(status?.mining_enabled);
  let mining = null;
  let miningAt = 0;
  async function loadMining() {
    const r = await api("mining_status");
    if (r.ok) { mining = r; miningAt = Date.now(); }
    return mining;
  }
  // Heure du serveur, recalee sur l'horloge du navigateur.
  const serverNow = () => (mining ? new Date(mining.now).getTime() + (Date.now() - miningAt) : Date.now());
  const minedCoins = (sess) => {
    const now = Math.min(serverNow(), new Date(sess.ends_at).getTime());
    return Math.max(0, (Number(sess.coins_per_hour) * (now - new Date(sess.started_at).getTime())) / 3600000);
  };
  const toSats = (coins) => coins / (Number(mining?.coins_per_sat || status?.coins_per_sat) || 1);
  const fmtSat = (sats, d = 4) => `${sats.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d })} sat`;
  const fmtGhs = (g) => (g >= 1000 ? `${(g / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })} TH/s` : `${Number(g).toLocaleString(locale, { maximumFractionDigits: 2 })} GH/s`);
  const hms = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  const KIND = { base: ["bolt", "kindBase"], ptc: ["eye", "ptc"], video: ["play", "watchAds"] };

  function miningView() {
    const box = h("div", { class: "stack" }, h("section", { class: "panel" }, h("p", { class: "empty" }, "…")));
    const draw = () => {
      if (!mining || !box.isConnected) return;
      const st = mining;
      let reloading = false;
      const counter = h("b", { class: "mine-counter" });
      const rate = h("span", { class: "row-sub" });
      const baseLine = h("div", { class: "mine-base" });
      const cap = captchaBox();
      const after = h("div", { class: "after-claim" });
      const startBtn = h("button", {
        class: "btn big gold", type: "button",
        onclick: async () => {
          if (captchaMissing(cap)) { toast(t("needCaptcha"), "bad"); return; }
          startBtn.disabled = true;
          const r = await api("mining_start", { captcha: captchaToken(cap) || "dev" });
          captchaReset(cap);
          if (!r.ok) { startBtn.disabled = false; toast(message(r), "bad"); return; }
          burst(startBtn, `+${fmtGhs(r.ghs)}`);
          toast(`${t("miningStarted")} ${fmtGhs(r.ghs)} · ${st.hours} h`, "good");
          refreshAds();
          await Promise.all([loadMining(), refreshMe()]);
          statsHost?.replaceChildren(statsRow());
          draw();
        },
      }, `${t("miningStart")} · ${st.hours} h`);
      const tick = () => {
        const mined = st.active.reduce((sum, x) => sum + minedCoins(x), 0);
        counter.textContent = fmtSat(toSats(mined));
        const perHour = st.active.filter((x) => new Date(x.ends_at).getTime() > serverNow()).reduce((sum, x) => sum + Number(x.coins_per_hour), 0);
        rate.textContent = `≈ ${fmtSat(toSats(perHour), 2)} / h`;
        if (st.base) {
          const end = new Date(st.base.ends_at).getTime();
          const total = end - new Date(st.base.started_at).getTime();
          baseLine.replaceChildren(
            h("div", { class: "mine-base-head" }, h("b", {}, `${t("kindBase")} · ${fmtGhs(st.base.ghs)}`), h("span", {}, `${t("endsIn")} ${hms(end - serverNow())}`)),
            h("div", { class: "progress" }, h("i", { style: `width:${Math.min(100, ((serverNow() - (end - total)) / total) * 100)}%` })));
        }
        // Une session vient de finir : le serveur la verse, on recharge une seule fois.
        if (!reloading && st.active.some((x) => new Date(x.ends_at).getTime() <= serverNow())) {
          reloading = true;
          loadMining().then(() => { refreshMe(); draw(); });
        }
      };
      every(tick, 500);
      const boosts = [
        ["video", "play", "--c1:#ff8cc6;--c2:#e2367f", st.video_ghs, "#watch"],
      ].map(([k, ico, tone, ghs]) => h("button", {
        class: "boost-card", type: "button",
        onclick: (e) => { const b = e.currentTarget; b.disabled = true; startWatch(() => loadMining().then(() => { refreshMe(); draw(); })).finally(() => { b.disabled = false; }); },
      },
        h("span", { class: "game-ico", style: tone }, icon(ico)),
        h("span", { class: "boost-text" }, h("b", {}, t(k === "video" ? "watchAds" : "ptc")), h("span", {}, `+${fmtGhs(ghs)} · ${st.hours} h`)),
        h("span", { class: "chev" }, "›")));
      box.replaceChildren(
        h("section", { class: "panel mine-hero" },
          h("div", { class: `mine-rig${st.power > 0 ? " on" : ""}` }, icon("fan")),
          h("div", { class: "mine-main" },
            h("span", { class: "row-sub" }, t("miningPower")),
            h("b", { class: "mine-power" }, fmtGhs(st.power)),
            h("span", { class: "row-sub" }, t("miningNow")), counter, rate),
          h("div", { class: "mine-boost" },
            h("div", { class: "mine-boost-head" }, h("b", {}, t("miningBoost")), h("span", { class: "badge" }, `${st.ads_hour_left} ${t("adsHourLeft")}`)),
            boosts)),
        h("section", { class: "panel" },
          h("div", { class: "panel-title" }, t("kindBase"), h("span", { class: "badge" }, `${fmtGhs(st.base_ghs)} · ${st.hours} h`)),
          st.base ? baseLine : h("div", {}, h("p", { class: "note" }, t("miningBaseText")), cap, startBtn),
          after),
        adSlot("roll_bottom"),
        sessionsView(),
        h("p", { class: "note", style: "text-align:center" }, t("miningFair")));
      tick();
    };
    statsHost = h("div", {}, statsRow());
    loadMining().then(draw);
    return h("div", { class: "stack" }, statsHost, box);
  }

  function sessionsView() {
    const box = h("div", { class: "stack" }, h("section", { class: "panel" }, h("p", { class: "empty" }, "…")));
    const draw = () => {
      if (!mining || !box.isConnected) return;
      const st = mining;
      const rows = st.active.map((x) => {
        const [ico, key] = KIND[x.kind] || KIND.base;
        const mined = h("b", { class: "sess-mined" });
        const left = h("span", { class: "row-sub" });
        const bar = h("i", {});
        const upd = () => {
          const end = new Date(x.ends_at).getTime();
          const start = new Date(x.started_at).getTime();
          mined.textContent = fmtSat(toSats(minedCoins(x)));
          left.textContent = `${t("endsIn")} ${hms(end - serverNow())}`;
          bar.style.width = `${Math.min(100, ((serverNow() - start) / (end - start)) * 100)}%`;
        };
        upd();
        every(upd, 1000);
        return h("div", { class: `sess k-${x.kind}` },
          h("span", { class: "row-ico" }, icon(ico)),
          h("div", { class: "row-main" }, h("h3", {}, `${t(key)} · ${fmtGhs(x.ghs)}`), h("div", { class: "progress" }, bar), left),
          mined);
      });
      const done = st.done_today.map((x) => {
        const [ico, key] = KIND[x.kind] || KIND.base;
        return h("div", { class: "list-line" },
          h("div", {}, h("div", { style: "color:var(--ink);font-weight:700" }, `${t(key)} · ${fmtGhs(x.ghs)}`), h("div", { class: "row-sub" }, when(x.ends_at))),
          h("span", { class: "amount plus" }, `+${fmtSat(toSats(x.tokens || 0), 2)}`));
      });
      box.replaceChildren(
        h("section", { class: "panel" },
          h("div", { class: "panel-title" }, t("sessionsActive"), h("span", { class: "badge good" }, `${fmtGhs(st.power)}`)),
          rows.length ? h("div", { class: "sess-list" }, rows) : h("p", { class: "empty" }, t("noSessions"))),
        h("section", { class: "panel" },
          h("div", { class: "panel-title" }, t("sessionsDone"), h("span", { class: "badge" }, `+${fmtSat(toSats(st.done_today_tokens || 0), 2)}`)),
          done.length ? done : h("p", { class: "empty" }, t("noSessionsDone")),
          h("p", { class: "note", style: "margin:10px 0 0" }, t("sessionsNote"))));
    };
    if (mining) queueMicrotask(draw); else loadMining().then(draw);
    return box;
  }

  // Bandeau d'annonce : derniere annonce du site, fermable.
  let notifCache = null;
  async function loadNotifs() {
    const r = await api("notifications");
    if (r.ok) notifCache = r.list;
    return notifCache;
  }
  const ntext = (n) => (FR ? n.text : n.text_en || n.text);
  function announcementBar() {
    const box = h("div", {});
    const show = (list) => {
      const a = (list || []).find((n) => n.kind === "announce" && Date.now() - new Date(n.at) < 7 * 86400000);
      if (!a || store.get("cc.annDone") === String(a.id)) return;
      box.replaceChildren(h("div", { class: "announce" }, icon("megaphone"),
        a.link ? h("a", { href: a.link }, ntext(a)) : h("span", {}, ntext(a)),
        h("button", { type: "button", class: "icon-btn", ariaLabel: t("close"), onclick: () => { store.set("cc.annDone", String(a.id)); box.replaceChildren(); } }, "✕")));
    };
    if (notifCache) show(notifCache);
    else loadNotifs().then(show);
    return box;
  }

  function notificationsView() {
    const list = h("div", {}, h("p", { class: "empty" }, "…"));
    loadNotifs().then(async (items) => {
      list.replaceChildren(...((items || []).length ? items.map((n) => h(n.link ? "a" : "div", { class: `notif${n.unread ? " unread" : ""}`, href: n.link || undefined },
        h("span", { class: "notif-ico" }, icon({ validated: "check", tournament: "trophy", ticket: "mail", announce: "megaphone" }[n.kind] || "star")),
        h("span", { class: "notif-text" }, h("b", {}, ntext(n)), h("span", { class: "row-sub" }, when(n.at))))) : [h("p", { class: "empty" }, t("noNotif"))]));
      if ((me.notif_unread || 0) > 0) { await api("read_notifications"); me.notif_unread = 0; updateHeader(); }
    });
    return h("div", { class: "stack" }, h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("notifications")), list));
  }

  // Succes
  function achievementsView() {
    const box = h("div", { class: "stack" }, h("section", { class: "panel" }, h("p", { class: "empty" }, "…")));
    const draw = (list) => {
      const done = list.filter((a) => a.done).length;
      const groups = [...new Set(list.map((a) => a.kind))];
      box.replaceChildren(
        h("section", { class: "panel ach-hero" },
          h("div", { class: "shop-hero-ico", style: "background:linear-gradient(145deg,#b48cff,#6b3dff);color:#fff" }, icon("trophy")),
          h("div", {}, h("h2", {}, t("achievements")), h("p", { class: "row-sub" }, t("achText"))),
          h("div", { class: "ach-count" }, h("b", {}, `${done}/${list.length}`), h("span", {}, t("unlocked")))),
        ...groups.map((k) => h("section", { class: "panel" },
          h("div", { class: "panel-title" }, t(`ak_${k}`)),
          h("div", { class: "ach-grid" }, list.filter((a) => a.kind === k).map((a) => {
            const ready = !a.done && a.progress >= a.target;
            return h("div", { class: `ach${a.done ? " done" : ready ? " ready" : ""}` },
              h("div", { class: "ach-medal" }, icon(a.done ? "check" : "trophy")),
              h("b", {}, FR ? a.name : a.name_en),
              h("div", { class: "progress" }, h("i", { style: `width:${(a.progress / a.target) * 100}%` })),
              h("span", { class: "row-sub" }, `${fmtInt(a.progress)} / ${fmtInt(a.target)}`),
              ready ? h("button", {
                class: "btn small gold", type: "button",
                onclick: async (e) => {
                  const b = e.currentTarget;
                  b.disabled = true;
                  const r = await api("claim_achievement", { code: a.code });
                  if (r.ok) burst(b, `+${tk(r.tokens)}`);
                  toast(r.ok ? `${tk(r.tokens)} ${t("won")}` : message(r), r.ok ? "good" : "bad");
                  await refreshMe();
                  load();
                },
              }, `${t("claimQuest")} +${num(a.reward_tokens)}`) : h("span", { class: "reward" }, "+", coin(), num(a.reward_tokens)));
          })))));
    };
    const load = () => api("achievements").then((r) => { if (r.ok && box.isConnected) draw(r.list); });
    load();
    return box;
  }

  // Codes promo
  function promoView() {
    const input = h("input", { maxLength: 40, placeholder: "NOEL2026", autocapitalize: "characters", ariaLabel: t("promo") });
    const cap = captchaBox();
    const btn = h("button", { class: "btn big gold", type: "submit" }, t("redeem"));
    return h("div", { class: "stack" },
      h("section", { class: "panel promo" },
        h("div", { class: "shop-hero-ico", style: "background:linear-gradient(145deg,#ff8cc6,#e2367f);color:#fff;margin:0 auto 12px" }, icon("gift")),
        h("h2", { style: "text-align:center" }, t("promo")),
        h("p", { class: "note", style: "text-align:center" }, t("promoText")),
        h("form", {
          onsubmit: async (e) => {
            e.preventDefault();
            if (captchaMissing(cap)) { toast(t("needCaptcha"), "bad"); return; }
            btn.disabled = true;
            const r = await api("redeem_promo", { code: input.value, captcha: captchaToken(cap) || "dev" });
            captchaReset(cap);
            btn.disabled = false;
            if (r.ok) { burst(btn, `+${tk(r.tokens)}`); input.value = ""; await refreshMe(); }
            toast(r.ok ? `${tk(r.tokens)} ${t("won")}` : message(r), r.ok ? "good" : "bad");
          },
        }, input, cap, btn)),
      adSlot("in_content"));
  }

  // Parrainage
  function referralView() {
    const url = `${location.origin}${location.pathname}?ref=${me.ref_code}`;
    const pct = me.vip ? status?.vip_referral_percent ?? 0 : status?.referral_percent ?? 0;
    const field = h("input", { readOnly: true, value: url, ariaLabel: t("refLink") });
    const copy = async (text) => { try { await navigator.clipboard.writeText(text); } catch { field.select(); document.execCommand("copy"); } toast(t("copied"), "good"); };
    const list = h("div", {}, h("p", { class: "empty" }, "…"));
    api("referrals").then((r) => {
      if (!r.ok) return;
      list.replaceChildren(...(r.list.length ? r.list.map((f) => h("div", { class: "list-line" },
        h("div", {}, h("div", { style: "color:var(--ink);font-weight:700" }, f.who), h("div", { class: "row-sub" }, fmtDate(f.since))),
        h("span", { class: `badge ${f.active ? "good" : ""}` }, f.active ? t("active") : t("inactive")),
        h("span", { class: "amount plus" }, `+${num(f.earned)}`))) : [h("p", { class: "empty" }, t("noRef"))]));
    });
    const share = [
      [t("shareText1"), `${t("shareText1")} ${url}`],
      [t("shareText2"), `${t("shareText2")} ${url}`],
    ];
    return h("div", { class: "stack" },
      h("section", { class: "panel ref-hero" },
        h("div", { class: "ref-pct" }, h("b", {}, `${pct} %`), h("span", {}, t("refText"))),
        h("div", { class: "copy" }, field, h("button", { class: "btn small", type: "button", onclick: () => copy(url) }, t("copy"))),
        h("div", { class: "bal-grid", style: "margin-top:14px" },
          h("div", { class: "bal" }, h("span", {}, t("refCount")), h("b", {}, fmtInt(me.referrals))),
          h("div", { class: "bal" }, h("span", {}, t("refEarned")), h("b", {}, coin(), num(me.referral_earned))))),
      h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("shareReady")),
        share.map(([label, text]) => h("div", { class: "share-line" }, h("p", {}, text), h("button", { class: "btn small ghost", type: "button", onclick: () => copy(text) }, t("copy"))))),
      h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("myRefs")), list),
      h("p", { class: "note", style: "text-align:center" }, t("refRules")));
  }

  // Support
  function supportView() {
    const box = h("div", {}, h("p", { class: "empty" }, "…"));
    const subject = h("input", { maxLength: 120, required: true, placeholder: t("ticketSubject") });
    const body = h("textarea", { rows: 4, maxLength: 4000, required: true, placeholder: t("ticketBody") });
    const load = () => api("tickets").then((r) => {
      if (!r.ok || !box.isConnected) return;
      box.replaceChildren(...(r.list.length ? r.list.map((tk_) => {
        const reply = h("textarea", { rows: 2, maxLength: 4000, placeholder: t("ticketReply") });
        return h("details", { class: "ticket", open: tk_.status === "answered" },
          h("summary", {}, h("b", {}, tk_.subject), h("span", { class: `badge ${tk_.status === "answered" ? "good" : tk_.status === "closed" ? "" : "warn"}` }, t(`tk_${tk_.status}`))),
          (tk_.messages || []).map((m) => h("div", { class: `msg${m.admin ? " admin" : ""}` }, h("span", { class: "row-sub" }, `${m.admin ? t("supportTeam") : t("you")} · ${when(m.at)}`), h("p", {}, m.body))),
          tk_.status !== "closed" ? h("form", {
            class: "msg-form",
            onsubmit: async (e) => {
              e.preventDefault();
              const r2 = await api("ticket_reply", { id: tk_.id, body: reply.value });
              if (!r2.ok) { toast(message(r2), "bad"); return; }
              load();
            },
          }, reply, h("button", { class: "btn small", type: "submit" }, t("send"))) : null);
      }) : [h("p", { class: "empty" }, t("noTickets"))]));
    });
    load();
    return h("div", { class: "stack" },
      h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("newTicket")),
        h("p", { class: "note" }, t("ticketText"), " ", h("a", { href: "#faq" }, t("faq"))),
        h("form", {
          onsubmit: async (e) => {
            e.preventDefault();
            const r = await api("ticket_create", { subject: subject.value, body: body.value });
            if (!r.ok) { toast(message(r), "bad"); return; }
            subject.value = ""; body.value = "";
            toast(t("ticketSent"), "good");
            load();
          },
        }, h("label", { class: "field" }, t("ticketSubject"), subject), h("label", { class: "field" }, t("ticketBody"), body), h("button", { class: "btn", type: "submit" }, t("send")))),
      h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("myTickets")), box));
  }

  // FAQ (publique et membre)
  const FAQ = () => [
    ["faq_what_q", "faq_what_a"], ["faq_pay_q", "faq_pay_a"], ["faq_min_q", "faq_min_a"], ["faq_pending_q", "faq_pending_a"],
    ["faq_multi_q", "faq_multi_a"], ["faq_vpn_q", "faq_vpn_a"], ["faq_ref_q", "faq_ref_a"], ["faq_vip_q", "faq_vip_a"],
    ["faq_ads_q", "faq_ads_a"], ["faq_gamble_q", "faq_gamble_a"],
  ];
  function faqView() {
    return h("div", { class: "stack" },
      h("section", { class: "panel" }, h("h2", { style: "margin-bottom:12px" }, t("faq")),
        FAQ().map(([q, a]) => h("details", { class: "faq" }, h("summary", {}, t(q)), h("p", {}, t(a))))),
      session && me ? h("a", { class: "row ad-link", href: "#support" }, h("div", { class: "row-ico" }, icon("mail")),
        h("div", { class: "row-main" }, h("h3", {}, t("support")), h("div", { class: "row-sub" }, t("ticketText"))), h("span", { class: "chev" }, "›")) : null);
  }

  // Preuves de paiement (publique)
  function proofsView() {
    const list = h("div", {}, h("p", { class: "empty" }, "…"));
    api("proofs").then((r) => {
      if (!r.ok) return;
      list.replaceChildren(...(r.proofs.length ? r.proofs.map((p) => h("div", { class: "list-line" },
        h("div", {}, h("div", { style: "color:var(--ink);font-weight:700" }, p.who), h("div", { class: "row-sub" }, `${when(p.at)}${p.payout_id ? ` · FaucetPay #${p.payout_id}` : ""}`)),
        h("span", { class: "amount plus" }, `${units(p.amount_units, p.decimals)} ${p.coin}`))) : [h("p", { class: "empty" }, t("noProofs"))]));
    });
    return h("div", { class: "stack" },
      h("section", { class: "panel" }, h("h2", {}, t("proofs")), h("p", { class: "note", style: "margin-top:6px" }, t("proofsText"))),
      h("section", { class: "panel" }, list));
  }

  // Simulateur de gains (accueil public) : base sur les vraies recompenses du site.
  // Gain moyen d'un tirage, d'apres la vraie table des gains.
  const rollAverage = () => rows().reduce((sum, r) => sum + ((r.to - r.from + 1) / 100000) * r.tokens, 0);

  function simulator() {
    const s = status || {};
    const tpe = s.tokens_per_eur || 10000;
    const lines = [
      ...(miningOn() ? (() => {
        const satCoins = (ghs) => (ghs / 1000) * (s.mining_sat_per_ths_hour || 1) * (s.mining_hours || 8) * (s.coins_per_sat || 6.8);
        return [["simMining", "bolt", 0, 3, 3, satCoins(s.mining_base_ghs || 30)], ["simVideo", "play", 0, 50, 10, satCoins(s.mining_video_ghs || 50)]];
      })() : [["simFaucet", "bolt", 0, 72, 15, rollAverage()]]),
      ["simPtc", "eye", 0, 50, 10, miningOn() ? ((s.mining_ptc_ghs || 20) / 1000) * (s.mining_sat_per_ths_hour || 1) * (s.mining_hours || 8) * (s.coins_per_sat || 6.8) : s.ptc_reward || 10],
      ["simLinks", "link", 0, 20, 5, s.link_reward || 15],
      ["simSurveys", "quests", 0, 10, 2, Math.round(0.5 * tpe * 0.5)],
    ];
    const vals = lines.map((l) => l[4]);
    const out = h("div", { class: "sim-total" });
    const rows = lines.map(([key, ico, min, max], i) => {
      const v = h("b", {}, String(vals[i]));
      const input = h("input", { type: "range", min, max, value: vals[i], class: "range", ariaLabel: t(key),
        oninput: (e) => { vals[i] = Number(e.target.value); v.textContent = String(vals[i]); show(); } });
      return h("div", { class: "sim-row" }, h("span", { class: "sim-ico" }, icon(ico)), h("span", { class: "sim-label" }, t(key)), v, input);
    });
    const show = () => {
      const day = Math.round(lines.reduce((sum, l, i) => sum + vals[i] * l[5], 0));
      out.replaceChildren(h("div", {}, h("span", {}, t("simDay")), h("b", {}, tk(day))), h("div", {}, h("span", {}, t("simMonth")), h("b", {}, tk(day * 30))),
        h("div", {}, h("span", {}, "≈"), h("b", {}, eur(day * 30))));
    };
    show();
    return h("section", { class: "panel sim" }, h("div", { class: "panel-title" }, t("simTitle")), rows, out, h("p", { class: "note", style: "margin:10px 0 0" }, t("simNote")));
  }

  // Accueil public : vitrine + connexion
  function landing(route) {
    const s = status || {};
    const ways = [["bolt", "faucet", "w_faucet"], ["eye", "ptc", "w_ptc"], ["link", "links", "w_links"], ["quests", "surveys", "w_surveys"],
      ["gift", "offers", "w_offers"], ["flag", "quests", "w_quests"], ["profile", "referral", "w_ref"]];
    const pub = { proofs: proofsView, faq: faqView, classement: publicBoard };
    const body = pub[route]
      ? h("div", { class: "pub-page" }, h("a", { class: "btn ghost small", href: "#", style: "align-self:flex-start;width:auto" }, `← ${t("back")}`), pub[route]())
      : h("div", { class: "pub-page" },
          h("section", { class: "hero2" },
            h("div", { class: "hero2-text" },
              h("span", { class: "eyebrow2" }, t("heroEyebrow")),
              h("h1", {}, t("heroTitle")),
              h("p", { class: "lead2" }, t("heroLead")),
              h("div", { class: "hero2-stats" },
                h("div", {}, h("b", {}, fmtInt(s.users || 0)), h("span", {}, t("members"))),
                h("div", {}, h("b", {}, eur(s.paid_tokens || 0)), h("span", {}, t("paidOut"))),
                h("div", {}, h("b", {}, t("instant")), h("span", {}, t("withdrawals"))))),
            gate(true)),
          liveFeed(8),
          h("h2", { class: "pub-h2" }, t("waysTitle")),
          h("div", { class: "ways" }, ways.map(([ico, title, text]) => h("div", { class: "way" }, h("span", { class: "game-ico" }, icon(ico)), h("b", {}, t(title)), h("span", {}, t(text))))),
          simulator(),
          h("h2", { class: "pub-h2" }, t("stepsTitle")),
          h("div", { class: "steps" }, [1, 2, 3].map((n) => h("div", { class: "step" }, h("span", { class: "step-n" }, String(n)), h("b", {}, t(`step${n}`)), h("span", {}, t(`step${n}t`))))),
          h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("faq")), FAQ().slice(0, 5).map(([q, a]) => h("details", { class: "faq" }, h("summary", {}, t(q)), h("p", {}, t(a)))),
            h("a", { href: "#faq", class: "btn ghost small", style: "width:auto;margin-top:10px" }, t("seeAll"))));
    return h("div", { class: "public" },
      ticker(),
      h("header", { class: "topbar" },
        h("a", { class: "logo", href: "#" }, coinSvg(), h("span", {}, cfg.SITE_NAME)),
        h("nav", { class: "pub-nav" }, h("a", { href: "#proofs" }, t("proofs")), h("a", { href: "#faq" }, t("faq")), langPicker()),
        h("a", { class: "btn small", href: "#", onclick: () => setTimeout(() => document.querySelector(".gate-card input")?.focus(), 50) }, t("enter"))),
      h("main", { class: "pub-main" }, body),
      h("footer", { class: "pub-foot" }, h("a", { href: "legal.html" }, t("legal")), h("a", { href: "#proofs" }, t("proofs")), h("a", { href: "#faq" }, t("faq")),
        h("span", {}, `© ${new Date().getFullYear()} ${cfg.SITE_NAME}`)));
  }

  function publicBoard() {
    const box = h("section", { class: "panel tourney" }, h("div", { class: "panel-title" }, t("tourney")), h("p", { class: "empty" }, "…"));
    api("board_public").then((r) => {
      if (!r.ok) return;
      const prizes = r.prizes || [];
      box.replaceChildren(h("div", { class: "panel-title" }, t("tourney")),
        r.top.length ? h("div", { class: "board" }, r.top.map((p) => h("div", { class: "board-row" },
          h("span", { class: `rank r${Math.min(p.rank, 4)}` }, String(p.rank)),
          h("div", { class: "board-who" }, h("div", { class: `board-name${nameCls(p)}` }, p.who)),
          h("div", { class: "board-score" }, num(p.score), prizes[p.rank - 1] ? h("span", { class: "board-prize" }, `+${num(prizes[p.rank - 1])}`) : null)))) : h("p", { class: "empty" }, t("tourneyEmpty")),
        h("p", { class: "note", style: "margin:12px 0 0" }, `${t("tourneyText")} ${prizes.length} ${t("tourneyText2")}`));
    });
    return box;
  }

  // Historique complet + export CSV
  async function exportHistory() {
    const r = await api("history");
    if (!r.ok) { toast(message(r), "bad"); return; }
    const rows = [["date", "source", "solde", "montant"], ...r.list.map((x) => [x.at, x.source, x.bucket, x.delta])];
    const blob = new Blob([rows.map((l) => l.join(";")).join("\n")], { type: "text/csv" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `${cfg.SITE_NAME}-historique.csv` });
    document.body.append(a);
    a.click();
    a.remove();
  }

  function render() {
    clearTimers();
    const root = document.getElementById("root");
    root.replaceChildren(session && me ? shell() : landing(location.hash.replace("#", "")));
    window.scrollTo(0, 0);
  }

  async function publicStatus() {
    const r = await api("status");
    return r.code === "offline" || r.ok === false ? null : r;
  }

  async function boot() {
    status = await publicStatus();
    if (session) await Promise.all([refreshMe(), loadCatalog(), loadRates()]);
    const q = new URLSearchParams(location.search);
    const sl = q.get("sl");
    if (sl && session && me) {
      const r = await api("shortlink_complete", { token: sl });
      toast(r.ok ? `${tk(r.tokens)} ${t("credited")}` : message(r), r.ok ? "good" : "bad");
      await refreshMe();
    }
    if (q.get("ref")) store.set("cc.ref", q.get("ref"));
    if (sl || q.get("ref")) history.replaceState(null, "", location.pathname + location.hash);
    render();
  }

  window.addEventListener("hashchange", () => { if (session && me) refreshMe().then(render); else render(); });
  // Soldes et statut toutes les minutes, seulement si la page est visible.
  setInterval(async () => {
    if (document.hidden || !status) return;
    const s = await publicStatus();
    if (s) status = s;
    if (session && me) await refreshMe();
  }, 60000);

  background();
  boot();
})();
