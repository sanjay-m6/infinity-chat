import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../store/useChatStore';
import Avatar from './Avatar';

function MessageBubble({ msg }) {
  const isSelf = msg.isSelf || msg.isOutbound;
  const time = new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let mediaContent = null;
  if (msg.hasMedia && msg.id && !msg.id.startsWith('local-')) {
    const mediaUrl = `/api/whatsapp/media/${encodeURIComponent(msg.id)}`;
    if (msg.type === 'video') {
      mediaContent = <video src={mediaUrl} controls className="max-w-[250px] max-h-[300px] rounded my-1" />;
    } else if (msg.type === 'audio' || msg.type === 'ptt') {
      mediaContent = <audio src={mediaUrl} controls className="w-[250px] h-12 my-1" />;
    } else if (msg.type === 'sticker') {
      mediaContent = <img src={mediaUrl} alt="Sticker" className="w-32 h-32 object-contain bg-transparent my-1" />;
    } else {
      mediaContent = <img src={mediaUrl} alt="Media" className="max-w-[250px] max-h-[300px] rounded object-cover cursor-pointer my-1" onClick={() => window.open(mediaUrl, '_blank')} />;
    }
  } else if (msg.hasMedia) {
    mediaContent = <span className="italic text-gray-400 p-2 text-sm bg-wa-gray/30 rounded inline-block my-1">📎 Sending Media...</span>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={'flex mb-1.5 ' + (isSelf ? 'justify-end' : 'justify-start')}
    >
      <div
        className={'relative max-w-[85%] sm:max-w-[65%] min-w-[85px] pl-3 pr-2 pt-1.5 pb-[20px] rounded-lg text-[14.5px] leading-relaxed shadow-sm ' +
          (isSelf ? 'bg-wa-msgOut text-gray-100 rounded-tr-sm' : 'bg-wa-msgIn text-gray-100 rounded-tl-sm')}
      >
        <div className='break-words whitespace-pre-wrap mr-1' style={{ wordBreak: 'break-word' }}>
          {mediaContent && <div>{mediaContent}</div>}
          {msg.body && <div>{msg.body}</div>}
          {(!msg.body && !mediaContent) && <span className="italic text-gray-500 text-sm">[{msg.type || 'Unknown'}]</span>}
        </div>
        <div className='absolute bottom-1 right-2 flex items-center justify-end gap-1 text-[11px] text-gray-400/90 select-none'>
          <span className='leading-none'>{time}</span>
          {isSelf && <span className={'leading-none text-[12px] ' + (msg.ack === 3 ? 'text-blue-400' : 'text-gray-500')}>{msg.ack === 0 ? '✓' : '✓✓'}</span>}
        </div>
        <div className={`absolute top-0 w-3 h-3 ${isSelf ? '-right-1.5' : '-left-1.5'}`}>
          <svg viewBox="0 0 8 13" width="8" height="13" className={isSelf ? 'fill-wa-msgOut' : 'fill-wa-msgIn'}>
            {isSelf ? <path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z" /> : <path d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z" />}
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatArea({ contact, messages, isTyping, isSyncingHistory }) {
  const [text, setText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const setSelectedContactId = useChatStore(state => state.setSelectedContactId);
  const setMessagesByChat = useChatStore(state => state.setMessagesByChat);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping, isSyncingHistory]);

  useEffect(() => {
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
    }
  }, [text]);

  useEffect(() => {
    if (!contact) return;
    const checkWhitelist = async () => {
      try {
        const res = await fetch('/api/whatsapp/ai-whitelist');
        const data = await res.json();
        if (data.ok && Array.isArray(data.aiEnabledChats)) {
          setAiEnabled(data.aiEnabledChats.includes(contact.id));
        }
      } catch (e) { }
    };
    checkWhitelist();
  }, [contact]);

  const handleToggleAi = async () => {
    if (!contact) return;
    const newState = !aiEnabled;
    setAiEnabled(newState);
    try {
      await fetch('/api/whatsapp/toggle-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: contact.id, enabled: newState })
      });
    } catch (e) { }
  };

  const handleSend = async () => {
    if (!text.trim() || !contact) return;
    const msgText = text.trim();
    setText('');

    const tempId = `local-${Date.now()}`;
    useChatStore.getState().mergeMessages(contact.id, [{
      id: tempId,
      chatId: contact.id,
      from: 'me',
      body: msgText,
      isOutbound: true,
      isSelf: true,
      timestamp: Math.floor(Date.now() / 1000),
      ack: 0,
      type: 'chat'
    }]);

    try {
      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: contact.pureId || contact.id, message: msgText, clientId: contact.clientId || 'default' })
      });
      const data = await res.json();
      if (!data?.ok) {
        console.error('Failed to send:', data?.error);
        alert('Failed to send message: ' + (data?.error || 'Unknown error'));
      } else if (data.message) {
        useChatStore.getState().mergeMessages(contact.id, [{ ...data.message, clientId: contact.clientId || 'default' }]);
      }
    } catch (e) {
      console.error('Failed to send (network):', e);
      alert('Network error while sending message. Please check if the backend is running.');
    }
  };

  const [isStickerMode, setIsStickerMode] = useState(false);
  const handleAttachment = () => { setIsStickerMode(false); fileInputRef.current?.click(); };
  const handleStickerAttachment = () => { setIsStickerMode(true); fileInputRef.current?.click(); };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file || !contact) return;

    let caption = null;
    if (!isStickerMode) {
      caption = prompt(`Send ${file.name} to ${contact.name || contact.id}?\n\nAdd a caption (optional):`, text);
      if (caption === null) { e.target.value = ''; return; }
      setText('');
    }

    const formData = new FormData();
    formData.append('to', contact.pureId || contact.id);
    formData.append('file', file);
    formData.append('clientId', contact.clientId || 'default');
    if (caption !== null) formData.append('caption', caption);
    if (isStickerMode) formData.append('isSticker', 'true');

    try {
      const res = await fetch('/api/whatsapp/send-media', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.ok && data.message) useChatStore.getState().mergeMessages(contact.id, [{ ...data.message, clientId: contact.clientId || 'default' }]);
      else alert('Failed to send media: ' + (data.error || 'Unknown error'));
    } catch (err) { alert('Upload failed: ' + err.message); }
    e.target.value = '';
  };

  const handleClearChat = () => { if (!contact) return; setMessagesByChat(prev => ({ ...prev, [contact.id]: [] })); setShowMenu(false); };
  const handleCloseChat = () => { setSelectedContactId(null); setShowMenu(false); };
  const handleViewInfo = () => { alert(`Contact: ${contact.name || contact.id}\nID: ${contact.id}\nGroup: ${contact.isGroup ? 'Yes' : 'No'}`); setShowMenu(false); };

  const handleExport = (format) => {
    if (!contact) return;
    window.open(`/api/export/${contact.id}?format=${format}`, '_blank');
    setShowMenu(false);
  };

  if (!contact) {
    return (
      <div className='hidden md:flex flex-1 bg-wa-darkBg items-center justify-center flex-col text-center p-8'>
        <div className='max-w-sm'>
          <div className='w-20 h-20 rounded-full bg-wa-gray mx-auto mb-6 flex items-center justify-center'>
            <svg className="w-10 h-10 text-wa-grayLighter" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <h2 className='text-2xl font-light mb-3 text-gray-200'>Infinity Chat</h2>
          <p className='text-wa-grayLighter text-sm leading-relaxed'>Send and receive messages with integrated AI support. Select a conversation to get started.</p>
        </div>
      </div>
    );
  }

  const name = contact.name || contact.id;
  const isOnline = contact.presence && contact.presence.isOnline;

  return (
    <div className='flex-1 flex flex-col h-full bg-wa-darkBg relative w-full'>
      <div className='absolute inset-0 chat-pattern pointer-events-none' />

      {/* HEADER */}
      <div className='h-14 bg-wa-header flex items-center px-4 justify-between z-30 shrink-0'>
        <div className='flex items-center gap-3'>
          <button onClick={() => setSelectedContactId(null)} className='md:hidden w-8 h-8 flex items-center justify-center text-wa-grayLighter hover:text-gray-200 -ml-1 mr-1'>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <Avatar contactId={contact.id} fallbackName={name} size={10} isOnline={isOnline} />
          <div className='flex flex-col'>
            <span className='font-medium text-gray-100 text-[15px] leading-tight'>{name}</span>
            <span className='text-xs text-wa-grayLighter h-4'>
              {isTyping ? <span className='text-wa-teal font-medium animate-pulse'>typing...</span> : (isOnline ? 'online' : '')}
            </span>
          </div>
        </div>
        <div className='flex items-center gap-1 relative' ref={menuRef}>
          <button onClick={handleToggleAi} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all mr-2 ${aiEnabled ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-800/30 shadow-[0_0_10px_rgba(99,102,241,0.1)]' : 'bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:bg-gray-700/50'}`} title={aiEnabled ? 'AI Auto-Reply is ON for this chat' : 'AI Auto-Reply is OFF for this chat'}>
            🤖 AI {aiEnabled ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setShowMenu(!showMenu)} className='w-9 h-9 rounded-full flex items-center justify-center text-wa-grayLighter hover:bg-wa-grayHover transition-colors' title='Menu'>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} transition={{ duration: 0.12 }} className='absolute top-full right-0 mt-1 w-52 bg-wa-gray rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50'>
                <button onClick={handleViewInfo} className='w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-wa-grayHover transition-colors flex items-center gap-3'>
                  <svg className="w-4 h-4 text-wa-grayLighter" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Contact Info
                </button>
                <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider font-bold text-gray-500 border-t border-gray-700/50">Export</div>
                <div className="flex px-2 pb-2 gap-1">
                  <button onClick={() => handleExport('txt')} className='flex-1 text-center py-1.5 text-[11px] font-medium bg-gray-700/50 text-gray-300 rounded hover:bg-gray-700 transition-colors'>TXT</button>
                  <button onClick={() => handleExport('json')} className='flex-1 text-center py-1.5 text-[11px] font-medium bg-gray-700/50 text-gray-300 rounded hover:bg-gray-700 transition-colors'>JSON</button>
                </div>
                <button onClick={handleClearChat} className='w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-wa-grayHover transition-colors flex items-center gap-3 border-t border-gray-700/50'>
                  <svg className="w-4 h-4 text-wa-grayLighter" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Clear Chat
                </button>
                <button onClick={handleCloseChat} className='w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-wa-grayHover transition-colors flex items-center gap-3 border-t border-gray-700'>
                  <svg className="w-4 h-4 text-wa-grayLighter" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Close Chat
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CHAT LOG */}
      <div className='flex-1 overflow-y-auto px-4 md:px-[5%] py-3 scrollbar-thin z-10 relative'>
        {isSyncingHistory && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-wa-darkBg/60 backdrop-blur-[2px] z-20">
            <div className="w-8 h-8 rounded-full animate-spin border-[3px] border-gray-600 border-t-wa-teal mb-3"></div>
            <span className="text-wa-grayLighter text-[13px] font-medium tracking-wide">Syncing messages...</span>
          </div>
        )}
        <AnimatePresence>
          {(!isSyncingHistory || (messages && messages.length > 0)) && (messages || []).map((m, i) => <MessageBubble key={m.id || i} msg={m} />)}
        </AnimatePresence>
        {isTyping && (
          <div className='flex justify-start mb-2'>
            <div className='bg-wa-msgIn px-4 py-3 rounded-lg rounded-tl-sm'>
              <div className='flex gap-1'>
                <span className='w-2 h-2 bg-wa-grayLighter rounded-full animate-bounce' style={{ animationDelay: '0ms' }} />
                <span className='w-2 h-2 bg-wa-grayLighter rounded-full animate-bounce' style={{ animationDelay: '150ms' }} />
                <span className='w-2 h-2 bg-wa-grayLighter rounded-full animate-bounce' style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} className='h-2' />
      </div>

      {/* INPUT BAR */}
      <div className='bg-wa-header flex items-end px-3 py-2 z-10 gap-2'>
        <button className='w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-wa-grayLighter hover:bg-wa-grayHover transition-colors mb-0.5' title='Emoji (coming soon)'>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <button onClick={handleAttachment} className='w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-wa-grayLighter hover:bg-wa-grayHover transition-colors mb-0.5' title='Attach file'>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        </button>
        <button onClick={handleStickerAttachment} className='w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-wa-grayLighter hover:bg-wa-grayHover transition-colors mb-0.5' title='Send as Sticker'>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
        <div className='flex-1 bg-wa-inputBg rounded-lg flex items-end'>
          <textarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder='Type a message' className='w-full bg-transparent px-4 py-2.5 max-h-32 min-h-[42px] outline-none resize-none text-[15px] text-gray-100 placeholder-wa-grayLighter scrollbar-thin' rows={1} />
        </div>
        <button onClick={text.trim() ? handleSend : undefined}
          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all mb-0.5 ${text.trim() ? 'bg-wa-teal text-white hover:bg-wa-teal/90 shadow-lg shadow-wa-teal/20' : 'text-wa-grayLighter hover:bg-wa-grayHover'}`}
          title={text.trim() ? 'Send' : 'Voice message (coming soon)'}>
          {text.trim() ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}
