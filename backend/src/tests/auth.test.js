// setup.js runs first via jest setupFiles and sets process.env vars
const request = require('supertest');
const app = require('../app');
const { pool, initSchema, query } = require('../lib/db');

beforeAll(async () => {
  await initSchema();
  // Clear all tables so tests start clean
  await query('TRUNCATE users, documents, shares, attachments CASCADE');
});

afterAll(async () => {
  await pool.end();
});

// ── Health ──────────────────────────────────────────────────────────────────
describe('Health Check', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── Auth ────────────────────────────────────────────────────────────────────
describe('Auth API', () => {
  const testUser = { email: 'test@example.com', username: 'testuser', password: 'password123' };

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns a token', async () => {
      const res = await request(app).post('/api/auth/register').send(testUser);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('rejects duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send(testUser);
      expect(res.status).toBe(409);
    });

    it('rejects invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'notanemail', username: 'user2', password: 'pass123' });
      expect(res.status).toBe(400);
    });

    it('rejects short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', username: 'newuser', password: '123' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('rejects nonexistent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });
      expect(res.status).toBe(401);
    });
  });
});

// ── Documents ───────────────────────────────────────────────────────────────
describe('Documents API', () => {
  let token;
  let token2;
  let docId;
  let shareId;

  beforeAll(async () => {
    const res1 = await request(app).post('/api/auth/register').send({
      email: 'docuser@example.com', username: 'docuser', password: 'password123',
    });
    token = res1.body.token;

    const res2 = await request(app).post('/api/auth/register').send({
      email: 'docuser2@example.com', username: 'docuser2', password: 'password123',
    });
    token2 = res2.body.token;
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
  });

  it('creates a document', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Doc', content: '<p>Hello</p>' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Doc');
    docId = res.body.id;
  });

  it('lists documents', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.owned.length).toBeGreaterThanOrEqual(1);
  });

  it('gets a specific document', async () => {
    const res = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userRole).toBe('owner');
  });

  it('denies access to another user', async () => {
    const res = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(403);
  });

  it('updates document title', async () => {
    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });

  it('shares document with another user', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/shares`)
      .set('Authorization', `Bearer ${token}`)
      .send({ usernameOrEmail: 'docuser2', permission: 'view' });
    expect(res.status).toBe(201);
    expect(res.body.permission).toBe('view');
    shareId = res.body.id;
  });

  it('allows shared user to access document', async () => {
    const res = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(200);
    expect(res.body.userRole).toBe('view');
  });

  it('denies shared viewer from editing', async () => {
    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ title: 'Hacked Title' });
    expect(res.status).toBe(403);
  });

  it('revokes share access', async () => {
    const res = await request(app)
      .delete(`/api/documents/${docId}/shares/${shareId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('deletes document (owner only)', async () => {
    const res = await request(app)
      .delete(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
