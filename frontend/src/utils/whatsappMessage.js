export const WHATSAPP_NUMBER = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WHATSAPP_NUMBER) || '51978529826';
export const STORE_NAME = 'SUPER Tech';

/**
 * Helper to format WhatsApp purchase message and construct direct wa.me link.
 * 
 * Format:
 * Hola. Me gustaria hacer este pedido en SUPER Tech:
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

  let grandTotal = 0;

  const itemLines = items.map((item) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.offer_price || item.price) || 0;
    const itemTotal = qty * unitPrice;
    grandTotal += itemTotal;

    const skuStr = item.sku ? item.sku : 'SUP-ITEM';
    return `• ${qty} x ${item.name} (${skuStr}) — S/. ${itemTotal.toFixed(2)}`;
  });

  const messageText = `Hola. Me gustaria hacer este pedido en ${STORE_NAME}:\n${itemLines.join('\n')}\n\nTotal: S/. ${grandTotal.toFixed(2)}`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`;
}
