const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create users and messages tables if not exist
const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reset_token TEXT,
    reset_token_expiry TIMESTAMP
  )`;

const createGroupsTable = `
  CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    group_id VARCHAR(6) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

const createGroupMembersTable = `
  CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id),
    user_id INTEGER REFERENCES users(id)
  )`;

const createMessagesTable = `
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    group_id INTEGER REFERENCES groups(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

const createGroupJoinRequestsTable = `
  CREATE TABLE IF NOT EXISTS group_join_requests (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id),
    user_id INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

const createGroupJoinApprovalsTable = `
  CREATE TABLE IF NOT EXISTS group_join_approvals (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES group_join_requests(id),
    approver_id INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    token TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

pool.query(createUsersTable)
  .then(() => pool.query(createGroupsTable))
  .then(() => pool.query(createGroupMembersTable))
  .then(() => pool.query(createMessagesTable))
  .then(() => pool.query(createGroupJoinRequestsTable))
  .then(() => pool.query(createGroupJoinApprovalsTable))
  .then(() => console.log('Tables ensured'))
  .catch(err => console.error('Error creating tables', err));

module.exports = pool;
