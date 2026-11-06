-- VIP : abonnement paye via FaucetPay (avantages fixes). Ne supprime aucune donnee.
alter table settings add column if not exists vip_price_eur numeric not null default 2.99;
alter table settings add column if not exists vip_days int not null default 30;
alter table settings add column if not exists vip_task_bonus numeric not null default 10;
alter table settings add column if not exists vip_referral_percent numeric not null default 15;
alter table users add column if not exists vip_until timestamptz;

create table if not exists vip_orders (
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
create index if not exists vip_orders_user_idx on vip_orders (user_id, created_at desc);

alter table vip_orders enable row level security;

create or replace function credit_referral(p_user uuid, p_tokens bigint)
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
  if u.vip_until > now() then
    select vip_task_bonus into bonus from settings where id = 1;
    tokens := p_tokens + floor(p_tokens * bonus / 100);
  end if;
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
    'challenges', coalesce((select jsonb_agg(to_jsonb(c) order by c.target_claims) from challenges c), '[]'::jsonb)
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

create or replace function create_vip_order(p_user uuid)
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

create or replace function pay_vip_order(p_id uuid, p_tx text, p_amount numeric, p_currency text)
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

create or replace function vip_order_paid(p_id uuid)
returns boolean language sql stable set search_path = public as $fn$
  select exists (select 1 from vip_orders where id = p_id and status = 'paid');
$fn$;

-- Seul le serveur (service_role) peut appeler ces fonctions.
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
