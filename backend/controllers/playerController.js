// controllers/playerController.js
const { query, callProcedure } = require('../config/db');

// @desc    Get all players
// @route   GET /api/players
// @access  Public
exports.getAllPlayers = async (req, res) => {
  try {
    const { skill_level, search, limit = 50, offset = 0 } = req.query;
    
    let sql = 'SELECT * FROM players WHERE 1=1';
    const params = [];

    if (skill_level) {
      sql += ' AND skill_level = ?';
      params.push(skill_level);
    }

    if (search) {
      sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY registration_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const players = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM players WHERE 1=1';
    const countParams = [];
    
    if (skill_level) {
      countSql += ' AND skill_level = ?';
      countParams.push(skill_level);
    }
    
    if (search) {
      countSql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await query(countSql, countParams);

    res.status(200).json({
      success: true,
      count: players.length,
      total: countResult.total,
      data: players
    });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching players',
      error: error.message
    });
  }
};

// @desc    Get single player
// @route   GET /api/players/:id
// @access  Public
exports.getPlayer = async (req, res) => {
  try {
    const { id } = req.params;

    const players = await query(
      'SELECT * FROM players WHERE player_id = ?',
      [id]
    );

    if (players.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.status(200).json({
      success: true,
      data: players[0]
    });
  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching player',
      error: error.message
    });
  }
};

// @desc    Create new player
// @route   POST /api/players
// @access  Public
exports.createPlayer = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      gender,
      skill_level
    } = req.body;

    // Check if email already exists
    const existing = await query('SELECT player_id FROM players WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Player with this email already exists'
      });
    }

    // Insert player
    const result = await query(
      `INSERT INTO players (first_name, last_name, email, phone, date_of_birth, gender, skill_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, phone || null, date_of_birth || null, gender || null, skill_level || 'Beginner']
    );

    const newPlayer = await query(
      'SELECT * FROM players WHERE player_id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Player registered successfully',
      data: newPlayer[0]
    });
  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating player',
      error: error.message
    });
  }
};

// @desc    Update player
// @route   PUT /api/players/:id
// @access  Public/Private
exports.updatePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Check if player exists
    const existing = await query('SELECT player_id FROM players WHERE player_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Build dynamic update query
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
      `UPDATE players SET ${setClause} WHERE player_id = ?`,
      values
    );

    const updatedPlayer = await query('SELECT * FROM players WHERE player_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Player updated successfully',
      data: updatedPlayer[0]
    });
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating player',
      error: error.message
    });
  }
};

// @desc    Delete player
// @route   DELETE /api/players/:id
// @access  Private (Admin only)
exports.deletePlayer = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if player exists
    const existing = await query('SELECT player_id FROM players WHERE player_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    await query('DELETE FROM players WHERE player_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Player deleted successfully'
    });
  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting player',
      error: error.message
    });
  }
};

// @desc    Get player statistics
// @route   GET /api/players/:id/stats
// @access  Public
exports.getPlayerStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { event_id } = req.query;

    if (event_id) {
      // Get stats for specific event using stored procedure
      const results = await callProcedure('sp_get_player_stats', [parseInt(id), parseInt(event_id)]);
      
      if (results[0].length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No statistics found for this player in this event'
        });
      }

      res.status(200).json({
        success: true,
        data: results[0][0]
      });
    } else {
      // Get overall stats from view
      const stats = await query(
        'SELECT * FROM vw_player_leaderboard WHERE player_id = ?',
        [id]
      );

      if (stats.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No statistics found for this player'
        });
      }

      res.status(200).json({
        success: true,
        data: stats[0]
      });
    }
  } catch (error) {
    console.error('Get player stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching player statistics',
      error: error.message
    });
  }
};

// @desc    Get player match history
// @route   GET /api/players/:id/matches
// @access  Public
exports.getPlayerMatches = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const matches = await query(
      `SELECT * FROM vw_player_match_history 
       WHERE player_id = ? 
       ORDER BY match_date DESC 
       LIMIT ? OFFSET ?`,
      [id, parseInt(limit), parseInt(offset)]
    );

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('Get player matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching player matches',
      error: error.message
    });
  }
};