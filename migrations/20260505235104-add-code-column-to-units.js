module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('units', 'code', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('units', 'code');
  }
};