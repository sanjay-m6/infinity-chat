import { create } from 'zustand';

export const useInstagramStore = create((set, get) => ({
    // Platform state
    activePlatform: 'whatsapp',
    setActivePlatform: (p) => set({ activePlatform: p }),

    // Instagram state
    igConnected: false,
    oauthConnected: false,
    isGraph: false,
    igProfile: null,
    igFeed: [],
    igInbox: [],
    igActiveThreadId: null,
    igThreadMessages: {},
    igActiveTab: 'home', // home | explore | reels | dms | profile

    setIgConnected: (v) => set({ igConnected: v }),
    setOauthConnected: (v, isGraph = false) => set({ oauthConnected: v, isGraph }),

    logoutInstagram: () => set({
        igConnected: false,
        oauthConnected: false,
        isGraph: false,
        igProfile: null,
        igInbox: [],
        igActiveThreadId: null
    }),


    setIgProfile: (p) => set({ igProfile: p }),

    setIgFeed: (feed) => set({ igFeed: feed }),
    setIgInbox: (threads) => set({ igInbox: threads }),
    setIgActiveThreadId: (id) => set({ igActiveThreadId: id }),
    setIgActiveTab: (tab) => set({ igActiveTab: tab }),

    setIgThreadMessages: (threadId, messages) => set((state) => ({
        igThreadMessages: { ...state.igThreadMessages, [threadId]: messages }
    })),

    // Stories (mock data for UI demo)
    igStories: [],
}));
