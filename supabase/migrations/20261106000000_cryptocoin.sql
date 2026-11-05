-- CryptoCoin : schema complet. Rejouable : efface d'abord l'ancienne version, sans donnees reelles a ce stade.
-- Toute regle d'argent est ici. Tables fermees (RLS sans politique), fonctions reservees a service_role.

drop table if exists challenge_done, challenges, offerwalls, ptc_views, ptc_campaigns, shortlink_visits,
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
  cooldown_seconds int not null default 300 check (cooldown_seconds >= 10),
  max_claims_account_day int not null default 48 check (max_claims_account_day >= 1),
  max_claims_ip_day int not null default 48 check (max_claims_ip_day >= 1),
  max_claims_site_hour int not null default 200 check (max_claims_site_hour >= 1),
  max_payout_eur_day numeric not null default 5 check (max_payout_eur_day > 0),
  max_signups_ip_day int not null default 3 check (max_signups_ip_day >= 1),
  daily_bonus_tokens int not null default 5 check (daily_bonus_tokens >= 0),
  daily_bonus_min_claims int not null default 1 check (daily_bonus_min_claims >= 0),
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
  last_balance_at timestamptz
);
insert into coins (code, name, per_eur, low_balance_units, enabled, sort) values
  ('USDT', 'Tether', 1.10, 100000000, true, 1), ('DOGE', 'Dogecoin', null, 0, false, 2), ('TRX', 'TRON', null, 0, false, 3),
  ('LTC', 'Litecoin', null, 0, false, 4), ('BTC', 'Bitcoin', null, 0, false, 5), ('ETH', 'Ethereum', null, 0, false, 6),
  ('USDC', 'USD Coin', null, 0, false, 7), ('SOL', 'Solana', null, 0, false, 8), ('BNB', 'BNB', null, 0, false, 9),
  ('BCH', 'Bitcoin Cash', null, 0, false, 10), ('DASH', 'Dash', null, 0, false, 11), ('DGB', 'DigiByte', null, 0, false, 12),
  ('ZEC', 'Zcash', null, 0, false, 13), ('FEY', 'Feyorra', null, 0, false, 14);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  ref_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  referrer_id uuid references users (id),
  referral_carry numeric not null default 0,
  fp_address text,
  fp_norm text unique,
  fp_user_hash text unique,
  payout_coin text not null default 'USDT' references coins (code),
  -- available : retirable tout de suite. pending : a valider. validated : part au prochain lot horaire.
  available bigint not null default 0,
  pending bigint not null default 0,
  validated bigint not null default 0,
  last_daily_day date,
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
  source text not null check (source in ('ptc', 'shortlink', 'offer')),
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
  enabled boolean not null default true,
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
  enabled boolean not null default true
);

create table challenges (
  id bigint generated always as identity primary key,
  name text not null,
  target_claims int not null check (target_claims >= 1),
  reward_tokens int not null check (reward_tokens > 0),
  enabled boolean not null default true
);
insert into challenges (name, target_claims, reward_tokens) values
  ('5 réclamations aujourd''hui', 5, 2), ('15 réclamations aujourd''hui', 15, 5), ('30 réclamations aujourd''hui', 30, 10);
create table challenge_done (
  challenge_id bigint not null references challenges (id),
  user_id uuid not null references users (id),
  day date not null,
  primary key (challenge_id, user_id, day)
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
  select referral_percent into pct from settings where id = 1;
  update users set referral_carry = referral_carry + p_tokens * pct / 100 where id = rid
    returning referral_carry into carry;
  whole := floor(carry);
  if whole > 0 then
    update users set referral_carry = referral_carry - whole where id = rid;
    perform move_tokens(rid, 'available', whole, 'referral', p_user::text);
  end if;
end $$;

-- Comptes ----------------------------------------------------------------

create function signup_user(p_email text, p_password_hash text, p_ip_hash text, p_ref text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  n int;
  rid uuid;
  new_id uuid;
begin
  select * into s from settings where id = 1;
  if exists (select 1 from bans where kind = 'ip' and value = p_ip_hash) then
    return jsonb_build_object('ok', false, 'code', 'banned');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('signup:' || p_ip_hash, 0));
  select count(*) into n from users where signup_ip_hash = p_ip_hash and created_at > now() - interval '24 hours';
  if n >= s.max_signups_ip_day then return jsonb_build_object('ok', false, 'code', 'too_many_signups'); end if;
  if exists (select 1 from users where email = p_email) then
    return jsonb_build_object('ok', false, 'code', 'email_taken');
  end if;
  -- Pas de parrainage depuis sa propre connexion.
  if p_ref is not null then
    select id into rid from users where ref_code = p_ref and signup_ip_hash <> p_ip_hash and not banned;
  end if;
  insert into users (email, password_hash, signup_ip_hash, last_ip_hash, referrer_id)
  values (p_email, p_password_hash, p_ip_hash, p_ip_hash, rid) returning id into new_id;
  return jsonb_build_object('ok', true, 'user_id', new_id);
end $$;

create function get_login(p_email text)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('user_id', id, 'password_hash', password_hash) from users where email = p_email;
$$;

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

create function link_faucetpay(p_user uuid, p_address text, p_norm text, p_hash text)
returns jsonb language plpgsql set search_path = public as $$
begin
  if p_hash is not null and exists (select 1 from bans where kind = 'account' and value = p_hash) then
    return jsonb_build_object('ok', false, 'code', 'banned');
  end if;
  if exists (select 1 from users where id <> p_user and (fp_norm = p_norm or (p_hash is not null and fp_user_hash = p_hash))) then
    return jsonb_build_object('ok', false, 'code', 'fp_taken');
  end if;
  update users set fp_address = p_address, fp_norm = p_norm, fp_user_hash = p_hash where id = p_user;
  return jsonb_build_object('ok', true);
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
  s settings;
  u users;
  blk text;
  last_at timestamptz;
  n int;
begin
  select * into u from users where id = p_user for update;
  perform pg_advisory_xact_lock(hashtextextended('ip:' || p_ip_hash, 0));
  select * into s from settings where id = 1;

  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.fp_address is null then return jsonb_build_object('ok', false, 'code', 'link_faucetpay'); end if;
  if s.faucet_reward_tokens <= 0 then return jsonb_build_object('ok', false, 'code', 'paused'); end if;

  select max(at) into last_at from claims
   where at > now() - make_interval(secs => s.cooldown_seconds) and (user_id = p_user or ip_hash = p_ip_hash);
  if last_at is not null then
    return jsonb_build_object('ok', false, 'code', 'cooldown', 'retry_after',
      ceil(extract(epoch from last_at + make_interval(secs => s.cooldown_seconds) - now()))::int);
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

  insert into claims (user_id, ip_hash, tokens) values (p_user, p_ip_hash, s.faucet_reward_tokens);
  perform move_tokens(p_user, 'available', s.faucet_reward_tokens, 'faucet', null);
  perform credit_referral(p_user, s.faucet_reward_tokens);
  return jsonb_build_object('ok', true, 'tokens', s.faucet_reward_tokens,
    'available', u.available + s.faucet_reward_tokens, 'cooldown_seconds', s.cooldown_seconds);
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
  update users set last_daily_day = today where id = p_user;
  perform move_tokens(p_user, 'available', s.daily_bonus_tokens, 'daily', today::text);
  return jsonb_build_object('ok', true, 'tokens', s.daily_bonus_tokens);
end $$;

create function claim_challenge(p_user uuid, p_id bigint, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  c challenges;
  u users;
  blk text;
  today date := (now() at time zone 'utc')::date;
  n int;
begin
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into c from challenges where id = p_id and enabled;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if exists (select 1 from challenge_done where challenge_id = p_id and user_id = p_user and day = today) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  select count(*) into n from claims where user_id = p_user and (at at time zone 'utc')::date = today;
  if n < c.target_claims then return jsonb_build_object('ok', false, 'code', 'not_reached'); end if;
  insert into challenge_done (challenge_id, user_id, day) values (p_id, p_user, today);
  perform move_tokens(p_user, 'available', c.reward_tokens, 'challenge', p_id::text);
  return jsonb_build_object('ok', true, 'tokens', c.reward_tokens);
end $$;

-- Gains a valider : PTC, liens, offres ------------------------------------

create function add_earning(p_user uuid, p_source text, p_ref text, p_label text, p_tokens bigint, p_revenue numeric)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  risk_txt text;
  n int;
  new_id bigint;
begin
  select * into u from users where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'unknown_user'); end if;
  select count(*) into n from users where last_ip_hash = u.last_ip_hash and id <> p_user;
  if n > 0 then risk_txt := 'IP partagée avec ' || n || ' autre(s) compte(s)'; end if;
  if u.banned then risk_txt := 'Compte banni'; end if;
  insert into earnings (user_id, source, ref, label, tokens, revenue_eur, risk)
  values (p_user, p_source, p_ref, p_label, p_tokens, p_revenue, risk_txt)
  on conflict (source, ref) do nothing returning id into new_id;
  if new_id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  perform move_tokens(p_user, 'pending', p_tokens, p_source, p_ref);
  return jsonb_build_object('ok', true, 'tokens', p_tokens);
end $$;

create function ptc_list(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'reward_tokens', c.reward_tokens,
    'duration_seconds', c.duration_seconds) order by c.reward_tokens desc), '[]'::jsonb)
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
  return jsonb_build_object('ok', true, 'url', c.url, 'duration_seconds', c.duration_seconds);
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
  select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'iframe_url', iframe_url)), '[]'::jsonb)
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
    floor(eur * s.tokens_per_eur * s.offer_share_percent / 100)::bigint, eur);
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
    select id from users where validated > 0 and fp_address is not null and not banned
    order by validated desc limit p_limit) x;
$$;

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
    'email', u.email, 'ref_code', u.ref_code, 'fp_address', u.fp_address, 'payout_coin', u.payout_coin,
    'available', u.available, 'pending', u.pending, 'validated', u.validated,
    'daily_done', u.last_daily_day = (now() at time zone 'utc')::date,
    'daily_bonus_tokens', s.daily_bonus_tokens,
    'claims_today', (select count(*) from claims where user_id = u.id and (at at time zone 'utc')::date = (now() at time zone 'utc')::date),
    'retry_after', greatest(coalesce((select ceil(extract(epoch from max(at) + make_interval(secs => s.cooldown_seconds) - now()))::int from claims where user_id = u.id), 0), 0),
    'referrals', (select count(*) from users r where r.referrer_id = u.id),
    'referral_earned', (select coalesce(sum(delta), 0) from ledger where user_id = u.id and source = 'referral'),
    'coins', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'per_eur', per_eur, 'decimals', decimals) order by sort), '[]'::jsonb)
              from coins where enabled and per_eur is not null),
    'challenges', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'target', c.target_claims, 'reward_tokens', c.reward_tokens,
                     'done', exists (select 1 from challenge_done d where d.challenge_id = c.id and d.user_id = u.id and d.day = (now() at time zone 'utc')::date)) order by c.target_claims), '[]'::jsonb)
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
    'challenges', coalesce((select jsonb_agg(to_jsonb(c) order by c.target_claims) from challenges c), '[]'::jsonb)
  );
$$;

create function admin_earnings(p_status text, p_limit int)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select e.id, e.created_at, e.source, e.label, e.tokens, e.status, e.risk, u.email, u.fp_address, e.user_id
    from earnings e join users u on u.id = e.user_id
    where e.status = p_status order by e.risk is not null desc, e.created_at
    limit least(greatest(p_limit, 1), 200)) x;
$$;

create function admin_validate_earnings(p_ids bigint[], p_all_clean boolean)
returns jsonb language plpgsql set search_path = public as $$
declare
  e earnings;
  n int := 0;
begin
  for e in select * from earnings where status = 'pending'
             and ((p_all_clean and risk is null) or id = any (coalesce(p_ids, '{}'))) for update loop
    perform move_tokens(e.user_id, 'pending', -e.tokens, 'validation', e.id::text);
    perform move_tokens(e.user_id, 'validated', e.tokens, 'validation', e.id::text);
    perform credit_referral(e.user_id, e.tokens);
    update earnings set status = 'validated' where id = e.id;
    n := n + 1;
  end loop;
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
    select w.*, c.decimals, u.email from withdrawals w join coins c on c.code = w.coin join users u on u.id = w.user_id
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
    select u.id, u.email, u.fp_address, u.fp_user_hash, u.available, u.pending, u.validated, u.banned, u.ban_reason, u.created_at, u.last_ip_hash,
      (select count(*) from claims c where c.user_id = u.id) as claims,
      (select count(*) from users o where o.last_ip_hash = u.last_ip_hash and o.id <> u.id) as same_ip
    from users u
    where p_search = '' or u.email ilike '%' || p_search || '%' or u.fp_address ilike '%' || p_search || '%'
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
    cooldown_seconds = coalesce((p->>'cooldown_seconds')::int, cooldown_seconds),
    max_claims_account_day = coalesce((p->>'max_claims_account_day')::int, max_claims_account_day),
    max_claims_ip_day = coalesce((p->>'max_claims_ip_day')::int, max_claims_ip_day),
    max_claims_site_hour = coalesce((p->>'max_claims_site_hour')::int, max_claims_site_hour),
    max_payout_eur_day = coalesce((p->>'max_payout_eur_day')::numeric, max_payout_eur_day),
    max_signups_ip_day = coalesce((p->>'max_signups_ip_day')::int, max_signups_ip_day),
    daily_bonus_tokens = coalesce((p->>'daily_bonus_tokens')::int, daily_bonus_tokens),
    daily_bonus_min_claims = coalesce((p->>'daily_bonus_min_claims')::int, daily_bonus_min_claims),
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
    insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view)
    values (p->>'title', p->>'url', (p->>'reward_tokens')::int, (p->>'duration_seconds')::int, (p->>'max_views')::int, coalesce((p->>'price_eur_per_view')::numeric, 0));
  else
    update ptc_campaigns set enabled = coalesce((p->>'enabled')::boolean, enabled) where id = (p->>'id')::bigint;
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
    insert into offerwalls (code, name, iframe_url, postback_secret)
    values (p->>'code', p->>'name', p->>'iframe_url', p->>'postback_secret')
    on conflict (code) do update set name = excluded.name, iframe_url = excluded.iframe_url, postback_secret = excluded.postback_secret;
  else
    update offerwalls set enabled = coalesce((p->>'enabled')::boolean, enabled) where code = p->>'code';
  end if;
end $$;

create function admin_save_challenge(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p->>'id' is null then
    insert into challenges (name, target_claims, reward_tokens)
    values (p->>'name', (p->>'target_claims')::int, (p->>'reward_tokens')::int);
  else
    update challenges set enabled = coalesce((p->>'enabled')::boolean, enabled) where id = (p->>'id')::bigint;
  end if;
end $$;

-- Seul le serveur (service_role) peut appeler ces fonctions.
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
