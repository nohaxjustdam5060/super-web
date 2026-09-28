require('dotenv').config();
const { Op } = require('sequelize');
const { Product } = require('./src/models');
const sequelize = require('./src/config/database');
const cuadradoSyncService = require('./src/services/cuadradoSyncService');

const TARGET_PRODUCT_NAME = 'PRODUCTO DE PRUEBA - NO VENDER (uso interno API)';

async function runOrderDecrementSimulation() {
  console.log('\n================================================================');
  console.log('🧪 [TEST SIMULACIÓN ORDEN] DECREMENTO CON ITEMS VIRTUALES');
  console.log('================================================================');

  const apiUrl = process.env.CUADRADO_API_URL || 'https://app.cuadrado.pe/cuadrado/api';
  const rawToken = process.env.CUADRADO_API_TOKEN || '';
  const cleanToken = rawToken.replace(/^["']|["']$/g, '').trim();
  const maskedToken = cleanToken ? `${cleanToken.slice(0, 8)}...${cleanToken.slice(-6)}` : '(NO CONFIGURADO)';

  console.log(`🌐 API Endpoint: ${apiUrl}/inventory/stock/decrement`);
  console.log(`🔑 Token Activo: ${maskedToken}`);
  console.log(`🎯 Objetivo Exclusivo: "${TARGET_PRODUCT_NAME}"`);
  console.log('----------------------------------------------------------------\n');

  if (!cleanToken || cleanToken.includes('placeholder') || cleanToken.includes('xxx')) {
    console.error('❌ ERROR: CUADRADO_API_TOKEN no está configurado con un token real en backend/.env');
    await sequelize.close();
    process.exit(1);
  }

  try {
    // 1. Strict Search for the dedicated testing product
    console.log(`🔍 Buscando estrictamente "${TARGET_PRODUCT_NAME}" en PostgreSQL...`);

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
      console.error(`\n❌ ERROR DE SEGURIDAD: No se encontró el producto de prueba en la base de datos.`);
      console.error('   Ejecución abortada para proteger el inventario real.\n');
      await sequelize.close();
      process.exit(1);
    }

    if (!targetProduct.external_id) {
      console.error(`\n❌ ERROR: El producto de prueba "${targetProduct.name}" no tiene external_id.`);
      console.error('   Ejecución abortada.\n');
      await sequelize.close();
      process.exit(1);
    }

    console.log('✅ Producto de prueba identificado:');
    console.log(`   - ID Local (UUID):   ${targetProduct.id}`);
    console.log(`   - External ID (ERP): ${targetProduct.external_id}`);
    console.log(`   - SKU:               ${targetProduct.sku}`);
    console.log(`   - Nombre:            ${targetProduct.name}`);
    console.log(`   - Stock Actual en BD:${targetProduct.stock} unidades`);

    // 2. Build Simulated Order with 1 Physical Product + 2 Virtual Items
    const simulatedOrderNumber = `TEST-ORD-${Date.now().toString().slice(-4)}`;
    const simulatedOrder = {
      id: 'simulated-order-uuid',
      order_number: simulatedOrderNumber,
      payment_method: 'mercadopago',
      shipping_cost: 15.00,
      subtotal: Number(targetProduct.offer_price || targetProduct.price || 100.00),
      total: Number(targetProduct.offer_price || targetProduct.price || 100.00) + 15.00 + 5.75,
      items: [
        {
          product_id: targetProduct.id,
          product_name: targetProduct.name,
          sku: targetProduct.sku,
          quantity: 1,
          unit_price: Number(targetProduct.offer_price || targetProduct.price || 100.00),
          total_price: Number(targetProduct.offer_price || targetProduct.price || 100.00)
        },
        {
          product_id: 'SHIPPING',
          product_name: 'Envío Express (Lima y Trujillo)',
          sku: null,
          quantity: 1,
          unit_price: 15.00,
          total_price: 15.00
        },
        {
          product_id: 'GATEWAY_SURCHARGE',
          product_name: 'Recargo por pasarela de pago (5%)',
          sku: null,
          quantity: 1,
          unit_price: 5.75,
          total_price: 5.75
        }
      ]
    };

    console.log('\n📦 ESTRUCTURA DE LA ORDEN SIMULADA:');
    console.log(`   - Número de Orden: ${simulatedOrder.order_number}`);
    console.log(`   - Total Items en Orden: ${simulatedOrder.items.length}`);
    simulatedOrder.items.forEach((item, idx) => {
      console.log(`     [Item ${idx + 1}] ID: ${item.product_id} | ${item.product_name} | Cant: ${item.quantity}`);
    });

    // 3. Execute decrementStockForOrder
    console.log('\n⚡ Invocando cuadradoSyncService.decrementStockForOrder(simulatedOrder)...');
    const startTime = Date.now();

    const orderResult = await cuadradoSyncService.decrementStockForOrder(simulatedOrder);

    const elapsedMs = Date.now() - startTime;
    console.log(`⏱️ Tiempo de ejecución: ${elapsedMs}ms\n`);

    console.log('================================================================');
    console.log('📋 RESULTADOS DE LA EJECUCIÓN');
    console.log('================================================================');
    console.log(`- Estado General:        ${orderResult.success ? '✅ ÉXITO' : '❌ FALLO'}`);
    console.log(`- Total Items en Payload: ${orderResult.totalItems}`);
    console.log(`- Items Físicos Filtrados:${orderResult.physicalItemsCount}`);
    console.log(`- Peticiones Procesadas:  ${orderResult.successfulCount}`);

    console.log('\n📊 Detalle de resultados por ítem:');
    console.log(JSON.stringify(orderResult.results, null, 2));

    // 4. Verify Local PostgreSQL Stock
    const refreshedProduct = await Product.findByPk(targetProduct.id);
    console.log('\n🔄 RECONCILIACIÓN FINAL EN POSTGRESQL LOCAL:');
    console.log(`   - Stock ANTES de la orden: ${targetProduct.stock}`);
    console.log(`   - Stock DESPUÉS de la orden: ${refreshedProduct.stock}`);
    console.log(`   - Diferencia aplicada: -${targetProduct.stock - refreshedProduct.stock} unidad(es)`);

    // 5. Assertions
    console.log('\n🛡️ VERIFICACIONES DE SEGURIDAD:');
    const physicalOnly = orderResult.physicalItemsCount === 1;
    const virtualIgnored = orderResult.totalItems === 3 && orderResult.physicalItemsCount === 1;
    const noErrors = orderResult.success && orderResult.results.every((r) => r.success);

    console.log(`   - ¿Ítems virtuales (Envío/Recargo) ignorados correctamente?: ${virtualIgnored ? '✅ SÍ (CORRECTO)' : '❌ NO'}`);
    console.log(`   - ¿Solo se envió 1 petición para el producto de prueba?:      ${physicalOnly ? '✅ SÍ (CORRECTO)' : '❌ NO'}`);
    console.log(`   - ¿Sin errores por flete o comisión?:                        ${noErrors ? '✅ SÍ (CORRECTO)' : '❌ NO'}`);

    if (virtualIgnored && physicalOnly && noErrors) {
      console.log('\n🎉 ¡PRUEBA SUPERADA CON ÉXITO AL 100%!');
    } else {
      console.warn('\n⚠️ La prueba terminó pero hubo discrepancias en las validaciones.');
    }

  } catch (error) {
    console.error('\n❌ ERROR INESPERADO DURANTE LA PRUEBA:', error);
  } finally {
    await sequelize.close();
  }
}

runOrderDecrementSimulation();
