const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ServiceSectorMap extends Model {
    static associate(models) {
      ServiceSectorMap.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service'
      });
      
      ServiceSectorMap.belongsTo(models.Sector, {
        foreignKey: 'sector_id',
        as: 'sector'
      });
    }
  }

  ServiceSectorMap.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id',
      },
    },
    sector_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'sectors',
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'ServiceSectorMap',
    tableName: 'service_sector_maps',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['service_id', 'sector_id'],
      },
    ],
  });

  return ServiceSectorMap;
};