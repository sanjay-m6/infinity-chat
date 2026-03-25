import React, { useState, useRef } from 'react';
import { useInstagramStore } from '../../store/useInstagramStore';

export default function IGPostComposer() {
    const [caption, setCaption] = useState('');
    const [generating, setGenerating] = useState(false);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const { activeClientId } = useInstagramStore();

    const generateAICaption = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/instagram/generate-caption', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: "Write dynamic, professional, engaging Instagram caption." })
            });
            const data = await res.json();
            if (data.ok) setCaption(data.caption);
        } catch (e) {
            console.error('Caption error:', e);
        }
        setGenerating(false);
    };

    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
        }
    };

    const handleShare = async () => {
        if (!file) return alert('Select a photo first');
        setUploading(true);
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('caption', caption);
        formData.append('clientId', activeClientId || 'ig_default');

        try {
            const res = await fetch('/api/instagram/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.ok) {
                alert('Post shared successfully!');
                setFile(null);
                setPreview(null);
                setCaption('');
            } else {
                alert('Upload failed: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            alert('Upload error');
        }
        setUploading(false);
    };

    return (
        <div className="flex flex-col h-full bg-ig-black">
            <div className="flex items-center justify-between px-4 h-14 border-b border-ig-grayBorder/20">
                <span className="text-lg font-semibold text-ig-white">New Post</span>
                <button
                    onClick={handleShare}
                    disabled={uploading || !file}
                    className="text-ig-blue font-semibold text-sm disabled:opacity-50"
                >
                    {uploading ? 'Sharing...' : 'Share'}
                </button>
            </div>

            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            {/* Image placeholder / Preview */}
            <div
                className="aspect-square bg-ig-dark flex items-center justify-center m-4 rounded-xl border-2 border-dashed border-ig-grayBorder/30 cursor-pointer overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
            >
                {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center">
                        <svg className="w-12 h-12 text-ig-grayText mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-ig-grayText text-sm">Tap to select a photo</p>
                    </div>
                )}
            </div>

            {/* Caption */}
            <div className="px-4 flex-1">
                <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    className="w-full bg-transparent border-none outline-none text-sm text-ig-white placeholder-ig-grayText resize-none h-24"
                />
                <button
                    onClick={generateAICaption}
                    disabled={generating}
                    className="flex items-center gap-2 text-ig-blue text-sm font-semibold mt-2 hover:text-ig-blueHover transition-colors disabled:opacity-50"
                >
                    {generating ? (
                        <div className="w-4 h-4 border-2 border-ig-blue border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.78a1 1 0 011.415 0l1.414 1.414a1 1 0 11-1.414 1.414l-1.414-1.414a1 1 0 010-1.414zM20 11a1 1 0 110 2h-2a1 1 0 110-2h2zM6 11a1 1 0 110 2H4a1 1 0 110-2h2z" />
                        </svg>
                    )}
                    {generating ? 'Generating...' : '✨ AI Caption'}
                </button>
            </div>

            {/* Options */}
            <div className="border-t border-ig-grayBorder/20">
                {['Tag People', 'Add Location', 'Add Music'].map((opt) => (
                    <button key={opt} className="w-full flex items-center justify-between px-4 py-3 text-sm text-ig-white hover:bg-ig-elevated transition-colors border-b border-ig-grayBorder/10">
                        <span>{opt}</span>
                        <svg className="w-4 h-4 text-ig-grayText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                ))}
            </div>
        </div>
    );
}
