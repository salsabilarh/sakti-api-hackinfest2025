module.exports = (sequelize, DataTypes) => {
  const SubPortfolio = sequelize.define('SubPortfolio', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
  }, {
    tableName: 'sub_portfolios',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  SubPortfolio.associate = (models) => {
    SubPortfolio.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id', as: 'portfolio' });
    SubPortfolio.hasMany(models.Service, { foreignKey: 'sub_portfolio_id', as: 'services' });
  };

  return SubPortfolio;
};