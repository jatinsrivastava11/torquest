# AGENTS.md: how to work on Torquest

Read this whole file at the start of **every** session, after pulling. It changes; the version on
`main` is the one that counts. Then read `team/VISION.md` (what we're building),
`team/BRIEFING.md` (what's new and what to do today) and, for engine work,
`team/ENGINE-REALISM.md` (the quality bar).

## 0. Who you are working for

Two people build Torquest, each with their own AI agent:

| Role | Person | Share | Owns |
|---|---|---|---|
| **Lead** | Jatin (repo owner, `@jatinsrivastava11`) | ~80% | Everything except the engines zone: app shell, UI, backend, database, recognition, catalog, points, privacy, the rules in this file |
| **Teammate** | Jatin's friend | ~20% | The **engines zone**: interactive 3D engines with exploded views and labelled parts |

**How to tell which role you are in:** if the file `.private/ROLE` exists and says `lead`, you are
the lead's agent: follow section 3. Otherwise you are the **teammate's agent**: follow section 2.
Never create `.private/ROLE` on the teammate's machine.

Both agents: **always ask your human before deciding anything that's theirs to decide, and offer
options** (2–4 concrete choices, recommended one first), not open-ended questions.

## 1. Ground rules (both roles)

- **$0, always.** No paid services, no free trials that later bill, no card on file anywhere. If
  something would cost money, stop and ask Jatin.
- **Licences:** only CC0, CC-BY (credit it in `CREDITS.md`), MIT/Apache/BSD code. Never CC-NC,
  "free for personal use", ripped game assets or manufacturer CAD.
- **No secrets in git.** The repo is public. API keys go in `.env.local` (git-ignored).
- **No personal data in git.** No emails, real names beyond first names, or photos of real
  people or number plates.
- **`main` must always be green**: `npm run check` (typecheck + tests + build) passes.
- Keep commits small, with messages that say what changed and why.

### The engines zone (teammate-owned)

Defined in `team/zones.json`. Currently:

- `src/features/engines/**` (except `contract.ts`, which is core)
- `test/engines/**`
- `public/engines/**` (3D model files, textures)
- `team/engines-log.md`

Everything else is **core**. The app talks to the engines module only through
`src/features/engines/index.ts`, which must satisfy `src/features/engines/contract.ts`. The core
test `test/contract/engines.test.ts` enforces that.

## 2. Teammate agent protocol

### First session only

1. Tell your human, in a few lines: what Torquest is (from `team/VISION.md`), that **they own
   ~20% of the app, the 3D engines**, and that Jatin owns the other ~80%.
2. Check the setup in `team/ONBOARDING.md` is done (Node, git, `gh` login, `npm install`).

### Every session

1. **Sync:**
   ```sh
   git checkout main && git pull --ff-only
   npm install
   ```
2. **Learn what changed.** Read this file, `team/BRIEFING.md`, and the commits since you last
   looked:
   ```sh
   git log --oneline $(cat .private/last-seen 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD
   ```
   Then save where you are: `mkdir -p .private && git rev-parse HEAD > .private/last-seen`
   (`.private/` is git-ignored).
3. **Brief your human, concisely (under ~10 lines):**
   - their role: *"You own the 3D engines, about 20% of Torquest."*
   - what changed since last time, in plain words
   - today's tasks from `team/BRIEFING.md` → "For the teammate"
   - any open PRs of theirs and their status (`gh pr list --author @me`)
4. **Ask them what to work on**, with options drawn from the briefing. Wait for the answer.
5. **Work on a branch:** `git checkout -b friend/<short-topic>` from fresh `main`.
6. **Before pushing,** all three must pass:
   ```sh
   npm run check   # typecheck + tests + build
   npm run zone    # must say "All changes are in the teammate zone"
   ```
   Add or update tests in `test/engines/` for what you built.
   For anything visual, also run `npm run shots -- <engine>` (with `npm run dev` running) and
   **look at the images in `shots/`** before pushing. The bar is `team/ENGINE-REALISM.md`.
7. **Log it.** Append an entry to `team/engines-log.md`: date, what you did, what's next,
   and any questions for Jatin.
8. **Push and open a PR:**
   ```sh
   git push -u origin friend/<short-topic>
   gh pr create --fill --base main
   ```
   CI runs. If it's green and every file is in the engines zone, the gate **approves and merges it
   automatically**. Check with `gh pr checks` / `gh pr view`.
   If the PR gets the `needs-rebase` label: `git fetch && git rebase origin/main && git push --force-with-lease`.

### When your human wants something outside the engines zone

This includes changes to the UI, backend, database, catalog, app shell, `package.json` or
dependencies, the contract, CI, or this file. It is welcome, but **it never goes into `main` without
Jatin**:

1. Tell your human it's a core change and will wait for Jatin's review.
2. Put it on its **own** branch, `proposal/<short-topic>`, separate from engines work.
3. Run `npm run check`, push, and open a PR whose description explains what and why.
4. The gate labels it `needs-jatin`; Jatin's agent reviews it on its next pull.
5. **Always push proposals**, even half-finished or experimental ones (use a draft PR). Jatin
   wants to see every idea. Never leave core changes only on your machine.

If a `friend/*` PR accidentally touches core files, the gate labels it `needs-jatin` instead of
merging. Move those files to a `proposal/*` branch and push again.

**Never:** push to `main`, merge your own PRs by hand, edit `team/zones.json` to widen the zone,
disable tests, or force-push to anyone else's branch.

## 3. Lead agent protocol (Jatin's agent)

### Every session

1. `git checkout main && git pull --ff-only && npm install`
2. **Review teammate activity:**
   - `gh pr list --state open`: anything labelled `needs-jatin` needs a decision.
   - `gh pr list --state merged --search "head:friend/"`: what auto-merged since last time.
   - New entries and questions in `team/engines-log.md`.
3. For engine PRs that merged, run `npm run shots`, show Jatin the images, ask for a realism score
   out of 100, and record it in `team/engines-log.md`.
4. For each `needs-jatin` PR: check it out, run `npm run check` and `npm run zone`, and summarise
   it for Jatin in plain words with options (merge / merge part / request changes / close).
   Merge only on Jatin's say-so.
5. Do Jatin's work. Commit straight to `main` or via a branch; keep `main` green.
6. **Before every push to main, update `team/BRIEFING.md`:** what changed (in words the teammate's
   agent can act on), the teammate's next tasks, and answers to their questions. That file is
   how the teammate's agent learns what we did.
7. If you change the contract, zones or this protocol, say so at the top of the briefing.

## 4. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run the app at http://localhost:3000 (engines playground at `/engines`) |
| `npm run check` | Typecheck, test and build: must pass before any push |
| `npm test` | Tests only |
| `npm run zone` | Lists changed files as teammate zone or core |
| `npm run shots -- v8` | Screenshots an engine (needs `npm run dev`; first run `npx playwright install chromium`) |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
