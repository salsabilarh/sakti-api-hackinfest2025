// models/jasasektor.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class JasaSektor extends Model {
    static associate(models) {
      JasaSektor.belongsTo(models.Jasa, { foreignKey: 'jasa_id' });
      JasaSektor.belongsTo(models.Sektor, { foreignKey: 'sektor_id' });
      JasaSektor.belongsTo(models.SubSektor, { foreignKey: 'sub_sektor_id' });
    }
  }
  JasaSektor.init({
    jasa_id: DataTypes.INTEGER,
    sektor_id: DataTypes.INTEGER,
    sub_sektor_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'JasaSektor',
  });
  return JasaSektor;
};