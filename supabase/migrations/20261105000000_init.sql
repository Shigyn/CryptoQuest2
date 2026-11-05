-- Faucet : lot 1. Toute regle d'argent est ici, cote serveur.
-- Les tables sont fermees (RLS sans politique) et les fonctions reservees a service_role.

create table settings (
  id int primary key default 1 check (id = 1),
  paused boolean not null default false,
  pause_reason text,
  cooldown_seconds int not null default 300 check (cooldown_seconds >= 10),
  max_claims_account_day int not null default 48 check (max_claims_account_day >= 1),
  max_claims_ip_day int not null default 48 check (max_claims_ip_day >= 1),
  max_claims_site_hour int not null default 200 check (max_claims_site_hour >= 1),
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1);

-- Montants en plus petite unite, comme l'API FaucetPay.
create table coins (
  code text primary key,
  name text not null,
  decimals int not null default 8,
  reward_units bigint not null default 0 check (reward_units >= 0),
  low_balance_units bigint not null default 0 check (low_balance_units >= 0),
  enabled boolean not null default false,
  sort int not null default 100,
  last_balance_units bigint,
  last_balance_at timestamptz
);

insert into coins (code, name, reward_units, low_balance_units, enabled, sort) values
  ('DOGE', 'Dogecoin', 200000, 100000000, true, 1),
  ('TRX', 'TRON', 0, 0, false, 2),
  ('LTC', 'Litecoin', 0, 0, false, 3),
  ('BTC', 'Bitcoin', 0, 0, false, 4),
  ('ETH', 'Ethereum', 0, 0, false, 5),
  ('USDT', 'Tether', 0, 0, false, 6),
  ('USDC', 'USD Coin', 0, 0, false, 7),
  ('SOL', 'Solana', 0, 0, false, 8),
  ('BNB', 'BNB', 0, 0, false, 9),
  ('BCH', 'Bitcoin Cash', 0, 0, false, 10),
  ('DASH', 'Dash', 0, 0, false, 11),
  ('DGB', 'DigiByte', 0, 0, false, 12),
  ('ZEC', 'Zcash', 0, 0, false, 13),
  ('FEY', 'Feyorra', 0, 0, false, 14);

create table claims (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  coin text not null references coins (code),
  address text not null,
  address_norm text not null,
  ip_hash text not null,
  user_hash text,
  amount_units bigint not null,
  -- reserved : paiement en cours ; paid ; failed : refuse, rien n'est parti ;
  -- unknown : pas de reponse de FaucetPay, a relancer depuis l'admin.
  status text not null default 'reserved' check (status in ('reserved', 'paid', 'failed', 'unknown')),
  payout_id text,
  error text,
  finished_at timestamptz
);
create index claims_address_idx on claims (address_norm, created_at desc);
create index claims_ip_idx on claims (ip_hash, created_at desc);
create index claims_user_idx on claims (user_hash, created_at desc) where user_hash is not null;
create index claims_created_idx on claims (created_at desc);
create index claims_status_idx on claims (status, created_at desc);

create table bans (
  kind text not null check (kind in ('address', 'ip', 'account')),
  value text not null,
  reason text,
  created_at timestamptz not null default now(),
  primary key (kind, value)
);

alter table settings enable row level security;
alter table coins enable row level security;
alter table claims enable row level security;
alter table bans enable row level security;

-- Raison de refuser une reclamation, ou null si elle est permise.
create function claim_block_reason(p_coin text, p_address_norm text, p_ip_hash text, p_user_hash text)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  s settings;
  c coins;
  last_at timestamptz;
  n int;
begin
  select * into s from settings where id = 1;
  if s.paused then return jsonb_build_object('reason', 'paused'); end if;

  select * into c from coins where code = p_coin;
  if not found or not c.enabled or c.reward_units <= 0 then
    return jsonb_build_object('reason', 'coin_unavailable');
  end if;
  -- Solde vide connu : on ne retente qu'apres 5 minutes, pour reprendre seul apres une recharge.
  if c.last_balance_units is not null and c.last_balance_units < c.reward_units
     and c.last_balance_at > now() - interval '5 minutes' then
    return jsonb_build_object('reason', 'coin_empty');
  end if;

  if exists (select 1 from bans where (kind = 'address' and value = p_address_norm)
                                   or (kind = 'ip' and value = p_ip_hash)
                                   or (kind = 'account' and value = p_user_hash)) then
    return jsonb_build_object('reason', 'banned');
  end if;

  -- Le delai vaut pour toutes les cryptos : une reclamation par personne.
  select max(created_at) into last_at from claims
   where status <> 'failed'
     and created_at > now() - make_interval(secs => s.cooldown_seconds)
     and (address_norm = p_address_norm or ip_hash = p_ip_hash
          or (p_user_hash is not null and user_hash = p_user_hash));
  if last_at is not null then
    return jsonb_build_object('reason', 'cooldown', 'retry_after',
      ceil(extract(epoch from last_at + make_interval(secs => s.cooldown_seconds) - now()))::int);
  end if;

  select count(*) into n from claims
   where status <> 'failed' and created_at > now() - interval '24 hours'
     and (address_norm = p_address_norm or (p_user_hash is not null and user_hash = p_user_hash));
  if n >= s.max_claims_account_day then
    return jsonb_build_object('reason', 'daily_limit');
  end if;

  select count(*) into n from claims
   where status <> 'failed' and created_at > now() - interval '24 hours' and ip_hash = p_ip_hash;
  if n >= s.max_claims_ip_day then
    return jsonb_build_object('reason', 'daily_limit');
  end if;

  return null;
end $$;

-- Lecture avant d'interroger FaucetPay. Evite un appel API si la reclamation est deja refusee.
create function precheck_claim(p_coin text, p_address_norm text, p_ip_hash text)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  b jsonb := claim_block_reason(p_coin, p_address_norm, p_ip_hash, null);
  known boolean;
  uh text;
begin
  if b is not null then return b || jsonb_build_object('ok', false); end if;
  select true, user_hash into known, uh from claims
   where address_norm = p_address_norm and coin = p_coin and status = 'paid'
   order by created_at desc limit 1;
  return jsonb_build_object('ok', true, 'known', coalesce(known, false), 'user_hash', uh);
end $$;

-- Reserve la reclamation. Les verrous empechent deux requetes simultanees de passer le delai.
create function reserve_claim(p_coin text, p_address text, p_address_norm text, p_ip_hash text, p_user_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  b jsonb;
  s settings;
  c coins;
  n int;
  new_id uuid;
begin
  -- Toujours dans le meme ordre, pour eviter les interblocages.
  perform pg_advisory_xact_lock(hashtextextended('addr:' || p_address_norm, 0));
  if p_user_hash is not null then
    perform pg_advisory_xact_lock(hashtextextended('user:' || p_user_hash, 0));
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ip:' || p_ip_hash, 0));

  b := claim_block_reason(p_coin, p_address_norm, p_ip_hash, p_user_hash);
  if b is not null then return b || jsonb_build_object('ok', false); end if;

  -- Coupe-circuit : au plafond horaire, tout le faucet se met en pause.
  select * into s from settings where id = 1;
  select count(*) into n from claims
   where status <> 'failed' and created_at > now() - interval '1 hour';
  if n >= s.max_claims_site_hour then
    update settings set paused = true, updated_at = now(),
      pause_reason = 'Plafond horaire atteint (' || s.max_claims_site_hour || ' reclamations)'
     where id = 1;
    return jsonb_build_object('ok', false, 'reason', 'paused', 'tripped', true);
  end if;

  select * into c from coins where code = p_coin;
  insert into claims (coin, address, address_norm, ip_hash, user_hash, amount_units)
  values (p_coin, p_address, p_address_norm, p_ip_hash, p_user_hash, c.reward_units)
  returning id into new_id;

  return jsonb_build_object('ok', true, 'claim_id', new_id, 'amount_units', c.reward_units, 'decimals', c.decimals);
end $$;

-- Enregistre le resultat. Un paiement deja marque "paid" ne change plus jamais.
create function finish_claim(p_id uuid, p_status text, p_payout_id text, p_error text, p_user_hash text, p_balance_units bigint)
returns jsonb language plpgsql set search_path = public as $$
declare
  cl claims;
  c coins;
  crossed boolean := false;
begin
  update claims set status = p_status, payout_id = p_payout_id, error = p_error,
    user_hash = coalesce(user_hash, p_user_hash), finished_at = now()
   where id = p_id and status in ('reserved', 'unknown')
   returning * into cl;
  if not found then return jsonb_build_object('ok', false); end if;

  if p_balance_units is not null then
    select * into c from coins where code = cl.coin;
    crossed := c.low_balance_units > 0 and p_balance_units < c.low_balance_units
      and coalesce(c.last_balance_units, c.low_balance_units) >= c.low_balance_units;
    update coins set last_balance_units = p_balance_units, last_balance_at = now() where code = cl.coin;
  end if;

  return jsonb_build_object('ok', true, 'coin', cl.coin, 'low_balance', crossed, 'balance_units', p_balance_units);
end $$;

create function pause_faucet(p_reason text)
returns void language sql set search_path = public as $$
  update settings set paused = true, pause_reason = p_reason, updated_at = now() where id = 1;
$$;

-- Donnees publiques de la page. Les adresses sont masquees.
create function public_status()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'paused', s.paused,
    'cooldown_seconds', s.cooldown_seconds,
    'coins', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', c.code, 'name', c.name, 'decimals', c.decimals, 'reward_units', c.reward_units,
        'empty', c.last_balance_units is not null and c.last_balance_units < c.reward_units
      ) order by c.sort)
      from coins c where c.enabled and c.reward_units > 0), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(r) from (
        select jsonb_build_object(
          'at', cl.finished_at,
          'coin', cl.coin,
          'amount_units', cl.amount_units,
          'decimals', c.decimals,
          'who', case when length(cl.address) >= 10
                      then left(cl.address, 3) || '…' || right(cl.address, 3) else '…' end
        ) as r
        from claims cl join coins c on c.code = cl.coin
        where cl.status = 'paid' order by cl.finished_at desc limit 12
      ) x), '[]'::jsonb)
  ) from settings s where s.id = 1;
$$;

-- Admin ------------------------------------------------------------------

create function admin_overview()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'settings', (select to_jsonb(s) from settings s where id = 1),
    'coins', (select jsonb_agg(to_jsonb(c) order by c.sort) from coins c),
    'stats', jsonb_build_object(
      'hour', (select count(*) from claims where status <> 'failed' and created_at > now() - interval '1 hour'),
      'day_by_coin', coalesce((
        select jsonb_agg(jsonb_build_object('coin', coin, 'count', n, 'units', u))
        from (select coin, count(*) n, sum(amount_units) u from claims
              where status = 'paid' and created_at > now() - interval '24 hours' group by coin) t), '[]'::jsonb),
      'attention', (select count(*) from claims where status = 'unknown'
                      or (status = 'reserved' and created_at < now() - interval '2 minutes'))
    ),
    'bans', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from bans b), '[]'::jsonb)
  );
$$;

create function admin_claims(p_filter text, p_limit int)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select cl.*, c.decimals from claims cl join coins c on c.code = cl.coin
    where case p_filter
      when 'attention' then cl.status = 'unknown' or (cl.status = 'reserved' and cl.created_at < now() - interval '2 minutes')
      when 'paid' then cl.status = 'paid'
      when 'failed' then cl.status = 'failed'
      else true end
    order by cl.created_at desc limit least(greatest(p_limit, 1), 200)
  ) x;
$$;

create function admin_get_claim(p_id uuid)
returns jsonb language sql stable set search_path = public as $$
  select to_jsonb(c) from claims c where c.id = p_id;
$$;

create function admin_update_settings(p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  update settings set
    paused = coalesce((p->>'paused')::boolean, paused),
    pause_reason = case when (p->>'paused')::boolean is false then null
                        when p ? 'pause_reason' then p->>'pause_reason' else pause_reason end,
    cooldown_seconds = coalesce((p->>'cooldown_seconds')::int, cooldown_seconds),
    max_claims_account_day = coalesce((p->>'max_claims_account_day')::int, max_claims_account_day),
    max_claims_ip_day = coalesce((p->>'max_claims_ip_day')::int, max_claims_ip_day),
    max_claims_site_hour = coalesce((p->>'max_claims_site_hour')::int, max_claims_site_hour),
    updated_at = now()
  where id = 1;
end $$;

create function admin_update_coin(p_code text, p jsonb)
returns void language plpgsql set search_path = public as $$
begin
  update coins set
    enabled = coalesce((p->>'enabled')::boolean, enabled),
    reward_units = coalesce((p->>'reward_units')::bigint, reward_units),
    low_balance_units = coalesce((p->>'low_balance_units')::bigint, low_balance_units)
  where code = p_code;
end $$;

create function admin_set_balance(p_code text, p_units bigint)
returns void language sql set search_path = public as $$
  update coins set last_balance_units = p_units, last_balance_at = now() where code = p_code;
$$;

create function admin_ban(p_kind text, p_value text, p_reason text)
returns void language sql set search_path = public as $$
  insert into bans (kind, value, reason) values (p_kind, p_value, p_reason)
  on conflict (kind, value) do update set reason = excluded.reason;
$$;

create function admin_unban(p_kind text, p_value text)
returns void language sql set search_path = public as $$
  delete from bans where kind = p_kind and value = p_value;
$$;

-- Seul le serveur (service_role) peut appeler ces fonctions.
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
