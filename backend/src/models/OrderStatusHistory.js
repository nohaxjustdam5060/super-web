const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  comment: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'order_status_histories',
  timestamps: true
});

module.exports = OrderStatusHistory;
