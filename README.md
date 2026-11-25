# Career Radar

**Career Radar** is a multi-user live career portal monitor, tech stack & experience extractor, and multi-board job scraper authenticated with **Google OAuth 2.0**.

## Where Data Is Stored

All mutable user data (`users`, `sessions`, `portals`, `watch_configs`, `portal_snapshots`, `watch_changes`, `bookmarks`) is stored in SQLite:

- **Cloud Free Tier (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` set):** Remote [Turso](https://turso.tech/) libSQL/SQLite over HTTPS so zero data is lost across container restarts on free-tier hosts.
- **Local / Docker Volume (when `TURSO_DATABASE_URL` is unset):** `career-radar.db` inside `JOB_SCRAPER_DATA_DIR` (`~/.job-scraper/` by default, `.data/` in dev, `/data` in Docker/Fly).

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

## \$0 Cloud Deployment (Render Free + Turso + Keep-Alive Ping)

1. **Create a free database on [Turso](https://turso.tech/)** (no credit card required), create a database, and generate its `TURSO_DATABASE_URL` (`libsql://...`) and `TURSO_AUTH_TOKEN`.
2. **Deploy on [Render](https://render.com/)** using **New → Blueprint** from your GitHub repo ([render.yaml](render.yaml), `plan: free`, no credit card required) and enter `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `PUBLIC_ORIGIN` (`https://<your-service>.onrender.com`).
3. **Add `https://<your-service>.onrender.com/api/health` to a free monitor** (such as [cron-job.org](https://cron-job.org/) or [UptimeRobot](https://uptimerobot.com/)) every 10 minutes so the free web service stays awake continuously within Render's 750 free hours/month.
4. **Update Google Cloud Console:** Add `https://<your-service>.onrender.com/api/auth/google/callback` under **Authorised redirect URIs** and publish your app under **Audience → Publish app**.

## Other Docker Hosts

- **Fly.io (`fly.toml`):** Attach a `/data` volume (`fly volumes create career_radar_data --region bom --size 1`), set `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_ORIGIN`, then `fly deploy`.
- **Railway / Docker VM:** Run [Dockerfile](Dockerfile) with a `/data` volume (or `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`).
