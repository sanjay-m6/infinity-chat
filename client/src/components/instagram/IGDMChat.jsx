import React, { useState, useRef, useEffect } from 'react';
import { useInstagramStore } from '../../store/useInstagramStore';

export default function IGDMChat() {
    const { igActiveThreadId, setIgActiveThreadId, igInbox } = useInstagramStore();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    const thread = igInbox.find(t => t.threadId === igActiveThreadId);
    const displayName = thread?.users?.[0]?.fullName || thread?.users?.[0]?.username || 'User';

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load real messages if backend is connected
    useEffect(() => {
        if (!igActiveThreadId) return;
        const loadThread = async () => {
            try {
                const res = await fetch(`/api/instagram/thread/${igActiveThreadId}`);
                const data = await res.json();
                if (data.ok && data.messages?.length > 0) {
                    setMessages(data.messages.map(m => ({
                        id: m.itemId,
                        text: m.text || '',
                        isOutbound: m.isOutbound,
                        timestamp: m.timestamp,
                    })));
                }
            } catch { }
        };
        loadThread();
    }, [igActiveThreadId]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const msg = inputText.trim();
        setInputText('');
        setMessages(prev => [...prev, {
            id: `local_${Date.now()}`,
            text: msg,
            isOutbound: true,
            timestamp: Date.now() / 1000,
        }]);

        // Try to send via backend
        try {
            await fetch('/api/instagram/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId: igActiveThreadId, message: msg }),
            });
        } catch { }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-ig-black">
            {/* Header */}
            <div className="flex items-center gap-3 px-3 h-14 shrink-0 border-b border-ig-grayBorder/20">
                <button
                    onClick={() => setIgActiveThreadId(null)}
                    className="p-1 text-ig-white hover:text-ig-grayText transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="w-8 h-8 rounded-full bg-ig-gray flex items-center justify-center">
                    <span className="text-ig-grayText text-sm font-bold">{displayName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-ig-white truncate block">{displayName}</span>
                    <span className="text-[11px] text-ig-grayText">Active now</span>
                </div>
                <button className="p-1 text-ig-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
                <button className="p-1 text-ig-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
                <div className="flex flex-col gap-1">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isOutbound ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] px-3 py-2 rounded-3xl text-sm ${msg.isOutbound
                                ? 'bg-ig-blue text-white'
                                : 'bg-ig-gray text-ig-white'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-ig-grayBorder/20">
                <div className="flex items-center gap-2 bg-ig-gray rounded-full px-4 py-2">
                    <button className="text-ig-blue shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-ig-white placeholder-ig-grayText"
                    />
                    {inputText.trim() ? (
                        <button onClick={handleSend} className="text-ig-blue font-semibold text-sm shrink-0">
                            Send
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button className="text-ig-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </button>
                            <button className="text-ig-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
