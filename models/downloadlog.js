module.exports = (sequelize, DataTypes) => {
  const DownloadLog = sequelize.define('DownloadLog', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'download_logs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  DownloadLog.associate = (models) => {
    DownloadLog.belongsTo(models.MarketingKit, {
      foreignKey: 'marketing_kit_id',
      as: 'marketing_kit',
    });
    DownloadLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  return DownloadLog;
};