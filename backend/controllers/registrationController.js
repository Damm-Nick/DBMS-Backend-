// controllers/registrationController.js
const { query, callProcedure } = require('../config/db');

// @desc    Get all registrations
// @route   GET /api/registrations
// @access  Public
exports.getAllRegistrations = async (req, res) => {
  try {
    const { event_id, player_id, team_id, status } = req.query;
    
    let sql = 'SELECT * FROM registrations WHERE 1=1';
    const params = [];

    if (event_id) {
      sql += ' AND event_id = ?';
      params.push(event_id);
    }

    if (player_id) {
      sql += ' AND player_id = ?';
      params.push(player_id);
    }

    if (team_id) {
      sql += ' AND team_id = ?';
      params.push(team_id);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY registration_date DESC';

    const registrations = await query(sql, params);

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
};

// @desc    Get single registration
// @route   GET /api/registrations/:id
// @access  Public
exports.getRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const registrations = await query(
      `SELECT r.*, e.event_name, e.sport_type, e.start_date,
              p.first_name, p.last_name, p.email,
              t.team_name
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       LEFT JOIN players p ON r.player_id = p.player_id
       LEFT JOIN teams t ON r.team_id = t.team_id
       WHERE r.registration_id = ?`,
      [id]
    );

    if (registrations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: registrations[0]
    });
  } catch (error) {
    console.error('Get registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registration',
      error: error.message
    });
  }
};

// @desc    Register for event (Player)
// @route   POST /api/registrations/player
// @access  Public
exports.registerPlayer = async (req, res) => {
  try {
    const { event_id, player_id } = req.body;

    // Check if event exists
    const events = await query(
      'SELECT * FROM events WHERE event_id = ?',
      [event_id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = events[0];

    // Check if event is team-based
    if (event.is_team_based) {
      return res.status(400).json({
        success: false,
        message: 'This is a team-based event. Please register as a team.'
      });
    }

    // Check registration deadline
    if (new Date(event.registration_deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    // Check if already registered
    const existing = await query(
      'SELECT registration_id FROM registrations WHERE event_id = ? AND player_id = ? AND status != ?',
      [event_id, player_id, 'Cancelled']
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Player already registered for this event'
      });
    }

    // Check if event is full
    let status = 'Confirmed';
    if (event.current_participants >= event.max_participants) {
      status = 'Waitlisted';
    }

    // Register player
    const result = await query(
      'INSERT INTO registrations (event_id, player_id, status) VALUES (?, ?, ?)',
      [event_id, player_id, status]
    );

    const newRegistration = await query(
      'SELECT * FROM registrations WHERE registration_id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: status === 'Confirmed' ? 'Player registered successfully' : 'Player added to waitlist',
      data: newRegistration[0]
    });
  } catch (error) {
    console.error('Register player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering player',
      error: error.message
    });
  }
};

// @desc    Register for event (Team)
// @route   POST /api/registrations/team
// @access  Public
exports.registerTeam = async (req, res) => {
  try {
    const { event_id, team_id } = req.body;

    // Check if event exists
    const events = await query(
      'SELECT * FROM events WHERE event_id = ?',
      [event_id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = events[0];

    // Check if event is team-based
    if (!event.is_team_based) {
      return res.status(400).json({
        success: false,
        message: 'This is not a team-based event. Please register as individual player.'
      });
    }

    // Check registration deadline
    if (new Date(event.registration_deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    // Check if already registered
    const existing = await query(
      'SELECT registration_id FROM registrations WHERE event_id = ? AND team_id = ? AND status != ?',
      [event_id, team_id, 'Cancelled']
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Team already registered for this event'
      });
    }

    // Check if event is full
    let status = 'Confirmed';
    if (event.current_participants >= event.max_participants) {
      status = 'Waitlisted';
    }

    // Register team
    const result = await query(
      'INSERT INTO registrations (event_id, team_id, status) VALUES (?, ?, ?)',
      [event_id, team_id, status]
    );

    const newRegistration = await query(
      'SELECT * FROM registrations WHERE registration_id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: status === 'Confirmed' ? 'Team registered successfully' : 'Team added to waitlist',
      data: newRegistration[0]
    });
  } catch (error) {
    console.error('Register team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering team',
      error: error.message
    });
  }
};

// @desc    Cancel registration
// @route   PUT /api/registrations/:id/cancel
// @access  Public
exports.cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if registration exists
    const registrations = await query(
      'SELECT * FROM registrations WHERE registration_id = ?',
      [id]
    );

    if (registrations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    const registration = registrations[0];

    if (registration.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Registration already cancelled'
      });
    }

    // Cancel registration
    await query(
      'UPDATE registrations SET status = ? WHERE registration_id = ?',
      ['Cancelled', id]
    );

    // Promote waitlisted participant if exists
    const waitlisted = await query(
      'SELECT registration_id FROM registrations WHERE event_id = ? AND status = ? ORDER BY registration_date ASC LIMIT 1',
      [registration.event_id, 'Waitlisted']
    );

    if (waitlisted.length > 0) {
      await query(
        'UPDATE registrations SET status = ? WHERE registration_id = ?',
        ['Confirmed', waitlisted[0].registration_id]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully. Waitlisted participant promoted if available.'
    });
  } catch (error) {
    console.error('Cancel registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling registration',
      error: error.message
    });
  }
};

// @desc    Update registration status
// @route   PUT /api/registrations/:id
// @access  Private (Admin only)
exports.updateRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const existing = await query(
      'SELECT registration_id FROM registrations WHERE registration_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    const updateFields = {};
    if (status) updateFields.status = status;
    if (payment_status) updateFields.payment_status = payment_status;

    const fields = Object.keys(updateFields);
    const values = Object.values(updateFields);

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    values.push(id);

    await query(
      `UPDATE registrations SET ${setClause} WHERE registration_id = ?`,
      values
    );

    const updated = await query(
      'SELECT * FROM registrations WHERE registration_id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Registration updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating registration',
      error: error.message
    });
  }
};

// @desc    Delete registration
// @route   DELETE /api/registrations/:id
// @access  Private (Admin only)
exports.deleteRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT registration_id FROM registrations WHERE registration_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    await query('DELETE FROM registrations WHERE registration_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Registration deleted successfully'
    });
  } catch (error) {
    console.error('Delete registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting registration',
      error: error.message
    });
  }
};

// @desc    Get registration overview by event
// @route   GET /api/registrations/event/:eventId/overview
// @access  Public
exports.getRegistrationOverview = async (req, res) => {
  try {
    const { eventId } = req.params;

    const overview = await query(
      'SELECT * FROM vw_registration_overview WHERE event_id = ?',
      [eventId]
    );

    if (overview.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No registration data found for this event'
      });
    }

    res.status(200).json({
      success: true,
      data: overview[0]
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registration overview',
      error: error.message
    });
  }
};