'use client'

import React, { useState, useEffect, useRef } from 'react';
import { api, RoomState, UserProfile } from '../lib/api';
import { Player } from '../components/Player';
import { Queue } from '../components/Queue';
import { SearchModal } from '../components/SearchModal';
import { LoginModal } from '../components/LoginModal';
import { Icons } from '../components/Icons';

function generateUUID(): string {
  // Generate a simple UUID-like string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function Home() {
  const [userId] = useState(() => generateUUID());
  const [userName] = useState(() => `User-${Math.random().toString(36).substr(2, 4)}`); // Simple display name
  const [state, setState] = useState<RoomState | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAudioSyncing, setIsAudioSyncing] = useState(false); // Prevent multiple syncs
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const s = await api.getState();
        setState(s);
      } catch (e) {
        console.error("Connection lost", e);
      }
    };
    fetchState();
    // 3-second polling to reduce sync triggers while staying responsive
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.getAuthStatus().then(res => {
        if (res.loggedIn && res.profile) setCurrentUser(res.profile);
    });
  }, []);

  // Handle user leaving when component unmounts
  useEffect(() => {
    return () => {
      if (hasStarted) {
        api.leaveRoom(userId).catch(e => console.error("Failed to leave room:", e));
      }
    };
  }, [hasStarted, userId]);

  // Send heartbeat every 2 seconds when user has started
  useEffect(() => {
    if (!hasStarted) return;
    
    const heartbeatInterval = setInterval(() => {
      api.heartbeat(userId, userName).catch(e => console.error("Heartbeat failed:", e));
    }, 2000); // 2 seconds

    return () => clearInterval(heartbeatInterval);
  }, [hasStarted, userId, userName]);

  // Audio Sync Logic - Optimized for streaming with seeking support
  useEffect(() => {
    if (!state?.currentSong || !audioRef.current) return;

    // Skip if already syncing to prevent interference
    if (isAudioSyncing) return;

    const audio = audioRef.current;
    const songId = state.currentSong.id;
    const currentSrc = audio.getAttribute('data-song-id');
    const isSameSong = String(songId) === currentSrc;

    // Calculate expected playback position
    let expectedTime = 0;
    if (state.serverTime) {
      expectedTime = Math.max(0, (state.serverTime - state.startTime) / 1000);
    }

    if (!isSameSong) {
       // NEW SONG: Load it and set to correct position
       setIsAudioSyncing(true);
       console.log("New song detected:", state.currentSong.name);
       
       const streamUrl = api.getStreamUrl(songId);
       audio.src = streamUrl;
       audio.setAttribute('data-song-id', String(songId));
       
       console.log(`Setting initial position: ${expectedTime.toFixed(2)}s`);
       audio.currentTime = expectedTime;
       
       // Auto-play when ready
       audio.addEventListener('canplay', () => {
         audio.play().catch(e => console.warn("Autoplay blocked", e));
         setIsAudioSyncing(false);
       }, { once: true });
       
    } else {
        // SAME SONG: Smart sync with streaming support
        const currentTime = audio.currentTime;
        const drift = Math.abs(currentTime - expectedTime);
        
        // Different sync strategies based on drift magnitude
        if (drift > 5) {
          // Large drift: Jump immediately
          setIsAudioSyncing(true);
          console.log(`Large drift: ${currentTime.toFixed(2)}s → ${expectedTime.toFixed(2)}s`);
          audio.currentTime = expectedTime;
          setTimeout(() => setIsAudioSyncing(false), 100);
        } else if (drift > 1 && drift <= 5) {
          // Medium drift: Gradually adjust playback rate
          // const rate = currentTime < expectedTime ? 1.1 : 0.9;
          // audio.playbackRate = rate;
          // console.log(`Adjusting playback rate to ${rate}x`);
          
          // // Reset rate after 2 seconds
          // setTimeout(() => {
          //   if (audio.playbackRate !== 1) audio.playbackRate = 1;
          // }, 2000);
        }
        
        // Ensure audio is playing
        if (hasStarted && audio.paused) {
          audio.play().catch(() => {});
        }
    }
  }, [state?.currentSong?.id, state?.startTime, state?.serverTime, hasStarted]);


  const handleStartListening = async () => {
    setHasStarted(true);
    if (audioRef.current) {
        // Try to play silent or resume to unlock audio context
        audioRef.current.play().catch(() => {});
    }
    // Join the room
    try {
        await api.joinRoom(userId, userName);
    } catch (e) {
        console.error("Failed to join room:", e);
    }
  };

  if (!state) return <div className="h-screen flex items-center justify-center text-purple-400 animate-pulse">Connecting to Musicgy...</div>;

  // Calculate Progress for UI
  let currentProgress = 0;
  if (state.currentSong) {
     const elapsed = (Date.now() - state.startTime) / 1000;
     currentProgress = Math.min(100, (elapsed / state.currentSong.duration) * 100);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col md:flex-row overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"></div>
          <div className="absolute top-1/2 -right-32 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M9 18V5l12-2v13"/></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Musicgy</h1>
          </div>
          <div className="flex items-center gap-4 pointer-events-auto">
              {currentUser ? (
                  <div className="flex items-center gap-3 bg-black/20 pl-4 pr-2 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                      <span className="text-sm font-medium">{currentUser.nickname}</span>
                      <img src={currentUser.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" />
                  </div>
              ) : (
                  <button 
                    onClick={() => setIsLoginOpen(true)}
                    className="text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md transition"
                  >
                      Login
                  </button>
              )}
               <div className="hidden md:flex items-center gap-4 text-sm font-medium bg-black/20 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                {state.activeUsers.length} Active
              </div>
          </div>
      </div>

      {!hasStarted && (
          <div className="absolute inset-0 z-[60] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center">
             <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-purple-500/30">
                  <Icons.Play />
                </div>
                <h2 className="text-3xl font-bold text-white">Join the Session</h2>
                <button 
                  onClick={handleStartListening}
                  className="bg-white text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-purple-50 transition transform hover:scale-105"
                >
                  Start Listening
                </button>
             </div>
          </div>
      )}

      <Player 
        state={state} 
        userId={userId} 
        onVoteSkip={() => api.voteSkip(userId)}
        onOpenSearch={() => setIsSearchOpen(true)}
        progress={currentProgress}
      />

      <Queue 
        queue={state.queue} 
        onOpenSearch={() => setIsSearchOpen(true)} 
      />

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onLoginSuccess={setCurrentUser} 
      />
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onAdd={(id) => api.addToQueue(id, userId)} 
        userId={userId}
      />

      <audio ref={audioRef} className="hidden" crossOrigin="anonymous" />
    </div>
  );
}
