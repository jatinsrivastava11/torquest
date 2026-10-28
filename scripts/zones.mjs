// CORE (lead-owned). Decides whether a changed file is in the teammate's
// zone (auto-mergeable) or core (needs Jatin). Rules live in team/zones.json.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const zonesPath = fileURLToPath(new URL("../team/zones.json", import.meta.url));
export const zones = JSON.parse(readFileSync(zonesPath, "utf8"));

function matches(pattern, file) {
  if (pattern.endsWith("/**")) return file.startsWith(pattern.slice(0, -2));
  return file === pattern;
}

export function isTeammateFile(file) {
  if (zones.coreExceptions.some((p) => matches(p, file))) return false;
  return zones.teammatePaths.some((p) => matches(p, file));
}

export function classify(files) {
  const unique = [...new Set(files.filter(Boolean))].sort();
  return {
    teammate: unique.filter(isTeammateFile),
    core: unique.filter((f) => !isTeammateFile(f)),
  };
}
