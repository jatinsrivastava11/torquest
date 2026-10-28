# Torquest: vision, challenges, decisions

## The app

Torquest is an app for car enthusiasts.

- **Accounts and profiles.** People log in and have a profile.
- **Friends.** You can find other people, view their profiles and add them as friends.
- **Spotting.** When you see a great car, parked or driving by, you take a photo of it in the app.
  That **spot** goes into your **collection**.
- **Cards.** Each spot becomes a card. Tapping the card opens an **interactive 3D model of the car's
  body**. Tapping the engine opens the hood and shows an **exploded, interactive 3D view of that
  car's engine type** (i4, V8, flat-6, W16, electric…) with every part labelled.
- **Tiers and points.** Every car sits in a rarity tier. Spotting it adds points to your profile.
  Rarity reflects how many were made **and** how likely you are to actually see one on the road.

## The challenges

1. **Catalog, tiers and points.** Jatin's starting tier list (914 models, 6 tiers) goes by make and
   model only, not by year. A 1995 Porsche 911 and a 2024 one count the same. It needs to be more
   complete and more granular.
2. **Accurate recognition.** Identify the car from the photo, ideally even from a partial view.
3. **3D models.** One for each car body, plus engines with exploded views and labelled parts.
4. **Legal, privacy and safety.** Number plates, people in photos, location privacy, spotting
   while driving, car-brand trademarks and designs, and existing similar apps.
5. **Data at scale for $0.** Profiles, spots, the car catalog and 3D assets, all on free tiers.

## Hard constraints

- **$0.** No spending of any kind until Jatin explicitly says otherwise.
- Freely licensed data, models and code only (see `AGENTS.md` §1).

## Decisions so far

| Date | Decision | Why |
|---|---|---|
| 2026-10-28 | **Installable web app (PWA), Next.js + TypeScript.** | $0 to publish (App Store is $99/yr), works on any phone, either of us can develop on any computer. |
| 2026-10-28 | **Torquest is a new app, designed from scratch.** Nothing is carried over from earlier prototypes except Jatin's tier list as raw input. | Fresh design for a web app. |
| 2026-10-28 | **Teammate owns the 3D engines (~20%).** Jatin owns the rest (~80%). | Self-contained, rarely touches core code. |
| 2026-10-28 | **Engines are built in code from detailed parts**; the V8 is the reference. | Free realistic models cover few engine types, are too heavy for phones and usually can't be exploded. Code-built parts give accurate motion, labels and a consistent look across all 15 types. |
| 2026-10-28 | **Catalog goes to generation level** (e.g. 911 993 / 996 / 992), not year. | Years within a generation look identical, but generations differ a lot in rarity. *(Proposed; to confirm.)* |

## Engines: where the teammate starts

The **V8** (`src/features/engines/detailed/v8.ts`) is built to the standard every engine should
meet: real proportions and kinematics, detailed parts, staged explode, labelled parts. The other
14 types still use simple box-and-cylinder blueprints until they're rebuilt the same
way. The goals for every engine:

1. Real-looking parts: cam covers, valve trains, connecting rods, turbos/superchargers where
   typical, timing chain/belt, spark plugs, and the battery/inverter/gearbox for EVs.
2. Accurate layouts: firing order, V angles, crank throws, boxer opposition, rotary eccentric
   motion.
3. Labels attached to parts in 3D, readable on a phone, with plain-English descriptions.
4. Smooth touch controls on phones (pinch, rotate, tap) and good performance on mid-range phones.
5. Optional: glTF models in `public/engines/` (made in Blender or procedurally) instead of
   primitives, kept small (aim < 2 MB per engine).
