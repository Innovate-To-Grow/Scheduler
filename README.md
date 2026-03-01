# Relevance Weighted Meeting Scheduler

A modern meeting scheduler built with Next.js and SQLite, using Google's Material Web components for the UI. No login is required—users enter only their name.

Organizers create events with configurable days, time ranges, and modes (in-person, virtual, or both). Participants fill in their availability on a schedule grid. Organizers can weight participants by relevance and see a weighted aggregate view.

## Architecture

- **Framework**: Next.js 15 (App Router) — single process for frontend and API
- **Frontend**: React 18, Material Web (`@material/web`)
- **Backend**: Next.js API Route Handlers (`app/api/`)
- **Database**: Local SQLite via `better-sqlite3`

## Setup & Running

**Install Dependencies:**

```bash
npm install
```

**Development:**

```bash
npm run dev
```

Runs at `http://localhost:3000`. No `.env` file needed — the frontend uses relative API paths and the backend runs in the same process.

**Production:**

```bash
npm run build
npm start
```

**Testing & Linting:**

```bash
npm test              # Run Jest test suite
npm run lint          # Run ESLint
npm run format:check  # Check Prettier formatting
```
