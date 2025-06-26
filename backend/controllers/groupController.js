const groupModel = require('../models/groupModel');
const userModel = require('../models/userModel');
const messageModel = require('../models/messageModel');
const generateGroupId = require('../utils/generateGroupId');
const { sendMail } = require('../utils/mailer');
const { v4: uuidv4 } = require('uuid');

const groupController = {
  createGroup: async (req, res) => {
    const { name, member_emails, created_by } = req.body;
    if (!name || !created_by) return res.status(400).json({ error: 'Group name and creator required' });
    try {
      const groupId = await generateGroupId();
      const group = await groupModel.createGroup(groupId, name, created_by);
      await groupModel.addMember(group.id, created_by);
      if (Array.isArray(member_emails)) {
        for (const email of member_emails) {
          const user = await userModel.findByEmail(email);
          if (user) {
            await groupModel.addMember(group.id, user.id);
          }
        }
      }
      // Email group ID to creator
      const creator = await userModel.findById(created_by);
      const creatorEmail = creator ? creator.email : null;
      if (creatorEmail) {
        await sendMail({
          from: process.env.EMAIL_USER,
          to: creatorEmail,
          subject: 'Your Group ID for Secure Tunnel',
          html: `<p>Your group <b>${name}</b> has been created.<br>Group ID: <b>${groupId}</b><br>Share this ID with others to let them join your group.</p>`
        });
      }
      res.json({ message: 'Group created! The group ID has been sent to your email.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  joinGroup: async (req, res) => {
    const { group_id, user_id } = req.body;
    if (!group_id || !user_id) return res.status(400).json({ error: 'Group ID and user ID required' });
    try {
      const group = await groupModel.findByGroupId(group_id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      const groupDbId = group.id;
      // Check if already a member
      const members = await groupModel.getMembers(groupDbId);
      if (members.some(m => m.id === user_id)) {
        return res.status(200).json({ alreadyMember: true, group_id, group_name: group.name });
      }
      // Create join request
      const joinReq = await groupModel.createJoinRequest(groupDbId, user_id);
      // Get all current group members
      for (const member of members) {
        const token = uuidv4();
        await groupModel.createApproval(joinReq.id, member.id, token);
        // Get requesting user's info
        const requester = await userModel.findByUsername(user_id) || await userModel.findByEmail(user_id);
        const approveUrl = `https://coding-blog-kdzv.onrender.com/api/groups/join/approve/${token}`;
        const denyUrl = `https://coding-blog-kdzv.onrender.com/api/groups/join/deny/${token}`;
        await sendMail({
          from: process.env.EMAIL_USER,
          to: member.email,
          subject: `Approve new member for group ${group.name}`,
          html: `<p>User <b>${requester?.username || ''}</b> (${requester?.email || ''}) wants to join your group <b>${group.name}</b> (ID: ${group_id}).<br>
          Approve: <a href="${approveUrl}">Approve</a><br>
          Deny: <a href="${denyUrl}">Deny</a></p>`
        });
      }
      res.json({ message: 'Join request sent. Waiting for all members to approve.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  approveJoinRequest: async (req, res) => {
    const { token } = req.params;
    try {
      const approval = await groupModel.getJoinRequestByToken(token);
      if (!approval) return res.status(404).send('Invalid or expired approval link.');
      if (approval.status !== 'pending') return res.send('You have already responded to this request.');
      await groupModel.updateApprovalStatus(token, 'approved');
      // Check if all approvals are done
      const allApprovals = await groupModel.getAllApprovalsForRequest(approval.request_id);
      if (allApprovals.every(a => a.status === 'approved')) {
        // Add user to group
        const joinReq = await groupModel.getJoinRequest(approval.request_id);
        if (joinReq) {
          await groupModel.addMember(joinReq.group_id, joinReq.user_id);
          await groupModel.updateJoinRequestStatus(approval.request_id, 'approved');
        }
      }
      res.send('You have approved the join request.');
    } catch (err) {
      res.status(500).send('Error processing approval.');
    }
  },
  denyJoinRequest: async (req, res) => {
    const { token } = req.params;
    try {
      const approval = await groupModel.getJoinRequestByToken(token);
      if (!approval) return res.status(404).send('Invalid or expired denial link.');
      if (approval.status !== 'pending') return res.send('You have already responded to this request.');
      await groupModel.updateApprovalStatus(token, 'denied');
      await groupModel.updateJoinRequestStatus(approval.request_id, 'denied');
      res.send('You have denied the join request.');
    } catch (err) {
      res.status(500).send('Error processing denial.');
    }
  },
  getUserGroups: async (req, res) => {
    const user_id = req.params.user_id;
    try {
      const groups = await groupModel.getUserGroups(user_id);
      res.json(groups);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getGroupMessages: async (req, res) => {
    const group_id = req.params.group_id;
    try {
      const group = await groupModel.findByGroupId(group_id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      const messages = await messageModel.getByGroupId(group.id);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  sendGroupMessage: async (req, res) => {
    const group_id = req.params.group_id;
    const { user_id, content } = req.body;
    if (!user_id || !content) return res.status(400).json({ error: 'user_id and content required' });
    try {
      const group = await groupModel.findByGroupId(group_id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      // Check if user is a member
      const members = await groupModel.getMembers(group.id);
      if (!members.some(m => m.id === user_id)) return res.status(403).json({ error: 'Not a group member' });
      const msg = await messageModel.createForGroup(user_id, group.id, content);
      res.json({ id: msg.id, created_at: msg.created_at });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getPendingJoinRequests: async (req, res) => {
    const user_id = req.params.user_id;
    try {
      const pending = await groupModel.getPendingJoinRequests(user_id);
      res.json(pending);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getJoinRequestStatus: async (req, res) => {
    const { group_id, user_id } = req.params;
    try {
      const approvals = await groupModel.getJoinRequestStatus(group_id, user_id);
      res.json({ approvals: approvals || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = groupController; 