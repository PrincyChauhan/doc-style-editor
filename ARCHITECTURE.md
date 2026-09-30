# Architecture Note — DocStyle

## Overview

DocStyle is a monorepo with two independently runnable services:

- **`/backend`** — Express REST API backed by PostgreSQL
- **`/frontend`** — React SPA served by Vite (dev) or Express static files (prod)

The two services communicate over HTTP. In development, Vite's built-in proxy forwards all `/api/*` requests from port 5173 to the Express server on port 3001 — so the browser never makes a cross-origin request and CORS is a non-issue locally.

---

## Tech Stack (actual versions)

| Layer | Tech | Version |
|---|---|---|
| Runtime | Node.js | 24.x |
| API framework | Express | 4.x |
| Database | PostgreSQL | local (15/16) |
| DB driver | `pg` (node-postgres) | 8.x |
| Auth | `jsonwebtoken` + `bcryptjs` | 9.x / 2.x |
| Validation | `express-validator` | 7.x |
| File upload | `multer` | 1.x |
| Frontend bundler | Vite | 8.x |
| UI framework | React | 18.x |
| Routing | React Router | 7.x |
| CSS | Tailwind CSS | 4.x |
| Rich text | Tiptap | 2.x (ProseMirror-based) |
| HTTP client | Axios | 1.x |
| Tests | Jest + Supertest | 29.x / 7.x |

---

## Database Schema

All tables are created automatically on server startup via `initSchema()` in `src/lib/db.js` using `CREATE TABLE IF NOT EXISTS` — no migration CLI required.

```sql
users (
  id           TEXT PRIMARY KEY,          -- custom cuid
  email        TEXT UNIQUE NOT NULL,
  username     TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,             -- bcrypt hash
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
)

documents (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT 'Untitled Document',
  content      TEXT NOT NULL DEFAULT '',  -- Tiptap HTML
  owner_id     TEXT NOT NULL → users.id ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
)

shares (
  id           TEXT PRIMARY KEY,
  document_id  TEXT NOT NULL → documents.id ON DELETE CASCADE,
  user_id      TEXT NOT NULL → users.id ON DELETE CASCADE,
  permission   TEXT NOT NULL DEFAULT 'view',   -- 'view' | 'edit'
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)                 -- upserted with ON CONFLICT
)

attachments (
  id            TEXT PRIMARY KEY,
  document_id   TEXT NOT NULL → documents.id ON DELETE CASCADE,
  filename      TEXT NOT NULL,              -- stored filename on disk
  original_name TEXT NOT NULL,              -- user's original filename
  mime_type     TEXT NOT NULL,
  size          INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
)
```

---

## API Surface

| Method | Route | Auth | Who can call |
|---|---|---|---|
| POST | /api/auth/register | — | Anyone |
| POST | /api/auth/login | — | Anyone |
| GET | /api/auth/me | ✓ | Token holder |
| GET | /api/documents | ✓ | Returns owned + shared |
| POST | /api/documents | ✓ | Any authenticated user |
| GET | /api/documents/:id | ✓ | Owner or shared user |
| PATCH | /api/documents/:id | ✓ | Owner or user with `edit` permission |
| DELETE | /api/documents/:id | ✓ | Owner only |
| POST | /api/documents/:id/shares | ✓ | Owner only |
| DELETE | /api/documents/:id/shares/:shareId | ✓ | Owner only |
| POST | /api/upload/document | ✓ | Any authenticated user |
| POST | /api/upload/attachment/:docId | ✓ | Owner or `edit` user |
| GET | /api/health | — | Anyone |

---

## Frontend Component Map

```
App (BrowserRouter)
├── PublicRoute wrapper
│   ├── /login   → LoginPage
│   └── /register → RegisterPage
└── PrivateRoute wrapper  (redirects to /login if no JWT)
    ├── /          → DashboardPage
    │   ├── Header (logo, username, sign out)
    │   ├── Action bar (New doc, Import file)
    │   ├── Search + Tab bar (All / My docs / Shared)
    │   └── Document grid → DocCard (role badge, delete button)
    └── /docs/:id  → EditorPage
        ├── NavBar (back, title rename, save status, role badge, share btn)
        ├── Attachment drawer (paperclip icon)
        ├── EditorToolbar  ← Tiptap commands
        ├── EditorContent  ← Tiptap ProseMirror instance
        ├── Character/word count footer
        └── SharePanel (slide-in overlay)
            ├── Add user form (username/email + view|edit)
            ├── People list (owner + shared users with revoke button)
            └── Copy link button
```

---

## Key Design Decisions

### Why PostgreSQL instead of SQLite

The project originally used `better-sqlite3` (synchronous, zero-config). When it became clear the submission needed a real database visible in a DB client (the reviewer's DBeaver screenshot showed PostgreSQL), the entire data layer was migrated to `pg`. The schema is equivalent; the main changes were:

- Sync calls → `async/await` with `pool.query()`
- `?` placeholders → `$1/$2/…` (pg style)
- `INSERT OR REPLACE` → `INSERT … ON CONFLICT DO UPDATE`
- Tables created via `initSchema()` on server startup instead of inline CREATE

### Why `pg` directly instead of an ORM

Prisma v8 (the version installed by npm) is a completely new platform product whose CLI no longer supports the classic `prisma generate` / `prisma db push` commands. Rather than fight the tooling, raw `pg` with parametrized queries is simpler, faster, and has zero magic — every query is exactly what it says.

### Content storage: HTML string vs. ProseMirror JSON

Tiptap can serialize to either HTML or a ProseMirror JSON document. HTML was chosen because:
- Easy to inspect in the DB
- Renders directly in `<EditorContent>` without re-parsing
- Simpler import path for the markdown/txt upload feature

### Auto-save implementation

```
onUpdate (Tiptap) → reset 1500ms debounce timer
                 → timer fires → PATCH /api/documents/:id
                              → update updatedAt + return saved doc
                              → UI shows "Saved X ago"
```

The debounce prevents a write on every keystroke while still being responsive. On unmount, the timer is cleared to avoid stale saves.

### Access control enforcement

Every route that reads or writes a document checks permissions in the database — not just in the frontend. The test suite has explicit cases for:
- Unauthenticated → 401
- Authenticated non-member → 403
- Shared viewer trying to edit → 403
- Owner → 200/201

### Auth: JWT in localStorage

A deliberate tradeoff: httpOnly cookies are more secure (no XSS access) but require more backend plumbing (same-origin, SameSite, CSRF). For this demo scope, localStorage + a short token lifetime (7d) is acceptable. The 401 interceptor in `api/client.js` clears the token and redirects on expiry — but intentionally skips that redirect for `/auth/login` and `/auth/register` routes to prevent redirect loops.

---

## Tradeoffs Summary

| Decision | Alternative | Reason |
|---|---|---|
| PostgreSQL | SQLite | Real DB for reviewer's DB client; proper concurrent access |
| Raw `pg` | Prisma / TypeORM | Prisma v8 CLI incompatible on this machine; raw pg is simpler |
| HTML in DB | ProseMirror JSON | Simpler, directly renderable, good for text import |
| multer disk storage | S3 / Cloudinary | No cloud credentials needed for local review |
| localStorage JWT | httpOnly cookies | Simpler for demo; cookies better for production |
| Vite proxy | Backend CORS config | Zero-config local dev; no credentials in CORS allowlist needed |
