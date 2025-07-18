module.exports = (sequelize, DataTypes) => {
  const PasswordResetRequest = sequelize.define('PasswordResetRequest', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    is_processed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'password_reset_requests',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  PasswordResetRequest.associate = (models) => {
    PasswordResetRequest.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    PasswordResetRequest.belongsTo(models.User, { foreignKey: 'processed_by', as: 'processor' });
  };

  return PasswordResetRequest;
};