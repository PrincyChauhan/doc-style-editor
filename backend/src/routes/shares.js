const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../lib/db');
const generateId = require('../lib/cuid');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// POST /api/documents/:id/shares
router.post(
  '/:id/shares',
  [
    body('usernameOrEmail').trim().notEmpty().withMessage('Username or email required'),
    body('permission')
      .isIn(['view', 'edit'])
      .withMessage('Permission must be "view" or "edit"'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { usernameOrEmail, permission } = req.body;

    try {
      const docResult = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
      const doc = docResult.rows[0];
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      if (doc.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the owner can share this document' });
      }

      const userResult = await query(
        'SELECT * FROM users WHERE email = $1 OR username = $1',
        [usernameOrEmail]
      );
      const targetUser = userResult.rows[0];
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      if (targetUser.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot share a document with yourself' });
      }

      // Upsert: update permission if already shared, else insert
      const upsertResult = await query(
        `INSERT INTO shares (id, document_id, user_id, permission)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (document_id, user_id)
         DO UPDATE SET permission = EXCLUDED.permission
         RETURNING *`,
        [generateId(), doc.id, targetUser.id, permission]
      );
      const share = upsertResult.rows[0];

      res.status(201).json({
        id: share.id,
        documentId: share.document_id,
        permission: share.permission,
        createdAt: share.created_at,
        user: {
          id: targetUser.id,
          username: targetUser.username,
          email: targetUser.email,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/documents/:id/shares/:shareId
router.delete('/:id/shares/:shareId', async (req, res) => {
  try {
    const docResult = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    const doc = docResult.rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can revoke access' });
    }

    const shareResult = await query('SELECT * FROM shares WHERE id = $1', [req.params.shareId]);
    if (!shareResult.rows[0]) return res.status(404).json({ error: 'Share not found' });

    await query('DELETE FROM shares WHERE id = $1', [req.params.shareId]);
    res.json({ message: 'Access revoked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
