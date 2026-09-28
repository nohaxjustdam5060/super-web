require('dotenv').config();
const { Op } = require('sequelize');
const { Product } = require('./src/models');
const sequelize = require('./src/config/database');
const cuadradoSyncService = require('./src/services/cuadradoSyncService');

const TARGET_PRODUCT_NAME = 'PRODUCTO DE PRUEBA - NO VENDER (uso interno API)';

async function runStrictTestDecrement() {
  console.log('\n======================================================');
  console.log('🧪 [TEST CONTROLADO] DECREMENTO EN PRODUCTO DE PRUEBA');
  console.log('======================================================');

  const apiUrl = process.env.CUADRADO_API_URL || 'https://app.cuadrado.pe/cuadrado/api';
  const rawToken = process.env.CUADRADO_API_TOKEN || '';
  const cleanToken = rawToken.replace(/^["']|["']$/g, '').trim();
  const maskedToken = cleanToken ? `${cleanToken.slice(0, 8)}...${cleanToken.slice(-6)}` : '(NO CONFIGURADO)';

  console.log(`🌐 API Endpoint: ${apiUrl}/inventory/stock/decrement`);
  console.log(`🔑 Token Activo: ${maskedToken}`);
  console.log(`🎯 Objetivo Exclusivo: "${TARGET_PRODUCT_NAME}"`);
  console.log('------------------------------------------------------\n');

  if (!cleanToken || cleanToken.includes('placeholder') || cleanToken.includes('xxx')) {
    console.error('❌ ERROR: CUADRADO_API_TOKEN no está configurado con un token real en backend/.env');
    console.error('   Por favor coloca tu token oficial sat_xxx y vuelve a ejecutar.');
    await sequelize.close();
    process.exit(1);
  }

  try {
    // 1. Strict Search for the dedicated testing product
    console.log(`🔍 Buscando estrictamente "${TARGET_PRODUCT_NAME}" en la base de datos...`);

    const targetProduct = await Product.findOne({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${TARGET_PRODUCT_NAME}%` } },
          { external_id: '2187' },
          { sku: 'DEMO-API-TEST' }
        ]
      }
    });

    if (!targetProduct) {
      console.error(`\n❌ ERROR CRÍTICO: No se encontró el producto "${TARGET_PRODUCT_NAME}" en la base de datos local.`);
      console.error('   Ejecución abortada de forma segura para no afectar productos reales de la tienda.\n');
      await sequelize.close();
      process.exit(1);
    }

    if (!targetProduct.external_id) {
      console.error(`\n❌ ERROR: El producto encontrado "${targetProduct.name}" no tiene un external_id asignado por Cuadrado.`);
      console.error('   Ejecución abortada.\n');
      await sequelize.close();
      process.exit(1);
    }

    console.log('\n📦 DATOS DEL PRODUCTO DE PRUEBA IDENTIFICADO:');
    console.log(`   - ID Local (UUID):   ${targetProduct.id}`);
    console.log(`   - External ID (ERP): ${targetProduct.external_id}`);
    console.log(`   - SKU:               ${targetProduct.sku}`);
    console.log(`   - Nombre:            ${targetProduct.name}`);
    console.log(`   - Stock Actual en BD:${targetProduct.stock} unidades`);
    console.log(`   - Estado Activo:     ${targetProduct.is_active ? 'SÍ' : 'NO'}`);

    // 2. Execute Decrement
    console.log('\n⚡ Ejecutando decremento de 1 unidad vía POST /inventory/stock/decrement...');
    const startTime = Date.now();

    const result = await cuadradoSyncService.decrementRemoteStock(
      targetProduct.external_id,
      1,
      'Prueba controlada producto interno API'
    );

    const elapsedMs = Date.now() - startTime;
    console.log(`⏱️ Tiempo de respuesta: ${elapsedMs}ms\n`);

    console.log('======================================================');
    console.log('📋 RESPUESTA DE LA API DE CUADRADO ERP');
    console.log('======================================================');

    if (result.success) {
      console.log('✅ ESTADO: DECREMENTO EXITOSO EN EL SERVIDOR DE CUADRADO');
      console.log('📊 Datos recibidos del ERP:');
      console.log(JSON.stringify(result.data, null, 2));

      // 3. Verify immediate reconciliation in local DB
      const refreshedProduct = await Product.findByPk(targetProduct.id);
      console.log('\n🔄 VERIFICACIÓN DE RECONCILIACIÓN EN POSTGRESQL LOCAL:');
      console.log(`   - Stock ANTES del decremento: ${targetProduct.stock}`);
      console.log(`   - Stock DEVUELTO por ERP (to): ${result.data?.to}`);
      console.log(`   - Stock ACTUAL en PostgreSQL:  ${refreshedProduct.stock}`);
      console.log(`   - ¿Reconciliación inmediata?: ${refreshedProduct.stock === result.data?.to ? '✅ SÍ (CORRECTO)' : '❌ NO'}`);
    } else {
      console.error('❌ ESTADO: FALLO AL DECREMENTAR EN EL ERP');
      if (result.status) {
        console.error(`   - Código HTTP: ${result.status}`);
      }
      console.error(`   - Detalle del error: ${result.error || result.message || JSON.stringify(result)}`);

      if (result.status === 401 || result.status === 403) {
        console.error('\n💡 Sugerencia: Verifica que el token CUADRADO_API_TOKEN en backend/.env esté activo y sea correcto.');
      } else if (result.status === 404) {
        console.error(`\n💡 Sugerencia: El producto con external_id ${targetProduct.external_id} no fue encontrado en el ERP de Cuadrado.`);
      } else if (result.status === 422) {
        console.error('\n💡 Sugerencia: Los parámetros enviados no fueron aceptados por la validación del ERP.');
      }
    }

    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Error inesperado durante la ejecución:', err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

runStrictTestDecrement();
