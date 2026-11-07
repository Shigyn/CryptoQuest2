-- Sondages a part et quetes par objectif. A coller dans Supabase > SQL Editor, une seule fois.
-- Ne touche a aucun solde ; rejouable sans risque.

alter table offerwalls add column if not exists kind text not null default 'offers' check (kind in ('offers', 'surveys'));
alter table challenges add column if not exists goal text not null default 'claims'
  check (goal in ('claims', 'earned', 'ptc', 'links', 'surveys', 'offers'));

insert into challenges (name, goal, target_claims, reward_tokens)
select v.name, v.goal, v.target, v.reward from (values
  ('100 Coins gagnés', 'earned', 100, 3), ('1 000 Coins gagnés', 'earned', 1000, 25), ('10 000 Coins gagnés', 'earned', 10000, 200),
  ('5 pubs', 'ptc', 5, 5), ('3 liens', 'links', 3, 10),
  ('1 sondage', 'surveys', 1, 20), ('3 sondages', 'surveys', 3, 80),
  ('1 offre', 'offers', 1, 20), ('3 offres', 'offers', 3, 80)) as v(name, goal, target, reward)
where not exists (select 1 from challenges c where c.goal = v.goal and c.target_claims = v.target);

create or replace function challenge_progress(p_user uuid, p_goal text)
returns bigint language sql stable set search_path = public as $$
  select case p_goal
    when 'claims' then (select count(*) from claims where user_id = p_user and (at at time zone 'utc')::date = (now() at time zone 'utc')::date)
    -- Coins gagnes : gains bruts du jour, hors recompenses de quetes, remboursements et validations.
    when 'earned' then (select coalesce(sum(delta), 0) from ledger where user_id = p_user and delta > 0
                          and bucket in ('available', 'pending') and (at at time zone 'utc')::date = (now() at time zone 'utc')::date
                          and source in ('faucet', 'daily', 'wheel', 'mines', 'dice', 'referral', 'ptc', 'shortlink', 'offer'))::bigint
    when 'ptc' then (select count(*) from earnings where user_id = p_user and source = 'ptc'
                       and status not in ('rejected', 'reversed') and (created_at at time zone 'utc')::date = (now() at time zone 'utc')::date)
    when 'links' then (select count(*) from earnings where user_id = p_user and source = 'shortlink'
                         and status not in ('rejected', 'reversed') and (created_at at time zone 'utc')::date = (now() at time zone 'utc')::date)
    else (select count(*) from earnings e join offerwalls o on o.code = e.label
            where e.user_id = p_user and e.source = 'offer' and o.kind = p_goal
              and e.status not in ('rejected', 'reversed') and (e.created_at at time zone 'utc')::date = (now() at time zone 'utc')::date)
  end;
$$;

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
  perform move_tokens(p_user, 'available', c.reward_tokens, 'challenge', p_id::text);
  return jsonb_build_object('ok', true, 'tokens', c.reward_tokens);
end $$;

create or replace function offerwall_list()
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'iframe_url', iframe_url, 'kind', kind) order by code), '[]'::jsonb)
  from offerwalls where enabled;
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

create or replace function admin_save_offerwall(p jsonb)
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
      kind = coalesce(nullif(p->>'kind', ''), kind) where code = p->>'code';
  end if;
end $$;

create or replace function admin_save_challenge(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p->>'id' is null then
    insert into challenges (name, goal, target_claims, reward_tokens)
    values (coalesce(nullif(p->>'name', ''), coalesce(p->>'goal', 'claims') || ' ' || (p->>'target_claims')),
      coalesce(nullif(p->>'goal', ''), 'claims'), (p->>'target_claims')::int, (p->>'reward_tokens')::int);
  else
    update challenges set enabled = coalesce((p->>'enabled')::boolean, enabled) where id = (p->>'id')::bigint;
  end if;
end $$;

-- Seul le serveur (service_role) peut appeler ces fonctions.
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
