import React from 'react';
import { useInstagramStore } from '../../store/useInstagramStore';
import IGFeed from './IGFeed';
import IGStories from './IGStories';
import IGProfile from './IGProfile';
import IGDMs from './IGDMs';
import IGDMChat from './IGDMChat';
import IGPostComposer from './IGPostComposer';
import IGLogin from './IGLogin';

const NAV_ITEMS = [
    {
        id: 'home', label: 'Home', icon: (active) => (
            <svg className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d={active ? "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" : "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"} />
            </svg>
        )
    },
    {
        id: 'create', label: 'Create', icon: (active) => (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.5} d="M12 4v16m8-8H4" />
            </svg>
        )
    },
    {
        id: 'dms', label: 'Messages', icon: (active) => (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        )
    },
    {
        id: 'profile', label: 'Profile', icon: (active) => (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        )
    },
];

export default function IGLayout() {
    const { igActiveTab, setIgActiveTab, igActiveThreadId, igConnected, setIgConnected, setIgProfile } = useInstagramStore();

    React.useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/instagram/status');
                const data = await res.json();
                if (data.ok) {
                    const isConnected = data.connected || data.oauthConnected;
                    setIgConnected(isConnected);
                    if (data.oauthConnected) {
                        useInstagramStore.getState().setOauthConnected(true, data.isGraph);
                    }
                    if (data.profile) setIgProfile(data.profile);
                    else if (data.oauthConnected) {
                        const profRes = await fetch('/api/instagram/profile');
                        const profData = await profRes.json();
                        if (profData.ok) setIgProfile(profData.profile);
                    }
                }


            } catch { }
        };
        checkStatus();
    }, [setIgConnected, setIgProfile]);

    const renderContent = () => {
        if (!igConnected) return <IGLogin />;

        if (igActiveTab === 'dms' && igActiveThreadId) {
            return <IGDMChat />;
        }
        switch (igActiveTab) {
            case 'home': return <><IGStories /><IGFeed /></>;
            case 'create': return <IGPostComposer />;
            case 'dms': return <IGDMs />;
            case 'profile': return <IGProfile />;
            default: return <IGFeed />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-ig-black text-ig-white">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-ig-grayBorder/30">
                <h1 className="text-xl font-semibold tracking-tight bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] bg-clip-text text-transparent">
                    Instagram
                </h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIgActiveTab('dms')}
                        className="relative p-1 text-ig-white hover:text-ig-grayText transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </button>
                    <button className="p-1 text-ig-white hover:text-ig-grayText transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {renderContent()}
            </div>

            {/* Bottom Navigation */}
            <nav className="flex items-center justify-around h-14 shrink-0 border-t border-ig-grayBorder/30 bg-ig-black">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setIgActiveTab(item.id)}
                        className={`flex flex-col items-center p-2 transition-colors ${igActiveTab === item.id ? 'text-ig-white' : 'text-ig-grayText hover:text-ig-white'
                            }`}
                    >
                        {item.icon(igActiveTab === item.id)}
                    </button>
                ))}
            </nav>
        </div>
    );
}
