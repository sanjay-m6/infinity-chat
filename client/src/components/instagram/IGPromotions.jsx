import React, { useState } from 'react';

export default function IGPromotions({ onClose }) {
    const [step, setStep] = useState(1); // 1: goal, 2: audience, 3: budget
    const [goal, setGoal] = useState('');

    const goals = [
        { id: 'profile', title: 'More Profile Visits', desc: 'Get more people to see your bio and followers.' },
        { id: 'website', title: 'More Website Visits', desc: 'Drive traffic to your bio link or shop.' },
        { id: 'messages', title: 'More Messages', desc: 'Encourage direct AI-powered chat engagement.' },
    ];

    return (
        <div className="flex flex-col h-full bg-ig-black animate-slide-up">
            <div className="flex items-center justify-between px-4 h-14 border-b border-ig-grayBorder/30">
                <button onClick={onClose} className="p-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-base font-bold">Create Promotion</h2>
                <button onClick={onClose} className="text-sm font-semibold text-ig-blue">Cancel</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-thin">
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold mb-2">Select a Goal</h3>
                        <p className="text-sm text-ig-grayText mb-8">What result would you like from this promotion?</p>

                        <div className="flex flex-col gap-4">
                            {goals.map((g) => (
                                <button
                                    key={g.id}
                                    onClick={() => { setGoal(g.id); setStep(2); }}
                                    className="w-full text-left p-4 rounded-xl border border-ig-grayBorder/30 hover:bg-ig-gray/20 transition-all flex items-center justify-between group"
                                >
                                    <div>
                                        <div className="font-semibold text-white">{g.title}</div>
                                        <div className="text-xs text-ig-grayText">{g.desc}</div>
                                    </div>
                                    <div className="w-5 h-5 rounded-full border border-ig-grayText group-hover:border-ig-blue flex items-center justify-center">
                                        <div className={`w-3 h-3 rounded-full bg-ig-blue transition-transform ${goal === g.id ? 'scale-100' : 'scale-0'}`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-center py-10">
                        <div className="w-16 h-16 bg-ig-gray rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🎯</div>
                        <h3 className="text-lg font-bold mb-2">Automatic Audience</h3>
                        <p className="text-sm text-ig-grayText mb-8">
                            Instagram will target people similar to your current followers using your AI persona's engagement data.
                        </p>
                        <button
                            onClick={() => setStep(3)}
                            className="w-full bg-ig-blue py-3 rounded-lg font-bold text-sm"
                        >
                            Next: Budget & Duration
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-lg font-bold mb-6 text-center">Budget & Duration</h3>
                        <div className="bg-ig-gray/20 p-6 rounded-2xl border border-ig-grayBorder/20 mb-8">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-xs text-ig-grayText">Daily Budget</span>
                                <span className="text-xl font-bold">$5.00</span>
                            </div>
                            <input type="range" className="w-full accent-ig-blue" min="1" max="100" />

                            <div className="flex justify-between items-end mt-8 mb-4">
                                <span className="text-xs text-ig-grayText">Duration</span>
                                <span className="text-xl font-bold">6 Days</span>
                            </div>
                            <input type="range" className="w-full accent-ig-blue" min="1" max="30" />
                        </div>

                        <div className="text-center">
                            <p className="text-[11px] text-ig-grayText mb-6 px-4">
                                Your estimated reach is <span className="text-white font-bold">4,200 – 11,000</span> people. You will spend a total of $30.00.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] py-3 rounded-lg font-bold text-sm"
                            >
                                Boost Post Now
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
