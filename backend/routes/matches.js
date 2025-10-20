// routes/matches.js
const express = require('express');
const router = express.Router();
const {
  getAllMatches,
  getMatch,
  scheduleMatch,
  updateMatch,
  updateMatchScore,
  deleteMatch,
  getMatchParticipants,
  getMatchLogs,
  getUpcomingMatches
} = require('../controllers/matchController');
const { protect, authorize } = require('../middleware/auth');
const { matchValidation, validate } = require('../middleware/validation');

// Public routes
router.get('/', getAllMatches);
router.get('/upcoming', getUpcomingMatches);
router.get('/:id', getMatch);
router.get('/:id/participants', getMatchParticipants);
router.get('/:id/logs', getMatchLogs);

// Protected routes (Admin only)
router.post('/', protect, authorize('super_admin', 'event_manager'), matchValidation.schedule, validate, scheduleMatch);
router.put('/:id', protect, authorize('super_admin', 'event_manager'), updateMatch);
router.put('/:id/score', protect, authorize('super_admin', 'event_manager'), matchValidation.updateScore, validate, updateMatchScore);
router.delete('/:id', protect, authorize('super_admin', 'event_manager'), deleteMatch);

module.exports = router;