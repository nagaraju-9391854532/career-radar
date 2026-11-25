# Career Radar

**Career Radar** is a multi-user live career portal monitor, tech stack & experience extractor, and multi-board job scraper.

## Key Features

- **User Accounts & Isolation:** Built-in Sign Up / Sign In (`scrypt` password hashing, signed `HttpOnly` sessions, and SQLite via `bun:sqlite`) so each user manages their own saved career portals, filters, change logs, and bookmarks.
- **Auto-Watch Portals:** Background watcher periodically checks each user's saved career portals (sharing short-lived scrapes across users to avoid rate limits) and pushes live updates over per-user SSE (`/api/watch/events`).
- **Live Change Diffing:** Detects newly posted (`New`), modified (`Updated`), and closed openings with a persistent change feed.
- **First-Level Filtering:** Filter before per-job detail extraction by **Region** (`India only` / `All regions`), **Experience** (`0–5 yrs`, `0–2 yrs`, `All`), and **Role focus** (`Tech & IT only` / `All roles`), plus ascending experience sorting by default.
- **My Skills Matcher & Bookmarks:** Score and highlight matching stack skills, mark openings as `Saved` or `Applied` persistently in SQLite, and export filtered lists as JSON, Markdown, or CSV.
- **Multi-Board Support:** Supports Greenhouse, Ashby, Lever, Workday, SmartRecruiters, Workable, Rippling, Google Careers, Netflix, Shopify, Uber, GitHub, Nvidia, and PeopleStrong.
- **Atelier Paper & Dark Mode:** Signature Editorial UI with switchable light/dark themes.

## Local Quick Start

Requires [Bun](https://bun.sh/):

```sh
bun install
bun run web
```

Then open [http://127.0.0.1:4321](http://127.0.0.1:4321) and create your account.

## Cloud Deployment

Because **Career Radar** runs a background Auto-Watch scheduler, SSE streams, and SQLite storage (`JOB_SCRAPER_DATA_DIR/career-radar.db`), deploy it to a container host with a persistent volume:

- **Fly.io (`fly.toml` included):**
  ```sh
  fly launch --no-deploy
  fly volumes create career_radar_data --region bom --size 1
  fly secrets set AUTH_SECRET="$(openssl rand -hex 32)"
  fly deploy
  ```
- **Render (`render.yaml` included):** Push to GitHub → **New Blueprint** → select repo → deploys Docker service with `/data` persistent disk and generated `AUTH_SECRET`.
- **Railway:** Connect GitHub repo (uses `Dockerfile`) → attach a Volume mounted at `/data` → set `HOST=0.0.0.0`, `JOB_SCRAPER_DATA_DIR=/data`, and `AUTH_SECRET`.

## Development Checks

```sh
bun run typecheck
bun run test
bun run build
```
