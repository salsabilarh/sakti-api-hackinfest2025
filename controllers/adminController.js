// controllers/adminController.js
const { User, MarketingKit, DownloadLog } = require('../models');

// Get admin dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.count({ where: { verified: true } });
    const totalWaitingUsers = await User.count({ where: { verified: null } });
    const totalActiveUsers = await User.count({ 
      where: { 
        last_login: { 
          [Op.gte]: new Date(new Date() - 24 * 60 * 60 * 1000) // Last 24 hours
        } 
      } 
    });
    const totalDownloads = await DownloadLog.count();
    
    res.json({
      total_users: totalUsers,
      total_waiting_users: totalWaitingUsers,
      total_active_users: totalActiveUsers,
      total_downloads: totalDownloads
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get download logs
exports.getDownloadLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const logs = await DownloadLog.findAll({
      include: [
        {
          model: MarketingKit,
          attributes: ['name']
        },
        {
          model: User,
          attributes: ['name']
        }
      ],
      attributes: ['id', 'purpose', 'downloaded_at'],
      order: [['downloaded_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    const totalLogs = await DownloadLog.count();
    
    res.json({
      data: logs,
      total: totalLogs,
      page: parseInt(page),
      total_pages: Math.ceil(totalLogs / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};