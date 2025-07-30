// models/ServiceRevenue.js
module.exports = (sequelize, DataTypes) => {
  const ServiceRevenue = sequelize.define('ServiceRevenue', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    revenue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
  }, {
    tableName: 'service_revenues',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  ServiceRevenue.associate = (models) => {
    ServiceRevenue.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
    ServiceRevenue.belongsTo(models.Unit, { foreignKey: 'unit_id', as: 'unit' });
  };

  return ServiceRevenue;
};