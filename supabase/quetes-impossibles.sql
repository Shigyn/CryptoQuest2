-- BitPool : coupe les quetes qu'aucun membre ne peut remplir aujourd'hui.
-- Liens, sondages et offres : aucun reseau branche. Gros objectifs de gains : hors de portee avec le minage (quelques sats par jour).
-- A coller dans le SQL Editor du projet snvfovahyugxpqtthfoo (rien a redeployer). A rallumer quand un reseau sera branche.
update challenges set enabled = false
where goal in ('claims', 'links', 'surveys', 'offers')
   or (goal = 'earned' and target_claims >= 1000);
select name, goal, period, enabled from challenges order by enabled desc, period, goal;
