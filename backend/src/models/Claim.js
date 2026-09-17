const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Claim = sequelize.define('Claim', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  claim_code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  doc_type: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  doc_number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(25),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  is_minor: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  guardian_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  guardian_doc_type: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  guardian_doc_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  contracted_good_type: {
    type: DataTypes.STRING(20),
    allowNull: false // 'PRODUCTO' o 'SERVICIO'
  },
  claimed_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'PEN'
  },
  good_description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  claim_type: {
    type: DataTypes.STRING(20),
    allowNull: false // 'RECLAMO' o 'QUEJA'
  },
  claim_detail: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  consumer_request: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pendiente',
    allowNull: false // 'pendiente', 'en_revision', 'respondido', 'rechazado'
  },
  company_response: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  response_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  data_consent: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'claims',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['claim_code'] },
    { fields: ['doc_number'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

module.exports = Claim;
