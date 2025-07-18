// models/subportfolio.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubPortfolio extends Model {
    static associate(models) {
      SubPortfolio.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id' });
      SubPortfolio.hasMany(models.Jasa, { foreignKey: 'sub_portfolio_id' });
    }
  }
  SubPortfolio.init({
    name: DataTypes.STRING,
    code: DataTypes.STRING,
    portfolio_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'SubPortfolio',
  });
  return SubPortfolio;
};