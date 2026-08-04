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

    const items = cart.items.map((item) => {
      const p = item.product;
      const primaryImage = p.images?.find((img) => img.is_primary)?.image_url || p.images?.[0]?.image_url || null;
      return {
        id: item.id,
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: Number(p.offer_price || p.price),
        quantity: item.quantity,
        total_price: Number(p.offer_price || p.price) * item.quantity,
        image_url: primaryImage,
        stock: p.stock
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

    const unitPrice = product.offer_price || product.price;

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

    return res.json({
      success: true,
      message: 'Producto agregado al carrito',
      item
    });
  } catch (error) {
    next(error);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const { item_id } = req.params;
    await CartItem.destroy({ where: { id: item_id } });
    return res.json({ success: true, message: 'Item eliminado del carrito' });
  } catch (error) {
    next(error);
  }
};
