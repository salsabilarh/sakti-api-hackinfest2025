/**
 * models/unitChangeRequest.js
 * Model untuk menyimpan permintaan perubahan unit kerja oleh user.
 * Relasi: belongsTo User, belongsTo Unit (currentUnit), belongsTo Unit (requestedUnit).
 */

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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    current_unit_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    requested_unit_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'UnitChangeRequest',
    tableName: 'unit_change_requests',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return UnitChangeRequest;
};