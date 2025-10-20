// controllers/teamController.js
const { query } = require('../config/db');

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public
exports.getAllTeams = async (req, res) => {
  try {
    const { event_id } = req.query;
    
    let sql = 'SELECT * FROM teams WHERE 1=1';
    const params = [];

    if (event_id) {
      sql += ' AND event_id = ?';
      params.push(event_id);
    }

    sql += ' ORDER BY created_date DESC';

    const teams = await query(sql, params);

    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teams',
      error: error.message
    });
  }
};

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Public
exports.getTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const teams = await query(
      `SELECT t.*, e.event_name, p.first_name as captain_first_name, p.last_name as captain_last_name
       FROM teams t
       JOIN events e ON t.event_id = e.event_id
       JOIN players p ON t.captain_id = p.player_id
       WHERE t.team_id = ?`,
      [id]
    );

    if (teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.status(200).json({
      success: true,
      data: teams[0]
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team',
      error: error.message
    });
  }
};

// @desc    Create team
// @route   POST /api/teams
// @access  Public
exports.createTeam = async (req, res) => {
  try {
    const { team_name, captain_id, event_id, member_ids } = req.body;

    // Check if event is team-based
    const events = await query(
      'SELECT is_team_based FROM events WHERE event_id = ?',
      [event_id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (!events[0].is_team_based) {
      return res.status(400).json({
        success: false,
        message: 'This event is not team-based'
      });
    }

    // Create team
    const result = await query(
      'INSERT INTO teams (team_name, captain_id, event_id) VALUES (?, ?, ?)',
      [team_name, captain_id, event_id]
    );

    const teamId = result.insertId;

    // Add captain as team member
    await query(
      'INSERT INTO team_members (team_id, player_id, position) VALUES (?, ?, ?)',
      [teamId, captain_id, 'Captain']
    );

    // Add other members if provided
    if (member_ids && member_ids.length > 0) {
      for (const playerId of member_ids) {
        if (playerId !== captain_id) {
          await query(
            'INSERT INTO team_members (team_id, player_id) VALUES (?, ?)',
            [teamId, playerId]
          );
        }
      }
    }

    const newTeam = await query(
      'SELECT * FROM teams WHERE team_id = ?',
      [teamId]
    );

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: newTeam[0]
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team',
      error: error.message
    });
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Public
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const existing = await query('SELECT team_id FROM teams WHERE team_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
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
      `UPDATE teams SET ${setClause} WHERE team_id = ?`,
      values
    );

    const updatedTeam = await query('SELECT * FROM teams WHERE team_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: updatedTeam[0]
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team',
      error: error.message
    });
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private (Admin only)
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT team_id FROM teams WHERE team_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    await query('DELETE FROM teams WHERE team_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting team',
      error: error.message
    });
  }
};

// @desc    Get team members
// @route   GET /api/teams/:id/members
// @access  Public
exports.getTeamMembers = async (req, res) => {
  try {
    const { id } = req.params;

    const members = await query(
      `SELECT tm.team_member_id, tm.join_date, tm.position,
              p.player_id, p.first_name, p.last_name, p.email, p.skill_level
       FROM team_members tm
       JOIN players p ON tm.player_id = p.player_id
       WHERE tm.team_id = ?
       ORDER BY tm.join_date ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team members',
      error: error.message
    });
  }
};

// @desc    Add team member
// @route   POST /api/teams/:id/members
// @access  Public
exports.addTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { player_id, position } = req.body;

    // Check if team exists
    const teams = await query('SELECT team_id FROM teams WHERE team_id = ?', [id]);
    if (teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if player already in team
    const existing = await query(
      'SELECT team_member_id FROM team_members WHERE team_id = ? AND player_id = ?',
      [id, player_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Player already in team'
      });
    }

    // Add member
    await query(
      'INSERT INTO team_members (team_id, player_id, position) VALUES (?, ?, ?)',
      [id, player_id, position || null]
    );

    res.status(201).json({
      success: true,
      message: 'Team member added successfully'
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding team member',
      error: error.message
    });
  }
};

// @desc    Remove team member
// @route   DELETE /api/teams/:id/members/:memberId
// @access  Public
exports.removeTeamMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    // Check if member exists
    const members = await query(
      'SELECT team_member_id FROM team_members WHERE team_id = ? AND player_id = ?',
      [id, memberId]
    );

    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    await query(
      'DELETE FROM team_members WHERE team_id = ? AND player_id = ?',
      [id, memberId]
    );

    res.status(200).json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing team member',
      error: error.message
    });
  }
};

// @desc    Get team performance
// @route   GET /api/teams/:id/performance
// @access  Public
exports.getTeamPerformance = async (req, res) => {
  try {
    const { id } = req.params;

    const performance = await query(
      'SELECT * FROM vw_team_performance WHERE team_id = ?',
      [id]
    );

    if (performance.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No performance data found for this team'
      });
    }

    res.status(200).json({
      success: true,
      data: performance[0]
    });
  } catch (error) {
    console.error('Get team performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team performance',
      error: error.message
    });
  }
};