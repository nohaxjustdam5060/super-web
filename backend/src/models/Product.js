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
  },
  processor_family: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  ram_gb: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  storage_gb: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  storage_type: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  screen_size: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true
  },
  full_name: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  needs_review: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  external_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
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
