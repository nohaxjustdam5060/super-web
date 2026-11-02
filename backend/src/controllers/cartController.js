const { Cart, CartItem, Product, ProductImage } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

exports.getCart = async (req, res, next) => {
  try {
    let cart;
    if (req.user) {
      cart = await Cart.findOne({
        where: { user_id: req.user.id },
        include: [
          {
            model: CartItem,
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
    }

    if (!cart) {
      return res.json({ success: true, items: [], subtotal: 0, warnings: [] });
    }

    const items = [];
    const warnings = [];
    const itemsToPurge = [];

    for (const item of (cart.items || [])) {
      const p = item.product;

      // Purge products that are inactive or out of stock
      if (!p || !p.is_active || (p.stock || 0) <= 0) {
        itemsToPurge.push(item.id);
        warnings.push({
          product_id: p ? p.id : item.product_id,
          name: p ? p.name : 'Producto',
          reason: 'out_of_stock',
          message: `El producto "${p ? p.name : 'Producto'}" ya no está disponible y fue retirado de tu carrito.`
        });
        continue;
      }

      let currentQty = item.quantity;
      if (currentQty > p.stock) {
        currentQty = p.stock;
        warnings.push({
          product_id: p.id,
          name: p.name,
          reason: 'adjusted_to_max',
          message: `La cantidad de "${p.name}" se ajustó a ${p.stock} según el stock disponible.`
        });
        // Silently persist adjusted quantity
        item.quantity = currentQty;
        item.save().catch(() => {});
      }

      const activeUnitPrice = Number(p.offer_price || p.price);
      if (Number(item.unit_price) !== activeUnitPrice) {
        item.unit_price = activeUnitPrice;
        item.save().catch(() => {});
      }

      const primaryImage = p.images?.find((img) => img.is_primary)?.image_url || p.images?.[0]?.image_url || null;
      items.push({
        id: item.id,
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: activeUnitPrice,
        quantity: currentQty,
        total_price: activeUnitPrice * currentQty,
        image_url: primaryImage,
        stock: p.stock
      });
    }

    // Clean up out of stock items asynchronously from database
    if (itemsToPurge.length > 0) {
      CartItem.destroy({ where: { id: { [Op.in]: itemsToPurge } } }).catch(() => {});
    }

    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

    return res.json({
      success: true,
      cart_id: cart.id,
      items,
      subtotal,
      warnings
    });
  } catch (error) {
    next(error);
  }
};

exports.syncAndMergeCart = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const rawLocalItems = Array.isArray(req.body.localItems) ? req.body.localItems : [];

    // 1. Sanitize local items: only extract UUID product_id and integer positive quantity.
    // NEVER TRUST client-sent prices.
    const sanitizedLocalMap = new Map();
    for (const raw of rawLocalItems) {
      const pid = raw.product_id || raw.id;
      const qty = parseInt(raw.quantity, 10);
      if (pid && typeof pid === 'string' && qty > 0) {
        sanitizedLocalMap.set(pid, qty);
      }
    }

    // 2. Find or create Cart for authenticated user inside transaction
    const [cart] = await Cart.findOrCreate({
      where: { user_id: req.user.id },
      transaction
    });

    // 3. Load pre-existing DB items
    const existingDbItems = await CartItem.findAll({
      where: { cart_id: cart.id },
      transaction
    });

    const dbItemByProductId = new Map();
    for (const item of existingDbItems) {
      dbItemByProductId.set(String(item.product_id), item);
    }

    // 4. Merge Logic:
    // - If product ALREADY in DB: PRESERVE the DB quantity strictly (do not alter/add local quantity).
    // - If product ONLY in local items: INSERT it using the local quantity.
    const mergedProductQuantities = new Map();

    // First load all DB items (they take full priority on quantity)
    for (const [pid, dbItem] of dbItemByProductId.entries()) {
      mergedProductQuantities.set(pid, {
        quantity: dbItem.quantity,
        isFromDb: true,
        dbItemInstance: dbItem
      });
    }

    // Then add local items ONLY if not already in DB
    for (const [pid, localQty] of sanitizedLocalMap.entries()) {
      if (!mergedProductQuantities.has(pid)) {
        mergedProductQuantities.set(pid, {
          quantity: localQty,
          isFromDb: false,
          dbItemInstance: null
        });
      }
    }

    // 5. Query Products from PostgreSQL to validate real stock, active status, and current price
    const allProductIds = Array.from(mergedProductQuantities.keys());
    const dbProducts = await Product.findAll({
      where: { id: { [Op.in]: allProductIds } },
      include: [{ model: ProductImage, as: 'images' }],
      transaction
    });

    const productMap = new Map(dbProducts.map((p) => [String(p.id), p]));

    const warnings = [];
    const itemsToKeep = [];
    const itemsToDeleteIds = [];

    for (const [pid, mergeInfo] of mergedProductQuantities.entries()) {
      const product = productMap.get(pid);

      // Rule: If product does not exist, inactive or stock <= 0, purge silently
      if (!product || !product.is_active || (product.stock || 0) <= 0) {
        if (mergeInfo.dbItemInstance) {
          itemsToDeleteIds.push(mergeInfo.dbItemInstance.id);
        }
        warnings.push({
          product_id: pid,
          name: product ? product.name : 'Producto',
          reason: 'out_of_stock',
          message: `El producto "${product ? product.name : 'Producto'}" ya no tiene stock disponible y fue retirado.`
        });
        continue;
      }

      // Rule: Price is always computed dynamically from official DB product
      const unitPrice = Number(product.offer_price || product.price);
      if (!unitPrice || unitPrice <= 0) {
        if (mergeInfo.dbItemInstance) {
          itemsToDeleteIds.push(mergeInfo.dbItemInstance.id);
        }
        continue;
      }

      // Rule: If requested quantity > available stock, clamp to stock max
      let finalQty = mergeInfo.quantity;
      if (finalQty > product.stock) {
        finalQty = product.stock;
        warnings.push({
          product_id: pid,
          name: product.name,
          reason: 'adjusted_to_max',
          message: `La cantidad de "${product.name}" se ajustó a ${product.stock} según el stock disponible.`
        });
      }

      if (mergeInfo.dbItemInstance) {
        // Update existing item in DB
        mergeInfo.dbItemInstance.quantity = finalQty;
        mergeInfo.dbItemInstance.unit_price = unitPrice;
        await mergeInfo.dbItemInstance.save({ transaction });
        itemsToKeep.push({
          id: mergeInfo.dbItemInstance.id,
          product_id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          price: unitPrice,
          quantity: finalQty,
          total_price: unitPrice * finalQty,
          image_url: product.images?.find((img) => img.is_primary)?.image_url || product.images?.[0]?.image_url || null,
          stock: product.stock
        });
      } else {
        // Create new item in DB
        const newItem = await CartItem.create({
          cart_id: cart.id,
          product_id: product.id,
          quantity: finalQty,
          unit_price: unitPrice
        }, { transaction });

        itemsToKeep.push({
          id: newItem.id,
          product_id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          price: unitPrice,
          quantity: finalQty,
          total_price: unitPrice * finalQty,
          image_url: product.images?.find((img) => img.is_primary)?.image_url || product.images?.[0]?.image_url || null,
          stock: product.stock
        });
      }
    }

    // Delete purged items from DB
    if (itemsToDeleteIds.length > 0) {
      await CartItem.destroy({
        where: { id: { [Op.in]: itemsToDeleteIds } },
        transaction
      });
    }

    // Reset abandoned emails and bump updatedAt
    cart.abandoned_emails_sent = 0;
    cart.changed('updatedAt', true);
    await cart.save({ transaction });

    await transaction.commit();

    const subtotal = itemsToKeep.reduce((sum, item) => sum + item.total_price, 0);

    return res.json({
      success: true,
      message: 'Carrito sincronizado y unificado exitosamente',
      cart_id: cart.id,
      items: itemsToKeep,
      subtotal,
      warnings
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    const product = await Product.findByPk(product_id);
    if (!product || !product.is_active) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: 'Stock insuficiente' });
    }

    const unitPrice = Number(product.offer_price || product.price);
    if (!unitPrice || unitPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: `El producto "${product.name}" no tiene un precio válido y no puede ser adquirido.`
      });
    }

    let cart;
    if (req.user) {
      [cart] = await Cart.findOrCreate({ where: { user_id: req.user.id } });
    }

    if (!cart) {
      return res.status(400).json({ success: false, message: 'No se pudo identificar el carrito' });
    }

    let item = await CartItem.findOne({
      where: { cart_id: cart.id, product_id }
    });

    if (item) {
      item.quantity += Number(quantity);
      item.unit_price = unitPrice;
      await item.save();
    } else {
      item = await CartItem.create({
        cart_id: cart.id,
        product_id,
        quantity: Number(quantity),
        unit_price: unitPrice
      });
    }

    // Reset abandoned email counter and bump updatedAt
    cart.abandoned_emails_sent = 0;
    cart.changed('updatedAt', true);
    await cart.save();

    return res.json({
      success: true,
      message: 'Producto agregado al carrito',
      item
    });
  } catch (error) {
    next(error);
  }
};

exports.updateQuantity = async (req, res, next) => {
  try {
    const { item_id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return exports.removeFromCart(req, res, next);
    }

    let item = await CartItem.findByPk(item_id);
    if (!item && req.user) {
      // Allow searching by product_id for authenticated user
      const userCart = await Cart.findOne({ where: { user_id: req.user.id } });
      if (userCart) {
        item = await CartItem.findOne({ where: { cart_id: userCart.id, product_id: item_id } });
      }
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    item.quantity = Number(quantity);
    await item.save();

    const cart = await Cart.findByPk(item.cart_id);
    if (cart) {
      cart.abandoned_emails_sent = 0;
      cart.changed('updatedAt', true);
      await cart.save();
    }

    return res.json({ success: true, message: 'Cantidad actualizada', item });
  } catch (error) {
    next(error);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const { item_id } = req.params;
    let item = await CartItem.findByPk(item_id);
    if (!item && req.user) {
      // Allow searching by product_id for authenticated user
      const userCart = await Cart.findOne({ where: { user_id: req.user.id } });
      if (userCart) {
        item = await CartItem.findOne({ where: { cart_id: userCart.id, product_id: item_id } });
      }
    }

    if (item) {
      const cartId = item.cart_id;
      await item.destroy();

      const cart = await Cart.findByPk(cartId);
      if (cart) {
        cart.abandoned_emails_sent = 0;
        cart.changed('updatedAt', true);
        await cart.save();
      }
    }
    return res.json({ success: true, message: 'Item eliminado del carrito' });
  } catch (error) {
    next(error);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    if (req.user) {
      const cart = await Cart.findOne({ where: { user_id: req.user.id } });
      if (cart) {
        await CartItem.destroy({ where: { cart_id: cart.id } });
        cart.abandoned_emails_sent = 0;
        cart.changed('updatedAt', true);
        await cart.save();
      }
    }
    return res.json({ success: true, message: 'Carrito vaciado exitosamente' });
  } catch (error) {
    next(error);
  }
};
