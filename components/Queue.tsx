import React from 'react';
import { Icons } from './Icons';
import { Song, api } from '../lib/api';

export const Queue = ({ queue, onOpenSearch }: { queue: Song[], onOpenSearch: () => void }) => (
  <div className="w-full md:w-96 bg-slate-900/50 backdrop-blur-xl border-l border-white/5 flex flex-col z-20 h-64 md:h-auto">
    <div className="p-6 border-b border-white/5">
       <h3 className="text-lg font-semibold text-white">Up Next</h3>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
       {queue.length === 0 ? (
         <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-4">
           <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
           </div>
           <p>Queue is empty.<br/>Be the DJ!</p>
           <button onClick={onOpenSearch} className="text-purple-400 hover:text-purple-300 text-sm font-medium">Add a track</button>
         </div>
       ) : (
         queue.map((song, i) => (
           <div key={`${song.id}-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group border border-transparent hover:border-white/5">
              <div className="text-slate-500 font-mono text-xs w-4">{i + 1}</div>
              <img src={api.getCoverUrl(song.id)} alt="Art" className="w-10 h-10 rounded object-cover bg-slate-800" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-white truncate">{song.name}</div>
                <div className="text-xs text-slate-400 truncate">{song.artist}</div>
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-1" title={`Added by ${song.addedBy}`}>
                <Icons.User />
              </div>
           </div>
         ))
       )}
    </div>
  </div>
);
