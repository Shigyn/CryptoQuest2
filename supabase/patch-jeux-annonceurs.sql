-- Jeux gratuits Mines et Dice, espace annonceur. A coller dans SQL Editor : ne touche a aucune donnee.
alter table settings add column if not exists mines_daily_plays int not null default 3;
alter table settings add column if not exists mines_rewards int[] not null default '{1,2,4,6,9,13,18,25,35,50}';
alter table settings add column if not exists dice_daily_plays int not null default 3;
alter table settings add column if not exists dice_unit int not null default 2;
alter table settings add column if not exists ad_price_eur_per_view numeric not null default 0.002;
alter table settings add column if not exists ad_reward_share numeric not null default 50;
alter table ptc_campaigns add column if not exists needs_review boolean not null default false;
alter table ptc_campaigns add column if not exists advertiser_id uuid references users (id);

create table if not exists game_plays (
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
create index if not exists game_plays_user_idx on game_plays (user_id, day);
create unique index if not exists game_plays_one_active on game_plays (user_id) where game = 'mines' and status = 'active';

create table if not exists ad_orders (
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
  paid_at timestamptz
);
create index if not exists ad_orders_user_idx on ad_orders (user_id, created_at desc);

alter table game_plays enable row level security;
alter table ad_orders enable row level security;

create or replace function game_gate(u users, p_ip_hash text, p_game text, p_limit int)
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

create or replace function mines_public(g game_plays, rewards int[])
returns jsonb language sql immutable as $fn$
  select jsonb_build_object('ok', true, 'id', g.id, 'status', g.status,
    'revealed', g.state->'revealed',
    'gain', coalesce(rewards[jsonb_array_length(g.state->'revealed')], 0),
    'next', rewards[jsonb_array_length(g.state->'revealed') + 1]);
$fn$;

create or replace function mines_start(p_user uuid, p_ip_hash text)
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

create or replace function mines_finish(g game_plays, p_status text, rewards int[])
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

create or replace function mines_reveal(p_user uuid, p_cell int, p_ip_hash text)
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

create or replace function mines_cashout(p_user uuid, p_ip_hash text)
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

create or replace function dice_roll(p_user uuid, p_target int, p_ip_hash text)
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

create or replace function create_ad_order(p_user uuid, p_title text, p_url text, p_duration int, p_views int)
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
  insert into ad_orders (user_id, title, url, duration_seconds, views, price_eur, amount_usdt)
  values (p_user, trim(p_title), p_url, p_duration, p_views, price, usdt) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id, 'amount_usdt', usdt, 'price_eur', price);
end $fn$;

create or replace function pay_ad_order(p_id uuid, p_tx text, p_amount numeric, p_currency text)
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
  insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view, enabled, needs_review, advertiser_id)
  values (o.title, o.url,
    greatest(1, floor(o.price_eur / o.views * s.ad_reward_share / 100 * s.tokens_per_eur))::int,
    o.duration_seconds, o.views, o.price_eur / o.views, false, true, o.user_id)
  returning id into cid;
  update ad_orders set status = 'paid', tx_id = p_tx, paid_at = now(), campaign_id = cid where id = p_id;
  return jsonb_build_object('ok', true, 'campaign_id', cid);
end $fn$;

create or replace function ad_order_paid(p_id uuid)
returns boolean language sql stable set search_path = public as $fn$
  select exists (select 1 from ad_orders where id = p_id and status = 'paid');
$fn$;

create or replace function my_ad_orders(p_user uuid)
returns jsonb language sql stable set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'at', o.created_at, 'title', o.title, 'url', o.url,
    'views', o.views, 'duration', o.duration_seconds, 'amount_usdt', o.amount_usdt, 'status', o.status,
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
    'ref_code', u.ref_code, 'secured', u.password_hash is not null, 'fp_address', u.fp_address, 'payout_coin', u.payout_coin,
    'available', u.available, 'pending', u.pending, 'validated', u.validated,
    'daily_done', u.last_daily_day = (now() at time zone 'utc')::date,
    'wheel_done', u.last_wheel_day = (now() at time zone 'utc')::date,
    'wheel_prizes', s.wheel_prizes,
    'wheel_min_claims', s.wheel_min_claims,
    'daily_bonus_tokens', s.daily_bonus_tokens,
    'claims_max', s.max_claims_account_day,
    'games', jsonb_build_object(
      'mines_left', greatest(s.mines_daily_plays - (select count(*) from game_plays where user_id = u.id and game = 'mines' and day = (now() at time zone 'utc')::date), 0),
      'dice_left', greatest(s.dice_daily_plays - (select count(*) from game_plays where user_id = u.id and game = 'dice' and day = (now() at time zone 'utc')::date), 0),
      'mines_rewards', s.mines_rewards,
      'dice_unit', s.dice_unit,
      'mines_active', (select mines_public(g, s.mines_rewards) from game_plays g where g.user_id = u.id and g.game = 'mines' and g.status = 'active')),
    'claims_today', (select count(*) from claims where user_id = u.id and (at at time zone 'utc')::date = (now() at time zone 'utc')::date),
    'retry_after', greatest(coalesce((select ceil(extract(epoch from max(at) + make_interval(secs => s.cooldown_seconds) - now()))::int from claims where user_id = u.id), 0), 0),
    -- Gamification : total gagne (niveau) et serie de jours consecutifs avec au moins une reclamation.
    'earned_total', (select coalesce(sum(delta), 0) from ledger where user_id = u.id and delta > 0
                      and source in ('faucet', 'daily', 'wheel', 'challenge', 'referral', 'ptc', 'shortlink', 'offer')),
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
    auto_rates = coalesce((p->>'auto_rates')::boolean, auto_rates),
    mines_daily_plays = coalesce((p->>'mines_daily_plays')::int, mines_daily_plays),
    dice_daily_plays = coalesce((p->>'dice_daily_plays')::int, dice_daily_plays),
    dice_unit = coalesce((p->>'dice_unit')::int, dice_unit),
    ad_price_eur_per_view = coalesce((p->>'ad_price_eur_per_view')::numeric, ad_price_eur_per_view),
    ad_reward_share = coalesce((p->>'ad_reward_share')::numeric, ad_reward_share),
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

create or replace function admin_save_ptc(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p->>'id' is null then
    insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view)
    values (p->>'title', p->>'url', (p->>'reward_tokens')::int, (p->>'duration_seconds')::int, (p->>'max_views')::int, coalesce((p->>'price_eur_per_view')::numeric, 0));
  else
    update ptc_campaigns set enabled = coalesce((p->>'enabled')::boolean, enabled), needs_review = false where id = (p->>'id')::bigint;
  end if;
end $$;

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

revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
