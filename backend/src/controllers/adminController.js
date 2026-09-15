const { Order, Product, User, Category, Brand, Review, AuditLog } = require('../models');
const { Op } = require('sequelize');

exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProducts,
      lowStockProducts,
      ordersCount,
      rawRevenue,
      recentOrders,
      topLowStock
    ] = await Promise.all([
      User.count({ where: { role: 'cliente' } }),
      Product.count(),
      Product.count({
        where: { stock: { [Op.lte]: 5 } }
      }),
      Order.count(),
      Order.sum('total', { where: { status: 'paid' } }),
      Order.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
      }),
      Product.findAll({
        where: { stock: { [Op.lte]: 5 } },
        limit: 5,
        order: [['stock', 'ASC']]
      })
    ]);

    const totalRevenue = Number(rawRevenue || 0);

    return res.json({
      success: true,
      metrics: {
        totalUsers,
        totalProducts,
        lowStockProducts,
        ordersCount,
        totalRevenue: Number(totalRevenue.toFixed(2))
      },
      recentOrders,
      topLowStock
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash', 'refresh_token'] },
      order: [['createdAt', 'DESC']]
    });
    return res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    user.role = role;
    await user.save();

    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE_ROLE',
      entity: 'User',
      entity_id: user.id,
      details: { newRole: role }
    });

    return res.json({ success: true, message: 'Rol de usuario actualizado', user });
  } catch (error) {
    next(error);
  }
};

exports.getAdminOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const { status, shippingFilter } = req.query;

    const whereClause = {};

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (shippingFilter && shippingFilter !== 'all') {
      if (shippingFilter === 'pickup') {
        whereClause[Op.or] = [
          { shipping_method: { [Op.iLike]: '%recojo%' } },
          { shipping_method: { [Op.iLike]: '%pickup%' } },
          { shipping_method: { [Op.iLike]: '%tienda%' } }
        ];
      } else if (shippingFilter === 'provincia_express') {
        whereClause[Op.or] = [
          { shipping_method: { [Op.iLike]: '%provincia%' } },
          { shipping_method: { [Op.iLike]: '%agencia%' } }
        ];
      } else if (shippingFilter === 'lima_callao') {
        whereClause[Op.and] = [
          { shipping_method: { [Op.notILike]: '%recojo%' } },
          { shipping_method: { [Op.notILike]: '%pickup%' } },
          { shipping_method: { [Op.notILike]: '%tienda%' } },
          { shipping_method: { [Op.notILike]: '%provincia%' } },
          { shipping_method: { [Op.notILike]: '%agencia%' } }
        ];
      }
    }

    const { count, rows } = await Order.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
      attributes: [
        'id', 'order_number', 'user_id', 'status', 'subtotal',
        'discount_amount', 'shipping_cost', 'total', 'shipping_address',
        'shipping_method', 'invoice_info', 'payment_method', 'coupon_code',
        'notes', 'invoice_status', 'invoice_error_message', 'invoice_response_code',
        'invoice_series', 'invoice_number', 'invoice_pdf_url', 'createdAt'
      ],
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    const totalPages = Math.ceil(count / limit) || 1;

    return res.json({
      success: true,
      orders: rows,
      pagination: {
        total: count,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Payment, OrderItem, Product, ProductImage } = require('../models');
    const order = await Order.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Payment, as: 'payments' },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku', 'price'],
              include: [{ model: ProductImage, as: 'images', attributes: ['id', 'image_url', 'is_primary'] }]
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    return res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.findAll({
      limit: 50,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });
    return res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};

exports.syncCuadradoCatalog = async (req, res, next) => {
  try {
    const cuadradoSyncService = require('../services/cuadradoSyncService');
    const result = await cuadradoSyncService.syncCatalog();
    return res.json(result);
  } catch (error) {
    next(error);
  }
};
