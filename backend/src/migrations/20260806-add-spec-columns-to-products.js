'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('products');

    if (!tableInfo.processor_family) {
      await queryInterface.addColumn('products', 'processor_family', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }

    if (!tableInfo.ram_gb) {
      await queryInterface.addColumn('products', 'ram_gb', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (!tableInfo.storage_gb) {
      await queryInterface.addColumn('products', 'storage_gb', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (!tableInfo.storage_type) {
      await queryInterface.addColumn('products', 'storage_type', {
        type: Sequelize.STRING(20),
        allowNull: true
      });
    }

    if (!tableInfo.screen_size) {
      await queryInterface.addColumn('products', 'screen_size', {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: true
      });
    }

    if (!tableInfo.full_name) {
      await queryInterface.addColumn('products', 'full_name', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.needs_review) {
      await queryInterface.addColumn('products', 'needs_review', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableInfo.external_id) {
      await queryInterface.addColumn('products', 'external_id', {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'processor_family');
    await queryInterface.removeColumn('products', 'ram_gb');
    await queryInterface.removeColumn('products', 'storage_gb');
    await queryInterface.removeColumn('products', 'storage_type');
    await queryInterface.removeColumn('products', 'screen_size');
    await queryInterface.removeColumn('products', 'full_name');
    await queryInterface.removeColumn('products', 'needs_review');
    await queryInterface.removeColumn('products', 'external_id');
  }
};
