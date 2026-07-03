import { create } from 'zustand';

interface SystemState {
  offlineResilientMode: boolean;
  setOfflineResilientMode: (val: boolean) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  offlineResilientMode: false,
  setOfflineResilientMode: (val) => set({ offlineResilientMode: val }),
}));
