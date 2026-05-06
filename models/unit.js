/**
 * models/unit.js
 * Model untuk Unit Kerja organisasi.
 * Relasi: hasMany User, hasMany Service (as owned_services), hasMany ServiceRevenue.
 */

// Daftar tipe unit yang valid (sinkron dengan ENUM di database)
const UNIT_TYPES = ['sbu', 'ppk', 'cabang', 'unit', 'divisi', 'lainnya'];

module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define('Unit', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM(...UNIT_TYPES),
      allowNull: false,
    },
  }, {
    tableName: 'units',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Unit.associate = (models) => {
    Unit.hasMany(models.User, {
      foreignKey: 'unit_kerja_id',
      as: 'users',
    });
    Unit.hasMany(models.Service, {
      foreignKey: 'sbu_owner_id',
      as: 'owned_services',
    });
    Unit.hasMany(models.ServiceRevenue, {
      foreignKey: 'unit_id',
      as: 'revenues',
    });
  };

  return Unit;
};

module.exports.UNIT_TYPES = UNIT_TYPES;