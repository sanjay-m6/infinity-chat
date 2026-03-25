import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useChatStore } from '../store/useChatStore';
import Avatar from './Avatar';

export default function Sidebar({ contacts }) {
  const {
    readyMap,
    connectionStateMap,
    syncErrorMap,
    config,
    setShowSettings,
    activeClientId,
    setActiveClientId,
    whatsappInstances
  } = useAppStore();
  const selectedContact = useChatStore((state) => state.selectedContactId);
  const setContact = useChatStore((state) => state.setSelectedContactId);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  const ready = readyMap[activeClientId] || false;
  const connectionState = connectionStateMap[activeClientId] || 'disconnected';
  const hasConnection = ready || String(connectionState || '').toUpperCase() === 'CONNECTED';
  const syncError = syncErrorMap[activeClientId] || '';

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    const nowDark = document.documentElement.classList.contains('dark');
    setIsDark(nowDark);
  };

  const activeAccount = whatsappInstances.find(i => i.id === activeClientId) || whatsappInstances[0];

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(c =>
      (c.name || c.id || '').toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  return (
    <div className='w-full md:w-[420px] flex flex-col bg-wa-darkPanel h-full overflow-hidden shrink-0 border-r border-gray-800/50'>
      {/* HEADER */}
      <div className='bg-wa-header flex justify-between items-center px-4 h-14 shrink-0 z-20'>
        <div className='flex items-center gap-3 relative'>
          <div className='flex items-center gap-2'>
            <img src='/logo.png' alt='Infinity Chat' className='w-8 h-8 object-contain' />
            <span className='text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-wa-teal to-purple-500 hidden md:block'>Infinity</span>
          </div>

          <button
            onClick={() => setShowAccountSwitcher(!showAccountSwitcher)}
            className='ml-2 flex items-center gap-3 hover:bg-wa-grayHover p-1 pr-3 rounded-full transition-colors'
          >
            <div className='w-9 h-9 rounded-full bg-wa-teal/20 flex items-center justify-center overflow-hidden border border-wa-teal/30'>
              <span className='text-wa-teal font-bold text-sm'>{activeAccount?.name?.charAt(0) || 'D'}</span>
            </div>
            <div className='flex flex-col items-start'>
              <span className='text-[13px] font-medium text-gray-100 max-w-[120px] truncate'>{activeAccount?.name || 'Primary'}</span>
              <div className='flex items-center gap-1.5'>
                <span className={`w-2 h-2 rounded-full ${hasConnection ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                <span className='text-[10px] text-wa-grayLighter font-medium uppercase tracking-tight'>
                  {hasConnection ? 'Live' : 'Off'}
                </span>
              </div>
            </div>
            <svg className={`w-3 h-3 text-wa-grayLighter transition-transform ${showAccountSwitcher ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAccountSwitcher && (
            <div className='absolute top-full left-0 mt-1 w-56 bg-wa-gray rounded-lg shadow-2xl border border-gray-700 overflow-hidden z-50'>
              <div className='p-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest'>Select Account</div>
              {whatsappInstances.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => { setActiveClientId(inst.id); setShowAccountSwitcher(false); }}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-wa-grayHover transition-colors ${activeClientId === inst.id ? 'bg-wa-teal/10 text-wa-teal' : 'text-gray-300'}`}
                >
                  <span>{inst.name}</span>
                  {activeClientId === inst.id && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </button>
              ))}
              <div className='border-t border-gray-700/50 mt-1'>
                <button onClick={() => { setShowSettings(true); setShowAccountSwitcher(false); }} className='w-full text-left px-4 py-3 text-[12px] text-wa-teal hover:bg-wa-grayHover transition-colors flex items-center gap-2'>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Add New Account
                </button>
              </div>
            </div>
          )}
        </div>
        <div className='flex items-center gap-1'>
          <button onClick={toggleTheme} className='w-9 h-9 rounded-full flex items-center justify-center text-wa-grayLighter hover:bg-wa-grayHover transition-colors' title={isDark ? 'Light Mode' : 'Dark Mode'}>
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
          <button onClick={() => setShowSettings(true)} className='w-9 h-9 rounded-full flex items-center justify-center text-wa-grayLighter hover:bg-wa-grayHover transition-colors' title='Settings'>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {(!config.hasApiKey || !config.hasChats) && (
        <div className='bg-amber-900/20 flex items-center gap-2 p-3 text-xs text-amber-400 border-b border-amber-900/30'>
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          Bot config incomplete.
          <button onClick={() => setShowSettings(true)} className="underline hover:text-amber-300 transition-colors font-medium">Open Settings</button>
        </div>
      )}
      {!!syncError && (
        <div className='bg-red-900/20 px-4 py-2.5 text-xs text-red-400 border-b border-red-900/30 flex items-center gap-2'>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />{syncError}
        </div>
      )}

      {/* SEARCH */}
      <div className='p-2 shrink-0 z-10'>
        <div className='bg-wa-searchBg rounded-lg flex items-center px-3 h-9'>
          <svg className="w-4 h-4 text-wa-grayLighter mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type='text' placeholder='Search or start new chat' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className='bg-transparent border-none outline-none text-sm w-full text-gray-100 placeholder-wa-grayLighter' />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className='text-wa-grayLighter hover:text-gray-300 transition-colors ml-2'>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* CHAT LIST */}
      <div className='flex-1 overflow-y-auto scrollbar-thin'>
        {filteredContacts.length === 0 ? (
          <div className='p-8 text-center text-wa-grayLighter text-sm flex flex-col items-center gap-3'>
            <div className="w-14 h-14 rounded-full bg-wa-gray flex items-center justify-center">
              <svg className="w-6 h-6 text-wa-grayLighter" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            {searchQuery ? `No chats matching "${searchQuery}"` : hasConnection ? 'No active conversations yet.' : 'Loading chats from WhatsApp...'}
          </div>
        ) : (
          <ul>
            {filteredContacts.map((contact) => (
              <li key={contact.id} onClick={() => setContact(contact.id)}
                className={`px-3 py-3 cursor-pointer flex items-center transition-colors border-b border-gray-800/30 ${selectedContact === contact.id ? 'bg-wa-grayHover' : 'hover:bg-wa-gray/50'}`}>
                <div className='mr-3 shrink-0'>
                  <Avatar contactId={contact.id} fallbackName={contact.name || contact.id} size={12} isOnline={contact.presence?.isOnline} />
                </div>
                <div className='flex-1 min-w-0 flex flex-col justify-center'>
                  <div className='flex justify-between items-baseline mb-0.5'>
                    <h3 className='font-normal text-[16px] text-gray-100 truncate pr-2'>{contact.name}</h3>
                    {contact.lastMessageTime ? (
                      <span className={`text-[11px] ml-2 shrink-0 ${contact.unreadCount > 0 ? 'text-wa-teal font-medium' : 'text-wa-grayLighter'}`}>
                        {new Date(contact.lastMessageTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : null}
                  </div>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-[13px] leading-5 text-wa-grayLighter truncate flex-1'>
                      {contact.isTyping ? <span className='text-wa-teal font-medium'>typing...</span> : (contact.lastMessageText || (contact.lastMessageHasMedia ? '📎 Media' : ''))}
                    </p>
                    {contact.unreadCount > 0 && (
                      <span className='min-w-[20px] px-1.5 h-5 flex items-center justify-center rounded-full bg-wa-teal text-white text-[11px] font-bold'>
                        {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
