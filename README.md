# Career Radar

**Career Radar** is a local-first live career portal monitor, tech stack & experience extractor, and multi-board job scraper.

## Key Features

- **Auto-Watch Portals:** Background watcher periodically checks saved career portal URLs (bypassing stale disk cache) and pushes live updates over SSE (`/api/watch/events`).
- **Live Change Diffing:** Detects newly posted (`New`), modified (`Updated`), and closed openings with a persistent change feed.
- **First-Level Filtering:** Filter before per-job detail extraction by **Region** (`India only` / `All regions`), **Experience** (`0–5 yrs`, `0–2 yrs`, `All`), and **Role focus** (`Tech & IT only` / `All roles`), plus ascending experience sorting by default.
- **Tech & Experience Extraction:** Extracts required technologies and experience statements cleanly without noisy boilerplate.
- **My Skills Matcher & Bookmarks:** Score and highlight matching stack skills, save or mark roles as `Applied` persistently on disk, and export filtered lists as JSON, Markdown, or CSV.
- **Multi-Board Support:** Supports Greenhouse, Ashby, Lever, Workday, SmartRecruiters, Workable, Rippling, Google Careers, Netflix, Shopify, Uber, GitHub, Nvidia, and PeopleStrong.
- **Atelier Paper & Dark Mode:** Clean Signature Editorial UI with switchable light/dark themes.

## Quick Start

Requires [Bun](https://bun.sh/) (or Node 22+ for built JS output):

```sh
bun install
bun run web
```

Then open [http://127.0.0.1:4321](http://127.0.0.1:4321).

## CLI Usage

```sh
bun run cli Airbnb
bun run cli https://careers-bmwtechworks.peoplestrong.com/job/joblist
```

## Development Checks

```sh
bun run typecheck
bun run test
bun run build
```
