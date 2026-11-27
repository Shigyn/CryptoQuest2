-- BitPool : titres PTC sans phrase en francais (le site est en 7 langues) : seulement le nom du site et la crypto.
-- A coller dans le SQL Editor du projet snvfovahyugxpqtthfoo. Rien a redeployer.
update ptc_campaigns set title = 'Rollercoin · BTC' where url like '%rollercoin.com%';
update ptc_campaigns set title = 'VieFaucet · BTC · LTC · DOGE' where url like '%viefaucet.com%';
update ptc_campaigns set title = 'Earnbitsun · BTC · TRX' where url like '%earnbitsun.club%';
update ptc_campaigns set title = 'DropBTC · BTC' where url like '%dropbtc.io%';
update ptc_campaigns set title = 'DropTRX · TRX' where url like '%droptrx.io%';
update ptc_campaigns set title = 'DropDOGE · DOGE' where url like '%dropdoge.io%';
update ptc_campaigns set title = 'DropBNB · BNB' where url like '%dropbnb.io%';
select id, title, url from ptc_campaigns order by id;
