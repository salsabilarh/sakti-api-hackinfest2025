// models/downloadlog.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DownloadLog extends Model {
    static associate(models) {
      DownloadLog.belongsTo(models.MarketingKit, { foreignKey: 'marketing_kit_id' });
      DownloadLog.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }
  DownloadLog.init({
    marketing_kit_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    purpose: DataTypes.TEXT,
    downloaded_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'DownloadLog',
  });
  return DownloadLog;
};