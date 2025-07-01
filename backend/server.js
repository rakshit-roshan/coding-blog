const http = require('http');
const socketio = require('socket.io');
const app = require('./app');
const messageModel = require('./models/messageModel');

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory set to track online user IDs
const onlineUsers = new Set();

io.on('connection', (socket) => {
  // Expect userId to be sent on connection
  socket.on('user_connected', (userId) => {
    if (userId) {
      onlineUsers.add(Number(userId));
      socket.userId = Number(userId);
      console.log(`[socket.io] User connected: ${userId}`);
      console.log('[socket.io] Online users:', Array.from(onlineUsers));
      io.emit('online_users_changed');
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      console.log(`[socket.io] User disconnected: ${socket.userId}`);
      console.log('[socket.io] Online users:', Array.from(onlineUsers));
      io.emit('online_users_changed');
    }
  });

  // Real-time messaging
  socket.on('send_message', async (data) => {
    console.log('[socket.io] send_message received:', data); // Debug log
    // data: { userId, content, groupId (optional) }
    const { userId, content, groupId } = data;
    if (!userId || !content) return;
    try {
      let msg;
      if (groupId) {
        msg = await messageModel.createForGroup(userId, groupId, content);
        // Optionally, use socket.io rooms for group chat
        io.to(`group_${groupId}`).emit('new_message', {
          userId,
          content,
          groupId,
          id: msg.id,
          created_at: msg.created_at
        });
      } else {
        msg = await messageModel.create(userId, content);
        io.emit('new_message', {
          userId,
          content,
          id: msg.id,
          created_at: msg.created_at
        });
      }
    } catch (err) {
      console.error('[socket.io] Error sending message:', err.message);
    }
  });

  // Join group room for group chat
  socket.on('join_group', (groupId) => {
    if (groupId) {
      socket.join(`group_${groupId}`);
    }
  });

  // Leave group room
  socket.on('leave_group', (groupId) => {
    if (groupId) {
      socket.leave(`group_${groupId}`);
    }
  });
});

// Export onlineUsers for use in controllers
module.exports = { server, onlineUsers };

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));