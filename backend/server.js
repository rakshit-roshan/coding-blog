const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Get all posts
app.get('/api/posts', (req, res) => {
  db.all("SELECT * FROM posts ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get single post
app.get('/api/posts/:id', (req, res) => {
  db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Post not found" });
    res.json(row);
  });
});


// Create a new post
app.post('/api/posts', (req, res) => {
  const { title, content, tags, icon, date } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Missing fields" });

  const tagString = Array.isArray(tags) ? tags.join(',') : tags;
  const created_at = date || new Date().toISOString().split('T')[0]; // default to today

  db.run(
    "INSERT INTO posts (title, content, tags, icon, created_at) VALUES (?, ?, ?, ?, ?)",
    [title, content, tagString, icon, created_at],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
