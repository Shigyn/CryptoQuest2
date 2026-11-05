// Calcul de rentabilite sur 30 jours. Toutes les valeurs d'entree sont des hypotheses a remplacer par du reel.
const pct = (v) => (Number(v) || 0) / 100;

export function simulate(i) {
  const days = 30;
  const humans = i.users_per_day;
  // Les robots reclament et coutent, mais les reseaux de pub ne paient pas leurs affichages.
  const botShare = Math.min(pct(i.bot_percent), 0.95);
  const allUsers = humans / (1 - botShare);
  const eur = (tokens) => tokens / i.tokens_per_eur;

  const claimsAll = allUsers * i.claims_per_user * days;
  const claimsHuman = humans * i.claims_per_user * days;

  const sources = [
    {
      key: "faucet",
      label: "Faucet et pub",
      revenue: (claimsHuman * i.ads_per_claim / 1000) * i.ecpm_eur * pct(i.fill_percent),
      cost: eur(claimsAll * i.faucet_reward_tokens),
    },
    {
      key: "bonus",
      label: "Bonus quotidien",
      revenue: 0,
      cost: eur(allUsers * days * i.daily_bonus_tokens),
    },
    {
      key: "challenges",
      label: "Défis",
      revenue: 0,
      cost: eur(allUsers * days * i.challenge_tokens_per_user),
    },
    {
      key: "ptc",
      label: "PTC",
      revenue: humans * days * i.ptc_per_user * i.ptc_price_eur,
      cost: eur(humans * days * i.ptc_per_user * i.ptc_reward_tokens),
    },
    {
      key: "shortlinks",
      label: "Liens raccourcis",
      revenue: humans * days * i.links_per_user * i.link_revenue_eur,
      cost: eur(humans * days * i.links_per_user * i.link_reward_tokens),
    },
    {
      key: "offers",
      label: "Offerwalls",
      revenue: (humans * days * i.offers_per_user_day) * i.offer_revenue_eur,
      cost: (humans * days * i.offers_per_user_day) * i.offer_revenue_eur * pct(i.offer_share_percent),
    },
  ].map((s) => ({ ...s, net: s.revenue - s.cost }));

  const revenue = sources.reduce((t, s) => t + s.revenue, 0);
  const rewards = sources.reduce((t, s) => t + s.cost, 0);
  const referral = rewards * pct(i.referral_share_percent) * pct(i.referral_percent);
  const fixed = Number(i.fixed_costs_eur) || 0;
  const net = revenue - rewards - referral - fixed;

  // Tarif de pub minimum pour que l'ensemble ne perde pas d'argent, toutes choses egales par ailleurs.
  const adUnits = (claimsHuman * i.ads_per_claim / 1000) * pct(i.fill_percent);
  const adRevenue = sources[0].revenue;
  const breakEvenEcpm = adUnits > 0 ? Math.max(0, (adRevenue - net) / adUnits) : null;

  // Recompense faucet maximale pour que le faucet ne perde pas sur lui-meme, en tokens.
  const maxFaucetReward = claimsAll > 0 ? (adRevenue * i.tokens_per_eur) / claimsAll : 0;

  return {
    sources,
    revenue,
    rewards,
    referral,
    fixed,
    net,
    payoutShare: revenue > 0 ? (rewards + referral) / revenue : null,
    breakEvenEcpm,
    maxFaucetReward,
    claimsPerDay: claimsAll / days,
    perUserWeekEur: humans > 0 ? (rewards + referral) / allUsers / days * 7 : 0,
  };
}

// Hypotheses de depart : a remplacer par les chiffres reels des qu'ils existent.
export const BASE = {
  tokens_per_eur: 10000,
  users_per_day: 100,
  bot_percent: 15,
  claims_per_user: 10,
  faucet_reward_tokens: 2,
  ads_per_claim: 3,
  ecpm_eur: 0.5,
  fill_percent: 80,
  daily_bonus_tokens: 5,
  challenge_tokens_per_user: 2,
  ptc_per_user: 2,
  ptc_price_eur: 0.002,
  ptc_reward_tokens: 10,
  links_per_user: 2,
  link_revenue_eur: 0.003,
  link_reward_tokens: 15,
  offers_per_user_day: 0.02,
  offer_revenue_eur: 0.3,
  offer_share_percent: 50,
  referral_share_percent: 20,
  referral_percent: 10,
  fixed_costs_eur: 1,
};

export const SCENARIOS = {
  prudent: { label: "Prudent", ecpm_eur: 0.1, fill_percent: 60, bot_percent: 30, links_per_user: 1, ptc_per_user: 0, offers_per_user_day: 0.005 },
  moyen: { label: "Moyen" },
  haut: { label: "Haut", ecpm_eur: 2, fill_percent: 90, bot_percent: 10, links_per_user: 3, ptc_per_user: 4, offers_per_user_day: 0.05 },
};
