module.exports = (sequelize, DataTypes) => {
  const Deal = sequelize.define('Deal', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    stage: {
      type: DataTypes.ENUM('lead', 'contacted', 'proposal_sent', 'tender', 'won', 'lost'),
      defaultValue: 'lead',
    },
    lost_reason: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    probability: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      validate: { min: 0, max: 100 }
    },
    expected_close_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    unit_kerja_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    sector_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  }, {
    tableName: 'deals',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      afterUpdate: async (deal, options) => {
        if (deal.changed('stage')) {
          await sequelize.models.DealHistory.create({
            deal_id: deal.id,
            previous_stage: deal.previous('stage'),
            stage: deal.stage,
            changed_by: options.context?.userId,
            notes: options.context?.notes || 'Stage changed'
          });

          if (deal.stage === 'won') {
            await sequelize.models.Project.create({
              name: `Proyek ${deal.name}`,
              deal_id: deal.id,
              service_id: deal.service_id,
              sector_id: deal.sector_id,
              unit_kerja_id: deal.unit_kerja_id,
              created_by: deal.created_by,
              start_date: new Date(),
              estimated_value: deal.value
            });
          }
        }
      }
    }
  });

  Deal.associate = (models) => {
    Deal.belongsTo(models.Unit, { foreignKey: 'unit_kerja_id', as: 'unit' });
    Deal.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    Deal.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
    Deal.belongsTo(models.Sector, { foreignKey: 'sector_id', as: 'sector' });
    Deal.hasMany(models.DealHistory, { foreignKey: 'deal_id', as: 'history' });
    Deal.hasOne(models.Project, { foreignKey: 'deal_id', as: 'project' });
  };

  return Deal;
};