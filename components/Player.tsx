import React from 'react';
import { Icons } from './Icons';
import { RoomState, api } from '../lib/api';

interface PlayerProps {
  state: RoomState;
  userId: string;
  onVoteSkip: () => void;
  onOpenSearch: () => void;
  progress: number;
}

export const Player: React.FC<PlayerProps> = ({ state, userId, onVoteSkip, onOpenSearch, progress }) => {
  return (
    <div className="w-full max-w-2xl flex flex-col items-center justify-center relative z-10">
        
        {/* Album Art Card */}
        <div className="relative group w-64 h-64 md:w-96 md:h-96 mb-8 transition-transform duration-500 hover:scale-[1.02]">
           {state.currentSong ? (
             <>
                {/* Glow/Reflection */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                
                <img 
                    src={api.getCoverUrl(state.currentSong.id)} 
                    alt="Cover" 
                    className="w-full h-full rounded-2xl shadow-2xl object-cover relative z-10 border border-white/10" 
                />
             </>
           ) : (
             <div className="w-full h-full rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center justify-center text-slate-500 relative z-10">
               <Icons.Music />
               <p className="mt-4 text-sm font-medium">Nothing Playing</p>
             </div>
           )}
        </div>

        {/* Song Info */}
        <div className="text-center space-y-2 mb-10 w-full px-4">
           <div className="relative overflow-hidden">
                <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-sm tracking-tight leading-tight">
                    {state.currentSong?.name || 'Silence'}
                </h2>
           </div>
           <p className="text-xl text-slate-300/80 font-medium">
             {state.currentSong?.artist || 'Add a song to start'}
           </p>
           {state.currentSong && (
             <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs font-medium text-slate-400 mt-2">
                 <span>Requested by</span>
                 <span className="text-purple-300">
                     {state.currentSong.addedBy === userId 
                       ? 'You' 
                       : (state.activeUsers?.find(u => u.userId === state.currentSong?.addedBy)?.nickname || 'Anonymous')
                     }
                 </span>
             </div>
           )}
        </div>

        {/* Controls & Progress */}
        <div className="w-full max-w-lg space-y-6">
            
            {/* Progress Bar */}
            <div className="relative w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                <div 
                    className="absolute inset-y-0 left-0 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all ease-linear"
                    style={{ width: `${progress}%`, transitionDuration: '1000ms' }}
                ></div>
            </div>

            <div className="flex items-center justify-center gap-12">
                {/* Add Song Button */}
                <button 
                    onClick={onOpenSearch}
                    className="p-5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition border border-transparent hover:border-white/5 shadow-xl"
                    title="Add Song"
                >
                    <Icons.Plus />
                </button>

                {/* Vote Skip Button */}
                <button 
                    onClick={onVoteSkip}
                    disabled={!state.currentSong}
                    className={`relative p-5 rounded-full transition group border border-transparent ${
                        state.currentSong 
                            ? 'text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/5 shadow-xl' 
                            : 'text-slate-600 cursor-not-allowed'
                    }`}
                    title="Vote Skip"
                >
                    <Icons.Skip />
                    
                    {/* Vote Badge */}
                    {state.votes > 0 && (
                         <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg border border-slate-900">
                             {state.votes}/{state.requiredVotes}
                         </div>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
};
