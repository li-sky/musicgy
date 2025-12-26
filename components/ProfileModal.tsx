import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { sha256Hex } from '../lib/utils';

export const ProfileModal = ({ isOpen, onClose, userId, onProfileSaved, onRequestLogin }: { isOpen: boolean, onClose: () => void, userId: string, onProfileSaved: (p: { nickname?: string, email?: string, avatarUrl?: string }) => void, onRequestLogin: () => void }) => {
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [others, setOthers] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    
    useEffect(() => {
        if (!isOpen) return;
        // load from localStorage
        try {
            const raw = localStorage.getItem('musicgy_profile');
            if (raw) {
                const v = JSON.parse(raw);
                setNickname(v.nickname || '');
                setEmail(v.email || '');
                if (v.email) {
                    sha256Hex(v.email).then(h => setAvatarUrl(`https://gravatar.com/avatar/${h}?d=identicon&s=80`));
                }
            }
        } catch (e) {}
    }, [isOpen]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const p: any = {};
            if (nickname) p.nickname = nickname;
            if (email) p.email = email;
            // persist locally
            localStorage.setItem('musicgy_profile', JSON.stringify({ nickname, email }));

            // compute avatar and show
            if (email) {
                const h = await sha256Hex(email);
                setAvatarUrl(`https://gravatar.com/avatar/${h}?d=identicon&s=80`);
            } else {
                setAvatarUrl(null);
            }

            // send to server
            try {
                const res = await api.setProfile(userId, nickname || undefined, email || undefined);
                if (res && Array.isArray(res.others)) setOthers(res.others);
            } catch (e) {
                console.warn('Failed to send profile to server', e);
            }

            onProfileSaved({ nickname, email, avatarUrl: avatarUrl || undefined });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="glass w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center p-8 space-y-6">
                <h2 className="text-xl font-bold text-white">Profile Settings</h2>

                <div className="w-24 h-24 bg-white rounded-full overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-slate-600">No Avatar</div>
                    )}
                </div>

                <div className="w-full">
                    <label className="text-xs text-slate-400">Display Name</label>
                    <input value={nickname} onChange={e => setNickname(e.target.value)} className="w-full mt-1 rounded-md bg-black/20 p-2" />
                </div>

                <div className="w-full">
                    <label className="text-xs text-slate-400">Email (used for Gravatar)</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 rounded-md bg-black/20 p-2" />
                </div>

                <div className="w-full text-sm text-slate-400">
                    <button onClick={onRequestLogin} className="w-full mb-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-md transition text-xs uppercase tracking-wider font-semibold">
                        Connect Netease Account
                    </button>

                    {others.length > 0 && (
                        <div className="mt-2">
                            <div className="text-xs text-white mb-2">Other users' avatars:</div>
                            <div className="flex gap-2">
                                {others.slice(0,8).map(h => (
                                    <img key={h} src={`https://gravatar.com/avatar/${h}?d=identicon&s=40`} alt="other" className="w-8 h-8 rounded-full" />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex w-full gap-4">
                    <button onClick={onClose} className="flex-1 text-sm text-slate-300 bg-black/10 py-2 rounded">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 text-sm bg-white text-slate-900 py-2 rounded">Save</button>
                </div>
            </div>
        </div>
    );
};
