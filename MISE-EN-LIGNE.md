# Mettre CryptoCoin en ligne

Compte environ 45 minutes. Tu saisis toi-même chaque clé secrète : ne les colle jamais dans `public/` ni dans une conversation.

## Essayer d'abord sans argent réel

```bash
cd C:/Users/masia/Desktop/Faucet
npm run dev
```

- Site : http://localhost:8188
- Dashboard : http://localhost:8188/admin.html, mot de passe `mot-de-passe-de-test-long`
- Adresses FaucetPay d'essai : `inconnu@x.com` (compte inexistant), `panne-totale@x.com` (FaucetPay ne répond pas), toute autre adresse (paiement simulé)

## 1. FaucetPay

1. Crée un faucet dans le tableau de bord des propriétaires.
2. Dépose une petite somme en USDT sur le solde **de ce faucet**.
3. Dans Manage > Scoped API keys, crée une clé avec les droits **read** et **send**, et un **plafond quotidien** bas (2 $ par exemple). La clé n'est affichée qu'une fois.
4. Active les règles anti-fraude du faucet : la détection de VPN n'est pas construite de notre côté.

## 2. Captcha Cloudflare Turnstile

Crée un widget Turnstile pour `shigyn.github.io`. Note la **clé de site** (publique) et la **clé secrète**.

## 3. Supabase

1. Crée un **projet dédié**, à part de LocWeb et de CryptoQuest.
2. Ouvre **SQL Editor**, colle tout le fichier `supabase/migrations/20261106000000_cryptocoin.sql`, puis clique sur **Run**. Ce fichier **efface et recrée** tout le schéma : ne le relance plus une fois le site ouvert.
3. Dans `.env`, complète `FAUCETPAY_API_KEY` et `TURNSTILE_SECRET`. Les autres valeurs sont déjà générées. `ADMIN_PASSWORD` est ton mot de passe du dashboard.
4. Déploie le serveur :

```bash
cd C:/Users/masia/Desktop/Faucet
```

```bash
npx supabase login
```

```bash
npx supabase link --project-ref VOTRE_REF
```

```bash
npx supabase secrets set --env-file .env
```

```bash
npx supabase functions deploy api admin postback cron --no-verify-jwt
```

Facultatif, pour recevoir les alertes sur Telegram : ajoute `TELEGRAM_BOT_TOKEN` et `TELEGRAM_CHAT_ID` dans `.env`, puis relance `secrets set`. Sans eux, les pauses restent visibles dans le dashboard, mais rien ne te prévient.

## 4. Le paiement toutes les heures

Dans Supabase, ouvre **Integrations > Cron**, crée une tâche, puis :

- Horaire : `0 * * * *`
- Type : requête HTTP, méthode POST
- Adresse : `https://VOTRE_REF.supabase.co/functions/v1/cron`
- En-tête : `Authorization` = `Bearer ` suivi de la valeur `CRON_SECRET` de ton `.env`

Un lot paie environ 120 membres au maximum, à un paiement par seconde. Le reste part au lot suivant. Le bouton « Lancer le lot maintenant » du dashboard fait la même chose.

## 5. Le site

Le site est servi depuis `shigyn.github.io/CryptoQuest2/`. Envoie-moi la **référence Supabase** et la **clé de site Turnstile** : je remplis `public/config.js` et je pousse. Complète aussi les passages surlignés de `public/legal.html`.

Pour afficher des pubs : passe d'abord sur ton propre domaine avec Cloudflare Pages (dossier `public/`), puis mets à jour `SITE_URL` et `ALLOWED_ORIGIN`. Le code des pubs va dans `ADS` de `public/config.js`.

## 6. Vérifications avec de l'argent réel

À faire dans cet ordre, avant de faire connaître le site.

- [ ] **Dashboard :** connecte-toi. Le solde USDT doit correspondre à FaucetPay. S'il affiche « Format de solde inattendu », préviens-moi.
- [ ] **Taux :** dans Réglages, mets la valeur du jour pour « Combien pour 1 € » (1,10 USDT n'est qu'une valeur de départ).
- [ ] **Premier retrait :** crée un compte, réclame, puis retire. Compare ce qui quitte le solde et ce qui arrive sur ton compte : **s'ils diffèrent, il y a des frais**.
- [ ] **Montant :** 2 CC doivent donner 0,00022 USDT au taux de 1,10. Si FaucetPay refuse ou envoie un autre montant, préviens-moi. Refais ce contrôle pour chaque nouvelle crypto.
- [ ] **Adresse inconnue :** essaie de relier un compte qui n'existe pas. Le site doit le refuser.
- [ ] **Délai par IP :** envoie deux réclamations depuis deux comptes avec un faux en-tête `X-Forwarded-For` différent. La seconde doit répondre `cooldown`. Si elle passe, **n'ouvre pas le site** et préviens-moi.
- [ ] **Lot horaire :** valide un gain, lance le lot, vérifie le paiement.

Pour connecter un vrai réseau de liens ou d'offres, ajoute-le dans le dashboard, onglet « PTC, liens, offres », avec l'adresse fournie par le réseau. Le format de chaque réseau reste à vérifier au branchement.

## Si quelque chose tourne mal

- **Tout arrêter :** bouton « Mettre en pause » du dashboard.
- **Clé exposée :** révoque-la dans FaucetPay, remplace-la dans `.env`, relance `secrets set`.
- **Retrait « Sans réponse » :** bouton « Relancer » du dashboard. FaucetPay reconnaît le retrait et ne paie pas deux fois.
