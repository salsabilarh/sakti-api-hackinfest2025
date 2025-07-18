// controllers/userController.js
const { User, UnitKerja, Role, PasswordResetRequest } = require('../models');

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { unit_kerja, role, status, verified, search, sort } = req.query;
    
    // Build filter object
    const filter = {};
    if (unit_kerja) filter.unit_kerja_id = unit_kerja;
    if (role) filter.role_id = role;
    if (status) filter.active = status === 'active';
    if (verified) filter.verified = verified === 'true';
    
    // Build search condition
    const searchCondition = search ? {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    } : {};
    
    // Build sort order
    const order = [];
    if (sort === 'name_asc') order.push(['name', 'ASC']);
    if (sort === 'name_desc') order.push(['name', 'DESC']);
    
    const users = await User.findAll({
      where: { ...filter, ...searchCondition },
      include: [
        { model: UnitKerja, attributes: ['name'] },
        { model: Role, attributes: ['name'] }
      ],
      order,
      attributes: ['id', 'name', 'email', 'active', 'verified', 'last_login']
    });
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get waiting users (admin only)
exports.getWaitingUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { verified: null },
      include: [
        { model: UnitKerja, attributes: ['name'] },
        { model: Role, attributes: ['name'] }
      ],
      attributes: ['id', 'name', 'email']
    });
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve user (admin only)
exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.update({ verified: true });
    
    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject user (admin only)
exports.rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.destroy();
    
    res.json({ message: 'User rejected and deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get password reset requests (admin only)
exports.getPasswordResetRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.findAll({
      where: { status: 'pending' },
      include: [
        { 
          model: User, 
          as: 'User',
          include: [
            { model: UnitKerja, attributes: ['name'] },
            { model: Role, attributes: ['name'] }
          ],
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['requested_at', 'ASC']]
    });
    
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create user (admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, unit_kerja_id, role_id } = req.body;
    
    // Check if email exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Hash password
    const hashedPassword = await argon2.hash(password);
    
    // Create user (automatically verified since admin is creating)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      unit_kerja_id,
      role_id,
      verified: true
    });
    
    res.status(201).json({ 
      message: 'User created successfully',
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

// Update user (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, unit_kerja_id, role_id, active } = req.body;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is being changed and if new email exists
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    
    await user.update({
      name: name || user.name,
      email: email || user.email,
      unit_kerja_id: unit_kerja_id || user.unit_kerja_id,
      role_id: role_id || user.role_id,
      active: active !== undefined ? active : user.active
    });
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.destroy();
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};