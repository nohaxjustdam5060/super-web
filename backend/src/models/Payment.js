const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  provider: {
    type: DataTypes.STRING(50),
    defaultValue: 'mercadopago',
    allowNull: false
  },
  payment_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status_detail: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'PEN'
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  card_last_four: {
    type: DataTypes.STRING(4),
    allowNull: true
  },
  raw_response: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    { fields: ['order_id'] },
    { fields: ['payment_id'] },
    { fields: ['status'] }
  ]
});

module.exports = Payment;
