const https = require('https');
const { Order, OrderItem, User } = require('../models');

const NUBEFACT_URL = process.env.NUBEFACT_URL;
const NUBEFACT_TOKEN = process.env.NUBEFACT_TOKEN;
const SERIE_BOLETA = process.env.NUBEFACT_SERIE_BOLETA || 'BBB1';
const SERIE_FACTURA = process.env.NUBEFACT_SERIE_FACTURA || 'FFF1';

/**
 * Builds NubeFact JSON payload for a given order and item breakdown.
 * Formula:
 * - precio_unitario = Price with IGV
 * - valor_unitario = precio_unitario / 1.18
 * - subtotal = qty * valor_unitario
 * - igv = total - subtotal
 */
function buildNubeFactPayload(order) {
  const invoiceInfo = order.invoice_info || {};
  const shippingAddress = order.shipping_address || {};
  const isFactura = invoiceInfo.invoice_type === 'factura';

  const tipo_de_comprobante = isFactura ? 1 : 2; // 1: Factura, 2: Boleta
  const serie = isFactura ? SERIE_FACTURA : SERIE_BOLETA;
  // 6: RUC, 4: Carné de Extranjería, 1: DNI
  const cliente_tipo_de_documento = isFactura
    ? '6'
    : (invoiceInfo.document_type === 'CE' ? '4' : '1');
  const cliente_numero_de_documento = invoiceInfo.document_number || '00000000';
  const cliente_denominacion = isFactura
    ? (invoiceInfo.company_name || shippingAddress.recipient_name || order.user?.name || 'EMPRESA S.A.C.')
    : (shippingAddress.recipient_name || order.user?.name || 'CLIENTE GENERAL');

  const cliente_direccion = (isFactura && invoiceInfo.fiscal_address)
    ? invoiceInfo.fiscal_address
    : [
        shippingAddress.address_line1,
        shippingAddress.district,
        shippingAddress.department
      ].filter(Boolean).join(', ') || 'LIMA, PERU';

  const cliente_email = order.user?.email || '';

  // Today's date formatted as YYYY-MM-DD in Peru Timezone (America/Lima) to avoid SUNAT rejection
  const fecha_de_emision = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });

  const itemsPayload = [];
  let totalGravada = 0;
  let totalIgv = 0;
  let totalMonto = 0;

  const rawItems = order.items || [];
  for (const item of rawItems) {
    const qty = Number(item.quantity) || 1;
    const precioUnitario = Number(item.unit_price) || 0; // Con IGV
    const valorUnitario = parseFloat((precioUnitario / 1.18).toFixed(2)); // Sin IGV
    const subtotalItem = parseFloat((qty * valorUnitario).toFixed(2));
    const totalItem = parseFloat((qty * precioUnitario).toFixed(2));
    const igvItem = parseFloat((totalItem - subtotalItem).toFixed(2));

    totalGravada += subtotalItem;
    totalIgv += igvItem;
    totalMonto += totalItem;

    itemsPayload.push({
      unidad_de_medida: 'NIU',
      codigo: item.sku || 'SKU-PROD',
      descripcion: item.product_name || 'Producto Tecnológico',
      cantidad: qty,
      valor_unitario: valorUnitario,
      precio_unitario: precioUnitario,
      subtotal: subtotalItem,
      tipo_de_igv: 1, // Gravado - Operación Onerosa
      igv: igvItem,
      total: totalItem
    });
  }

  // Include shipping cost if applicable
  const shippingCost = Number(order.shipping_cost) || 0;
  if (shippingCost > 0) {
    const valorUnitarioEnvio = parseFloat((shippingCost / 1.18).toFixed(2));
    const subtotalEnvio = valorUnitarioEnvio;
    const totalEnvio = parseFloat(shippingCost.toFixed(2));
    const igvEnvio = parseFloat((totalEnvio - subtotalEnvio).toFixed(2));

    totalGravada += subtotalEnvio;
    totalIgv += igvEnvio;
    totalMonto += totalEnvio;

    itemsPayload.push({
      unidad_de_medida: 'ZZ',
      codigo: 'ENVIO',
      descripcion: order.shipping_method || 'Servicio de Envío Express',
      cantidad: 1,
      valor_unitario: valorUnitarioEnvio,
      precio_unitario: totalEnvio,
      subtotal: subtotalEnvio,
      tipo_de_igv: 1,
      igv: igvEnvio,
      total: totalEnvio
    });
  }

  return {
    operacion: 'generar_comprobante',
    tipo_de_comprobante,
    serie,
    numero: null, // NubeFact auto-assigns next correlativo
    codigo_unico: order.order_number || `ORD-${order.id}`,
    sunat_transaction: 1, // Venta Interna
    cliente_tipo_de_documento,
    cliente_numero_de_documento,
    cliente_denominacion,
    cliente_direccion,
    cliente_email,
    fecha_de_emision,
    moneda: 1, // 1: Soles PEN
    porcentaje_igv: 18.00,
    total_igv: parseFloat(totalIgv.toFixed(2)),
    total_gravada: parseFloat(totalGravada.toFixed(2)),
    total: parseFloat(totalMonto.toFixed(2)),
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: true,
    items: itemsPayload
  };
}

/**
 * Service function to trigger NubeFact invoicing for a paid order.
 * Updates order with invoice status, error descriptions, and PDF link.
 */
exports.generateInvoiceForOrder = async (orderId) => {
  try {
    if (!NUBEFACT_URL || !NUBEFACT_TOKEN) {
      console.warn('⚠️ [NubeFactService] NUBEFACT_URL o NUBEFACT_TOKEN no están configurados en el entorno.');
      return null;
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'user' }
      ]
    });

    if (!order) {
      console.error(`❌ [NubeFactService] Orden #${orderId} no encontrada en la base de datos.`);
      return null;
    }

    const payload = buildNubeFactPayload(order);

    console.log(`\n======================================================`);
    console.log(`🚀 [NUBEFACT API] ENVIANDO COMPROBANTE DE ORDEN #${order.order_number}`);
    console.log(`------------------------------------------------------`);
    console.log(`Tipo Comprobante: ${payload.tipo_de_comprobante === 1 ? 'FACTURA' : 'BOLETA'} (${payload.serie})`);
    console.log(`Cliente: ${payload.cliente_denominacion} (${payload.cliente_tipo_de_documento === '6' ? 'RUC' : 'DNI'}: ${payload.cliente_numero_de_documento})`);
    console.log(`Total Gravada: S/ ${payload.total_gravada} | IGV (18%): S/ ${payload.total_igv} | Total: S/ ${payload.total}`);
    console.log(`PAYLOAD JSON COMPLETO:\n`, JSON.stringify(payload, null, 2));

    const postData = JSON.stringify(payload);
    const urlObj = new URL(NUBEFACT_URL);
    const agent = new https.Agent({ rejectUnauthorized: false });

    return new Promise((resolve) => {
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        agent: agent,
        headers: {
          'Authorization': `Token token="${NUBEFACT_TOKEN}"`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', async () => {
          try {
            const data = JSON.parse(body);
            console.log(`------------------------------------------------------`);
            console.log(`✅ [NUBEFACT API RESPUESTA RECIBIDA] Status HTTP: ${res.statusCode}`);

            // Case A: NubeFact returned error or HTTP status >= 400
            if (data.errors || res.statusCode >= 400) {
              const errMsg = typeof data.errors === 'string'
                ? data.errors
                : data.errors
                ? JSON.stringify(data.errors)
                : data.sunat_description || `Error HTTP ${res.statusCode} al emitir en NubeFact`;

              console.error(`❌ [NUBEFACT ERROR]:`, errMsg);

              order.invoice_status = 'failed';
              order.invoice_error_message = errMsg;
              order.invoice_response_code = data.sunat_responsecode ? String(data.sunat_responsecode) : `HTTP_${res.statusCode}`;
              await order.save();

              resolve({ success: false, error: errMsg, data });
              return;
            }

            // Case B: SUNAT rejected the invoice
            if (data.aceptada_por_sunat === false) {
              const rejectMsg = data.sunat_description || 'Comprobante rechazado por SUNAT';
              console.warn(`⚠️ [NUBEFACT/SUNAT RECHAZADO]:`, rejectMsg);

              order.invoice_status = 'rejected';
              order.invoice_error_message = rejectMsg;
              order.invoice_response_code = data.sunat_responsecode ? String(data.sunat_responsecode) : null;
              order.invoice_series = data.serie || payload.serie || null;
              order.invoice_number = data.numero ? String(data.numero) : null;
              order.invoice_pdf_url = data.enlace_del_pdf || data.enlace || null;
              await order.save();

              resolve({ success: false, rejected: true, message: rejectMsg, data });
              return;
            }

            // Case C: Success - Invoice accepted by SUNAT / Generated
            console.log(`Estado SUNAT Aceptada: ${data.aceptada_por_sunat ? 'SÍ' : 'NO'}`);
            console.log(`Serie y Número Generado: ${data.serie}-${data.numero}`);
            console.log(`Enlace PDF Directo: ${data.enlace_del_pdf || data.enlace}`);
            console.log(`Descripción SUNAT: ${data.sunat_description || 'OK'}`);

            order.invoice_status = 'issued';
            order.invoice_series = data.serie || payload.serie || null;
            order.invoice_number = data.numero ? String(data.numero) : null;
            order.invoice_pdf_url = data.enlace_del_pdf || data.enlace || null;
            order.invoice_error_message = null;
            order.invoice_response_code = data.sunat_responsecode ? String(data.sunat_responsecode) : '0';
            await order.save();

            console.log(`RESPUESTA JSON NUBEFACT COMPLETA:\n`, JSON.stringify(data, null, 2));
            console.log(`======================================================\n`);
            resolve({ success: true, data });
          } catch (e) {
            console.error(`❌ [NubeFact] Fallo al parsear respuesta JSON:`, body);
            order.invoice_status = 'failed';
            order.invoice_error_message = 'Fallo al procesar respuesta del servicio de facturación';
            order.save().catch((saveErr) => console.error('[OrderSaveError]', saveErr));
            resolve({ success: false, error: 'JSON parse error', raw: body });
          }
        });
      });

      req.on('error', async (err) => {
        console.error(`\n======================================================`);
        console.error(`❌ [NUBEFACT API ERROR] Fallo de conexión para orden #${order.order_number}:`, err.message);
        console.error(`======================================================\n`);

        order.invoice_status = 'failed';
        order.invoice_error_message = `Error de conexión con NubeFact: ${err.message}`;
        await order.save().catch((saveErr) => console.error('[OrderSaveError]', saveErr));

        resolve({ success: false, error: err.message });
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error(`\n======================================================`);
    console.error(`❌ [NUBEFACT API ERROR] Excepción inesperada para orden #${orderId}:`, error.message);
    console.error(`======================================================\n`);
    return null;
  }
};

exports.buildNubeFactPayload = buildNubeFactPayload;
