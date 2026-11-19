-- Refonte du site : succes, serie de 7 jours, codes promo, notifications, support, parrainage detaille,
-- preuves, emplacements pub, formats PTC, quetes de la semaine, bonus de niveau.
-- A coller dans Supabase > SQL Editor (projet du faucet), une seule fois. Ne touche a aucun solde ; rejouable.

alter table settings add column if not exists ad_slots jsonb not null default '{}';
alter table settings add column if not exists daily_streak_rewards int[] not null default '{5,6,8,10,12,15,25}';
alter table settings add column if not exists level_bonus_every int not null default 10;
alter table settings add column if not exists level_bonus_max int not null default 3;
alter table users add column if not exists daily_streak int not null default 0;
alter table users add column if not exists notif_seen_at timestamptz;
alter table ptc_campaigns add column if not exists kind text not null default 'window' check (kind in ('window', 'iframe', 'video'));
alter table ad_orders add column if not exists kind text not null default 'window' check (kind in ('window', 'iframe', 'video'));
alter table offerwalls add column if not exists bonus_percent numeric not null default 0 check (bonus_percent between 0 and 200);
alter table challenges add column if not exists period text not null default 'day' check (period in ('day', 'week'));

-- Refonte : succes, codes promo, notifications, support, compteur de pubs.
create table if not exists achievements (
  code text primary key,
  name text not null,
  name_en text not null,
  -- claims, streak, level, ptc, links, surveys, offers, referrals, withdrawals, quests
  kind text not null,
  target int not null check (target >= 1),
  reward_tokens int not null check (reward_tokens >= 0),
  sort int not null default 100,
  enabled boolean not null default true
);
insert into achievements (code, name, name_en, kind, target, reward_tokens, sort) values
  ('claims_1', 'Premier tirage', 'First roll', 'claims', 1, 5, 1),
  ('claims_100', '100 tirages', '100 rolls', 'claims', 100, 20, 2),
  ('claims_1000', '1 000 tirages', '1,000 rolls', 'claims', 1000, 100, 3),
  ('claims_10000', '10 000 tirages', '10,000 rolls', 'claims', 10000, 500, 4),
  ('streak_7', 'Une semaine sans faute', 'One full week', 'streak', 7, 50, 10),
  ('streak_30', 'Un mois sans faute', 'One full month', 'streak', 30, 200, 11),
  ('streak_100', '100 jours de suite', '100-day streak', 'streak', 100, 1000, 12),
  ('level_10', 'Niveau 10', 'Level 10', 'level', 10, 50, 20),
  ('level_25', 'Niveau 25', 'Level 25', 'level', 25, 150, 21),
  ('level_50', 'Niveau 50', 'Level 50', 'level', 50, 400, 22),
  ('level_100', 'Niveau 100', 'Level 100', 'level', 100, 1500, 23),
  ('ptc_10', '10 pubs vues', '10 ads watched', 'ptc', 10, 20, 30),
  ('ptc_100', '100 pubs vues', '100 ads watched', 'ptc', 100, 100, 31),
  ('links_10', '10 liens passés', '10 links done', 'links', 10, 30, 40),
  ('links_100', '100 liens passés', '100 links done', 'links', 100, 150, 41),
  ('surveys_1', 'Premier sondage', 'First survey', 'surveys', 1, 20, 50),
  ('surveys_25', '25 sondages', '25 surveys', 'surveys', 25, 200, 51),
  ('surveys_100', '100 sondages', '100 surveys', 'surveys', 100, 800, 52),
  ('offers_1', 'Première offre', 'First offer', 'offers', 1, 20, 60),
  ('offers_25', '25 offres', '25 offers', 'offers', 25, 300, 61),
  ('referrals_1', 'Premier filleul actif', 'First active referral', 'referrals', 1, 50, 70),
  ('referrals_10', '10 filleuls actifs', '10 active referrals', 'referrals', 10, 300, 71),
  ('referrals_50', '50 filleuls actifs', '50 active referrals', 'referrals', 50, 1500, 72),
  ('withdrawals_1', 'Premier retrait', 'First withdrawal', 'withdrawals', 1, 20, 80),
  ('withdrawals_10', '10 retraits', '10 withdrawals', 'withdrawals', 10, 100, 81),
  ('quests_10', '10 quêtes', '10 quests', 'quests', 10, 50, 90),
  ('quests_100', '100 quêtes', '100 quests', 'quests', 100, 300, 91)
on conflict (code) do nothing;
create table if not exists user_achievements (
  user_id uuid not null references users (id),
  code text not null references achievements (code),
  at timestamptz not null default now(),
  primary key (user_id, code)
);

create table if not exists promo_codes (
  code text primary key,
  tokens int not null check (tokens > 0),
  max_uses int not null default 100 check (max_uses >= 1),
  uses int not null default 0,
  expires_at timestamptz,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists promo_redemptions (
  code text not null references promo_codes (code),
  user_id uuid not null references users (id),
  at timestamptz not null default now(),
  primary key (code, user_id)
);

-- user_id vide : annonce pour tout le monde.
create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id uuid references users (id),
  at timestamptz not null default now(),
  kind text not null,
  text text not null,
  text_en text,
  link text
);
create index if not exists notifications_user_idx on notifications (user_id, at desc);

create table if not exists tickets (
  id bigint generated always as identity primary key,
  user_id uuid not null references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subject text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed'))
);
create table if not exists ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references tickets (id),
  at timestamptz not null default now(),
  from_admin boolean not null default false,
  body text not null
);
create index if not exists ticket_messages_idx on ticket_messages (ticket_id, at);

create table if not exists ad_impressions (
  day date not null default (now() at time zone 'utc')::date,
  slot text not null,
  n bigint not null default 0,
  primary key (day, slot)
);

alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;
alter table notifications enable row level security;
alter table tickets enable row level security;
alter table ticket_messages enable row level security;
alter table ad_impressions enable row level security;

insert into challenges (name, goal, period, target_claims, reward_tokens)
select v.* from (values
  ('150 tirages cette semaine', 'claims', 'week', 150, 30), ('20 000 Coins cette semaine', 'earned', 'week', 20000, 300),
  ('30 pubs cette semaine', 'ptc', 'week', 30, 40), ('15 liens cette semaine', 'links', 'week', 15, 60),
  ('10 sondages cette semaine', 'surveys', 'week', 10, 200)) as v(name, goal, period, target, reward)
where not exists (select 1 from challenges c where c.period = 'week' and c.goal = v.goal);

-- Anciennes signatures remplacees (un parametre de format en plus).
drop function if exists create_ad_order(uuid, text, text, int, int);
drop function if exists ad_buy_with_tokens(uuid, text, text, int, int, text);

create or replace function user_earned(p_user uuid)
returns bigint language sql stable set search_path = public as $$
  select coalesce(sum(delta), 0)::bigint from ledger where user_id = p_user and delta > 0
    and source in ('faucet', 'daily', 'wheel', 'challenge', 'referral', 'ptc', 'shortlink', 'offer', 'mines', 'dice', 'tournament', 'achievement', 'promo');
$$;

create or replace function user_streak(p_user uuid)
returns int language sql stable set search_path = public as $$
  with d as (select distinct (at at time zone 'utc')::date as day from claims
             where user_id = p_user and at > now() - interval '400 days'),
       g as (select day, day - (row_number() over (order by day))::int as grp from d)
  select coalesce(case when max(day) >= (now() at time zone 'utc')::date - 1
              then (select count(*) from g g2 where g2.grp = (select grp from g order by day desc limit 1)) else 0 end, 0)::int
  from g;
$$;

create or replace function challenge_progress_since(p_user uuid, p_goal text, p_since timestamptz)
returns bigint language sql stable set search_path = public as $$
  select case p_goal
    when 'claims' then (select count(*) from claims where user_id = p_user and at >= p_since)
    when 'earned' then (select coalesce(sum(delta), 0) from ledger where user_id = p_user and delta > 0
                          and bucket in ('available', 'pending') and at >= p_since
                          and source in ('faucet', 'daily', 'wheel', 'mines', 'dice', 'referral', 'ptc', 'shortlink', 'offer'))::bigint
    when 'ptc' then (select count(*) from earnings where user_id = p_user and source = 'ptc'
                       and status not in ('rejected', 'reversed') and created_at >= p_since)
    when 'links' then (select count(*) from earnings where user_id = p_user and source = 'shortlink'
                         and status not in ('rejected', 'reversed') and created_at >= p_since)
    else (select count(*) from earnings e join offerwalls o on o.code = e.label
            where e.user_id = p_user and e.source = 'offer' and o.kind = p_goal
              and e.status not in ('rejected', 'reversed') and e.created_at >= p_since)
  end;
$$;

create or replace function period_start(p_period text)
returns timestamptz language sql stable as $$
  select case when p_period = 'week' then date_trunc('week', now() at time zone 'utc') at time zone 'utc'
              else date_trunc('day', now() at time zone 'utc') at time zone 'utc' end;
$$;

create or replace function challenge_progress(p_user uuid, p_goal text)
returns bigint language sql stable set search_path = public as $$
  select challenge_progress_since(p_user, p_goal, period_start('day'));
$$;

create or replace function achievement_progress(p_user uuid, p_kind text)
returns bigint language sql stable set search_path = public as $$
  select case p_kind
    when 'claims' then (select count(*) from claims where user_id = p_user)
    when 'streak' then user_streak(p_user)::bigint
    when 'level' then (floor(sqrt(greatest(user_earned(p_user), 0) / 20.0)) + 1)::bigint
    when 'ptc' then (select count(*) from earnings where user_id = p_user and source = 'ptc' and status not in ('rejected', 'reversed'))
    when 'links' then (select count(*) from earnings where user_id = p_user and source = 'shortlink' and status not in ('rejected', 'reversed'))
    when 'referrals' then (select count(*) from users r where r.referrer_id = p_user and exists (select 1 from claims c where c.user_id = r.id))
    when 'withdrawals' then (select count(*) from withdrawals where user_id = p_user and status = 'paid')
    when 'quests' then (select count(*) from challenge_done where user_id = p_user)
    else (select count(*) from earnings e join offerwalls o on o.code = e.label
            where e.user_id = p_user and e.source = 'offer' and o.kind = p_kind and e.status not in ('rejected', 'reversed'))
  end;
$$;

create or replace function achievements_list(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  with k as (select distinct kind from achievements where enabled),
       p as (select kind, achievement_progress(p_user, kind) as v from k)
  select coalesce(jsonb_agg(jsonb_build_object('code', a.code, 'name', a.name, 'name_en', a.name_en, 'kind', a.kind,
      'target', a.target, 'reward_tokens', a.reward_tokens, 'progress', least(p.v, a.target),
      'done', exists (select 1 from user_achievements x where x.user_id = p_user and x.code = a.code))
      order by a.sort, a.target), '[]'::jsonb)
  from achievements a join p on p.kind = a.kind where a.enabled;
$$;

create or replace function claim_achievement(p_user uuid, p_code text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  a achievements;
  blk text;
begin
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into a from achievements where code = p_code and enabled;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if exists (select 1 from user_achievements where user_id = p_user and code = p_code) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  if achievement_progress(p_user, a.kind) < a.target then return jsonb_build_object('ok', false, 'code', 'not_reached'); end if;
  insert into user_achievements (user_id, code) values (p_user, p_code);
  perform move_tokens(p_user, 'available', a.reward_tokens, 'achievement', p_code);
  return jsonb_build_object('ok', true, 'tokens', a.reward_tokens);
end $$;

create or replace function redeem_promo(p_user uuid, p_code text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  c promo_codes;
  blk text;
begin
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  select * into c from promo_codes where code = upper(trim(p_code)) for update;
  if not found or not c.enabled or (c.expires_at is not null and c.expires_at < now()) then
    return jsonb_build_object('ok', false, 'code', 'promo_invalid');
  end if;
  if c.uses >= c.max_uses then return jsonb_build_object('ok', false, 'code', 'promo_used_up'); end if;
  if exists (select 1 from promo_redemptions where code = c.code and user_id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  insert into promo_redemptions (code, user_id) values (c.code, p_user);
  update promo_codes set uses = uses + 1 where code = c.code;
  perform move_tokens(p_user, 'available', c.tokens, 'promo', c.code);
  return jsonb_build_object('ok', true, 'tokens', c.tokens);
end $$;

create or replace function admin_save_promo(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p ? 'tokens' then
    insert into promo_codes (code, tokens, max_uses, expires_at)
    values (upper(trim(p->>'code')), (p->>'tokens')::int, coalesce((p->>'max_uses')::int, 100), nullif(p->>'expires_at', '')::timestamptz)
    on conflict (code) do update set tokens = excluded.tokens, max_uses = excluded.max_uses, expires_at = excluded.expires_at;
  else
    update promo_codes set enabled = coalesce((p->>'enabled')::boolean, enabled) where code = upper(trim(p->>'code'));
  end if;
end $$;

create or replace function notify(p_user uuid, p_kind text, p_text text, p_text_en text, p_link text)
returns void language sql set search_path = public as $$
  insert into notifications (user_id, kind, text, text_en, link) values (p_user, p_kind, p_text, p_text_en, p_link);
$$;

create or replace function list_notifications(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'at', n.at, 'kind', n.kind, 'text', n.text, 'text_en', n.text_en,
      'link', n.link, 'unread', n.at > coalesce(u.notif_seen_at, '-infinity'::timestamptz)) order by n.at desc), '[]'::jsonb)
  from users u
  join lateral (select * from notifications where (user_id = u.id or user_id is null) and at > u.created_at - interval '7 days'
                order by at desc limit 30) n on true
  where u.id = p_user;
$$;

create or replace function read_notifications(p_user uuid)
returns jsonb language sql set search_path = public as $$
  update users set notif_seen_at = now() where id = p_user;
  select jsonb_build_object('ok', true);
$$;

create or replace function admin_announce(p jsonb)
returns void language sql set search_path = public as $$
  insert into notifications (user_id, kind, text, text_en, link)
  values (null, 'announce', p->>'text', nullif(p->>'text_en', ''), nullif(p->>'link', ''));
$$;

create or replace function ticket_create(p_user uuid, p_subject text, p_body text)
returns jsonb language plpgsql set search_path = public as $$
declare
  tid bigint;
begin
  if length(trim(coalesce(p_subject, ''))) not between 3 and 120 or length(trim(coalesce(p_body, ''))) not between 5 and 4000 then
    return jsonb_build_object('ok', false, 'code', 'bad_request');
  end if;
  if (select count(*) from tickets where user_id = p_user and status = 'open') >= 3 then
    return jsonb_build_object('ok', false, 'code', 'too_many_tickets');
  end if;
  insert into tickets (user_id, subject) values (p_user, trim(p_subject)) returning id into tid;
  insert into ticket_messages (ticket_id, body) values (tid, trim(p_body));
  return jsonb_build_object('ok', true, 'id', tid);
end $$;

create or replace function ticket_reply(p_user uuid, p_id bigint, p_body text)
returns jsonb language plpgsql set search_path = public as $$
begin
  if length(trim(coalesce(p_body, ''))) not between 1 and 4000 then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  if not exists (select 1 from tickets where id = p_id and user_id = p_user and status <> 'closed') then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  insert into ticket_messages (ticket_id, body) values (p_id, trim(p_body));
  update tickets set status = 'open', updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function ticket_list(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'subject', t.subject, 'status', t.status, 'updated_at', t.updated_at,
      'messages', (select jsonb_agg(jsonb_build_object('at', m.at, 'admin', m.from_admin, 'body', m.body) order by m.at)
                   from ticket_messages m where m.ticket_id = t.id)) order by t.updated_at desc), '[]'::jsonb)
  from tickets t where t.user_id = p_user;
$$;

create or replace function admin_tickets(p_status text)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'subject', t.subject, 'status', t.status, 'updated_at', t.updated_at,
      'member', u.fp_address,
      'messages', (select jsonb_agg(jsonb_build_object('at', m.at, 'admin', m.from_admin, 'body', m.body) order by m.at)
                   from ticket_messages m where m.ticket_id = t.id)) order by t.updated_at desc), '[]'::jsonb)
  from tickets t join users u on u.id = t.user_id
  where p_status is null or p_status = '' or t.status = p_status;
$$;

create or replace function admin_ticket_reply(p_id bigint, p_body text, p_close boolean)
returns void language plpgsql set search_path = public as $$
declare
  uid uuid;
begin
  select user_id into uid from tickets where id = p_id;
  if uid is null then return; end if;
  if length(trim(coalesce(p_body, ''))) > 0 then
    insert into ticket_messages (ticket_id, from_admin, body) values (p_id, true, trim(p_body));
    perform notify(uid, 'ticket', 'Le support a répondu à ta demande.', 'Support replied to your ticket.', '#support');
  end if;
  update tickets set status = case when p_close then 'closed' else 'answered' end, updated_at = now() where id = p_id;
end $$;

create or replace function referral_list(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'who', case when length(r.fp_address) >= 10 then left(r.fp_address, 3) || '…' || right(r.fp_address, 3) else '…' end,
      'since', r.created_at,
      'active', exists (select 1 from claims c where c.user_id = r.id and c.at > now() - interval '7 days'),
      'earned', (select coalesce(sum(delta), 0) from ledger l where l.user_id = p_user and l.source = 'referral' and l.ref = r.id::text))
      order by r.created_at desc), '[]'::jsonb)
  from (select * from users where referrer_id = p_user order by created_at desc limit 200) r;
$$;

create or replace function my_history(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('at', at, 'source', source, 'bucket', bucket, 'delta', delta) order by at desc, id desc), '[]'::jsonb)
  from (select * from ledger where user_id = p_user order by at desc, id desc limit 500) x;
$$;

create or replace function my_offers(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('at', e.created_at, 'wall', coalesce(o.name, e.label), 'kind', coalesce(o.kind, 'offers'),
      'tokens', e.tokens, 'status', e.status) order by e.created_at desc), '[]'::jsonb)
  from (select * from earnings where user_id = p_user and source = 'offer' order by created_at desc limit 50) e
  left join offerwalls o on o.code = e.label;
$$;

create or replace function public_proofs()
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('at', w.finished_at, 'coin', w.coin, 'amount_units', w.amount_units,
      'decimals', c.decimals, 'tokens', w.tokens, 'payout_id', w.payout_id,
      'who', case when length(w.to_address) >= 10 then left(w.to_address, 3) || '…' || right(w.to_address, 3) else '…' end)
      order by w.finished_at desc), '[]'::jsonb)
  from (select * from withdrawals where status = 'paid' order by finished_at desc limit 100) w join coins c on c.code = w.coin;
$$;

create or replace function ad_seen(p_slots text[])
returns void language sql set search_path = public as $$
  insert into ad_impressions (slot, n)
  select s, count(*) from unnest(p_slots[1:20]) s where s ~ '^[a-z_]{2,24}$' group by s
  on conflict (day, slot) do update set n = ad_impressions.n + excluded.n;
$$;

create or replace function ad_toggle(p_user uuid, p_id bigint, p_enabled boolean)
returns jsonb language plpgsql set search_path = public as $$
begin
  update ptc_campaigns set enabled = p_enabled
  where id = p_id and advertiser_id = p_user and not needs_review and (views < max_views or not p_enabled);
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_save_ads(p jsonb)
returns void language sql set search_path = public as $$
  update settings set ad_slots = case when jsonb_typeof(p) = 'object' then p else ad_slots end, updated_at = now() where id = 1;
$$;

create or replace function faucet_claim(p_user uuid, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  roll int;
  reward int;
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
  if reward = s.faucet_reward_tokens then
    reward := reward + least(s.level_bonus_max, floor((floor(sqrt(greatest(user_earned(p_user), 0) / 20.0))) / s.level_bonus_every))::int;
  end if;
  insert into claims (user_id, ip_hash, tokens) values (p_user, p_ip_hash, reward);
  perform move_tokens(p_user, 'available', reward, 'faucet', roll::text);
  perform credit_referral(p_user, reward);
  return jsonb_build_object('ok', true, 'tokens', reward, 'roll', roll,
    'available', u.available + reward, 'cooldown_seconds', s.cooldown_seconds);
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
  n := case when u.last_daily_day = today - 1 then u.daily_streak + 1 else 1 end;
  update users set last_daily_day = today, daily_streak = n where id = p_user;
  n := s.daily_streak_rewards[((n - 1) % cardinality(s.daily_streak_rewards)) + 1];
  n := n + floor(n * boost_percent(u) / 100);
  perform move_tokens(p_user, 'available', n, 'daily', today::text);
  return jsonb_build_object('ok', true, 'tokens', n, 'streak', (select daily_streak from users where id = p_user));
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
  today := (period_start(c.period) at time zone 'utc')::date;
  if exists (select 1 from challenge_done where challenge_id = p_id and user_id = p_user and day = today) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  n := challenge_progress_since(p_user, c.goal, period_start(c.period));
  if n < c.target_claims then return jsonb_build_object('ok', false, 'code', 'not_reached'); end if;
  insert into challenge_done (challenge_id, user_id, day) values (p_id, p_user, today);
  n := c.reward_tokens + floor(c.reward_tokens * boost_percent(u) / 100);
  perform move_tokens(p_user, 'available', n, 'challenge', p_id::text);
  return jsonb_build_object('ok', true, 'tokens', n);
end $$;

create or replace function admin_save_challenge(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p->>'id' is null then
    insert into challenges (name, goal, period, target_claims, reward_tokens)
    values (coalesce(nullif(p->>'name', ''), coalesce(p->>'goal', 'claims') || ' ' || (p->>'target_claims')),
      coalesce(nullif(p->>'goal', ''), 'claims'), coalesce(nullif(p->>'period', ''), 'day'), (p->>'target_claims')::int, (p->>'reward_tokens')::int);
  else
    update challenges set enabled = coalesce((p->>'enabled')::boolean, enabled) where id = (p->>'id')::bigint;
  end if;
end $$;

create or replace function offer_postback(p_code text, p_tx text, p_ref_code text, p_usd numeric)
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
    floor(eur * s.tokens_per_eur * s.offer_share_percent / 100
      * (1 + coalesce((select bonus_percent from offerwalls where code = p_code), 0) / 100))::bigint, eur);
end $$;

create or replace function admin_validate_earnings(p_ids bigint[], p_all_clean boolean)
returns jsonb language plpgsql set search_path = public as $$
declare
  e earnings;
  n int := 0;
  done bigint[] := '{}';
begin
  for e in select * from earnings where status = 'pending'
             and ((p_all_clean and risk is null) or id = any (coalesce(p_ids, '{}'))) for update loop
    perform move_tokens(e.user_id, 'pending', -e.tokens, 'validation', e.id::text);
    perform move_tokens(e.user_id, 'validated', e.tokens, 'validation', e.id::text);
    perform credit_referral(e.user_id, e.tokens);
    update earnings set status = 'validated' where id = e.id;
    done := done || e.id;
    n := n + 1;
  end loop;
  insert into notifications (user_id, kind, text, text_en, link)
  select user_id, 'validated', sum(tokens) || ' Coins validés : ils partent au prochain paiement horaire.',
    sum(tokens) || ' Coins approved: they go out with the next hourly payout.', '#wallet'
  from earnings where id = any (done) group by user_id;
  return jsonb_build_object('count', n);
end $$;

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
    if s.tournament_prizes[r.rk] > 0 then
      perform move_tokens(r.user_id, 'available', s.tournament_prizes[r.rk], 'tournament', wk::text);
      perform notify(r.user_id, 'tournament', 'Tournoi : tu finis ' || r.rk || 'e et gagnes ' || s.tournament_prizes[r.rk] || ' Coins !',
        'Tournament: you finished #' || r.rk || ' and won ' || s.tournament_prizes[r.rk] || ' Coins!', '#tournament');
    end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'week', wk, 'winners', n);
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
    'level_bonus_every', s.level_bonus_every, 'level_bonus_max', s.level_bonus_max,
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

create or replace function my_ad_orders(p_user uuid)
returns jsonb language sql stable set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'at', o.created_at, 'title', o.title, 'url', o.url,
    'views', o.views, 'duration', o.duration_seconds, 'amount_usdt', o.amount_usdt, 'tokens_paid', o.tokens_paid, 'status', o.status,
    'kind', o.kind, 'campaign_id', c.id, 'reward', c.reward_tokens,
    'shown', coalesce(c.views, 0), 'enabled', coalesce(c.enabled, false), 'review', coalesce(c.needs_review, false),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'n', d.n) order by d.day), '[]'::jsonb) from (
        select v.day, count(*) n from ptc_views v where v.campaign_id = c.id and v.completed_at is not null
          and v.day > (now() at time zone 'utc')::date - 14 group by v.day) d))
    order by o.created_at desc), '[]'::jsonb)
  from ad_orders o left join ptc_campaigns c on c.id = o.campaign_id
  where o.user_id = p_user and (o.status = 'paid' or o.created_at > now() - interval '1 day');
$fn$;

create or replace function create_ad_order(p_user uuid, p_title text, p_url text, p_duration int, p_views int, p_kind text)
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
  if coalesce(p_kind, 'window') not in ('window', 'iframe', 'video') then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  if p_kind = 'video' and p_url !~ '^https://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[A-Za-z0-9_-]{6,}' then
    return jsonb_build_object('ok', false, 'code', 'bad_video');
  end if;
  insert into ad_orders (user_id, title, url, duration_seconds, views, price_eur, amount_usdt, kind)
  values (p_user, trim(p_title), p_url, p_duration, p_views, price, usdt, coalesce(p_kind, 'window')) returning id into new_id;
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
  insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view, enabled, needs_review, advertiser_id, kind)
  values (o.title, o.url,
    greatest(1, floor(o.price_eur / o.views * s.ad_reward_share / 100 * s.tokens_per_eur))::int,
    o.duration_seconds, o.views, o.price_eur / o.views, false, true, o.user_id, o.kind)
  returning id into cid;
  update ad_orders set status = 'paid', tx_id = p_tx, paid_at = now(), campaign_id = cid where id = p_id;
  return jsonb_build_object('ok', true, 'campaign_id', cid);
end $fn$;

create or replace function ad_buy_with_tokens(p_user uuid, p_title text, p_url text, p_duration int, p_views int, p_ip_hash text, p_kind text)
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
  if coalesce(p_kind, 'window') not in ('window', 'iframe', 'video') then return jsonb_build_object('ok', false, 'code', 'bad_request'); end if;
  if p_kind = 'video' and p_url !~ '^https://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[A-Za-z0-9_-]{6,}' then
    return jsonb_build_object('ok', false, 'code', 'bad_video');
  end if;
  select * into u from users where id = p_user for update;
  blk := user_block(u, p_ip_hash);
  if blk is not null then return jsonb_build_object('ok', false, 'code', blk); end if;
  price := round(p_views * s.ad_price_eur_per_view * p_duration / 10.0, 4);
  tokens := ceil(price * s.tokens_per_eur);
  err := spend_tokens(u, tokens, 'ad');
  if err is not null then return jsonb_build_object('ok', false, 'code', err); end if;
  insert into ad_orders (user_id, title, url, duration_seconds, views, price_eur, amount_usdt, status, tx_id, paid_at, tokens_paid, kind)
  values (p_user, trim(p_title), p_url, p_duration, p_views, price, 0, 'paid', 'coins:' || gen_random_uuid(), now(), tokens, coalesce(p_kind, 'window'))
  returning id into order_id;
  insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view, enabled, needs_review, advertiser_id, kind)
  values (trim(p_title), p_url, greatest(1, floor(price / p_views * s.ad_reward_share / 100 * s.tokens_per_eur))::int,
    p_duration, p_views, price / p_views, false, true, p_user, coalesce(p_kind, 'window'))
  returning id into cid;
  update ad_orders set campaign_id = cid where id = order_id;
  return jsonb_build_object('ok', true, 'tokens', tokens, 'campaign_id', cid);
end $$;

create or replace function ptc_list(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'reward_tokens', c.reward_tokens,
    'duration_seconds', c.duration_seconds, 'kind', c.kind) order by c.reward_tokens desc), '[]'::jsonb)
  from ptc_campaigns c
  where c.enabled and c.views < c.max_views and not exists (
    select 1 from ptc_views v where v.campaign_id = c.id and v.user_id = p_user
      and v.day = (now() at time zone 'utc')::date and v.completed_at is not null);
$$;

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
  select * into c from ptc_campaigns where id = p_id and enabled and views < max_views;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if exists (select 1 from ptc_views where campaign_id = p_id and user_id = p_user and day = today and completed_at is not null) then
    return jsonb_build_object('ok', false, 'code', 'already_done');
  end if;
  insert into ptc_views (campaign_id, user_id, day) values (p_id, p_user, today)
  on conflict (campaign_id, user_id, day) do update set started_at = now();
  return jsonb_build_object('ok', true, 'url', c.url, 'duration_seconds', c.duration_seconds, 'kind', c.kind);
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
    'promos', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from promo_codes p), '[]'::jsonb),
    'tickets_open', (select count(*) from tickets where status = 'open'),
    'ad_impressions', coalesce((select jsonb_object_agg(slot, n) from (select slot, sum(n) n from ad_impressions
                        where day > (now() at time zone 'utc')::date - 7 group by slot) x), '{}'::jsonb),
    'challenges', coalesce((select jsonb_agg(to_jsonb(c) order by array_position(array['claims', 'earned', 'ptc', 'links', 'surveys', 'offers'], c.goal), c.target_claims) from challenges c), '[]'::jsonb)
  );
$$;

create or replace function admin_save_ptc(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if p->>'id' is null then
    insert into ptc_campaigns (title, url, reward_tokens, duration_seconds, max_views, price_eur_per_view, kind)
    values (p->>'title', p->>'url', (p->>'reward_tokens')::int, (p->>'duration_seconds')::int, (p->>'max_views')::int,
      coalesce((p->>'price_eur_per_view')::numeric, 0), coalesce(nullif(p->>'kind', ''), 'window'));
  else
    if (p->>'enabled')::boolean is false then
      perform move_tokens(o.user_id, 'available', o.tokens_paid, 'ad_refund', o.id::text)
      from ad_orders o join ptc_campaigns c on c.id = o.campaign_id
      where c.id = (p->>'id')::bigint and c.needs_review and o.tokens_paid > 0;
    end if;
    update ptc_campaigns set enabled = coalesce((p->>'enabled')::boolean, enabled), needs_review = false where id = (p->>'id')::bigint;
  end if;
end $$;

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
      kind = coalesce(nullif(p->>'kind', ''), kind),
      bonus_percent = coalesce((p->>'bonus_percent')::numeric, bonus_percent) where code = p->>'code';
  end if;
end $$;

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
    level_bonus_every = coalesce((p->>'level_bonus_every')::int, level_bonus_every),
    level_bonus_max = coalesce((p->>'level_bonus_max')::int, level_bonus_max),
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

create or replace function offerwall_list()
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'iframe_url', iframe_url, 'kind', kind, 'bonus', bonus_percent) order by code), '[]'::jsonb)
  from offerwalls where enabled;
$$;

-- Seul le serveur (service_role) peut appeler ces fonctions.
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
