const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../lib/db');
const generateId = require('../lib/cuid');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_EXTENSIONS = ['.txt', '.md'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  ALLOWED_EXTENSIONS.includes(ext)
    ? cb(null, true)
    : cb(new Error('Unsupported file type. Please upload a .txt or .md file.'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

// POST /api/upload/document
router.post('/document', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded or unsupported type' });

  try {
    const rawContent = fs.readFileSync(req.file.path, 'utf8');
    const baseName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const title = baseName.replace(/[-_]/g, ' ').trim() || 'Imported Document';
    const isMarkdown = path.extname(req.file.originalname).toLowerCase() === '.md';

    const content = isMarkdown
      ? convertMarkdownToHtml(rawContent)
      : rawContent
          .split(/\n\n+/)
          .filter((p) => p.trim())
          .map((p) => `<p>${escapeHtml(p.replace(/\n/g, '<br>'))}</p>`)
          .join('') || '<p></p>';

    const id = generateId();
    const result = await query(
      'INSERT INTO documents (id, title, content, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, title, content, req.user.id]
    );
    const doc = result.rows[0];

    const ownerResult = await query('SELECT username, email FROM users WHERE id = $1', [req.user.id]);
    const owner = ownerResult.rows[0];

    fs.unlinkSync(req.file.path);

    res.status(201).json({
      document: {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        ownerId: doc.owner_id,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        owner: { username: owner.username, email: owner.email },
        userRole: 'owner',
      },
      message: 'File imported as new document',
    });
  } catch (err) {
    console.error('Upload error:', err);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

// POST /api/upload/attachment/:documentId
router.post('/attachment/:documentId', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded or unsupported type' });

  try {
    const docResult = await query('SELECT * FROM documents WHERE id = $1', [req.params.documentId]);
    const doc = docResult.rows[0];
    if (!doc) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Document not found' });
    }

    const isOwner = doc.owner_id === req.user.id;
    if (!isOwner) {
      const shareResult = await query(
        'SELECT * FROM shares WHERE document_id = $1 AND user_id = $2',
        [doc.id, req.user.id]
      );
      const share = shareResult.rows[0];
      if (!share || share.permission !== 'edit') {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'No edit permission' });
      }
    }

    const attachId = generateId();
    const attachResult = await query(
      `INSERT INTO attachments (id, document_id, filename, original_name, mime_type, size)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [attachId, doc.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
    );

    res.status(201).json(attachResult.rows[0]);
  } catch (err) {
    console.error('Attachment error:', err);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to attach file' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// ── Helpers ────────────────────────────────────────────────────────────────
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function convertMarkdownToHtml(md) {
  let html = md;
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/^[ \t]*[-*+] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^[ \t]*\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[^]*?<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html
    .split('\n\n')
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-6]|ul|ol|li)/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
  return html || '<p></p>';
}

module.exports = router;
