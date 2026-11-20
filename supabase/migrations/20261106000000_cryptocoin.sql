-- CryptoCoin : schema complet. Rejouable : efface d'abord l'ancienne version, sans donnees reelles a ce stade.
-- Toute regle d'argent est ici. Tables fermees (RLS sans politique), fonctions reservees a service_role.

drop table if exists watch_views, chat_messages, ad_impressions, ticket_messages, tickets, notifications, promo_redemptions, promo_codes,
  user_achievements, achievements, tournament_awards, user_cosmetics, cosmetics, game_plays, vip_orders, ad_orders, challenge_done, challenges, offerwalls, ptc_views, ptc_campaigns, shortlink_visits,
  shortlink_providers, earnings, withdrawals, claims, ledger, sessions, users, bans, coins, settings cascade;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f'
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute 'drop function ' || f.sig || ' cascade';
  end loop;
end $$;

create table settings (
  id int primary key default 1 check (id = 1),
  paused boolean not null default false,
  pause_reason text,
  tokens_per_eur int not null default 10000 check (tokens_per_eur > 0),
  faucet_reward_tokens int not null default 2 check (faucet_reward_tokens >= 0),
  cooldown_seconds int not null default 30 check (cooldown_seconds >= 10),
  -- Energie : 1 point toutes les energy_regen_seconds, reserve de energy_max (energy_max_vip pour les VIP).
  -- Chaque tirage coute 1 point ; cooldown_seconds reste le minimum entre deux tirages.
  -- Montant minimum d'un retrait (instantane ou lot horaire), en Coins.
  min_withdraw_tokens int not null default 1 check (min_withdraw_tokens >= 1),
  -- Tirage en 2 etapes : secondes entre « Lancer » et « Recuperer ». Paiement auto du solde disponible au lot horaire.
  roll_reveal_seconds int not null default 8 check (roll_reveal_seconds between 0 and 60),
  auto_payout boolean not null default false,
  -- Watch Ads (videos recompensees) : la recompense = watch_revenue_eur x tokens_per_eur x watch_share_percent / 100.
  watch_daily_limit int not null default 30 check (watch_daily_limit >= 0),
  watch_gap_seconds int not null default 60 check (watch_gap_seconds >= 0),
  watch_seconds int not null default 30 check (watch_seconds >= 5),
  watch_revenue_eur numeric not null default 0.002 check (watch_revenue_eur >= 0),
  watch_share_percent numeric not null default 50 check (watch_share_percent between 0 and 100),
  energy_regen_seconds int not null default 1200 check (energy_regen_seconds >= 60),
  energy_max int not null default 3 check (energy_max between 1 and 50),
  energy_max_vip int not null default 5 check (energy_max_vip between 1 and 50),
  max_claims_account_day int not null default 48 check (max_claims_account_day >= 1),
  max_claims_ip_day int not null default 48 check (max_claims_ip_day >= 1),
  max_claims_site_hour int not null default 200 check (max_claims_site_hour >= 1),
  max_payout_eur_day numeric not null default 5 check (max_payout_eur_day > 0),
  max_signups_ip_day int not null default 3 check (max_signups_ip_day >= 1),
  daily_bonus_tokens int not null default 5 check (daily_bonus_tokens >= 0),
  daily_bonus_min_claims int not null default 1 check (daily_bonus_min_claims >= 0),
  -- Roue du jour : gratuite, un tour par jour, sans mise. Chaque case a la meme chance.
  wheel_prizes int[] not null default '{1,1,2,2,3,3,5,10,20}' check (cardinality(wheel_prizes) between 2 and 16),
  wheel_min_claims int not null default 1 check (wheel_min_claims >= 0),
  wheel_hours int not null default 4 check (wheel_hours >= 1),
  -- Taux de change mis a jour par le lot horaire (un seul appel CoinGecko par heure).
  auto_rates boolean not null default true,
  -- Jeux gratuits, sans mise : quelques parties par jour, apres un premier tirage.
  mines_daily_plays int not null default 3 check (mines_daily_plays >= 0),
  mines_rewards int[] not null default '{1,2,4,6,9,13,18,25,35,50}' check (cardinality(mines_rewards) between 1 and 20),
  dice_daily_plays int not null default 3 check (dice_daily_plays >= 0),
  dice_unit int not null default 2 check (dice_unit >= 0),
  -- Espace annonceur : prix par vue de 10 s, et part reversee aux membres.
  ad_price_eur_per_view numeric not null default 0.002 check (ad_price_eur_per_view > 0),
  ad_reward_share numeric not null default 50 check (ad_reward_share between 0 and 100),
  -- VIP : abonnement paye via FaucetPay. Avantages fixes, jamais de tirage ni de chance de gain en plus.
  vip_price_eur numeric not null default 2.99 check (vip_price_eur > 0),
  vip_days int not null default 30 check (vip_days between 1 and 365),
  vip_task_bonus numeric not null default 10 check (vip_task_bonus between 0 and 100),
  vip_referral_percent numeric not null default 15 check (vip_referral_percent between 0 and 50),
  boost_price_tokens int not null default 1000 check (boost_price_tokens >= 1),
  boost_percent numeric not null default 20 check (boost_percent between 0 and 100),
  boost_hours int not null default 24 check (boost_hours between 1 and 168),
  -- Refonte : emplacements pub (codes par emplacement), serie de 7 jours, bonus de niveau sur le tirage de base.
  ad_slots jsonb not null default '{}',
  daily_streak_rewards int[] not null default '{5,6,8,10,12,15,25}' check (cardinality(daily_streak_rewards) between 1 and 31),
  -- Niveaux : 1 tirage = 1 XP. Niveau 1 -> 2 : level_xp_first ; niveau n -> n+1 : level_xp_step x (n - 1).
  -- Chaque niveau multiplie le gain de base du tirage de level_mult_percent (2 % : x1,02 au niveau 2, x1,98 au niveau 50).
  level_xp_first int not null default 50 check (level_xp_first >= 1),
  level_xp_step int not null default 100 check (level_xp_step >= 1),
  level_max int not null default 50 check (level_max between 2 and 200),
  level_mult_percent numeric not null default 2 check (level_mult_percent between 0 and 20),
  tournament_prizes int[] not null default '{5000,3000,2000,1000,1000,500,500,500,500,500}' check (cardinality(tournament_prizes) between 1 and 50),
  -- Tirage gratuit du faucet : nombre de 0 a 99 999. Sous le premier palier, la recompense de base.
  roll_tiers jsonb not null default '[{"from": 99500, "tokens": 10}, {"from": 99950, "tokens": 1000}, {"from": 99999, "tokens": 100000}]',
  referral_percent numeric not null default 10 check (referral_percent >= 0 and referral_percent <= 50),
  offer_share_percent numeric not null default 50 check (offer_share_percent >= 0 and offer_share_percent <= 100),
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1);

-- per_eur : combien de cette crypto pour 1 euro, regle dans le dashboard. Montants en plus petite unite.
create table coins (
  code text primary key,
  name text not null,
  decimals int not null default 8,
  per_eur numeric check (per_eur is null or per_eur > 0),
  low_balance_units bigint not null default 0,
  enabled boolean not null default false,
  sort int not null default 100,
  last_balance_units bigint,
  last_balance_at timestamptz,
  -- Identifiant CoinGecko, pour le taux automatique. Vide : taux saisi a la main.
  price_id text,
  rate_updated_at timestamptz
);
insert into coins (code, name, per_eur, low_balance_units, enabled, sort, price_id) values
  ('USDT', 'Tether', 1.10, 100000000, true, 1, 'tether'), ('LTC', 'Litecoin', null, 0, true, 2, 'litecoin'),
  ('BTC', 'Bitcoin', null, 0, true, 3, 'bitcoin'), ('DOGE', 'Dogecoin', null, 0, false, 4, 'dogecoin'),
  ('TRX', 'TRON', null, 0, false, 5, 'tron'), ('ETH', 'Ethereum', null, 0, false, 6, 'ethereum'),
  ('USDC', 'USD Coin', null, 0, false, 7, 'usd-coin'), ('SOL', 'Solana', null, 0, false, 8, 'solana'),
  ('BNB', 'BNB', null, 0, false, 9, 'binancecoin'), ('BCH', 'Bitcoin Cash', null, 0, false, 10, 'bitcoin-cash'),
  ('DASH', 'Dash', null, 0, false, 11, 'dash'), ('DGB', 'DigiByte', null, 0, false, 12, 'digibyte'),
  ('ZEC', 'Zcash', null, 0, false, 13, 'zcash'), ('FEY', 'Feyorra', null, 0, false, 14, null);

-- Le compte, c'est l'adresse FaucetPay : pas d'e-mail ni de mot de passe a part.
-- Les gains ne peuvent partir que vers cette adresse.
create table users (
  id uuid primary key default gen_random_uuid(),
  ref_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  referrer_id uuid references users (id),
  referral_carry numeric not null default 0,
  -- XP (un point par tirage) et fractions de Coins en attente du multiplicateur de niveau.
  xp bigint not null default 0,
  -- Energie gardee au dernier tirage (vide = reserve pleine) et date de ce tirage.
  energy numeric,
  energy_at timestamptz,
  chat_muted_until timestamptz,
  -- Tirage fait mais pas encore recupere : {roll, tokens, at, level, level_up}.
  pending_roll jsonb,
  faucet_carry numeric not null default 0,
  fp_address text not null,
  fp_norm text not null unique,
  fp_user_hash text unique,
  -- Facultatif : une fois choisi, l'adresse seule ne suffit plus pour se connecter.
  password_hash text,
  -- Verrou apres 5 mauvais mots de passe en 15 minutes.
  failed_logins int not null default 0,
  locked_until timestamptz,
  vip_until timestamptz,
  -- Boutique : boost achete en Coins, objets cosmetiques portes (codes de la table cosmetics).
  boost_until timestamptz,
  daily_streak int not null default 0,
  notif_seen_at timestamptz,
  frame text,
  name_color text,
  title text,
  payout_coin text not null default 'USDT' references coins (code),
  -- available : retirable tout de suite. pending : a valider. validated : part au prochain lot horaire.
  available bigint not null default 0,
  pending bigint not null default 0,
  validated bigint not null default 0,
  last_daily_day date,
  last_wheel_day date,
  last_wheel_at timestamptz,
  signup_ip_hash text not null,
  last_ip_hash text,
  banned boolean not null default false,
  ban_reason text,
  created_at timestamptz not null default now()
);
create index users_referrer_idx on users (referrer_id);
create index users_signup_ip_idx on users (signup_ip_hash, created_at desc);
create index users_last_ip_idx on users (last_ip_hash);

create table sessions (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null
);

create table ledger (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid not null references users (id),
  bucket text not null check (bucket in ('available', 'pending', 'validated')),
  delta bigint not null,
  source text not null,
  ref text
);
create index ledger_user_idx on ledger (user_id, at desc);
create index ledger_source_idx on ledger (source, at desc);

create table claims (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid not null references users (id),
  ip_hash text not null,
  tokens int not null
);
create index claims_user_idx on claims (user_id, at desc);
create index claims_ip_idx on claims (ip_hash, at desc);
create index claims_at_idx on claims (at desc);

create table withdrawals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references users (id),
  kind text not null check (kind in ('instant', 'hourly')),
  tokens bigint not null check (tokens > 0),
  coin text not null references coins (code),
  amount_units bigint not null check (amount_units > 0),
  to_address text not null,
  -- reserved : en cours ; paid ; failed : rien n'est parti, tokens rendus ; unknown : a relancer.
  status text not null default 'reserved' check (status in ('reserved', 'paid', 'failed', 'unknown')),
  payout_id text,
  error text,
  finished_at timestamptz
);
create index withdrawals_status_idx on withdrawals (status, created_at desc);
create index withdrawals_user_idx on withdrawals (user_id, created_at desc);
create index withdrawals_created_idx on withdrawals (created_at desc);

create table earnings (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references users (id),
  source text not null check (source in ('ptc', 'shortlink', 'offer', 'video')),
  ref text not null,
  label text,
  tokens bigint not null check (tokens >= 0),
  revenue_eur numeric,
  status text not null default 'pending' check (status in ('pending', 'validated', 'paying', 'paid', 'rejected', 'reversed')),
  risk text,
  withdrawal_id uuid references withdrawals (id),
  unique (source, ref)
);
create index earnings_status_idx on earnings (status, created_at);
create index earnings_user_idx on earnings (user_id, created_at desc);
create index earnings_withdrawal_idx on earnings (withdrawal_id);

create table bans (
  kind text not null check (kind in ('ip', 'account')),
  value text not null,
  reason text,
  created_at timestamptz not null default now(),
  primary key (kind, value)
);

create table ptc_campaigns (
  id bigint generated always as identity primary key,
  title text not null,
  url text not null,
  reward_tokens int not null check (reward_tokens > 0),
  duration_seconds int not null default 10 check (duration_seconds >= 3),
  max_views int not null default 1000 check (max_views >= 0),
  views int not null default 0,
  price_eur_per_view numeric not null default 0,
  -- window : nouvel onglet ; iframe : dans la page ; video : YouTube integre.
  kind text not null default 'window' check (kind in ('window', 'iframe', 'video')),
  enabled boolean not null default true,
  -- Campagne achetee par un annonceur : en attente de ton approbation.
  needs_review boolean not null default false,
  advertiser_id uuid references users (id),
  created_at timestamptz not null default now()
);
create table ptc_views (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references ptc_campaigns (id),
  user_id uuid not null references users (id),
  day date not null default (now() at time zone 'utc')::date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (campaign_id, user_id, day)
);

-- api_url : adresse fournie par le reseau, avec {url} a la place du lien a raccourcir.
create table shortlink_providers (
  id bigint generated always as identity primary key,
  name text not null,
  api_url text not null,
  reward_tokens int not null check (reward_tokens > 0),
  revenue_eur_per_view numeric not null default 0,
  daily_limit int not null default 1 check (daily_limit >= 1),
  enabled boolean not null default true
);
create table shortlink_visits (
  token text primary key,
  provider_id bigint not null references shortlink_providers (id),
  user_id uuid not null references users (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index shortlink_visits_user_idx on shortlink_visits (user_id, created_at desc);

-- iframe_url : adresse fournie par le reseau, avec {user} a la place du code utilisateur.
create table offerwalls (
  code text primary key,
  name text not null,
  iframe_url text not null,
  postback_secret text not null,
  reversed_status text not null default 'reversed',
  -- offers : offres classiques ; surveys : sondages remuneres (carte a part dans Gagner).
  kind text not null default 'offers' check (kind in ('offers', 'surveys')),
  -- Evenement : bonus temporaire en % sur ce mur.
  bonus_percent numeric not null default 0 check (bonus_percent between 0 and 200),
  enabled boolean not null default true
);

create table game_plays (
  id bigint generated always as identity primary key,
  user_id uuid not null references users (id),
  game text not null check (game in ('mines', 'dice')),
  day date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  status text not null check (status in ('active', 'won', 'lost', 'done')),
  -- Pour Mines, la position des bombes reste ici et n'est jamais envoyee avant la fin.
  state jsonb not null default '{}',
  tokens int not null default 0
);
create index game_plays_user_idx on game_plays (user_id, day);
create unique index game_plays_one_active on game_plays (user_id) where game = 'mines' and status = 'active';

create table ad_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references users (id),
  title text not null,
  url text not null,
  duration_seconds int not null,
  views int not null,
  price_eur numeric not null,
  amount_usdt numeric not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  campaign_id bigint,
  tx_id text unique,
  paid_at timestamptz,
  -- Campagne payee en Coins : montant retire du solde, rendu si la campagne est refusee.
  tokens_paid bigint,
  kind text not null default 'window' check (kind in ('window', 'iframe', 'video'))
);
create index ad_orders_user_idx on ad_orders (user_id, created_at desc);

create table vip_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references users (id),
  days int not null,
  price_eur numeric not null,
  amount_usdt numeric not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  tx_id text unique,
  paid_at timestamptz
);
create index vip_orders_user_idx on vip_orders (user_id, created_at desc);

create table challenges (
  id bigint generated always as identity primary key,
  name text not null,
  -- Objectif du jour : claims = tirages, earned = Coins gagnes, ptc = pubs vues, links = liens passes,
  -- surveys = sondages termines, offers = offres terminees. target_claims porte la valeur a atteindre.
  goal text not null default 'claims' check (goal in ('claims', 'earned', 'ptc', 'links', 'surveys', 'offers')),
  period text not null default 'day' check (period in ('day', 'week')),
  target_claims int not null check (target_claims >= 1),
  reward_tokens int not null check (reward_tokens > 0),
  enabled boolean not null default true
);
insert into challenges (name, goal, target_claims, reward_tokens) values
  ('5 tirages', 'claims', 5, 2), ('15 tirages', 'claims', 15, 5), ('30 tirages', 'claims', 30, 10),
  ('100 Coins gagnés', 'earned', 100, 3), ('1 000 Coins gagnés', 'earned', 1000, 25), ('10 000 Coins gagnés', 'earned', 10000, 200),
  ('5 pubs', 'ptc', 5, 5), ('3 liens', 'links', 3, 10),
  ('1 sondage', 'surveys', 1, 20), ('3 sondages', 'surveys', 3, 80),
  ('1 offre', 'offers', 1, 20), ('3 offres', 'offers', 3, 80);
insert into challenges (name, goal, period, target_claims, reward_tokens) values
  ('150 tirages cette semaine', 'claims', 'week', 150, 30), ('20 000 Coins cette semaine', 'earned', 'week', 20000, 300),
  ('30 pubs cette semaine', 'ptc', 'week', 30, 40), ('15 liens cette semaine', 'links', 'week', 15, 60),
  ('10 sondages cette semaine', 'surveys', 'week', 10, 200);
create table challenge_done (
  challenge_id bigint not null references challenges (id),
  user_id uuid not null references users (id),
  day date not null,
  primary key (challenge_id, user_id, day)
);

-- Boutique : objets cosmetiques (cadre d'avatar, couleur du pseudo, titre). Aucun effet sur les gains.
create table cosmetics (
  code text primary key,
  kind text not null check (kind in ('frame', 'color', 'title')),
  name text not null,
  name_en text not null,
  price_tokens int not null check (price_tokens >= 0),
  sort int not null default 100,
  enabled boolean not null default true
);
insert into cosmetics (code, kind, name, name_en, price_tokens, sort) values
  ('frame_gold', 'frame', 'Cadre doré', 'Gold frame', 2000, 1),
  ('frame_neon', 'frame', 'Cadre néon', 'Neon frame', 3000, 2),
  ('frame_fire', 'frame', 'Cadre de feu', 'Fire frame', 5000, 3),
  ('frame_rainbow', 'frame', 'Cadre arc-en-ciel', 'Rainbow frame', 10000, 4),
  ('color_mint', 'color', 'Pseudo menthe', 'Mint name', 1000, 1),
  ('color_pink', 'color', 'Pseudo rose', 'Pink name', 1000, 2),
  ('color_gold', 'color', 'Pseudo doré', 'Gold name', 2500, 3),
  ('color_rainbow', 'color', 'Pseudo arc-en-ciel', 'Rainbow name', 8000, 4),
  ('title_hunter', 'title', 'Chasseur de Coins', 'Coin Hunter', 1000, 1),
  ('title_lucky', 'title', 'Main chanceuse', 'Lucky Hand', 2500, 2),
  ('title_king', 'title', 'Roi du faucet', 'Faucet King', 6000, 3),
  ('title_legend', 'title', 'Légende', 'Legend', 20000, 4);
create table user_cosmetics (
  user_id uuid not null references users (id),
  code text not null references cosmetics (code),
  bought_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- Tournoi de la semaine : gagnants payes, une ligne par place.
create table tournament_awards (
  week date not null,
  rank int not null,
  user_id uuid not null references users (id),
  score bigint not null,
  tokens int not null,
  created_at timestamptz not null default now(),
  primary key (week, rank)
);

-- Refonte : succes, codes promo, notifications, support, compteur de pubs.
create table achievements (
  code text primary key,
  name text not null,
  name_en text not null,
  -- claims, streak, level, ptc, links, surveys, offers, referrals, withdrawals, quests
  kind text not null,
  target int not null check (target >= 1),
  reward_tokens int not null check (reward_tokens >= 0),
  sort int not null default 100,
  enabled boolean not null default true
);
insert into achievements (code, name, name_en, kind, target, reward_tokens, sort) values
  ('claims_1', 'Premier tirage', 'First roll', 'claims', 1, 5, 1),
  ('claims_100', '100 tirages', '100 rolls', 'claims', 100, 20, 2),
  ('claims_1000', '1 000 tirages', '1,000 rolls', 'claims', 1000, 100, 3),
  ('claims_10000', '10 000 tirages', '10,000 rolls', 'claims', 10000, 500, 4),
  ('streak_7', 'Une semaine sans faute', 'One full week', 'streak', 7, 50, 10),
  ('streak_30', 'Un mois sans faute', 'One full month', 'streak', 30, 200, 11),
  ('streak_100', '100 jours de suite', '100-day streak', 'streak', 100, 1000, 12),
  ('level_10', 'Niveau 10', 'Level 10', 'level', 10, 50, 20),
  ('level_25', 'Niveau 25', 'Level 25', 'level', 25, 150, 21),
  ('level_50', 'Niveau 50', 'Level 50', 'level', 50, 400, 22),
  ('level_40', 'Niveau 40', 'Level 40', 'level', 40, 1500, 23),
  ('ptc_10', '10 pubs vues', '10 ads watched', 'ptc', 10, 20, 30),
  ('ptc_100', '100 pubs vues', '100 ads watched', 'ptc', 100, 100, 31),
  ('links_10', '10 liens passés', '10 links done', 'links', 10, 30, 40),
  ('links_100', '100 liens passés', '100 links done', 'links', 100, 150, 41),
  ('surveys_1', 'Premier sondage', 'First survey', 'surveys', 1, 20, 50),
  ('surveys_25', '25 sondages', '25 surveys', 'surveys', 25, 200, 51),
  ('surveys_100', '100 sondages', '100 surveys', 'surveys', 100, 800, 52),
  ('offers_1', 'Première offre', 'First offer', 'offers', 1, 20, 60),
  ('offers_25', '25 offres', '25 offers', 'offers', 25, 300, 61),
  ('referrals_1', 'Premier filleul actif', 'First active referral', 'referrals', 1, 50, 70),
  ('referrals_10', '10 filleuls actifs', '10 active referrals', 'referrals', 10, 300, 71),
  ('referrals_50', '50 filleuls actifs', '50 active referrals', 'referrals', 50, 1500, 72),
  ('withdrawals_1', 'Premier retrait', 'First withdrawal', 'withdrawals', 1, 20, 80),
  ('withdrawals_10', '10 retraits', '10 withdrawals', 'withdrawals', 10, 100, 81),
  ('quests_10', '10 quêtes', '10 quests', 'quests', 10, 50, 90),
  ('quests_100', '100 quêtes', '100 quests', 'quests', 100, 300, 91);
create table user_achievements (
  user_id uuid not null references users (id),
  code text not null references achievements (code),
  at timestamptz not null default now(),
  primary key (user_id, code)
);

create table promo_codes (
  code text primary key,
  tokens int not null check (tokens > 0),
  max_uses int not null default 100 check (max_uses >= 1),
  uses int not null default 0,
  expires_at timestamptz,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table promo_redemptions (
  code text not null references promo_codes (code),
  user_id uuid not null references users (id),
  at timestamptz not null default now(),
  primary key (code, user_id)
);

-- user_id vide : annonce pour tout le monde.
create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid references users (id),
  at timestamptz not null default now(),
  kind text not null,
  text text not null,
  text_en text,
  link text
);
create index notifications_user_idx on notifications (user_id, at desc);

create table tickets (
  id bigint generated always as identity primary key,
  user_id uuid not null references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subject text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed'))
);
create table ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references tickets (id),
  at timestamptz not null default now(),
  from_admin boolean not null default false,
  body text not null
);
create index ticket_messages_idx on ticket_messages (ticket_id, at);

-- Chat global. hidden : masque (moderation automatique ou admin) ; flagged : raison du blocage.
create table chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references users (id),
  at timestamptz not null default now(),
  body text not null,
  hidden boolean not null default false,
  flagged text
);
create index chat_messages_user_idx on chat_messages (user_id, at desc);

-- Watch Ads : une ligne par video lancee ; completed_at quand la vue est validee.
create table watch_views (
  token text primary key,
  user_id uuid not null references users (id),
  day date not null default (now() at time zone 'utc')::date,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index watch_views_user_idx on watch_views (user_id, started_at desc);

create table ad_impressions (
  day date not null default (now() at time zone 'utc')::date,
  slot text not null,
  n bigint not null default 0,
  primary key (day, slot)
);

alter table settings enable row level security;
alter table coins enable row level security;
alter table users enable row level security;
alter table sessions enable row level security;
alter table ledger enable row level security;
alter table claims enable row level security;
alter table withdrawals enable row level security;
alter table earnings enable row level security;
alter table bans enable row level security;
alter table ptc_campaigns enable row level security;
alter table ptc_views enable row level security;
alter table shortlink_providers enable row level security;
alter table shortlink_visits enable row level security;
alter table offerwalls enable row level security;
alter table challenges enable row level security;
alter table challenge_done enable row level security;
alter table game_plays enable row level security;
alter table ad_orders enable row level security;
alter table vip_orders enable row level security;
alter table cosmetics enable row level security;
alter table user_cosmetics enable row level security;
alter table tournament_awards enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;
alter table notifications enable row level security;
alter table tickets enable row level security;
alter table ticket_messages enable row level security;
alter table ad_impressions enable row level security;
alter table chat_messages enable row level security;
alter table watch_views enable row level security;

-- Mouvements -------------------------------------------------------------

create function move_tokens(p_user uuid, p_bucket text, p_delta bigint, p_source text, p_ref text)
returns void language plpgsql set search_path = public as $$
begin
  if p_delta = 0 then return; end if;
  insert into ledger (user_id, bucket, delta, source, ref) values (p_user, p_bucket, p_delta, p_source, p_ref);
  if p_bucket = 'available' then update users set available = available + p_delta where id = p_user;
  elsif p_bucket = 'pending' then update users set pending = pending + p_delta where id = p_user;
  else update users set validated = validated + p_delta where id = p_user;
  end if;
end $$;

-- Le parrain recoit un pourcentage. Les fractions s'accumulent : 10 % de 2 tokens ne se perdent pas.
create function credit_referral(p_user uuid, p_tokens bigint)
returns void language plpgsql set search_path = public as $$
declare
  rid uuid;
  pct numeric;
  carry numeric;
  whole bigint;
begin
  select referrer_id into rid from users where id = p_user;
  if rid is null then return; end if;
  select case when r.vip_until > now() then s.vip_referral_percent else s.referral_percent end into pct
    from settings s, users r where s.id = 1 and r.id = rid;
  update users set referral_carry = referral_carry + p_tokens * pct / 100 where id = rid
    returning referral_carry into carry;
  whole := floor(carry);
  if whole > 0 then
    update users set referral_carry = referral_carry - whole where id = rid;
    perform move_tokens(rid, 'available', whole, 'referral', p_user::text);
  end if;
end $$;

-- Comptes ----------------------------------------------------------------

-- Compte deja connu sous cette adresse : connexion sans appeler FaucetPay.
create function find_fp_user(p_norm text)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('user_id', id, 'password_hash', password_hash, 'banned', banned,
    'locked', locked_until is not null and locked_until > now()) from users where fp_norm = p_norm;
$$;

create function login_result(p_user uuid, p_ok boolean)
returns void language plpgsql set search_path = public as $fn$
begin
  if p_ok then
    update users set failed_logins = 0, locked_until = null where id = p_user;
  else
    update users set failed_logins = failed_logins + 1,
      locked_until = case when failed_logins + 1 >= 5 then now() + interval '15 minutes' else locked_until end
     where id = p_user;
    update users set failed_logins = 0 where id = p_user and failed_logins >= 5;
  end if;
end $fn$;

create function set_user_password(p_user uuid, p_hash text)
returns void language sql set search_path = public as $$
  update users set password_hash = p_hash where id = p_user;
  -- Les autres appareils sont deconnectes.
  delete from sessions where user_id = p_user;
$$;

-- Connexion par adresse FaucetPay. Une autre adresse du meme compte FaucetPay (e-mail, pseudo,
-- portefeuille) ouvre le meme compte ici. Sinon, le compte est cree.
create function fp_login(p_address text, p_norm text, p_hash text, p_ip_hash text, p_ref text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  n int;
  rid uuid;
  new_id uuid;
begin
  select * into s from settings where id = 1;
  if exists (select 1 from bans where (kind = 'ip' and value = p_ip_hash) or (kind = 'account' and value = p_hash)) then
    return jsonb_build_object('ok', false, 'code', 'banned');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('signup:' || p_ip_hash, 0));

  select * into u from users where fp_norm = p_norm or (p_hash is not null and fp_user_hash = p_hash) limit 1;
  if found then
    if u.banned then return jsonb_build_object('ok', false, 'code', 'banned'); end if;
    return jsonb_build_object('ok', true, 'user_id', u.id, 'created', false, 'password_hash', u.password_hash,
      'locked', u.locked_until is not null and u.locked_until > now());
  end if;

  select count(*) into n from users where signup_ip_hash = p_ip_hash and created_at > now() - interval '24 hours';
  if n >= s.max_signups_ip_day then return jsonb_build_object('ok', false, 'code', 'too_many_signups'); end if;
  -- Pas de parrainage depuis sa propre connexion.
  if p_ref is not null then
    select id into rid from users where ref_code = p_ref and signup_ip_hash <> p_ip_hash and not banned;
  end if;
  insert into users (fp_address, fp_norm, fp_user_hash, signup_ip_hash, last_ip_hash, referrer_id)
  values (p_address, p_norm, p_hash, p_ip_hash, p_ip_hash, rid) returning id into new_id;
  return jsonb_build_object('ok', true, 'user_id', new_id, 'created', true);
end $$;

create function create_session(p_token_hash text, p_user uuid)
returns void language sql set search_path = public as $$
  delete from sessions where expires_at < now();
  insert into sessions (token_hash, user_id, expires_at) values (p_token_hash, p_user, now() + interval '30 days');
$$;

create function delete_session(p_token_hash text)
returns void language sql set search_path = public as $$
  delete from sessions where token_hash = p_token_hash;
$$;

create function session_user_id(p_token_hash text, p_ip_hash text)
returns uuid language plpgsql set search_path = public as $$
declare uid uuid;
begin
  select user_id into uid from sessions where token_hash = p_token_hash and expires_at > now();
  if uid is not null then
    update users set last_ip_hash = p_ip_hash where id = uid and last_ip_hash is distinct from p_ip_hash;
  end if;
  return uid;
end $$;

create function set_payout_coin(p_user uuid, p_coin text)
returns jsonb language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from coins where code = p_coin and enabled and per_eur is not null) then
    return jsonb_build_object('ok', false, 'code', 'coin_unavailable');
  end if;
  update users set payout_coin = p_coin where id = p_user;
  return jsonb_build_object('ok', true);
end $$;

-- Refus communs : pause, bannissement. Renvoie un code ou null.
create function user_block(u users, p_ip_hash text)
returns text language plpgsql stable set search_path = public as $$
begin
  if (select paused from settings where id = 1) then return 'paused'; end if;
  if u.banned then return 'banned'; end if;
  if exists (select 1 from bans where (kind = 'ip' and value = p_ip_hash)
                                   or (kind = 'account' and value = u.fp_user_hash)) then
    return 'banned';
  end if;
  return null;
end $$;

-- Faucet : tokens credites tout de suite ---------------------------------

create function faucet_claim(p_user uuid, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  roll int;
  reward int;
  s settings;
  u users;
  blk text;
  last_at timestamptz;
  exact numeric;
  en numeric;
  n int;
begin
  select * into u from users where id = p_user for update;
  perform pg_advisory_xact_lock(hashtextextended('ip:' || p_ip_hash, 0));
  select * into s from settings where id = 1;

  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.fp_address is null then return jsonb_build_object('ok', false, 'code', 'link_faucetpay'); end if;
  if s.faucet_reward_tokens <= 0 then return jsonb_build_object('ok', false, 'code', 'paused'); end if;
  -- Un tirage deja lance attend d'etre recupere.
  if u.pending_roll is not null then
    return jsonb_build_object('ok', false, 'code', 'roll_pending',
      'retry_after', greatest(ceil(extract(epoch from (u.pending_roll->>'at')::timestamptz + make_interval(secs => s.roll_reveal_seconds) - now())), 0)::int);
  end if;

  select max(at) into last_at from claims
   where at > now() - make_interval(secs => s.cooldown_seconds) and (user_id = p_user or ip_hash = p_ip_hash);
  if last_at is not null then
    return jsonb_build_object('ok', false, 'code', 'cooldown', 'retry_after',
      ceil(extract(epoch from last_at + make_interval(secs => s.cooldown_seconds) - now()))::int);
  end if;
  -- Energie : il faut au moins un point ; sinon on indique quand le prochain arrive.
  en := energy_now(u);
  if en < 1 then
    return jsonb_build_object('ok', false, 'code', 'no_energy', 'retry_after', ceil((1 - en) * s.energy_regen_seconds)::int);
  end if;

  select count(*) into n from claims where user_id = p_user and at > now() - interval '24 hours';
  if n >= s.max_claims_account_day then return jsonb_build_object('ok', false, 'code', 'daily_limit'); end if;
  select count(*) into n from claims where ip_hash = p_ip_hash and at > now() - interval '24 hours';
  if n >= s.max_claims_ip_day then return jsonb_build_object('ok', false, 'code', 'daily_limit'); end if;

  select count(*) into n from claims where at > now() - interval '1 hour';
  if n >= s.max_claims_site_hour then
    update settings set paused = true, updated_at = now(),
      pause_reason = 'Plafond horaire atteint (' || s.max_claims_site_hour || ' réclamations)' where id = 1;
    return jsonb_build_object('ok', false, 'code', 'paused', 'tripped', true);
  end if;

  -- Tirage cote serveur : le navigateur ne fait qu'afficher le nombre.
  roll := floor(random() * 100000)::int;
  reward := coalesce((select (t->>'tokens')::int from jsonb_array_elements(s.roll_tiers) t
                      where roll >= (t->>'from')::int order by (t->>'from')::int desc limit 1), s.faucet_reward_tokens);
  -- Niveau : multiplicateur sur tous les gains sauf le jackpot (le plus gros palier, qui reste fixe).
  -- Les fractions s'accumulent : x1,02 sur 2 Coins finit par donner un Coin de plus.
  if reward < coalesce((select max((t->>'tokens')::int) from jsonb_array_elements(s.roll_tiers) t), reward + 1) then
    exact := reward * (level_info(u.xp)->>'mult')::numeric + u.faucet_carry;
    reward := floor(exact)::int;
    update users set faucet_carry = exact - reward where id = p_user;
  end if;
  update users set xp = xp + 1, energy = en - 1, energy_at = now(),
    pending_roll = jsonb_build_object('roll', roll, 'tokens', reward, 'at', now(),
      'level', (level_info(u.xp + 1)->>'level')::int,
      'level_up', (level_info(u.xp + 1)->>'level')::int > (level_info(u.xp)->>'level')::int)
  where id = p_user;
  insert into claims (user_id, ip_hash, tokens) values (p_user, p_ip_hash, reward);
  -- Le resultat reste cache jusqu'a l'etape 2.
  return jsonb_build_object('ok', true, 'pending', true, 'wait', s.roll_reveal_seconds,
    'cooldown_seconds', s.cooldown_seconds, 'energy', floor(en - 1)::int);
end $$;

create function claim_daily(p_user uuid, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  blk text;
  today date := (now() at time zone 'utc')::date;
  n int;
begin
  select * into u from users where id = p_user for update;
  select * into s from settings where id = 1;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.last_daily_day = today then return jsonb_build_object('ok', false, 'code', 'already_done'); end if;
  select count(*) into n from claims where user_id = p_user and (at at time zone 'utc')::date = today;
  if n < s.daily_bonus_min_claims then return jsonb_build_object('ok', false, 'code', 'not_reached'); end if;
  n := case when u.last_daily_day = today - 1 then u.daily_streak + 1 else 1 end;
  update users set last_daily_day = today, daily_streak = n where id = p_user;
  n := s.daily_streak_rewards[((n - 1) % cardinality(s.daily_streak_rewards)) + 1];
  n := n + floor(n * boost_percent(u) / 100);
  perform move_tokens(p_user, 'available', n, 'daily', today::text);
  return jsonb_build_object('ok', true, 'tokens', n, 'streak', (select daily_streak from users where id = p_user));
end $$;

create function spin_wheel(p_user uuid, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  blk text;
  today date := (now() at time zone 'utc')::date;
  n int;
  idx int;
  prize int;
begin
  select * into u from users where id = p_user for update;
  select * into s from settings where id = 1;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.last_wheel_at > now() - make_interval(hours => s.wheel_hours) then
    return jsonb_build_object('ok', false, 'code', 'already_done', 'retry_after',
      ceil(extract(epoch from u.last_wheel_at + make_interval(hours => s.wheel_hours) - now()))::int);
  end if;
  select count(*) into n from claims where user_id = p_user and (at at time zone 'utc')::date = today;
  if n < s.wheel_min_claims then return jsonb_build_object('ok', false, 'code', 'not_reached'); end if;
  -- Tirage cote serveur : le navigateur ne fait qu'afficher le resultat.
  idx := floor(random() * cardinality(s.wheel_prizes))::int + 1;
  prize := s.wheel_prizes[idx];
  update users set last_wheel_day = today, last_wheel_at = now() where id = p_user;
  perform move_tokens(p_user, 'available', prize, 'wheel', now()::text);
  return jsonb_build_object('ok', true, 'tokens', prize, 'index', idx - 1);
end $$;

-- Avancement du jour (UTC) d'un membre sur un type d'objectif.
-- Refonte : fonctions des nouvelles pages ------------------------------------

-- Energie actuelle d'un membre : ce qu'il restait au dernier tirage + la recharge depuis, plafonnee a sa reserve.
create function energy_now(u users)
returns numeric language sql stable set search_path = public as $$
  select least(case when u.vip_until > now() then s.energy_max_vip else s.energy_max end,
               coalesce(u.energy + extract(epoch from now() - u.energy_at) / s.energy_regen_seconds,
                        case when u.vip_until > now() then s.energy_max_vip else s.energy_max end))
  from settings s where s.id = 1;
$$;

-- Niveau a partir de l'XP : niveau, XP deja faite dans le niveau, XP du niveau, multiplicateur du tirage.
create function level_info(p_xp bigint)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  s settings;
  lvl int := 1;
  need bigint;
  rest bigint := greatest(coalesce(p_xp, 0), 0);
begin
  select * into s from settings where id = 1;
  need := s.level_xp_first;
  while lvl < s.level_max and rest >= need loop
    rest := rest - need;
    lvl := lvl + 1;
    need := s.level_xp_step::bigint * (lvl - 1);
  end loop;
  return jsonb_build_object('level', lvl, 'max', lvl >= s.level_max,
    'into', case when lvl >= s.level_max then 0 else rest end,
    'need', case when lvl >= s.level_max then 0 else need end,
    'mult', round(1 + (lvl - 1) * s.level_mult_percent / 100.0, 4));
end $$;

-- Total gagne (sert au niveau) et serie de jours avec au moins un tirage.
create function user_earned(p_user uuid)
returns bigint language sql stable set search_path = public as $$
  select coalesce(sum(delta), 0)::bigint from ledger where user_id = p_user and delta > 0
    and source in ('faucet', 'daily', 'wheel', 'challenge', 'referral', 'ptc', 'shortlink', 'offer', 'video', 'mines', 'dice', 'tournament', 'achievement', 'promo');
$$;

create function user_streak(p_user uuid)
returns int language sql stable set search_path = public as $$
  with d as (select distinct (at at time zone 'utc')::date as day from claims
             where user_id = p_user and at > now() - interval '400 days'),
       g as (select day, day - (row_number() over (order by day))::int as grp from d)
  select coalesce(case when max(day) >= (now() at time zone 'utc')::date - 1
              then (select count(*) from g g2 where g2.grp = (select grp from g order by day desc limit 1)) else 0 end, 0)::int
  from g;
$$;

-- Avancement sur un type d'objectif depuis une date (quetes du jour ou de la semaine).
create function challenge_progress_since(p_user uuid, p_goal text, p_since timestamptz)
returns bigint language sql stable set search_path = public as $$
  select case p_goal
    when 'claims' then (select count(*) from claims where user_id = p_user and at >= p_since)
    when 'earned' then (select coalesce(sum(delta), 0) from ledger where user_id = p_user and delta > 0
                          and bucket in ('available', 'pending') and at >= p_since
                          and source in ('faucet', 'daily', 'wheel', 'mines', 'dice', 'referral', 'ptc', 'shortlink', 'offer', 'video'))::bigint
    when 'ptc' then (select count(*) from earnings where user_id = p_user and source = 'ptc'
                       and status not in ('rejected', 'reversed') and created_at >= p_since)
    when 'links' then (select count(*) from earnings where user_id = p_user and source = 'shortlink'
                         and status not in ('rejected', 'reversed') and created_at >= p_since)
    else (select count(*) from earnings e join offerwalls o on o.code = e.label
            where e.user_id = p_user and e.source = 'offer' and o.kind = p_goal
              and e.status not in ('rejected', 'reversed') and e.created_at >= p_since)
  end;
$$;

create function period_start(p_period text)
returns timestamptz language sql stable as $$
  select case when p_period = 'week' then date_trunc('week', now() at time zone 'utc') at time zone 'utc'
              else date_trunc('day', now() at time zone 'utc') at time zone 'utc' end;
$$;

-- Succes ----------------------------------------------------------------------
create function achievement_progress(p_user uuid, p_kind text)
returns bigint language sql stable set search_path = public as $$
  select case p_kind
    when 'claims' then (select count(*) from claims where user_id = p_user)
    when 'streak' then user_streak(p_user)::bigint
    when 'level' then (level_info((select xp from users where id = p_user))->>'level')::bigint
    when 'ptc' then (select count(*) from earnings where user_id = p_user and source = 'ptc' and status not in ('rejected', 'reversed'))
    when 'links' then (select count(*) from earnings where user_id = p_user and source = 'shortlink' and status not in ('rejected', 'reversed'))
    when 'referrals' then (select count(*) from users r where r.referrer_id = p_user and exists (select 1 from claims c where c.user_id = r.id))
    when 'withdrawals' then (select count(*) from withdrawals where user_id = p_user and status = 'paid')
    when 'quests' then (select count(*) from challenge_done where user_id = p_user)
    else (select count(*) from earnings e join offerwalls o on o.code = e.label
            where e.user_id = p_user and e.source = 'offer' and o.kind = p_kind and e.status not in ('rejected', 'reversed'))
  end;
$$;

create function achievements_list(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  with k as (select distinct kind from achievements where enabled),
       p as (select kind, achievement_progress(p_user, kind) as v from k)
  select coalesce(jsonb_agg(jsonb_build_object('code', a.code, 'name', a.name, 'name_en', a.name_en, 'kind', a.kind,
      'target', a.target, 'reward_tokens', a.reward_tokens, 'progress', least(p.v, a.target),
      'done', exists (select 1 from user_achievements x where x.user_id = p_user and x.code = a.code))
      order by a.sort, a.target), '[]'::jsonb)
  from achievements a join p on p.kind = a.kind where a.enabled;
$$;

create function claim_achievement(p_user uuid, p_code text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  a achievements;
  blk text;
begin
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into a from achievements where code = p_code and enabled;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if exists (select 1 from user_achievements where user_id = p_user and code = p_code) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  if achievement_progress(p_user, a.kind) < a.target then return jsonb_build_object('ok', false, 'code', 'not_reached'); end if;
  insert into user_achievements (user_id, code) values (p_user, p_code);
  perform move_tokens(p_user, 'available', a.reward_tokens, 'achievement', p_code);
  return jsonb_build_object('ok', true, 'tokens', a.reward_tokens);
end $$;

-- Codes promo -----------------------------------------------------------------
create function redeem_promo(p_user uuid, p_code text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  c promo_codes;
  blk text;
begin
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into c from promo_codes where code = upper(trim(p_code)) for update;
  if not found or not c.enabled or (c.expires_at is not null and c.expires_at < now()) then
    return jsonb_build_object('ok', false, 'code', 'promo_invalid');
  end if;
  if c.uses >= c.max_uses then return jsonb_build_object('ok', false, 'code', 'promo_used_up'); end if;
  if exists (select 1 from promo_redemptions where code = c.code and user_id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  insert into promo_redemptions (code, user_id) values (c.code, p_user);
  update promo_codes set uses = uses + 1 where code = c.code;
  perform move_tokens(p_user, 'available', c.tokens, 'promo', c.code);
  return jsonb_build_object('ok', true, 'tokens', c.tokens);
end $$;

create function admin_save_promo(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p ? 'tokens' then
    insert into promo_codes (code, tokens, max_uses, expires_at)
    values (upper(trim(p->>'code')), (p->>'tokens')::int, coalesce((p->>'max_uses')::int, 100), nullif(p->>'expires_at', '')::timestamptz)
    on conflict (code) do update set tokens = excluded.tokens, max_uses = excluded.max_uses, expires_at = excluded.expires_at;
  else
    update promo_codes set enabled = coalesce((p->>'enabled')::boolean, enabled) where code = upper(trim(p->>'code'));
  end if;
end $$;

-- Notifications ---------------------------------------------------------------
create function notify(p_user uuid, p_kind text, p_text text, p_text_en text, p_link text)
returns void language sql set search_path = public as $$
  insert into notifications (user_id, kind, text, text_en, link) values (p_user, p_kind, p_text, p_text_en, p_link);
$$;

create function list_notifications(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'at', n.at, 'kind', n.kind, 'text', n.text, 'text_en', n.text_en,
      'link', n.link, 'unread', n.at > coalesce(u.notif_seen_at, '-infinity'::timestamptz)) order by n.at desc), '[]'::jsonb)
  from users u
  join lateral (select * from notifications where (user_id = u.id or user_id is null) and at > u.created_at - interval '7 days'
                order by at desc limit 30) n on true
  where u.id = p_user;
$$;

create function read_notifications(p_user uuid)
returns jsonb language sql set search_path = public as $$
  update users set notif_seen_at = now() where id = p_user;
  select jsonb_build_object('ok', true);
$$;

create function admin_announce(p jsonb)
returns void language sql set search_path = public as $$
  insert into notifications (user_id, kind, text, text_en, link)
  values (null, 'announce', p->>'text', nullif(p->>'text_en', ''), nullif(p->>'link', ''));
$$;

-- Support ---------------------------------------------------------------------
create function ticket_create(p_user uuid, p_subject text, p_body text)
returns jsonb language plpgsql set search_path = public as $$
declare
  tid bigint;
begin
  if length(trim(coalesce(p_subject, ''))) not between 3 and 120 or length(trim(coalesce(p_body, ''))) not between 5 and 4000 then
    return jsonb_build_object('ok', false, 'code', 'bad_request');
  end if;
  if (select count(*) from tickets where user_id = p_user and status = 'open') >= 3 then
    return jsonb_build_object('ok', false, 'code', 'too_many_tickets');
  end if;
  insert into tickets (user_id, subject) values (p_user, trim(p_subject)) returning id into tid;
  insert into ticket_messages (ticket_id, body) values (tid, trim(p_body));
  return jsonb_build_object('ok', true, 'id', tid);
end $$;

create function ticket_reply(p_user uuid, p_id bigint, p_body text)
returns jsonb language plpgsql set search_path = public as $$
begin
  if length(trim(coalesce(p_body, ''))) not between 1 and 4000 then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  if not exists (select 1 from tickets where id = p_id and user_id = p_user and status <> 'closed') then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  insert into ticket_messages (ticket_id, body) values (p_id, trim(p_body));
  update tickets set status = 'open', updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create function ticket_list(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'subject', t.subject, 'status', t.status, 'updated_at', t.updated_at,
      'messages', (select jsonb_agg(jsonb_build_object('at', m.at, 'admin', m.from_admin, 'body', m.body) order by m.at)
                   from ticket_messages m where m.ticket_id = t.id)) order by t.updated_at desc), '[]'::jsonb)
  from tickets t where t.user_id = p_user;
$$;

create function admin_tickets(p_status text)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'subject', t.subject, 'status', t.status, 'updated_at', t.updated_at,
      'member', u.fp_address,
      'messages', (select jsonb_agg(jsonb_build_object('at', m.at, 'admin', m.from_admin, 'body', m.body) order by m.at)
                   from ticket_messages m where m.ticket_id = t.id)) order by t.updated_at desc), '[]'::jsonb)
  from tickets t join users u on u.id = t.user_id
  where p_status is null or p_status = '' or t.status = p_status;
$$;

create function admin_ticket_reply(p_id bigint, p_body text, p_close boolean)
returns void language plpgsql set search_path = public as $$
declare
  uid uuid;
begin
  select user_id into uid from tickets where id = p_id;
  if uid is null then return; end if;
  if length(trim(coalesce(p_body, ''))) > 0 then
    insert into ticket_messages (ticket_id, from_admin, body) values (p_id, true, trim(p_body));
    perform notify(uid, 'ticket', 'Le support a répondu à ta demande.', 'Support replied to your ticket.', '#support');
  end if;
  update tickets set status = case when p_close then 'closed' else 'answered' end, updated_at = now() where id = p_id;
end $$;

-- Parrainage, historique, preuves --------------------------------------------
create function referral_list(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'who', case when length(r.fp_address) >= 10 then left(r.fp_address, 3) || '…' || right(r.fp_address, 3) else '…' end,
      'since', r.created_at,
      'active', exists (select 1 from claims c where c.user_id = r.id and c.at > now() - interval '7 days'),
      'earned', (select coalesce(sum(delta), 0) from ledger l where l.user_id = p_user and l.source = 'referral' and l.ref = r.id::text))
      order by r.created_at desc), '[]'::jsonb)
  from (select * from users where referrer_id = p_user order by created_at desc limit 200) r;
$$;

create function my_history(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('at', at, 'source', source, 'bucket', bucket, 'delta', delta) order by at desc, id desc), '[]'::jsonb)
  from (select * from ledger where user_id = p_user order by at desc, id desc limit 500) x;
$$;

create function my_offers(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('at', e.created_at, 'wall', coalesce(o.name, e.label), 'kind', coalesce(o.kind, 'offers'),
      'tokens', e.tokens, 'status', e.status) order by e.created_at desc), '[]'::jsonb)
  from (select * from earnings where user_id = p_user and source = 'offer' order by created_at desc limit 50) e
  left join offerwalls o on o.code = e.label;
$$;

create function public_proofs()
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('at', w.finished_at, 'coin', w.coin, 'amount_units', w.amount_units,
      'decimals', c.decimals, 'tokens', w.tokens, 'payout_id', w.payout_id,
      'who', case when length(w.to_address) >= 10 then left(w.to_address, 3) || '…' || right(w.to_address, 3) else '…' end)
      order by w.finished_at desc), '[]'::jsonb)
  from (select * from withdrawals where status = 'paid' order by finished_at desc limit 100) w join coins c on c.code = w.coin;
$$;

-- Pubs : compteur d'affichages et campagnes de l'annonceur --------------------
create function ad_seen(p_slots text[])
returns void language sql set search_path = public as $$
  insert into ad_impressions (slot, n)
  select s, count(*) from unnest(p_slots[1:20]) s where s ~ '^[a-z_]{2,24}$' group by s
  on conflict (day, slot) do update set n = ad_impressions.n + excluded.n;
$$;

create function ad_toggle(p_user uuid, p_id bigint, p_enabled boolean)
returns jsonb language plpgsql set search_path = public as $$
begin
  update ptc_campaigns set enabled = p_enabled
  where id = p_id and advertiser_id = p_user and not needs_review and (views < max_views or not p_enabled);
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

create function admin_save_ads(p jsonb)
returns void language sql set search_path = public as $$
  update settings set ad_slots = case when jsonb_typeof(p) = 'object' then p else ad_slots end, updated_at = now() where id = 1;
$$;

create function challenge_progress(p_user uuid, p_goal text)
returns bigint language sql stable set search_path = public as $$
  select challenge_progress_since(p_user, p_goal, period_start('day'));
$$;

create function claim_challenge(p_user uuid, p_id bigint, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  c challenges;
  u users;
  blk text;
  today date := (now() at time zone 'utc')::date;
  n bigint;
begin
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into c from challenges where id = p_id and enabled;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  today := (period_start(c.period) at time zone 'utc')::date;
  if exists (select 1 from challenge_done where challenge_id = p_id and user_id = p_user and day = today) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  n := challenge_progress_since(p_user, c.goal, period_start(c.period));
  if n < c.target_claims then return jsonb_build_object('ok', false, 'code', 'not_reached'); end if;
  insert into challenge_done (challenge_id, user_id, day) values (p_id, p_user, today);
  n := c.reward_tokens + floor(c.reward_tokens * boost_percent(u) / 100);
  perform move_tokens(p_user, 'available', n, 'challenge', p_id::text);
  return jsonb_build_object('ok', true, 'tokens', n);
end $$;

-- Gains a valider : PTC, liens, offres ------------------------------------

create function add_earning(p_user uuid, p_source text, p_ref text, p_label text, p_tokens bigint, p_revenue numeric)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  risk_txt text;
  n int;
  new_id bigint;
  tokens bigint := p_tokens;
  bonus numeric;
begin
  select * into u from users where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'unknown_user'); end if;
  select (case when u.vip_until > now() then vip_task_bonus else 0 end) + boost_percent(u) into bonus from settings where id = 1;
  if bonus > 0 then tokens := p_tokens + floor(p_tokens * bonus / 100); end if;
  select count(*) into n from users where last_ip_hash = u.last_ip_hash and id <> p_user;
  if n > 0 then risk_txt := 'IP partagée avec ' || n || ' autre(s) compte(s)'; end if;
  if u.banned then risk_txt := 'Compte banni'; end if;
  insert into earnings (user_id, source, ref, label, tokens, revenue_eur, risk)
  values (p_user, p_source, p_ref, p_label, tokens, p_revenue, risk_txt)
  on conflict (source, ref) do nothing returning id into new_id;
  if new_id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  perform move_tokens(p_user, 'pending', tokens, p_source, p_ref);
  return jsonb_build_object('ok', true, 'tokens', tokens);
end $$;

create function ptc_list(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'reward_tokens', c.reward_tokens,
    'duration_seconds', c.duration_seconds, 'kind', c.kind) order by c.reward_tokens desc), '[]'::jsonb)
  from ptc_campaigns c
  where c.enabled and c.views < c.max_views and not exists (
    select 1 from ptc_views v where v.campaign_id = c.id and v.user_id = p_user
      and v.day = (now() at time zone 'utc')::date and v.completed_at is not null);
$$;

create function ptc_start(p_user uuid, p_id bigint, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  c ptc_campaigns;
  u users;
  blk text;
  today date := (now() at time zone 'utc')::date;
begin
  select * into u from users where id = p_user;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.fp_address is null then return jsonb_build_object('ok', false, 'code', 'link_faucetpay'); end if;
  select * into c from ptc_campaigns where id = p_id and enabled and views < max_views;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if exists (select 1 from ptc_views where campaign_id = p_id and user_id = p_user and day = today and completed_at is not null) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  insert into ptc_views (campaign_id, user_id, day) values (p_id, p_user, today)
  on conflict (campaign_id, user_id, day) do update set started_at = now();
  return jsonb_build_object('ok', true, 'url', c.url, 'duration_seconds', c.duration_seconds, 'kind', c.kind);
end $$;

create function ptc_complete(p_user uuid, p_id bigint, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  c ptc_campaigns;
  v ptc_views;
  u users;
  blk text;
  today date := (now() at time zone 'utc')::date;
  left_s numeric;
begin
  select * into u from users where id = p_user;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into c from ptc_campaigns where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  select * into v from ptc_views where campaign_id = p_id and user_id = p_user and day = today for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v.completed_at is not null then return jsonb_build_object('ok', false, 'code', 'already_done'); end if;
  -- Le minuteur est celui du serveur, jamais celui du navigateur.
  left_s := extract(epoch from v.started_at + make_interval(secs => c.duration_seconds) - now());
  if left_s > 0 then return jsonb_build_object('ok', false, 'code', 'too_soon', 'retry_after', ceil(left_s)::int); end if;
  if c.views >= c.max_views then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  update ptc_views set completed_at = now() where id = v.id;
  update ptc_campaigns set views = views + 1 where id = p_id;
  return add_earning(p_user, 'ptc', p_id || ':' || p_user || ':' || today, c.title, c.reward_tokens, c.price_eur_per_view);
end $$;

create function shortlink_list(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'reward_tokens', p.reward_tokens,
    'remaining', greatest(p.daily_limit - (
      select count(*) from shortlink_visits v where v.provider_id = p.id and v.user_id = p_user
        and v.completed_at > now() - interval '24 hours'), 0)) order by p.reward_tokens desc), '[]'::jsonb)
  from shortlink_providers p where p.enabled;
$$;

create function shortlink_start(p_user uuid, p_id bigint, p_token text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  p shortlink_providers;
  u users;
  blk text;
  n int;
begin
  select * into u from users where id = p_user;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.fp_address is null then return jsonb_build_object('ok', false, 'code', 'link_faucetpay'); end if;
  select * into p from shortlink_providers where id = p_id and enabled;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  select count(*) into n from shortlink_visits where provider_id = p_id and user_id = p_user
    and completed_at > now() - interval '24 hours';
  if n >= p.daily_limit then return jsonb_build_object('ok', false, 'code', 'daily_limit'); end if;
  insert into shortlink_visits (token, provider_id, user_id) values (p_token, p_id, p_user);
  return jsonb_build_object('ok', true, 'api_url', p.api_url);
end $$;

create function shortlink_complete(p_user uuid, p_token text, p_min_seconds int)
returns jsonb language plpgsql set search_path = public as $$
declare
  v shortlink_visits;
  p shortlink_providers;
begin
  select * into v from shortlink_visits where token = p_token and user_id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v.completed_at is not null then return jsonb_build_object('ok', false, 'code', 'already_done'); end if;
  if v.created_at > now() - make_interval(secs => p_min_seconds) then
    return jsonb_build_object('ok', false, 'code', 'too_soon');
  end if;
  select * into p from shortlink_providers where id = v.provider_id;
  update shortlink_visits set completed_at = now() where token = p_token;
  return add_earning(p_user, 'shortlink', p_token, p.name, p.reward_tokens, p.revenue_eur_per_view);
end $$;

create function offerwall_list()
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'iframe_url', iframe_url, 'kind', kind, 'bonus', bonus_percent) order by code), '[]'::jsonb)
  from offerwalls where enabled;
$$;

create function get_offerwall(p_code text)
returns jsonb language sql stable set search_path = public as $$
  select to_jsonb(o) from offerwalls o where o.code = p_code and o.enabled;
$$;

-- Offre terminee : le reseau appelle le serveur. Le gain est calcule sur ce qu'il annonce te payer.
create function offer_postback(p_code text, p_tx text, p_ref_code text, p_usd numeric)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  uid uuid;
  rate numeric;
  eur numeric;
begin
  select * into s from settings where id = 1;
  select id into uid from users where ref_code = p_ref_code;
  if uid is null then return jsonb_build_object('ok', false, 'code', 'unknown_user'); end if;
  select per_eur into rate from coins where code = 'USDT';
  eur := p_usd / coalesce(rate, 1);
  return add_earning(uid, 'offer', p_code || ':' || p_tx, p_code,
    floor(eur * s.tokens_per_eur * s.offer_share_percent / 100
      * (1 + coalesce((select bonus_percent from offerwalls where code = p_code), 0) / 100))::bigint, eur);
end $$;

-- Annulation par le reseau. Deja paye : le compte passe en negatif.
create function offer_reverse(p_code text, p_tx text)
returns jsonb language plpgsql set search_path = public as $$
declare
  e earnings;
  r text := p_code || ':' || p_tx;
begin
  select * into e from earnings where source = 'offer' and ref = r for update;
  if not found then return jsonb_build_object('ok', true, 'unknown', true); end if;
  if e.status in ('rejected', 'reversed') then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if e.status = 'pending' then perform move_tokens(e.user_id, 'pending', -e.tokens, 'offer_reversed', r);
  elsif e.status = 'validated' then perform move_tokens(e.user_id, 'validated', -e.tokens, 'offer_reversed', r);
  else perform move_tokens(e.user_id, 'available', -e.tokens, 'offer_reversed', r);
  end if;
  update earnings set status = 'reversed' where id = e.id;
  return jsonb_build_object('ok', true);
end $$;

-- Retraits ---------------------------------------------------------------

-- Plafond du site en euros sur 24 h : au-dela, tout se met en pause.
create function payout_cap_reached(p_tokens bigint)
returns boolean language plpgsql set search_path = public as $$
declare
  s settings;
  spent numeric;
begin
  select * into s from settings where id = 1;
  select coalesce(sum(tokens), 0) into spent from withdrawals
   where status <> 'failed' and created_at > now() - interval '24 hours';
  if (spent + p_tokens) / s.tokens_per_eur > s.max_payout_eur_day then
    update settings set paused = true, updated_at = now(),
      pause_reason = 'Plafond de paiement de ' || s.max_payout_eur_day || ' € sur 24 h atteint' where id = 1;
    return true;
  end if;
  return false;
end $$;

-- Etape 2 du tirage : apres le compte a rebours, le gain est revele et credite.
create function faucet_collect(p_user uuid, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  blk text;
  p jsonb;
  left_s numeric;
begin
  select * into s from settings where id = 1;
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  p := u.pending_roll;
  if p is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  left_s := extract(epoch from (p->>'at')::timestamptz + make_interval(secs => s.roll_reveal_seconds) - now());
  if left_s > 0 then return jsonb_build_object('ok', false, 'code', 'too_soon', 'retry_after', ceil(left_s)::int); end if;
  update users set pending_roll = null where id = p_user;
  perform move_tokens(p_user, 'available', (p->>'tokens')::bigint, 'faucet', p->>'roll');
  perform credit_referral(p_user, (p->>'tokens')::bigint);
  return jsonb_build_object('ok', true, 'tokens', (p->>'tokens')::int, 'roll', (p->>'roll')::int,
    'available', u.available + (p->>'tokens')::bigint, 'level', (p->>'level')::int, 'level_up', (p->>'level_up')::boolean);
end $$;

-- Paiement automatique : membres dont le solde disponible atteint le minimum de retrait.
create function auto_batch_users(p_limit int)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(id), '[]'::jsonb) from (
    select u.id from users u, settings s
    where s.id = 1 and s.auto_payout and u.available >= greatest(s.min_withdraw_tokens, 1)
      and u.fp_address is not null and not u.banned
    order by u.available desc limit p_limit) x;
$$;

create function reserve_withdrawal(p_user uuid, p_kind text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  c coins;
  blk text;
  tokens bigint;
  units bigint;
  new_id uuid;
begin
  select * into u from users where id = p_user for update;
  select * into s from settings where id = 1;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.fp_address is null then return jsonb_build_object('ok', false, 'code', 'link_faucetpay'); end if;

  select * into c from coins where code = u.payout_coin and enabled and per_eur is not null;
  if not found then return jsonb_build_object('ok', false, 'code', 'coin_unavailable'); end if;

  tokens := case when p_kind = 'instant' then u.available else u.validated end;
  if tokens <= 0 then return jsonb_build_object('ok', false, 'code', 'nothing_to_withdraw'); end if;
  if tokens < s.min_withdraw_tokens then
    return jsonb_build_object('ok', false, 'code', 'below_minimum', 'min', s.min_withdraw_tokens);
  end if;

  units := floor(tokens::numeric / s.tokens_per_eur * c.per_eur * power(10::numeric, c.decimals));
  if units <= 0 then return jsonb_build_object('ok', false, 'code', 'amount_too_small'); end if;

  if c.last_balance_units is not null and c.last_balance_units < units
     and c.last_balance_at > now() - interval '5 minutes' then
    return jsonb_build_object('ok', false, 'code', 'coin_empty');
  end if;
  if payout_cap_reached(tokens) then return jsonb_build_object('ok', false, 'code', 'paused', 'tripped', true); end if;

  insert into withdrawals (user_id, kind, tokens, coin, amount_units, to_address)
  values (p_user, p_kind, tokens, c.code, units, u.fp_address) returning id into new_id;

  if p_kind = 'instant' then
    perform move_tokens(p_user, 'available', -tokens, 'withdrawal', new_id::text);
  else
    perform move_tokens(p_user, 'validated', -tokens, 'withdrawal', new_id::text);
    update earnings set status = 'paying', withdrawal_id = new_id where user_id = p_user and status = 'validated';
  end if;
  return jsonb_build_object('ok', true, 'id', new_id, 'tokens', tokens, 'coin', c.code, 'amount_units', units,
    'decimals', c.decimals, 'to', u.fp_address);
end $$;

-- Seul un retrait encore ouvert peut changer. Refuse : les tokens reviennent.
create function finish_withdrawal(p_id uuid, p_status text, p_payout_id text, p_error text, p_balance_units bigint)
returns jsonb language plpgsql set search_path = public as $$
declare
  w withdrawals;
  c coins;
  crossed boolean := false;
begin
  update withdrawals set status = p_status, payout_id = p_payout_id, error = p_error, finished_at = now()
   where id = p_id and status in ('reserved', 'unknown') returning * into w;
  if not found then return jsonb_build_object('ok', false); end if;

  if p_status = 'paid' then
    update earnings set status = 'paid' where withdrawal_id = p_id;
  elsif p_status = 'failed' then
    if w.kind = 'instant' then
      perform move_tokens(w.user_id, 'available', w.tokens, 'withdrawal_refund', p_id::text);
    else
      perform move_tokens(w.user_id, 'validated', w.tokens, 'withdrawal_refund', p_id::text);
      update earnings set status = 'validated', withdrawal_id = null where withdrawal_id = p_id;
    end if;
  end if;

  if p_balance_units is not null then
    select * into c from coins where code = w.coin;
    crossed := c.low_balance_units > 0 and p_balance_units < c.low_balance_units
      and coalesce(c.last_balance_units, c.low_balance_units) >= c.low_balance_units;
    update coins set last_balance_units = p_balance_units, last_balance_at = now() where code = w.coin;
  end if;
  return jsonb_build_object('ok', true, 'coin', w.coin, 'low_balance', crossed, 'balance_units', p_balance_units);
end $$;

create function hourly_batch_users(p_limit int)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(id), '[]'::jsonb) from (
    select id from users where validated >= greatest((select min_withdraw_tokens from settings where id = 1), 1)
      and fp_address is not null and not banned
    order by validated desc limit p_limit) x;
$$;

create function rate_targets()
returns jsonb language sql stable set search_path = public as $fn$
  select jsonb_build_object('auto', (select auto_rates from settings where id = 1),
    'coins', coalesce(jsonb_agg(jsonb_build_object('code', code, 'price_id', price_id, 'per_eur', per_eur)), '[]'::jsonb))
  from coins where price_id is not null and enabled;
$fn$;

-- p : {"LTC": 0.0125, ...} = combien de cette crypto pour 1 euro.
create function set_rates(p jsonb)
returns void language sql set search_path = public as $fn$
  update coins c set per_eur = (p->>c.code)::numeric, rate_updated_at = now()
   where p ? c.code and (p->>c.code)::numeric > 0;
$fn$;


-- Jeux gratuits ---------------------------------------------------------------

create function game_gate(u users, p_ip_hash text, p_game text, p_limit int)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare
  blk text := user_block(u, p_ip_hash);
  n int;
begin
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if not exists (select 1 from claims where user_id = u.id and (at at time zone 'utc')::date = (now() at time zone 'utc')::date) then
    return jsonb_build_object('ok', false, 'code', 'not_reached');
  end if;
  select count(*) into n from game_plays where user_id = u.id and game = p_game and day = (now() at time zone 'utc')::date;
  if n >= p_limit then return jsonb_build_object('ok', false, 'code', 'daily_limit'); end if;
  return null;
end $fn$;

create function mines_public(g game_plays, rewards int[])
returns jsonb language sql immutable as $fn$
  select jsonb_build_object('ok', true, 'id', g.id, 'status', g.status,
    'revealed', g.state->'revealed',
    'gain', coalesce(rewards[jsonb_array_length(g.state->'revealed')], 0),
    'next', rewards[jsonb_array_length(g.state->'revealed') + 1]);
$fn$;

create function mines_start(p_user uuid, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  s settings;
  u users;
  g game_plays;
  gate jsonb;
begin
  select * into u from users where id = p_user for update;
  select * into s from settings where id = 1;
  select * into g from game_plays where user_id = p_user and game = 'mines' and status = 'active';
  if found then return mines_public(g, s.mines_rewards); end if;
  gate := game_gate(u, p_ip_hash, 'mines', s.mines_daily_plays);
  if gate is not null then return gate; end if;
  insert into game_plays (user_id, game, status, state)
  values (p_user, 'mines', 'active', jsonb_build_object(
    'bombs', (select jsonb_agg(c) from (select c from generate_series(0, 24) c order by random() limit 5) x),
    'revealed', '[]'::jsonb))
  returning * into g;
  return mines_public(g, s.mines_rewards);
end $fn$;

create function mines_finish(g game_plays, p_status text, rewards int[])
returns jsonb language plpgsql set search_path = public as $fn$
declare
  k int := jsonb_array_length(g.state->'revealed');
  prize int := case when p_status = 'won' then coalesce(rewards[k], 0) else 0 end;
begin
  update game_plays set status = p_status, tokens = prize where id = g.id;
  if prize > 0 then perform move_tokens(g.user_id, 'available', prize, 'mines', g.id::text); end if;
  return jsonb_build_object('ok', true, 'status', p_status, 'tokens', prize,
    'revealed', g.state->'revealed', 'bombs', g.state->'bombs');
end $fn$;

create function mines_reveal(p_user uuid, p_cell int, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  s settings;
  u users;
  g game_plays;
  blk text;
  k int;
begin
  select * into u from users where id = p_user;
  select * into s from settings where id = 1;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into g from game_plays where user_id = p_user and game = 'mines' and status = 'active' for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if p_cell < 0 or p_cell > 24 or (g.state->'revealed') @> to_jsonb(p_cell) then
    return jsonb_build_object('ok', false, 'code', 'bad_request');
  end if;
  if (g.state->'bombs') @> to_jsonb(p_cell) then
    return mines_finish(g, 'lost', s.mines_rewards) || jsonb_build_object('bomb', p_cell);
  end if;
  update game_plays set state = jsonb_set(state, '{revealed}', (state->'revealed') || to_jsonb(p_cell))
   where id = g.id returning * into g;
  k := jsonb_array_length(g.state->'revealed');
  -- Toutes les cases payees ouvertes : encaissement automatique.
  if k >= cardinality(s.mines_rewards) or k >= 20 then
    return mines_finish(g, 'won', s.mines_rewards);
  end if;
  return mines_public(g, s.mines_rewards);
end $fn$;

create function mines_cashout(p_user uuid, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  s settings;
  u users;
  g game_plays;
  blk text;
begin
  select * into u from users where id = p_user;
  select * into s from settings where id = 1;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into g from game_plays where user_id = p_user and game = 'mines' and status = 'active' for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if jsonb_array_length(g.state->'revealed') = 0 then return jsonb_build_object('ok', false, 'code', 'not_reached'); end if;
  return mines_finish(g, 'won', s.mines_rewards);
end $fn$;

-- Gagne si le nombre (0 a 99) est sous la cible. Plus la cible est basse, plus le gain est grand.
create function dice_roll(p_user uuid, p_target int, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  s settings;
  u users;
  gate jsonb;
  roll int;
  prize int;
  n int;
begin
  if p_target < 5 or p_target > 95 then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  select * into u from users where id = p_user for update;
  select * into s from settings where id = 1;
  gate := game_gate(u, p_ip_hash, 'dice', s.dice_daily_plays);
  if gate is not null then return gate; end if;
  roll := floor(random() * 100)::int;
  prize := case when roll < p_target then floor(s.dice_unit * 100.0 / p_target)::int else 0 end;
  insert into game_plays (user_id, game, status, state, tokens)
  values (p_user, 'dice', 'done', jsonb_build_object('roll', roll, 'target', p_target), prize);
  if prize > 0 then perform move_tokens(p_user, 'available', prize, 'dice', roll::text); end if;
  select count(*) into n from game_plays where user_id = p_user and game = 'dice' and day = (now() at time zone 'utc')::date;
  return jsonb_build_object('ok', true, 'roll', roll, 'win', prize > 0, 'tokens', prize, 'left', greatest(s.dice_daily_plays - n, 0));
end $fn$;

-- Espace annonceur -------------------------------------------------------------

create function create_ad_order(p_user uuid, p_title text, p_url text, p_duration int, p_views int, p_kind text)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  s settings;
  rate numeric;
  price numeric;
  usdt numeric;
  new_id uuid;
begin
  select * into s from settings where id = 1;
  if length(trim(coalesce(p_title, ''))) not between 3 and 60 then return jsonb_build_object('ok', false, 'code', 'bad_title'); end if;
  if p_url !~ '^https://[^ ]{4,}$' or length(p_url) > 300 then return jsonb_build_object('ok', false, 'code', 'bad_url'); end if;
  if p_duration not in (10, 15, 20, 30) then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  if p_views < 100 or p_views > 100000 then return jsonb_build_object('ok', false, 'code', 'bad_views'); end if;
  select per_eur into rate from coins where code = 'USDT';
  if rate is null then return jsonb_build_object('ok', false, 'code', 'ads_unavailable'); end if;
  price := round(p_views * s.ad_price_eur_per_view * p_duration / 10.0, 4);
  usdt := ceil(price * rate * 10000) / 10000;
  if coalesce(p_kind, 'window') not in ('window', 'iframe', 'video') then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  if p_kind = 'video' and p_url !~ '^https://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[A-Za-z0-9_-]{6,}' then
    return jsonb_build_object('ok', false, 'code', 'bad_video');
  end if;
  insert into ad_orders (user_id, title, url, duration_seconds, views, price_eur, amount_usdt, kind)
  values (p_user, trim(p_title), p_url, p_duration, p_views, price, usdt, coalesce(p_kind, 'window')) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id, 'amount_usdt', usdt, 'price_eur', price);
end $fn$;

-- Appele apres verification du paiement aupres de FaucetPay. Rejouable sans double campagne.
create function pay_ad_order(p_id uuid, p_tx text, p_amount numeric, p_currency text)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  s settings;
  o ad_orders;
  cid bigint;
begin
  select * into s from settings where id = 1;
  select * into o from ad_orders where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if o.status = 'paid' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if upper(p_currency) <> 'USDT' or p_amount < o.amount_usdt * 0.999 then
    return jsonb_build_object('ok', false, 'code', 'amount_mismatch');
  end if;
  insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view, enabled, needs_review, advertiser_id, kind)
  values (o.title, o.url,
    greatest(1, floor(o.price_eur / o.views * s.ad_reward_share / 100 * s.tokens_per_eur))::int,
    o.duration_seconds, o.views, o.price_eur / o.views, false, true, o.user_id, o.kind)
  returning id into cid;
  update ad_orders set status = 'paid', tx_id = p_tx, paid_at = now(), campaign_id = cid where id = p_id;
  return jsonb_build_object('ok', true, 'campaign_id', cid);
end $fn$;

create function ad_order_paid(p_id uuid)
returns boolean language sql stable set search_path = public as $fn$
  select exists (select 1 from ad_orders where id = p_id and status = 'paid');
$fn$;

create function my_ad_orders(p_user uuid)
returns jsonb language sql stable set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'at', o.created_at, 'title', o.title, 'url', o.url,
    'views', o.views, 'duration', o.duration_seconds, 'amount_usdt', o.amount_usdt, 'tokens_paid', o.tokens_paid, 'status', o.status,
    'kind', o.kind, 'campaign_id', c.id, 'reward', c.reward_tokens,
    'shown', coalesce(c.views, 0), 'enabled', coalesce(c.enabled, false), 'review', coalesce(c.needs_review, false),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'n', d.n) order by d.day), '[]'::jsonb) from (
        select v.day, count(*) n from ptc_views v where v.campaign_id = c.id and v.completed_at is not null
          and v.day > (now() at time zone 'utc')::date - 14 group by v.day) d))
    order by o.created_at desc), '[]'::jsonb)
  from ad_orders o left join ptc_campaigns c on c.id = o.campaign_id
  where o.user_id = p_user and (o.status = 'paid' or o.created_at > now() - interval '1 day');
$fn$;


-- VIP ------------------------------------------------------------------------

create function create_vip_order(p_user uuid)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  s settings;
  rate numeric;
  usdt numeric;
  new_id uuid;
begin
  select * into s from settings where id = 1;
  select per_eur into rate from coins where code = 'USDT';
  if rate is null then return jsonb_build_object('ok', false, 'code', 'vip_unavailable'); end if;
  usdt := ceil(s.vip_price_eur * rate * 10000) / 10000;
  insert into vip_orders (user_id, days, price_eur, amount_usdt)
  values (p_user, s.vip_days, s.vip_price_eur, usdt) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id, 'amount_usdt', usdt, 'days', s.vip_days);
end $fn$;

-- Appele apres verification du paiement aupres de FaucetPay. Rejouable sans prolonger deux fois.
create function pay_vip_order(p_id uuid, p_tx text, p_amount numeric, p_currency text)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  o vip_orders;
  until_at timestamptz;
begin
  select * into o from vip_orders where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if o.status = 'paid' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if upper(p_currency) <> 'USDT' or p_amount < o.amount_usdt * 0.999 then
    return jsonb_build_object('ok', false, 'code', 'amount_mismatch');
  end if;
  update users set vip_until = greatest(coalesce(vip_until, now()), now()) + make_interval(days => o.days)
  where id = o.user_id returning vip_until into until_at;
  update vip_orders set status = 'paid', tx_id = p_tx, paid_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'vip', true, 'vip_until', until_at);
end $fn$;

create function vip_order_paid(p_id uuid)
returns boolean language sql stable set search_path = public as $fn$
  select exists (select 1 from vip_orders where id = p_id and status = 'paid');
$fn$;

create function pause_faucet(p_reason text)
returns void language sql set search_path = public as $$
  update settings set paused = true, pause_reason = p_reason, updated_at = now() where id = 1;
$$;

-- Pages utilisateur ------------------------------------------------------

create function public_status()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'paused', s.paused,
    'tokens_per_eur', s.tokens_per_eur,
    'faucet_reward_tokens', s.faucet_reward_tokens,
    'roll_tiers', s.roll_tiers,
    'ad_price_eur_per_view', s.ad_price_eur_per_view,
    'vip_price_eur', s.vip_price_eur, 'vip_days', s.vip_days,
    'vip_task_bonus', s.vip_task_bonus, 'vip_referral_percent', s.vip_referral_percent,
    'boost_price_tokens', s.boost_price_tokens, 'boost_percent', s.boost_percent, 'boost_hours', s.boost_hours,
    'tournament_prizes', to_jsonb(s.tournament_prizes),
    'ad_slots', s.ad_slots,
    'daily_streak_rewards', to_jsonb(s.daily_streak_rewards),
    'level_max', s.level_max, 'level_mult_percent', s.level_mult_percent,
    'energy_regen', s.energy_regen_seconds, 'energy_max', s.energy_max, 'energy_max_vip', s.energy_max_vip,
    'min_withdraw_tokens', s.min_withdraw_tokens,
    'roll_reveal_seconds', s.roll_reveal_seconds, 'auto_payout', s.auto_payout,
    'watch_reward', floor(s.watch_revenue_eur * s.tokens_per_eur * s.watch_share_percent / 100)::int,
    'watch_daily_limit', s.watch_daily_limit,
    'feed', coalesce((select jsonb_agg(f order by f->>'at' desc) from (
        select jsonb_build_object('at', e.created_at, 'kind', coalesce(o.name, e.label), 'tokens', e.tokens,
          'who', case when length(u.fp_address) >= 10 then left(u.fp_address, 3) || '…' || right(u.fp_address, 3) else '…' end) as f
        from earnings e join users u on u.id = e.user_id left join offerwalls o on o.code = e.label
        where e.source = 'offer' and e.status in ('validated', 'paying', 'paid') order by e.created_at desc limit 10) x), '[]'::jsonb),
    'usdt_per_eur', (select per_eur from coins where code = 'USDT'),
    'cooldown_seconds', s.cooldown_seconds,
    'referral_percent', s.referral_percent,
    'daily_bonus_tokens', s.daily_bonus_tokens,
    'ptc_reward', (select max(reward_tokens) from ptc_campaigns where enabled and views < max_views),
    'link_reward', (select max(reward_tokens) from shortlink_providers where enabled),
    'users', (select count(*) from users),
    'paid_tokens', (select coalesce(sum(tokens), 0) from withdrawals where status = 'paid'),
    'recent', coalesce((
      select jsonb_agg(r) from (
        select jsonb_build_object('at', w.finished_at, 'coin', w.coin, 'amount_units', w.amount_units,
          'decimals', c.decimals, 'tokens', w.tokens,
          'who', case when length(w.to_address) >= 10 then left(w.to_address, 3) || '…' || right(w.to_address, 3) else '…' end) as r
        from withdrawals w join coins c on c.code = w.coin
        where w.status = 'paid' order by w.finished_at desc limit 10) x), '[]'::jsonb)
  ) from settings s where s.id = 1;
$$;

create function user_profile(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'ref_code', u.ref_code, 'secured', u.password_hash is not null,
    'vip', coalesce(u.vip_until > now(), false), 'vip_until', u.vip_until, 'fp_address', u.fp_address, 'payout_coin', u.payout_coin,
    'available', u.available, 'pending', u.pending, 'validated', u.validated,
    'daily_done', u.last_daily_day = (now() at time zone 'utc')::date,
    'wheel_done', coalesce(u.last_wheel_at > now() - make_interval(hours => s.wheel_hours), false),
    'wheel_retry_after', greatest(coalesce(ceil(extract(epoch from u.last_wheel_at + make_interval(hours => s.wheel_hours) - now()))::int, 0), 0),
    'wheel_hours', s.wheel_hours,
    'energy', floor(energy_now(u))::int,
    'energy_max', case when u.vip_until > now() then s.energy_max_vip else s.energy_max end,
    'energy_max_vip', s.energy_max_vip,
    'energy_regen', s.energy_regen_seconds,
    'pending_roll', case when u.pending_roll is null then null else jsonb_build_object(
      'retry_after', greatest(ceil(extract(epoch from (u.pending_roll->>'at')::timestamptz + make_interval(secs => s.roll_reveal_seconds) - now())), 0)::int) end,
    -- Secondes avant le prochain point d'energie (0 si la reserve est pleine).
    'energy_next', case when energy_now(u) >= case when u.vip_until > now() then s.energy_max_vip else s.energy_max end then 0
                        else ceil((1 - (energy_now(u) - floor(energy_now(u)))) * s.energy_regen_seconds)::int end,
    'wheel_prizes', s.wheel_prizes,
    'wheel_min_claims', s.wheel_min_claims,
    'daily_bonus_tokens', s.daily_bonus_tokens,
    'claims_max', s.max_claims_account_day,
    'boost', coalesce(u.boost_until > now(), false), 'boost_until', u.boost_until,
    'daily_streak', case when u.last_daily_day >= (now() at time zone 'utc')::date - 1 then u.daily_streak else 0 end,
    'notif_unread', (select count(*) from notifications n where (n.user_id = u.id or n.user_id is null)
                       and n.at > greatest(coalesce(u.notif_seen_at, '-infinity'::timestamptz), u.created_at - interval '7 days')),
    'achievements_ready', (select count(*) from achievements a where a.enabled
                       and not exists (select 1 from user_achievements x where x.user_id = u.id and x.code = a.code)
                       and achievement_progress(u.id, a.kind) >= a.target),
    'frame', u.frame, 'name_color', u.name_color, 'title', u.title,
    'games', jsonb_build_object(
      'mines_left', greatest(s.mines_daily_plays - (select count(*) from game_plays where user_id = u.id and game = 'mines' and day = (now() at time zone 'utc')::date), 0),
      'dice_left', greatest(s.dice_daily_plays - (select count(*) from game_plays where user_id = u.id and game = 'dice' and day = (now() at time zone 'utc')::date), 0),
      'mines_rewards', s.mines_rewards,
      'dice_unit', s.dice_unit,
      'mines_active', (select mines_public(g, s.mines_rewards) from game_plays g where g.user_id = u.id and g.game = 'mines' and g.status = 'active')),
    'claims_today', (select count(*) from claims where user_id = u.id and (at at time zone 'utc')::date = (now() at time zone 'utc')::date),
    'retry_after', greatest(
      coalesce((select ceil(extract(epoch from max(at) + make_interval(secs => s.cooldown_seconds) - now()))::int from claims where user_id = u.id), 0),
      case when energy_now(u) < 1 then ceil((1 - energy_now(u)) * s.energy_regen_seconds)::int else 0 end, 0),
    -- Gamification : total gagne (niveau) et serie de jours consecutifs avec au moins une reclamation.
    'earned_total', user_earned(u.id),
    'xp', u.xp,
    'level_info', level_info(u.xp),
    'streak', user_streak(u.id),
    'referrals', (select count(*) from users r where r.referrer_id = u.id),
    'referral_earned', (select coalesce(sum(delta), 0) from ledger where user_id = u.id and source = 'referral'),
    'coins', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'per_eur', per_eur, 'decimals', decimals) order by sort), '[]'::jsonb)
              from coins where enabled and per_eur is not null),
    'challenges', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'goal', c.goal, 'period', c.period,
                     'target', c.target_claims, 'reward_tokens', c.reward_tokens,
                     'progress', challenge_progress_since(u.id, c.goal, period_start(c.period)),
                     'done', exists (select 1 from challenge_done d where d.challenge_id = c.id and d.user_id = u.id
                                       and d.day = (period_start(c.period) at time zone 'utc')::date))
                     order by c.period, array_position(array['claims', 'earned', 'ptc', 'links', 'surveys', 'offers'], c.goal), c.target_claims), '[]'::jsonb)
                   from challenges c where c.enabled),
    'history', (select coalesce(jsonb_agg(h), '[]'::jsonb) from (
                  select jsonb_build_object('at', at, 'source', source, 'bucket', bucket, 'delta', delta) h
                  from ledger where user_id = u.id order by at desc, id desc limit 20) x),
    'withdrawals', (select coalesce(jsonb_agg(w), '[]'::jsonb) from (
                  select jsonb_build_object('at', wd.created_at, 'tokens', wd.tokens, 'coin', wd.coin, 'amount_units', wd.amount_units,
                    'decimals', co.decimals, 'status', wd.status, 'payout_id', wd.payout_id, 'kind', wd.kind) w
                  from withdrawals wd join coins co on co.code = wd.coin
                  where wd.user_id = u.id order by wd.created_at desc limit 10) x)
  ) from users u, settings s where u.id = p_user and s.id = 1;
$$;

-- Admin ------------------------------------------------------------------

create function admin_overview()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'settings', (select to_jsonb(s) from settings s where id = 1),
    'coins', (select jsonb_agg(to_jsonb(c) order by c.sort) from coins c),
    'stats', jsonb_build_object(
      'users', (select count(*) from users),
      'claims_hour', (select count(*) from claims where at > now() - interval '1 hour'),
      'claims_day', (select count(*) from claims where at > now() - interval '24 hours'),
      'tokens_available', (select coalesce(sum(available), 0) from users),
      'tokens_pending', (select coalesce(sum(pending), 0) from users),
      'tokens_validated', (select coalesce(sum(validated), 0) from users),
      'paid_tokens_day', (select coalesce(sum(tokens), 0) from withdrawals where status = 'paid' and created_at > now() - interval '24 hours'),
      'earnings_to_review', (select count(*) from earnings where status = 'pending'),
      'ads_to_review', (select count(*) from ptc_campaigns where needs_review),
      'vip_active', (select count(*) from users where vip_until > now()),
      'shop_tokens_30d', (select coalesce(-sum(delta), 0) from ledger where source = 'shop' and at > now() - interval '30 days'),
      'tournament_tokens_30d', (select coalesce(sum(delta), 0) from ledger where source = 'tournament' and at > now() - interval '30 days'),
      'vip_paid_eur_30d', (select coalesce(sum(price_eur), 0) from vip_orders where status = 'paid' and paid_at > now() - interval '30 days'),
      'attention', (select count(*) from withdrawals where status = 'unknown' or (status = 'reserved' and created_at < now() - interval '2 minutes'))
    ),
    'week', jsonb_build_object(
      'active_users', (select count(distinct user_id) from claims where at > now() - interval '7 days'),
      'claims', (select count(*) from claims where at > now() - interval '7 days'),
      'tokens_by_source', (select coalesce(jsonb_object_agg(source, t), '{}'::jsonb) from (
        select source, sum(delta) t from ledger where delta > 0 and at > now() - interval '7 days'
          and source not in ('withdrawal_refund') group by source) x),
      'earnings_revenue_eur', (select coalesce(sum(revenue_eur), 0) from earnings where created_at > now() - interval '7 days' and status not in ('rejected', 'reversed'))
    ),
    'bans', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from bans b), '[]'::jsonb),
    'ptc', coalesce((select jsonb_agg(to_jsonb(p) order by p.id) from ptc_campaigns p), '[]'::jsonb),
    'shortlinks', coalesce((select jsonb_agg(to_jsonb(p) order by p.id) from shortlink_providers p), '[]'::jsonb),
    'offerwalls', coalesce((select jsonb_agg(to_jsonb(o) order by o.code) from offerwalls o), '[]'::jsonb),
    'promos', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from promo_codes p), '[]'::jsonb),
    'tickets_open', (select count(*) from tickets where status = 'open'),
    'ad_impressions', coalesce((select jsonb_object_agg(slot, n) from (select slot, sum(n) n from ad_impressions
                        where day > (now() at time zone 'utc')::date - 7 group by slot) x), '{}'::jsonb),
    'challenges', coalesce((select jsonb_agg(to_jsonb(c) order by array_position(array['claims', 'earned', 'ptc', 'links', 'surveys', 'offers'], c.goal), c.target_claims) from challenges c), '[]'::jsonb)
  );
$$;

create function admin_earnings(p_status text, p_limit int)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select e.id, e.created_at, e.source, e.label, e.tokens, e.status, e.risk, u.fp_address as member, e.user_id
    from earnings e join users u on u.id = e.user_id
    where e.status = p_status order by e.risk is not null desc, e.created_at
    limit least(greatest(p_limit, 1), 200)) x;
$$;

create function admin_validate_earnings(p_ids bigint[], p_all_clean boolean)
returns jsonb language plpgsql set search_path = public as $$
declare
  e earnings;
  n int := 0;
  done bigint[] := '{}';
begin
  for e in select * from earnings where status = 'pending'
             and ((p_all_clean and risk is null) or id = any (coalesce(p_ids, '{}'))) for update loop
    perform move_tokens(e.user_id, 'pending', -e.tokens, 'validation', e.id::text);
    perform move_tokens(e.user_id, 'validated', e.tokens, 'validation', e.id::text);
    perform credit_referral(e.user_id, e.tokens);
    update earnings set status = 'validated' where id = e.id;
    done := done || e.id;
    n := n + 1;
  end loop;
  insert into notifications (user_id, kind, text, text_en, link)
  select user_id, 'validated', sum(tokens) || ' Coins validés : ils partent au prochain paiement horaire.',
    sum(tokens) || ' Coins approved: they go out with the next hourly payout.', '#wallet'
  from earnings where id = any (done) group by user_id;
  return jsonb_build_object('count', n);
end $$;

create function admin_reject_earnings(p_ids bigint[])
returns jsonb language plpgsql set search_path = public as $$
declare
  e earnings;
  n int := 0;
begin
  for e in select * from earnings where status = 'pending' and id = any (p_ids) for update loop
    perform move_tokens(e.user_id, 'pending', -e.tokens, 'rejected', e.id::text);
    update earnings set status = 'rejected' where id = e.id;
    n := n + 1;
  end loop;
  return jsonb_build_object('count', n);
end $$;

create function admin_withdrawals(p_filter text, p_limit int)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select w.*, c.decimals, u.fp_address as member from withdrawals w join coins c on c.code = w.coin join users u on u.id = w.user_id
    where case p_filter
      when 'attention' then w.status = 'unknown' or (w.status = 'reserved' and w.created_at < now() - interval '2 minutes')
      when 'paid' then w.status = 'paid'
      when 'failed' then w.status = 'failed'
      else true end
    order by w.created_at desc limit least(greatest(p_limit, 1), 200)) x;
$$;

create function admin_get_withdrawal(p_id uuid)
returns jsonb language sql stable set search_path = public as $$
  select to_jsonb(w) from withdrawals w where w.id = p_id;
$$;

create function admin_users(p_search text)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select u.id, u.fp_address, u.fp_user_hash, u.password_hash is not null as secured, u.available, u.pending, u.validated, u.banned, u.ban_reason, u.created_at, u.last_ip_hash,
      (select count(*) from claims c where c.user_id = u.id) as claims,
      (select count(*) from users o where o.last_ip_hash = u.last_ip_hash and o.id <> u.id) as same_ip
    from users u
    where p_search = '' or u.fp_address ilike '%' || p_search || '%'
    order by u.created_at desc limit 50) x;
$$;

create function admin_ban_user(p_id uuid, p_banned boolean, p_reason text)
returns void language plpgsql set search_path = public as $$
begin
  update users set banned = p_banned, ban_reason = case when p_banned then p_reason end where id = p_id;
  if p_banned then delete from sessions where user_id = p_id; end if;
end $$;

create function admin_ban(p_kind text, p_value text, p_reason text)
returns void language sql set search_path = public as $$
  insert into bans (kind, value, reason) values (p_kind, p_value, p_reason)
  on conflict (kind, value) do update set reason = excluded.reason;
$$;

create function admin_unban(p_kind text, p_value text)
returns void language sql set search_path = public as $$
  delete from bans where kind = p_kind and value = p_value;
$$;

create function admin_update_settings(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  update settings set
    paused = coalesce((p->>'paused')::boolean, paused),
    pause_reason = case when (p->>'paused')::boolean is false then null
                        when p ? 'pause_reason' then p->>'pause_reason' else pause_reason end,
    faucet_reward_tokens = coalesce((p->>'faucet_reward_tokens')::int, faucet_reward_tokens),
    roll_tiers = case when jsonb_typeof(p->'roll_tiers') = 'array' then p->'roll_tiers' else roll_tiers end,
    cooldown_seconds = coalesce((p->>'cooldown_seconds')::int, cooldown_seconds),
    max_claims_account_day = coalesce((p->>'max_claims_account_day')::int, max_claims_account_day),
    max_claims_ip_day = coalesce((p->>'max_claims_ip_day')::int, max_claims_ip_day),
    max_claims_site_hour = coalesce((p->>'max_claims_site_hour')::int, max_claims_site_hour),
    max_payout_eur_day = coalesce((p->>'max_payout_eur_day')::numeric, max_payout_eur_day),
    max_signups_ip_day = coalesce((p->>'max_signups_ip_day')::int, max_signups_ip_day),
    daily_bonus_tokens = coalesce((p->>'daily_bonus_tokens')::int, daily_bonus_tokens),
    daily_bonus_min_claims = coalesce((p->>'daily_bonus_min_claims')::int, daily_bonus_min_claims),
    wheel_min_claims = coalesce((p->>'wheel_min_claims')::int, wheel_min_claims),
    wheel_hours = coalesce((p->>'wheel_hours')::int, wheel_hours),
    min_withdraw_tokens = coalesce((p->>'min_withdraw_tokens')::int, min_withdraw_tokens),
    roll_reveal_seconds = coalesce((p->>'roll_reveal_seconds')::int, roll_reveal_seconds),
    auto_payout = coalesce((p->>'auto_payout')::boolean, auto_payout),
    watch_daily_limit = coalesce((p->>'watch_daily_limit')::int, watch_daily_limit),
    watch_gap_seconds = coalesce((p->>'watch_gap_seconds')::int, watch_gap_seconds),
    watch_seconds = coalesce((p->>'watch_seconds')::int, watch_seconds),
    watch_revenue_eur = coalesce((p->>'watch_revenue_eur')::numeric, watch_revenue_eur),
    watch_share_percent = coalesce((p->>'watch_share_percent')::numeric, watch_share_percent),
    energy_regen_seconds = coalesce((p->>'energy_regen_seconds')::int, energy_regen_seconds),
    energy_max = coalesce((p->>'energy_max')::int, energy_max),
    energy_max_vip = coalesce((p->>'energy_max_vip')::int, energy_max_vip),
    auto_rates = coalesce((p->>'auto_rates')::boolean, auto_rates),
    mines_daily_plays = coalesce((p->>'mines_daily_plays')::int, mines_daily_plays),
    dice_daily_plays = coalesce((p->>'dice_daily_plays')::int, dice_daily_plays),
    dice_unit = coalesce((p->>'dice_unit')::int, dice_unit),
    ad_price_eur_per_view = coalesce((p->>'ad_price_eur_per_view')::numeric, ad_price_eur_per_view),
    ad_reward_share = coalesce((p->>'ad_reward_share')::numeric, ad_reward_share),
    vip_price_eur = coalesce((p->>'vip_price_eur')::numeric, vip_price_eur),
    vip_days = coalesce((p->>'vip_days')::int, vip_days),
    vip_task_bonus = coalesce((p->>'vip_task_bonus')::numeric, vip_task_bonus),
    vip_referral_percent = coalesce((p->>'vip_referral_percent')::numeric, vip_referral_percent),
    boost_price_tokens = coalesce((p->>'boost_price_tokens')::int, boost_price_tokens),
    level_xp_first = coalesce((p->>'level_xp_first')::int, level_xp_first),
    level_xp_step = coalesce((p->>'level_xp_step')::int, level_xp_step),
    level_max = coalesce((p->>'level_max')::int, level_max),
    level_mult_percent = coalesce((p->>'level_mult_percent')::numeric, level_mult_percent),
    daily_streak_rewards = case when jsonb_typeof(p->'daily_streak_rewards') = 'array'
                                then (select array_agg(x::int) from jsonb_array_elements_text(p->'daily_streak_rewards') x)
                                else daily_streak_rewards end,
    boost_percent = coalesce((p->>'boost_percent')::numeric, boost_percent),
    boost_hours = coalesce((p->>'boost_hours')::int, boost_hours),
    tournament_prizes = case when jsonb_typeof(p->'tournament_prizes') = 'array'
                             then (select array_agg(x::int) from jsonb_array_elements_text(p->'tournament_prizes') x)
                             else tournament_prizes end,
    mines_rewards = case when jsonb_typeof(p->'mines_rewards') = 'array'
                         then (select array_agg(x::int) from jsonb_array_elements_text(p->'mines_rewards') x)
                         else mines_rewards end,
    wheel_prizes = case when jsonb_typeof(p->'wheel_prizes') = 'array'
                        then (select array_agg(x::int) from jsonb_array_elements_text(p->'wheel_prizes') x)
                        else wheel_prizes end,
    referral_percent = coalesce((p->>'referral_percent')::numeric, referral_percent),
    offer_share_percent = coalesce((p->>'offer_share_percent')::numeric, offer_share_percent),
    updated_at = now()
  where id = 1;
end $$;

create function admin_update_coin(p_code text, p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  update coins set
    enabled = coalesce((p->>'enabled')::boolean, enabled),
    per_eur = coalesce((p->>'per_eur')::numeric, per_eur),
    low_balance_units = coalesce((p->>'low_balance_units')::bigint, low_balance_units)
  where code = p_code;
end $$;

create function admin_set_balance(p_code text, p_units bigint)
returns void language sql set search_path = public as $$
  update coins set last_balance_units = p_units, last_balance_at = now() where code = p_code;
$$;

create function admin_save_ptc(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p->>'id' is null then
    insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view, kind)
    values (p->>'title', p->>'url', (p->>'reward_tokens')::int, (p->>'duration_seconds')::int, (p->>'max_views')::int,
      coalesce((p->>'price_eur_per_view')::numeric, 0), coalesce(nullif(p->>'kind', ''), 'window'));
  else
    if (p->>'enabled')::boolean is false then
      perform move_tokens(o.user_id, 'available', o.tokens_paid, 'ad_refund', o.id::text)
      from ad_orders o join ptc_campaigns c on c.id = o.campaign_id
      where c.id = (p->>'id')::bigint and c.needs_review and o.tokens_paid > 0;
    end if;
    update ptc_campaigns set enabled = coalesce((p->>'enabled')::boolean, enabled), needs_review = false where id = (p->>'id')::bigint;
  end if;
end $$;

create function admin_save_shortlink(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p->>'id' is null then
    insert into shortlink_providers (name, api_url, reward_tokens, revenue_eur_per_view, daily_limit)
    values (p->>'name', p->>'api_url', (p->>'reward_tokens')::int, coalesce((p->>'revenue_eur_per_view')::numeric, 0), (p->>'daily_limit')::int);
  else
    update shortlink_providers set enabled = coalesce((p->>'enabled')::boolean, enabled) where id = (p->>'id')::bigint;
  end if;
end $$;

create function admin_save_offerwall(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p ? 'iframe_url' then
    insert into offerwalls (code, name, iframe_url, postback_secret, reversed_status, kind)
    values (p->>'code', p->>'name', p->>'iframe_url', p->>'postback_secret', coalesce(nullif(p->>'reversed_status', ''), 'reversed'),
      coalesce(nullif(p->>'kind', ''), 'offers'))
    on conflict (code) do update set name = excluded.name, iframe_url = excluded.iframe_url,
      postback_secret = excluded.postback_secret, reversed_status = excluded.reversed_status, kind = excluded.kind;
  else
    update offerwalls set enabled = coalesce((p->>'enabled')::boolean, enabled),
      kind = coalesce(nullif(p->>'kind', ''), kind),
      bonus_percent = coalesce((p->>'bonus_percent')::numeric, bonus_percent) where code = p->>'code';
  end if;
end $$;

create function admin_save_challenge(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p->>'id' is null then
    insert into challenges (name, goal, period, target_claims, reward_tokens)
    values (coalesce(nullif(p->>'name', ''), coalesce(p->>'goal', 'claims') || ' ' || (p->>'target_claims')),
      coalesce(nullif(p->>'goal', ''), 'claims'), coalesce(nullif(p->>'period', ''), 'day'), (p->>'target_claims')::int, (p->>'reward_tokens')::int);
  else
    update challenges set enabled = coalesce((p->>'enabled')::boolean, enabled) where id = (p->>'id')::bigint;
  end if;
end $$;

-- Boutique : depenser ses Coins -------------------------------------------
-- Rien ici ne fait intervenir le hasard : chaque achat donne un effet connu a l'avance.

-- Retire le prix du solde disponible. La ligne du membre doit deja etre verrouillee.
create function spend_tokens(u users, p_price bigint, p_ref text)
returns text language plpgsql set search_path = public as $$
begin
  if p_price < 0 then return 'bad_request'; end if;
  if p_price > u.available then return 'not_enough'; end if;
  perform move_tokens(u.id, 'available', -p_price, 'shop', p_ref);
  return null;
end $$;

-- Boost en cours : pourcentage ajoute aux taches, au bonus quotidien et aux quetes (jamais aux tirages ni aux jeux).
create function boost_percent(u users)
returns numeric language sql stable set search_path = public as $$
  select case when u.boost_until > now() then s.boost_percent else 0 end from settings s where s.id = 1;
$$;

create function shop_catalog(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'boost', jsonb_build_object('price', s.boost_price_tokens, 'percent', s.boost_percent, 'hours', s.boost_hours),
    'vip', jsonb_build_object('price', ceil(s.vip_price_eur * s.tokens_per_eur)::bigint, 'days', s.vip_days),
    'cosmetics', coalesce((select jsonb_agg(jsonb_build_object('code', c.code, 'kind', c.kind, 'name', c.name, 'name_en', c.name_en,
        'price', c.price_tokens, 'owned', exists (select 1 from user_cosmetics o where o.user_id = p_user and o.code = c.code))
        order by array_position(array['frame', 'color', 'title'], c.kind), c.sort, c.price_tokens)
      from cosmetics c where c.enabled), '[]'::jsonb))
  from settings s where s.id = 1;
$$;

create function shop_buy(p_user uuid, p_item text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  c cosmetics;
  blk text;
  err text;
  price bigint;
  until_at timestamptz;
begin
  select * into s from settings where id = 1;
  select * into u from users where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'unauthorized'); end if;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;

  if p_item = 'boost' then
    price := s.boost_price_tokens;
    err := spend_tokens(u, price, 'boost');
    if err is not null then return jsonb_build_object('ok', false, 'code', err); end if;
    update users set boost_until = greatest(coalesce(boost_until, now()), now()) + make_interval(hours => s.boost_hours)
    where id = p_user returning boost_until into until_at;
    return jsonb_build_object('ok', true, 'item', 'boost', 'price', price, 'until', until_at);
  end if;

  if p_item = 'vip' then
    price := ceil(s.vip_price_eur * s.tokens_per_eur);
    err := spend_tokens(u, price, 'vip');
    if err is not null then return jsonb_build_object('ok', false, 'code', err); end if;
    update users set vip_until = greatest(coalesce(vip_until, now()), now()) + make_interval(days => s.vip_days)
    where id = p_user returning vip_until into until_at;
    return jsonb_build_object('ok', true, 'item', 'vip', 'price', price, 'until', until_at);
  end if;

  select * into c from cosmetics where code = p_item and enabled;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if exists (select 1 from user_cosmetics where user_id = p_user and code = p_item) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  err := spend_tokens(u, c.price_tokens, c.code);
  if err is not null then return jsonb_build_object('ok', false, 'code', err); end if;
  insert into user_cosmetics (user_id, code) values (p_user, c.code);
  -- Equipe tout de suite : c'est ce qu'on attend apres un achat.
  update users set frame = case when c.kind = 'frame' then c.code else frame end,
                   name_color = case when c.kind = 'color' then c.code else name_color end,
                   title = case when c.kind = 'title' then c.code else title end
  where id = p_user;
  return jsonb_build_object('ok', true, 'item', c.code, 'price', c.price_tokens);
end $$;

-- p_code vide : retire l'objet porte pour ce type.
create function shop_equip(p_user uuid, p_kind text, p_code text)
returns jsonb language plpgsql set search_path = public as $$
begin
  if p_kind not in ('frame', 'color', 'title') then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  if coalesce(p_code, '') <> '' and not exists (
    select 1 from user_cosmetics o join cosmetics c on c.code = o.code
    where o.user_id = p_user and o.code = p_code and c.kind = p_kind) then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  update users set frame = case when p_kind = 'frame' then nullif(p_code, '') else frame end,
                   name_color = case when p_kind = 'color' then nullif(p_code, '') else name_color end,
                   title = case when p_kind = 'title' then nullif(p_code, '') else title end
  where id = p_user;
  return jsonb_build_object('ok', true);
end $$;

-- Campagne PTC payee avec ses Coins. Meme prix et memes regles que le paiement FaucetPay.
create function ad_buy_with_tokens(p_user uuid, p_title text, p_url text, p_duration int, p_views int, p_ip_hash text, p_kind text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  blk text;
  err text;
  price numeric;
  tokens bigint;
  order_id uuid;
  cid bigint;
begin
  select * into s from settings where id = 1;
  if length(trim(coalesce(p_title, ''))) not between 3 and 60 then return jsonb_build_object('ok', false, 'code', 'bad_title'); end if;
  if p_url !~ '^https://[^ ]{4,}$' or length(p_url) > 300 then return jsonb_build_object('ok', false, 'code', 'bad_url'); end if;
  if p_duration not in (10, 15, 20, 30) then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  if p_views < 100 or p_views > 100000 then return jsonb_build_object('ok', false, 'code', 'bad_views'); end if;
  if coalesce(p_kind, 'window') not in ('window', 'iframe', 'video') then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  if p_kind = 'video' and p_url !~ '^https://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[A-Za-z0-9_-]{6,}' then
    return jsonb_build_object('ok', false, 'code', 'bad_video');
  end if;
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  price := round(p_views * s.ad_price_eur_per_view * p_duration / 10.0, 4);
  tokens := ceil(price * s.tokens_per_eur);
  err := spend_tokens(u, tokens, 'ad');
  if err is not null then return jsonb_build_object('ok', false, 'code', err); end if;
  insert into ad_orders (user_id, title, url, duration_seconds, views, price_eur, amount_usdt, status, tx_id, paid_at, tokens_paid, kind)
  values (p_user, trim(p_title), p_url, p_duration, p_views, price, 0, 'paid', 'coins:' || gen_random_uuid(), now(), tokens, coalesce(p_kind, 'window'))
  returning id into order_id;
  insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view, enabled, needs_review, advertiser_id, kind)
  values (trim(p_title), p_url, greatest(1, floor(price / p_views * s.ad_reward_share / 100 * s.tokens_per_eur))::int,
    p_duration, p_views, price / p_views, false, true, p_user, coalesce(p_kind, 'window'))
  returning id into cid;
  update ad_orders set campaign_id = cid where id = order_id;
  return jsonb_build_object('ok', true, 'tokens', tokens, 'campaign_id', cid);
end $$;

-- Tournoi de la semaine (lundi 0 h UTC) : gratuit, classe sur les Coins gagnes, prix payes par le site.

create function week_start(p timestamptz)
returns timestamptz language sql immutable as $$
  select date_trunc('week', p at time zone 'utc') at time zone 'utc';
$$;

create function week_scores(p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, score bigint) language sql stable set search_path = public as $$
  select l.user_id, sum(l.delta)::bigint
  from ledger l join users u on u.id = l.user_id
  where l.delta > 0 and l.bucket in ('available', 'pending') and l.at >= p_from and l.at < p_to and not u.banned
    and l.source in ('faucet', 'daily', 'wheel', 'mines', 'dice', 'referral', 'ptc', 'shortlink', 'offer')
  group by l.user_id;
$$;

create function tournament_board(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  with w as (select week_start(now()) as f),
  r as (select sc.user_id, sc.score, row_number() over (order by sc.score desc, sc.user_id) as rk
        from w, week_scores(w.f, w.f + interval '7 days') sc)
  select jsonb_build_object(
    'ends_at', (select f + interval '7 days' from w),
    'prizes', to_jsonb(s.tournament_prizes),
    'top', coalesce((select jsonb_agg(jsonb_build_object('rank', r.rk, 'score', r.score,
        'who', case when length(u.fp_address) >= 10 then left(u.fp_address, 3) || '…' || right(u.fp_address, 3) else '…' end,
        'frame', u.frame, 'name_color', u.name_color, 'title', u.title, 'vip', coalesce(u.vip_until > now(), false), 'me', r.user_id = p_user)
        order by r.rk) from r join users u on u.id = r.user_id where r.rk <= 10), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', r.rk, 'score', r.score) from r where r.user_id = p_user),
    'players', (select count(*) from r))
  from settings s where s.id = 1;
$$;

-- Appelee a chaque lot horaire : paie une seule fois les gagnants de la semaine passee.
create function close_tournament()
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  f timestamptz := week_start(now()) - interval '7 days';
  wk date;
  r record;
  n int := 0;
begin
  select * into s from settings where id = 1;
  wk := (f at time zone 'utc')::date;
  if exists (select 1 from tournament_awards where week = wk) then return jsonb_build_object('ok', true, 'already', true); end if;
  for r in select sc.user_id, sc.score, row_number() over (order by sc.score desc, sc.user_id) as rk
           from week_scores(f, f + interval '7 days') sc order by sc.score desc, sc.user_id
           limit cardinality(s.tournament_prizes) loop
    insert into tournament_awards (week, rank, user_id, score, tokens) values (wk, r.rk, r.user_id, r.score, s.tournament_prizes[r.rk]);
    if s.tournament_prizes[r.rk] > 0 then
      perform move_tokens(r.user_id, 'available', s.tournament_prizes[r.rk], 'tournament', wk::text);
      perform notify(r.user_id, 'tournament', 'Tournoi : tu finis ' || r.rk || 'e et gagnes ' || s.tournament_prizes[r.rk] || ' Coins !',
        'Tournament: you finished #' || r.rk || ' and won ' || s.tournament_prizes[r.rk] || ' Coins!', '#tournament');
    end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'week', wk, 'winners', n);
end $$;

-- Pub interdite (contenu sexuel) : compte ferme, tout le solde saisi, ses campagnes coupees.
-- Les montants saisis restent dans le grand livre (source 'seized') : une erreur peut etre corrigee a la main.
create function ban_for_ad(p_user uuid, p_reason text)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  e record;
  seized bigint := 0;
begin
  select * into u from users where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  update users set banned = true, ban_reason = p_reason where id = p_user;
  for e in select id, status, tokens from earnings where user_id = p_user and status in ('pending', 'validated') for update loop
    perform move_tokens(p_user, e.status, -e.tokens, 'seized', e.id::text);
    update earnings set status = 'rejected' where id = e.id;
    seized := seized + e.tokens;
  end loop;
  select * into u from users where id = p_user;
  if u.available > 0 then
    perform move_tokens(p_user, 'available', -u.available, 'seized', 'available');
    seized := seized + u.available;
  end if;
  update ptc_campaigns set enabled = false, needs_review = false where advertiser_id = p_user;
  return jsonb_build_object('ok', true, 'seized', seized);
end $$;

-- Chat global ------------------------------------------------------------------
create function chat_list(p_user uuid, p_after bigint)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(m order by (m->>'id')::bigint), '[]'::jsonb) from (
    select jsonb_build_object('id', c.id, 'at', c.at, 'body', c.body, 'me', c.user_id = p_user,
      'who', case when length(u.fp_address) >= 10 then left(u.fp_address, 3) || '…' || right(u.fp_address, 3) else '…' end,
      'level', (level_info(u.xp)->>'level')::int, 'vip', coalesce(u.vip_until > now(), false),
      'frame', u.frame, 'name_color', u.name_color, 'title', u.title) as m
    from chat_messages c join users u on u.id = c.user_id
    where not c.hidden and not u.banned and c.id > coalesce(p_after, 0)
    order by c.id desc limit 50) x;
$$;

-- p_flag : raison donnee par la moderation automatique du serveur (lien, contenu interdit), sinon vide.
create function chat_send(p_user uuid, p_body text, p_flag text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  blk text;
  last_body text;
  last_at timestamptz;
  strikes int;
  new_id bigint;
begin
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.chat_muted_until > now() then
    return jsonb_build_object('ok', false, 'code', 'chat_muted', 'until', u.chat_muted_until);
  end if;
  if not exists (select 1 from claims where user_id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'chat_need_roll');
  end if;
  if length(coalesce(p_body, '')) not between 1 and 300 then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  select body, at into last_body, last_at from chat_messages where user_id = p_user order by at desc limit 1;
  if last_at > now() - interval '5 seconds'
     or (select count(*) from chat_messages where user_id = p_user and at > now() - interval '1 minute') >= 8 then
    return jsonb_build_object('ok', false, 'code', 'chat_slow');
  end if;
  if p_flag is not null then
    insert into chat_messages (user_id, body, hidden, flagged) values (p_user, p_body, true, p_flag);
    select count(*) into strikes from chat_messages where user_id = p_user and flagged is not null and at > now() - interval '10 minutes';
    if strikes >= 3 then update users set chat_muted_until = now() + interval '30 minutes' where id = p_user; end if;
    return jsonb_build_object('ok', false, 'code', case when p_flag = 'link' then 'chat_link' else 'chat_blocked' end);
  end if;
  if lower(last_body) = lower(p_body) and last_at > now() - interval '2 minutes' then
    return jsonb_build_object('ok', false, 'code', 'chat_duplicate');
  end if;
  insert into chat_messages (user_id, body) values (p_user, p_body) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

create function admin_chat(p_limit int)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(m order by (m->>'id')::bigint desc), '[]'::jsonb) from (
    select jsonb_build_object('id', c.id, 'at', c.at, 'body', c.body, 'hidden', c.hidden, 'flagged', c.flagged,
      'user_id', u.id, 'member', u.fp_address, 'muted_until', u.chat_muted_until) as m
    from chat_messages c join users u on u.id = c.user_id order by c.id desc limit greatest(least(p_limit, 500), 1)) x;
$$;

create function admin_chat_hide(p_id bigint, p_hidden boolean)
returns void language sql set search_path = public as $$
  update chat_messages set hidden = p_hidden where id = p_id;
$$;

-- p_minutes = 0 : rend la parole.
create function admin_chat_mute(p_user uuid, p_minutes int)
returns void language sql set search_path = public as $$
  update users set chat_muted_until = case when p_minutes > 0 then now() + make_interval(mins => p_minutes) end where id = p_user;
$$;

-- Watch Ads --------------------------------------------------------------------
create function watch_status(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'left', greatest(s.watch_daily_limit - (select count(*) from watch_views v where v.user_id = p_user
                       and v.day = (now() at time zone 'utc')::date and v.completed_at is not null), 0),
    'limit', s.watch_daily_limit,
    'seconds', s.watch_seconds,
    'reward', floor(s.watch_revenue_eur * s.tokens_per_eur * s.watch_share_percent / 100)::int,
    'next_in', greatest(coalesce((select ceil(extract(epoch from max(v.completed_at) + make_interval(secs => s.watch_gap_seconds) - now()))::int
                                  from watch_views v where v.user_id = p_user and v.completed_at is not null), 0), 0))
  from settings s where s.id = 1;
$$;

create function watch_start(p_user uuid, p_token text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  blk text;
  st jsonb;
begin
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.fp_address is null then return jsonb_build_object('ok', false, 'code', 'link_faucetpay'); end if;
  st := watch_status(p_user);
  if (st->>'left')::int < 1 then return jsonb_build_object('ok', false, 'code', 'daily_limit'); end if;
  if (st->>'next_in')::int > 0 then return jsonb_build_object('ok', false, 'code', 'cooldown', 'retry_after', (st->>'next_in')::int); end if;
  insert into watch_views (token, user_id) values (p_token, p_user);
  return jsonb_build_object('ok', true, 'token', p_token, 'seconds', (st->>'seconds')::int);
end $$;

create function watch_complete(p_user uuid, p_token text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  v watch_views;
  blk text;
  left_s numeric;
begin
  select * into s from settings where id = 1;
  select * into u from users where id = p_user;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into v from watch_views where token = p_token and user_id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v.completed_at is not null then return jsonb_build_object('ok', false, 'code', 'already_done'); end if;
  -- Le minuteur est celui du serveur, jamais celui du navigateur.
  left_s := extract(epoch from v.started_at + make_interval(secs => s.watch_seconds) - now());
  if left_s > 0 then return jsonb_build_object('ok', false, 'code', 'too_soon', 'retry_after', ceil(left_s)::int); end if;
  if (select count(*) from watch_views where user_id = p_user and day = v.day and completed_at is not null) >= s.watch_daily_limit then
    return jsonb_build_object('ok', false, 'code', 'daily_limit');
  end if;
  update watch_views set completed_at = now() where token = p_token;
  return add_earning(p_user, 'video', p_token, 'Watch Ads',
    floor(s.watch_revenue_eur * s.tokens_per_eur * s.watch_share_percent / 100)::bigint, s.watch_revenue_eur);
end $$;

-- Seul le serveur (service_role) peut appeler ces fonctions.
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
