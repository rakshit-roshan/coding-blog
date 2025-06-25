const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'https://rakshitroshan.netlify.app/', // replace with your Netlify URL
  credentials: true
}));
app.use(bodyParser.json());

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new post
app.post('/api/posts', async (req, res) => {
  const { title, content, tags, icon, date } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Missing title or content" });

  const tagString = Array.isArray(tags) ? tags.join(',') : tags;
  const created_at = date || new Date().toISOString().split('T')[0];

  try {
    const result = await pool.query(
      'INSERT INTO posts (title, content, tags, icon, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [title, content, tagString, icon, created_at]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));