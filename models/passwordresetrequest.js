// models/passwordresetrequest.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PasswordResetRequest extends Model {
    static associate(models) {
      PasswordResetRequest.belongsTo(models.User, { foreignKey: 'user_id' });
      PasswordResetRequest.belongsTo(models.User, { foreignKey: 'handled_by' });
    }
  }
  PasswordResetRequest.init({
    user_id: DataTypes.INTEGER,
    requested_at: DataTypes.DATE,
    handled_by: DataTypes.INTEGER,
    handled_at: DataTypes.DATE,
    status: DataTypes.ENUM('pending', 'completed')
  }, {
    sequelize,
    modelName: 'PasswordResetRequest',
  });
  return PasswordResetRequest;
};