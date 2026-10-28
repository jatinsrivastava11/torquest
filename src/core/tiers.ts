// CORE (lead-owned). Rarity tiers and how a spot is scored.

export const TIERS = ["common", "occasional", "niche", "rare", "exotic", "legendary"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_INFO: Record<Tier, { label: string; points: number; holo: boolean }> = {
  common: { label: "Common", points: 10, holo: false },
  occasional: { label: "Occasional", points: 25, holo: false },
  niche: { label: "Niche", points: 75, holo: false },
  rare: { label: "Rare", points: 200, holo: true },
  exotic: { label: "Exotic", points: 500, holo: true },
  legendary: { label: "Legendary", points: 2000, holo: true },
};

export const BONUS = {
  firstForYou: 0.5,
  firstInTorquest: 1,
  classic: 0.25,
  /** Share of tier points for a car you've already spotted. */
  repeat: 0.1,
};
export const CLASSIC_AGE = 25;

export interface SpotScoreInput {
  tier: Tier;
  /** How many times this user has already spotted this catalog car. */
  yourEarlierSpots: number;
  /** How many times anyone on Torquest has already spotted it. */
  torquestEarlierSpots: number;
  /** First model year of the car's generation. */
  firstYear: number;
  spottedYear: number;
}

export interface SpotScore {
  total: number;
  lines: { label: string; points: number }[];
}

export function scoreSpot(input: SpotScoreInput): SpotScore {
  const base = TIER_INFO[input.tier].points;
  if (input.yourEarlierSpots > 0) {
    const points = Math.max(1, Math.round(base * BONUS.repeat));
    return { total: points, lines: [{ label: `${TIER_INFO[input.tier].label} (already in your collection)`, points }] };
  }
  const lines = [{ label: TIER_INFO[input.tier].label, points: base }];
  lines.push({ label: "First time you've spotted it", points: Math.round(base * BONUS.firstForYou) });
  if (input.torquestEarlierSpots === 0) {
    lines.push({ label: "First on Torquest", points: Math.round(base * BONUS.firstInTorquest) });
  }
  if (input.spottedYear - input.firstYear >= CLASSIC_AGE) {
    lines.push({ label: `Classic (${CLASSIC_AGE}+ years)`, points: Math.round(base * BONUS.classic) });
  }
  return { total: lines.reduce((sum, l) => sum + l.points, 0), lines };
}
