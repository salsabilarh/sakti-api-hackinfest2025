module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define('Unit', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'units',
    timestamps: false,
    underscored: true
  });

  Unit.associate = models => {
    Unit.hasMany(models.User, { foreignKey: 'unit_kerja_id' });
    Unit.hasMany(models.Deal, { foreignKey: 'unit_kerja_id' });
    Unit.hasMany(models.Project, { foreignKey: 'unit_kerja_id' });
  };

  return Unit;
};