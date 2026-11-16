const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Order, OrderItem, OrderStatusHistory, Product, User } = require('../models');
const logger = require('../config/logger');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Safely builds a Sequelize WHERE clause for an order identifier
 * without passing non-UUID strings (like 'SUP-123456') into a UUID column.
 */
function resolveIdentifierWhere(identifier) {
  const cleanId = String(identifier || '').trim();
  if (UUID_REGEX.test(cleanId)) {
    return { id: cleanId };
  }
  return { order_number: cleanId };
}

/**
 * Formats an Order Sequelize instance into the standardized payload expected by Cuadrado ERP
 */
function formatOrderForErp(order) {
  const inv = order.invoice_info || {};
  const ship = order.shipping_address || {};

  return {
    order_id: order.id,
    order_number: order.order_number,
    created_at: order.createdAt,
    status: order.status,
    erp_synced: Boolean(order.erp_synced),
    erp_synced_at: order.erp_synced_at || null,
    erp_sale_id: order.erp_sale_id || null,
    payment_info: {
      method: order.payment_method,
      detail: order.payment_method_detail || null
    },
    financials: {
      currency: 'PEN',
      tax_included: true,
      subtotal: Number(order.subtotal || 0),
      discount_amount: Number(order.discount_amount || 0),
      shipping_cost: Number(order.shipping_cost || 0),
      total: Number(order.total || 0)
    },
    customer: {
      user_id: order.user_id,
      name: order.user?.name || ship.recipient_name || 'Cliente',
      email: order.user?.email || null,
      phone: order.user?.phone || ship.phone || null
    },
    billing_info: {
      invoice_type: inv.invoice_type || 'boleta',
      document_type: inv.document_type || 'DNI',
      document_number: inv.document_number || null,
      legal_name: inv.company_name || inv.legal_name || order.user?.name || ship.recipient_name || null,
      fiscal_address: inv.fiscal_address || ship.address_line1 || null
    },
    shipping_address: {
      recipient_name: ship.recipient_name || null,
      phone: ship.phone || null,
      address_line1: ship.address_line1 || null,
      address_line2: ship.address_line2 || null,
      reference: ship.reference || null,
      district: ship.district || null,
      city: ship.city || null,
      state: ship.state || null,
      is_pickup: Boolean(ship.is_pickup)
    },
    items: (order.items || []).map((item) => ({
      product_id: item.product_id,
      cuadrado_external_id: item.product?.external_id || null,
      sku: item.sku || item.product?.sku || null,
      name: item.product_name,
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unit_price || 0),
      total_price: Number(item.total_price || 0)
    }))
  };
}

/**
 * GET /api/external/cuadrado/orders
 * Defaults to strict filter: status='paid' AND erp_synced=false
 */
exports.getOrdersForErp = async (req, res, next) => {
  try {
    const statusParam = req.query.status !== undefined ? String(req.query.status).trim() : 'paid';
    const syncedParam = req.query.synced !== undefined ? String(req.query.synced).trim().toLowerCase() : 'false';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const where = {};

    if (statusParam !== 'all') {
      where.status = statusParam;
    }

    if (syncedParam === 'false') {
      where.erp_synced = false;
    } else if (syncedParam === 'true') {
      where.erp_synced = true;
    }

    if (req.query.since) {
      const sinceDate = new Date(req.query.since);
      if (!Number.isNaN(sinceDate.getTime())) {
        where.createdAt = { [Op.gte]: sinceDate };
      }
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'sku', 'external_id']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const formattedOrders = rows.map(formatOrderForErp);

    return res.json({
      success: true,
      count: formattedOrders.length,
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit)
      },
      data: formattedOrders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/external/cuadrado/orders/:identifier
 * Resolves by UUID (id) or commercial order_number (SUP-...)
 */
exports.getOrderByIdentifier = async (req, res, next) => {
  try {
    const where = resolveIdentifierWhere(req.params.identifier);

    const order = await Order.findOne({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'sku', 'external_id']
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada.'
      });
    }

    return res.json({
      success: true,
      data: formatOrderForErp(order)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/external/cuadrado/orders/:identifier/synced
 * Idempotent endpoint to mark an order as synced/sold in Cuadrado ERP
 */
exports.markOrderSynced = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const { cuadrado_sale_id, invoice_series, invoice_number, notes } = req.body || {};
    const where = resolveIdentifierWhere(identifier);

    let outcome = null;

    await sequelize.transaction(async (t) => {
      const order = await Order.findOne({
        where,
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!order) {
        const err = new Error('Orden no encontrada.');
        err.statusCode = 404;
        throw err;
      }

      // Idempotency check: if already synced, return 200 OK without duplicating history
      if (order.erp_synced) {
        outcome = {
          already_synced: true,
          order
        };
        return;
      }

      // Guard against syncing unpaid or cancelled orders
      const syncableStatuses = ['paid', 'in_preparation', 'shipped', 'delivered'];
      if (!syncableStatuses.includes(order.status)) {
        const err = new Error(`La orden #${order.order_number} tiene estado "${order.status}" y no puede marcarse como vendida sin pago aprobado.`);
        err.statusCode = 400;
        throw err;
      }

      order.erp_synced = true;
      order.erp_synced_at = new Date();
      if (cuadrado_sale_id) {
        order.erp_sale_id = String(cuadrado_sale_id).trim();
      }
      if (invoice_series) {
        order.invoice_series = String(invoice_series).trim();
      }
      if (invoice_number) {
        order.invoice_number = String(invoice_number).trim();
        order.invoice_status = 'issued';
      }

      // Transition paid -> in_preparation so dispatch knows it was billed in ERP
      if (order.status === 'paid') {
        order.status = 'in_preparation';
      }

      await order.save({ transaction: t });

      const invoiceRef = [invoice_series, invoice_number].filter(Boolean).join('-');
      const historyComment = [
        'Venta registrada en Cuadrado ERP.',
        cuadrado_sale_id ? `ID Venta: ${cuadrado_sale_id}.` : null,
        invoiceRef ? `Comprobante: ${invoiceRef}.` : null,
        notes ? `Notas: ${notes}` : null
      ].filter(Boolean).join(' ');

      await OrderStatusHistory.create({
        order_id: order.id,
        status: order.status,
        comment: historyComment.slice(0, 255),
        created_by_user_id: null
      }, { transaction: t });

      outcome = {
        already_synced: false,
        order
      };
    });

    if (!outcome.already_synced) {
      logger.info(`[ExternalERP] Orden #${outcome.order.order_number} marcada como sincronizada con Cuadrado ERP (Venta: ${outcome.order.erp_sale_id || 'N/A'}).`);
    }

    return res.status(200).json({
      success: true,
      already_synced: outcome.already_synced,
      message: outcome.already_synced
        ? 'La orden ya se encontraba sincronizada previamente con Cuadrado ERP.'
        : 'Orden marcada como sincronizada exitosamente.',
      data: {
        order_id: outcome.order.id,
        order_number: outcome.order.order_number,
        status: outcome.order.status,
        erp_synced: outcome.order.erp_synced,
        erp_synced_at: outcome.order.erp_synced_at,
        erp_sale_id: outcome.order.erp_sale_id,
        invoice_series: outcome.order.invoice_series,
        invoice_number: outcome.order.invoice_number
      }
    });
  } catch (error) {
    next(error);
  }
};
