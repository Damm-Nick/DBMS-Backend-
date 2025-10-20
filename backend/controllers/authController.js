// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// Generate JWT token
const generateToken = (id, role, email) => {
  return jwt.sign(
    { id, role, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @desc    Register new admin
// @route   POST /api/auth/register
// @access  Public (but should be restricted in production)
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if admin exists
    const existingAdmin = await query(
      'SELECT admin_id FROM admins WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingAdmin.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email or username already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new admin
    const result = await query(
      'INSERT INTO admins (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role || 'event_manager']
    );

    const adminId = result.insertId;

    // Generate token
    const token = generateToken(adminId, role || 'event_manager', email);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: {
        admin_id: adminId,
        username,
        email,
        role: role || 'event_manager',
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering admin',
      error: error.message
    });
  }
};

// @desc    Login admin
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get admin by email
    const admins = await query(
      'SELECT admin_id, username, email, password_hash, role FROM admins WHERE email = ?',
      [email]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const admin = admins[0];

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(admin.admin_id, admin.role, admin.email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        admin_id: admin.admin_id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Get current logged in admin
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const admins = await query(
      'SELECT admin_id, username, email, role, created_date FROM admins WHERE admin_id = ?',
      [req.user.id]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      data: admins[0]
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin details',
      error: error.message
    });
  }
};