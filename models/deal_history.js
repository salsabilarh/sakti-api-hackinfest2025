module.exports = (sequelize, DataTypes) => {
  const DealHistory = sequelize.define('DealHistory', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    previous_stage: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    stage: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    changed_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'deal_histories',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  DealHistory.associate = (models) => {
    DealHistory.belongsTo(models.Deal, { foreignKey: 'deal_id' });
    DealHistory.belongsTo(models.User, { foreignKey: 'changed_by', as: 'changedBy' });
  };

  return DealHistory;
};