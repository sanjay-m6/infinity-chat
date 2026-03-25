import React, { useEffect, useState } from 'react';

function formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

function PostCard({ post }) {
    const [liked, setLiked] = useState(post.hasLiked);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);
    const [showHeart, setShowHeart] = useState(false);

    const handleDoubleTap = () => {
        if (!liked) { setLiked(true); setLikeCount(c => c + 1); }
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
    };

    const toggleLike = () => { setLiked(!liked); setLikeCount(c => liked ? c - 1 : c + 1); };

    return (
        <div className="border-b border-ig-grayBorder/20">
            <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-[1.5px]">
                        <div className="w-full h-full rounded-full bg-ig-black p-[1px]">
                            <div className="w-full h-full rounded-full bg-ig-gray flex items-center justify-center overflow-hidden">
                                {post.user?.profilePicUrl ? (
                                    <img src={post.user.profilePicUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-ig-grayText text-xs font-bold">{(post.user?.username || '?').charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <span className="text-[13px] font-semibold text-ig-white">{post.user?.username || 'unknown'}</span>
                </div>
            </div>
            <div className="relative aspect-square bg-ig-dark flex items-center justify-center cursor-pointer select-none overflow-hidden" onDoubleClick={handleDoubleTap}>
                {post.imageUrl ? (
                    <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center opacity-30">
                        <div className="text-5xl mb-2">📷</div>
                    </div>
                )}
                {showHeart && (
                    <div className="absolute inset-0 flex items-center justify-center animate-bounce">
                        <svg className="w-24 h-24 text-ig-red drop-shadow-2xl" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                )}
            </div>
            <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-4">
                    <button onClick={toggleLike} className="transition-transform active:scale-125">
                        <svg className={`w-7 h-7 ${liked ? 'text-ig-red' : 'text-ig-white'}`} fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                    <button className="text-ig-white">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </button>
                    <button className="text-ig-white">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <button className="text-ig-white">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                </button>
            </div>
            <div className="px-3 pb-1"><span className="text-sm font-semibold text-ig-white">{formatCount(likeCount)} likes</span></div>
            {post.caption && (
                <div className="px-3 pb-1">
                    <span className="text-sm text-ig-white"><span className="font-semibold mr-1">{post.user?.username}</span>{post.caption}</span>
                </div>
            )}
            {(post.commentCount || 0) > 0 && <button className="px-3 pb-1 text-sm text-ig-grayText">View all {formatCount(post.commentCount)} comments</button>}
            <div className="px-3 pb-3"><span className="text-[10px] text-ig-grayText uppercase">{post.timeAgo || ''}</span></div>
        </div>
    );
}

export default function IGFeed() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadFeed = async () => {
            try {
                const res = await fetch('/api/instagram/feed');
                const data = await res.json();
                if (data.ok && data.feed?.length > 0) setPosts(data.feed);
            } catch { }
            setLoading(false);
        };
        loadFeed();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-ig-grayText border-t-ig-blue rounded-full animate-spin" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-20 h-20 rounded-full border-2 border-ig-grayBorder flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-ig-grayText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <h3 className="text-ig-white text-lg font-semibold mb-1">No Posts Yet</h3>
                <p className="text-ig-grayText text-sm max-w-xs">Sign in to sync your activity and see your personalized feed.</p>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
    );
}
