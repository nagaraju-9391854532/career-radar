# Career Radar

**Career Radar** is a multi-user live career portal monitor, tech stack & experience extractor, and multi-board job scraper authenticated with **Google OAuth 2.0**.

## Where Data Is Stored

All mutable state lives in `JOB_SCRAPER_DATA_DIR`:

- **SQLite database:** `career-radar.db` (`users`, `sessions`, `portals`, `watch_configs`, `portal_snapshots`, `watch_changes`, `bookmarks`)
- **HTTP cache:** `cache/`
- **Cookie signing key:** `.auth-secret` (unless `AUTH_SECRET` is set)

Defaults by environment:

- **Local Windows/macOS/Linux (when `JOB_SCRAPER_DATA_DIR` is unset):** `~/.job-scraper/` (e.g. `C:\Users\<you>\.job-scraper\career-radar.db`)
- **Repo-local dev:** set `JOB_SCRAPER_DATA_DIR=.data` in `.env`
- **Cloud / Docker (`Dockerfile`, `fly.toml`, `render.yaml`):** `/data/career-radar.db` on a persistent disk volume

## Google OAuth Setup

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** → **Web application**.
3. Add Authorized Redirect URIs:
   - Local: `http://127.0.0.1:4321/api/auth/google/callback`
   - Deployed: `https://<your-domain>/api/auth/google/callback`
4. Create `.env` from `.env.example` and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Local Quick Start

Requires [Bun](https://bun.sh/):

```sh
bun install
bun run web
```

Open [http://127.0.0.1:4321](http://127.0.0.1:4321) and click **Continue with Google**.

## Cloud Deployment

- **Fly.io (`fly.toml`):**
  ```sh
  fly launch --no-deploy
  fly volumes create career_radar_data --region bom --size 1
  fly secrets set AUTH_SECRET="$(openssl rand -hex 32)" GOOGLE_CLIENT_ID="..." GOOGLE_CLIENT_SECRET="..."
  fly deploy
  ```
- **Render (`render.yaml`):** New Blueprint from GitHub → enter `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` when prompted.
- **Railway:** Connect GitHub repo (`Dockerfile`) → attach Volume at `/data` → set `HOST=0.0.0.0`, `JOB_SCRAPER_DATA_DIR=/data`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
