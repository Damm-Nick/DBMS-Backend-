// middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Player validation rules
exports.playerValidation = {
  register: [
    body('first_name')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
    body('last_name')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email'),
    body('phone')
      .optional()
      .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
    body('date_of_birth')
      .optional()
      .isDate().withMessage('Please provide a valid date'),
    body('gender')
      .optional()
      .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
    body('skill_level')
      .optional()
      .isIn(['Beginner', 'Intermediate', 'Advanced']).withMessage('Invalid skill level')
  ],
  update: [
    param('id').isInt().withMessage('Invalid player ID'),
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
    body('last_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Please provide a valid email'),
    body('phone')
      .optional()
      .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits')
  ]
};

// Event validation rules
exports.eventValidation = {
  create: [
    body('event_name')
      .trim()
      .notEmpty().withMessage('Event name is required')
      .isLength({ min: 3, max: 100 }).withMessage('Event name must be 3-100 characters'),
    body('sport_type')
      .trim()
      .notEmpty().withMessage('Sport type is required'),
    body('event_type')
      .isIn(['Tournament', 'League', 'Knockout']).withMessage('Invalid event type'),
    body('format')
      .isIn(['Single Elimination', 'Double Elimination', 'Round Robin']).withMessage('Invalid format'),
    body('start_date')
      .isDate().withMessage('Valid start date is required')
      .custom((value) => {
        if (new Date(value) < new Date()) {
          throw new Error('Start date must be in the future');
        }
        return true;
      }),
    body('end_date')
      .isDate().withMessage('Valid end date is required')
      .custom((value, { req }) => {
        if (new Date(value) < new Date(req.body.start_date)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('registration_deadline')
      .isDate().withMessage('Valid registration deadline is required')
      .custom((value, { req }) => {
        if (new Date(value) > new Date(req.body.start_date)) {
          throw new Error('Registration deadline must be before start date');
        }
        return true;
      }),
    body('max_participants')
      .isInt({ min: 2 }).withMessage('Max participants must be at least 2'),
    body('is_team_based')
      .isBoolean().withMessage('is_team_based must be true or false')
  ]
};

// Match validation rules
exports.matchValidation = {
  schedule: [
    body('event_id').isInt().withMessage('Valid event ID is required'),
    body('participant1_id').isInt().withMessage('Valid participant 1 ID is required'),
    body('participant2_id').isInt().withMessage('Valid participant 2 ID is required'),
    body('match_date')
      .isDate().withMessage('Valid match date is required'),
    body('match_time')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('Valid time format (HH:MM:SS) is required'),
    body('venue_id').isInt().withMessage('Valid venue ID is required'),
    body('round_name')
      .trim()
      .notEmpty().withMessage('Round name is required')
  ],
  updateScore: [
    param('id').isInt().withMessage('Invalid match ID'),
    body('participant1_score').isInt({ min: 0 }).withMessage('Valid score is required'),
    body('participant2_score').isInt({ min: 0 }).withMessage('Valid score is required')
  ]
};

// Registration validation rules
exports.registrationValidation = {
  register: [
    body('event_id').isInt().withMessage('Valid event ID is required'),
    body('player_id')
      .optional()
      .isInt().withMessage('Valid player ID is required'),
    body('team_id')
      .optional()
      .isInt().withMessage('Valid team ID is required'),
    body().custom((value) => {
      if (!value.player_id && !value.team_id) {
        throw new Error('Either player_id or team_id is required');
      }
      if (value.player_id && value.team_id) {
        throw new Error('Cannot provide both player_id and team_id');
      }
      return true;
    })
  ]
};

// Team validation rules
exports.teamValidation = {
  create: [
    body('team_name')
      .trim()
      .notEmpty().withMessage('Team name is required')
      .isLength({ min: 3, max: 100 }).withMessage('Team name must be 3-100 characters'),
    body('captain_id').isInt().withMessage('Valid captain ID is required'),
    body('event_id').isInt().withMessage('Valid event ID is required'),
    body('member_ids')
      .optional()
      .isArray().withMessage('Member IDs must be an array')
  ]
};

// Auth validation rules
exports.authValidation = {
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email'),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  register: [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['super_admin', 'event_manager']).withMessage('Invalid role')
  ]
};