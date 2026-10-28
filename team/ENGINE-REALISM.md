# Engine realism standard

**Goal: engines that look 99% real.** Jatin rates the V8 at ~85% today (2026-10-28). Every engine
must reach 99% before it counts as done. Jatin is the judge: he rates screenshots, and his score
goes in `team/engines-log.md`.

"Real" means: a car enthusiast looking at a screenshot of the assembled engine would believe it's a
render of a real production engine, and every part of the exploded view would match a workshop
manual's exploded diagram.

Hard limits that don't move:
- **$0, code-built.** Geometry is generated in code. Textures are generated in code (canvas or
  shader noise) or are **CC0** (Poly Haven, ambientCG). No downloaded engine models, no CC-BY-NC.
- **Phone budget:** ≤ 400k triangles and ≤ 4 MB of assets per engine, 30+ fps on a mid-range phone,
  ready in under 3 s.
- **Generic, not branded.** Look like a real engine type (e.g. "a modern DOHC V8"), but no
  manufacturer logos, names or exact copies of a specific engine's castings.
- Everything stays **labelled, explodable and animated**. Every new part gets a name and a
  plain-English description.

## What's missing from the V8 (ordered by realism gained)

### 1. Materials and lighting (biggest jump)
- [ ] Studio HDRI environment (Poly Haven, CC0, 1k–2k `.hdr`) instead of the generic room.
- [ ] Ambient occlusion (`GTAOPass` or `SAOPass` from three's examples) so crevices darken.
- [ ] Surface texture through normal and roughness maps:
      - sand-cast grain on the block, heads and timing cover
      - wrinkle finish on the valve covers
      - machined rings on the deck, pulleys and journals
      - cross-hatch honing in the bores
      - fine texture on the rubber belt and hoses
- [ ] Distinct finishes: dark moly coating on piston skirts, bluing on the crank, zinc on fasteners.
- [ ] Rounded edges everywhere. No razor-sharp CG edges.

### 2. Fasteners (small, but the eye expects them)
- [ ] Head bolts, main cap bolts, cover bolts around every flange, header flange studs, pulley
      bolts, cam cap bolts. Instanced meshes (`InstancedMesh`) to stay in budget.

### 3. Real cast shapes
- [ ] Valve covers: tapered sides, bolt bosses, coil-pack wells, PCV port, knurled oil cap.
- [ ] Intake: lofted plenum (not a capsule), runners with flanges and a gasket, throttle body with
      sensor and linkage, vacuum ports.
- [ ] Block: side ribbing, motor-mount bosses, freeze plugs, knock sensors, dowels, bolt holes,
      oil-filter pad.
- [ ] Heads: combustion chambers with valve seats, visible ports, cam caps with bolts.
- [ ] Timing cover: real contour with bolt bosses and the front crank seal.

### 4. Missing components
- [ ] Starter motor, oil pump and pickup, oil filter, dipstick tube.
- [ ] Thermostat housing and coolant hoses with clamps.
- [ ] Belt tensioner, idlers, A/C compressor.
- [ ] Cam and crank position sensors, wiring harness to the coils and injectors.
- [ ] Fuel feed line, PCV hose, header flange gaskets, O2 sensors.

### 5. Internal detail (seen when exploded)
- [ ] Piston crowns with valve reliefs. Pin bosses and circlips.
- [ ] Crank fillets and oil holes. Counterweights machined to a real profile.
- [ ] Rod I-beam pockets and cap split lines.
- [ ] Bearing shells in the main caps and rod big ends.
- [ ] Valve stem seals, keepers, tappet buckets with shims.

### 6. Motion
- [ ] Chain links move around the sprockets; the belt surface moves.
- [ ] The tensioner arm reacts; the throttle blade opens with RPM.
- [ ] Optional: a faint combustion glow at each spark plug as it fires.

## How each change is checked

1. **Screenshots, every time:** `npm run dev`, then `npm run shots -- v8`. Look at all five images
   in `shots/` before pushing. Agents that can read images must look at them. Compare against real
   engine photos for proportions and finish.
2. **Tests:** existing kinematics tests keep passing. Add tests for new moving parts.
3. **Budget:** count triangles (`renderer.info.render.triangles`) and log the number in the PR.
4. **Jatin's score:** after each realism PR merges, Jatin's agent sends him the screenshots and
   asks for a score out of 100. It's recorded in `team/engines-log.md`. Done = 99.

Work in **small PRs, one numbered section (or part of one) at a time**, so each jump in realism
is visible and easy to undo.
