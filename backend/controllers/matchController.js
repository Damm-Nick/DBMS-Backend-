// controllers/matchController.js
const { query, callProcedure } = require('../config/db');

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
exports.getAllMatches = async (req, res) => {
  try {
    const { event_id, match_status, venue_id } = req.query;
    
    let sql = 'SELECT * FROM matches WHERE 1=1';
    const params = [];

    if (event_id) {
      sql += ' AND event_id = ?';
      params.push(event_id);
    }

    if (match_status) {
      sql += ' AND match_status = ?';
      params.push(match_status);
    }

    if (venue_id) {
      sql += ' AND venue_id = ?';
      params.push(venue_id);
    }

    sql += ' ORDER BY match_date DESC, match_time DESC';

    const matches = await query(sql, params);

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching matches',
      error: error.message
    });
  }
};

// @desc    Get single match
// @route   GET /api/matches/:id
// @access  Public
exports.getMatch = async (req, res) => {
  try {
    const { id } = req.params;

    const matches = await query(
      `SELECT m.*, e.event_name, v.venue_name, v.location
       FROM matches m
       JOIN events e ON m.event_id = e.event_id
       LEFT JOIN venues v ON m.venue_id = v.venue_id
       WHERE m.match_id = ?`,
      [id]
    );

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.status(200).json({
      success: true,
      data: matches[0]
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match',
      error: error.message
    });
  }
};

// @desc    Schedule match
// @route   POST /api/matches
// @access  Private (Admin only)
exports.scheduleMatch = async (req, res) => {
  try {
    const {
      event_id,
      bracket_id,
      round_name,
      match_date,
      match_time,
      venue_id,
      participant1_id,
      participant2_id,
      is_team
    } = req.body;

    // Create match
    const result = await query(
      `INSERT INTO matches (event_id, bracket_id, round_name, match_date, match_time, venue_id, match_status)
       VALUES (?, ?, ?, ?, ?, ?, 'Scheduled')`,
      [event_id, bracket_id || null, round_name, match_date, match_time, venue_id]
    );

    const matchId = result.insertId;

    // Add participants
    if (is_team) {
      await query(
        'INSERT INTO match_participants (match_id, team_id) VALUES (?, ?), (?, ?)',
        [matchId, participant1_id, matchId, participant2_id]
      );
    } else {
      await query(
        'INSERT INTO match_participants (match_id, player_id) VALUES (?, ?), (?, ?)',
        [matchId, participant1_id, matchId, participant2_id]
      );
    }

    const newMatch = await query(
      'SELECT * FROM matches WHERE match_id = ?',
      [matchId]
    );

    res.status(201).json({
      success: true,
      message: 'Match scheduled successfully',
      data: newMatch[0]
    });
  } catch (error) {
    console.error('Schedule match error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling match',
      error: error.message
    });
  }
};

// @desc    Update match
// @route   PUT /api/matches/:id
// @access  Private (Admin only)
exports.updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const existing = await query('SELECT match_id FROM matches WHERE match_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
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
      `UPDATE matches SET ${setClause} WHERE match_id = ?`,
      values
    );

    const updatedMatch = await query('SELECT * FROM matches WHERE match_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Match updated successfully',
      data: updatedMatch[0]
    });
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating match',
      error: error.message
    });
  }
};

// @desc    Update match score
// @route   PUT /api/matches/:id/score
// @access  Private (Admin only)
exports.updateMatchScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { participant1_id, participant1_score, participant2_id, participant2_score, is_team } = req.body;

    // Get match details
    const matches = await query('SELECT * FROM matches WHERE match_id = ?', [id]);
    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Determine winner
    let winnerId = null;
    let result1 = 'Draw';
    let result2 = 'Draw';

    if (participant1_score > participant2_score) {
      winnerId = participant1_id;
      result1 = 'Win';
      result2 = 'Loss';
    } else if (participant2_score > participant1_score) {
      winnerId = participant2_id;
      result1 = 'Loss';
      result2 = 'Win';
    }

    // Update participant 1 score
    if (is_team) {
      await query(
        'UPDATE match_participants SET score = ?, result = ? WHERE match_id = ? AND team_id = ?',
        [participant1_score, result1, id, participant1_id]
      );
      await query(
        'UPDATE match_participants SET score = ?, result = ? WHERE match_id = ? AND team_id = ?',
        [participant2_score, result2, id, participant2_id]
      );
    } else {
      await query(
        'UPDATE match_participants SET score = ?, result = ? WHERE match_id = ? AND player_id = ?',
        [participant1_score, result1, id, participant1_id]
      );
      await query(
        'UPDATE match_participants SET score = ?, result = ? WHERE match_id = ? AND player_id = ?',
        [participant2_score, result2, id, participant2_id]
      );
    }

    // Update match status and winner
    await query(
      'UPDATE matches SET match_status = ?, winner_id = ? WHERE match_id = ?',
      ['Completed', winnerId, id]
    );

    // Log the result
    await query(
      'INSERT INTO game_logs (match_id, event_type, description) VALUES (?, ?, ?)',
      [id, 'Match Completed', `Final Score: ${participant1_score} - ${participant2_score}`]
    );

    const updatedMatch = await query('SELECT * FROM matches WHERE match_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Match score updated successfully',
      data: updatedMatch[0]
    });
  } catch (error) {
    console.error('Update score error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating match score',
      error: error.message
    });
  }
};

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private (Admin only)
exports.deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT match_id FROM matches WHERE match_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    await query('DELETE FROM matches WHERE match_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Match deleted successfully'
    });
  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting match',
      error: error.message
    });
  }
};

// @desc    Get match participants
// @route   GET /api/matches/:id/participants
// @access  Public
exports.getMatchParticipants = async (req, res) => {
  try {
    const { id } = req.params;

    const participants = await query(
      `SELECT mp.*, 
              p.first_name, p.last_name, p.email,
              t.team_name
       FROM match_participants mp
       LEFT JOIN players p ON mp.player_id = p.player_id
       LEFT JOIN teams t ON mp.team_id = t.team_id
       WHERE mp.match_id = ?`,
      [id]
    );

    res.status(200).json({
      success: true,
      count: participants.length,
      data: participants
    });
  } catch (error) {
    console.error('Get match participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match participants',
      error: error.message
    });
  }
};

// @desc    Get match logs
// @route   GET /api/matches/:id/logs
// @access  Public
exports.getMatchLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await query(
      `SELECT gl.*, p.first_name, p.last_name
       FROM game_logs gl
       LEFT JOIN players p ON gl.player_id = p.player_id
       WHERE gl.match_id = ?
       ORDER BY gl.log_time ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Get match logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match logs',
      error: error.message
    });
  }
};

// @desc    Get upcoming matches
// @route   GET /api/matches/upcoming
// @access  Public
exports.getUpcomingMatches = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const matches = await query(
      'SELECT * FROM vw_upcoming_matches LIMIT ?',
      [parseInt(limit)]
    );

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('Get upcoming matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming matches',
      error: error.message
    });
  }
};