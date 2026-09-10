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
    const { Payment, OrderItem, Product, ProductImage } = require('../models');
    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']],
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
              include: [{ model: ProductImage, as: 'images' }]
            }
          ]
        }
      ]
    });
    return res.json({ success: true, orders });
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
