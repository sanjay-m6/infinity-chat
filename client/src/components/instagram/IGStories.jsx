import React from 'react';

export default function IGStories() {
    return (
        <div className="flex items-center gap-4 px-4 py-3 overflow-x-auto scrollbar-thin border-b border-ig-grayBorder/20">
            {/* Add Story button */}
            <button className="flex flex-col items-center gap-1 shrink-0 group">
                <div className="w-16 h-16 rounded-full p-[2px] bg-ig-grayLight">
                    <div className="w-full h-full rounded-full bg-ig-black p-[2px]">
                        <div className="w-full h-full rounded-full bg-ig-gray flex items-center justify-center">
                            <span className="text-ig-grayText text-lg font-semibold">+</span>
                        </div>
                    </div>
                </div>
                <span className="text-[11px] text-ig-grayText group-hover:text-ig-white transition-colors">Your Story</span>
            </button>
        </div>
    );
}
