# Career Radar 🎯

> **Always watching. Zero clicks.**

Career Radar is a self-hosted, multi-user **live job board monitor** that automatically tracks career pages across the web, extracts tech stacks and experience requirements, and surfaces new openings in real time — without you lifting a finger.

Built with TypeScript, Bun, and plain SQLite (or Turso for cloud). Runs free on Render.

---

## ✨ What It Does

| Feature | Description |
|---|---|
| 🔍 **Multi-board scraping** | Fetches jobs from Ashby, Greenhouse, Lever, Workday, PeopleStrong, Rippling, Workable, SmartRecruiters, GitHub Jobs, Shopify, Netflix, Nvidia, Uber, and more |
| 📡 **Live Monitor** | Background daemon re-syncs your saved portals every N minutes and alerts on new/removed roles |
| 🧠 **Smart extraction** | Detects tech stacks (React, Python, Go…), experience brackets (0–2 yrs, 3–5 yrs…), and role type (Tech & IT / All) |
| 🌍 **Region filter** | Filter by India-only or All regions |
| 🔖 **Bookmarks** | Save or mark jobs as Applied |
| 👤 **Multi-user** | Each user has their own portals, watch configs, and feed — authenticated via Google OAuth |
| 🛡️ **Admin panel** | See all registered users, portal counts, and last-seen timestamps via `/api/admin/users` |
| 💾 **Dual storage** | Local SQLite for dev/self-hosted, Turso cloud SQLite for free-tier container hosts |
| 🐳 **Docker-ready** | Single `Dockerfile`, one-command deploy |

---

## 🖥️ Screenshots

> Live Monitor dashboard — auto-syncing portals, tech stack filters, and real-time feed.

---

## 🚀 Quick Start (Local)

**Requires [Bun](https://bun.sh/) ≥ 1.4**

```sh
# 1. Clone
git clone https://github.com/nagaraju-9391854532/career-radar.git
cd career-radar

# 2. Install
bun install

# 3. Configure
cp .env.example .env
# Edit .env — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see below)

# 4. Run
bun run web
```

Open **http://127.0.0.1:4321** and click **Continue with Google**.

---

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials → OAuth client ID → Web application**
3. Add **Authorised redirect URIs**:
   - Local: `http://127.0.0.1:4321/api/auth/google/callback`
   - Deployed: `https://<your-domain>/api/auth/google/callback`
4. Copy the **Client ID** and **Client Secret** into your `.env`
5. Under **Audience → Publish app** so anyone (not just test users) can sign in

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `PUBLIC_ORIGIN` | ✅ (deployed) | Full URL of your deployed app, e.g. `https://career-radar-xyz.onrender.com` |
| `TURSO_DATABASE_URL` | Cloud only | `libsql://your-db.turso.io` — omit to use local SQLite |
| `TURSO_AUTH_TOKEN` | Cloud only | Turso auth token |
| `ADMIN_EMAIL` | Optional | Your Gmail address — grants access to `/api/admin/users` |
| `AUTH_SECRET` | Optional | 32-byte hex secret for sessions (auto-generated if unset) |
| `PORT` | Optional | Server port (default: `4321`) |
| `HOST` | Optional | Bind host (default: `127.0.0.1`; use `0.0.0.0` in Docker) |
| `JOB_SCRAPER_DATA_DIR` | Optional | Directory for local SQLite and cache (default: `~/.job-scraper/`) |

Copy `.env.example` to `.env` to get started.

---

## 🌐 Free Cloud Deployment (\$0 — No Credit Card)

Deploy permanently in 4 steps using **Render** (free web service) + **Turso** (free cloud SQLite):

### Step 1 — Create a free Turso database

1. Sign up at [turso.tech](https://turso.tech/) (free, no credit card)
2. Create a database, then run:
   ```sh
   turso db show <your-db-name>   # → TURSO_DATABASE_URL
   turso db tokens create <your-db-name>  # → TURSO_AUTH_TOKEN
   ```

### Step 2 — Deploy on Render

1. Sign up at [render.com](https://render.com/) (free, no credit card)
2. Click **New + → Blueprint** → connect your GitHub repo
3. Render auto-detects `render.yaml` (`plan: free`)
4. Fill in the environment variables when prompted:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `PUBLIC_ORIGIN` = `https://<your-service>.onrender.com`
   - `ADMIN_EMAIL` = your Gmail
5. Click **Apply**

### Step 3 — Update Google Cloud Console

Add your Render URL's callback to Google OAuth:
```
https://<your-service>.onrender.com/api/auth/google/callback
```

### Step 4 — Add a free keep-alive ping

Render's free tier sleeps after 15 minutes of inactivity. Keep it awake:

1. Sign up free at [cron-job.org](https://cron-job.org/) or [UptimeRobot](https://uptimerobot.com/)
2. Create a monitor: `GET https://<your-service>.onrender.com/api/health` every **10 minutes**

That's it — your app runs 24/7 within Render's 750 free hours/month. ✅

---

## 🐳 Docker

```sh
docker build -t career-radar .
docker run -p 4321:4321 \
  -e GOOGLE_CLIENT_ID=... \
  -e GOOGLE_CLIENT_SECRET=... \
  -e PUBLIC_ORIGIN=http://localhost:4321 \
  -v career-radar-data:/data \
  career-radar
```

For persistent storage without Turso, mount a volume at `/data`.

### Other Hosts

| Host | Notes |
|---|---|
| **Fly.io** | Use `fly.toml`, create a `/data` volume (`fly volumes create career_radar_data --size 1`), then `fly deploy` |
| **Railway** | Use the `Dockerfile`, set env vars, attach a volume at `/data` |
| **Self-hosted VM** | Docker Compose with a named volume at `/data` |

---

## 🗄️ Supported Job Boards

| Scraper | Examples |
|---|---|
| **Ashby** | Linear, Notion, Scale AI |
| **Greenhouse** | Airbnb, Figma, Stripe |
| **Lever** | Netflix (via Lever) |
| **Workday** | The Hartford, MassMutual, Nike |
| **PeopleStrong** | Infosys BPM, BMW TechWorks India |
| **Rippling** | Rippling |
| **Workable** | Various startups |
| **SmartRecruiters** | Various enterprises |
| **GitHub Jobs** | GitHub |
| **Shopify** | Shopify |
| **Netflix** | Netflix (custom) |
| **Nvidia** | Nvidia |
| **Uber** | Uber |
| **Google** | Google Careers |

---

## 🛠️ Development

```sh
bun run web          # Start dev server
bun run typecheck    # TypeScript check
bun run lint         # Prettier check
bun run lint-fix     # Auto-format
bun run test         # Run all tests
bun run build        # Compile to dist/
```

> Run TypeScript source directly: `bun --conditions=job-scraper-source <file>`  
> Tests require `--isolate` (already set in `bun run test`).

---

## 👤 Admin — View Users

Set `ADMIN_EMAIL=your@gmail.com` in your environment, then (while logged in) visit:

```
GET /api/admin/users
```

Returns all users with name, email, portal count, and last-seen timestamp.

Or query your Turso DB directly:
```sql
SELECT name, email, created_at FROM users ORDER BY created_at;
```

---

## 📁 Project Structure

```
career-radar/
├── src/              # Core scraping library (runtime-agnostic ESM)
│   ├── scrapers/     # One file per job board
│   ├── cli/          # CLI entrypoint
│   └── index.ts      # Public API
├── web/              # Web server & UI
│   ├── server.ts     # HTTP server & API routes
│   ├── db.ts         # SQLite / Turso database layer
│   ├── auth.ts       # Google OAuth + session management
│   ├── watcher.ts    # Background portal sync daemon
│   ├── portals.ts    # Portal CRUD helpers
│   ├── index.html    # Single-page frontend
│   ├── app.js        # Frontend JavaScript
│   └── styles.css    # Styles
├── Dockerfile        # Docker image
├── render.yaml       # Render Blueprint (free tier)
├── fly.toml          # Fly.io config
└── .env.example      # Environment variable template
```

---

## 📄 License

MIT — free to use, fork, and self-host.
