const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../lib/db');
const generateId = require('../lib/cuid');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/documents
router.get('/', async (req, res) => {
  try {
    const ownedResult = await query(
      `SELECT d.id, d.title, d.created_at, d.updated_at, d.owner_id,
              u.username AS owner_username, u.email AS owner_email,
              (SELECT COUNT(*) FROM shares s WHERE s.document_id = d.id)::int AS share_count
       FROM documents d
       JOIN users u ON d.owner_id = u.id
       WHERE d.owner_id = $1
       ORDER BY d.updated_at DESC`,
      [req.user.id]
    );

    const sharedResult = await query(
      `SELECT d.id, d.title, d.created_at, d.updated_at, d.owner_id,
              u.username AS owner_username, u.email AS owner_email,
              s.permission, s.id AS share_id
       FROM shares s
       JOIN documents d ON s.document_id = d.id
       JOIN users u ON d.owner_id = u.id
       WHERE s.user_id = $1
       ORDER BY d.updated_at DESC`,
      [req.user.id]
    );

    const owned = ownedResult.rows.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      ownerId: d.owner_id,
      owner: { username: d.owner_username, email: d.owner_email },
      shareCount: d.share_count,
      role: 'owner',
    }));

    const shared = sharedResult.rows.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      ownerId: d.owner_id,
      owner: { username: d.owner_username, email: d.owner_email },
      shareId: d.share_id,
      role: d.permission,
    }));

    res.json({ owned, shared });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/documents
router.post('/', async (req, res) => {
  const { title = 'Untitled Document', content = '' } = req.body;
  try {
    const id = generateId();
    const result = await query(
      `INSERT INTO documents (id, title, content, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, title.trim() || 'Untitled Document', content, req.user.id]
    );
    const doc = result.rows[0];

    const ownerResult = await query(
      'SELECT username, email FROM users WHERE id = $1',
      [req.user.id]
    );
    const owner = ownerResult.rows[0];

    res.status(201).json({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      ownerId: doc.owner_id,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      owner: { username: owner.username, email: owner.email },
      userRole: 'owner',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/documents/:id
router.get('/:id', async (req, res) => {
  try {
    const docResult = await query(
      `SELECT d.*, u.id AS owner_uid, u.username AS owner_username, u.email AS owner_email
       FROM documents d
       JOIN users u ON d.owner_id = u.id
       WHERE d.id = $1`,
      [req.params.id]
    );
    const doc = docResult.rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const isOwner = doc.owner_id === req.user.id;

    const shareResult = await query(
      'SELECT * FROM shares WHERE document_id = $1 AND user_id = $2',
      [doc.id, req.user.id]
    );
    const shareEntry = shareResult.rows[0];

    if (!isOwner && !shareEntry) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sharesResult = await query(
      `SELECT s.id, s.permission, s.created_at,
              u.id AS uid, u.username, u.email
       FROM shares s
       JOIN users u ON s.user_id = u.id
       WHERE s.document_id = $1`,
      [doc.id]
    );

    const attachResult = await query(
      'SELECT * FROM attachments WHERE document_id = $1 ORDER BY created_at DESC',
      [doc.id]
    );

    res.json({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      ownerId: doc.owner_id,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      owner: { id: doc.owner_uid, username: doc.owner_username, email: doc.owner_email },
      shares: sharesResult.rows.map((s) => ({
        id: s.id,
        permission: s.permission,
        createdAt: s.created_at,
        user: { id: s.uid, username: s.username, email: s.email },
      })),
      attachments: attachResult.rows,
      userRole: isOwner ? 'owner' : shareEntry.permission,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/documents/:id
router.patch(
  '/:id',
  [
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('content').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const docResult = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
      const doc = docResult.rows[0];
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const isOwner = doc.owner_id === req.user.id;
      if (!isOwner) {
        const shareResult = await query(
          'SELECT * FROM shares WHERE document_id = $1 AND user_id = $2',
          [doc.id, req.user.id]
        );
        const share = shareResult.rows[0];
        if (!share || share.permission !== 'edit') {
          return res.status(403).json({ error: 'No edit permission' });
        }
      }

      const { title, content } = req.body;
      let updatedDoc;

      if (title !== undefined && content !== undefined) {
        const r = await query(
          'UPDATE documents SET title=$1, content=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
          [title, content, doc.id]
        );
        updatedDoc = r.rows[0];
      } else if (title !== undefined) {
        const r = await query(
          'UPDATE documents SET title=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
          [title, doc.id]
        );
        updatedDoc = r.rows[0];
      } else if (content !== undefined) {
        const r = await query(
          'UPDATE documents SET content=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
          [content, doc.id]
        );
        updatedDoc = r.rows[0];
      } else {
        updatedDoc = doc;
      }

      const ownerResult = await query(
        'SELECT username, email FROM users WHERE id = $1',
        [updatedDoc.owner_id]
      );
      const owner = ownerResult.rows[0];

      res.json({
        id: updatedDoc.id,
        title: updatedDoc.title,
        content: updatedDoc.content,
        ownerId: updatedDoc.owner_id,
        createdAt: updatedDoc.created_at,
        updatedAt: updatedDoc.updated_at,
        owner: { username: owner.username, email: owner.email },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
  try {
    const docResult = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    const doc = docResult.rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can delete this document' });
    }

    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
