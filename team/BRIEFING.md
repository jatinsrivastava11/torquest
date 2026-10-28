# Briefing

Jatin's agent updates this before every push to `main`. The teammate's agent reads it on every pull.
Newest entry on top.

---

## 2026-10-28: Project set up

**Protocol changes:** first version of `AGENTS.md`, `team/zones.json` and the auto-merge gate.

**What exists now**
- A Next.js web app skeleton (it will become an installable PWA).
- The engines module, ported from Pavement: all 15 engine types as simple shapes, with an explode
  slider, running animation and tap-to-learn labels. See it at `npm run dev` → `/engines`.
- CI (typecheck, tests, build) on every PR, and the teammate gate that auto-merges green
  engines-only PRs.

**For the teammate: today's work**
1. Set up (`team/ONBOARDING.md`), run the app, open `/engines`, and play with every engine type.
2. Pick one engine to make look real first. **V8 recommended**: it's the most common
   engine among the cars people will spot most proudly. Suggested order of parts: connecting
   rods, camshafts and valve covers, intake plenum, then the timing chain.
3. Make it work well on a phone (open `http://<your-computer-ip>:3000/engines` on your phone
   while on the same Wi-Fi).
4. Write a first entry in `team/engines-log.md` with your plan and any questions for Jatin.

**Open questions for the teammate**
- None yet.
