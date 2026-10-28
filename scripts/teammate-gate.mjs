#!/usr/bin/env node
// CORE (lead-owned). Called by .github/workflows/teammate-gate.yml.

import { execFileSync } from "node:child_process";
import { classify, zones } from "./zones.mjs";

const { REPO, HEAD_BRANCH, HEAD_SHA, CONCLUSION } = process.env;
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
const ghJson = (...args) => JSON.parse(gh(...args));

const isTeammate = HEAD_BRANCH.startsWith(zones.teammateBranchPrefix);
const isProposal = HEAD_BRANCH.startsWith(zones.proposalBranchPrefix);
if (!isTeammate && !isProposal) {
  console.log(`${HEAD_BRANCH}: not a teammate branch, nothing to do.`);
  process.exit(0);
}

const [pr] = ghJson(
  "pr", "list", "-R", REPO, "--head", HEAD_BRANCH, "--state", "open",
  "--json", "number,headRefOid,isDraft,isCrossRepository,labels,mergeStateStatus",
);
if (!pr) process.exit(0);
if (pr.headRefOid !== HEAD_SHA) {
  console.log(`PR #${pr.number} has newer commits; their CI run will decide.`);
  process.exit(0);
}
if (pr.isCrossRepository) {
  console.log(`PR #${pr.number} comes from a fork; forks are never auto-merged.`);
  process.exit(0);
}

const n = String(pr.number);
const labels = pr.labels.map((l) => l.name);
const comment = (body) => gh("pr", "comment", n, "-R", REPO, "--body", body);
const flag = (label, body) => {
  if (labels.includes(label)) return;
  gh("pr", "edit", n, "-R", REPO, "--add-label", label);
  comment(body);
};

if (isProposal) {
  flag("needs-jatin", "Proposal for a core change. Waiting for Jatin's review; it is never auto-merged.");
  process.exit(0);
}

if (CONCLUSION !== "success") {
  console.log(`CI ${CONCLUSION} on #${n}; not merging.`);
  process.exit(0);
}

// Renames count twice: moving a core file into the zone is still a core change.
const changed = gh(
  "api", "--paginate", `repos/${REPO}/pulls/${n}/files`,
  "--jq", ".[] | .filename, (.previous_filename // empty)",
).split("\n");
const { core } = classify(changed);

if (core.length) {
  flag(
    "needs-jatin",
    "This PR touches core files, so it won't auto-merge:\n\n" +
      core.map((f) => `- \`${f}\``).join("\n") +
      "\n\nSplit them into a `proposal/*` PR, or wait for Jatin.",
  );
  process.exit(0);
}
if (pr.isDraft || labels.includes("hold")) {
  console.log(`#${n} is a draft or on hold; not merging.`);
  process.exit(0);
}
if (pr.mergeStateStatus === "BEHIND") {
  flag("needs-rebase", "main has moved on. Rebase onto `origin/main` and push again; CI will rerun and merge it.");
  process.exit(0);
}

gh("pr", "review", n, "-R", REPO, "--approve", "--body", "CI green and every file is in the engines zone.");
gh("pr", "merge", n, "-R", REPO, "--squash", "--delete-branch", "--match-head-commit", HEAD_SHA);
console.log(`Merged #${n}.`);
