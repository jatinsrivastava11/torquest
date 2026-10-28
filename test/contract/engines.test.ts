// CORE (lead-owned). Guards the contract between the app and the engines
// module. If this fails on a teammate PR, the PR broke the interface.

import { describe, expect, it } from "vitest";
import { ENGINE_TYPES } from "@/core/engines";
import * as engines from "@/features/engines";
import type { EnginesModule } from "@/features/engines/contract";

const mod: EnginesModule = engines;

describe("engines module contract", () => {
  it("exports a viewer component", () => {
    expect(typeof mod.EngineViewer).toBe("function");
  });

  it.each(ENGINE_TYPES)("has a usable blueprint for %s", (type) => {
    const bp = mod.getEngineBlueprint(type);
    expect(bp.type).toBe(type);
    expect(bp.label.length).toBeGreaterThan(0);
    expect(bp.parts.length).toBeGreaterThan(0);

    const ids = bp.parts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const part of bp.parts) {
      expect(part.name.trim()).not.toBe("");
      expect(part.description.trim()).not.toBe("");
      for (const n of [...part.rest, ...part.exploded]) {
        expect(Number.isFinite(n)).toBe(true);
      }
    }
  });
});
