module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    service_group: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    intro_video_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'Harus berupa URL video yang valid'
        }
      }
    },
    description_service: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    benefit: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    output: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    regulation_ref: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sbu_owner: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'services',
    timestamps: false,
    underscored: true
  });

  Service.associate = models => {
    Service.belongsTo(models.SubPortofolio, {
      foreignKey: 'sub_portofolio_id',
      as: 'sub_portofolio'
    });
    Service.belongsToMany(models.Sector, {
      through: models.ServiceSectorMap,
      foreignKey: 'service_id',
      as: 'sectors',
      include: [{
        model: models.SubSector,
        as: 'sub_sectors'
      }]
    });
    Service.hasMany(models.ServiceMarketingKit, {
      foreignKey: 'service_id'
    });
    Service.hasMany(models.Deal, {
      foreignKey: 'service_id'
    });
    Service.hasMany(models.Project, {
      foreignKey: 'service_id'
    });
  };

  return Service;
};