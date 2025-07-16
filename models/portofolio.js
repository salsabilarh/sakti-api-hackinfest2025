module.exports = (sequelize, DataTypes) => {
  const Portofolio = sequelize.define('Portofolio', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'portofolios',
    timestamps: false,
    underscored: true
  });

  Portofolio.associate = models => {
    Portofolio.hasMany(models.SubPortofolio, {
      foreignKey: 'portofolio_id'
    });
  };

  return Portofolio;
};