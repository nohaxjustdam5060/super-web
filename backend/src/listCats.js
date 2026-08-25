require('dotenv').config();
const { Category } = require('./models');

async function listCats() {
  const cats = await Category.findAll({ raw: true });
  console.log(`TOTAL CATEGORIES IN DB: ${cats.length}`);
  cats.forEach((c) => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Slug: "${c.slug}" | ParentID: ${c.parent_id || 'NULL'}`);
  });
}

listCats().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
