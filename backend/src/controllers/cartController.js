const { Cart, CartItem, Product, ProductImage } = require('../models');

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
      return res.json({ success: true, items: [], subtotal: 0 });
    }

    const items = (cart.items || []).map((item) => {
      const p = item.product;
      const primaryImage = p?.images?.find((img) => img.is_primary)?.image_url || p?.images?.[0]?.image_url || null;
      return {
        id: item.id,
        product_id: p ? p.id : item.product_id,
        name: p ? p.name : 'Producto',
        slug: p ? p.slug : '',
        sku: p ? p.sku : '',
        price: Number(p ? (p.offer_price || p.price) : item.unit_price),
        quantity: item.quantity,
        total_price: Number(p ? (p.offer_price || p.price) : item.unit_price) * item.quantity,
        image_url: primaryImage,
        stock: p ? p.stock : 0
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

    return res.json({
      success: true,
      cart_id: cart.id,
      items,
      subtotal
    });
  } catch (error) {
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
