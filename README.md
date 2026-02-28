# Relevance Weighted Meeting Scheduler

A modern meeting scheduler built with React, Express, and a local SQLite database, using Google's Material Web components for the UI. No login is required—users enter only their name.

## Architecture
- **Frontend**: React 18, React Router 6, Material Web (Web Components via `@material/web`)
- **Backend**: Node.js/Express REST API
- **Database**: Local SQLite using `better-sqlite3`

## Setup & Running

**Install Dependencies:**
```bash
npm install
```

**Environment Variables:**
Create a `.env` file based on `.env.example`:
```
REACT_APP_API_URL=http://localhost:5000/api
PORT=5000
```

**Development (Frontend & Backend):**
Run both processes concurrently:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000` and the backend will run on `http://localhost:5000`.

**Production:**
Build the frontend and run the Express server:
```bash
npm run build
npm run server
```
