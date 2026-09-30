# DocStyle — Collaborative Document Editor

A full-stack collaborative document editor inspired by Google Docs.  
Built with **React + Vite**, **Node.js + Express**, and **PostgreSQL**.

---

## Demo Accounts

These are seeded automatically when you run `node src/seed.js`:

| Email | Password | Access |
|---|---|---|
| alice@demo.com | demo1234 | Owns "Welcome to DocStyle" and "Project Meeting Notes" |
| bob@demo.com | demo1234 | Has edit access to "Project Meeting Notes" (shared by Alice) |

---

## Features

- ✅ Rich text editing — bold, italic, underline, strikethrough, headings (H1/H2/H3), bullet & numbered lists, blockquote, inline code, text alignment
- ✅ Auto-save — content saves automatically 1.5s after you stop typing
- ✅ Create, rename, delete documents
- ✅ Dashboard with "My Docs" / "Shared" tabs and live search
- ✅ Share documents with view or edit permission (by username or email)
- ✅ Revoke access
- ✅ View-only mode for shared viewers (toolbar hidden, edits blocked on backend too)
- ✅ Import `.txt` or `.md` files as new editable documents
- ✅ Attach files to existing documents
- ✅ JWT authentication (register + login)
- ✅ 19 automated API tests

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, Tailwind CSS 4, React Router 7 |
| Rich text editor | Tiptap 2 (ProseMirror) |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL (via `pg` driver) |
| Auth | JWT + bcryptjs |
| File uploads | multer |
| Validation | express-validator |
| Tests | Jest + Supertest |

---

## How the Two Modes Work

This app supports two running modes — the same codebase works for both:

| Mode | How it runs | Who uses it |
|---|---|---|
| **Local development** | Backend on `:3001`, Frontend on `:5173` (Vite dev server with proxy) | You, locally |
| **Production** | Backend on `:3001` serves the built React app — one URL for everything | Render / any server |

The switch is controlled by `NODE_ENV` in `backend/.env`:
- `NODE_ENV=development` → local mode (Vite proxy handles `/api` routing)
- `NODE_ENV=production` → backend serves `backend/public/` as static files

---

## Local Setup (Run on Your Machine)

### Prerequisites

- **Node.js ≥ 18** — check with `node -v`
- **PostgreSQL running locally** on port 5432

### Step 1 — Clone / unzip the project

```bash
cd doc-syle
```

### Step 2 — Configure the database

Edit `backend/.env` with your local Postgres credentials:

```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE
JWT_SECRET=any-long-secret-string-here
PORT=3001
NODE_ENV=development
```

Example (what's used in development):
```env
DATABASE_URL=postgresql://nikunjrathod:1234@localhost:5432/postgres
```

> Copy `.env.example` → `.env` as a starting point if `.env` doesn't exist.

### Step 3 — Start the backend

```bash
cd backend
npm install
node src/seed.js    # Creates tables + seeds demo accounts (run once)
npm run dev         # Starts API on http://localhost:3001
```

You should see:
```
✅ Database schema ready
🚀 Server running on http://localhost:3001
```

### Step 4 — Start the frontend

Open a **second terminal tab**:

```bash
cd frontend
npm install
npm run dev         # Starts on http://localhost:5173
```

You should see:
```
VITE v8.x  ready in 150ms
➜  Local: http://localhost:5173/
```

### Step 5 — Open in browser

```
http://localhost:5173
```

Log in with `alice@demo.com / demo1234` to see sample documents.  
Log in with `bob@demo.com / demo1234` to see a document shared with edit access.

> **Note:** The Vite dev server automatically proxies all `/api/*` requests to `http://localhost:3001` — you don't need to configure anything else.

---

## Running Tests

```bash
# First create the test database (one-time setup)
psql -U YOUR_USER -c "CREATE DATABASE docstyle_test;"

# Then run tests
cd backend
npm test
```

Expected: **19 tests passing** — auth, CRUD, access control, sharing.

---

## Project Structure

```
doc-syle/
├── backend/
│   ├── src/
│   │   ├── app.js              Express app (CORS, routes, prod static serving)
│   │   ├── server.js           Entry point (schema init → listen)
│   │   ├── lib/
│   │   │   ├── db.js           pg Pool + CREATE TABLE IF NOT EXISTS on startup
│   │   │   └── cuid.js         Lightweight ID generator
│   │   ├── middleware/
│   │   │   └── auth.js         JWT verification
│   │   ├── routes/
│   │   │   ├── auth.js         Register / Login / Me
│   │   │   ├── documents.js    CRUD + list
│   │   │   ├── shares.js       Share / Revoke
│   │   │   └── upload.js       Import file / Attach file
│   │   ├── tests/
│   │   │   ├── setup.js        Test env vars
│   │   │   └── auth.test.js    19 API tests
│   │   └── seed.js             Creates tables + inserts demo data
│   ├── public/                 Built React app goes here (production only)
│   ├── uploads/                Uploaded attachment files
│   ├── .env                    Your local credentials (gitignored)
│   ├── .env.example            Safe template — copy this to .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js       Axios instance (token injection, 401 handling)
│   │   │   ├── auth.js         register / login / getMe
│   │   │   └── documents.js    list / get / create / update / delete / share / upload
│   │   ├── components/
│   │   │   ├── EditorToolbar.jsx   Full Tiptap formatting toolbar
│   │   │   └── SharePanel.jsx      Share overlay (add users, revoke, copy link)
│   │   ├── context/
│   │   │   └── AuthContext.jsx     JWT auth state (signIn / signOut)
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx   Doc list, tabs, search, import file
│   │   │   └── EditorPage.jsx      Tiptap editor, auto-save, rename, share
│   │   ├── App.jsx             Routes with PrivateRoute / PublicRoute guards
│   │   ├── main.jsx
│   │   └── index.css           Tailwind + Tiptap content styles
│   ├── vite.config.js          Vite + Tailwind plugin + /api proxy to :3001
│   └── package.json
│
├── render.yaml                 Render deployment config (auto-configures everything)
├── README.md
├── ARCHITECTURE.md
├── AI_WORKFLOW.md
└── SUBMISSION.md
```

---

## Deploying Live (Render + Neon)

**Architecture:**
```
Browser → Render (frontend + backend) → Neon (PostgreSQL, never expires)
```

- **Render** hosts the Node.js server which also serves the built React app — one URL
- **Neon** provides a free PostgreSQL database that never expires (unlike Render's built-in DB)
- No credit card required for either service

---

### Step 1 — Create Neon database (free, never expires)

1. Go to **neon.tech** → Sign up with GitHub
2. Click **Create Project** → name it `docstyle` → **Create Project**
3. On the dashboard → click **Connection Details** → copy the **Connection string**:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
   Save this — you need it in Step 4.

---

### Step 2 — Push code to GitHub

```bash
cd doc-syle
git init
git add .
git commit -m "initial commit"
```
Go to **github.com** → New repository → name it `doc-syle` → Create, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/doc-syle.git
git branch -M main
git push -u origin main
```

---

### Step 3 — Create Render account

Go to **render.com** → Sign up with GitHub.

---

### Step 4 — Create Web Service on Render

1. Render dashboard → **New +** → **Web Service**
2. Connect your GitHub repo → select `doc-syle`
3. Set these values:

| Field | Value |
|---|---|
| Name | `docstyle-app` |
| Root Directory | `backend` |
| Runtime | `Node` |
| Build Command | `npm install && cd ../frontend && npm install && npm run build && cd ../backend && cp -r ../frontend/dist/. ./public` |
| Start Command | `node src/server.js` |
| Plan | `Free` |

4. Add Environment Variables:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | paste your Neon connection string from Step 1 |
| `JWT_SECRET` | any long random string e.g. `docstyle-secret-abc123xyz` |

5. Click **Create Web Service** → wait ~3-4 minutes for first deploy

---

### Step 5 — Seed demo accounts (once)

Render dashboard → your service → **Shell** tab:
```bash
node src/seed.js
```
Output:
```
✅ Database schema ready
✅ Seed complete!
   alice@demo.com / demo1234
   bob@demo.com   / demo1234
```

---

### Step 6 — Open your live app

```
https://docstyle-app.onrender.com
```

> **Free tier note:** Render's free web service sleeps after 15 min of inactivity.
> First request after sleep takes ~30 seconds. Neon database never expires.

---

### Redeploy after code changes

Just push to GitHub — Render auto-deploys on every push to `main`:
```bash
git add .
git commit -m "your change"
git push
```

---

## Supported File Types

| Type | Behaviour |
|---|---|
| `.txt` | Each paragraph (double newline) becomes a `<p>` block |
| `.md` | Headings, bold, italic, lists converted to HTML |

Max file size: **5 MB**. DOCX is not supported.

---

## What I'd Build Next

- Real-time collaboration (Socket.io + Yjs CRDT)
- Export to PDF / Markdown
- DOCX import (mammoth.js)
- Image embeds in documents
- Document version history
- Comments and suggestions
