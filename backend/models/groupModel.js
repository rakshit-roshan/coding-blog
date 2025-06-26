const pool = require('../db');

const groupModel = {
  createGroup: async (groupId, name, createdBy) => {
    const res = await pool.query(
      'INSERT INTO groups (group_id, name, created_by) VALUES ($1, $2, $3) RETURNING id, group_id, name',
      [groupId, name, createdBy]
    );
    return res.rows[0];
  },
  addMember: async (groupDbId, userId) => {
    await pool.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupDbId, userId]);
  },
  findByGroupId: async (groupId) => {
    const res = await pool.query('SELECT * FROM groups WHERE group_id = $1', [groupId]);
    return res.rows[0];
  },
  getMembers: async (groupDbId) => {
    const res = await pool.query('SELECT users.id, users.email, users.username FROM group_members JOIN users ON group_members.user_id = users.id WHERE group_members.group_id = $1', [groupDbId]);
    return res.rows;
  },
  createJoinRequest: async (groupDbId, userId) => {
    const res = await pool.query('INSERT INTO group_join_requests (group_id, user_id) VALUES ($1, $2) RETURNING id', [groupDbId, userId]);
    return res.rows[0];
  },
  createApproval: async (requestId, approverId, token) => {
    await pool.query('INSERT INTO group_join_approvals (request_id, approver_id, token) VALUES ($1, $2, $3)', [requestId, approverId, token]);
  },
  getUserGroups: async (userId) => {
    const res = await pool.query('SELECT g.group_id, g.name FROM groups g JOIN group_members gm ON g.id = gm.group_id WHERE gm.user_id = $1', [userId]);
    return res.rows;
  },
  getPendingJoinRequests: async (userId) => {
    const res = await pool.query(
      `SELECT g.group_id, g.name FROM groups g
       JOIN group_join_requests r ON g.id = r.group_id
       WHERE r.user_id = $1 AND r.status = 'pending'`,
      [userId]
    );
    return res.rows;
  },
  getJoinRequestByToken: async (token) => {
    const res = await pool.query('SELECT * FROM group_join_approvals WHERE token = $1', [token]);
    return res.rows[0];
  },
  updateApprovalStatus: async (token, status) => {
    await pool.query('UPDATE group_join_approvals SET status = $1 WHERE token = $2', [status, token]);
  },
  getAllApprovalsForRequest: async (requestId) => {
    const res = await pool.query('SELECT status FROM group_join_approvals WHERE request_id = $1', [requestId]);
    return res.rows;
  },
  getJoinRequest: async (requestId) => {
    const res = await pool.query('SELECT * FROM group_join_requests WHERE id = $1', [requestId]);
    return res.rows[0];
  },
  updateJoinRequestStatus: async (requestId, status) => {
    await pool.query('UPDATE group_join_requests SET status = $1 WHERE id = $2', [status, requestId]);
  },
  getJoinRequestStatus: async (groupId, userId) => {
    const reqRes = await pool.query(
      `SELECT id, status FROM group_join_requests WHERE group_id = (SELECT id FROM groups WHERE group_id = $1) AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [groupId, userId]
    );
    if (reqRes.rows.length === 0) return null;
    const requestId = reqRes.rows[0].id;
    const joinStatus = reqRes.rows[0].status;
    const approvalsRes = await pool.query(
      `SELECT u.username, u.email, a.status FROM group_join_approvals a JOIN users u ON a.approver_id = u.id WHERE a.request_id = $1`,
      [requestId]
    );
    return { approvals: approvalsRes.rows, joinStatus };
  }
};

module.exports = groupModel; 