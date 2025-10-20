// routes/players.js
const express = require('express');
const router = express.Router();
const {
  getAllPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayerStats,
  getPlayerMatches
} = require('../controllers/playerController');
const { protect, authorize } = require('../middleware/auth');
const { playerValidation, validate } = require('../middleware/validation');

// Public routes
router.get('/', getAllPlayers);
router.get('/:id', getPlayer);
router.post('/', playerValidation.register, validate, createPlayer);
router.get('/:id/stats', getPlayerStats);
router.get('/:id/matches', getPlayerMatches);

// Protected routes
router.put('/:id', playerValidation.update, validate, updatePlayer);
router.delete('/:id', protect, authorize('super_admin', 'event_manager'), deletePlayer);

module.exports = router;
