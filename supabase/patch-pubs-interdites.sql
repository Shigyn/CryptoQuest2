-- Controle automatique des pubs : fermeture du compte et saisie du solde en cas de contenu sexuel.
-- A coller dans Supabase > SQL Editor, une seule fois. Rejouable sans risque.

-- Pub interdite (contenu sexuel) : compte ferme, tout le solde saisi, ses campagnes coupees.
-- Les montants saisis restent dans le grand livre (source 'seized') : une erreur peut etre corrigee a la main.
create or replace function ban_for_ad(p_user uuid, p_reason text)
returns jsonb language plpgsql set search_path = public as $$
declare
  u users;
  e record;
  seized bigint := 0;
begin
  select * into u from users where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  update users set banned = true, ban_reason = p_reason where id = p_user;
  for e in select id, status, tokens from earnings where user_id = p_user and status in ('pending', 'validated') for update loop
    perform move_tokens(p_user, e.status, -e.tokens, 'seized', e.id::text);
    update earnings set status = 'rejected' where id = e.id;
    seized := seized + e.tokens;
  end loop;
  select * into u from users where id = p_user;
  if u.available > 0 then
    perform move_tokens(p_user, 'available', -u.available, 'seized', 'available');
    seized := seized + u.available;
  end if;
  update ptc_campaigns set enabled = false, needs_review = false where advertiser_id = p_user;
  return jsonb_build_object('ok', true, 'seized', seized);
end $$;

-- Seul le serveur (service_role) peut appeler ces fonctions.
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
