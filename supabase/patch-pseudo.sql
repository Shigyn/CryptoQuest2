-- BitPool : pseudo public (chat obligatoire, gains en direct). A coller UNE fois dans le SQL Editor du projet snvfovahyugxpqtthfoo.
alter table users add column if not exists pseudo text;
create unique index if not exists users_pseudo_idx on users (lower(pseudo));

create or replace function public_who(p_pseudo text, p_addr text)
returns text language sql immutable set search_path = public as $$
  select coalesce(p_pseudo, case when length(p_addr) >= 10 then left(p_addr, 3) || '…' || right(p_addr, 3) else '…' end);
$$;

create or replace function set_pseudo(p_user uuid, p_name text)
returns jsonb language plpgsql set search_path = public as $$
declare
  n text := trim(coalesce(p_name, ''));
begin
  if n !~ '^[A-Za-z0-9_.-]{3,16}$' then return jsonb_build_object('ok', false, 'code', 'bad_pseudo'); end if;
  if exists (select 1 from users where lower(pseudo) = lower(n) and id <> p_user) then
    return jsonb_build_object('ok', false, 'code', 'pseudo_taken');
  end if;
  update users set pseudo = n where id = p_user;
  return jsonb_build_object('ok', true, 'pseudo', n);
end $$;

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
  if u.pseudo is null then return jsonb_build_object('ok', false, 'code', 'need_pseudo'); end if;
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

create or replace function chat_list(p_user uuid, p_after bigint)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(m order by (m->>'id')::bigint), '[]'::jsonb) from (
    select jsonb_build_object('id', c.id, 'at', c.at, 'body', c.body, 'me', c.user_id = p_user,
      'who', public_who(u.pseudo, u.fp_address),
      'level', (level_info(u.xp)->>'level')::int, 'vip', coalesce(u.vip_until > now(), false),
      'frame', u.frame, 'name_color', u.name_color, 'title', u.title) as m
    from chat_messages c join users u on u.id = c.user_id
    where not c.hidden and not u.banned and c.id > coalesce(p_after, 0)
    order by c.id desc limit 50) x;
$$;

create or replace function public_proofs()
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('at', w.finished_at, 'coin', w.coin, 'amount_units', w.amount_units,
      'decimals', c.decimals, 'tokens', w.tokens, 'payout_id', w.payout_id,
      'who', public_who(u.pseudo, w.to_address))
      order by w.finished_at desc), '[]'::jsonb)
  from (select * from withdrawals where status = 'paid' order by finished_at desc limit 100) w join coins c on c.code = w.coin
  join users u on u.id = w.user_id;
$$;

create or replace function user_profile(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'ref_code', u.ref_code, 'secured', u.password_hash is not null, 'pseudo', u.pseudo,
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
          'who', public_who(u.pseudo, u.fp_address)) as f
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
          'who', public_who(u.pseudo, w.to_address)) as r
        from withdrawals w join coins c on c.code = w.coin join users u on u.id = w.user_id
        where w.status = 'paid' order by w.finished_at desc limit 10) x), '[]'::jsonb)
  ) from settings s where s.id = 1;
$$;

revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
