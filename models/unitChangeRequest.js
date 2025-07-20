'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UnitChangeRequest extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Unit, { foreignKey: 'current_unit_id', as: 'currentUnit' });
      this.belongsTo(models.Unit, { foreignKey: 'requested_unit_id', as: 'requestedUnit' });
    }
  }
  
  UnitChangeRequest.init({
    user_id: DataTypes.UUID, // Ubah ke UUID
    current_unit_id: DataTypes.UUID, // Ubah ke UUID
    requested_unit_id: DataTypes.UUID, // Ubah ke UUID
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    admin_notes: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'UnitChangeRequest',
    tableName: 'unit_change_requests', // Ubah ke snake_case untuk konsistensi
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return UnitChangeRequest;
};