// Seul fichier a remplir avant la mise en ligne. Ces valeurs sont publiques, jamais de cle secrete ici.
(() => {
  // Bannieres de parrainage du proprietaire (en attendant les reseaux de pub).
  // Les codes colles dans le dashboard (onglet « Emplacements pub ») s'ajoutent a la rotation.
  const ROLLERCOIN_3 = `<a href="https://rollercoin.com/?r=lfx0gx8l" target="_blank" rel="noopener"><img src="https://static.rollercoin.com/static/img/ref/gen3/w320h100.gif" width="320" height="100" alt="Rollercoin"/></a>`;
  const ROLLERCOIN_2 = `<a href="https://rollercoin.com/?r=lfx0gx8l" target="_blank" rel="noopener"><img src="https://static.rollercoin.com/static/img/ref/gen2/w320h100.gif" width="320" height="100" alt="Rollercoin"/></a>`;
  const VIEFAUCET = `<a href="https://viefaucet.com?r=6480dff3371c056c0073e194" target="_blank" rel="noopener"><img src="https://viefaucet.com/banners/300x250.gif" width="300" height="250" alt="Vie Faucet" /></a>`;
  const EARNBITSUN = `<a href="https://earnbitsun.club?ref=ISONAED7" target="_blank" rel="noopener"><img src="https://earnbitsun.club/promo/EBS-468x60.gif" width="468" height="60" alt="Earnbitsun — gagnez des cryptos toutes les 5 minutes" style="border:0"></a>`;

  // A-Ads, bloc 2462840 (taille adaptative) : banniere payee a l affichage.
  const aads = (height) => `<iframe data-aa="2462840" src="//acceptable.a-ads.com/2462840/?size=Adaptive" title="A-Ads" style="border:0;padding:0;width:100%;height:${height}px;overflow:hidden;display:block;margin:auto"></iframe>`;
  const AADS = aads(90);
  const AADS_BOX = aads(250);
  const AADS_STICKY = aads(60);

  window.FAUCET_CONFIG = {
    SITE_NAME: "BitPool",
    TOKEN: "Coins",
    // https://VOTRE-PROJET.supabase.co/functions/v1
    API_BASE: "https://snvfovahyugxpqtthfoo.supabase.co/functions/v1",
    // Cle de site Cloudflare Turnstile (pas le secret).
    TURNSTILE_SITE_KEY: "0x4AAAAAAF1U79urd_S35J5R",
    // Code HTML par emplacement. Une liste = rotation au hasard. Absent : emplacement masque.
    ADS: {
      // Pub payee en premier : A-Ads seul aux emplacements les plus vus, parrainages ailleurs.
      header: [AADS],
      sticky_mobile: [AADS_STICKY],
      roll_top: [VIEFAUCET],
      roll_bottom: [ROLLERCOIN_3, ROLLERCOIN_2],
      after_claim: [VIEFAUCET],
      in_content: [AADS],
      game: [VIEFAUCET],
      side_right: [AADS_BOX],
      footer: [AADS],
    },
  };
})();
