import { create } from 'zustand';

export const useAppStore = create((set) => ({
  config: { hasApiKey: false, hasChats: false, hasClosestPerson: false },
  readyMap: {}, // clientId -> boolean
  connectionStateMap: {}, // clientId -> string
  syncErrorMap: {}, // clientId -> string
  showSettings: false,
  qrUrlMap: {}, // clientId -> string
  statuses: [],
  chats: [],
  activeClientId: 'default',
  whatsappInstances: [{ id: 'default', name: 'Primary Account' }],

  setConfig: (config) => set({ config }),
  setReady: (clientId, ready) => set((state) => ({ readyMap: { ...state.readyMap, [clientId]: ready } })),
  setConnectionState: (clientId, connState) => set((state) => ({ connectionStateMap: { ...state.connectionStateMap, [clientId]: connState } })),
  setSyncError: (clientId, error) => set((state) => ({ syncErrorMap: { ...state.syncErrorMap, [clientId]: error } })),
  setShowSettings: (show) => set({ showSettings: show }),
  setQrUrl: (clientId, url) => set((state) => ({ qrUrlMap: { ...state.qrUrlMap, [clientId]: url } })),
  setActiveClientId: (id) => set({ activeClientId: id }),
  setWhatsappInstances: (instances) => set({ whatsappInstances: instances }),
  setStatuses: (statuses) => set({ statuses }),
  addStatus: (status) => set((state) => ({
    statuses: [...state.statuses, status].slice(-120)
  })),
  setChats: (chats) => set({ chats }),
}));
