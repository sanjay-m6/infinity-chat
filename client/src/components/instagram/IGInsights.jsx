import React from 'react';

export default function IGInsights({ profile, onClose }) {
    const metrics = [
        { label: 'Accounts Reached', value: '1.2K', change: '+12.5%' },
        { label: 'Accounts Engaged', value: '458', change: '+5.2%' },
        { label: 'Total Followers', value: profile?.followerCount?.toLocaleString() || '0', change: '+0.8%' },
    ];

    const contentStats = [
        { label: 'Likes', value: '8.4K', color: 'text-ig-red' },
        { label: 'Comments', value: '1.2K', color: 'text-ig-white' },
        { label: 'Shares', value: '452', color: 'text-ig-white' },
        { label: 'Saves', value: '891', color: 'text-ig-white' },
    ];

    return (
        <div className="flex flex-col h-full bg-ig-black animate-slide-up">
            <div className="flex items-center justify-between px-4 h-14 border-b border-ig-grayBorder/30">
                <button onClick={onClose} className="p-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h2 className="text-base font-bold">Insights</h2>
                <div className="w-8" />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
                <div className="mb-8">
                    <h3 className="text-lg font-bold mb-1 text-ig-white">Insights Overview</h3>
                    <p className="text-xs text-ig-grayText mb-4">You reached +12.5% more accounts in the last 7 days compared to the previous period.</p>

                    <div className="grid grid-cols-1 gap-3">
                        {metrics.map((m) => (
                            <div key={m.label} className="bg-ig-gray/40 border border-ig-grayBorder/20 p-4 rounded-xl">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-semibold text-ig-white">{m.label}</span>
                                    <span className="text-xs font-bold text-green-500">{m.change}</span>
                                </div>
                                <div className="text-2xl font-bold text-ig-white">{m.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-ig-white uppercase tracking-wider">Content Interactions</h3>
                        <span className="text-xs text-ig-blue font-semibold">Last 30 Days</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {contentStats.map((s) => (
                            <div key={s.label} className="bg-ig-gray/20 p-3 rounded-lg flex flex-col gap-1">
                                <span className="text-[10px] text-ig-grayText uppercase font-bold">{s.label}</span>
                                <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#f09433]/10 to-[#bc1888]/10 border border-[#f09433]/20 p-4 rounded-2xl">
                    <h4 className="text-sm font-bold text-ig-white mb-1">Discovery Efficiency</h4>
                    <p className="text-[11px] text-ig-grayText leading-relaxed">
                        Your AI-generated captions are driving 34% more engagement than manual posts. Keep it up!
                    </p>
                </div>
            </div>
        </div>
    );
}
