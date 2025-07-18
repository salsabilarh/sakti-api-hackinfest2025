// models/unitkerja.js
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UnitKerja extends Model {
    static associate(models) {
      UnitKerja.hasMany(models.User, { foreignKey: 'unit_kerja_id' });
      UnitKerja.hasMany(models.Jasa, { foreignKey: 'sbu_owner_id' });
    }
  }
  UnitKerja.init({
    name: DataTypes.STRING,
    code: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'UnitKerja',
  });
  return UnitKerja;
};