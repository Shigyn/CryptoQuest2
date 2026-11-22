-- BitPool : code de fin de video toujours a 4 chiffres. A coller dans le SQL Editor du projet snvfovahyugxpqtthfoo (rien a redeployer).
-- 4 chiffres, sans zero en tete.
create or replace function random_code()
returns text language sql volatile set search_path = public as $$
  select (1000 + floor(random() * 9000))::int::text;
$$;

revoke all on function random_code() from public, anon, authenticated;
grant execute on function random_code() to service_role;
