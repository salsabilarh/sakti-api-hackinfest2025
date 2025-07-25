// models/marketing-kit.js
module.exports = (sequelize, DataTypes) => {
  const MarketingKit = sequelize.define('MarketingKit', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    file_path: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    cloudinary_public_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'marketing_kits',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  MarketingKit.associate = (models) => {
    MarketingKit.belongsToMany(models.Service, {
      through: 'marketing_kit_services',
      foreignKey: 'marketing_kit_id',
      otherKey: 'service_id',
      as: 'services',
    });

    MarketingKit.belongsTo(models.User, {
      foreignKey: 'uploaded_by',
      as: 'uploader',
    });

    MarketingKit.hasMany(models.DownloadLog, {
      foreignKey: 'marketing_kit_id',
      as: 'download_logs',
    });
  };

  return MarketingKit;
};