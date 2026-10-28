# Catalog rules

How cars get into Torquest's catalog and how their tier is decided. The data lives in
`data/catalog/<make>.json`, one file per make. `npm test` checks every entry against these rules.

## What gets an entry

- **One entry per generation** of a model, from **1980 on**. A generation is a body that looks
  different from the one before it: usually a new platform or a major redesign (911 996 → 997,
  Civic 10th gen → 11th gen). Mid-cycle facelifts stay in the same generation.
- **Plus key variants**, which get their own entry only when both are true:
  1. **You can tell it from the base car in a photo** (wing, bodywork, wheels, badges you can
     see from 10 m away): 911 GT3 RS, Civic Type R, F-150 Raptor, Mustang Shelby GT500.
  2. **It's at least one tier rarer** than the base car.

  A trim that only changes the engine or interior (Mustang EcoBoost vs GT) is not its own entry.
- **Before 1980: iconic classics only**, cars people genuinely see at shows and on Sunday
  drives in North America: Mustang 1st gen, '57 Bel Air, E-Type, 300SL, Beetle, 911 classic,
  Corvette C1–C3, Model T. Not every pre-1980 generation.
- **Sold or seen in North America.** Cars never sold there are included only if they're famous
  enough to turn up (imports, shows): Nissan Skyline GT-R R32–R34, Toyota Century.

## How tiers work

Each entry carries **`naOnRoad`**: an estimate of how many are on, or regularly seen on, North
American roads today, counting cars that have been scrapped since. The tier comes from that number:

| Tier | naOnRoad | Feel |
|---|---|---|
| Legendary | under 50 | Might see one in a lifetime |
| Exotic | 50 – 999 | A big event: car shows, a few cities |
| Rare | 1,000 – 9,999 | Makes your day |
| Niche | 10,000 – 99,999 | An enthusiast notices it |
| Occasional | 100,000 – 999,999 | A few a week |
| Common | 1,000,000+ | Everywhere |

- Estimates come from production and sales figures for North America, then reduced for age:
  most cars from the 1990s are mostly gone; enthusiast cars and classics survive far better.
- They're approximate on purpose. What matters is the right order of magnitude.
- **`tierOverride`** sets the tier directly when the number misleads, and must carry a
  **`tierReason`**. Example: a car with 30 on the road that nobody cares about shouldn't be
  Legendary.
- **`built`** is worldwide production, when known. It's for display and sanity checks.

## Fields

```jsonc
{
  "id": "porsche-911-992-gt3-rs",   // make-model-generation[-variant], lowercase, unique;
                                     // one-generation cars use the model as generation, and the
                                     // id skips it: "ferrari-f40"
  "model": "911",
  "generation": "992",               // the code enthusiasts use; otherwise "11th gen"
  "variant": "GT3 RS",               // only on variant entries
  "years": [2022, null],             // null = still in production
  "engine": "flat6",                 // see src/core/engines.ts
  "body": "coupe",                   // see src/core/catalog.ts
  "naOnRoad": 4000,
  "built": 0,                        // optional; 0 or missing = unknown
  "aliases": ["992 GT3 RS"],         // optional; extra search terms
  "commons": "Porsche 911 GT3 RS (992)" // optional; Wikimedia Commons category with its photos
}
```

Regions: tiers are North American for now. Other regions get their own `onRoad` estimates later
(`euOnRoad`, `inOnRoad` …) without changing anything else.
