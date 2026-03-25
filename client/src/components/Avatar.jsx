import React, { useState, useEffect } from 'react';

export default function Avatar({ contactId, fallbackName, size = 10, isOnline = null }) {
    const [url, setUrl] = useState(null);

    useEffect(() => {
        if (!contactId) return;
        fetch(`/api/whatsapp/profile-pic/${encodeURIComponent(contactId)}`)
            .then(r => r.json())
            .then(d => { if (d.ok && d.url) setUrl(d.url) })
            .catch(() => { });
    }, [contactId]);

    const sizeMap = {
        8: 'w-8 h-8 text-xs',
        10: 'w-10 h-10 text-sm',
        12: 'w-12 h-12 text-base',
        16: 'w-16 h-16 text-xl',
    };
    const sizeClass = sizeMap[size] || sizeMap[10];

    const fallbackInitial = fallbackName ? fallbackName.charAt(0).toUpperCase() : '?';

    const gradients = [
        'from-emerald-500 to-teal-600',
        'from-blue-500 to-indigo-600',
        'from-purple-500 to-pink-600',
        'from-amber-500 to-orange-600',
        'from-rose-500 to-red-600',
        'from-cyan-500 to-blue-600',
    ];
    const gradientIndex = fallbackName
        ? fallbackName.charCodeAt(0) % gradients.length
        : 0;

    return (
        <div className="relative shrink-0">
            {url ? (
                <img
                    src={url}
                    alt="Profile"
                    className={`${sizeClass} rounded-full object-cover bg-wa-gray shrink-0`}
                />
            ) : (
                <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradients[gradientIndex]} flex items-center justify-center text-white font-semibold shrink-0`}>
                    {fallbackInitial}
                </div>
            )}
            {isOnline === true && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-wa-darkPanel rounded-full" />
            )}
        </div>
    );
}
