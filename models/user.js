module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(10),
      defaultValue: 'viewer',
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_token_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    defaultScope: {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expires'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] },
      },
    },
  });

  User.associate = (models) => {
    User.belongsTo(models.Unit, { foreignKey: 'unit_kerja_id', as: 'unit' });
    User.hasMany(models.Service, { foreignKey: 'created_by', as: 'services' });
    User.hasMany(models.MarketingKit, { foreignKey: 'uploaded_by', as: 'marketing_kits' });
    User.hasMany(models.DownloadLog, { foreignKey: 'user_id', as: 'download_logs' });
  };

  return User;
};