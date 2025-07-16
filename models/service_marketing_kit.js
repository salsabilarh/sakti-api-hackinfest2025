module.exports = (sequelize, DataTypes) => {
  const ServiceMarketingKit = sequelize.define('ServiceMarketingKit', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    file_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    file_type: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'service_marketing_kits',
    timestamps: false,
    underscored: true
  });

  ServiceMarketingKit.associate = models => {
    ServiceMarketingKit.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service'
    });
    ServiceMarketingKit.belongsTo(models.User, {
      foreignKey: 'uploaded_by',
      as: 'uploader'
    });
  };

  return ServiceMarketingKit;
};