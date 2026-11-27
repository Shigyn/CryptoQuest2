-- BitPool : fil d'activite reelle (sessions, retraits, quetes, nouveaux membres) dans le bandeau et le bloc En direct.
-- A coller dans le SQL Editor du projet snvfovahyugxpqtthfoo. Rien a redeployer.

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
    'min_withdraw_tokens', withdraw_min_tokens(), 'min_withdraw_sats', s.min_withdraw_sats, 'withdraw_fee_sats', s.withdraw_fee_sats,
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
    -- Fil d'activite reelle (jamais d'evenement invente) : sessions, retraits, quetes, nouveaux membres.
    'activity', coalesce((select jsonb_agg(a) from (select a from (
        (select jsonb_build_object('t', m.kind, 'at', m.started_at, 'ghs', m.ghs, 'who', public_who(u.pseudo, u.fp_address)) as a
           from mining_sessions m join users u on u.id = m.user_id where not u.banned order by m.started_at desc limit 12)
        union all
        (select jsonb_build_object('t', 'wd', 'at', w.finished_at, 'tokens', w.tokens, 'who', public_who(u.pseudo, w.to_address))
           from withdrawals w join users u on u.id = w.user_id where w.status = 'paid' order by w.finished_at desc limit 8)
        union all
        (select jsonb_build_object('t', 'quest', 'at', l.at, 'who', public_who(u.pseudo, u.fp_address))
           from ledger l join users u on u.id = l.user_id where l.source = 'challenge' and l.delta > 0 and not u.banned order by l.at desc limit 6)
        union all
        (select jsonb_build_object('t', 'join', 'at', u.created_at, 'who', public_who(u.pseudo, u.fp_address))
           from users u where not u.banned order by u.created_at desc limit 6)
      ) y order by (a->>'at') desc limit 20) z), '[]'::jsonb),
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
