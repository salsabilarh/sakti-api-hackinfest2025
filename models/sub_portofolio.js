module.exports = (sequelize, DataTypes) => {
  const SubPortofolio = sequelize.define('SubPortofolio', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'sub_portofolios',
    timestamps: false,
    underscored: true
  });

  SubPortofolio.associate = models => {
    SubPortofolio.belongsTo(models.Portofolio, {
      foreignKey: 'portofolio_id',
      as: 'portofolio'
    });
    SubPortofolio.hasMany(models.Service, {
      foreignKey: 'sub_portofolio_id'
    });
  };

  return SubPortofolio;
};