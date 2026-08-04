const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  technical_specs: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  offer_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  min_stock_alert: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  brand_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    { fields: ['slug'] },
    { fields: ['category_id'] },
    { fields: ['brand_id'] },
    { fields: ['is_active'] },
    { fields: ['is_featured'] }
  ]
});

module.exports = Product;
