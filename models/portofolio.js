// models/portfolio.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Portfolio extends Model {
    static associate(models) {
      Portfolio.hasMany(models.SubPortfolio, { foreignKey: 'portfolio_id' });
    }
  }
  Portfolio.init({
    name: DataTypes.STRING,
    code: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Portfolio',
  });
  return Portfolio;
};