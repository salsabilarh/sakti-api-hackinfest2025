module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(500),
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
    Service.belongsTo(models.Portfolio,    { foreignKey: 'portfolio_id',     as: 'portfolio' });
    Service.belongsTo(models.SubPortfolio, { foreignKey: 'sub_portfolio_id', as: 'sub_portfolio' });
    Service.belongsTo(models.Unit,         { foreignKey: 'sbu_owner_id',     as: 'sbu_owner' });
    Service.belongsTo(models.User,         { foreignKey: 'created_by',       as: 'creator' });

    Service.belongsToMany(models.Sector,    { through: 'service_sectors',     as: 'sectors' });
    Service.belongsToMany(models.SubSector, { through: 'service_sub_sectors', as: 'sub_sectors' });

    Service.belongsToMany(models.MarketingKit, {
      through: models.MarketingKitService,
      foreignKey: 'service_id',
      otherKey: 'marketing_kit_id',
      as: 'marketing_kits',
    });

    Service.hasMany(models.ServiceRevenue, { foreignKey: 'service_id', as: 'revenues' });
  };

  // Auto-generate service code from sub_portfolio.code + sequential letter (A-Z)
  Service.addHook('beforeCreate', async (service, options) => {
    if (service.code) return;

    const transaction = options.transaction;

    const subPortfolio = await sequelize.models.SubPortfolio.findByPk(
      service.sub_portfolio_id,
      { transaction }
    );

    if (!subPortfolio) {
      throw new Error('Sub portfolio tidak ditemukan. Kode layanan tidak dapat di-generate.');
    }

    const lastService = await Service.findOne({
      where: { sub_portfolio_id: service.sub_portfolio_id },
      order: [['created_at', 'DESC']],
      lock: transaction ? transaction.LOCK.SHARE : undefined,
      transaction,
    });

    let nextChar = 'A';

    if (lastService && lastService.code) {
      const lastChar = lastService.code.charAt(lastService.code.length - 1);
      const nextCharCode = lastChar.charCodeAt(0) + 1;

      if (nextCharCode > 'Z'.charCodeAt(0)) {
        throw new Error(
          `Sub portfolio '${subPortfolio.code}' sudah mencapai batas 26 layanan (A-Z). ` +
          'Masukkan kode layanan secara manual.'
        );
      }

      nextChar = String.fromCharCode(nextCharCode);
    }

    service.code = `${subPortfolio.code}${nextChar}`;
  });

  return Service;
};