const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/messages', messageController.getAllMessages);
router.post('/messages', messageController.sendMessage);
router.delete('/messages/:id', messageController.deleteMessage);

module.exports = router; 