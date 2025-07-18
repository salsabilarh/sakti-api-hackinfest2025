module.exports = (sequelize, DataTypes) => {
  const Sector = sequelize.define('Sector', {
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
      allowNull: false,
      unique: true,
    },
  }, {
    tableName: 'sectors',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Sector.associate = (models) => {
    Sector.hasMany(models.SubSector, { foreignKey: 'sector_id', as: 'sub_sectors' });
    Sector.belongsToMany(models.Service, { through: 'service_sectors', as: 'services' });
  };

  return Sector;
};