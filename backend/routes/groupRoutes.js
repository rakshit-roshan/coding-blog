const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

router.post('/groups', groupController.createGroup);
router.post('/groups/join', groupController.joinGroup);
router.get('/groups/join/approve/:token', groupController.approveJoinRequest);
router.get('/groups/join/deny/:token', groupController.denyJoinRequest);
router.get('/groups/:user_id', groupController.getUserGroups);
router.get('/groups/:group_id/messages', groupController.getGroupMessages);
router.post('/groups/:group_id/messages', groupController.sendGroupMessage);
router.get('/groups/pending/:user_id', groupController.getPendingJoinRequests);
router.get('/groups/:group_id/join-status/:user_id', groupController.getJoinRequestStatus);
router.get('/groups/:group_id/members', groupController.getGroupMembers);
router.post('/groups/:group_id/notify-user', groupController.notifyUser);
router.post('/groups/:group_id/notify-user-custom', groupController.notifyUserCustom);

module.exports = router; 