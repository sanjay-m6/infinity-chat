import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
    contactsMeta: {},
    messagesByChat: {},
    selectedContactId: null,
    typingContacts: new Set(),

    setSelectedContactId: (id) => {
        set({ selectedContactId: id });
        if (id) {
            set((state) => {
                const meta = state.contactsMeta[id];
                if (meta) {
                    return {
                        contactsMeta: {
                            ...state.contactsMeta,
                            [id]: { ...meta, unreadCount: 0 }
                        }
                    };
                }
                return state;
            });
        }
    },

    setContactsMeta: (metaUpdates) => set((state) => {
        const updates = typeof metaUpdates === 'function' ? metaUpdates(state.contactsMeta) : metaUpdates;
        return { contactsMeta: { ...state.contactsMeta, ...updates } };
    }),

    setMessagesByChat: (messagesUpdates) => set((state) => {
        const updates = typeof messagesUpdates === 'function' ? messagesUpdates(state.messagesByChat) : messagesUpdates;
        return { messagesByChat: { ...state.messagesByChat, ...updates } };
    }),

    mergeMessages: (chatId, incomingMessages) => {
        if (!chatId || !Array.isArray(incomingMessages) || incomingMessages.length === 0) return;
        set((state) => {
            const current = state.messagesByChat[chatId] || [];
            const map = new Map(current.map((m) => [m.id, m]));
            incomingMessages.forEach((m) => {
                if (!m || !m.id) return;
                map.set(m.id, { ...(map.get(m.id) || {}), ...m });
            });
            const merged = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            return {
                messagesByChat: {
                    ...state.messagesByChat,
                    [chatId]: merged
                }
            };
        });
    },

    setTyping: (contactId, isTyping) => set((state) => {
        const next = new Set(state.typingContacts);
        if (isTyping) next.add(contactId);
        else next.delete(contactId);
        return { typingContacts: next };
    }),

    updateMessageAck: (id, ack) => set((state) => {
        const updated = { ...state.messagesByChat };
        Object.keys(updated).forEach((key) => {
            updated[key] = (updated[key] || []).map((m) => (m.id === id ? { ...m, ack } : m));
        });
        return { messagesByChat: updated };
    })
}));
