'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('orders');

    if (!tableInfo.preference_id) {
      await queryInterface.addColumn('orders', 'preference_id', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
      await queryInterface.addIndex('orders', ['preference_id']);
    }

    if (!tableInfo.mp_payment_id) {
      await queryInterface.addColumn('orders', 'mp_payment_id', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
      await queryInterface.addIndex('orders', ['mp_payment_id']);
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('orders');

    if (tableInfo.preference_id) {
      await queryInterface.removeColumn('orders', 'preference_id');
    }
    if (tableInfo.mp_payment_id) {
      await queryInterface.removeColumn('orders', 'mp_payment_id');
    }
  }
};
