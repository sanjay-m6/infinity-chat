import React, { useEffect, useState } from 'react';
import { useInstagramStore } from '../../store/useInstagramStore';

export default function IGDMs() {
    const { igInbox, setIgInbox, setIgActiveThreadId } = useInstagramStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInbox = async () => {
            try {
                const res = await fetch('/api/instagram/inbox');
                const data = await res.json();
                if (data.ok && data.threads) setIgInbox(data.threads);
            } catch { }
            setLoading(false);
        };
        loadInbox();
    }, [setIgInbox]);

    const formatTime = (ts) => {
        if (!ts) return '';
        const diff = Date.now() / 1000 - ts;
        if (diff < 60) return 'now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h';
        return Math.floor(diff / 86400) + 'd';
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ig-grayBorder/20">
                <h2 className="text-lg font-semibold text-ig-white">Messages</h2>
                <button className="text-ig-blue text-sm font-semibold">Requests</button>
            </div>
            <div className="px-4 py-2">
                <div className="bg-ig-gray rounded-lg flex items-center px-3 h-9">
                    <svg className="w-4 h-4 text-ig-grayText mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search" className="bg-transparent border-none outline-none text-sm w-full text-ig-white placeholder-ig-grayText" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-ig-grayText border-t-ig-blue rounded-full animate-spin" />
                    </div>
                ) : igInbox.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="w-20 h-20 rounded-full border-2 border-ig-grayBorder flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-ig-grayText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-ig-white text-lg font-semibold mb-1">
                            {(useInstagramStore.getState().oauthConnected && !useInstagramStore.getState().isGraph) ? 'Official API Limitation' : 'No Messages'}
                        </h3>
                        <p className="text-ig-grayText text-sm max-w-xs">
                            {(useInstagramStore.getState().oauthConnected && !useInstagramStore.getState().isGraph)
                                ? 'The Instagram Basic Display API does not support messages. To use this feature, please log in with your Facebook credentials above or upgrade to a Business account.'
                                : 'Sign in to view your direct messages.'}
                        </p>

                    </div>
                ) : (

                    <ul>
                        {igInbox.map((thread) => {
                            const displayName = thread.isGroup
                                ? (thread.threadTitle || thread.users.map(u => u.username).join(', '))
                                : (thread.users[0]?.fullName || thread.users[0]?.username || 'Unknown');

                            return (
                                <li key={thread.threadId} onClick={() => setIgActiveThreadId(thread.threadId)}
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-ig-elevated transition-colors">
                                    <div className="w-14 h-14 rounded-full bg-ig-gray flex items-center justify-center shrink-0">
                                        <span className="text-ig-grayText text-xl font-semibold">{displayName.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-ig-white truncate">{displayName}</span>
                                            <span className="text-xs text-ig-grayText shrink-0 ml-2">{formatTime(thread.lastMessage?.timestamp)}</span>
                                        </div>
                                        <p className="text-sm text-ig-grayText truncate mt-0.5">{thread.lastMessage?.text || ''}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
