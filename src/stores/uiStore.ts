import { create } from 'zustand';

interface UIState {
  showAccountSelector: boolean;
}

interface UIActions {
  setShowAccountSelector: (show: boolean) => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  showAccountSelector: false,
  setShowAccountSelector: (show) => set({ showAccountSelector: show }),
}));
