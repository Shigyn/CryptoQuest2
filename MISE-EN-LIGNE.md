# Mettre le faucet en ligne

Compte environ 30 minutes. Tu saisis toi-même chaque clé secrète : ne les colle jamais dans `public/` ni dans une conversation.

## Essayer d'abord sans argent réel

```bash
cd C:/Users/masia/Desktop/Faucet
npm run dev
```

- Faucet : http://localhost:8188
- Dashboard : http://localhost:8188/admin.html, mot de passe `mot-de-passe-de-test-long`
- Adresses d'essai : `inconnu@x.com` (compte inexistant), `panne-totale@x.com` (FaucetPay ne répond pas), toute autre adresse (paiement simulé)

## 1. FaucetPay

1. Crée un faucet dans le tableau de bord des propriétaires.
2. Dépose une petite somme en DOGE sur le solde **de ce faucet**.
3. Dans Manage > Scoped API keys, crée une clé avec les droits **read** et **send**, et un **plafond quotidien** bas (2 $ par exemple). La clé n'est affichée qu'une fois.
4. Regarde les règles anti-fraude du faucet et active-les : la détection de VPN n'est pas construite de notre côté.

## 2. Captcha Cloudflare Turnstile

Crée un widget Turnstile pour ton domaine. Note la **clé de site** (publique) et la **clé secrète**.

## 3. Supabase

Crée un **projet dédié**, dans une organisation à part de LocWeb et de CryptoQuest, puis :

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
npx supabase db push
```

Crée un fichier `.env` local (déjà exclu de git) contenant :

```
FAUCETPAY_API_KEY=la clé read + send
TURNSTILE_SECRET=la clé secrète Turnstile
IP_PEPPER=une longue chaîne aléatoire, à ne jamais changer
ADMIN_PASSWORD=au moins 16 caractères, 24 conseillés
ALLOWED_ORIGIN=https://ton-domaine.com
```

Facultatif, pour recevoir les alertes sur Telegram : `TELEGRAM_BOT_TOKEN` et `TELEGRAM_CHAT_ID`. Sans eux, les pauses restent visibles dans le dashboard, mais rien ne te prévient.

```bash
npx supabase secrets set --env-file .env
```

```bash
npx supabase functions deploy claim status admin --no-verify-jwt
```

## 4. Le site

1. Remplis `public/config.js` : nom du site, `API_BASE` (`https://VOTRE_REF.supabase.co/functions/v1`), clé de site Turnstile.
2. Complète les passages surlignés de `public/legal.html`.
3. Envoie le dossier `public/` sur Cloudflare Pages (Create > Pages > Upload assets) et branche ton domaine.

## 5. Vérifications avec de l'argent réel

À faire dans cet ordre, avant de faire connaître le site.

- [ ] **Dashboard :** connecte-toi. Le solde DOGE doit correspondre à FaucetPay. S'il affiche « Format de solde inattendu », préviens-moi.
- [ ] **Premier paiement :** réclame depuis le site avec ton propre compte. Compare ce qui quitte le solde du faucet et ce qui arrive sur ton compte : **s'ils diffèrent, il y a des frais**.
- [ ] **Montant :** vérifie que tu reçois bien le montant affiché. Refais ce contrôle pour chaque nouvelle crypto.
- [ ] **Adresse inconnue :** essaie une adresse qui n'existe pas. Le site doit afficher « FaucetPay ne connaît pas ce compte », et rien ne doit partir.
- [ ] **Délai par IP :** depuis un terminal, envoie deux réclamations pour des comptes différents avec un faux en-tête `X-Forwarded-For` différent à chaque fois. La seconde doit répondre `cooldown`. Si elle passe, **ne lance pas le site** et préviens-moi : le délai par IP serait contournable.
- [ ] **Récompense :** l'exemple de départ est 0,002 DOGE. Ajuste-la, ainsi que le plafond horaire de 200 réclamations, selon ton budget.

## Si quelque chose tourne mal

- **Tout arrêter :** bouton « Mettre en pause » du dashboard.
- **Clé exposée :** révoque-la dans FaucetPay, puis remplace-la dans `.env`, relance `secrets set`.
- **Réclamation « Sans réponse » :** bouton « Relancer » du dashboard. FaucetPay reconnaît la réclamation et ne paie pas deux fois.
