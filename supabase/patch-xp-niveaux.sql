-- Systeme d XP : 1 tirage = 1 XP, paliers 50 puis +100 par niveau, x1,02 par niveau sur tous les gains du tirage sauf le jackpot (niveau 50 max).
-- A coller dans Supabase > SQL Editor (projet du faucet), une seule fois. Rejouable sans risque.
-- L'XP de depart de chaque membre = le nombre de tirages qu'il a deja faits.

alter table settings add column if not exists level_xp_first int not null default 50 check (level_xp_first >= 1);
alter table settings add column if not exists level_xp_step int not null default 100 check (level_xp_step >= 1);
alter table settings add column if not exists level_max int not null default 50 check (level_max between 2 and 200);
alter table settings add column if not exists level_mult_percent numeric not null default 2 check (level_mult_percent between 0 and 20);
alter table users add column if not exists xp bigint not null default 0;
alter table users add column if not exists faucet_carry numeric not null default 0;
update users u set xp = (select count(*) from claims c where c.user_id = u.id) where xp = 0;

-- Le succes « Niveau 100 » devient « Niveau 40 » (le niveau maximum est 50).
update achievements set enabled = false where code = 'level_100';
insert into achievements (code, name, name_en, kind, target, reward_tokens, sort)
values ('level_40', 'Niveau 40', 'Level 40', 'level', 40, 1500, 23) on conflict (code) do nothing;

create or replace function level_info(p_xp bigint)
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

create or replace function faucet_claim(p_user uuid, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  roll int;
  reward int;
  s settings;
  u users;
  blk text;
  last_at timestamptz;
  exact numeric;
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
  -- Fenetre : au plus N tirages sur la periode ; on rouvre quand le plus ancien en sort.
  select count(*), min(at) into n, last_at from (
    select at from claims where at > now() - make_interval(secs => s.claims_window_seconds)
      and (user_id = p_user or ip_hash = p_ip_hash) order by at desc limit s.claims_window_count) w;
  if n >= s.claims_window_count then
    return jsonb_build_object('ok', false, 'code', 'cooldown', 'retry_after',
      ceil(extract(epoch from last_at + make_interval(secs => s.claims_window_seconds) - now()))::int);
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
  update users set xp = xp + 1 where id = p_user;
  insert into claims (user_id, ip_hash, tokens) values (p_user, p_ip_hash, reward);
  perform move_tokens(p_user, 'available', reward, 'faucet', roll::text);
  perform credit_referral(p_user, reward);
  return jsonb_build_object('ok', true, 'tokens', reward, 'roll', roll,
    'available', u.available + reward, 'cooldown_seconds', s.cooldown_seconds,
    'level', (level_info(u.xp + 1)->>'level')::int,
    'level_up', (level_info(u.xp + 1)->>'level')::int > (level_info(u.xp)->>'level')::int);
end $$;

create or replace function achievement_progress(p_user uuid, p_kind text)
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
      coalesce((select case when count(*) >= s.claims_window_count
                       then ceil(extract(epoch from min(at) + make_interval(secs => s.claims_window_seconds) - now()))::int end
                from (select at from claims where user_id = u.id and at > now() - make_interval(secs => s.claims_window_seconds)
                      order by at desc limit s.claims_window_count) w), 0), 0),
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
