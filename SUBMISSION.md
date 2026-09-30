# Submission — DocStyle

## What Is Included

| File / Folder | Description |
|---|---|
| `backend/` | Node.js + Express REST API with SQLite |
| `frontend/` | React + Vite + Tailwind CSS SPA |
| `README.md` | Local setup, run instructions, project structure |
| `ARCHITECTURE.md` | Architecture decisions, tradeoffs, API surface |
| `AI_WORKFLOW.md` | AI tools used, what was changed, verification approach |
| `SUBMISSION.md` | This file |

---

## Demo Credentials

| Email | Password | Notes |
|---|---|---|
| alice@demo.com | demo1234 | Owns "Welcome to DocStyle" and "Project Meeting Notes" |
| bob@demo.com | demo1234 | Has edit access to "Project Meeting Notes" |

Run `node src/seed.js` from `backend/` to (re)create these accounts if the database is fresh.

---

## What Works End-to-End

- **Register / Login** — JWT auth, token persisted in localStorage
- **Document creation** — New documents created with default title, immediately opened in editor
- **Rich text editing** — Bold, italic, underline, strikethrough, headings (H1/H2/H3), bullet and numbered lists, blockquote, inline code, text alignment (left/center/right), undo/redo
- **Auto-save** — Content saves 1.5s after the user stops typing; status shown in header
- **Rename** — Click the document title in the editor header to rename inline
- **Delete** — Hover a card on the dashboard → trash icon → confirmation modal
- **File import** — Upload a `.txt` or `.md` file from the dashboard; it becomes a new editable document with a matching title and converted HTML content
- **File attachment** — Attach a `.txt` or `.md` file to an open document via the paperclip icon
- **Sharing** — Owner clicks Share → enters username or email → chooses Viewer or Editor → shares. Shared person sees the document in their "Shared" tab with the correct role badge.
- **Revoke access** — Owner can remove any shared user from the Share panel
- **View-only mode** — Viewer sees a yellow banner and the formatting toolbar is hidden; all edit operations are blocked on the backend too
- **Dashboard tabs** — All / My docs / Shared, with live search filter

---

## What Is Incomplete / Deprioritized

| Feature | Status | Notes |
|---|---|---|
| Real-time collaboration | Not built | Would need WebSocket + Yjs CRDT |
| DOCX / PDF import | Not built | Would need `mammoth` / `pdf-parse` |
| Export to PDF | Not built | Would need puppeteer or jsPDF |
| Image embeds | Not built | Needs storage decision (S3 / local) |
| Version history | Not built | Would store content snapshots per save |
| Comments / suggestions | Not built | Tiptap has a comments extension; deferred |
| Role-based permissions beyond view/edit | Not built | Admin / commenter roles |

---

## What I Would Build Next (with another 2-4 hours)

1. **Real-time cursors** using Socket.io + Yjs — the biggest UX gap vs. Google Docs
2. **Export to Markdown / PDF** — high value, lower complexity
3. **DOCX import** using `mammoth.js` — one npm install away
4. **Image upload** in the editor — Tiptap Image extension + multer disk storage
5. **Production deployment** hardening — httpOnly cookies for auth, rate limiting, HTTPS redirect

---

## How to Run Locally

**Prerequisites:** Node.js ≥ 18, PostgreSQL running on port 5432.

```bash
# Terminal 1 — Backend
cd backend
npm install
# Edit .env with your Postgres credentials (see .env.example)
node src/seed.js   # Creates tables + seeds demo accounts
npm run dev        # http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev        # http://localhost:5173
```

For the test database:
```bash
psql -U youruser -c "CREATE DATABASE docstyle_test;"
cd backend && npm test
# Expected: 19 passed
```
