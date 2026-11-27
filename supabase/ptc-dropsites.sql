-- BitPool : sites Drop (parrainage du proprietaire) en campagnes PTC (nouvel onglet, 10 s).
-- A coller UNE fois dans le SQL Editor du projet snvfovahyugxpqtthfoo. Rien a redeployer.
select admin_save_ptc('{"title": "DropBTC : claim de BTC toutes les heures", "url": "https://dropbtc.io/?ref=masia.nicolas.07", "reward_tokens": 1, "duration_seconds": 10, "max_views": 100000, "kind": "window"}'::jsonb);
select admin_save_ptc('{"title": "DropTRX : claim de TRX toutes les heures", "url": "https://droptrx.io/?ref=masia.nicolas.07", "reward_tokens": 1, "duration_seconds": 10, "max_views": 100000, "kind": "window"}'::jsonb);
select admin_save_ptc('{"title": "DropDOGE : claim de DOGE toutes les heures", "url": "https://dropdoge.io/?ref=masia.nicolas.07", "reward_tokens": 1, "duration_seconds": 10, "max_views": 100000, "kind": "window"}'::jsonb);
select admin_save_ptc('{"title": "DropBNB : claim de BNB toutes les heures", "url": "https://dropbnb.io/?ref=masia.nicolas.07", "reward_tokens": 1, "duration_seconds": 10, "max_views": 100000, "kind": "window"}'::jsonb);
select id, title, url, enabled from ptc_campaigns order by id;
