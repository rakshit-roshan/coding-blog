const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();

app.use(cors({
  origin: 'https://rakshitroshan.netlify.app',
  credentials: true
}));
app.use(bodyParser.json());

app.use('/api', authRoutes);
app.use('/api', groupRoutes);
app.use('/api', messageRoutes);

module.exports = app; 