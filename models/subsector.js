module.exports = (sequelize, DataTypes) => {
  const SubSector = sequelize.define('SubSector', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
  }, {
    tableName: 'sub_sectors',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  SubSector.associate = (models) => {
    SubSector.belongsTo(models.Sector, { foreignKey: 'sector_id', as: 'sector' });
    SubSector.belongsToMany(models.Service, { through: 'service_sub_sectors', as: 'services' });
  };

  return SubSector;
};