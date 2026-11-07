-- Boutique (boost, VIP et pub en Coins, cosmetiques) et tournoi de la semaine.
-- A coller dans Supabase > SQL Editor, une seule fois. Ne touche a aucun solde ; rejouable sans risque.

alter table users add column if not exists boost_until timestamptz;
alter table users add column if not exists frame text;
alter table users add column if not exists name_color text;
alter table users add column if not exists title text;
alter table ad_orders add column if not exists tokens_paid bigint;
alter table settings add column if not exists boost_price_tokens int not null default 1000 check (boost_price_tokens >= 1);
alter table settings add column if not exists boost_percent numeric not null default 20 check (boost_percent between 0 and 100);
alter table settings add column if not exists boost_hours int not null default 24 check (boost_hours between 1 and 168);
alter table settings add column if not exists tournament_prizes int[] not null default '{5000,3000,2000,1000,1000,500,500,500,500,500}'
  check (cardinality(tournament_prizes) between 1 and 50);

-- Boutique : objets cosmetiques (cadre d'avatar, couleur du pseudo, titre). Aucun effet sur les gains.
create table if not exists cosmetics (
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
  ('title_legend', 'title', 'Légende', 'Legend', 20000, 4)
on conflict (code) do nothing;
create table if not exists user_cosmetics (
  user_id uuid not null references users (id),
  code text not null references cosmetics (code),
  bought_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- Tournoi de la semaine : gagnants payes, une ligne par place.
create table if not exists tournament_awards (
  week date not null,
  rank int not null,
  user_id uuid not null references users (id),
  score bigint not null,
  tokens int not null,
  created_at timestamptz not null default now(),
  primary key (week, rank)
);

alter table cosmetics enable row level security;
alter table user_cosmetics enable row level security;
alter table tournament_awards enable row level security;

create or replace function spend_tokens(u users, p_price bigint, p_ref text)
returns text language plpgsql set search_path = public as $$
begin
  if p_price < 0 then return 'bad_request'; end if;
  if p_price > u.available then return 'not_enough'; end if;
  perform move_tokens(u.id, 'available', -p_price, 'shop', p_ref);
  return null;
end $$;

create or replace function boost_percent(u users)
returns numeric language sql stable set search_path = public as $$
  select case when u.boost_until > now() then s.boost_percent else 0 end from settings s where s.id = 1;
$$;

create or replace function shop_catalog(p_user uuid)
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

create or replace function shop_buy(p_user uuid, p_item text, p_ip_hash text)
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

create or replace function shop_equip(p_user uuid, p_kind text, p_code text)
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

create or replace function ad_buy_with_tokens(p_user uuid, p_title text, p_url text, p_duration int, p_views int, p_ip_hash text)
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
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  price := round(p_views * s.ad_price_eur_per_view * p_duration / 10.0, 4);
  tokens := ceil(price * s.tokens_per_eur);
  err := spend_tokens(u, tokens, 'ad');
  if err is not null then return jsonb_build_object('ok', false, 'code', err); end if;
  insert into ad_orders (user_id, title, url, duration_seconds, views, price_eur, amount_usdt, status, tx_id, paid_at, tokens_paid)
  values (p_user, trim(p_title), p_url, p_duration, p_views, price, 0, 'paid', 'coins:' || gen_random_uuid(), now(), tokens)
  returning id into order_id;
  insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view, enabled, needs_review, advertiser_id)
  values (trim(p_title), p_url, greatest(1, floor(price / p_views * s.ad_reward_share / 100 * s.tokens_per_eur))::int,
    p_duration, p_views, price / p_views, false, true, p_user)
  returning id into cid;
  update ad_orders set campaign_id = cid where id = order_id;
  return jsonb_build_object('ok', true, 'tokens', tokens, 'campaign_id', cid);
end $$;

create or replace function week_start(p timestamptz)
returns timestamptz language sql immutable as $$
  select date_trunc('week', p at time zone 'utc') at time zone 'utc';
$$;

create or replace function week_scores(p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, score bigint) language sql stable set search_path = public as $$
  select l.user_id, sum(l.delta)::bigint
  from ledger l join users u on u.id = l.user_id
  where l.delta > 0 and l.bucket in ('available', 'pending') and l.at >= p_from and l.at < p_to and not u.banned
    and l.source in ('faucet', 'daily', 'wheel', 'mines', 'dice', 'referral', 'ptc', 'shortlink', 'offer')
  group by l.user_id;
$$;

create or replace function tournament_board(p_user uuid)
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

create or replace function close_tournament()
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
    if s.tournament_prizes[r.rk] > 0 then perform move_tokens(r.user_id, 'available', s.tournament_prizes[r.rk], 'tournament', wk::text); end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'week', wk, 'winners', n);
end $$;

create or replace function add_earning(p_user uuid, p_source text, p_ref text, p_label text, p_tokens bigint, p_revenue numeric)
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

create or replace function claim_daily(p_user uuid, p_ip_hash text)
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
  n := s.daily_bonus_tokens + floor(s.daily_bonus_tokens * boost_percent(u) / 100);
  perform move_tokens(p_user, 'available', n, 'daily', today::text);
  return jsonb_build_object('ok', true, 'tokens', n);
end $$;

create or replace function claim_challenge(p_user uuid, p_id bigint, p_ip_hash text)
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
  if exists (select 1 from challenge_done where challenge_id = p_id and user_id = p_user and day = today) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  n := challenge_progress(p_user, c.goal);
  if n < c.target_claims then return jsonb_build_object('ok', false, 'code', 'not_reached'); end if;
  insert into challenge_done (challenge_id, user_id, day) values (p_id, p_user, today);
  n := c.reward_tokens + floor(c.reward_tokens * boost_percent(u) / 100);
  perform move_tokens(p_user, 'available', n, 'challenge', p_id::text);
  return jsonb_build_object('ok', true, 'tokens', n);
end $$;

create or replace function admin_save_ptc(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p->>'id' is null then
    insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view)
    values (p->>'title', p->>'url', (p->>'reward_tokens')::int, (p->>'duration_seconds')::int, (p->>'max_views')::int, coalesce((p->>'price_eur_per_view')::numeric, 0));
  else
    if (p->>'enabled')::boolean is false then
      perform move_tokens(o.user_id, 'available', o.tokens_paid, 'ad_refund', o.id::text)
      from ad_orders o join ptc_campaigns c on c.id = o.campaign_id
      where c.id = (p->>'id')::bigint and c.needs_review and o.tokens_paid > 0;
    end if;
    update ptc_campaigns set enabled = coalesce((p->>'enabled')::boolean, enabled), needs_review = false where id = (p->>'id')::bigint;
  end if;
end $$;

create or replace function my_ad_orders(p_user uuid)
returns jsonb language sql stable set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'at', o.created_at, 'title', o.title, 'url', o.url,
    'views', o.views, 'duration', o.duration_seconds, 'amount_usdt', o.amount_usdt, 'tokens_paid', o.tokens_paid, 'status', o.status,
    'shown', coalesce(c.views, 0), 'enabled', coalesce(c.enabled, false), 'review', coalesce(c.needs_review, false))
    order by o.created_at desc), '[]'::jsonb)
  from ad_orders o left join ptc_campaigns c on c.id = o.campaign_id
  where o.user_id = p_user and (o.status = 'paid' or o.created_at > now() - interval '1 day');
$fn$;

create or replace function public_status()
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

create or replace function user_profile(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'ref_code', u.ref_code, 'secured', u.password_hash is not null,
    'vip', coalesce(u.vip_until > now(), false), 'vip_until', u.vip_until, 'fp_address', u.fp_address, 'payout_coin', u.payout_coin,
    'available', u.available, 'pending', u.pending, 'validated', u.validated,
    'daily_done', u.last_daily_day = (now() at time zone 'utc')::date,
    'wheel_done', coalesce(u.last_wheel_at > now() - make_interval(hours => s.wheel_hours), false),
    'wheel_retry_after', greatest(coalesce(ceil(extract(epoch from u.last_wheel_at + make_interval(hours => s.wheel_hours) - now()))::int, 0), 0),
    'wheel_hours', s.wheel_hours,
    'window_count', s.claims_window_count,
    'window_minutes', s.claims_window_seconds / 60,
    'window_used', (select count(*) from claims where user_id = u.id and at > now() - make_interval(secs => s.claims_window_seconds)),
    'wheel_prizes', s.wheel_prizes,
    'wheel_min_claims', s.wheel_min_claims,
    'daily_bonus_tokens', s.daily_bonus_tokens,
    'claims_max', s.max_claims_account_day,
    'boost', coalesce(u.boost_until > now(), false), 'boost_until', u.boost_until,
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
      coalesce((select case when count(*) >= s.claims_window_count
                       then ceil(extract(epoch from min(at) + make_interval(secs => s.claims_window_seconds) - now()))::int end
                from (select at from claims where user_id = u.id and at > now() - make_interval(secs => s.claims_window_seconds)
                      order by at desc limit s.claims_window_count) w), 0), 0),
    -- Gamification : total gagne (niveau) et serie de jours consecutifs avec au moins une reclamation.
    'earned_total', (select coalesce(sum(delta), 0) from ledger where user_id = u.id and delta > 0
                      and source in ('faucet', 'daily', 'wheel', 'challenge', 'referral', 'ptc', 'shortlink', 'offer', 'mines', 'dice', 'tournament')),
    'streak', (with d as (select distinct (at at time zone 'utc')::date as day from claims
                          where user_id = u.id and at > now() - interval '400 days'),
                    g as (select day, day - (row_number() over (order by day))::int as grp from d)
               select case when max(day) >= (now() at time zone 'utc')::date - 1
                           then (select count(*) from g g2 where g2.grp = (select grp from g order by day desc limit 1))
                           else 0 end from g),
    'referrals', (select count(*) from users r where r.referrer_id = u.id),
    'referral_earned', (select coalesce(sum(delta), 0) from ledger where user_id = u.id and source = 'referral'),
    'coins', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'per_eur', per_eur, 'decimals', decimals) order by sort), '[]'::jsonb)
              from coins where enabled and per_eur is not null),
    'challenges', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'goal', c.goal, 'target', c.target_claims, 'reward_tokens', c.reward_tokens,
                     'progress', challenge_progress(u.id, c.goal),
                     'done', exists (select 1 from challenge_done d where d.challenge_id = c.id and d.user_id = u.id and d.day = (now() at time zone 'utc')::date))
                     order by array_position(array['claims', 'earned', 'ptc', 'links', 'surveys', 'offers'], c.goal), c.target_claims), '[]'::jsonb)
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

create or replace function admin_overview()
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
    'challenges', coalesce((select jsonb_agg(to_jsonb(c) order by array_position(array['claims', 'earned', 'ptc', 'links', 'surveys', 'offers'], c.goal), c.target_claims) from challenges c), '[]'::jsonb)
  );
$$;

create or replace function admin_update_settings(p jsonb)
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
    claims_window_count = coalesce((p->>'claims_window_count')::int, claims_window_count),
    claims_window_seconds = coalesce((p->>'claims_window_seconds')::int, claims_window_seconds),
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

-- Seul le serveur (service_role) peut appeler ces fonctions.
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
