# Recognition

How Torquest names the car in a photo. Decided with Jatin on 2026-10-28.

## The flow (planned)

1. **Detect** the car in the camera photo on the phone (YOLOS-tiny, Apache 2.0, ~10 MB) and crop
   to it.
2. **Blur** number plates and faces on the phone, before anything is saved or uploaded.
3. **Suggest** the top 5 catalog cars with an open vision model running in the browser
   (`@huggingface/transformers`, model ≤ ~150 MB, downloaded once and cached). The user taps
   the right one.
4. **None right?** The user can search the catalog. Common to Niche score straight away.
5. **Rare and above** are double-checked by a cloud vision model (Gemini free tier) through a
   Supabase edge function, so the API key never reaches the phone. Only rare claims go to the
   cloud, which keeps us inside the free limits.

## Choosing the model: measure, don't guess

`scripts/recognition/` holds the benchmark:

| Script | What it does |
|---|---|
| `fetch-photos.mjs` | Downloads up to 20 Commons photos per benchmark car into `.cache/` (never committed), recording licence and author |
| `eval.mjs` | Crops each photo to the car, splits photos into reference and test, and scores each candidate model |

- **Benchmark:** `data/recognition/benchmark.json`, 151 cars with hand-verified Commons
  categories. It deliberately includes look-alikes: 911 generations and GT variants, Civic and
  F-150 generations, Ferrari models.
- **Candidates:** CLIP ViT-B/16 (MIT), SigLIP 2 B/16 (Apache 2.0), DINOv2-B (Apache 2.0).
  All are ~90 MB quantized.
- **Methods:** *text* (photo vs. a written description, so no reference photos are needed),
  *gallery* (nearest reference photo), and *fused* (both).
- **Views:** full car, and a *partial* crop (a corner or side, 55% × 75% of the car), to see how
  it copes with a car half out of frame.
- **Metrics:** top-1, top-5 (is the right car among the 5 suggestions, which is what the UI
  shows), and make accuracy.

Rule: no model ships without benchmark numbers. A change to the recognition pipeline must be
re-run on the benchmark, and must not lower top-5.

## Results (2026-10-28)

813 test photos the models had not seen, from 151 benchmark cars; each model chooses among those
151 cars, using 1,774 reference photos. "Top 5" is whether the right car is among the five
suggestions the app shows. Models quantized to 8 bits (~90 MB), run in Node with the same
transformers.js runtime the app uses.

| Model | Method | Full: top 1 | Full: top 5 | Full: make | Partial: top 5 |
|---|---|---|---|---|---|
| **CLIP ViT-B/16** | **fused** | **43.5%** | **81.9%** | **91.4%** | **69.6%** |
| CLIP ViT-B/16 | text | 35.4% | 75.4% | 90.4% | 65.3% |
| CLIP ViT-B/16 | gallery | 35.2% | 70.1% | 86.1% | 52.5% |
| SigLIP 2 B/16 | gallery | 39.0% | 64.9% | 81.5% | 42.4% |
| SigLIP 2 B/16 | text | 8.5% | 27.1% | 57.3% | 24.7% |
| DINOv2-B | gallery | 20.4% | 45.5% | 64.5% | 27.7% |

- **Leader: CLIP ViT-B/16, fused** (text description + nearest reference photo).
- SigLIP 2's text score is near chance, which points to a setup problem in our text preparation
  rather than the model; worth fixing before ruling it out.
- Partial views (a corner or side of the car) cost about 12 points of top-5.
- Not yet tested: the full 3,209-car catalog (harder than 151), real phone photos, rear views.
