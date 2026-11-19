-- Nouveau rythme du faucet : 3 tirages par heure (30 s minimum entre deux), pour tout le monde, VIP compris.
-- Nouvelle table des gains (tirage de 0 a 99 999) :
--   0 - 89 999      : 2 Coins     (90 %)
--   90 000 - 94 999 : 5 Coins     (5 %)
--   95 000 - 99 499 : 20 Coins    (4,5 %)
--   99 500 - 99 998 : 200 Coins   (0,499 %)
--   99 999          : 20 000 Coins = 2 EUR (jackpot, jamais multiplie par le niveau)
-- Gain moyen : 4,15 Coins par tirage. A coller dans Supabase > SQL Editor (projet du faucet). Rejouable.

update settings set
  faucet_reward_tokens = 2,
  roll_tiers = '[{"from": 90000, "tokens": 5}, {"from": 95000, "tokens": 20}, {"from": 99500, "tokens": 200}, {"from": 99999, "tokens": 20000}]',
  cooldown_seconds = 30,
  claims_window_count = 3,
  claims_window_seconds = 3600,
  max_claims_account_day = 72,
  max_claims_ip_day = 72,
  updated_at = now()
where id = 1;

select faucet_reward_tokens, roll_tiers, cooldown_seconds, claims_window_count, claims_window_seconds,
       max_claims_account_day, max_claims_ip_day, max_claims_site_hour
from settings where id = 1;
