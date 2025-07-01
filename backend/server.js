const http = require('http');
const socketio = require('socket.io');
const app = require('./app');
const messageModel = require('./models/messageModel');
const groupModel = require('./models/groupModel');

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: ["https://rakshitroshan.netlify.app", "http://localhost:3000", "http://localhost:5000"],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
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
    const startTime = Date.now();
    console.log('[socket.io] send_message received at:', startTime, 'data:', data); // Debug log
    // data: { userId, content, groupId (optional) }
    const { userId, content, groupId } = data;
    if (!userId || !content) return;
    try {
      let msg;
      if (groupId) {
        console.log('[socket.io] Looking up group at:', Date.now(), 'Time elapsed:', Date.now() - startTime, 'ms'); // Debug log
        // Look up the group by public group_id to get the database ID
        const group = await groupModel.findByGroupId(groupId);
        if (!group) {
          console.error('[socket.io] Group not found for groupId:', groupId);
          return;
        }
        const groupDbId = group.id;
        console.log('[socket.io] Found group DB ID:', groupDbId, 'for public group ID:', groupId, 'at:', Date.now(), 'Time elapsed:', Date.now() - startTime, 'ms');
        
        console.log('[socket.io] Creating message in database at:', Date.now(), 'Time elapsed:', Date.now() - startTime, 'ms'); // Debug log
        msg = await messageModel.createForGroup(userId, groupDbId, content);
        console.log('[socket.io] Message created in database at:', Date.now(), 'Time elapsed:', Date.now() - startTime, 'ms'); // Debug log
        
        // Optionally, use socket.io rooms for group chat
        console.log('[socket.io] Emitting new_message to room at:', Date.now(), 'Time elapsed:', Date.now() - startTime, 'ms'); // Debug log
        io.to(`group_${groupDbId}`).emit('new_message', {
          userId,
          content,
          groupId: groupDbId, // Send back the DB ID
          id: msg.id,
          created_at: msg.created_at
        });
        console.log('[socket.io] new_message emitted successfully at:', Date.now(), 'Total time elapsed:', Date.now() - startTime, 'ms'); // Debug log
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