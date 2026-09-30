require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, initSchema, pool } = require('./lib/db');
const generateId = require('./lib/cuid');

async function main() {
  console.log('🌱 Seeding database…');

  // Make sure tables exist
  await initSchema();

  const password = await bcrypt.hash('demo1234', 10);

  // ── Users ──────────────────────────────────────────────────────────────
  const aliceResult = await query(
    `INSERT INTO users (id, email, username, password)
     VALUES ($1, 'alice@demo.com', 'alice', $2)
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [generateId(), password]
  );
  const alice = aliceResult.rows[0];

  const bobResult = await query(
    `INSERT INTO users (id, email, username, password)
     VALUES ($1, 'bob@demo.com', 'bob', $2)
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [generateId(), password]
  );
  const bob = bobResult.rows[0];

  // ── Documents ──────────────────────────────────────────────────────────
  const doc1Result = await query(
    `INSERT INTO documents (id, title, content, owner_id)
     VALUES ($1, 'Welcome to DocStyle', $2, $3)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [
      'seed-doc-welcome',
      `<h1>Welcome to DocStyle ✨</h1><p>This is a collaborative document editor. You can:</p><ul><li><p>Create and edit documents with <strong>rich text formatting</strong></p></li><li><p>Share documents with other users</p></li><li><p>Import <strong>.txt</strong> and <strong>.md</strong> files</p></li></ul><h2>Getting Started</h2><p>Use the toolbar above to <strong>bold</strong>, <em>italicize</em>, or <u>underline</u> text. Try the heading and list options too!</p>`,
      alice.id,
    ]
  );

  const doc2Result = await query(
    `INSERT INTO documents (id, title, content, owner_id)
     VALUES ($1, 'Project Meeting Notes', $2, $3)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [
      'seed-doc-meeting',
      `<h1>Project Meeting Notes</h1><h2>Agenda</h2><ol><li><p>Review Q3 milestones</p></li><li><p>Discuss blockers</p></li><li><p>Plan Q4 roadmap</p></li></ol><h2>Action Items</h2><ul><li><p><strong>Alice</strong>: Finalize design mockups by Friday</p></li><li><p><strong>Bob</strong>: Set up staging environment</p></li></ul>`,
      alice.id,
    ]
  );

  // Share "Project Meeting Notes" with Bob (edit)
  await query(
    `INSERT INTO shares (id, document_id, user_id, permission)
     VALUES ($1, 'seed-doc-meeting', $2, 'edit')
     ON CONFLICT (document_id, user_id) DO NOTHING`,
    [generateId(), bob.id]
  );

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  alice@demo.com / demo1234');
  console.log('  bob@demo.com   / demo1234');
}

main()
  .catch(console.error)
  .finally(() => pool.end());
