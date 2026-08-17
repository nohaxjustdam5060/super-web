const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  order_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'payment_review', 'paid', 'in_preparation', 'shipped', 'delivered', 'cancelled', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  shipping_address: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  shipping_method: {
    type: DataTypes.STRING(100),
    defaultValue: 'Envío Express a Domicilio'
  },
  invoice_info: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'mercadopago'
  },
  tracking_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  coupon_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  preference_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  mp_payment_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    { fields: ['order_number'] },
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['preference_id'] },
    { fields: ['mp_payment_id'] }
  ]
});

module.exports = Order;
