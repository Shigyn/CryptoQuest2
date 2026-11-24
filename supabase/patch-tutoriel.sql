-- BitPool : tutoriel de depart (2 sats offerts apres une session et une pub, premier retrait sans minimum).
-- A coller UNE fois dans le SQL Editor du projet snvfovahyugxpqtthfoo, PUIS redeployer les fonctions.
alter table settings add column if not exists tutorial_sats numeric not null default 2 check (tutorial_sats >= 0);
alter table users add column if not exists tutorial_at timestamptz;

create or replace function tutorial_claim(p_user uuid, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  blk text;
  tokens bigint;
begin
  select * into s from settings where id = 1;
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.tutorial_at is not null then return jsonb_build_object('ok', false, 'code', 'already_done'); end if;
  if not exists (select 1 from mining_sessions where user_id = p_user and kind = 'base')
     or not exists (select 1 from mining_sessions where user_id = p_user and kind in ('ptc', 'video')) then
    return jsonb_build_object('ok', false, 'code', 'not_reached');
  end if;
  tokens := ceil(s.tutorial_sats * coins_per_sat())::bigint;
  update users set tutorial_at = now() where id = p_user;
  perform move_tokens(p_user, 'available', tokens, 'tutorial', 'tutorial');
  return jsonb_build_object('ok', true, 'tokens', tokens, 'sats', s.tutorial_sats);
end $$;

create or replace function reserve_withdrawal(p_user uuid, p_kind text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  u users;
  c coins;
  blk text;
  tokens bigint;
  units bigint;
  fee bigint := 0;
  min_tokens int := withdraw_min_tokens();
  new_id uuid;
begin
  select * into u from users where id = p_user for update;
  -- Apres le tutoriel, le tout premier retrait n'a pas de minimum (les sats offerts partent tout de suite).
  if u.tutorial_at is not null and not exists (select 1 from withdrawals where user_id = p_user and status in ('reserved', 'paid', 'unknown')) then
    min_tokens := 1;
  end if;
  select * into s from settings where id = 1;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  if u.fp_address is null then return jsonb_build_object('ok', false, 'code', 'link_faucetpay'); end if;

  select * into c from coins where code = u.payout_coin and enabled and per_eur is not null;
  if not found then return jsonb_build_object('ok', false, 'code', 'coin_unavailable'); end if;

  tokens := case when p_kind = 'instant' then u.available else u.validated end;
  if tokens <= 0 then return jsonb_build_object('ok', false, 'code', 'nothing_to_withdraw'); end if;
  if tokens < min_tokens then
    return jsonb_build_object('ok', false, 'code', 'below_minimum', 'min', min_tokens);
  end if;

  units := floor(tokens::numeric / s.tokens_per_eur * c.per_eur * power(10::numeric, c.decimals));
  -- Frais de transfert a la charge du membre (en sats, donc seulement sur le BTC).
  if c.code = 'BTC' then fee := ceil(s.withdraw_fee_sats)::bigint; end if;
  units := units - fee;
  if units <= 0 then return jsonb_build_object('ok', false, 'code', 'amount_too_small'); end if;

  if c.last_balance_units is not null and c.last_balance_units < units
     and c.last_balance_at > now() - interval '5 minutes' then
    return jsonb_build_object('ok', false, 'code', 'coin_empty');
  end if;
  if payout_cap_reached(tokens) then return jsonb_build_object('ok', false, 'code', 'paused', 'tripped', true); end if;

  insert into withdrawals (user_id, kind, tokens, coin, amount_units, to_address, fee_units)
  values (p_user, p_kind, tokens, c.code, units, u.fp_address, fee) returning id into new_id;

  if p_kind = 'instant' then
    perform move_tokens(p_user, 'available', -tokens, 'withdrawal', new_id::text);
  else
    perform move_tokens(p_user, 'validated', -tokens, 'withdrawal', new_id::text);
    update earnings set status = 'paying', withdrawal_id = new_id where user_id = p_user and status = 'validated';
  end if;
  return jsonb_build_object('ok', true, 'id', new_id, 'tokens', tokens, 'coin', c.code, 'amount_units', units,
    'decimals', c.decimals, 'to', u.fp_address, 'fee_units', fee);
end $$;

create or replace function user_profile(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'ref_code', u.ref_code, 'secured', u.password_hash is not null, 'pseudo', u.pseudo,
    'tutorial', jsonb_build_object('done', u.tutorial_at is not null, 'sats', s.tutorial_sats,
      'base', exists (select 1 from mining_sessions m where m.user_id = u.id and m.kind = 'base'),
      'ad', exists (select 1 from mining_sessions m where m.user_id = u.id and m.kind in ('ptc', 'video')),
      'withdrawn', exists (select 1 from withdrawals w where w.user_id = u.id and w.status in ('reserved', 'paid', 'unknown'))),
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
                    'decimals', co.decimals, 'status', wd.status, 'payout_id', wd.payout_id, 'kind', wd.kind, 'fee_units', wd.fee_units) w
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
    min_withdraw_tokens = coalesce((p->>'min_withdraw_tokens')::int, min_withdraw_tokens),
    min_withdraw_sats = coalesce((p->>'min_withdraw_sats')::numeric, min_withdraw_sats),
    withdraw_fee_sats = coalesce((p->>'withdraw_fee_sats')::numeric, withdraw_fee_sats),
    tutorial_sats = coalesce((p->>'tutorial_sats')::numeric, tutorial_sats),
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

revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
