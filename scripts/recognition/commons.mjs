// CORE (lead-owned). Shared Wikimedia Commons helpers for the recognition
// scripts. Photos are fetched for local evaluation and reference only;
// they are never committed or shipped.

export const UA = "TorquestRecognitionEval/0.1 (https://github.com/jatinsrivastava11/torquest)";
const API = "https://commons.wikimedia.org/w/api.php";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let last = 0;
export async function commons(params, tries = 6) {
  const wait = last + 400 - Date.now(); // stay well under Commons' rate limits
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params })}`;
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.ok) {
      const j = await r.json();
      if (!j.error) return j;
      const busy = j.error.code === "maxlag" || /too busy/i.test(j.error.info ?? "");
      if (!busy) throw new Error(j.error.info);
    }
    await sleep(3000 * (i + 1));
  }
  throw new Error(`Commons API failed: ${url}`);
}

const ORDINALS = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth"];

/** Words in a catalog generation that Commons titles tend to use. */
export function generationTokens(generation) {
  const out = [];
  const ord = generation.match(/(\d+)(st|nd|rd|th) gen/i);
  if (ord) out.push(`${ORDINALS[Number(ord[1])]} generation`);
  for (const code of generation.replace(/\(|\)/g, " ").split(/[\s/]+/)) {
    if (code && !/^(gen|\d+(st|nd|rd|th))$/i.test(code)) out.push(code.toLowerCase());
  }
  return out;
}

/** Category titles Commons commonly uses for a car, most specific first. */
export function likelyCategories(make, car) {
  const base = `${make} ${car.model}`;
  const v = car.variant ? ` ${car.variant}` : "";
  if (car.generation === car.model) return [`${base}${v}`];
  const out = [];
  for (const g of [car.generation, ...generationTokens(car.generation)]) {
    out.push(`${base}${v} (${g})`);
    if (!v) out.push(`${make} ${g}`);
  }
  if (v) out.push(`${base}${v}`);
  return [...new Set(out)];
}
