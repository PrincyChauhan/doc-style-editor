# DocStyle — Collaborative Document Editor

A lightweight, full-stack collaborative document editor inspired by Google Docs. Built with React, Node.js, PostgreSQL, and Tiptap.

---

## Live Demo

> Deploy instructions in the [Deployment](#deployment) section below.

**Demo accounts (seeded by default):**

| Email | Password | Role in demo |
|---|---|---|
| alice@demo.com | demo1234 | Owns two sample docs |
| bob@demo.com | demo1234 | Has edit access to "Project Meeting Notes" |

---

## Features

| Feature | Status |
|---|---|
| Rich text editing (bold, italic, underline, headings, lists, alignment) | ✅ |
| Auto-save with debounced persistence | ✅ |
| Document creation, rename, delete | ✅ |
| Dashboard with owned vs. shared tabs + search | ✅ |
| File import (.txt, .md → new editable document) | ✅ |
| File attachment to existing documents | ✅ |
| Sharing with view / edit permissions | ✅ |
| Revoke access | ✅ |
| View-only mode for shared viewers | ✅ |
| JWT authentication (register + login) | ✅ |
| 19 automated API tests | ✅ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, Tailwind CSS 4, React Router 7 |
| Rich text editor | Tiptap 2 (ProseMirror-based) |
| Backend | Node.js 24, Express 4 |
| Database | PostgreSQL (via `pg` driver) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| File uploads | `multer` |
| Input validation | `express-validator` |
| Tests | Jest + Supertest (19 tests) |

---

## How It Works

```
Browser (React SPA)
      │  HTTP /api/*
      ▼
Vite dev proxy  ──►  Express API  (port 3001)
                           │
                           ▼
                     PostgreSQL DB
                    (tables auto-created on startup)
```

1. **Auth** — User registers/logs in → receives a JWT stored in `localStorage`. Every subsequent API call sends it as `Authorization: Bearer <token>`.
2. **Dashboard** — Fetches `/api/documents` → renders owned documents and documents shared with the user in separate tabs.
3. **Editor** — Opens `/api/documents/:id`, hydrates Tiptap with stored HTML. On every keystroke, a 1.5 s debounce fires `PATCH /api/documents/:id` with the latest HTML content.
4. **Sharing** — Owner POSTs to `/api/documents/:id/shares` with a username/email and `view|edit` permission. Shared user sees the doc in their Shared tab with the appropriate role badge. Backend enforces permissions on every write.
5. **File import** — User uploads a `.txt` or `.md` file; backend parses it to HTML and creates a new document.

---

## Local Setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- PostgreSQL running locally (port 5432)

### 1. Clone / unzip

```bash
cd doc-syle
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` (already present in repo with local defaults):

```env
DATABASE_URL=postgresql://nikunjrathod:1234@localhost:5432/postgres
JWT_SECRET=ajaia-doc-editor-super-secret-jwt-key-2024
PORT=3001
NODE_ENV=development
```

> Copy `.env.example` → `.env` and fill in your own Postgres credentials if different.

```bash
node src/seed.js      # Creates tables + seeds demo accounts
npm run dev           # Starts API on http://localhost:3001
```

### 3. Frontend setup

```bash
# In a new terminal tab:
cd frontend
npm install
npm run dev           # Starts on http://localhost:5173
```

The Vite dev server proxies all `/api` requests to `http://localhost:3001` — no CORS setup needed.

### 4. Open in browser

```
http://localhost:5173
```

- **alice@demo.com / demo1234** → owns "Welcome to DocStyle" and "Project Meeting Notes"
- **bob@demo.com / demo1234** → has edit access to "Project Meeting Notes" (demonstrates sharing)

---

## Running Tests

```bash
cd backend
npm test
```

The test suite creates/uses a `docstyle_test` database (must exist — `CREATE DATABASE docstyle_test;`). It truncates all tables before running so tests are always isolated.

Expected output: **19 tests passing** — auth, CRUD, access control, sharing.

---

## Project Structure

```
doc-syle/
├── backend/
│   ├── src/
│   │   ├── app.js              Express app (CORS, routes, error handling)
│   │   ├── server.js           Entry point (initSchema → listen)
│   │   ├── lib/
│   │   │   ├── db.js           pg Pool + initSchema() (CREATE TABLE IF NOT EXISTS)
│   │   │   └── cuid.js         Lightweight ID generator
│   │   ├── middleware/
│   │   │   └── auth.js         JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.js         POST /register, POST /login, GET /me
│   │   │   ├── documents.js    GET|POST /documents, GET|PATCH|DELETE /documents/:id
│   │   │   ├── shares.js       POST|DELETE /documents/:id/shares
│   │   │   └── upload.js       POST /upload/document, POST /upload/attachment/:id
│   │   ├── tests/
│   │   │   ├── setup.js        Sets test env vars
│   │   │   └── auth.test.js    19 API tests (Jest + Supertest)
│   │   └── seed.js             Creates tables + inserts demo data
│   ├── uploads/                Uploaded files (gitignored except .gitkeep)
│   ├── .env                    Local credentials (gitignored)
│   ├── .env.example            Safe template to commit
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js       Axios instance (token injection, 401 handling)
│   │   │   ├── auth.js         register / login / getMe
│   │   │   └── documents.js    list / get / create / update / delete / share / upload
│   │   ├── components/
│   │   │   ├── EditorToolbar.jsx   Tiptap formatting toolbar
│   │   │   └── SharePanel.jsx      Share overlay (add/revoke users, copy link)
│   │   ├── context/
│   │   │   └── AuthContext.jsx     JWT auth state + signIn/signOut
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx   Doc list, tabs, search, file import
│   │   │   └── EditorPage.jsx      Tiptap editor, auto-save, rename, attachments
│   │   ├── App.jsx             Routes (PrivateRoute / PublicRoute guards)
│   │   ├── main.jsx
│   │   └── index.css           Tailwind + Tiptap content styles
│   ├── vite.config.js          Vite + Tailwind plugin + /api proxy
│   └── package.json
│
├── README.md
├── ARCHITECTURE.md
├── AI_WORKFLOW.md
└── SUBMISSION.md
```

---

## Supported File Types for Import

Only `.txt` and `.md` files are supported (max 5 MB each).

| Type | Behaviour |
|---|---|
| `.txt` | Each double-newline paragraph becomes a `<p>` block |
| `.md` | Headings, bold, italic, and lists converted to HTML |

DOCX is not supported — would require `mammoth.js`.

---

## Deployment (Production)

### Postgres on Render / Railway / Supabase

1. Provision a Postgres instance and get the connection string.
2. Set env vars:
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   JWT_SECRET=<strong-random-secret>
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.com
   ```
3. On first deploy: `node src/seed.js`

### Serve frontend from Express (single dyno)

```bash
cd frontend && npm run build
cp -r dist ../backend/public
```

Add to `backend/src/app.js` before the 404 handler:
```js
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../public/index.html'))
  );
}
```

---

## Known Limitations / What I'd Build Next

- **Real-time collaboration** — Socket.io + Yjs CRDT for live cursors
- **DOCX import** — `mammoth.js`
- **Export to PDF** — puppeteer or jsPDF
- **Version history** — content snapshots per save
- **Image embeds** — Tiptap Image extension + S3/local storage
- **Comments** — Tiptap comment extension
