const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    icon TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

pool.query(createTableQuery)
  .then(() => console.log('Table ensured'))
  .catch(err => console.error('Error creating table', err));

module.exports = pool;
