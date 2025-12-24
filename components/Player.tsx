import React from 'react';
import { Icons } from './Icons.js';
import { RoomState, api } from '../api.js';

interface PlayerProps {
  state: RoomState;
  userId: string;
  onVoteSkip: () => void;
  onOpenSearch: () => void;
  progress: number;
}

export const Player: React.FC<PlayerProps> = ({ state, userId, onVoteSkip, onOpenSearch, progress }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        
        {/* Album Art & Vinyl */}
        <div className="relative w-72 h-72 md:w-96 md:h-96 mb-12">
           {state.currentSong ? (
             <>
                {/* Glow behind */}
                <div className="absolute inset-4 bg-purple-500 blur-2xl opacity-40 animate-pulse"></div>
                {/* Vinyl Record Effect - Always spinning if song exists (removed manual pause) */}
                <div className="w-full h-full rounded-full bg-black border-4 border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden vinyl-spin">
                    <div className="absolute inset-0 rounded-full border border-white/5" style={{background: 'repeating-radial-gradient(#111 0, #111 2px, #222 3px, #222 4px)'}}></div>
                    <img src={api.getCoverUrl(state.currentSong.id)} alt="Cover" className="w-1/2 h-1/2 rounded-full object-cover z-10 border-4 border-black" />
                </div>
             </>
           ) : (
             <div className="w-full h-full rounded-full border-4 border-slate-800 bg-slate-900 flex items-center justify-center text-slate-700">
               <Icons.Music />
             </div>
           )}
        </div>

        {/* Song Info */}
        <div className="text-center space-y-2 mb-8 max-w-lg">
           <h2 className="text-3xl md:text-4xl font-bold text-white truncate drop-shadow-lg">
             {state.currentSong?.name || 'Nothing Playing'}
           </h2>
           <p className="text-xl text-slate-400 font-light truncate">
             {state.currentSong?.artist || 'Add a song to start the party'}
           </p>
           {state.currentSong && (
             <p className="text-xs uppercase tracking-widest text-slate-500 pt-2">
               Requested by {state.currentSong.addedBy === userId ? 'You' : 'Anonymous'}
             </p>
           )}
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md h-1.5 bg-slate-700/50 rounded-full overflow-hidden mb-8">
           <div 
             className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all ease-linear"
             style={{ width: `${progress}%`, transitionDuration: '1000ms' }}
           ></div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8">
           <button 
             onClick={onOpenSearch}
             className="p-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition hover:scale-110 active:scale-95 group relative"
           >
             <Icons.Search />
             <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Add Song</span>
           </button>

           {/* Play/Pause Removed: Replaced with status indicator or just removed */}
           <div className="p-6 rounded-full bg-white/5 border border-white/10 text-slate-400 cursor-default">
              <div className="flex flex-col items-center text-[10px] font-mono tracking-widest uppercase">
                  <span>Sync</span>
                  <span>Active</span>
              </div>
           </div>

           <button 
             onClick={onVoteSkip}
             disabled={!state.currentSong}
             className={`p-4 rounded-full border transition flex items-center gap-2 relative overflow-hidden ${state.currentSong ? 'bg-white/5 hover:bg-red-500/20 border-white/10 hover:border-red-500/50 text-white' : 'opacity-50 cursor-not-allowed border-transparent'}`}
           >
             <div className="relative z-10 flex items-center gap-2">
               <Icons.Skip />
               {state.votes > 0 && (
                 <span className="text-sm font-bold">{state.votes}/{state.requiredVotes}</span>
               )}
             </div>
             {/* Vote Progress Background */}
             <div 
               className="absolute inset-0 bg-red-500/20 transition-all duration-500"
               style={{ width: `${(state.votes / state.requiredVotes) * 100}%` }}
             ></div>
           </button>
        </div>
    </div>
  );
};
