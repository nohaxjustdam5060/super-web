export const WHATSAPP_NUMBER = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WHATSAPP_NUMBER) || '51967554065';
export const STORE_PHONE_DISPLAY = '+51 967 554 065';
export const STORE_PHONE_TEL = 'tel:+51967554065';
export const STORE_NAME = 'SUPERLAPTOP';

/**
 * Helper to format WhatsApp purchase message and construct direct wa.me link.
 * 
 * Format:
 * Hola. Me gustaria hacer este pedido en SUPERLAPTOP:
 * • {cantidad} x {nombre_producto} ({sku}) — S/. {precio_total_del_item}
 * • {cantidad} x {nombre_producto} ({sku}) — S/. {precio_total_del_item}
 * 
 * Total: S/. {total_general_del_carrito}
 *
 * @param {Array<{ name: string, sku?: string, quantity: number, price: number, offer_price?: number }>} items
 * @returns {string} Direct WhatsApp URL with encoded message
 */
export function generateWhatsAppOrderUrl(items) {
  if (!items || items.length === 0) {
    return `https://wa.me/${WHATSAPP_NUMBER}`;
  }

  // Check if single item with price 0 (direct product detail inquiry)
  if (items.length === 1 && Number(items[0].offer_price || items[0].price) <= 0) {
    const item = items[0];
    const qty = Number(item.quantity) || 1;
    const skuStr = item.sku ? ` (SKU: ${item.sku})` : '';
    const messageText = `Hola ${STORE_NAME}, estoy interesado en este producto y deseo consultar el precio y disponibilidad:\n• ${qty} x ${item.name}${skuStr}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`;
  }

  let grandTotal = 0;

  const itemLines = items.map((item) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.offer_price || item.price) || 0;
    const itemTotal = qty * unitPrice;
    grandTotal += itemTotal;

    const skuStr = item.sku ? item.sku : 'SUP-ITEM';
    return unitPrice > 0
      ? `• ${qty} x ${item.name} (${skuStr}) — S/. ${itemTotal.toFixed(2)}`
      : `• ${qty} x ${item.name} (${skuStr}) — (Consultar precio)`;
  });

  const messageText = grandTotal > 0
    ? `Hola. Me gustaria hacer este pedido en ${STORE_NAME}:\n${itemLines.join('\n')}\n\nTotal: S/. ${grandTotal.toFixed(2)}`
    : `Hola. Me gustaria consultar la cotización en ${STORE_NAME} para:\n${itemLines.join('\n')}`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`;
}
