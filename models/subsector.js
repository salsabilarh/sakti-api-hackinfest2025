// models/subsektor.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubSektor extends Model {
    static associate(models) {
      SubSektor.belongsTo(models.Sektor, { foreignKey: 'sektor_id' });
      SubSektor.belongsToMany(models.Jasa, { through: 'JasaSektors', foreignKey: 'sub_sektor_id' });
    }
  }
  SubSektor.init({
    name: DataTypes.STRING,
    code: DataTypes.STRING,
    sektor_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'SubSektor',
  });
  return SubSektor;
};