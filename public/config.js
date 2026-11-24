// Seul fichier a remplir avant la mise en ligne. Ces valeurs sont publiques, jamais de cle secrete ici.
(() => {

  // A-Ads, bloc 2462840 (taille adaptative) : banniere payee a l affichage.
  const aads = (height) => `<iframe data-aa="2462840" src="//acceptable.a-ads.com/2462840/?size=Adaptive" title="A-Ads" style="border:0;padding:0;width:100%;height:${height}px;overflow:hidden;display:block;margin:auto"></iframe>`;
  const AADS = aads(90);
  const AADS_BOX = aads(250);
  const AADS_STICKY = aads(60);

  window.FAUCET_CONFIG = {
    SITE_NAME: "BitPool",
    // Lien d'inscription FaucetPay avec ton code de parrainage (bouton BITCOIN WALLET, tutoriel, ecran d'entree).
    FAUCETPAY_REF: "https://faucetpay.io/r/5408126",
    TOKEN: "Coins",
    // https://VOTRE-PROJET.supabase.co/functions/v1
    API_BASE: "https://snvfovahyugxpqtthfoo.supabase.co/functions/v1",
    // Cle de site Cloudflare Turnstile (pas le secret).
    TURNSTILE_SITE_KEY: "0x4AAAAAAF1U79urd_S35J5R",
    // Code HTML par emplacement. Une liste = rotation au hasard. Absent : emplacement masque.
    ADS: {
      // A-Ads partout ; les liens de parrainage sont passes en campagnes PTC (supabase/ptc-parrainages.sql).
      header: [AADS],
      sticky_mobile: [AADS_STICKY],
      roll_top: [AADS],
      roll_bottom: [AADS],
      after_claim: [AADS_BOX],
      in_content: [AADS],
      game: [AADS_BOX],
      side_left: [AADS_BOX],
      side_right: [AADS_BOX],
      footer: [AADS],
      list: [AADS],
      // Watch Ads : video HilltopAds (zone VAST), lue par le lecteur du site.
      watch: ["vast:https://sadpicture.com/d.mjFizNdLGLNHv/ZBGuUj/WeFmz9AugZDUflGk/PqTTcA2WN/TyAQ3-NZj/E/t/N/z-YK1/MmDUcR2VNVQW"],
    },
  };
})();
