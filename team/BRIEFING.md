# Briefing

Jatin's agent updates this before every push to `main`. The teammate's agent reads it on every pull.
Newest entry on top.

---

## 2026-10-28 (later): Realistic V8, and the standard for every engine

**Decision (Jatin):** engines are built **in code from detailed parts**, not downloaded models.
Free realistic models exist only for a few engine types, are usually far too heavy for phones, and
are usually one fused mesh that can't explode. Jatin's agent built the V8 as the **quality bar and
template**; the teammate builds the other 14 to the same standard.

**What changed in the engines zone**
- `src/features/engines/detailed/v8.ts`: the reference engine. Real proportions (92 mm bore,
  92.7 mm stroke, 150.7 mm rods), cross-plane crank, 4 camshafts and 32 valves that open in firing
  order, timing chains, heat-tinted headers, intake, accessory drive. Pistons and rods follow exact
  slider-crank maths; valves follow the actual cam lobe profiles. 19 labelled parts.
- `detailed/kit.ts`: shared materials and geometry builders (gears, springs, tubes, lathe, heat tint).
- `model.ts`: the `EngineModel` interface every engine produces (parts, pieces, staged explode,
  `setCrankAngle`).
- `EngineStudio.tsx` replaces the old viewer: studio lighting and reflections, shadows, touch orbit
  and pinch, staged explode, floating labels that avoid overlapping, tap a part to X-ray everything else.
- `registry.ts`: which engine types have a detailed build. The other 14 still use the old simple
  blueprints (marked "(simple)" in the dropdown) until they're rebuilt.
- New dependency: `three-bvh-csg` (MIT) to cut real bores into the block.

**For the teammate: today's work**
1. Run `/engines`, pick **V8**, explode it, run it, tap parts. Read `detailed/v8.ts` end to end:
   it's the pattern to copy.
2. Build the next engine in `detailed/` the same way. **Inline-4 recommended**: it's the most
   common engine on the road, and it reuses most of the V8's parts with one bank and no V.
   Then i6 and flat-6.
3. For each engine: correct layout, firing order and crank, real-looking parts, every part
   labelled with a plain-English description, tests in `test/engines/` (piston stroke, part
   counts), and screenshots checked on a phone-sized screen.
4. Add the engine to `registry.ts`. When all 14 are done, delete `blueprint.ts` and
   `simpleModel.ts`.

**Open questions for the teammate**
- None yet.

---

## 2026-10-28: Project set up

**Protocol changes:** first version of `AGENTS.md`, `team/zones.json` and the auto-merge gate.

**What exists now**
- A Next.js web app skeleton (it will become an installable PWA).
- The engines module, ported from Pavement: all 15 engine types as simple shapes, with an explode
  slider, running animation and tap-to-learn labels. See it at `npm run dev` → `/engines`.
- CI (typecheck, tests, build) on every PR, and the teammate gate that auto-merges green
  engines-only PRs.

**For the teammate: today's work**
1. Set up (`team/ONBOARDING.md`), run the app, open `/engines`, and play with every engine type.
2. Pick one engine to make look real first. **V8 recommended**: it's the most common
   engine among the cars people will spot most proudly. Suggested order of parts: connecting
   rods, camshafts and valve covers, intake plenum, then the timing chain.
3. Make it work well on a phone (open `http://<your-computer-ip>:3000/engines` on your phone
   while on the same Wi-Fi).
4. Write a first entry in `team/engines-log.md` with your plan and any questions for Jatin.

**Open questions for the teammate**
- None yet.
