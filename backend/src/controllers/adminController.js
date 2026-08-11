const { Order, Product, User, Category, Brand, Review, AuditLog } = require('../models');
const { Op } = require('sequelize');

exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const totalUsers = await User.count({ where: { role: 'cliente' } });
    const totalProducts = await Product.count();
    const lowStockProducts = await Product.count({
      where: { stock: { [Op.lte]: 5 } }
    });

    const ordersCount = await Order.count();
    const paidOrders = await Order.findAll({ where: { status: 'paid' } });
    const totalRevenue = paidOrders.reduce((sum, ord) => sum + Number(ord.total), 0);

    const recentOrders = await Order.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });

    const topLowStock = await Product.findAll({
      where: { stock: { [Op.lte]: 5 } },
      limit: 5,
      order: [['stock', 'ASC']]
    });

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
    const { Payment } = require('../models');
    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Payment, as: 'payments' }
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
