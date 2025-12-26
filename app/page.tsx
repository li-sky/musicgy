'use client'

import React, { useState, useEffect, useRef } from 'react';
import { api, RoomState } from '../lib/api';
import { generateUUID, sha256Hex } from '../lib/utils';
import { Player } from '../components/Player';
import { Queue } from '../components/Queue';
import { SearchModal } from '../components/SearchModal';
import { ProfileModal } from '../components/ProfileModal';
import { LoginModal } from '../components/LoginModal';
import { Icons } from '../components/Icons';

export default function Home() {
  const [userId] = useState(() => {
    try {
      let id = localStorage.getItem('musicgy_userId');
      if (!id) {
        id = generateUUID();
        localStorage.setItem('musicgy_userId', id);
      }
      return id;
    } catch (e) {
      return generateUUID();
    }
  });
  const [connectionId] = useState(() => generateUUID());

  const [userName] = useState(() => `User-${Math.random().toString(36).substr(2, 4)}`);
  const [state, setState] = useState<RoomState | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [profile, setProfile] = useState<{ nickname?: string; email?: string; avatarUrl?: string } | null>(null);
  const [isAudioSyncing, setIsAudioSyncing] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Effects (State, Sync, Heartbeat, Unload) ---
  // (Kept identical logic to ensure functionality remains)

  useEffect(() => {
    const fetchState = async () => {
      try {
        const s = await api.getState(hasStarted ? userId : undefined);
        setState(s);
        if (s.serverTime) setClockOffset(s.serverTime - Date.now());

        try {
          if (hasStarted && Array.isArray((s as any).activeUsers) && !(s as any).activeUsers.some((u: any) => u.userId === userId)) {
            api.joinRoom(userId, profile?.nickname || userName, connectionId).catch(() => {});
          }
        } catch (e) {}
      } catch (e) {
        console.error("Connection lost", e);
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [hasStarted, userId, profile?.nickname, userName, connectionId]);

  // Client-side Pre-fetching (First 1MB only)
  useEffect(() => {
    if (!state?.queue || state.queue.length === 0 || !hasStarted) return;
    
    const nextSongId = state.queue[0].id;
    const cacheKey = `prefetch_done_${nextSongId}`;
    
    if (sessionStorage.getItem(cacheKey)) return;

    const performPrefetch = async () => {
       console.log(`[Client Preload] Warming up cache for: ${nextSongId} (First 1MB)`);
       try {
          const url = api.getStreamUrl(nextSongId);
          const res = await fetch(url, {
             headers: { 'Range': 'bytes=0-1048575' }
          });
          
          if (res.ok && res.body) {
             const reader = res.body.getReader();
             while (true) {
                const { done } = await reader.read();
                if (done) break;
             }
             sessionStorage.setItem(cacheKey, 'true');
             console.log(`[Client Preload] Finished warming up ${nextSongId}`);
          }
       } catch (e) {
          console.warn(`[Client Preload] Failed to prefetch ${nextSongId}`, e);
       }
    };

    performPrefetch();
  }, [state?.queue?.[0]?.id, hasStarted]);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem('musicgy_profile');
        if (raw) {
          const v = JSON.parse(raw);
          let avatar: string | undefined = undefined;
          if (v.email) {
            const h = await sha256Hex(v.email);
            avatar = `https://gravatar.com/avatar/${h}?d=identicon&s=80`;
          }
          setProfile({ nickname: v.nickname, email: v.email, avatarUrl: avatar });
          if (v.email || v.nickname) {
            api.setProfile(userId, v.nickname, v.email).catch(() => {});
          }
        }
      } catch (e) {}
    })();
  }, [userId]);

  useEffect(() => {
    return () => {
      if (hasStarted) {
        api.leaveRoom(userId, connectionId).catch(e => console.error("Failed to leave room:", e));
      }
    };
  }, [hasStarted, userId, connectionId]);

  useEffect(() => {
    const onBeforeUnload = () => {
      try {
        if (!hasStarted) return;
        const payload = JSON.stringify({ userId, connectionId });
        navigator.sendBeacon('/api/leave', payload);
      } catch (e) {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [userId, hasStarted, connectionId]);

  useEffect(() => {
    if (!hasStarted) return;
    
    const heartbeatInterval = setInterval(() => {
      api.heartbeat(userId, profile?.nickname || userName).catch(e => console.error("Heartbeat failed:", e));
    }, 2000); // 2 seconds

    return () => clearInterval(heartbeatInterval);
  }, [hasStarted, userId, userName, profile?.nickname]);

  // Audio Sync Logic
  useEffect(() => {
    if (!state?.currentSong || !audioRef.current) return;
    if (isAudioSyncing) return;

    const audio = audioRef.current;
    const songId = state.currentSong.id;
    const currentSrc = audio.getAttribute('data-song-id');
    const isSameSong = String(songId) === currentSrc;

    let expectedTime = 0;
    if (state.serverTime) {
      expectedTime = Math.max(0, (Date.now() + clockOffset - state.startTime) / 1000);
    }

    if (!isSameSong) {
       setIsAudioSyncing(true);
       const streamUrl = api.getStreamUrl(songId);
       audio.src = streamUrl;
       audio.setAttribute('data-song-id', String(songId));
       audio.currentTime = expectedTime;
       audio.playbackRate = 1.0;
       
       audio.addEventListener('canplay', () => {
         audio.play().catch(e => console.warn("Autoplay blocked", e));
         setIsAudioSyncing(false);
       }, { once: true });
       
    } else {
        const currentTime = audio.currentTime;
        const drift = Math.abs(currentTime - expectedTime);
        
        if (drift > 2) {
          setIsAudioSyncing(true);
          audio.currentTime = expectedTime;
          audio.playbackRate = 1.0;
          setTimeout(() => setIsAudioSyncing(false), 100);
        }
        
        if (hasStarted && audio.paused && !audio.ended) audio.play().catch(() => {});
    }
  }, [state?.currentSong?.id, state?.startTime, state?.serverTime, hasStarted, clockOffset]);

  // Media Session API Support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && state?.currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: state.currentSong.name,
        artist: state.currentSong.artist,
        album: state.currentSong.album,
        artwork: [
          { src: api.getCoverUrl(state.currentSong.id), sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
         api.voteSkip(userId);
      });
      
      navigator.mediaSession.setActionHandler('play', () => {
          audioRef.current?.play().catch(() => {});
      });

      navigator.mediaSession.setActionHandler('pause', () => {
          audioRef.current?.pause();
      });
    }
  }, [state?.currentSong, userId]);


  const handleStartListening = async () => {
    setHasStarted(true);
    if (audioRef.current) audioRef.current.play().catch(() => {});
    try {
        await api.joinRoom(userId, profile?.nickname || userName, connectionId);
    } catch (e) {
        console.error("Failed to join room:", e);
    }
  };

  const handleSongEnded = () => {
      // Trigger a state check immediately to speed up auto-play
      api.getState(userId).catch(() => {});
  };

  if (!state) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="text-sm font-medium tracking-wide">CONNECTING...</span>
    </div>
  );

  let currentProgress = 0;
  if (state.currentSong) {
     const now = Date.now() + clockOffset;
     const elapsed = (now - state.startTime) / 1000;
     currentProgress = Math.min(100, (elapsed / state.currentSong.duration) * 100);
  }

  // Dynamic Background
  const bgImage = state.currentSong 
    ? api.getCoverUrl(state.currentSong.id)
    : '';

  return (
    <div className="relative w-full h-screen bg-slate-900 text-white overflow-hidden flex flex-col font-sans selection:bg-purple-500/30">
      
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
          {bgImage && (
              <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-in-out opacity-40 blur-[80px] scale-110"
                style={{ backgroundImage: `url(${bgImage})` }}
              ></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-slate-900/80 to-slate-900/95"></div>
      </div>

      {/* Top Navigation */}
      <header className="relative z-50 h-16 flex items-center justify-between px-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Icons.Music />
             </div>
             <h1 className="font-bold text-lg tracking-tight">Musicgy</h1>
             <div className="hidden md:flex items-center gap-2 ml-6 text-xs font-medium text-slate-400 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                <div className={`w-1.5 h-1.5 rounded-full ${state.neteaseStatus?.data?.profile ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                {state.neteaseStatus?.data?.profile ? 'Source Active' : 'Source Offline'}
             </div>
          </div>

          <div className="flex items-center gap-4">
               <button 
                 onClick={() => setIsSearchOpen(true)}
                 className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/15 px-4 py-1.5 rounded-full text-sm text-slate-300 transition border border-white/5"
               >
                   <Icons.Search />
                   <span>Search songs...</span>
                   <kbd className="hidden lg:inline-block text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-slate-500 ml-2">⌘K</kbd>
               </button>

               <div className="h-6 w-px bg-white/10 mx-2"></div>

               <div 
                 onClick={() => setIsProfileOpen(true)}
                 className="flex items-center gap-3 cursor-pointer group"
               >
                   <div className="text-right hidden sm:block">
                       <div className="text-sm font-medium group-hover:text-purple-300 transition">{profile?.nickname || 'Guest'}</div>
                       <div className="text-[10px] text-slate-400 uppercase tracking-wider">{state.activeUsers?.length || 0} Online</div>
                   </div>
                   {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} className="w-9 h-9 rounded-full border-2 border-transparent group-hover:border-purple-500/50 transition" alt="Profile" />
                   ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-bold border-2 border-transparent group-hover:border-purple-500/50 transition">
                          {(profile?.nickname || 'G').charAt(0).toUpperCase()}
                      </div>
                   )}
               </div>
          </div>
      </header>

      {/* Main Content Grid */}
      <main className="relative z-10 flex-1 flex overflow-hidden">
         {/* Left: Player Focus */}
         <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 min-w-0">
             {!hasStarted ? (
                <div className="text-center space-y-8 max-w-md animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/20 rotate-12">
                        <Icons.Music className="text-white w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Welcome to Musicgy</h2>
                        <p className="text-slate-400">Join the room to listen and chat with others in real-time.</p>
                    </div>
                    <button 
                        onClick={handleStartListening}
                        className="w-full bg-white text-slate-900 hover:bg-purple-50 font-bold py-4 rounded-xl transition shadow-xl active:scale-95"
                    >
                        Enter Room
                    </button>
                </div>
             ) : (
                <Player 
                    state={state} 
                    userId={userId} 
                    onVoteSkip={() => api.voteSkip(userId)}
                    onOpenSearch={() => setIsSearchOpen(true)}
                    progress={currentProgress}
                />
             )}
         </div>

         {/* Right: Sidebar (Queue) */}
         {hasStarted && (
             <aside className="hidden md:flex w-96 flex-col border-l border-white/5 bg-black/20 backdrop-blur-xl">
                 <Queue 
                    queue={state.queue} 
                    activeUsers={state.activeUsers || []}
                    onOpenSearch={() => setIsSearchOpen(true)} 
                 />
             </aside>
         )}
      </main>

      {/* Mobile Queue Sheet */}
      {hasStarted && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-white/10 backdrop-blur-2xl p-4 z-40 safe-pb-4">
              <div className="flex items-center justify-between" onClick={() => setIsQueueOpen(true)}>
                  <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Up Next</span>
                           <span className="text-sm font-medium text-white truncate max-w-[200px]">
                               {state.queue[0]?.name || 'Queue Empty'}
                           </span>
                      </div>
                  </div>
                  <button className="p-2 bg-white/5 rounded-full text-slate-300">
                     <Icons.List />
                  </button>
              </div>
          </div>
      )}

      {/* Mobile Queue Modal */}
      {isQueueOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-300">
               <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
                   <h2 className="text-lg font-bold">Queue & Users</h2>
                   <button onClick={() => setIsQueueOpen(false)} className="p-2 bg-white/10 rounded-full">
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
                   </button>
               </div>
               <div className="flex-1 overflow-hidden">
                   <Queue 
                       queue={state.queue} 
                       activeUsers={state.activeUsers || []}
                       onOpenSearch={() => { setIsQueueOpen(false); setIsSearchOpen(true); }} 
                   />
               </div>
          </div>
      )}

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userId={userId}
        onProfileSaved={(p) => setProfile(p)}
        onRequestLogin={() => { setIsProfileOpen(false); setIsLoginOpen(true); }}
      />
      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onLoginSuccess={() => { setIsLoginOpen(false); alert("Netease Connected!"); }} 
      />
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onAdd={(id) => api.addToQueue(id, userId)} 
        userId={userId}
      />

      <audio 
        ref={audioRef} 
        className="hidden" 
        crossOrigin="anonymous" 
        onEnded={handleSongEnded}
      />
    </div>
  );
}
