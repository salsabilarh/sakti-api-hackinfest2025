module.exports = (sequelize, DataTypes) => {
  const Sector = sequelize.define('Sector', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'sectors',
    timestamps: false,
    underscored: true
  });

  Sector.associate = models => {
    Sector.hasMany(models.SubSector, {
      foreignKey: 'sector_id',
      as: 'sub_sectors'
    });
    Sector.belongsToMany(models.Service, {
      through: models.ServiceSectorMap,
      foreignKey: 'sector_id',
      as: 'services'
    });
    Sector.hasMany(models.Deal, {
      foreignKey: 'sector_id'
    });
    Sector.hasMany(models.Project, {
      foreignKey: 'sector_id'
    });
  };

  return Sector;
};