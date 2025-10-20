// routes/registrations.js
const express = require('express');
const router = express.Router();
const {
  getAllRegistrations,
  getRegistration,
  registerPlayer,
  registerTeam,
  cancelRegistration,
  updateRegistration,
  deleteRegistration,
  getRegistrationOverview
} = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/auth');
const { registrationValidation, validate } = require('../middleware/validation');

// Public routes
router.get('/', getAllRegistrations);
router.get('/:id', getRegistration);
router.post('/player', registrationValidation.register, validate, registerPlayer);
router.post('/team', registerTeam);
router.put('/:id/cancel', cancelRegistration);
router.get('/event/:eventId/overview', getRegistrationOverview);

// Protected routes (Admin only)
router.put('/:id', protect, authorize('super_admin', 'event_manager'), updateRegistration);
router.delete('/:id', protect, authorize('super_admin', 'event_manager'), deleteRegistration);

module.exports = router;