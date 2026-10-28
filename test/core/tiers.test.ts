import { describe, expect, it } from "vitest";
import { scoreSpot, TIER_INFO, TIERS } from "@/core/tiers";

const spot = { yourEarlierSpots: 0, torquestEarlierSpots: 5, firstYear: 2020, spottedYear: 2026 };

describe("scoreSpot", () => {
  it("gives rarer tiers strictly more points", () => {
    const pts = TIERS.map((t) => TIER_INFO[t].points);
    expect([...pts].sort((a, b) => a - b)).toEqual(pts);
    expect(new Set(pts).size).toBe(pts.length);
  });

  it("adds the first-for-you bonus to a new car", () => {
    expect(scoreSpot({ ...spot, tier: "rare" }).total).toBe(300);
  });

  it("doubles up for the first spot on Torquest", () => {
    expect(scoreSpot({ ...spot, tier: "rare", torquestEarlierSpots: 0 }).total).toBe(500);
  });

  it("adds the classic bonus at 25 years", () => {
    expect(scoreSpot({ ...spot, tier: "niche", firstYear: 2001 }).total).toBe(75 + 38 + 19);
    expect(scoreSpot({ ...spot, tier: "niche", firstYear: 2002 }).total).toBe(75 + 38);
  });

  it("scores repeats at a tenth, with no bonuses", () => {
    const s = scoreSpot({ ...spot, tier: "legendary", yourEarlierSpots: 1, torquestEarlierSpots: 0, firstYear: 1960 });
    expect(s.total).toBe(200);
    expect(s.lines).toHaveLength(1);
    expect(scoreSpot({ ...spot, tier: "common", yourEarlierSpots: 3 }).total).toBe(1);
  });
});
