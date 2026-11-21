-- 21/11 : minage virtuel (finance par la pub). Session de base de 8 h a relancer (30 GH/s), chaque PTC ouvre
-- une session de 20 GH/s pendant 8 h, chaque video une session de 50 GH/s pendant 8 h. 1 TH/s pendant 1 h = 1 sat.
-- Le tirage et l'energie disparaissent du site (le code reste). A coller dans Supabase > SQL Editor (projet du faucet),
-- APRES le redeploiement des fonctions. Rejouable.

alter table settings add column if not exists mining_enabled boolean not null default false;
alter table settings add column if not exists mining_session_hours numeric not null default 8 check (mining_session_hours > 0);
alter table settings add column if not exists mining_base_ghs numeric not null default 30 check (mining_base_ghs >= 0);
alter table settings add column if not exists mining_ptc_ghs numeric not null default 20 check (mining_ptc_ghs >= 0);
alter table settings add column if not exists mining_video_ghs numeric not null default 50 check (mining_video_ghs >= 0);
alter table settings add column if not exists mining_sat_per_ths_hour numeric not null default 1 check (mining_sat_per_ths_hour >= 0);
alter table settings add column if not exists mining_ads_per_hour int not null default 30 check (mining_ads_per_hour >= 0);
alter table settings add column if not exists mining_ads_per_day int not null default 100 check (mining_ads_per_day >= 0);
alter table settings add column if not exists mining_sat_eur numeric not null default 0.00068 check (mining_sat_eur > 0);
alter table users add column if not exists mining_carry numeric not null default 0;
create table if not exists mining_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references users (id),
  kind text not null check (kind in ('base', 'ptc', 'video')),
  ghs numeric not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  coins_per_hour numeric not null,
  revenue_eur numeric,
  ref text unique,
  credited boolean not null default false,
  credited_tokens bigint
);
create index if not exists mining_sessions_user_idx on mining_sessions (user_id, started_at desc);
create index if not exists mining_sessions_open_idx on mining_sessions (ends_at) where not credited;
alter table mining_sessions enable row level security;
alter table challenges drop constraint if exists challenges_goal_check;
alter table challenges add constraint challenges_goal_check check (goal in ('claims', 'earned', 'ptc', 'links', 'surveys', 'offers', 'sessions', 'ads'));

-- Quetes : celles des tirages s'arretent, celles du minage arrivent. Bonus quotidien sans tirage prealable.
update challenges set enabled = false where goal = 'claims';
insert into challenges (name, goal, period, target_claims, reward_tokens)
select v.* from (values
  ('3 sessions de minage', 'sessions', 'day', 3, 10), ('10 pubs', 'ads', 'day', 10, 15), ('30 pubs', 'ads', 'day', 30, 40),
  ('15 sessions cette semaine', 'sessions', 'week', 15, 60), ('150 pubs cette semaine', 'ads', 'week', 150, 150)) as v(name, goal, period, target, reward)
where not exists (select 1 from challenges c where c.goal = v.goal and c.period = v.period and c.target_claims = v.target);
update settings set mining_enabled = true, daily_bonus_min_claims = 0 where id = 1;

create or replace function coins_per_sat()
returns numeric language sql stable set search_path = public as $$
  select s.tokens_per_eur * coalesce(0.00000001 / nullif((select per_eur from coins where code = 'BTC'), 0), s.mining_sat_eur)
  from settings s where s.id = 1;
$$;

create or replace function mining_ad_block(p_user uuid)
returns text language sql stable set search_path = public as $$
  select case
    when not s.mining_enabled then null
    when (select count(*) from mining_sessions where user_id = p_user and kind in ('ptc', 'video') and started_at > now() - interval '1 hour') >= s.mining_ads_per_hour then 'mining_ad_limit'
    when (select count(*) from mining_sessions where user_id = p_user and kind in ('ptc', 'video') and started_at > now() - interval '24 hours') >= s.mining_ads_per_day then 'daily_limit'
  end
  from settings s where s.id = 1;
$$;

create or replace function mining_start(p_user uuid, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  blk text;
  active mining_sessions;
  ghs numeric;
  ends timestamptz;
begin
  select * into s from settings where id = 1;
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.fp_address is null then return jsonb_build_object('ok', false, 'code', 'link_faucetpay'); end if;
  if not s.mining_enabled or s.paused then return jsonb_build_object('ok', false, 'code', 'paused'); end if;
  select * into active from mining_sessions where user_id = p_user and kind = 'base' and ends_at > now() order by ends_at desc limit 1;
  if found then
    return jsonb_build_object('ok', false, 'code', 'mining_active', 'retry_after', ceil(extract(epoch from active.ends_at - now()))::int);
  end if;
  ghs := round(s.mining_base_ghs * (level_info(u.xp)->>'mult')::numeric, 2);
  ends := now() + make_interval(secs => (s.mining_session_hours * 3600)::int);
  insert into mining_sessions (user_id, kind, ghs, ends_at, coins_per_hour)
  values (p_user, 'base', ghs, ends, ghs / 1000 * s.mining_sat_per_ths_hour * coins_per_sat());
  update users set xp = xp + 1 where id = p_user;
  return jsonb_build_object('ok', true, 'ghs', ghs, 'ends_at', ends);
end $$;

create or replace function mining_add(p_user uuid, p_kind text, p_ref text, p_revenue numeric)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  ghs numeric;
  new_id bigint;
begin
  select * into s from settings where id = 1;
  ghs := case when p_kind = 'video' then s.mining_video_ghs else s.mining_ptc_ghs end;
  insert into mining_sessions (user_id, kind, ghs, ends_at, coins_per_hour, revenue_eur, ref)
  values (p_user, p_kind, ghs, now() + make_interval(secs => (s.mining_session_hours * 3600)::int),
          ghs / 1000 * s.mining_sat_per_ths_hour * coins_per_sat(), p_revenue, p_ref)
  on conflict (ref) do nothing returning id into new_id;
  if new_id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update users set xp = xp + 1 where id = p_user;
  return jsonb_build_object('ok', true, 'mining', true, 'kind', p_kind, 'ghs', ghs, 'hours', s.mining_session_hours);
end $$;

create or replace function mining_settle(p_user uuid)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  m mining_sessions;
  exact numeric;
  carry numeric;
  tokens bigint;
  total bigint := 0;
begin
  select * into u from users where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  carry := u.mining_carry;
  for m in select * from mining_sessions where user_id = p_user and not credited and ends_at <= now() order by ends_at for update loop
    exact := m.coins_per_hour * extract(epoch from m.ends_at - m.started_at) / 3600 + carry;
    tokens := floor(exact);
    carry := exact - tokens;
    update mining_sessions set credited = true, credited_tokens = tokens where id = m.id;
    if tokens > 0 then
      if m.kind = 'base' then
        perform move_tokens(p_user, 'available', tokens, 'mining', m.id::text);
        perform credit_referral(p_user, tokens);
      else
        perform add_earning(p_user, m.kind, 'mine:' || m.id, case when m.kind = 'video' then 'Watch Ads' else 'PTC' end, tokens, m.revenue_eur);
      end if;
    end if;
    total := total + tokens;
  end loop;
  update users set mining_carry = carry where id = p_user;
  return jsonb_build_object('ok', true, 'credited', total);
end $$;

create or replace function mining_settle_all(p_limit int)
returns int language plpgsql set search_path = public as $$
declare
  uid uuid;
  n int := 0;
begin
  for uid in select distinct user_id from mining_sessions where not credited and ends_at <= now() limit p_limit loop
    perform mining_settle(uid);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function mining_status(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  with a as (select * from mining_sessions where user_id = p_user and ends_at > now()),
       base as (select * from a where kind = 'base' order by ends_at desc limit 1)
  select jsonb_build_object(
    'enabled', s.mining_enabled,
    'now', now(),
    'coins_per_sat', coins_per_sat(),
    'hours', s.mining_session_hours,
    'base_ghs', round(s.mining_base_ghs * (level_info(u.xp)->>'mult')::numeric, 2),
    'ptc_ghs', s.mining_ptc_ghs, 'video_ghs', s.mining_video_ghs,
    'sat_per_ths_hour', s.mining_sat_per_ths_hour,
    'power', coalesce((select sum(ghs) from a), 0),
    'base', (select jsonb_build_object('started_at', started_at, 'ends_at', ends_at, 'ghs', ghs) from base),
    'active', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'ghs', ghs, 'started_at', started_at, 'ends_at', ends_at,
        'coins_per_hour', coins_per_hour) order by ends_at) from a), '[]'::jsonb),
    'done_today', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'ghs', ghs, 'ends_at', ends_at, 'tokens', credited_tokens) order by ends_at desc)
        from (select * from mining_sessions where user_id = p_user and credited and ends_at > now() - interval '24 hours' order by ends_at desc limit 50) d), '[]'::jsonb),
    'done_today_tokens', coalesce((select sum(credited_tokens) from mining_sessions where user_id = p_user and credited and ends_at > now() - interval '24 hours'), 0),
    'ads_hour_left', greatest(s.mining_ads_per_hour - (select count(*) from mining_sessions where user_id = p_user and kind in ('ptc', 'video') and started_at > now() - interval '1 hour'), 0),
    'ads_day_left', greatest(s.mining_ads_per_day - (select count(*) from mining_sessions where user_id = p_user and kind in ('ptc', 'video') and started_at > now() - interval '24 hours'), 0))
  from settings s, users u where s.id = 1 and u.id = p_user;
$$;

create or replace function user_earned(p_user uuid)
returns bigint language sql stable set search_path = public as $$
  select coalesce(sum(delta), 0)::bigint from ledger where user_id = p_user and delta > 0
    and source in ('faucet', 'mining', 'daily', 'wheel', 'challenge', 'referral', 'ptc', 'shortlink', 'offer', 'video', 'mines', 'dice', 'tournament', 'achievement', 'promo');
$$;

create or replace function user_streak(p_user uuid)
returns int language sql stable set search_path = public as $$
  with d as (select (at at time zone 'utc')::date as day from claims where user_id = p_user and at > now() - interval '400 days'
             union
             select (started_at at time zone 'utc')::date from mining_sessions where user_id = p_user and kind = 'base' and started_at > now() - interval '400 days'),
       g as (select day, day - (row_number() over (order by day))::int as grp from d)
  select coalesce(case when max(day) >= (now() at time zone 'utc')::date - 1
              then (select count(*) from g g2 where g2.grp = (select grp from g order by day desc limit 1)) else 0 end, 0)::int
  from g;
$$;

create or replace function challenge_progress_since(p_user uuid, p_goal text, p_since timestamptz)
returns bigint language sql stable set search_path = public as $$
  select case p_goal
    when 'claims' then (select count(*) from claims where user_id = p_user and at >= p_since)
    when 'sessions' then (select count(*) from mining_sessions where user_id = p_user and kind = 'base' and started_at >= p_since)
    when 'ads' then (select count(*) from mining_sessions where user_id = p_user and kind in ('ptc', 'video') and started_at >= p_since)
    when 'earned' then (select coalesce(sum(delta), 0) from ledger where user_id = p_user and delta > 0
                          and bucket in ('available', 'pending') and at >= p_since
                          and source in ('faucet', 'mining', 'daily', 'wheel', 'mines', 'dice', 'referral', 'ptc', 'shortlink', 'offer', 'video'))::bigint
    when 'ptc' then (select count(*) from earnings where user_id = p_user and source = 'ptc' and ref not like 'mine:%'
                       and status not in ('rejected', 'reversed') and created_at >= p_since)
                  + (select count(*) from mining_sessions where user_id = p_user and kind = 'ptc' and started_at >= p_since)
    when 'links' then (select count(*) from earnings where user_id = p_user and source = 'shortlink'
                         and status not in ('rejected', 'reversed') and created_at >= p_since)
    else (select count(*) from earnings e join offerwalls o on o.code = e.label
            where e.user_id = p_user and e.source = 'offer' and o.kind = p_goal
              and e.status not in ('rejected', 'reversed') and e.created_at >= p_since)
  end;
$$;

create or replace function achievement_progress(p_user uuid, p_kind text)
returns bigint language sql stable set search_path = public as $$
  select case p_kind
    when 'claims' then (select count(*) from claims where user_id = p_user)
                     + (select count(*) from mining_sessions where user_id = p_user and kind = 'base')
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

create or replace function chat_send(p_user uuid, p_body text, p_flag text, p_ip_hash text)
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
  if not exists (select 1 from claims where user_id = p_user) and not exists (select 1 from mining_sessions where user_id = p_user) then
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

create or replace function ptc_start(p_user uuid, p_id bigint, p_ip_hash text)
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
  blk := mining_ad_block(p_user);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into c from ptc_campaigns where id = p_id and enabled and views < max_views;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if exists (select 1 from ptc_views where campaign_id = p_id and user_id = p_user and day = today and completed_at is not null) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  insert into ptc_views (campaign_id, user_id, day) values (p_id, p_user, today)
  on conflict (campaign_id, user_id, day) do update set started_at = now();
  return jsonb_build_object('ok', true, 'url', c.url, 'duration_seconds', c.duration_seconds, 'kind', c.kind);
end $$;

create or replace function ptc_complete(p_user uuid, p_id bigint, p_ip_hash text)
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
  if (select mining_enabled from settings where id = 1) then
    return mining_add(p_user, 'ptc', 'ptc:' || p_id || ':' || p_user || ':' || today, c.price_eur_per_view);
  end if;
  return add_earning(p_user, 'ptc', p_id || ':' || p_user || ':' || today, c.title, c.reward_tokens, c.price_eur_per_view);
end $$;

create or replace function watch_start(p_user uuid, p_token text, p_ip_hash text)
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
  blk := mining_ad_block(p_user);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  st := watch_status(p_user);
  if (st->>'left')::int < 1 then return jsonb_build_object('ok', false, 'code', 'daily_limit'); end if;
  if (st->>'next_in')::int > 0 then return jsonb_build_object('ok', false, 'code', 'cooldown', 'retry_after', (st->>'next_in')::int); end if;
  insert into watch_views (token, user_id) values (p_token, p_user);
  return jsonb_build_object('ok', true, 'token', p_token, 'seconds', (st->>'seconds')::int);
end $$;

create or replace function watch_complete(p_user uuid, p_token text, p_ip_hash text)
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
  if s.mining_enabled then return mining_add(p_user, 'video', 'video:' || p_token, s.watch_revenue_eur); end if;
  return add_earning(p_user, 'video', p_token, 'Watch Ads',
    floor(s.watch_revenue_eur * s.tokens_per_eur * s.watch_share_percent / 100)::bigint, s.watch_revenue_eur);
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
    'boost_price_tokens', s.boost_price_tokens, 'boost_percent', s.boost_percent, 'boost_hours', s.boost_hours,
    'tournament_prizes', to_jsonb(s.tournament_prizes),
    'ad_slots', s.ad_slots,
    'daily_streak_rewards', to_jsonb(s.daily_streak_rewards),
    'level_max', s.level_max, 'level_mult_percent', s.level_mult_percent,
    'energy_regen', s.energy_regen_seconds, 'energy_max', s.energy_max, 'energy_max_vip', s.energy_max_vip,
    'min_withdraw_tokens', s.min_withdraw_tokens,
    'roll_reveal_seconds', s.roll_reveal_seconds, 'auto_payout', s.auto_payout,
    'mining_enabled', s.mining_enabled, 'mining_hours', s.mining_session_hours, 'mining_base_ghs', s.mining_base_ghs,
    'mining_ptc_ghs', s.mining_ptc_ghs, 'mining_video_ghs', s.mining_video_ghs, 'mining_sat_per_ths_hour', s.mining_sat_per_ths_hour,
    'coins_per_sat', coins_per_sat(),
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
    min_withdraw_tokens = coalesce((p->>'min_withdraw_tokens')::int, min_withdraw_tokens),
    roll_reveal_seconds = coalesce((p->>'roll_reveal_seconds')::int, roll_reveal_seconds),
    mining_enabled = coalesce((p->>'mining_enabled')::boolean, mining_enabled),
    mining_session_hours = coalesce((p->>'mining_session_hours')::numeric, mining_session_hours),
    mining_base_ghs = coalesce((p->>'mining_base_ghs')::numeric, mining_base_ghs),
    mining_ptc_ghs = coalesce((p->>'mining_ptc_ghs')::numeric, mining_ptc_ghs),
    mining_video_ghs = coalesce((p->>'mining_video_ghs')::numeric, mining_video_ghs),
    mining_sat_per_ths_hour = coalesce((p->>'mining_sat_per_ths_hour')::numeric, mining_sat_per_ths_hour),
    mining_ads_per_hour = coalesce((p->>'mining_ads_per_hour')::int, mining_ads_per_hour),
    mining_ads_per_day = coalesce((p->>'mining_ads_per_day')::int, mining_ads_per_day),
    mining_sat_eur = coalesce((p->>'mining_sat_eur')::numeric, mining_sat_eur),
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

-- Seul le serveur (service_role) peut appeler ces fonctions.
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
