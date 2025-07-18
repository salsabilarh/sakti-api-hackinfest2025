// models/user.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.UnitKerja, { foreignKey: 'unit_kerja_id' });
      User.belongsTo(models.Role, { foreignKey: 'role_id' });
      User.hasMany(models.MarketingKit, { foreignKey: 'uploaded_by' });
      User.hasMany(models.DownloadLog, { foreignKey: 'user_id' });
      User.hasMany(models.PasswordResetRequest, { foreignKey: 'user_id' });
      User.hasMany(models.PasswordResetRequest, { foreignKey: 'handled_by' });
    }
  }
  User.init({
    name: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: DataTypes.STRING,
    unit_kerja_id: DataTypes.INTEGER,
    role_id: DataTypes.INTEGER,
    verified: DataTypes.BOOLEAN,
    active: DataTypes.BOOLEAN,
    last_login: DataTypes.DATE,
    reset_password_token: DataTypes.STRING,
    reset_password_expires: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};