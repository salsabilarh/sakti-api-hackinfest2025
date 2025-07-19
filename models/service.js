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
      const subPortfolio = await service.getSub_portfolio();
      const lastService = await Service.findOne({
        where: { sub_portfolio_id: service.sub_portfolio_id },
        order: [['created_at', 'DESC']],
      });

      let nextChar = 'A';
      if (lastService) {
        const lastCode = lastService.code;
        const lastChar = lastCode.charAt(lastCode.length - 1);
        nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1);
      }

      service.code = `${subPortfolio.code}${nextChar}`;
    }
  });

  return Service;
};