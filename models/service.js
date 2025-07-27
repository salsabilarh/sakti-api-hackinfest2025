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
    Service.belongsToMany(models.MarketingKit, {
      through: models.MarketingKitService,
      foreignKey: 'service_id',
      otherKey: 'marketing_kit_id',
      as: 'marketing_kits',
    });
  };

  // Hook untuk generate kode jasa otomatis
  Service.beforeCreate(async (service, options) => {
    const { SubPortfolio } = sequelize.models;

    // Pastikan input nama sub portfolio tersedia
    if (!service.sub_portfolio_name || !service.portfolio_id) {
      throw new Error('Sub portfolio name dan portfolio id harus disediakan');
    }

    // Cek apakah Sub Portfolio sudah ada berdasarkan nama & portfolio
    let subPortfolio = await SubPortfolio.findOne({
      where: {
        name: service.sub_portfolio_name,
        portfolio_id: service.portfolio_id,
      }
    });

    // Jika belum ada, buat sub portfolio baru
    if (!subPortfolio) {
      // Generate kode untuk Sub Portfolio (misalnya: AEB-1, AEB-2, dst)
      const existing = await SubPortfolio.findAll({
        where: { portfolio_id: service.portfolio_id },
        order: [['created_at', 'DESC']]
      });

      let nextNumber = 1;
      if (existing.length > 0) {
        const lastCode = existing[0].code;
        const match = lastCode.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Ambil prefix dari nama portfolio
      const portfolio = await sequelize.models.Portfolio.findByPk(service.portfolio_id);
      if (!portfolio) {
        throw new Error('Portfolio tidak ditemukan');
      }

      const subPortfolioCode = `${portfolio.code}-${nextNumber}`;
      subPortfolio = await SubPortfolio.create({
        name: service.sub_portfolio_name,
        code: subPortfolioCode,
        portfolio_id: service.portfolio_id,
      });
    }

    // Set sub_portfolio_id pada service
    service.sub_portfolio_id = subPortfolio.id;

    // Generate kode jasa
    if (!service.code) {
      const lastService = await Service.findOne({
        where: { sub_portfolio_id: subPortfolio.id },
        order: [['created_at', 'DESC']],
      });

      let nextChar = 'A';
      if (lastService && lastService.code) {
        const lastChar = lastService.code.charAt(lastService.code.length - 1);
        nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1);
      }

      service.code = `${subPortfolio.code}${nextChar}`;
    }
  });

  return Service;
};