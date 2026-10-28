// ENGINES MODULE (teammate-owned).

import { describe, expect, it } from "vitest";
import { getEngineBlueprint } from "@/features/engines";

const pistons = (type: Parameters<typeof getEngineBlueprint>[0]) =>
  getEngineBlueprint(type).parts.filter((p) => p.id.startsWith("piston-")).length;

describe("engine blueprints", () => {
  it.each([
    ["i3", 3],
    ["i4", 4],
    ["i6", 6],
    ["v6", 6],
    ["v8", 8],
    ["v12", 12],
    ["w16", 16],
    ["flat6", 6],
  ] as const)("%s has %i pistons", (type, count) => {
    expect(pistons(type)).toBe(count);
  });

  it("has no pistons in rotary or electric layouts", () => {
    expect(pistons("rotary")).toBe(0);
    expect(pistons("electric")).toBe(0);
  });

  it("moves parts apart when exploded", () => {
    const moved = getEngineBlueprint("v8").parts.filter(
      (p) => p.rest.some((v, i) => v !== p.exploded[i]),
    );
    expect(moved.length).toBeGreaterThan(5);
  });
});
