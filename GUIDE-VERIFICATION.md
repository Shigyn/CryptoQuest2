# Vérifier CryptoQuest, étape par étape

Fais les étapes dans l'ordre. Coche au fur et à mesure. Si une étape ne donne pas le résultat attendu, envoie une capture : c'est corrigé tout de suite.

## A. Mettre la dernière version en ligne

1. **Petit SQL** : Supabase > SQL Editor > New query > colle le contenu de `supabase/patch-jeux-annonceurs.sql` > Run. Il ne touche à aucune donnée.
2. **Nom d'utilisateur marchand** (pour l'espace annonceur) : dans `.env`, ligne `FAUCETPAY_MERCHANT_USERNAME=`, mets ton **pseudo FaucetPay** une fois ton compte marchand accepté. Tant que la ligne est vide, la page annonceur affiche « ouvre bientôt ».
3. **Terminal**, dossier `C:/Users/masia/Desktop/Faucet`, une commande à la fois :

```bash
npx supabase secrets set --env-file .env
```

```bash
npx supabase functions deploy api admin postback cron merchant --no-verify-jwt
```

4. Ouvre https://shigyn.github.io/CryptoQuest2/ et recharge avec **Ctrl+F5**.

## B. Le site, côté joueur

- [ ] **Entrée** : un seul champ, ton adresse FaucetPay, bouton « Entrer et jouer ». Pas de captcha.
- [ ] **Accueil** : 4 cartes (Solde, Tirages, Série, Niveau), la table des gains et le compteur.
- [ ] **Tirage** : valide le captcha, « Lancer le tirage ». Le compteur défile puis s'arrête, la ligne gagnée s'allume, « + Coins » s'envole. Le bouton affiche ensuite le compte à rebours.
- [ ] **Jeux > Roue du jour** : avant le premier tirage, le bouton est **gris**. Après, il devient orange. Un tour, gain affiché, puis « Reviens demain ».
- [ ] **Jeux > Bonus quotidien** : même chose, gris avant le tirage, orange après, une fois par jour.
- [ ] **Jeux > Quêtes** : la barre avance à chaque tirage ; le bouton devient orange quand l'objectif est atteint.
- [ ] **Jeux > Mines** : « Nouvelle partie », ouvre des cases (étoile verte = gagné), « Encaisser ». Une bombe arrête la partie sans rien retirer. 3 parties par jour.
- [ ] **Jeux > Dice** : choisis ta cible avec le curseur, « Lancer le dé ». Vert = gagné, rouge = raté. 3 lancers par jour.
- [ ] **Portefeuille** : solde en Coins, « Retirer maintenant », phrase en italique sur le délai, historique des retraits et de l'activité.
- [ ] **Profil** : niveau, lien de parrainage (bouton Copier), mot de passe facultatif, lien « Faire de la pub », déconnexion.
- [ ] **Profil > Sécurité** : ajoute un mot de passe, déconnecte-toi, reconnecte-toi : le mot de passe est demandé.
- [ ] **Sur ton téléphone** : mêmes écrans, onglets en bas, rien ne dépasse sur les côtés.

## C. Le dashboard (shigyn.github.io/CryptoQuest2/public/admin.html)

Mot de passe : ligne `ADMIN_PASSWORD` de ton `.env`.

- [ ] **Vue d'ensemble** : le solde USDT correspond à FaucetPay ; la dette envers les membres est cohérente.
- [ ] **Réglages > Cryptos** : USDT, LTC, BTC ont un taux et une heure de mise à jour récente. À la prochaine heure pile, l'heure change toute seule.
- [ ] **Réglages > Récompenses** : tu vois les réglages de Mines, Dice et des annonceurs. Change une valeur, enregistre, vérifie sur le site.
- [ ] **Membres** : ton compte apparaît, avec ton nombre de tirages.
- [ ] **Retraits** : ton retrait réel apparaît en « Payé » avec son numéro FaucetPay.
- [ ] **Simulateur** : « Remplir avec mes 7 derniers jours », puis regarde le résultat par source.

## D. Annonceurs (quand ton compte marchand FaucetPay est accepté)

- [ ] Profil > « Faire de la pub » : titre, adresse en https, durée, nombre de vues. Le total en USDT s'affiche.
- [ ] « Payer avec FaucetPay » t'envoie sur la page de paiement FaucetPay. Fais un test avec la plus petite campagne (100 vues).
- [ ] Après paiement, la campagne apparaît « En vérification » dans « Mes campagnes », et une alerte arrive (Telegram si configuré).
- [ ] Dashboard > PTC, liens, offres : la campagne est marquée « À approuver ». Clique « Approuver » : elle apparaît dans Gagner > Pubs.

## E. Offerwalls et bannières (quand tu as tes comptes)

- [ ] **Offerwall** : dashboard > PTC, liens, offres > Offerwalls. Ajoute le réseau, copie l'adresse de retour affichée chez le réseau. Fais une offre test : elle doit arriver dans « À valider ».
- [ ] **Bannières** : envoie le code HTML du réseau ; il sera placé dans le site.

## Si quelque chose bloque

- **Tout arrêter** : dashboard > « Mettre en pause ».
- **Retrait « Sans réponse »** : dashboard > Retraits > « Relancer » (jamais de double paiement).
- **Page ancienne** : Ctrl+F5.
