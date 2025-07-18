module.exports = (sequelize, DataTypes) => {
  const Portfolio = sequelize.define('Portfolio', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    }
  }, {
    tableName: 'portfolios',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Portfolio.associate = (models) => {
    Portfolio.hasMany(models.SubPortfolio, { foreignKey: 'portfolio_id', as: 'sub_portfolios' });
    Portfolio.hasMany(models.Service, { foreignKey: 'portfolio_id', as: 'services' });
  };

  return Portfolio;
};