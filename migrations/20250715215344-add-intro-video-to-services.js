'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('services', 'intro_video_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Video Pengenalan Jasa'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('services', 'intro_video_url');
  }
};