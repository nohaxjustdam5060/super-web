require('dotenv').config();
const { Category, Product, sequelize } = require('../models');
const { Op } = require('sequelize');

const UNIFIED_AUDIFONOS_ID = '0263753c-2869-49d4-9ed1-07ed778a1bf4';
const OLD_INALAMBRICOS_ID = '303f39eb-dc47-4646-b25f-fa6ba898b338';

async function runMergeAudifonos() {
  console.log('🔍 Verificando estado actual de la subcategoría Audífonos en PostgreSQL...');

  const catGamingOrUnified = await Category.findByPk(UNIFIED_AUDIFONOS_ID);
  const catInalambricos = await Category.findByPk(OLD_INALAMBRICOS_ID);

  console.log('Categoría ID UNIFICADO:', catGamingOrUnified ? `"${catGamingOrUnified.name}" (slug: ${catGamingOrUnified.slug})` : 'NO ENCONTRADO');
  console.log('Categoría ID INALÁMBRICOS:', catInalambricos ? `"${catInalambricos.name}" (slug: ${catInalambricos.slug})` : 'YA ELIMINADA / NO ENCONTRADO');

  // Check if migration is already executed
  if (catGamingOrUnified && catGamingOrUnified.slug === 'audifonos' && !catInalambricos) {
    console.log('✅ La migración YA fue ejecutada previamente. La categoría "Audífonos" (slug: audifonos) ya está unificada y "Audífonos Inalámbricos" fue eliminada.');
    return;
  }

  console.log('🚀 Ejecutando migración de unificación en la base de datos...');

  await sequelize.transaction(async (t) => {
    // 1. Update UNIFIED_AUDIFONOS_ID to Audífonos
    if (catGamingOrUnified) {
      catGamingOrUnified.name = 'Audífonos';
      catGamingOrUnified.slug = 'audifonos';
      catGamingOrUnified.description = 'Audífonos gaming, inalámbricos, bluetooth y de estudio';
      catGamingOrUnified.icon_name = 'Headphones';
      await catGamingOrUnified.save({ transaction: t });
      console.log('1. Subcategoría actualizada exitosamente a "Audífonos" (slug: audifonos).');
    }

    // 2. Move products from OLD_INALAMBRICOS_ID to UNIFIED_AUDIFONOS_ID
    if (catInalambricos) {
      const [movedCount] = await Product.update(
        { category_id: UNIFIED_AUDIFONOS_ID },
        { where: { category_id: OLD_INALAMBRICOS_ID }, transaction: t }
      );
      console.log(`2. ${movedCount} productos re-asociados a la subcategoría unificada Audífonos.`);

      // 3. Delete OLD_INALAMBRICOS_ID category
      await catInalambricos.destroy({ transaction: t });
      console.log('3. Subcategoría duplicada "Audífonos Inalámbricos" eliminada exitosamente.');
    }
  });

  console.log('🎉 Migración de base de datos completada con éxito!');
}

runMergeAudifonos().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Error en script de migración:', err);
  process.exit(1);
});
