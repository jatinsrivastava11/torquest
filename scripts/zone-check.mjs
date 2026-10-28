#!/usr/bin/env node
// CORE (lead-owned). Run before pushing: `npm run zone`.
// Lists every file your branch changes compared with origin/main (committed,
// uncommitted and untracked) and says whether the PR can auto-merge.
// Exit code: 0 = all teammate zone, 2 = touches core, 1 = error.

import { execSync } from "node:child_process";
import { classify, zones } from "./zones.mjs";

const base = process.argv[2] ?? "origin/main";
const git = (cmd) => execSync(`git ${cmd}`, { encoding: "utf8" }).split("\n");

let files;
try {
  const mergeBase = git(`merge-base ${base} HEAD`)[0].trim();
  files = [
    ...git(`diff --name-only --no-renames ${mergeBase}`),
    ...git("ls-files --others --exclude-standard"),
  ];
} catch {
  console.error(`Could not compare with ${base}. Run \`git fetch origin\` first.`);
  process.exit(1);
}

const { teammate, core } = classify(files);
if (teammate.length + core.length === 0) {
  console.log("No changes compared with " + base + ".");
  process.exit(0);
}
if (teammate.length) console.log("Teammate zone (auto-merge OK):\n  " + teammate.join("\n  "));
if (core.length) {
  console.log("\nCORE files (need Jatin's review):\n  " + core.join("\n  "));
  console.log(
    `\nThese can't go in a ${zones.teammateBranchPrefix}* PR. Move them to a ` +
      `${zones.proposalBranchPrefix}* branch and open a separate PR (see AGENTS.md).`,
  );
  process.exit(2);
}
console.log("\nAll changes are in the teammate zone. A green PR will auto-merge.");
