// models/ServiceCustomer.js
module.exports = (sequelize, DataTypes) => {
  const ServiceCustomer = sequelize.define('ServiceCustomer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    unit_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    revenue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
  }, {
    tableName: 'service_customers',
    timestamps: true,
    underscored: true,
  });

  ServiceCustomer.associate = (models) => {
    ServiceCustomer.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service',
    });
  };

  return ServiceCustomer;
};
