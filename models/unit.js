module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define('Unit', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM('sbu', 'ppk', 'cabang', 'admin'),
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
    Unit.hasMany(models.User, { foreignKey: 'unit_kerja_id', as: 'users' });
    Unit.hasMany(models.Service, { foreignKey: 'sbu_owner_id', as: 'owned_services' });
  };

  return Unit;
};