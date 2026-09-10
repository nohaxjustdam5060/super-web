const { Order, OrderItem, OrderStatusHistory, Product, Coupon, Address } = require('../models');

/**
 * Creates an order record along with items, validates stock and coupons,
 * and updates coupon usage if applicable within a provided or managed transaction.
 */
async function createOrderCore({
  userId,
  userEmail,
  userName,
  items,
  shipping_address,
  shipping_method,
  shipping_cost,
  invoice_info,
  payment_method = 'mercadopago',
  coupon_code,
  notes,
  status = 'pending',
  statusComment = 'Orden creada por el cliente',
  transaction = null
}) {
  if (!items || items.length === 0) {
    const err = new Error('La orden no contiene items');
    err.statusCode = 400;
    throw err;
  }

  let subtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = await Product.findByPk(item.product_id, { transaction });
    if (!product || !product.is_active) {
      const err = new Error(`Producto no disponible: ${item.name || item.product_name || item.product_id}`);
      err.statusCode = 400;
      throw err;
    }

    if (product.stock < item.quantity) {
      const err = new Error(`Stock insuficiente para ${product.name}. Stock disponible: ${product.stock}`);
      err.statusCode = 400;
      throw err;
    }

    const unitPrice = Number(product.offer_price || product.price);
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;

    validatedItems.push({
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: itemTotal
    });
  }

  // Apply Coupon if exists
  let discountAmount = 0;
  if (coupon_code) {
    const coupon = await Coupon.findOne({
      where: { code: coupon_code.toUpperCase(), is_active: true },
      transaction
    });

    if (coupon) {
      if (coupon.discount_type === 'percentage') {
        discountAmount = (subtotal * Number(coupon.discount_value)) / 100;
        if (coupon.max_discount && discountAmount > Number(coupon.max_discount)) {
          discountAmount = Number(coupon.max_discount);
        }
      } else {
        discountAmount = Number(coupon.discount_value);
      }
      coupon.used_count += 1;
      await coupon.save({ transaction });
    }
  }

  const calculatedShippingCost = shipping_cost !== undefined ? Number(shipping_cost) : 15.00;
  const total = Math.max(0, subtotal - discountAmount + calculatedShippingCost);

  // Save address as default if user checked "Guardar mi información" and is not pickup
  if (userId && shipping_address && shipping_address.save_info && !shipping_address.is_pickup && shipping_address.address_line1) {
    try {
      const existingAddress = await Address.findOne({ where: { user_id: userId }, transaction });
      const addressData = {
        user_id: userId,
        recipient_name: shipping_address.recipient_name || userName || 'Cliente',
        phone: shipping_address.phone || '999999999',
        address_line1: shipping_address.address_line1 || '',
        address_line2: [shipping_address.apartment_notes, shipping_address.reference].filter(Boolean).join(' - '),
        city: shipping_address.district || shipping_address.province || 'Lima',
        state: shipping_address.department || 'Lima',
        postal_code: '15001',
        country: 'Perú',
        is_default: true
      };

      if (existingAddress) {
        await existingAddress.update(addressData, { transaction });
      } else {
        await Address.create(addressData, { transaction });
      }
    } catch (addrErr) {
      console.error('[AddressSaveError]', addrErr);
    }
  }

  // Always create a new unique order number
  const orderNumber = `SUP-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await Order.create({
    order_number: orderNumber,
    user_id: userId,
    status,
    subtotal,
    discount_amount: discountAmount,
    shipping_cost: calculatedShippingCost,
    total,
    shipping_address,
    shipping_method: shipping_method || 'Envío Express a Domicilio',
    invoice_info: invoice_info || null,
    payment_method,
    coupon_code: coupon_code || null,
    notes: notes || null
  }, { transaction });

  await Promise.all(
    validatedItems.map((item) =>
      OrderItem.create({
        order_id: order.id,
        ...item
      }, { transaction })
    )
  );

  await OrderStatusHistory.create({
    order_id: order.id,
    status,
    comment: statusComment,
    created_by_user_id: userId
  }, { transaction });

  // Attach validatedItems and user to in-memory order instance for downstream consumers (e.g. paymentService)
  order.setDataValue('items', validatedItems);
  order.items = validatedItems;

  const userData = { name: userName || 'Cliente', email: userEmail || 'cliente@example.com' };
  order.setDataValue('user', userData);
  order.user = userData;

  return order;
}

module.exports = {
  createOrderCore
};
