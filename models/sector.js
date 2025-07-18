// models/sektor.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Sektor extends Model {
    static associate(models) {
      Sektor.hasMany(models.SubSektor, { foreignKey: 'sektor_id' });
      Sektor.belongsToMany(models.Jasa, { through: 'JasaSektors', foreignKey: 'sektor_id' });
    }
  }
  Sektor.init({
    name: DataTypes.STRING,
    code: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Sektor',
  });
  return Sektor;
};