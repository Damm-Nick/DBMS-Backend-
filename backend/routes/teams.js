// routes/teams.js
const express = require('express');
const router = express.Router();
const {
  getAllTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  getTeamPerformance
} = require('../controllers/teamController');
const { protect, authorize } = require('../middleware/auth');
const { teamValidation, validate } = require('../middleware/validation');

// Public routes
router.get('/', getAllTeams);
router.get('/:id', getTeam);
router.post('/', teamValidation.create, validate, createTeam);
router.put('/:id', updateTeam);
router.get('/:id/members', getTeamMembers);
router.post('/:id/members', addTeamMember);
router.delete('/:id/members/:memberId', removeTeamMember);
router.get('/:id/performance', getTeamPerformance);

// Protected routes (Admin only)
router.delete('/:id', protect, authorize('super_admin', 'event_manager'), deleteTeam);

module.exports = router;