import { create } from 'zustand';

export const useCompareStore = create((set, get) => ({
  comparedProducts: JSON.parse(localStorage.getItem('super_compare_list')) || [],

  toggleCompare: (product) => {
    const list = get().comparedProducts;
    const exists = list.some((p) => p.id === product.id);

    let updated;
    if (exists) {
      updated = list.filter((p) => p.id !== product.id);
    } else {
      if (list.length >= 4) {
        alert('Solo puedes comparar hasta 4 productos simultáneamente');
        return;
      }
      updated = [...list, product];
    }

    localStorage.setItem('super_compare_list', JSON.stringify(updated));
    set({ comparedProducts: updated });
  },

  clearCompare: () => {
    localStorage.removeItem('super_compare_list');
    set({ comparedProducts: [] });
  }
}));
