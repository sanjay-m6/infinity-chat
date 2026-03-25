import React, { useEffect, useState } from 'react';

import { useInstagramStore } from '../../store/useInstagramStore';
import IGInsights from './IGInsights';
import IGCreatorDashboard from './IGCreatorDashboard';


function formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
    return (n || 0).toLocaleString();
}

export default function IGProfile() {
    const { igProfile, setIgProfile } = useInstagramStore();
    const [view, setView] = useState('grid'); // grid | insights | dashboard


    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/instagram/profile');
                const data = await res.json();
                if (data.ok && data.profile) setIgProfile(data.profile);
            } catch { }
        };
        load();
    }, [setIgProfile]);

    if (!igProfile) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-20 h-20 rounded-full border-2 border-ig-grayBorder flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-ig-grayText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <h3 className="text-ig-white text-lg font-semibold mb-1">No Profile</h3>
                <p className="text-ig-grayText text-sm max-w-xs">Sign in to view your profile and managed accounts.</p>
            </div>
        );
    }

    if (view === 'insights') return <IGInsights profile={igProfile} onClose={() => setView('grid')} />;
    if (view === 'dashboard') return <IGCreatorDashboard profile={igProfile} onClose={() => setView('grid')} />;

    return (
        <div className="flex flex-col">
            <div className="px-4 py-4">
                <div className="flex items-center gap-6 mb-4">
                    <div className="w-20 h-20 rounded-full bg-ig-gray flex items-center justify-center shrink-0 border-2 border-ig-grayBorder overflow-hidden">
                        {igProfile.profilePicUrl ? (
                            <img src={igProfile.profilePicUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-ig-grayText text-2xl font-bold">{igProfile.username?.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="flex-1 flex items-center justify-around">
                        {[['Posts', igProfile.mediaCount], ['Followers', igProfile.followerCount], ['Following', igProfile.followingCount]].map(([label, val]) => (
                            <div key={label} className="text-center">
                                <div className="text-lg font-bold text-ig-white">{formatCount(val)}</div>
                                <div className="text-xs text-ig-grayText">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <h2 className="text-sm font-semibold text-ig-white">{igProfile.fullName}</h2>
                {igProfile.isBusiness && <span className="text-xs text-ig-grayText">Creator</span>}
                {igProfile.isBasicToken && (
                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-[11px] text-yellow-500 leading-tight">
                            <b>Notice:</b> You are using a Basic Display token. Messaging and detailed insights require Facebook Login (Graph API).
                        </p>
                    </div>
                )}
                {igProfile.biography && <p className="text-sm text-ig-white mt-1 whitespace-pre-line">{igProfile.biography}</p>}
                <div className="flex flex-col gap-2 mt-4">
                    <div className="flex gap-2">
                        <button className="flex-1 bg-ig-gray hover:bg-ig-grayLight text-ig-white text-[13px] font-semibold py-1.5 rounded-lg transition-colors border border-ig-grayBorder/20">Edit Profile</button>
                        <button className="flex-1 bg-ig-gray hover:bg-ig-grayLight text-ig-white text-[13px] font-semibold py-1.5 rounded-lg transition-colors border border-ig-grayBorder/20">Share Profile</button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setView('dashboard')}
                            className="flex-1 bg-ig-gray hover:bg-ig-grayLight text-ig-white text-[13px] font-semibold py-1.5 rounded-lg transition-colors border border-ig-grayBorder/20"
                        >
                            Professional Dashboard
                        </button>
                        <button
                            onClick={() => setView('insights')}
                            className="flex-1 bg-ig-gray hover:bg-ig-grayLight text-ig-white text-[13px] font-semibold py-1.5 rounded-lg transition-colors border border-ig-grayBorder/20"
                        >
                            Insights
                        </button>
                    </div>
                    <button
                        onClick={async () => {
                            await fetch('/api/instagram/logout', { method: 'POST' });
                            useInstagramStore.getState().logoutInstagram();
                        }}
                        className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-500 text-[13px] font-semibold py-2 rounded-lg transition-colors border border-red-500/20"
                    >
                        Log Out / Disconnect
                    </button>
                </div>

            </div>
            <div className="border-t border-ig-grayBorder/30" />
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-ig-grayText text-sm">Posts will appear here.</p>
            </div>
        </div>
    );
}
