#!/usr/bin/env node
// CORE (lead-owned). Measures how well candidate on-device models recognise
// catalog cars, on Commons photos they have not seen.
//   node scripts/recognition/eval.mjs [modelKey ...]
//
// For each photo: detect the car (YOLOS-tiny) and crop to it, as the app
// will. Each car's crops are split into a gallery (reference examples) and
// a test set. Each test crop is also cut down to a partial view (a corner
// or side of the car). Methods:
//   text    zero-shot: photo vs. a written description of each car
//   gallery nearest reference photo of each car
//   fused   both, z-scored and summed
// Reports top-1 / top-5 (exact catalog entry) and make accuracy.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  AutoModel,
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  SiglipTextModel,
  SiglipVisionModel,
  env,
  pipeline,
} from "@huggingface/transformers";

env.cacheDir = ".cache/recognition/models";
const PHOTOS = ".cache/recognition/photos";
const OUT = ".cache/recognition/eval";
mkdirSync(OUT, { recursive: true });

const MODELS = {
  "clip-b16": { id: "Xenova/clip-vit-base-patch16", kind: "clip", dtype: "q8" },
  "siglip2-b16": { id: "onnx-community/siglip2-base-patch16-224-ONNX", kind: "siglip", dtype: "q8" },
  "dinov2-b": { id: "onnx-community/dinov2-base-ONNX", kind: "dino", dtype: "q8" },
};
const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MODELS);

// ---------------------------------------------------------------- catalog
const catalog = readdirSync("data/catalog")
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .flatMap((f) => {
    const d = JSON.parse(readFileSync(`data/catalog/${f}`, "utf8"));
    return d.cars.map((c) => ({ ...c, make: d.make }));
  });
let classes = catalog.map((c) => c.id);
const byId = new Map(catalog.map((c) => [c.id, c]));

// ------------------------------------------------------------- detection
const crops = new Map(); // id -> [{file, box}]
{
  const cacheFile = `${OUT}/crops.json`;
  const cached = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
  const detector = await pipeline("object-detection", "Xenova/yolos-tiny", { dtype: "q8" });
  let dirty = false;
  for (const id of classes) {
    const dir = `${PHOTOS}/${id}`;
    if (!existsSync(`${dir}/manifest.json`)) continue;
    const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8"));
    const list = [];
    for (const { file } of manifest) {
      const key = `${id}/${file}`;
      if (!(key in cached)) {
        const img = await RawImage.read(`${dir}/${file}`);
        const found = (await detector(img, { threshold: 0.5 }))
          .filter((d) => ["car", "truck", "bus"].includes(d.label))
          .map((d) => ({ ...d.box, area: ((d.box.xmax - d.box.xmin) * (d.box.ymax - d.box.ymin)) / (img.width * img.height) }))
          .sort((a, b) => b.area - a.area);
        // Keep photos where one vehicle clearly dominates the frame.
        cached[key] = found[0] && found[0].area >= 0.15 ? { box: found[0], w: img.width, h: img.height } : null;
        dirty = true;
      }
      if (cached[key]) list.push({ file: `${dir}/${file}`, ...cached[key] });
    }
    if (list.length) crops.set(id, list);
  }
  if (dirty) writeFileSync(cacheFile, JSON.stringify(cached));
  await detector.dispose();
}

async function loadCrop({ file, box, w, h }, partial = null) {
  const img = await RawImage.read(file);
  const pad = 0.04;
  let x0 = Math.max(0, box.xmin - pad * w), y0 = Math.max(0, box.ymin - pad * h);
  let x1 = Math.min(w - 1, box.xmax + pad * w), y1 = Math.min(h - 1, box.ymax + pad * h);
  if (partial !== null) {
    // A corner or side of the car: 55% of its width, 75% of its height.
    const cw = (x1 - x0) * 0.55, ch = (y1 - y0) * 0.75;
    const ax = [0, 1, 0.5, 0, 1][partial % 5], ay = [0, 0, 1, 1, 1][partial % 5];
    x0 = x0 + (x1 - x0 - cw) * ax;
    y0 = y0 + (y1 - y0 - ch) * ay;
    x1 = x0 + cw;
    y1 = y0 + ch;
  }
  return img.crop([Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)]);
}

// Every method chooses among the same cars: those with benchmark photos.
classes = classes.filter((id) => crops.has(id));
const evalCars = classes.map((id) => byId.get(id));

// ------------------------------------------------------------- splitting
function seeded(seed) {
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
  return () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const split = new Map();
for (const [id, list] of crops) {
  const rnd = seeded(id);
  const xs = [...list].sort(() => rnd() - 0.5);
  const nTest = list.length >= 3 ? Math.min(6, Math.floor(list.length / 3)) : 0;
  split.set(id, { test: xs.slice(0, nTest), gallery: xs.slice(nTest, nTest + 14) });
}

// ---------------------------------------------------------------- models
const norm = (v) => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const rows = (t) => {
  const [n, d] = t.dims;
  return Array.from({ length: n }, (_, i) => Array.from(t.data.slice(i * d, (i + 1) * d)));
};

const describe = (c) => {
  const gen = c.generation === c.model ? "" : ` (${c.generation})`;
  const name = [c.make, c.model, c.variant].filter(Boolean).join(" ");
  return [`a photo of a ${name}${gen}.`, `a photo of a ${c.years[0]} ${name}, a type of car.`, `the ${name}${gen} car.`];
};

async function loadModel({ id, kind, dtype }) {
  const processor = await AutoProcessor.from_pretrained(id);
  if (kind === "clip") {
    const vision = await CLIPVisionModelWithProjection.from_pretrained(id, { dtype });
    const tok = await AutoTokenizer.from_pretrained(id);
    const text = await CLIPTextModelWithProjection.from_pretrained(id, { dtype: "fp32" });
    return {
      image: async (img) => norm(Array.from((await vision(await processor(img))).image_embeds.data)),
      text: async (ts) => rows((await text(tok(ts, { padding: true, truncation: true }))).text_embeds).map(norm),
    };
  }
  if (kind === "siglip") {
    const vision = await SiglipVisionModel.from_pretrained(id, { dtype });
    const tok = await AutoTokenizer.from_pretrained(id);
    const text = await SiglipTextModel.from_pretrained(id, { dtype: "fp32" });
    return {
      image: async (img) => norm(Array.from((await vision(await processor(img))).pooler_output.data)),
      text: async (ts) => rows((await text(tok(ts, { padding: "max_length", max_length: 64, truncation: true }))).pooler_output).map(norm),
    };
  }
  const model = await AutoModel.from_pretrained(id, { dtype });
  return { image: async (img) => norm(Array.from((await model(await processor(img))).pooler_output.data)), text: null };
}

const zscore = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) || 1;
  return xs.map((x) => (x - m) / sd);
};

const results = {};
for (const key of keys) {
  const spec = MODELS[key];
  console.log(`\n== ${key} (${spec.id}, ${spec.dtype})`);
  const model = await loadModel(spec);
  const embCache = `${OUT}/emb-${key}.json`;
  const emb = existsSync(embCache) ? JSON.parse(readFileSync(embCache, "utf8")) : {};
  const embed = async (crop, partial = null) => {
    const k = `${crop.file}#${partial ?? "full"}`;
    if (!emb[k]) emb[k] = (await model.image(await loadCrop(crop, partial))).map((x) => +x.toFixed(5));
    return emb[k];
  };

  // Text prototypes: average of the prompt embeddings, per car.
  let textProto = null;
  if (model.text) {
    textProto = [];
    for (let i = 0; i < evalCars.length; i += 32) {
      const batch = evalCars.slice(i, i + 32);
      const flat = await model.text(batch.flatMap(describe));
      for (let j = 0; j < batch.length; j++) textProto.push(norm(flat.slice(j * 3, j * 3 + 3).reduce((a, v) => a.map((x, d) => x + v[d]))));
    }
  }

  // Gallery: every reference crop, labelled.
  const gallery = [];
  for (const [id, s] of split) for (const c of s.gallery) gallery.push({ id, v: await embed(c) });
  writeFileSync(embCache, JSON.stringify(emb));

  const scoreAll = (v) => {
    const out = {};
    if (textProto) out.text = textProto.map((p) => dot(p, v));
    const best = new Map();
    for (const g of gallery) best.set(g.id, Math.max(best.get(g.id) ?? -1, dot(g.v, v)));
    out.gallery = classes.map((id) => best.get(id) ?? -1);
    if (textProto) {
      const a = zscore(out.text), b = zscore(out.gallery);
      out.fused = a.map((x, i) => x + b[i]);
    }
    return out;
  };

  const tally = {};
  let n = 0;
  for (const [id, s] of split) {
    for (const [ti, c] of s.test.entries()) {
      for (const view of ["full", "partial"]) {
        const v = await embed(c, view === "full" ? null : ti);
        for (const [method, scores] of Object.entries(scoreAll(v))) {
          const order = scores.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => classes[i]);
          const t = (tally[`${method}/${view}`] ??= { n: 0, top1: 0, top5: 0, make: 0 });
          t.n++;
          if (order[0] === id) t.top1++;
          if (order.slice(0, 5).includes(id)) t.top5++;
          if (byId.get(order[0]).make === byId.get(id).make) t.make++;
        }
      }
      n++;
    }
  }
  writeFileSync(embCache, JSON.stringify(emb));
  results[key] = tally;
  console.log(`choosing among ${classes.length} cars; test photos: ${n} from ${[...split.values()].filter((s) => s.test.length).length} cars; gallery: ${gallery.length} photos`);
  for (const [k, t] of Object.entries(tally)) {
    const pct = (x) => `${((100 * x) / t.n).toFixed(1)}%`.padStart(6);
    console.log(`${k.padEnd(16)} top1 ${pct(t.top1)}  top5 ${pct(t.top5)}  make ${pct(t.make)}`);
  }
}
writeFileSync(`${OUT}/results-${Date.now()}.json`, JSON.stringify({ classes: classes.length, results }, null, 1));
