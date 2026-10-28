#!/usr/bin/env node
// CORE (lead-owned). Downloads up to N photos per catalog car from its
// Commons category (and subcategories) into .cache/recognition/photos, with
// a manifest of each photo's licence and author. Local evaluation only.
//   node scripts/recognition/fetch-photos.mjs [perCar=20]

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { UA, commons } from "./commons.mjs";
import { NOISE } from "./tree.mjs";

const PER_CAR = Number(process.argv[2] ?? 20);
const ROOT = ".cache/recognition/photos";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Deterministic shuffle so reruns pick the same photos.
function shuffle(xs, seed) {
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function members(category, type) {
  const out = [];
  let cont = {};
  do {
    const j = await commons({ action: "query", list: "categorymembers", cmtitle: category, cmtype: type, cmlimit: "500", ...cont });
    out.push(...j.query.categorymembers.map((m) => m.title));
    cont = j.continue ?? null;
  } while (cont && out.length < 1500);
  return out;
}

async function photosIn(category, avoid) {
  const files = new Set();
  let level = [`Category:${category}`];
  for (let depth = 0; depth < 3 && level.length && files.size < 400; depth++) {
    const next = [];
    for (const c of level) {
      (await members(c, "file")).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).forEach((f) => files.add(f));
      next.push(
        ...(await members(c, "subcat")).filter((s) => {
          const t = s.replace(/^Category:/, "");
          return !NOISE.test(t) && !avoid.some((v) => t.toLowerCase().includes(v));
        }),
      );
    }
    level = next;
  }
  return [...files];
}

const all = readdirSync("data/catalog")
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(readFileSync(`data/catalog/${f}`, "utf8")).cars);
const cars = all.filter((c) => c.commons);

// A base car's category often has its variants as subcategories (Porsche 997
// > Porsche 997 GT3). Skip those so every photo shows the right entry.
const avoidFor = (car) =>
  all
    .filter((o) => o.model === car.model && o.variant && o.variant !== car.variant)
    .map((o) => o.variant.toLowerCase())
    .filter((v) => !(car.variant ?? "").toLowerCase().includes(v) || v.length > (car.variant ?? "").length)
    .concat(car.variant ? [] : ["type r", "turbo", "gt3", "gt2", "raptor", "shelby", "lightning"]);

for (const car of cars) {
  const dir = `${ROOT}/${car.id}`;
  const manifestPath = `${dir}/manifest.json`;
  if (existsSync(manifestPath)) continue;
  mkdirSync(dir, { recursive: true });
  const picks = shuffle(await photosIn(car.commons, avoidFor(car)), car.id).slice(0, PER_CAR);
  const manifest = [];
  for (let i = 0; i < picks.length; i += 20) {
    const batch = picks.slice(i, i + 20);
    const j = await commons({ action: "query", prop: "imageinfo", titles: batch.join("|"), iiprop: "url|extmetadata", iiurlwidth: "640" });
    for (const page of j.query.pages) {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl) continue;
      const n = manifest.length;
      const r = await fetch(info.thumburl, { headers: { "User-Agent": UA } });
      if (!r.ok) continue;
      writeFileSync(`${dir}/${n}.jpg`, Buffer.from(await r.arrayBuffer()));
      const meta = info.extmetadata ?? {};
      manifest.push({
        file: `${n}.jpg`,
        source: page.title,
        license: meta.LicenseShortName?.value ?? "unknown",
        artist: (meta.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim(),
      });
      await sleep(150);
    }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  console.log(`${car.id.padEnd(42)} ${manifest.length} photos`);
}
