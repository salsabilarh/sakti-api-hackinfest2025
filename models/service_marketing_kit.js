// models/marketingkit.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MarketingKit extends Model {
    static associate(models) {
      MarketingKit.belongsTo(models.Jasa, { foreignKey: 'jasa_id' });
      MarketingKit.belongsTo(models.User, { foreignKey: 'uploaded_by' });
      MarketingKit.hasMany(models.DownloadLog, { foreignKey: 'marketing_kit_id' });
    }
  }
  MarketingKit.init({
    name: DataTypes.STRING,
    file_type: DataTypes.ENUM('flyer', 'pitch_deck', 'dokumentasi_teknik', 'lainnya'),
    file_path: DataTypes.STRING,
    file_size: DataTypes.INTEGER,
    jasa_id: DataTypes.INTEGER,
    uploaded_by: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'MarketingKit',
  });
  return MarketingKit;
};