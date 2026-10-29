const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  session_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  abandoned_emails_sent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  last_abandoned_email_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'carts',
  timestamps: true
});

module.exports = Cart;
