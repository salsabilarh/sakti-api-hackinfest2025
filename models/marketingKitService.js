// models/marketing_kit_service.js
module.exports = (sequelize, DataTypes) => {
  const MarketingKitService = sequelize.define('MarketingKitService', {
    marketing_kit_id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    service_id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
  }, {
    tableName: 'marketing_kit_services',
    timestamps: false, // ✅ Penting!
    underscored: true,
  });

  return MarketingKitService;
};
