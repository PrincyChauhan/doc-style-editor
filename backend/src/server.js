require('dotenv').config();
const app = require('./app');
const { initSchema } = require('./lib/db');

if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL environment variable is missing!');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is not set. Using fallback secret.');
  process.env.JWT_SECRET = 'docstyle-default-fallback-jwt-secret-key-2024';
}

const PORT = process.env.PORT || 3001;

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialize database schema:', err);
    process.exit(1);
  });
