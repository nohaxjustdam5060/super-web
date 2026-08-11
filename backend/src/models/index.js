const sequelize = require('../config/database');
const User = require('./User');
const Address = require('./Address');
const Category = require('./Category');
const Brand = require('./Brand');
const Product = require('./Product');
const ProductImage = require('./ProductImage');
const ProductVariant = require('./ProductVariant');
const InventoryMovement = require('./InventoryMovement');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const OrderStatusHistory = require('./OrderStatusHistory');
const Payment = require('./Payment');
const Coupon = require('./Coupon');
const Review = require('./Review');
const Wishlist = require('./Wishlist');
const AuditLog = require('./AuditLog');
const ShippingMethod = require('./ShippingMethod');

// User Associations
User.hasMany(Address, { foreignKey: 'user_id', as: 'addresses', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Wishlist, { foreignKey: 'user_id', as: 'wishlistItems' });
Wishlist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(Cart, { foreignKey: 'user_id', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category Associations (Hierarchical)
Category.hasMany(Category, { foreignKey: 'parent_id', as: 'subcategories' });
Category.belongsTo(Category, { foreignKey: 'parent_id', as: 'parentCategory' });

Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Brand Associations
Brand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' });
Product.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });

// Product Associations
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants', onDelete: 'CASCADE' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasMany(InventoryMovement, { foreignKey: 'product_id', as: 'inventoryMovements' });
InventoryMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews' });
Review.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasMany(Wishlist, { foreignKey: 'product_id', as: 'wishlistedBy' });
Wishlist.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Cart Associations
Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' });

Product.hasMany(CartItem, { foreignKey: 'product_id', as: 'cartItems' });
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

ProductVariant.hasMany(CartItem, { foreignKey: 'variant_id', as: 'cartItems' });
CartItem.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

// Order Associations
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistory', onDelete: 'CASCADE' });
OrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Order.hasMany(Payment, { foreignKey: 'order_id', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// AuditLog
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Address,
  Category,
  Brand,
  Product,
  ProductImage,
  ProductVariant,
  InventoryMovement,
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  Coupon,
  Review,
  Wishlist,
  AuditLog,
  ShippingMethod
};
