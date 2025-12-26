import React, { useState } from 'react';
import { Icons } from './Icons';
import { Song, api, UserPresence } from '../lib/api';

interface QueueProps {
    queue: Song[];
    activeUsers: UserPresence[];
    onOpenSearch: () => void;
}

export const Queue: React.FC<QueueProps> = ({ queue = [], activeUsers = [], onOpenSearch }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'users'>('queue');

  return (
    <div className="flex flex-col h-full w-full">
        {/* Tabs */}
        <div className="flex items-center border-b border-white/10 p-2">
            <button 
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'queue' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                Queue ({queue.length})
            </button>
            <button 
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'users' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                Users ({activeUsers.length})
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {activeTab === 'queue' ? (
                <div className="space-y-4">
                    {/* Add Button */}
                    <button 
                        onClick={onOpenSearch}
                        className="w-full py-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition text-sm text-slate-400 flex items-center justify-center gap-2 group"
                    >
                        <div className="p-1 rounded bg-white/10 group-hover:bg-purple-500 group-hover:text-white transition">
                            <Icons.Plus />
                        </div>
                        <span>Add to Queue</span>
                    </button>

                    {queue.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                           <p>The queue is empty.</p>
                           <p className="text-xs mt-1">Be the DJ!</p>
                        </div>
                    ) : (
                        queue.map((song, i) => (
                            <div key={`${song.id}-${i}`} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition">
                                <div className="w-6 text-center text-xs font-mono text-slate-500 group-hover:hidden">{i + 1}</div>
                                <div className="w-6 hidden group-hover:flex items-center justify-center text-white">
                                    <Icons.PlayFilled /> 
                                </div>
                                
                                <img src={api.getCoverUrl(song.id)} alt="Art" className="w-10 h-10 rounded object-cover bg-slate-800 shadow-sm" />
                                
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-white truncate">{song.name}</div>
                                    <div className="text-xs text-slate-400 truncate">{song.artist}</div>
                                </div>

                                <div 
                                    className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 border border-transparent group-hover:border-white/10"
                                    title={`Added by ${activeUsers.find(u => u.userId === song.addedBy)?.nickname || 'Anonymous'}`}
                                >
                                     <Icons.User />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {activeUsers.length === 0 ? (
                         <div className="text-center py-12 text-slate-500">No one else is here.</div>
                    ) : (
                        activeUsers.map((user) => (
                            <div key={user.userId} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                {user.emailHash ? (
                                    <img 
                                        src={`https://gravatar.com/avatar/${user.emailHash}?d=identicon&s=80`} 
                                        alt={user.nickname} 
                                        className="w-10 h-10 rounded-full border border-white/10 shadow-sm object-cover bg-slate-800"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-sm">
                                        {user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-white truncate">
                                        {user.nickname || 'Unknown User'}
                                    </div>
                                    <div className="text-xs text-green-400 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                        Online
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
