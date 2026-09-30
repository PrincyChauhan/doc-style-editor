// Set test environment variables BEFORE any app code loads
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://nikunjrathod:nikunj@localhost:5432/docstyle_test';
