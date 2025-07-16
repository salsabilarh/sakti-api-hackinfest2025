module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estimated_value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('planning', 'ongoing', 'completed', 'cancelled'),
      defaultValue: 'planning',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'projects',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Project.associate = (models) => {
    Project.belongsTo(models.Deal, { foreignKey: 'deal_id', as: 'deal' });
    Project.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
    Project.belongsTo(models.Sector, { foreignKey: 'sector_id', as: 'sector' });
    Project.belongsTo(models.Unit, { foreignKey: 'unit_kerja_id', as: 'unit' });
    Project.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
  };

  return Project;
};