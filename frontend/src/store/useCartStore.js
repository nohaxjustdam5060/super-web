import { create } from 'zustand';
import axiosClient from '../api/axiosClient';

export const useCartStore = create((set, get) => ({
  items: JSON.parse(localStorage.getItem('super_local_cart')) || [],
  isOpen: false,

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  addItem: (product, quantity = 1) => {
    if (!product || Number(product.offer_price || product.price) <= 0) {
      // No permitir agregar al carrito productos con precio 0 o inválido
      return;
    }

    const { items } = get();
    const existingIndex = items.findIndex((i) => i.product_id === product.id || i.id === product.id);

    let updatedItems;
    if (existingIndex > -1) {
      updatedItems = [...items];
      updatedItems[existingIndex].quantity += quantity;
      updatedItems[existingIndex].total_price = updatedItems[existingIndex].quantity * updatedItems[existingIndex].price;
    } else {
      const price = Number(product.offer_price || product.price);
      const primaryImg = product.images?.find((img) => img.is_primary)?.image_url || product.images?.[0]?.image_url || product.image_url;
      updatedItems = [
        ...items,
        {
          id: product.id,
          product_id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          price,
          quantity,
          total_price: price * quantity,
          image_url: primaryImg,
          stock: product.stock
        }
      ];
    }

    localStorage.setItem('super_local_cart', JSON.stringify(updatedItems));
    set({ items: updatedItems, isOpen: true });

    // Sync with backend if user is authenticated (fire-and-forget, zero latency)
    const token = localStorage.getItem('super_access_token');
    if (token) {
      axiosClient.post('/cart/add', { product_id: product.id, quantity }).catch(() => {});
    }
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    const updatedItems = get().items.map((item) => {
      if (item.product_id === productId || item.id === productId) {
        return {
          ...item,
          quantity,
          total_price: item.price * quantity
        };
      }
      return item;
    });

    localStorage.setItem('super_local_cart', JSON.stringify(updatedItems));
    set({ items: updatedItems });

    // Sync with backend if user is authenticated (fire-and-forget, zero latency)
    const token = localStorage.getItem('super_access_token');
    if (token) {
      axiosClient.put(`/cart/item/${productId}`, { quantity }).catch(() => {});
    }
  },

  removeItem: (productId) => {
    const updatedItems = get().items.filter((item) => item.product_id !== productId && item.id !== productId);
    localStorage.setItem('super_local_cart', JSON.stringify(updatedItems));
    set({ items: updatedItems });

    // Sync with backend if user is authenticated (fire-and-forget, zero latency)
    const token = localStorage.getItem('super_access_token');
    if (token) {
      axiosClient.delete(`/cart/item/${productId}`).catch(() => {});
    }
  },

  clearCart: () => {
    localStorage.removeItem('super_local_cart');
    set({ items: [] });

    // Sync with backend if user is authenticated (fire-and-forget, zero latency)
    const token = localStorage.getItem('super_access_token');
    if (token) {
      axiosClient.delete('/cart/clear').catch(() => {});
    }
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + (item.total_price || item.price * item.quantity), 0);
  }
}));
