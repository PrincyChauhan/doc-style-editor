# AI Workflow Note — DocStyle

## Tools Used

- **Kiro IDE (AI-powered VS Code)** — primary tool for all code generation, file creation, and command execution
- **Claude (via Kiro)** — generated all source files, diagnosed errors, and iterated on fixes autonomously

---

## Where AI Materially Sped Up My Work

### 1. Backend scaffolding (~45 min → ~5 min)

Writing the Express routes, middleware, SQLite schema, and auth logic from scratch would have taken significant time. AI generated all of this in one pass — correctly structured routes, JWT middleware, bcrypt hashing, input validation with express-validator, and a synchronous better-sqlite3 DB layer.

### 2. Tiptap integration (~30 min → ~5 min)

The Tiptap API has a lot of surface area (extensions, commands, editor state). AI got the full toolbar working correctly — including `onMouseDown` preventing focus loss, `aria-pressed` attributes, and the correct `isActive()` check per extension — without me needing to read the docs.

### 3. Share panel and access control logic (~45 min → ~10 min)

The owner-only guard, upsert-or-create share logic, and cascading foreign key deletes were generated correctly on the first pass. The frontend panel (add user, revoke, copy link, permission badge) required only minor review.

### 4. Test suite (~30 min → ~5 min)

19 tests covering auth, CRUD, access control, and sharing were generated in a single block. All passed on the first run with no editing.

---

## What AI-Generated Output I Changed or Rejected

### 1. Prisma v8 → better-sqlite3 → PostgreSQL

AI initially suggested Prisma. The version installed (v8 RC) turned out to have a completely rearchitected CLI that no longer supports `generate` or `db push`. AI diagnosed this, removed Prisma, and rewrote the data layer using `better-sqlite3` (synchronous, zero-config). The project was then migrated to **PostgreSQL** using the `pg` driver at the reviewer's request — all routes were rewritten with `async/await`, `$1/$2` placeholders, and `INSERT … ON CONFLICT DO UPDATE` upserts. Schema is auto-created on server startup via `CREATE TABLE IF NOT EXISTS`.

### 2. File upload route refinement

The initial markdown-to-HTML converter had a regex bug where consecutive `<li>` elements weren't always wrapped in `<ul>`. I caught this during review and AI corrected the regex grouping.

### 3. Tiptap content initialization race condition

The first version of `EditorPage` set the editor content before the `doc` state was populated. This caused the editor to render empty. I identified the root cause (async load + useEffect ordering) and AI fixed it by separating the content hydration into a `useEffect` that depends on both `editor` and `doc`.

### 4. View-only toolbar

The initial draft rendered the toolbar even for view-only users. I rejected that and added the conditional render (`{canEdit && <EditorToolbar />}`) along with a yellow informational banner for viewers.

---

## How I Verified Correctness

### Backend
- Ran all 19 Jest tests: **19/19 passed**
- Manually curled the health check, login, and documents list endpoints
- Confirmed seeded data round-trips correctly

### Frontend
- Ran `vite build` — **no errors**, only a bundle-size warning (expected for a rich text editor)
- Manually reviewed every component for:
  - ARIA labels on all interactive elements
  - Error and loading states handled
  - `disabled` states on buttons during async operations
  - No dangling `useEffect` cleanup issues

### Access control
- Verified via the test suite that a non-member user gets 403, a viewer gets 403 on edit, and the owner can perform all operations
- Verified in the frontend that viewers see the correct badge, disabled toolbar, and banner

---

## Honest Assessment of AI Usage

AI handled roughly 80% of the keystrokes in this project. What required human judgment:

- **Scope decisions** — choosing what to build (auto-save + sharing + file import) vs. what to skip (real-time, DOCX, export)
- **Debugging the Prisma v8 issue** — recognizing this was a versioning problem, not a config problem
- **UX quality review** — confirming that view-only mode actually disables the editor, that save state is visible, that the toolbar doesn't lose focus on click
- **Architecture decisions** — HTML string vs. ProseMirror JSON in the DB, localStorage vs. cookies for JWT
- **Test coverage design** — ensuring access control edge cases (viewer can't edit, non-member gets 403) were explicitly tested, not just happy paths
