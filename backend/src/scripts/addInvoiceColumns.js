require('dotenv').config();
const sequelize = require('../config/database');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL database.');

    const queries = [
      'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_status" VARCHAR(20) DEFAULT \'pending\';',
      'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_error_message" TEXT;',
      'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_response_code" VARCHAR(50);',
      'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_series" VARCHAR(20);',
      'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_number" VARCHAR(50);',
      'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_pdf_url" TEXT;'
    ];

    for (const q of queries) {
      console.log('Executing:', q);
      await sequelize.query(q);
    }

    const [cols] = await sequelize.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'orders\' ORDER BY ordinal_position;');
    console.log('Orders columns in DB:', cols.map((c) => c.column_name));
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
