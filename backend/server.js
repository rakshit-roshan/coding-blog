const http = require('http');
const socketio = require('socket.io');
const app = require('./app');

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
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
    }
  });
});

// Export onlineUsers for use in controllers
module.exports = { server, onlineUsers };

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));