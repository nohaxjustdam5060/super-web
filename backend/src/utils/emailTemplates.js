/**
 * Email Templates for SUPER Tech Store
 * Uses inline styles for maximum cross-client email compatibility (Gmail, Outlook, Yahoo, Apple Mail).
 */

function generateOrderConfirmationHTML(order) {
  const orderNumber = order.order_number || 'N/A';
  const createdDate = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('es-PE');

  const items = order.items || order.OrderItems || [];
  const address = order.shipping_address || {};
  const recipientName = address.recipient_name || 'Cliente';
  const fullAddressStr = [address.address_line1, address.address_line2, address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(', ');
  const phone = address.phone || 'N/A';

  const subtotalNum = Number(order.subtotal || 0);
  const discountNum = Number(order.discount_amount || 0);
  const shippingNum = Number(order.shipping_cost || 15);
  const totalNum = Number(order.total || 0);

  const itemsTableRows = items.length > 0 
    ? items.map(item => `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 12px; font-size: 13px; color: #1f2937; font-weight: bold;">${item.product_name || item.name || 'Producto'}</td>
          <td style="padding: 12px; font-size: 13px; color: #4b5563; text-align: center;">${item.quantity || 1}</td>
          <td style="padding: 12px; font-size: 13px; color: #4b5563; text-align: right;">S/ ${Number(item.unit_price || item.price || 0).toFixed(2)}</td>
          <td style="padding: 12px; font-size: 13px; color: #111827; font-weight: bold; text-align: right;">S/ ${Number(item.total_price || (item.quantity * item.price) || 0).toFixed(2)}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td colspan="4" style="padding: 12px; font-size: 13px; color: #6b7280; text-align: center;">Items de la orden procesados correctamente.</td>
        </tr>
      `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Confirmación de Pedido #${orderNumber}</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background-color: #0F172A; padding: 25px 30px; text-align: center; border-bottom: 4px solid #DC2626;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">
            SUPER <span style="color: #EF4444;">TECH</span>
          </h1>
          <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
            Confirmación de Compra
          </p>
        </div>

        <!-- Body Content -->
        <div style="padding: 30px;">
          <!-- Success Message -->
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 25px; text-align: center;">
            <h2 style="color: #166534; margin: 0 0 4px 0; font-size: 18px; font-weight: 800;">¡Gracias por tu compra, ${recipientName}!</h2>
            <p style="color: #15803d; margin: 0; font-size: 13px;">Tu pedido <strong>#${orderNumber}</strong> ha sido confirmado y el pago acreditado con éxito.</p>
          </div>

          <!-- Order Summary Metadata -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background-color: #f8fafc; border-radius: 10px; padding: 12px;">
            <tr>
              <td style="padding: 10px; font-size: 12px; color: #64748b; font-weight: bold;">NÚMERO DE ORDEN:</td>
              <td style="padding: 10px; font-size: 13px; color: #0f172a; font-weight: bold; text-align: right;">#${orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-size: 12px; color: #64748b; font-weight: bold;">FECHA DE COMPRA:</td>
              <td style="padding: 10px; font-size: 13px; color: #0f172a; text-align: right;">${createdDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-size: 12px; color: #64748b; font-weight: bold;">ESTADO DEL PAGO:</td>
              <td style="padding: 10px; font-size: 13px; color: #166534; font-weight: bold; text-align: right;">APROBADO / PAGADO</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-size: 12px; color: #64748b; font-weight: bold;">MÉTODO DE PAGO:</td>
              <td style="padding: 10px; font-size: 13px; color: #0f172a; text-align: right;">Mercado Pago Checkout Bricks</td>
            </tr>
          </table>

          <!-- Items Table -->
          <h3 style="font-size: 15px; color: #0f172a; font-weight: 800; margin: 0 0 12px 0; text-transform: uppercase; tracking: 0.5px;">Detalle de Productos</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569;">Producto</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: center;">Cant.</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: right;">P. Unit</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableRows}
            </tbody>
          </table>

          <!-- Financial Summary Breakdown -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <tr>
              <td style="width: 60%;"></td>
              <td style="width: 40%;">
                <table style="width: 100%; font-size: 13px; color: #334155;">
                  <tr>
                    <td style="padding: 4px 0;">Subtotal:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: bold;">S/ ${subtotalNum.toFixed(2)}</td>
                  </tr>
                  ${discountNum > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #166534;">Descuento Cupón:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #166534;">- S/ ${discountNum.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 4px 0;">Envío Express:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: bold;">S/ ${shippingNum.toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #e2e8f0; font-size: 16px;">
                    <td style="padding: 10px 0; font-weight: 900; color: #0f172a;">TOTAL PAGADO:</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: 900; color: #DC2626;">S/ ${totalNum.toFixed(2)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Shipping Address Box -->
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
            <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #0f172a; text-transform: uppercase; font-weight: 800;">Dirección de Envío Confirmada</h4>
            <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
              <strong>Destinatario:</strong> ${recipientName}<br />
              <strong>Dirección:</strong> ${fullAddressStr || 'Dirección registrada'}<br />
              <strong>Teléfono de contacto:</strong> ${phone}
            </p>
          </div>

          <!-- CTA / Tracking Link -->
          <div style="text-align: center; padding-top: 10px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/profile" 
               style="background-color: #1E3A8A; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(30, 58, 138, 0.3);">
              Ver Estado de mi Pedido en SUPER Tech
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 5px 0;">SUPER Tech Store • Hardware & Tecnologías de Alto Rendimiento</p>
          <p style="margin: 0;">Jr. Velarde 172, Lima • Atencion: Lunes a Sábado 9:00 a 19:00</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  generateOrderConfirmationHTML
};
