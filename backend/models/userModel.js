const pool = require('../db');

const userModel = {
  findByUsername: async (username) => {
    const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return res.rows[0];
  },
  findByEmail: async (email) => {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0];
  },
  createUser: async (username, email, hashedPassword) => {
    const res = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username',
      [username, email, hashedPassword]
    );
    return res.rows[0];
  },
  updatePassword: async (userId, hashedPassword) => {
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
  },
  setResetToken: async (email, token, expiry) => {
    await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3', [token, expiry, email]);
  },
  findByResetToken: async (token) => {
    const res = await pool.query('SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()', [token]);
    return res.rows[0];
  }
};

module.exports = userModel; 