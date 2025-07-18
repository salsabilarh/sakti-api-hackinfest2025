// controllers/authController.js
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { User, PasswordResetRequest } = require('../models');
const { sendResetPasswordEmail } = require('../services/emailService');
const config = require('../config/config');

// Register new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, unit_kerja_id, role_id } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Hash password
    const hashedPassword = await argon2.hash(password);
    
    // Create user with verified: null (waiting for admin approval)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      unit_kerja_id,
      role_id,
      verified: null
    });
    
    res.status(201).json({ 
      message: 'User registered successfully. Waiting for admin approval.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        unit_kerja_id: user.unit_kerja_id,
        role_id: user.role_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ 
      where: { email },
      include: ['UnitKerja', 'Role']
    });
    
    // Check if user exists and is verified
    if (!user || user.verified !== true) {
      return res.status(401).json({ message: 'Invalid credentials or account not approved' });
    }
    
    // Verify password
    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    await user.update({ last_login: new Date() });
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.Role.name,
        unit_kerja: user.UnitKerja.name
      },
      config.jwtSecret,
      { expiresIn: '8h' }
    );
    
    res.json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.Role.name,
        unit_kerja: user.UnitKerja.name
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password - request reset
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create password reset request
    const resetRequest = await PasswordResetRequest.create({
      user_id: user.id,
      status: 'pending'
    });
    
    // In a real application, you would send an email to admin here
    // For this example, we'll just return the request ID
    res.json({ 
      message: 'Password reset request submitted. Admin will contact you shortly.',
      request_id: resetRequest.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password (admin action)
exports.resetPassword = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { admin_id } = req.user; // Assuming admin is logged in
    
    // Find the reset request
    const resetRequest = await PasswordResetRequest.findOne({
      where: { id: request_id, status: 'pending' },
      include: ['User']
    });
    
    if (!resetRequest) {
      return res.status(404).json({ message: 'Request not found or already handled' });
    }
    
    // Generate a default password
    const defaultPassword = 'Password123!'; // In production, generate a random strong password
    
    // Hash the new password
    const hashedPassword = await argon2.hash(defaultPassword);
    
    // Update user's password
    await resetRequest.User.update({ 
      password: hashedPassword,
      reset_password_token: null,
      reset_password_expires: null
    });
    
    // Update the reset request
    await resetRequest.update({
      handled_by: admin_id,
      handled_at: new Date(),
      status: 'completed'
    });
    
    // Send email to user with new password
    await sendResetPasswordEmail(resetRequest.User.email, defaultPassword);
    
    res.json({ message: 'Password reset successfully. User has been notified via email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password (user action)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isPasswordValid = await argon2.verify(user.password, currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await argon2.hash(newPassword);
    
    // Update password
    await user.update({ password: hashedPassword });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'last_login'],
      include: [
        {
          association: 'UnitKerja',
          attributes: ['name']
        },
        {
          association: 'Role',
          attributes: ['name']
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};