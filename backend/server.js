const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'https://rakshitroshan.netlify.app', // Update to your Netlify domain
  credentials: true
}));
app.use(bodyParser.json());

// Login or signup
app.post('/api/login', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    // Try to find user
    let result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      // Signup
      result = await pool.query('INSERT INTO users (username) VALUES ($1) RETURNING *', [username]);
    }
    res.json({ id: result.rows[0].id, username: result.rows[0].username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT messages.id, messages.content, messages.created_at, users.username FROM messages JOIN users ON messages.user_id = users.id ORDER BY messages.created_at ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message
app.post('/api/messages', async (req, res) => {
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ error: 'user_id and content required' });
  try {
    const result = await pool.query(
      'INSERT INTO messages (user_id, content) VALUES ($1, $2) RETURNING id, created_at',
      [user_id, content]
    );
    res.json({ id: result.rows[0].id, created_at: result.rows[0].created_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));