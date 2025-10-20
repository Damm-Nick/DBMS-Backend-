// controllers/eventController.js
const { query, callProcedure } = require('../config/db');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getAllEvents = async (req, res) => {
  try {
    const { sport_type, event_status, search } = req.query;
    
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (sport_type) {
      sql += ' AND sport_type = ?';
      params.push(sport_type);
    }

    if (event_status) {
      sql += ' AND event_status = ?';
      params.push(event_status);
    }

    if (search) {
      sql += ' AND event_name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY start_date DESC';

    const events = await query(sql, params);

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
      error: error.message
    });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const events = await query(
      'SELECT * FROM events WHERE event_id = ?',
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: events[0]
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event',
      error: error.message
    });
  }
};

// @desc    Create event
// @route   POST /api/events
// @access  Private (Admin only)
exports.createEvent = async (req, res) => {
  try {
    const {
      event_name,
      sport_type,
      event_type,
      format,
      start_date,
      end_date,
      registration_deadline,
      max_participants,
      is_team_based
    } = req.body;

    const result = await query(
      `INSERT INTO events (event_name, sport_type, event_type, format, start_date, end_date, 
       registration_deadline, max_participants, is_team_based, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [event_name, sport_type, event_type, format, start_date, end_date, 
       registration_deadline, max_participants, is_team_based, req.user.id]
    );

    const newEvent = await query(
      'SELECT * FROM events WHERE event_id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent[0]
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating event',
      error: error.message
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Admin only)
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const existing = await query('SELECT event_id FROM events WHERE event_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

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
      `UPDATE events SET ${setClause} WHERE event_id = ?`,
      values
    );

    const updatedEvent = await query('SELECT * FROM events WHERE event_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent[0]
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating event',
      error: error.message
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Admin only)
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT event_id FROM events WHERE event_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await query('DELETE FROM events WHERE event_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting event',
      error: error.message
    });
  }
};

// @desc    Get event leaderboard
// @route   GET /api/events/:id/leaderboard
// @access  Public
exports.getEventLeaderboard = async (req, res) => {
  try {
    const { id } = req.params;

    const leaderboard = await query(
      'SELECT * FROM vw_event_leaderboard WHERE event_id = ? ORDER BY event_rank',
      [id]
    );

    res.status(200).json({
      success: true,
      count: leaderboard.length,
      data: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard',
      error: error.message
    });
  }
};

// @desc    Get event participants
// @route   GET /api/events/:id/participants
// @access  Public
exports.getEventParticipants = async (req, res) => {
  try {
    const { id } = req.params;

    const participants = await query(
      `SELECT r.registration_id, r.status, r.registration_date,
              p.player_id, p.first_name, p.last_name, p.email,
              t.team_id, t.team_name
       FROM registrations r
       LEFT JOIN players p ON r.player_id = p.player_id
       LEFT JOIN teams t ON r.team_id = t.team_id
       WHERE r.event_id = ?
       ORDER BY r.registration_date DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      count: participants.length,
      data: participants
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching participants',
      error: error.message
    });
  }
};

// @desc    Get event summary
// @route   GET /api/events/:id/summary
// @access  Public
exports.getEventSummary = async (req, res) => {
  try {
    const { id } = req.params;

    const summary = await query(
      'SELECT * FROM vw_event_summary WHERE event_id = ?',
      [id]
    );

    if (summary.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: summary[0]
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event summary',
      error: error.message
    });
  }
};