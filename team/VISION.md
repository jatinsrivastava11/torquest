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

1. **Catalog, tiers and points.** The starting list (914 models, 6 tiers, carried over from an
   earlier prototype called Pavement) goes by make and model only, not by year. A 1995 Porsche 911
   and a 2024 one count the same. It needs to be more complete and more granular.
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
| 2026-10-28 | **Port Pavement's proven parts**, don't continue it wholesale. | Pavement got far (catalog, Supabase schema, engine blueprints, passenger check) but was native-iOS. |
| 2026-10-28 | **Teammate owns the 3D engines (~20%).** Jatin owns the rest (~80%). | Self-contained, rarely touches core code. |
| 2026-10-28 | **Catalog goes to generation level** (e.g. 911 993 / 996 / 992), not year. | Years within a generation look identical, but generations differ a lot in rarity. *(Proposed; to confirm.)* |

## Lessons from Pavement (don't repeat these)

- **Recognition hit a ceiling.** It named only ~15% of cars and was right 89% of the time when it
  did. Training on more scraped photos stopped helping. It mistook a VW Beetle seen from behind for
  a Bugatti Veyron at 99.9% confidence, which would have awarded 500 points by mistake.
- **Free accurate 3D car models don't exist.** Manufacturers guard their CAD files. Design-patent
  drawings are 2D outlines. Photogrammetry (rebuilding 3D from photos) needs many photos of *one*
  physical car, not many different cars of the same model.
- **Engines:** one model per engine *type* is realistic, not one per car.

## Engines: where the teammate starts

`src/features/engines/` already holds Pavement's engine studio. It builds all 15 engine types from
simple boxes and cylinders: an explode slider, a running animation with an RPM slider, and tap a
part to read what it does. It works but looks basic. The goal is engines that look real and
teach well:

1. Real-looking parts: cam covers, valve trains, connecting rods, turbos/superchargers where
   typical, timing chain/belt, spark plugs, and the battery/inverter/gearbox for EVs.
2. Accurate layouts: firing order, V angles, crank throws, boxer opposition, rotary eccentric
   motion.
3. Labels attached to parts in 3D, readable on a phone, with plain-English descriptions.
4. Smooth touch controls on phones (pinch, rotate, tap) and good performance on mid-range phones.
5. Optional: glTF models in `public/engines/` (made in Blender or procedurally) instead of
   primitives, kept small (aim < 2 MB per engine).
