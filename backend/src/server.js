require('dotenv').config();
const app = require('./app');
const { initSchema } = require('./lib/db');

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
