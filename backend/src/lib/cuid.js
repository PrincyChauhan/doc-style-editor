// Simple CUID-like ID generator (no external dependency)
let counter = 0;

function generateId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  const count = (counter++).toString(36).padStart(4, '0');
  return `c${timestamp}${random}${count}`;
}

module.exports = generateId;
