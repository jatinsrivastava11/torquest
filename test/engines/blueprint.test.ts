// ENGINES MODULE (teammate-owned).

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { getEngineBlueprint } from "@/features/engines";
import { applyExplode } from "@/features/engines/model";
import { buildEngineModel } from "@/features/engines/registry";

const simplePistons = (type: Parameters<typeof getEngineBlueprint>[0]) =>
  getEngineBlueprint(type).parts.filter((p) => p.id.startsWith("piston-")).length;

describe("simple engine blueprints", () => {
  it.each([
    ["i3", 3],
    ["i4", 4],
    ["i6", 6],
    ["v6", 6],
    ["v12", 12],
    ["w16", 16],
    ["flat6", 6],
  ] as const)("%s has %i pistons", (type, count) => {
    expect(simplePistons(type)).toBe(count);
  });

  it("has no pistons in rotary or electric layouts", () => {
    expect(simplePistons("rotary")).toBe(0);
    expect(simplePistons("electric")).toBe(0);
  });
});

describe("detailed V8", () => {
  const model = buildEngineModel("v8");
  const part = (id: string) => model.parts.find((p) => p.id === id)!;

  it("has the parts a V8 has", () => {
    expect(part("pistons").pieces).toHaveLength(8);
    expect(part("rods").pieces).toHaveLength(8);
    expect(part("camshafts").pieces).toHaveLength(4);
    expect(part("heads").pieces).toHaveLength(2);
    let valves = 0;
    for (const p of part("valves").pieces) valves += p.object.children.length;
    expect(valves).toBe(32);
  });

  it("strokes each piston exactly from deck to bottom dead centre", () => {
    const pistons = part("pistons").pieces;
    const heights = pistons.map(() => [Infinity, -Infinity]);
    for (let i = 0; i < 720; i++) {
      model.setCrankAngle((i / 720) * Math.PI * 4);
      pistons.forEach((p, k) => {
        heights[k][0] = Math.min(heights[k][0], p.base.y);
        heights[k][1] = Math.max(heights[k][1], p.base.y);
      });
    }
    for (const [low, high] of heights) {
      expect(high - low).toBeCloseTo(0.927, 2); // 92.7 mm stroke
      expect(high).toBeCloseTo(0.4635 + 1.507, 3); // throw + rod
    }
  });

  it("stays finite through two full revolutions while exploded", () => {
    applyExplode(model, 0.7);
    for (let i = 0; i < 64; i++) {
      model.setCrankAngle(i * 0.2);
      applyExplode(model, 0.7);
      model.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model.root);
      expect(Number.isFinite(box.min.x + box.max.y)).toBe(true);
    }
  });

  it("moves every part except the block when exploded", () => {
    const bp = getEngineBlueprint("v8");
    for (const p of bp.parts) {
      const moved = p.rest.some((v, i) => Math.abs(v - p.exploded[i]) > 0.1);
      expect(moved, p.id).toBe(p.id !== "block");
    }
  });
});
