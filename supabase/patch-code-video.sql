-- BitPool : code de 3 a 5 chiffres a recopier en fin de video Watch Ads (remplace le captcha).
-- A coller UNE fois dans le SQL Editor du projet snvfovahyugxpqtthfoo, PUIS redeployer les fonctions.
alter table watch_views add column if not exists code text;
alter table watch_views add column if not exists tries int not null default 0;
drop function if exists watch_complete(uuid, text, text);

create or replace function random_code()
returns text language sql volatile set search_path = public as $$
  select (floor(power(10, n - 1) + random() * 9 * power(10, n - 1)))::bigint::text from (select 3 + floor(random() * 3)::int as n) x;
$$;

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
  insert into watch_views (token, user_id, code) values (p_token, p_user, random_code());
  return jsonb_build_object('ok', true, 'token', p_token, 'seconds', (st->>'seconds')::int);
end $$;

create or replace function watch_code(p_user uuid, p_token text)
returns jsonb language plpgsql set search_path = public as $$
declare
  s settings;
  v watch_views;
  left_s numeric;
begin
  select * into s from settings where id = 1;
  select * into v from watch_views where token = p_token and user_id = p_user;
  if not found or v.completed_at is not null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  left_s := extract(epoch from v.started_at + make_interval(secs => s.watch_seconds) - now());
  if left_s > 0 then return jsonb_build_object('ok', false, 'code', 'too_soon', 'retry_after', ceil(left_s)::int); end if;
  return jsonb_build_object('ok', true, 'digits', v.code);
end $$;

create or replace function watch_complete(p_user uuid, p_token text, p_ip_hash text, p_code text)
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
  -- Code de fin de video : 3 essais, puis la vue est perdue.
  if v.tries >= 3 then return jsonb_build_object('ok', false, 'code', 'bad_code', 'left', 0); end if;
  if v.code is not null and trim(coalesce(p_code, '')) <> v.code then
    update watch_views set tries = tries + 1 where token = p_token;
    return jsonb_build_object('ok', false, 'code', 'bad_code', 'left', 2 - v.tries);
  end if;
  if (select count(*) from watch_views where user_id = p_user and day = v.day and completed_at is not null) >= s.watch_daily_limit then
    return jsonb_build_object('ok', false, 'code', 'daily_limit');
  end if;
  update watch_views set completed_at = now() where token = p_token;
  if s.mining_enabled then return mining_add(p_user, 'video', 'video:' || p_token, s.watch_revenue_eur); end if;
  return add_earning(p_user, 'video', p_token, 'Watch Ads',
    floor(s.watch_revenue_eur * s.tokens_per_eur * s.watch_share_percent / 100)::bigint, s.watch_revenue_eur);
end $$;

revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
