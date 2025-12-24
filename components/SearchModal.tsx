import React, { useState, useEffect } from 'react';
import { Icons } from './Icons.js';
import { api, Song } from '../api.js';

export const SearchModal = ({ isOpen, onClose, onAdd, userId }: { isOpen: boolean, onClose: () => void, onAdd: (id: number, uid: string) => void, userId: string }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.search(query);
      setResults(res);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Add Music</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">✕</button>
        </div>
        <div className="p-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              className="w-full bg-slate-800/50 border border-white/10 rounded-full py-3 px-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="Search artists, songs..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Icons.Search />
            </div>
            <button
               type="submit"
               className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 py-1.5 text-sm font-medium transition"
            >
              Search
            </button>
          </form>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading && <div className="text-center py-8 text-slate-400 animate-pulse">Searching Netease Library...</div>}
          {!loading && results.length === 0 && query && <div className="text-center py-8 text-slate-500">No results found</div>}
          
          {results.map(song => (
            <div key={song.id} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition group">
              <img src={song.cover} alt={song.album} className="w-12 h-12 rounded object-cover bg-slate-800" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{song.name}</h3>
                <p className="text-sm text-slate-400 truncate">{song.artist}</p>
              </div>
              <button 
                onClick={() => { onAdd(song.id, userId); onClose(); }}
                className="opacity-0 group-hover:opacity-100 bg-white/10 hover:bg-purple-500 text-white p-2 rounded-full transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};