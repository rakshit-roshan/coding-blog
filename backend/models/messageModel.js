const pool = require('../db');

const messageModel = {
  getAll: async () => {
    const res = await pool.query(
      'SELECT messages.id, messages.content, messages.created_at, messages.user_id, users.username FROM messages JOIN users ON messages.user_id = users.id ORDER BY messages.created_at ASC'
    );
    return res.rows;
  },
  create: async (userId, content) => {
    const res = await pool.query(
      'INSERT INTO messages (user_id, content) VALUES ($1, $2) RETURNING id, created_at',
      [userId, content]
    );
    return res.rows[0];
  },
  delete: async (messageId, userId) => {
    // Check if the message belongs to the user
    const result = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
    if (result.rows.length === 0) return { error: 'Message not found' };
    if (result.rows[0].user_id !== userId) return { error: 'Not authorized to delete this message' };
    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
    return { message: 'Message deleted' };
  },
  getByGroupId: async (groupDbId) => {
    const res = await pool.query(
      'SELECT messages.id, messages.content, messages.created_at, messages.user_id, users.username FROM messages JOIN users ON messages.user_id = users.id WHERE messages.group_id = $1 ORDER BY messages.created_at ASC',
      [groupDbId]
    );
    return res.rows;
  },
  createForGroup: async (userId, groupDbId, content) => {
    const res = await pool.query(
      'INSERT INTO messages (user_id, group_id, content) VALUES ($1, $2, $3) RETURNING id, created_at',
      [userId, groupDbId, content]
    );
    return res.rows[0];
  }
};

module.exports = messageModel; 