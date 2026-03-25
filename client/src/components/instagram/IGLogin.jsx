import React, { useState } from 'react';
import { useInstagramStore } from '../../store/useInstagramStore';

export default function IGLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [sessionData, setSessionData] = useState('');
    const [useManual, setUseManual] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setIgConnected, setIgProfile, oauthConnected, setOauthConnected } = useInstagramStore();

    React.useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/instagram/status');
                const data = await res.json();
                if (data.ok) {
                    setIgConnected(data.connected || data.oauthConnected);
                    setOauthConnected(data.oauthConnected);

                    if (data.profile) setIgProfile(data.profile);
                }
            } catch (err) { }
        };
        checkStatus();
        const timer = setInterval(checkStatus, 5000);
        return () => clearInterval(timer);
    }, []);

    const handleLogin = async (e) => {

        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const endpoint = useManual ? '/api/instagram/import' : '/api/instagram/login';
            const body = useManual
                ? { username, sessionData }
                : { username, password };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.ok) {
                setIgConnected(true);
                const profRes = await fetch('/api/instagram/profile');
                const profData = await profRes.json();
                if (profData.ok) setIgProfile(profData.profile);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Connection error');
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] px-8 py-10">
            <div className="w-full max-w-[350px] flex flex-col items-center">
                <h1 className="text-4xl font-bold mb-10 tracking-tight bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] bg-clip-text text-transparent text-center">
                    Instagram
                </h1>

                {oauthConnected ? (
                    <div className="w-full flex flex-col items-center gap-6">
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 w-full flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-ig-white font-semibold">Account Connected</p>
                            <p className="text-ig-grayText text-xs text-center">Your official Instagram API authentication is active.</p>
                        </div>

                        <button
                            onClick={() => { /* Logout logic if needed */ setOauthConnected(false); }}
                            className="text-ig-grayText text-xs hover:text-ig-red transition-colors"
                        >
                            Disconnect Account
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="w-full flex flex-col gap-2">
                        <input
                            type="text"
                            placeholder="Username"
                            className="w-full bg-ig-grayLight text-ig-white text-sm px-4 py-3 rounded-md border border-ig-grayBorder/30 focus:border-ig-grayText outline-none transition-all"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                        />

                        {!useManual ? (
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full bg-ig-grayLight text-ig-white text-sm px-4 py-3 rounded-md border border-ig-grayBorder/30 focus:border-ig-grayText outline-none transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        ) : (
                            <textarea
                                placeholder='Paste JSON cookies or "sessionid=XXXX;"'
                                className="w-full h-24 bg-ig-grayLight text-ig-white text-xs px-4 py-3 rounded-md border border-ig-grayBorder/30 focus:border-ig-grayText outline-none transition-all resize-none"
                                value={sessionData}
                                onChange={(e) => setSessionData(e.target.value)}
                                disabled={loading}
                            />
                        )}

                        <button
                            type="submit"
                            className="w-full bg-ig-blue hover:bg-ig-blue/90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg mt-4 transition-all"
                            disabled={loading || !username || (!password && !sessionData)}
                        >
                            {loading ? 'Processing...' : (useManual ? 'Import Session' : 'Log in')}
                        </button>

                        <div className="relative flex items-center py-5 w-full">
                            <div className="flex-grow border-t border-ig-grayBorder/30"></div>
                            <span className="flex-shrink mx-4 text-ig-grayText text-[10px] font-bold uppercase tracking-widest">OR</span>
                            <div className="flex-grow border-t border-ig-grayBorder/30"></div>
                        </div>

                        <button
                            type="button"
                            onClick={() => window.open('/api/instagram/auth', '_blank')}
                            className="w-full bg-white hover:bg-white/90 text-black font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                            disabled={loading}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                            Login with Official API
                        </button>

                        <button
                            type="button"
                            onClick={() => { setUseManual(!useManual); setError(''); }}
                            className="text-ig-blue text-xs mt-4 hover:underline self-center"
                        >
                            {useManual ? 'Back to standard login' : 'Login with Cookies (Advanced)'}
                        </button>

                        {error && (
                            <div className="bg-ig-red/10 border border-ig-red/30 rounded-lg p-3 mt-4">
                                <p className="text-ig-red text-center text-xs leading-relaxed">
                                    {error}
                                </p>
                            </div>
                        )}
                    </form>
                )}



                <div className="mt-10 pt-8 border-t border-ig-grayBorder/30 w-full text-center">
                    <p className="text-ig-grayText text-[10px] leading-relaxed uppercase tracking-widest font-bold mb-2">
                        Help
                    </p>
                    <p className="text-ig-grayText text-[10px] leading-relaxed">
                        {useManual
                            ? 'Get "sessionid" from Chrome -> F12 -> Application -> Cookies. This bypasses automated login blocks.'
                            : 'Standard login is safer but might trigger automated security blocks.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
