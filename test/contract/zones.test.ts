// CORE (lead-owned). The auto-merge gate trusts these rules.

import { describe, expect, it } from "vitest";
import { classify, isTeammateFile } from "../../scripts/zones.mjs";

describe("teammate zones", () => {
  it.each([
    "src/features/engines/EngineViewer3D.tsx",
    "src/features/engines/parts/v8.ts",
    "test/engines/blueprint.test.ts",
    "public/engines/v8.glb",
    "team/engines-log.md",
  ])("lets the teammate own %s", (f) => {
    expect(isTeammateFile(f)).toBe(true);
  });

  it.each([
    "src/features/engines/contract.ts",
    "src/core/engines.ts",
    "src/app/page.tsx",
    "package.json",
    "team/zones.json",
    "scripts/zones.mjs",
    ".github/workflows/ci.yml",
    "AGENTS.md",
    "test/contract/engines.test.ts",
    "src/features/enginesX/a.ts",
    "public/engines.json",
  ])("keeps %s core", (f) => {
    expect(isTeammateFile(f)).toBe(false);
  });

  it("splits a mixed change", () => {
    expect(classify(["package.json", "test/engines/a.test.ts", ""])).toEqual({
      teammate: ["test/engines/a.test.ts"],
      core: ["package.json"],
    });
  });
});
