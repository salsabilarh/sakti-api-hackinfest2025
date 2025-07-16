module.exports = (sequelize, DataTypes) => {
  const SubSector = sequelize.define('SubSector', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'sub_sectors',
    timestamps: false,
    underscored: true
  });

  SubSector.associate = models => {
    SubSector.belongsTo(models.Sector, {
      foreignKey: 'sector_id',
      as: 'sector'
    });
  };

  return SubSector;
};