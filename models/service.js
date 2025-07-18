// models/jasa.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Jasa extends Model {
    static associate(models) {
      Jasa.belongsTo(models.SubPortfolio, { foreignKey: 'sub_portfolio_id' });
      Jasa.belongsTo(models.UnitKerja, { foreignKey: 'sbu_owner_id' });
      Jasa.belongsToMany(models.Sektor, { through: 'JasaSektors', foreignKey: 'jasa_id' });
      Jasa.belongsToMany(models.SubSektor, { through: 'JasaSektors', foreignKey: 'jasa_id' });
      Jasa.hasMany(models.MarketingKit, { foreignKey: 'jasa_id' });
    }
  }
  Jasa.init({
    name: DataTypes.STRING,
    code: DataTypes.STRING,
    kelompok_jasa: DataTypes.STRING,
    overview: DataTypes.TEXT,
    url_intro_video: DataTypes.STRING,
    ruang_lingkup: DataTypes.TEXT,
    manfaat: DataTypes.TEXT,
    output: DataTypes.TEXT,
    regulation_ref: DataTypes.TEXT,
    sbu_owner_id: DataTypes.INTEGER,
    sub_portfolio_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Jasa',
  });
  return Jasa;
};