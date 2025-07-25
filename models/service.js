module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    group: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    overview: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    benefit: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    output: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    regulation_ref: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    intro_video_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  }, {
    tableName: 'services',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Service.associate = (models) => {
    Service.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id', as: 'portfolio' });
    Service.belongsTo(models.SubPortfolio, { foreignKey: 'sub_portfolio_id', as: 'sub_portfolio' });
    Service.belongsTo(models.Unit, { foreignKey: 'sbu_owner_id', as: 'sbu_owner' });
    Service.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    Service.belongsToMany(models.Sector, { through: 'service_sectors', as: 'sectors' });
    Service.belongsToMany(models.SubSector, { through: 'service_sub_sectors', as: 'sub_sectors' });
    Service.hasMany(models.MarketingKit, { foreignKey: 'service_id', as: 'marketing_kits' });
  };

  // Hook untuk generate kode jasa otomatis
  Service.beforeCreate(async (service, options) => {
    if (!service.code) {
      throw new Error('Kode jasa (service code) wajib diisi.');
    }

    // Ambil 4 karakter pertama dari kode jasa
    const subPortfolioCode = service.code.slice(0, 4);

    // Cari sub portfolio berdasarkan kode
    const subPortfolio = await sequelize.models.SubPortfolio.findOne({
      where: { code: subPortfolioCode },
    });

    if (!subPortfolio) {
      throw new Error(`Sub portfolio dengan kode '${subPortfolioCode}' tidak ditemukan.`);
    }

    // Set sub_portfolio_id dari hasil pencarian
    service.sub_portfolio_id = subPortfolio.id;
  });


  return Service;
};