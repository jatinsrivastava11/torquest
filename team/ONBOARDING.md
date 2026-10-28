# Onboarding (teammate)

One-time setup, about 15 minutes. Works on macOS, Windows and Linux.

## 1. Accept the invite

Jatin adds you as a collaborator on GitHub. Accept the email invite, or open
https://github.com/jatinsrivastava11/torquest/invitations.

## 2. Install the tools

| Tool | Get it | Check |
|---|---|---|
| Git | https://git-scm.com/downloads | `git --version` |
| Node.js 22 LTS | https://nodejs.org | `node -v` (20 or newer) |
| GitHub CLI | https://cli.github.com | `gh --version` |

Then log in once: `gh auth login` (GitHub.com → HTTPS → log in with a browser).

## 3. Clone into a folder of your choice

```sh
cd <the folder where you keep projects>
git clone https://github.com/jatinsrivastava11/torquest.git
cd torquest
npm install
npm run dev
```

Open http://localhost:3000/engines. You should see a 3D V8.

## 4. Keep your email private (recommended)

The repo is public, so your commit email is visible. Use GitHub's no-reply address:

```sh
git config user.name "<your first name>"
git config user.email "<id>+<username>@users.noreply.github.com"
```

The exact address is in GitHub → Settings → Emails.

## 5. Start your AI agent in the `torquest` folder

Open your AI coding tool (Claude Code, Cursor, Codex, Copilot…) **inside the `torquest` folder**
and say:

> Read AGENTS.md and follow the teammate protocol.

Do the same at the start of every session. The agent pulls the latest code, tells you what changed
and what today's work is, asks you what to do, and handles branches, tests and PRs.
