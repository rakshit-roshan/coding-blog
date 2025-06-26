const pool = require('../db');

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

module.exports = generateGroupId; 