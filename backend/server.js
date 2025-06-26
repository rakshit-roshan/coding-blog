const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'https://rakshitroshan.netlify.app', // Update to your Netlify domain
  credentials: true
}));
app.use(bodyParser.json());

// Signup
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  try {
    // Check if user exists
    const existing = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username',
      [username, email, hashed]
    );
    res.json({ id: result.rows[0].id, username: result.rows[0].username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ id: user.id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT messages.id, messages.content, messages.created_at, messages.user_id, users.username FROM messages JOIN users ON messages.user_id = users.id ORDER BY messages.created_at ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message
app.post('/api/messages', async (req, res) => {
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ error: 'user_id and content required' });
  try {
    const result = await pool.query(
      'INSERT INTO messages (user_id, content) VALUES ($1, $2) RETURNING id, created_at',
      [user_id, content]
    );
    res.json({ id: result.rows[0].id, created_at: result.rows[0].created_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Password reset request
app.post('/api/request-password-reset', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No user with that email' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
    await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3', [token, expiry, email]);

    // Configure nodemailer (example with Gmail, replace with your SMTP info)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    const resetUrl = `https://rakshitroshan.netlify.app/reset-password.html?token=${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>`
    });
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Password reset
app.post('/api/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()', [token]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = $2', [hashed, token]);
    res.json({ message: 'Password has been reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a message
app.delete('/api/messages/:id', async (req, res) => {
  const messageId = req.params.id;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    // Check if the message belongs to the user
    const result = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    if (result.rows[0].user_id !== user_id) return res.status(403).json({ error: 'Not authorized to delete this message' });
    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const generateGroupId = async () => {
  let groupId;
  let exists = true;
  while (exists) {
    groupId = Math.floor(100000 + Math.random() * 900000).toString();
    const res = await pool.query('SELECT 1 FROM groups WHERE group_id = $1', [groupId]);
    exists = res.rows.length > 0;
  }
  return groupId;
};

// Create group
app.post('/api/groups', async (req, res) => {
  const { name, member_emails, created_by } = req.body;
  if (!name || !created_by) return res.status(400).json({ error: 'Group name and creator required' });
  try {
    const groupId = await generateGroupId();
    const groupRes = await pool.query(
      'INSERT INTO groups (group_id, name, created_by) VALUES ($1, $2, $3) RETURNING id, group_id',
      [groupId, name, created_by]
    );
    const groupDbId = groupRes.rows[0].id;
    // Add creator as member
    await pool.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [groupDbId, created_by]);
    // Add other members by email
    if (Array.isArray(member_emails)) {
      for (const email of member_emails) {
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length > 0) {
          await pool.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupDbId, userRes.rows[0].id]);
        }
      }
    }
    // Email group ID to creator
    const creatorRes = await pool.query('SELECT email FROM users WHERE id = $1', [created_by]);
    if (creatorRes.rows.length > 0) {
      const creatorEmail = creatorRes.rows[0].email;
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: creatorEmail,
        subject: 'Your Group ID for ChatPro',
        html: `<p>Your group <b>${name}</b> has been created.<br>Group ID: <b>${groupId}</b><br>Share this ID with others to let them join your group.</p>`
      });
    }
    res.json({ message: 'Group created! The group ID has been sent to your email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join group (with approval workflow)
app.post('/api/groups/join', async (req, res) => {
  const { group_id, user_id } = req.body;
  if (!group_id || !user_id) return res.status(400).json({ error: 'Group ID and user ID required' });
  try {
    const groupRes = await pool.query('SELECT id, name FROM groups WHERE group_id = $1', [group_id]);
    if (groupRes.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    const groupDbId = groupRes.rows[0].id;
    const groupName = groupRes.rows[0].name;
    // Check if already a member
    const memberRes = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupDbId, user_id]);
    if (memberRes.rows.length > 0) return res.status(400).json({ error: 'Already a group member' });
    // Create join request
    const joinReqRes = await pool.query('INSERT INTO group_join_requests (group_id, user_id) VALUES ($1, $2) RETURNING id', [groupDbId, user_id]);
    const requestId = joinReqRes.rows[0].id;
    // Get all current group members
    const membersRes = await pool.query('SELECT users.email, users.id FROM group_members JOIN users ON group_members.user_id = users.id WHERE group_members.group_id = $1', [groupDbId]);
    // For each member, create approval record and send email
    for (const member of membersRes.rows) {
      const token = uuidv4();
      await pool.query('INSERT INTO group_join_approvals (request_id, approver_id, token) VALUES ($1, $2, $3)', [requestId, member.id, token]);
      // Send email
      const approveUrl = `https://YOUR_FRONTEND_URL/api/groups/join/approve/${token}`;
      const denyUrl = `https://YOUR_FRONTEND_URL/api/groups/join/deny/${token}`;
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: member.email,
        subject: `Approve new member for group ${groupName}`,
        html: `<p>A user wants to join your group <b>${groupName}</b> (ID: ${group_id}).<br>
        Approve: <a href="${approveUrl}">Approve</a><br>
        Deny: <a href="${denyUrl}">Deny</a></p>`
      });
    }
    res.json({ message: 'Join request sent. Waiting for all members to approve.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve join request
app.get('/api/groups/join/approve/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const approvalRes = await pool.query('SELECT * FROM group_join_approvals WHERE token = $1', [token]);
    if (approvalRes.rows.length === 0) return res.status(404).send('Invalid or expired approval link.');
    const approval = approvalRes.rows[0];
    if (approval.status !== 'pending') return res.send('You have already responded to this request.');
    await pool.query('UPDATE group_join_approvals SET status = $1 WHERE token = $2', ['approved', token]);
    // Check if all approvals are done
    const allApprovals = await pool.query('SELECT status FROM group_join_approvals WHERE request_id = $1', [approval.request_id]);
    if (allApprovals.rows.every(a => a.status === 'approved')) {
      // Add user to group
      const joinReq = await pool.query('SELECT group_id, user_id FROM group_join_requests WHERE id = $1', [approval.request_id]);
      if (joinReq.rows.length > 0) {
        await pool.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [joinReq.rows[0].group_id, joinReq.rows[0].user_id]);
        await pool.query('UPDATE group_join_requests SET status = $1 WHERE id = $2', ['approved', approval.request_id]);
      }
    }
    res.send('You have approved the join request.');
  } catch (err) {
    res.status(500).send('Error processing approval.');
  }
});

// Deny join request
app.get('/api/groups/join/deny/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const approvalRes = await pool.query('SELECT * FROM group_join_approvals WHERE token = $1', [token]);
    if (approvalRes.rows.length === 0) return res.status(404).send('Invalid or expired denial link.');
    const approval = approvalRes.rows[0];
    if (approval.status !== 'pending') return res.send('You have already responded to this request.');
    await pool.query('UPDATE group_join_approvals SET status = $1 WHERE token = $2', ['denied', token]);
    await pool.query('UPDATE group_join_requests SET status = $1 WHERE id = $2', ['denied', approval.request_id]);
    res.send('You have denied the join request.');
  } catch (err) {
    res.status(500).send('Error processing denial.');
  }
});

// Get user's groups
app.get('/api/groups/:user_id', async (req, res) => {
  const user_id = req.params.user_id;
  try {
    const result = await pool.query(
      'SELECT g.group_id, g.name FROM groups g JOIN group_members gm ON g.id = gm.group_id WHERE gm.user_id = $1',
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a group
app.get('/api/groups/:group_id/messages', async (req, res) => {
  const group_id = req.params.group_id;
  try {
    const groupRes = await pool.query('SELECT id FROM groups WHERE group_id = $1', [group_id]);
    if (groupRes.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    const groupDbId = groupRes.rows[0].id;
    const result = await pool.query(
      'SELECT messages.id, messages.content, messages.created_at, messages.user_id, users.username FROM messages JOIN users ON messages.user_id = users.id WHERE messages.group_id = $1 ORDER BY messages.created_at ASC',
      [groupDbId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message to a group
app.post('/api/groups/:group_id/messages', async (req, res) => {
  const group_id = req.params.group_id;
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ error: 'user_id and content required' });
  try {
    const groupRes = await pool.query('SELECT id FROM groups WHERE group_id = $1', [group_id]);
    if (groupRes.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    const groupDbId = groupRes.rows[0].id;
    // Check if user is a member
    const memberRes = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupDbId, user_id]);
    if (memberRes.rows.length === 0) return res.status(403).json({ error: 'Not a group member' });
    const result = await pool.query(
      'INSERT INTO messages (user_id, group_id, content) VALUES ($1, $2, $3) RETURNING id, created_at',
      [user_id, groupDbId, content]
    );
    res.json({ id: result.rows[0].id, created_at: result.rows[0].created_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending group join requests for a user
app.get('/api/groups/pending/:user_id', async (req, res) => {
  const user_id = req.params.user_id;
  try {
    const result = await pool.query(
      `SELECT g.group_id, g.name FROM groups g
       JOIN group_join_requests r ON g.id = r.group_id
       WHERE r.user_id = $1 AND r.status = 'pending'`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get join request approval status for a group and user
app.get('/api/groups/:group_id/join-status/:user_id', async (req, res) => {
  const { group_id, user_id } = req.params;
  try {
    // Find the latest pending join request for this user and group
    const reqRes = await pool.query(
      `SELECT id FROM group_join_requests WHERE group_id = (SELECT id FROM groups WHERE group_id = $1) AND user_id = $2 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [group_id, user_id]
    );
    if (reqRes.rows.length === 0) return res.json({ approvals: [] });
    const requestId = reqRes.rows[0].id;
    // Get all approvals for this request
    const approvalsRes = await pool.query(
      `SELECT u.username, u.email, a.status FROM group_join_approvals a JOIN users u ON a.approver_id = u.id WHERE a.request_id = $1`,
      [requestId]
    );
    res.json({ approvals: approvalsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));