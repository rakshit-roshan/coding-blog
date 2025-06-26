const messageModel = require('../models/messageModel');

const messageController = {
  getAllMessages: async (req, res) => {
    try {
      const messages = await messageModel.getAll();
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  sendMessage: async (req, res) => {
    const { user_id, content } = req.body;
    if (!user_id || !content) return res.status(400).json({ error: 'user_id and content required' });
    try {
      const msg = await messageModel.create(user_id, content);
      res.json({ id: msg.id, created_at: msg.created_at });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  deleteMessage: async (req, res) => {
    const messageId = req.params.id;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    try {
      const result = await messageModel.delete(messageId, user_id);
      if (result.error) return res.status(403).json({ error: result.error });
      res.json({ message: result.message });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = messageController; 