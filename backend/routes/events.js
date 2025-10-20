// routes/events.js
const express = require('express');
const router = express.Router();
const {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventLeaderboard,
  getEventParticipants,
  getEventSummary
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const { eventValidation, validate } = require('../middleware/validation');

// Public routes
router.get('/', getAllEvents);
router.get('/:id', getEvent);
router.get('/:id/leaderboard', getEventLeaderboard);
router.get('/:id/participants', getEventParticipants);
router.get('/:id/summary', getEventSummary);

// Protected routes (Admin only)
router.post('/', protect, authorize('super_admin', 'event_manager'), eventValidation.create, validate, createEvent);
router.put('/:id', protect, authorize('super_admin', 'event_manager'), updateEvent);
router.delete('/:id', protect, authorize('super_admin', 'event_manager'), deleteEvent);

module.exports = router;