import { useEffect, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import SettingsPanel from './components/SettingsPanel';
import IGLayout from './components/instagram/IGLayout';
import { useAppStore } from './store/useAppStore';
import { useChatStore } from './store/useChatStore';
import { useInstagramStore } from './store/useInstagramStore';
import './index.css';

function App() {
  const {
    config, setConfig,
    ready, setReady,
    connectionState, setConnectionState,
    syncError, setSyncError,
    showSettings, setShowSettings,
    setQrUrl,
    setStatuses, addStatus,
    chats, setChats
  } = useAppStore();

  const {
    contactsMeta,
    messagesByChat,
    selectedContactId, setSelectedContactId,
    typingContacts, setTyping,
    setContactsMeta, mergeMessages, updateMessageAck
  } = useChatStore();

  useEffect(() => {
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const checkConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig({ hasApiKey: !!data.hasApiKey, hasChats: !!data.hasChats, hasClosestPerson: !!data.hasClosestPerson });
      if (!data.hasApiKey) setShowSettings(true);
    } catch { setShowSettings(true); }
  }, [setConfig, setShowSettings]);

  const loadChats = useCallback(async () => {
    try { const res = await fetch('/api/chats'); const data = await res.json(); setChats(data.files || []); } catch { setChats([]); }
  }, [setChats]);

  const loadBootstrap = useCallback(async () => {
    try {
      const { activeClientId } = useAppStore.getState();
      const res = await fetch(`/api/whatsapp/bootstrap?maxChats=3000&clientId=${activeClientId}`);
      const data = await res.json();
      const cid = data?.clientId || activeClientId || 'default';
      if (!data?.ok) { setSyncError(cid, data?.error || 'WhatsApp sync failed.'); return; }
      setSyncError(cid, '');
      setReady(cid, !!data.ready);

      const chatMeta = {};
      (data.chats || []).forEach((chat) => {
        if (!chat?.id) return;
        const compoundId = `${cid}:${chat.id}`;
        chatMeta[compoundId] = {
          ...chat,
          id: compoundId,
          pureId: chat.id,
          clientId: cid,
          name: chat.name || chat.id,
          isGroup: !!chat.isGroup,
          unreadCount: Number(chat.unreadCount || 0),
          presence: chat.presence || { isOnline: null, lastSeen: null },
          timestamp: chat.timestamp || 0,
          lastMessageText: chat.lastMessageText || '',
          lastMessageHasMedia: !!chat.lastMessageHasMedia
        };
        if (Array.isArray(chat.messages) && chat.messages.length > 0) mergeMessages(compoundId, chat.messages.map(m => ({ ...m, clientId: cid })));
      });

      setContactsMeta(chatMeta);
      setStatuses(Array.isArray(data.statuses) ? data.statuses.map(s => ({ ...s, clientId: cid })) : []);

      if (!selectedContactId && Object.keys(chatMeta).length > 0) {
        const first = Object.values(chatMeta).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
        if (first?.id) setSelectedContactId(first.id);
      }
    } catch { setSyncError('default', 'WhatsApp sync endpoint unavailable.'); }
  }, [selectedContactId, setSyncError, setReady, setContactsMeta, mergeMessages, setStatuses, setSelectedContactId]);

  useEffect(() => { checkConfig(); loadChats(); loadBootstrap(); }, [checkConfig, loadChats, loadBootstrap]);

  useEffect(() => {
    const socket = io();
    socket.on('qr', (data) => {
      const cid = data?.clientId || 'default';
      setReady(cid, false);
      setQrUrl(cid, data?.dataUrl || null);
    });
    socket.on('ready', (data) => {
      const cid = data?.clientId || 'default';
      setQrUrl(cid, null);
      setReady(cid, true);
      setConnectionState(cid, 'CONNECTED');
      loadBootstrap();
    });
    socket.on('connection_state', ({ state, message, clientId }) => {
      const cid = clientId || 'default';
      const s = state || 'UNKNOWN';
      setConnectionState(cid, s);
      if (s === 'INIT_ERROR' || s === 'AUTH_FAILURE' || s === 'DISCONNECTED') {
        setSyncError(cid, message || `WhatsApp ${s.toLowerCase().replace('_', ' ')}`);
      }
    });
    socket.on('sync_snapshot', (payload) => {
      const cid = payload?.clientId || 'default';
      const incomingChats = payload?.chats || [];
      const chatMeta = {};
      incomingChats.forEach((chat) => {
        if (!chat?.id) return;
        const compoundId = `${cid}:${chat.id}`;
        chatMeta[compoundId] = {
          ...chat,
          id: compoundId,
          pureId: chat.id,
          clientId: cid,
          name: chat.name || chat.id,
          isGroup: !!chat.isGroup,
          unreadCount: Number(chat.unreadCount || 0),
          presence: chat.presence || { isOnline: null, lastSeen: null },
          timestamp: chat.timestamp || 0,
          lastMessageText: chat.lastMessageText || '',
          lastMessageHasMedia: !!chat.lastMessageHasMedia
        };
        if (Array.isArray(chat.messages) && chat.messages.length > 0) mergeMessages(compoundId, chat.messages.map(m => ({ ...m, clientId: cid })));
      });
      setContactsMeta(chatMeta);
      if (Array.isArray(payload?.statuses)) setStatuses(payload.statuses.map(s => ({ ...s, clientId: cid })));
    });
    socket.on('message', (msg) => {
      const waChatId = msg?.chatId || msg?.from || msg?.to;
      if (!waChatId) return;
      const cid = msg?.clientId || 'default';
      const compoundId = `${cid}:${waChatId}`;
      mergeMessages(compoundId, [{ ...msg, clientId: cid }]);
      setContactsMeta((prev) => {
        const existing = prev[compoundId] || { id: compoundId, pureId: waChatId, name: msg.fromName || waChatId, unreadCount: 0, presence: { isOnline: null, lastSeen: null }, clientId: cid };
        const isCurrent = (useChatStore.getState().selectedContactId === compoundId);
        const shouldIncrementUnread = !msg.isOutbound && !isCurrent;
        return { [compoundId]: { ...existing, name: existing.name || msg.fromName || waChatId, timestamp: msg.timestamp || existing.timestamp || 0, lastMessageText: msg.body || existing.lastMessageText || '', lastMessageHasMedia: !!msg.hasMedia, unreadCount: Number(existing.unreadCount || 0) + (shouldIncrementUnread ? 1 : 0) } };
      });
    });
    socket.on('chat_update', (chat) => {
      if (!chat?.id) return;
      const cid = chat?.clientId || 'default';
      const compoundId = `${cid}:${chat.id}`;
      setContactsMeta({ [compoundId]: { ...chat, id: compoundId, pureId: chat.id, clientId: cid } });
    });
    socket.on('message_ack', ({ id, ack, clientId }) => { if (!id) return; updateMessageAck(id, ack); });
    socket.on('status_update', (status) => {
      const cid = status?.clientId || 'default';
      addStatus({ ...status, clientId: cid });
    });
    socket.on('bot_typing', ({ contactId, clientId }) => {
      const compoundId = `${clientId || 'default'}:${contactId}`;
      setTyping(compoundId, true);
    });
    socket.on('bot_typing_stop', ({ contactId, clientId }) => {
      const compoundId = `${clientId || 'default'}:${contactId}`;
      setTyping(compoundId, false);
    });
    return () => socket.disconnect();
  }, [loadBootstrap, mergeMessages, setConnectionState, setContactsMeta, setQrUrl, setReady, setStatuses, setSyncError, setTyping, updateMessageAck, addStatus]);

  useEffect(() => {
    if (!selectedContactId) return;
    const loadPresence = async () => {
      try {
        const [clientId, pureId] = selectedContactId.split(':');
        const res = await fetch(`/api/whatsapp/presence/${encodeURIComponent(pureId)}?clientId=${clientId}`);
        const data = await res.json();
        if (!data?.ok) return;
        setContactsMeta((prev) => {
          const existing = prev[selectedContactId] || { id: selectedContactId, name: selectedContactId, clientId };
          return { [selectedContactId]: { ...existing, presence: data.presence || { isOnline: null, lastSeen: null } } };
        });
      } catch { }
    };
    loadPresence();
    const intervalId = setInterval(loadPresence, 15000);
    return () => clearInterval(intervalId);
  }, [selectedContactId, setContactsMeta]);

  const [isSyncingHistory, setIsSyncingHistory] = useState(false);

  useEffect(() => {
    if (!selectedContactId) return;
    const loadHistory = async () => {
      setIsSyncingHistory(true);
      try {
        const [clientId, pureId] = selectedContactId.split(':');
        const res = await fetch(`/api/whatsapp/messages/${encodeURIComponent(pureId)}?limit=100&clientId=${clientId}`);
        const data = await res.json();
        if (!data?.ok || !Array.isArray(data.messages)) return;
        mergeMessages(selectedContactId, data.messages.map(m => ({ ...m, clientId })));
      } catch { }
      setIsSyncingHistory(false);
    };
    loadHistory();
  }, [mergeMessages, selectedContactId]);

  const { activeClientId, whatsappInstances, connectionStateMap, readyMap, syncErrorMap } = useAppStore();

  const contactsList = Object.values(contactsMeta)
    .filter(c => c.clientId === activeClientId || (!c.clientId && activeClientId === 'default'))
    .map((c) => ({ id: c.id, name: c.name || c.id, lastMessageText: c.lastMessageText || '', lastMessageTime: c.timestamp || 0, lastMessageHasMedia: !!c.lastMessageHasMedia, unreadCount: Number(c.unreadCount || 0), presence: c.presence || { isOnline: null, lastSeen: null }, isGroup: !!c.isGroup }))
    .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

  const activeContact = contactsList.find(c => c.id === selectedContactId) || null;
  const activeMessages = selectedContactId ? (messagesByChat[selectedContactId] || []) : [];

  const { activePlatform, setActivePlatform } = useInstagramStore();

  return (
    <div className="flex h-screen bg-wa-darkBg font-sans text-gray-100 overflow-hidden">
      {/* Platform Switcher Tab */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 flex bg-wa-gray/80 backdrop-blur-md rounded-b-xl overflow-hidden border border-gray-700/30 border-t-0 shadow-2xl">
        <button
          onClick={() => setActivePlatform('whatsapp')}
          className={`px-5 py-2 text-xs font-bold tracking-wide transition-all ${activePlatform === 'whatsapp'
              ? 'bg-wa-teal text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-wa-grayHover'
            }`}
        >
          WhatsApp
        </button>
        <button
          onClick={() => setActivePlatform('instagram')}
          className={`px-5 py-2 text-xs font-bold tracking-wide transition-all ${activePlatform === 'instagram'
              ? 'bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-wa-grayHover'
            }`}
        >
          Instagram
        </button>
      </div>

      {activePlatform === 'instagram' ? (
        <div className="flex-1 h-full pt-8">
          <IGLayout />
        </div>
      ) : (
        <>
          <div className={`${selectedContactId ? 'hidden md:flex' : 'flex'} w-full md:w-[420px] shrink-0 pt-8`}>
            <Sidebar contacts={contactsList} />
          </div>
          <div className={`flex-1 ${selectedContactId ? 'flex' : 'hidden md:flex'} h-full pt-8`}>
            <ChatArea contact={activeContact} messages={activeMessages} isTyping={selectedContactId && typingContacts.has(selectedContactId)} isSyncingHistory={isSyncingHistory} />
          </div>
        </>
      )}
      {showSettings && <SettingsPanel checkConfig={checkConfig} loadChats={loadChats} />}
    </div>
  );
}

export default App;
