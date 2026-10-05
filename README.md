# Hemline

Hemline is a self-hosted job search assistant. A Chrome extension watches the job posting
you're reading, shows at a glance whether it's worth applying to, and sends it to a backend
that tailors your LaTeX resume to that role and keeps track of the application.

## What it does

- **Spots the job.** On supported job boards (Greenhouse, Ashby, and Otta / Welcome to the
  Jungle once its selectors are finished) the extension pulls out the job title and description.
- **Highlights fit on the page.** Years-of-experience requirements are colour-coded against the
  number you set in the extension's Settings:
  - green: you meet or exceed the requirement
  - yellow: you're within about two years of it
  - red: it asks for clearly more than you have
  
  Tech-stack keywords (React, Kubernetes, PostgreSQL, and so on) are underlined in blue.
- **Sends jobs to the backend.** "Send to Tailor" records the job and queues a tailoring run.
- **Tailors your resume automatically.** An LLM (via OpenRouter) rewrites your base `.tex` resume
  to match the job description without inventing experience. The result is compiled to PDF with
  `tectonic`. If it fails to compile, the backend asks the LLM to repair the LaTeX, up to twice.
- **Lets you steer the result.** Each run keeps every revision. You can see a line diff against
  the previous version, preview the PDF, ask for specific changes in plain text, and approve the
  version you want. Approved PDFs download as `<CANDIDATE_NAME>_Resume.pdf`.
- **Tracks applications.** Every captured job has a status (captured, tailoring, needs review,
  ready, applied, interviewing, rejected, accepted, expired). The backend re-checks active
  listings on a schedule and marks postings that have been removed as expired.
- **Notices relistings.** If a company reposts a role you were rejected for, the tracker flags it
  as "Relisted" and links back to the original posting.

## How it works

```
 Chrome extension ──(job JSON)──▶ Backend (Fastify) ──▶ Postgres
   • detects job                  • REST API             • jobs, runs, revisions,
   • highlights YoE / stack       • pg-boss queue         liveness checks
   • Send to Tailor               │                       (pg-boss uses it too)
                                  ├─▶ OpenRouter (LLM) ── rewrites .tex
                                  ├─▶ tectonic ───────── compiles .tex → PDF
                                  └─▶ Playwright ─────── headless liveness checks
 Dashboard (Vue) ◀──────────────── /api ──────────────── Backend
   • tracker, diffs, approve
```

- **Extension** (`apps/extension`): a Vue popup, a content script that highlights the posting
  page, and a settings tab (years of experience, backend URL). It has no API keys.
- **Backend** (`apps/backend`): a Fastify server that owns all state and secrets. Tailoring and
  liveness checks run as background jobs on pg-boss, a queue stored in Postgres, so there's no
  Redis to run.
- **Dashboard** (`apps/dashboard`): a Vue app for the tracker, the diff viewer, and the resume
  upload page.
- **Shared types** (`packages/shared-types`): DTOs and status enums used by all three.

Your base resume lives in the backend as a versioned `.tex` document. Every tailored version is
derived from the current base, so you can change your master resume later without losing the
history of what you sent to each company.

## Requirements

- Node.js 22 or newer and pnpm 10 (`corepack enable` gives you pnpm)
- Postgres 17 (the version the compose file uses), either in Docker or installed locally
- Docker with the Compose plugin (optional, for the containerised setup)
- [`tectonic`](https://tectonic-typesetting.github.io) on your `PATH` (for running the backend
  outside Docker). On Arch: `sudo pacman -S tectonic`.
- An [OpenRouter](https://openrouter.ai) API key. Tailoring costs whatever the model you choose
  charges per request.
- Chrome or any Chromium-based browser for the extension

## Self-hosting

### 1. Configure

```bash
git clone <this repo> hemline && cd hemline
cp .env.example .env
```

Edit `.env`. These are the variables the backend reads:

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | Postgres connection string, e.g. `postgres://hemline:hemline@localhost:5432/hemline` |
| `OPENROUTER_API_KEY` | yes | — | Your OpenRouter key. Only the backend holds it. |
| `OPENROUTER_MODEL` | no | `anthropic/claude-sonnet-4.5` | Any model slug from OpenRouter |
| `CANDIDATE_NAME` | no | `Candidate` | Used in the downloaded filename, e.g. `Jane Doe` → `Jane_Doe_Resume.pdf` |
| `PORT` | no | `3000` | Port the backend listens on |
| `STORAGE_DIR` | no | `./storage` | Where compiled PDFs are written |
| `TECTONIC_BIN` | no | `tectonic` | Path to the tectonic binary if it isn't on `PATH` |
| `RECHECK_CRON` | no | `0 */6 * * *` | How often active listings are re-checked (every 6 hours) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Compose only | `hemline` | Credentials for the bundled Postgres container |

### 2. Start Postgres

With Docker Compose (this also starts the backend container; see step 6 for the container path):

```bash
docker compose up -d postgres
```

Without the Compose plugin, run the same database directly:

```bash
docker run -d --name hemline-pg \
  -e POSTGRES_USER=hemline -e POSTGRES_PASSWORD=hemline -e POSTGRES_DB=hemline \
  -p 5432:5432 -v hemline-pg:/var/lib/postgresql/data \
  postgres:17-alpine
```

If you run Postgres yourself, create a database and point `DATABASE_URL` at it.

### 3. Install and migrate

```bash
pnpm install
pnpm --filter backend db:migrate
```

Run the migrate step again after pulling new changes; it only applies migrations that haven't run.

### 4. Start the backend

```bash
pnpm --filter backend dev       # hot reload while developing
# or
pnpm --filter backend start     # plain run
```

Check it's up:

```bash
curl http://localhost:3000/api/health   # {"ok":true}
```

### 5. Upload your base resume

Your resume must be a LaTeX document. Upload it through the dashboard or with curl:

```bash
curl -X POST http://localhost:3000/api/resume \
  -H 'content-type: application/json' \
  -d "$(python3 -c 'import json,sys;print(json.dumps({"texContent":open("resume.tex").read(),"filename":"resume.tex"}))')"
```

Tailoring is refused until a base resume exists.

### 6. Build and load the extension

```bash
pnpm --filter extension build
```

In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and
select `apps/extension/dist`. Then open the extension's **Settings** tab:

- **Your Years of Experience**: the number the colour highlights compare against.
- **Backend Base URL**: `http://localhost:3000`, or wherever you're hosting the backend.

Open a job posting on a supported board and the page highlights automatically. Use **Send to
Tailor** to queue a tailoring run.

### 7. Run the dashboard

```bash
pnpm --filter dashboard dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The dashboard proxies `/api` to the
backend on port 3000. A production build of the dashboard is produced by
`pnpm --filter dashboard build`, but the backend does not serve it yet, so for now the dev server
is the way to use it.

### Running everything in Docker

`docker compose up -d` builds the backend image and starts it next to Postgres. The image
includes `tectonic` and a headless Chromium for liveness checks, so you don't have to install
either on the host. The backend reads `.env`, and the compose file points `DATABASE_URL` at the
Postgres container. Migrations are not run automatically, so run them once after the first start:

```bash
docker compose exec backend pnpm db:migrate
```

Compiled PDFs are kept in a named volume (`backend-storage`).

## Using it day to day

1. Browse job postings. Highlights show how each one lines up with your years of experience and
   stack.
2. For roles you want, click **Send to Tailor** in the extension popup.
3. Open the dashboard. When the run reaches **needs review**, read the diff and the PDF preview.
4. Either describe the changes you want and submit them, or approve the version.
5. Approve downloads the PDF. Mark the job as applied, interviewing, rejected, and so on from the
   job page as things progress.

## Development

```bash
pnpm lint                       # eslint across the workspace
pnpm --filter extension build   # vue-tsc + vite build for the extension
pnpm --filter dashboard build
pnpm --filter backend exec tsc -b --noEmit
```

Each app has its own `package.json`. The extension and dashboard use Vite; the backend runs
directly with `tsx`.

## Known limitations

- **Otta / Welcome to the Jungle** selectors are placeholders. The extension's `ats-detector.ts`
  and the backend's `checks/selectors.ts` need the real DOM selectors from a live posting, and the
  content-script match pattern in `apps/extension/manifest.config.ts` needs Otta's real domain.
- **Dashboard hosting**: the backend doesn't serve the dashboard's static build yet; use the Vite
  dev server.
- **Single user, no authentication.** Anyone who can reach the backend's port can read and change
  your data. Keep it on localhost or behind your own network controls.
- **Tailoring quality depends on the model.** The prompts forbid inventing experience, but always
  read the diff before you approve.
