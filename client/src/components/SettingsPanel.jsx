import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-wa-teal text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 text-sm font-medium">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      {message}
    </motion.div>
  );
}

export default function SettingsPanel({ checkConfig, loadChats }) {
  const {
    setShowSettings,
    qrUrlMap,
    readyMap,
    connectionStateMap,
    chats,
    whatsappInstances,
    setWhatsappInstances,
    activeClientId,
    setActiveClientId
  } = useAppStore();

  const [settings, setSettings] = useState({ activeProvider: 'openai', providers: {} });
  const [uploadStatus, setUploadStatus] = useState({ text: '', type: '' });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('ai');
  const [newAccName, setNewAccName] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [newIgUsername, setNewIgUsername] = useState('');
  const [newIgPassword, setNewIgPassword] = useState('');
  const [instagramInstances, setInstagramInstances] = useState([]);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data && Object.keys(data).length > 0) {
        setSettings(data);
        if (Array.isArray(data.whatsappInstances)) setWhatsappInstances(data.whatsappInstances);
        if (Array.isArray(data.instagramInstances)) setInstagramInstances(data.instagramInstances);
      }
    }).catch(() => { });
  }, [setWhatsappInstances]);

  const loadSchedules = () => {
    fetch(`/api/schedules?clientId=${activeClientId}`).then(r => r.json()).then(data => {
      if (data.ok) setSchedules(data.schedules || []);
    });
  };

  const loadWebhooks = () => {
    fetch(`/api/webhooks?clientId=${activeClientId}`).then(r => r.json()).then(data => {
      if (data.ok) setWebhooks(data.webhooks || []);
    });
  };

  const loadAnalytics = () => {
    fetch(`/api/analytics?clientId=${activeClientId}`).then(r => r.json()).then(data => {
      if (data.ok) setAnalytics(data.analytics);
    });
  };

  useEffect(() => {
    if (activeTab === 'scheduler') loadSchedules();
    if (activeTab === 'webhooks') loadWebhooks();
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab, activeClientId]);

  const saveSettings = async (updatedSettings = settings) => {
    setSaving(true);
    try {
      // Ensure we use the whatsappInstances from the argument if provided, otherwise from store
      const finalInstances = updatedSettings.whatsappInstances || whatsappInstances;
      const payload = { ...updatedSettings, whatsappInstances: finalInstances };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      checkConfig();
      setToast('Settings saved successfully');
    } catch (err) {
      console.error('Save error:', err);
      setToast(`Error saving settings: ${err.message}`);
    }
    setSaving(false);
  };

  const handleAddAccount = () => {
    if (!newAccName.trim()) return;
    const id = newAccName.toLowerCase().replace(/\s+/g, '-');
    if (whatsappInstances.find(i => i.id === id)) return alert('Account ID already exists');
    const updated = [...whatsappInstances, { id, name: newAccName.trim() }];
    setWhatsappInstances(updated);
    setNewAccName('');
    saveSettings({ ...settings, whatsappInstances: updated });
  };

  const handleRemoveAccount = (id) => {
    if (id === 'default') {
      if (!window.confirm(`Reset Primary Account? This will clear all session data and you will need to re-scan the QR code.`)) return;
      handleClearSession('default');
      return;
    }
    if (!window.confirm(`Remove account ${id}? This will also delete its session data.`)) return;
    const updated = whatsappInstances.filter(i => i.id !== id);
    setWhatsappInstances(updated);
    if (activeClientId === id) setActiveClientId('default');
    saveSettings({ ...settings, whatsappInstances: updated });
  };

  const handleLogout = async (id) => {
    if (!window.confirm(`Log out of ${id}?`)) return;
    try {
      await fetch(`/api/whatsapp/logout?clientId=${id}`, { method: 'POST' });
      setToast(`Logged out of ${id}`);
    } catch (e) { setToast('Failed to logout'); }
  };

  const handleClearSession = async (id) => {
    if (!window.confirm(`⚠️ Clear session and cache for ${id}?`)) return;
    try {
      setToast('Clearing session...');
      await fetch('/api/whatsapp/clear-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: id }) });
    } catch { setToast('Failed to clear session'); }
  };

  const tabs = [
    { id: 'ai', label: 'AI Providers', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
    { id: 'instagram', label: 'Instagram', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'scheduler', label: 'Scheduler', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'webhooks', label: 'Webhooks', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> },
    { id: 'analytics', label: 'Analytics', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { id: 'chats', label: 'Training Data', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
  ];

  const handleProviderChange = (provider, key, value) => {
    const updated = { ...settings };
    if (!updated.providers) updated.providers = {};
    if (!updated.providers[provider]) updated.providers[provider] = {};
    updated.providers[provider][key] = value;
    setSettings(updated);
  };

  const handleWhatsappIntegrationChange = (key, value) => {
    const updated = { ...settings };
    if (!updated.integrations) updated.integrations = {};
    if (!updated.integrations.whatsapp) updated.integrations.whatsapp = {};
    updated.integrations.whatsapp[key] = value;
    setSettings(updated);
  };

  const handleIgIntegrationChange = (key, value) => {
    const updated = { ...settings };
    if (!updated.integrations) updated.integrations = {};
    if (!updated.integrations.instagram) updated.integrations.instagram = {};
    updated.integrations.instagram[key] = value;
    setSettings(updated);
  };

  const handleAddIgAccount = () => {
    if (!newIgUsername.trim() || !newIgPassword.trim()) return;
    const id = `ig-${newIgUsername.trim().toLowerCase()}`;
    if (instagramInstances.find(i => i.id === id)) return alert('Account already exists');
    const updated = [...instagramInstances, { id, name: newIgUsername.trim(), username: newIgUsername.trim(), password: newIgPassword }];
    setInstagramInstances(updated);
    setNewIgUsername('');
    setNewIgPassword('');
    saveSettings({ ...settings, instagramInstances: updated });
  };

  const handleRemoveIgAccount = (id) => {
    if (!window.confirm(`Remove Instagram account ${id}?`)) return;
    const updated = instagramInstances.filter(i => i.id !== id);
    setInstagramInstances(updated);
    saveSettings({ ...settings, instagramInstances: updated });
  };

  const handleUploadChat = async (e) => {
    e.preventDefault();
    const form = e.target;
    const fileInput = form.querySelector('input[type="file"]');
    const asClosest = form.querySelector('input[name="asClosest"]')?.checked ?? false;
    if (!fileInput?.files?.[0]) { setUploadStatus({ text: 'Choose a .txt file first.', type: 'error' }); return; }
    const formData = new FormData();
    formData.append('chat', fileInput.files[0]);
    formData.append('asClosest', asClosest ? 'true' : 'false');
    setUploading(true);
    setUploadStatus({ text: 'Uploading…', type: '' });
    try {
      const res = await fetch('/api/upload-chat', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.ok) { setUploadStatus({ text: data.message || 'Uploaded.', type: 'success' }); form.reset(); loadChats(); checkConfig(); }
      else { setUploadStatus({ text: data.error || 'Upload failed.', type: 'error' }); }
    } catch { setUploadStatus({ text: 'Upload failed. Try again.', type: 'error' }); }
    setUploading(false);
  };

  const handleSetPrimary = async (filename) => {
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(filename)}/primary`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setToast(`${filename} set as primary`);
        loadChats();
      } else setToast('Failed to set primary');
    } catch {
      setToast('Error setting primary');
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!window.confirm(`Delete ${filename}?`)) return;
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setToast(`Deleted ${filename}`);
        loadChats();
      } else setToast('Failed to delete');
    } catch {
      setToast('Error deleting file');
    }
  };

  const handleResetAnalytics = async () => {
    if (!window.confirm('Clear all usage history?')) return;
    try {
      await fetch('/api/analytics/reset', { method: 'POST' });
      setToast('Analytics reset');
    } catch { }
  };

  const formVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.2 } }, exit: { opacity: 0, x: 10, transition: { duration: 0.15 } } };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-wa-darkPanel max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[650px] max-h-[90vh] border border-gray-700/50 m-4">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700/50 flex justify-between items-center bg-wa-header">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-wa-grayLighter" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings
            </h2>
            <button onClick={() => setShowSettings(false)} className="text-wa-grayLighter hover:text-gray-200 transition-colors p-1.5 hover:bg-wa-grayHover rounded-full">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="w-1/3 border-r border-gray-700/50 bg-wa-darkPanel">
              <ul className="p-3 space-y-1 mt-2">
                {tabs.map(tab => (
                  <li key={tab.id} className={`px-4 py-3 flex items-center gap-3 rounded-lg cursor-pointer transition-colors text-sm ${activeTab === tab.id ? 'bg-wa-grayHover text-gray-100 font-semibold' : 'hover:bg-wa-grayHover text-wa-grayLighter'}`} onClick={() => setActiveTab(tab.id)}>
                    {tab.icon} {tab.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Content */}
            <div className="w-2/3 overflow-y-auto bg-wa-darkPanel relative scrollbar-thin">
              <AnimatePresence mode="wait">
                {activeTab === 'ai' && (
                  <motion.div key="ai" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-2">Active Engine</label>
                      <p className="text-xs text-wa-grayLighter mb-3">Select the primary AI engine for automated WhatsApp replies.</p>
                      <select className="w-full border border-gray-700 rounded-xl px-4 py-3 bg-wa-gray text-gray-100 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all" value={settings.activeProvider || 'openai'} onChange={(e) => setSettings({ ...settings, activeProvider: e.target.value })}>
                        <option value="openai">OpenAI (GPT-4)</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="nvidia">NVIDIA NIM</option>
                        <option value="openrouter">OpenRouter</option>
                      </select>
                    </div>
                    <div className="p-5 border rounded-xl border-indigo-500/20 bg-indigo-900/5">
                      <div className="flex justify-between mb-2">
                        <span className="block text-sm font-semibold text-gray-200">AI Persona Behavior</span>
                      </div>
                      <p className="text-xs text-wa-grayLighter mb-3">Change how the AI acts, speaks, and responds.</p>
                      <select className="w-full border border-gray-700 rounded-lg px-3 py-2.5 bg-wa-gray text-white text-sm cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/30 hover:border-gray-500 transition-all" value={settings.integrations?.whatsapp?.botPersona || 'toxic_mimic'} onChange={(e) => handleWhatsappIntegrationChange('botPersona', e.target.value)}>
                        <option value="human">Standard Human / Regular Person</option>
                        <option value="ai">Standard AI Assistant</option>
                        <option value="advanced_ai">Advanced Super-Intelligent AI</option>
                        <option value="fun">Fun & Energetic</option>
                        <option value="toxic">Sarcastic & Toxic</option>
                        <option value="toxic_mimic">Toxic & Professional Frenemy (Default)</option>
                        <option value="toxic_flirty">Toxic but Romantic / Flirty</option>
                        <option value="seductive_professional">Seductive & Professional Executive</option>
                        <option value="romantic_lover">Obsessively Devoted Lover</option>
                        <option value="mysterious_flirt">Mysterious & Seductive Stranger</option>
                        <option value="childish">Childish & Playful</option>
                        <option value="professional">Professional Businessman</option>
                        <option value="ceo">Visionary Tech CEO</option>
                        <option value="lawyer">Elite Corporate Attorney</option>
                        <option value="flirty">Flirty & Daring</option>
                        <option value="genz">Gen-Z Brainrot</option>
                      </select>
                    </div>
                    {['openai', 'gemini', 'nvidia', 'openrouter'].map(provider => (
                      <div key={provider} className={`p-5 border rounded-xl transition-all ${settings.activeProvider === provider ? 'border-indigo-500/30 bg-indigo-900/10' : 'hidden'}`}>
                        <h3 className="font-bold capitalize mb-4 text-gray-200">{provider} API Configuration</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">API Key</label>
                            <input type="password" className="w-full border border-gray-700 rounded-lg px-3 py-2.5 outline-none bg-wa-gray text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-sm placeholder-wa-grayLighter" placeholder="sk-..." value={settings.providers?.[provider]?.apiKey || ''} onChange={(e) => handleProviderChange(provider, 'apiKey', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Model Name <span className="text-wa-grayLighter font-normal ml-1">e.g., gpt-4o-mini</span></label>
                            <input type="text" className="w-full border border-gray-700 rounded-lg px-3 py-2.5 outline-none bg-wa-gray text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-sm placeholder-wa-grayLighter" value={settings.providers?.[provider]?.model || ''} onChange={(e) => handleProviderChange(provider, 'model', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="border-t border-gray-700/50 pt-6 mt-6">
                      <div className="flex justify-between mb-2">
                        <span className="block text-lg font-semibold text-gray-200">Image Generation AI</span>
                      </div>
                      <p className="text-xs text-wa-grayLighter mb-4">Select the primary API to use for image creation.</p>

                      <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-200 mb-2">Active Image Engine</label>
                        <select className="w-full border border-gray-700 rounded-xl px-4 py-3 bg-wa-gray text-gray-100 cursor-pointer outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all" value={settings.activeImageProvider || 'openai'} onChange={(e) => setSettings({ ...settings, activeImageProvider: e.target.value })}>
                          <option value="openai">OpenAI (DALL-E 3)</option>
                          <option value="stability">Stability AI</option>
                          <option value="fal">Fal.ai (Flux/SD)</option>
                          <option value="together">Together AI</option>
                        </select>
                      </div>

                      {['openai', 'stability', 'fal', 'together'].map(provider => (
                        <div key={`img-${provider}`} className={`p-5 border rounded-xl transition-all ${settings.activeImageProvider === provider && provider !== 'openai' ? 'border-pink-500/30 bg-pink-900/10 mb-4' : 'hidden'}`}>
                          <h3 className="font-bold capitalize mb-4 text-gray-200">{provider} Image Configuration</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">API Key</label>
                              <input type="password"
                                className="w-full border border-gray-700 rounded-lg px-3 py-2.5 outline-none bg-wa-gray text-gray-100 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all font-mono text-sm placeholder-wa-grayLighter"
                                placeholder="sk-..."
                                value={settings.imageProviders?.[provider]?.apiKey || ''}
                                onChange={(e) => {
                                  const newSettings = { ...settings };
                                  if (!newSettings.imageProviders) newSettings.imageProviders = {};
                                  if (!newSettings.imageProviders[provider]) newSettings.imageProviders[provider] = {};
                                  newSettings.imageProviders[provider].apiKey = e.target.value;
                                  setSettings(newSettings);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className={`p-5 border rounded-xl transition-all border-pink-500/30 bg-pink-900/10 mb-4 ${settings.activeImageProvider === 'openai' ? 'block' : 'hidden'}`}>
                        <p className="text-xs text-gray-300">OpenAI uses your standard OpenAI chat wrapper API key defined above.</p>
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-300 mb-1.5">DALL-E Image Size</label>
                          <select className="w-full border border-gray-700 rounded-lg px-3 py-2.5 bg-wa-gray text-gray-100 outline-none focus:ring-2 focus:ring-pink-500/30" value={settings.imageProviders?.openai?.size || '1024x1024'} onChange={(e) => {
                            const newSettings = { ...settings };
                            if (!newSettings.imageProviders) newSettings.imageProviders = {};
                            if (!newSettings.imageProviders.openai) newSettings.imageProviders.openai = {};
                            newSettings.imageProviders.openai.size = e.target.value;
                            setSettings(newSettings);
                          }}>
                            <option value="1024x1024">1024x1024 (Square)</option>
                            <option value="1024x1792">1024x1792 (Portrait)</option>
                            <option value="1792x1024">1792x1024 (Landscape)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => saveSettings()} disabled={saving} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-500 transition font-medium flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed">
                      {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </motion.div>
                )}

                {activeTab === 'whatsapp' && (
                  <motion.div key="whatsapp" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="p-6 space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-200">Manage Accounts</h3>
                      {whatsappInstances.map(inst => {
                        const ready = readyMap[inst.id];
                        const qrUrl = qrUrlMap[inst.id];
                        const connState = connectionStateMap[inst.id] || 'Disconnected';

                        return (
                          <div key={inst.id} className="p-4 rounded-xl border border-gray-700/50 bg-wa-gray/30 space-y-4">
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-100">{inst.name}</span>
                                <span className={`text-xs font-medium uppercase tracking-tighter ${ready ? 'text-green-500' : 'text-wa-grayLighter'}`}>{connState}</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleLogout(inst.id)} className="p-2 text-wa-grayLighter hover:text-orange-400 transition-colors" title="Logout Session"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
                                <button onClick={() => handleClearSession(inst.id)} className="p-2 text-wa-grayLighter hover:text-red-500 transition-colors" title="Force Clear Session (Fix Stuck QR)"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                {inst.id !== 'default' && (
                                  <button onClick={() => handleRemoveAccount(inst.id)} className="p-2 text-wa-grayLighter hover:text-red-600 transition-colors" title="Delete Account"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                                )}
                              </div>
                            </div>
                            {!ready && qrUrl && (
                              <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-700">
                                <img src={qrUrl} alt="QR" className="w-32 h-32" />
                                <span className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest">Scan to Link {inst.name}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New account name..."
                          className="flex-1 border border-gray-700 rounded-lg px-3 py-2 bg-wa-gray text-white text-sm outline-none"
                          value={newAccName}
                          onChange={(e) => setNewAccName(e.target.value)}
                        />
                        <button onClick={handleAddAccount} className="px-4 py-2 bg-wa-teal text-white rounded-lg text-sm font-bold hover:bg-wa-tealHover transition-colors">Add</button>
                      </div>
                    </div>
                    <div className="space-y-3 border border-gray-700/50 rounded-xl p-5">
                      <h3 className="font-bold text-gray-200 mb-3">Automation Rules</h3>
                      <label className="flex items-center justify-between p-3 border border-gray-700/30 rounded-lg hover:bg-wa-grayHover transition-colors cursor-pointer">
                        <div><span className="block font-medium text-sm text-gray-200">AI Auto-Reply</span><span className="block text-xs text-wa-grayLighter mt-0.5">Let AI automatically answer Direct Messages</span></div>
                        <input type="checkbox" className="w-5 h-5 rounded text-indigo-600 bg-wa-gray border-gray-600 focus:ring-indigo-500/30 cursor-pointer" checked={settings.integrations?.whatsapp?.autoReplyEnabled !== false} onChange={(e) => handleWhatsappIntegrationChange('autoReplyEnabled', e.target.checked)} />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-red-900/20 bg-red-900/10 rounded-lg hover:bg-red-900/20 transition-colors cursor-pointer">
                        <div><span className="block font-medium text-sm text-red-400">Reply to ALL Chats (Override)</span><span className="block text-[11px] text-red-500/70 mt-0.5">WARNING: AI will reply to EVERY message globally, ignoring Whitelist</span></div>
                        <input type="checkbox" className="w-5 h-5 rounded text-red-600 bg-wa-gray border-red-800 focus:ring-red-500/30 cursor-pointer" checked={settings.integrations?.whatsapp?.replyToAllChats === true} onChange={(e) => handleWhatsappIntegrationChange('replyToAllChats', e.target.checked)} />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-gray-700/30 rounded-lg hover:bg-wa-grayHover transition-colors cursor-pointer">
                        <div><span className="block font-medium text-sm text-gray-200">Chat Sync</span><span className="block text-xs text-wa-grayLighter mt-0.5">Sync history to Infinity Chat UI</span></div>
                        <input type="checkbox" className="w-5 h-5 rounded text-indigo-600 bg-wa-gray border-gray-600 focus:ring-indigo-500/30 cursor-pointer" checked={settings.integrations?.whatsapp?.syncEnabled !== false} onChange={(e) => handleWhatsappIntegrationChange('syncEnabled', e.target.checked)} />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-gray-700/30 rounded-lg hover:bg-wa-grayHover transition-colors cursor-pointer">
                        <div><span className="block font-medium text-sm text-gray-200">Split Messages</span><span className="block text-xs text-wa-grayLighter mt-0.5">Send long AI replies as multiple short texts</span></div>
                        <input type="checkbox" className="w-5 h-5 rounded text-indigo-600 bg-wa-gray border-gray-600 focus:ring-indigo-500/30 cursor-pointer" checked={settings.integrations?.whatsapp?.splitMessages !== false} onChange={(e) => handleWhatsappIntegrationChange('splitMessages', e.target.checked)} />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-yellow-900/20 bg-yellow-900/10 rounded-lg hover:bg-yellow-900/20 transition-colors cursor-pointer">
                        <div><span className="block font-medium text-sm text-yellow-400">Groups: Reply Only on Mention</span><span className="block text-[11px] text-yellow-500/70 mt-0.5">In group chats, AI will only reply when @mentioned</span></div>
                        <input type="checkbox" className="w-5 h-5 rounded text-yellow-600 bg-wa-gray border-yellow-800 focus:ring-yellow-500/30 cursor-pointer" checked={settings.integrations?.whatsapp?.replyOnlyOnMention === true} onChange={(e) => handleWhatsappIntegrationChange('replyOnlyOnMention', e.target.checked)} />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-emerald-900/20 bg-emerald-900/10 rounded-lg hover:bg-emerald-900/20 transition-colors cursor-pointer">
                        <div><span className="block font-medium text-sm text-emerald-400">Allow AI Photo Gallery</span><span className="block text-[11px] text-emerald-500/70 mt-0.5">AI can pick and send photos from public/gallery folder</span></div>
                        <input type="checkbox" className="w-5 h-5 rounded text-emerald-600 bg-wa-gray border-emerald-800 focus:ring-emerald-500/30 cursor-pointer" checked={settings.integrations?.whatsapp?.allowAiGallery === true} onChange={(e) => handleWhatsappIntegrationChange('allowAiGallery', e.target.checked)} />
                      </label>

                      <div className="p-3 border border-gray-700/30 rounded-lg">
                        <div className="flex justify-between mb-2"><span className="block font-medium text-sm text-gray-200">Human Typing Delay</span><span className="text-sm font-bold text-indigo-400">{settings.integrations?.whatsapp?.typingDelay || 0}s</span></div>
                        <input type="range" min="0" max="10" step="1" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" value={settings.integrations?.whatsapp?.typingDelay || 0} onChange={(e) => handleWhatsappIntegrationChange('typingDelay', Number(e.target.value))} />
                        <span className="block text-xs text-wa-grayLighter mt-1">Delay before sending each message to simulate typing</span>
                      </div>
                      <div className="p-3 border border-gray-700/30 rounded-lg">
                        <div className="flex justify-between mb-2"><span className="block font-medium text-sm text-gray-200">GIF API Keys (Tenor / Giphy)</span></div>
                        <input type="password" placeholder="Tenor API Key..." className="w-full border border-gray-700 rounded-lg px-3 py-2.5 mb-2 outline-none bg-wa-gray text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-sm placeholder-wa-grayLighter" value={settings.integrations?.whatsapp?.tenorApiKey || ''} onChange={(e) => handleWhatsappIntegrationChange('tenorApiKey', e.target.value)} />
                        <input type="password" placeholder="...Or Giphy API Key" className="w-full border border-gray-700 rounded-lg px-3 py-2.5 outline-none bg-wa-gray text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-sm placeholder-wa-grayLighter" value={settings.integrations?.whatsapp?.giphyApiKey || ''} onChange={(e) => handleWhatsappIntegrationChange('giphyApiKey', e.target.value)} />
                        <span className="block text-[11px] text-wa-grayLighter mt-1.5">Provide an API key for the AI to auto-send GIFs.</span>
                      </div>
                      <button onClick={() => saveSettings()} disabled={saving} className="bg-wa-gray text-gray-200 px-4 py-2.5 rounded-lg hover:bg-wa-grayHover transition font-medium w-full text-sm mt-2 disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-200 rounded-full animate-spin" /> : null}
                        {saving ? 'Saving...' : 'Save Rules'}
                      </button>
                    </div>
                    <div className="border border-red-900/30 rounded-xl p-5 bg-red-900/5">
                      <h3 className="font-bold text-red-400 mb-2">Danger Zone</h3>
                      <p className="text-xs text-red-500/60 mb-4">Destructive actions that cannot be undone.</p>
                      <button onClick={() => handleClearSession(activeClientId)} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/40 border border-red-900/30 transition-colors text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Force Clear Active Session
                      </button>
                      <span className="block text-[11px] text-red-500/50 mt-2">Deletes WhatsApp auth data, cache, and restarts the server. You will need to scan QR again.</span>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'instagram' && (
                  <motion.div key="instagram" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="p-6 space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-200">Instagram Accounts</h3>
                      <p className="text-xs text-wa-grayLighter">Manage your Instagram accounts for automation. Account data is stored locally.</p>

                      {instagramInstances.map(inst => (
                        <div key={inst.id} className="p-4 rounded-xl border border-gray-700/50 bg-wa-gray/30 flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-100">{inst.name}</span>
                            <span className="text-[10px] text-wa-grayLighter uppercase tracking-wider font-bold">Connected</span>
                          </div>
                          <button onClick={() => handleRemoveIgAccount(inst.id)} className="p-2 text-wa-grayLighter hover:text-red-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      ))}

                      <div className="space-y-2 p-4 border border-gray-700/50 rounded-xl bg-gray-800/10">
                        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">Link New Account</h4>
                        <input type="text" placeholder="Username" className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-wa-gray text-white text-sm outline-none" value={newIgUsername} onChange={(e) => setNewIgUsername(e.target.value)} />
                        <input type="password" placeholder="Password" className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-wa-gray text-white text-sm outline-none" value={newIgPassword} onChange={(e) => setNewIgPassword(e.target.value)} />
                        <button onClick={handleAddIgAccount} className="w-full py-2 bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white rounded-lg text-sm font-bold hover:brightness-110 transition-all mt-2">Connect Instagram</button>
                      </div>
                    </div>

                    <div className="space-y-3 border border-gray-700/50 rounded-xl p-5">
                      <h3 className="font-bold text-gray-200 mb-3">Instagram Automation</h3>
                      <label className="flex items-center justify-between p-3 border border-gray-700/30 rounded-lg hover:bg-wa-grayHover transition-colors cursor-pointer">
                        <div><span className="block font-medium text-sm text-gray-200">AI DM Auto-Reply</span><span className="block text-xs text-wa-grayLighter mt-0.5">Let AI automatically answer Instagram Direct Messages</span></div>
                        <input type="checkbox" className="w-5 h-5 rounded text-[#bc1888] bg-wa-gray border-gray-600 focus:ring-[#bc1888]/30 cursor-pointer" checked={settings.integrations?.instagram?.autoReplyEnabled !== false} onChange={(e) => handleIgIntegrationChange('autoReplyEnabled', e.target.checked)} />
                      </label>
                      <button onClick={() => saveSettings()} disabled={saving} className="bg-wa-gray text-gray-200 px-4 py-2.5 rounded-lg hover:bg-wa-grayHover transition font-medium w-full text-sm mt-2 disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-200 rounded-full animate-spin" /> : null}
                        {saving ? 'Saving...' : 'Save Instagram Rules'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'scheduler' && (
                  <motion.div key="scheduler" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="p-6 space-y-6">
                    <div className="bg-indigo-900/10 border border-indigo-900/20 rounded-xl p-5">
                      <h3 className="font-bold text-indigo-400 mb-3 text-sm">Create New Schedule</h3>
                      <div className="space-y-3">
                        <input id="sched-to" type="text" placeholder="Recipient ID (e.g. 1234567890@c.us)" className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-wa-gray text-white text-sm outline-none" />
                        <textarea id="sched-msg" placeholder="Message content..." className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-wa-gray text-white text-sm outline-none h-20 resize-none" />
                        <div className="flex gap-2">
                          <select id="sched-freq" className="flex-1 border border-gray-700 rounded-lg px-3 py-2 bg-wa-gray text-white text-sm outline-none">
                            <option value="once">Once</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                          </select>
                          <input id="sched-time" type="datetime-local" className="flex-1 border border-gray-700 rounded-lg px-3 py-2 bg-wa-gray text-white text-sm outline-none" />
                        </div>
                        <button onClick={async () => {
                          const to = document.getElementById('sched-to').value;
                          const message = document.getElementById('sched-msg').value;
                          const frequency = document.getElementById('sched-freq').value;
                          const sendAt = document.getElementById('sched-time').value;
                          if (!to || !message || !sendAt) return alert('Fill all fields');
                          const res = await fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, message, frequency, sendAt }) });
                          if ((await res.json()).ok) { loadSchedules(); setToast('Scheduled!'); }
                        }} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-500 transition-colors text-sm">Schedule Message</button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-200 mb-3 ml-1 text-sm">Active Schedules ({schedules.length})</h3>
                      <div className="space-y-2">
                        {schedules.map(s => (
                          <div key={s.id} className="p-3 bg-wa-gray/30 rounded-lg border border-gray-700/20 flex justify-between items-center group">
                            <div className="overflow-hidden">
                              <div className="text-[13px] font-bold text-gray-200 truncate">{s.to}</div>
                              <div className="text-[11px] text-wa-grayLighter line-clamp-1">{s.message}</div>
                              <div className="text-[10px] text-indigo-400 mt-0.5">{s.frequency.toUpperCase()} - {new Date(s.sendAt).toLocaleString()}</div>
                            </div>
                            <button onClick={async () => { await fetch(`/api/schedules/${s.id}`, { method: 'DELETE' }); loadSchedules(); }} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'webhooks' && (
                  <motion.div key="webhooks" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="p-6 space-y-6">
                    <div className="bg-emerald-900/10 border border-emerald-900/20 rounded-xl p-5">
                      <h3 className="font-bold text-emerald-400 mb-3 text-sm">Configure Webhook</h3>
                      <div className="space-y-3">
                        <input id="wh-name" type="text" placeholder="Friendly Name" className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-wa-gray text-white text-sm outline-none" />
                        <input id="wh-url" type="text" placeholder="Endpoint URL (https://...)" className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-wa-gray text-white text-sm outline-none" />
                        <input id="wh-kw" type="text" placeholder="Keywords (comma separated, optional)" className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-wa-gray text-white text-sm outline-none" />
                        <button onClick={async () => {
                          const name = document.getElementById('wh-name').value;
                          const url = document.getElementById('wh-url').value;
                          const keywords = document.getElementById('wh-kw').value.split(',').map(k => k.trim()).filter(k => k);
                          if (!name || !url) return alert('Name and URL required');
                          const res = await fetch('/api/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, url, event: 'message', keywords }) });
                          if ((await res.json()).ok) { loadWebhooks(); setToast('Webhook added!'); }
                        }} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-500 transition-colors text-sm">Add Webhook</button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-200 mb-3 ml-1 text-sm">Active Integrations ({webhooks.length})</h3>
                      <div className="space-y-2">
                        {webhooks.map(wh => (
                          <div key={wh.id} className="p-3 bg-wa-gray/30 rounded-lg border border-gray-700/20 flex justify-between items-center group">
                            <div className="overflow-hidden">
                              <div className="text-[13px] font-bold text-gray-200 truncate">{wh.name}</div>
                              <div className="text-[11px] text-wa-grayLighter truncate">{wh.url}</div>
                              {wh.keywords?.length > 0 && <div className="flex gap-1 mt-1">{wh.keywords.map(k => <span key={k} className="text-[9px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900/30">{k}</span>)}</div>}
                            </div>
                            <button onClick={async () => { await fetch(`/api/webhooks/${wh.id}`, { method: 'DELETE' }); loadWebhooks(); }} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'analytics' && (
                  <motion.div key="analytics" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-wa-gray/50 p-4 rounded-xl border border-gray-700/30 text-center">
                        <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Total Mentions</span>
                        <div className="text-2xl font-bold text-gray-100">{analytics?.totalReceived || 0}</div>
                      </div>
                      <div className="bg-wa-gray/50 p-4 rounded-xl border border-gray-700/30 text-center">
                        <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">AI Replies</span>
                        <div className="text-2xl font-bold text-indigo-400">{analytics?.aiReplies || 0}</div>
                      </div>
                      <div className="bg-wa-gray/50 p-4 rounded-xl border border-gray-700/30 text-center">
                        <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Token Estimate</span>
                        <div className="text-2xl font-bold text-amber-400">~{((analytics?.tokenEstimate || 0) / 1000).toFixed(1)}k</div>
                      </div>
                      <div className="bg-wa-gray/50 p-4 rounded-xl border border-gray-700/30 text-center">
                        <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Saved Costs</span>
                        <div className="text-2xl font-bold text-emerald-400">${((analytics?.aiReplies || 0) * 0.002).toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-bold text-gray-200 text-sm ml-1">Provider Breakdown</h3>
                      {analytics?.perProvider && Object.keys(analytics.perProvider).length > 0 ? (
                        Object.entries(analytics.perProvider).map(([provider, stats]) => (
                          <div key={provider} className="flex items-center justify-between p-3 bg-wa-gray/30 rounded-lg border border-gray-700/20">
                            <span className="text-[13px] font-medium text-gray-300 capitalize">{provider}</span>
                            <span className="text-[13px] font-bold text-indigo-400">{stats.replies} replies</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 border border-dashed border-gray-700/50 rounded-xl"><p className="text-xs text-wa-grayLighter">No activity recorded yet.</p></div>
                      )}
                    </div>
                    <button onClick={handleResetAnalytics} className="w-full text-center py-2 text-[11px] font-medium text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest">Clear Usage History</button>
                  </motion.div>
                )}

                {activeTab === 'chats' && (
                  <motion.div key="chats" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="p-6 space-y-6">
                    <div className="bg-purple-900/10 p-6 rounded-xl border border-purple-800/20">
                      <div className="flex items-center gap-3 mb-2">
                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <h3 className="font-bold text-gray-200">Train Personality</h3>
                      </div>
                      <p className="text-sm text-wa-grayLighter mb-5">Export a WhatsApp chat from your phone (without media) as a .txt and upload it here to make AI reply like you.</p>
                      <form onSubmit={handleUploadChat} className="space-y-4">
                        <input type="file" accept=".txt" className="block w-full text-sm text-gray-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-wa-gray file:text-purple-400 hover:file:bg-wa-grayHover file:cursor-pointer cursor-pointer file:transition-colors" />
                        <label className="flex items-center space-x-3 text-sm p-3 bg-wa-gray/50 rounded-lg border border-purple-800/20 cursor-pointer">
                          <input type="checkbox" name="asClosest" className="w-4 h-4 rounded text-purple-600 bg-wa-gray border-gray-600 focus:ring-purple-500/30" />
                          <span className="font-medium text-gray-300">Set as <span className="text-purple-400">"Closest Person"</span></span>
                        </label>
                        <button type="submit" disabled={uploading} className="bg-purple-600 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition w-full flex items-center justify-center gap-2">
                          {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                          {uploading ? 'Uploading...' : 'Upload Data'}
                        </button>
                      </form>
                      {uploadStatus.text && <div className={`mt-4 text-sm font-medium ${uploadStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{uploadStatus.text}</div>}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-200 mb-3 ml-1 text-sm">Knowledge Base ({chats.length})</h3>
                      {chats.length > 0 ? (
                        <ul className="space-y-2">
                          {chats.map((f) => (
                            <li key={f.name} className="flex items-center justify-between p-3.5 bg-wa-gray/50 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <svg className="w-[18px] h-[18px] text-wa-grayLighter" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <span className="text-sm font-medium text-gray-300">{f.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {f.isClosest ? (
                                  <span className="bg-purple-900/30 text-purple-400 text-xs px-3 py-1 rounded-full font-semibold border border-purple-800/30">Primary</span>
                                ) : (
                                  <button onClick={() => handleSetPrimary(f.name)} className="text-xs px-2.5 py-1 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 transition" title="Set as Primary">Set Primary</button>
                                )}
                                <button onClick={() => handleDeleteFile(f.name)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition" title="Delete">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center p-8 border border-dashed border-gray-700/50 rounded-xl"><p className="text-sm text-wa-grayLighter">No chat logs uploaded yet. AI will respond with a default persona.</p></div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>{toast && <Toast message={toast} onClose={() => setToast(null)} />}</AnimatePresence>
    </>
  );
}
