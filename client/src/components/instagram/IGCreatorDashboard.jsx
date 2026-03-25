import React, { useState } from 'react';
import IGPromotions from './IGPromotions';

export default function IGCreatorDashboard({ onClose }) {
    const [showPromotions, setShowPromotions] = useState(false);

    if (showPromotions) return <IGPromotions onClose={() => setShowPromotions(false)} />;

    const tools = [
        { title: 'AI Auto-Response', desc: 'Manage AI persona and reply rules', icon: '🤖', action: 'Manage' },
        { title: 'Ad Tools', desc: 'Promote your posts and reach more users', icon: '📈', action: 'Create' },
        { title: 'Branded Content', desc: 'Review active partnerships and deals', icon: '🤝', action: 'View' },
        { title: 'Subscription', desc: 'Manage your creator earnings', icon: '💎', action: 'Config' },
    ];

    return (
        <div className="flex flex-col h-full bg-ig-black animate-slide-up">
            <div className="flex items-center justify-between px-4 h-14 border-b border-ig-grayBorder/30">
                <button onClick={onClose} className="p-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h2 className="text-base font-bold">Professional Dashboard</h2>
                <div className="w-8" />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-ig-grayText uppercase tracking-tight mb-4">Account Tools</h3>
                    <div className="flex flex-col gap-4">
                        {tools.map((t) => (
                            <div key={t.title} className="flex items-start gap-4 p-1">
                                <div className="w-10 h-10 rounded-xl bg-ig-gray flex items-center justify-center text-xl shrink-0">
                                    {t.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-ig-white">{t.title}</h4>
                                    <p className="text-xs text-ig-grayText">{t.desc}</p>
                                </div>
                                <button
                                    onClick={() => t.title === 'Ad Tools' ? setShowPromotions(true) : null}
                                    className="text-xs font-bold text-ig-blue hover:text-ig-white transition-colors"
                                >
                                    {t.action}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-tr from-[#2c3e50] to-[#000000] border border-ig-grayBorder/30">
                    <h4 className="text-sm font-bold text-ig-white mb-2">Platform Synergy</h4>
                    <p className="text-xs text-ig-grayText leading-normal">
                        Your WhatsApp and Instagram automation are using the same AI Persona: <span className="text-ig-blue font-bold">Flirty Expert</span>.
                        Analytics show cross-platform retention is up by 15%.
                    </p>
                    <button className="mt-4 text-xs font-bold bg-ig-white text-ig-black px-4 py-2 rounded-lg hover:opacity-90 transition-all">
                        Edit Shared Persona
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-ig-grayBorder/20">
                    <h3 className="text-sm font-bold text-ig-white mb-4">Tips for Creators</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="min-w-[200px] h-32 rounded-xl bg-ig-gray/40 border border-ig-grayBorder/20 p-4">
                                <div className="text-xs font-bold text-ig-blue mb-2">TIP #{i}</div>
                                <div className="text-xs text-white">Use trending audio in Reels to boost reach by up to 3x.</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
