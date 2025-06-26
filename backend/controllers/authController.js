const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userModel = require('../models/userModel');
const { sendMail } = require('../utils/mailer');

const authController = {
  signup: async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    try {
      const existingUser = await userModel.findByUsername(username);
      const existingEmail = await userModel.findByEmail(email);
      if (existingUser || existingEmail) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
      const hashed = await bcrypt.hash(password, 10);
      const user = await userModel.createUser(username, email, hashed);
      res.json({ id: user.id, username: user.username });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  login: async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    try {
      const user = await userModel.findByUsername(username);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
      res.json({ id: user.id, username: user.username });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  requestPasswordReset: async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    try {
      const user = await userModel.findByEmail(email);
      if (!user) return res.status(404).json({ error: 'No user with that email' });
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
      await userModel.setResetToken(email, token, expiry);
      const resetUrl = `https://rakshitroshan.netlify.app/reset-password.html?token=${token}`;
      await sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset',
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>`
      });
      res.json({ message: 'Password reset email sent' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  resetPassword: async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
    try {
      const user = await userModel.findByResetToken(token);
      if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
      const hashed = await bcrypt.hash(password, 10);
      await userModel.updatePassword(user.id, hashed);
      await userModel.setResetToken(user.email, null, null); // Clear token
      res.json({ message: 'Password has been reset' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = authController; 