import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'xp' | 'achievement' | 'levelup' | 'info';
}

interface UIState {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toasts: ToastMessage[];
  pushToast: (t: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  focusMode: false,
  setFocusMode: (v) => set({ focusMode: v }),
  toasts: [],
  pushToast: (t) =>
    set((state) => ({
      toasts: [...state.toasts, { ...t, id: crypto.randomUUID() }],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
