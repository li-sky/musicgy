import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { api, Song, Artist, Album, SearchResult } from '../lib/api';

type ViewType = 'search' | 'artist' | 'album';

interface ViewState {
  type: ViewType;
  title: string;
  data: any[];
  context?: any; // Artist or Album details
  query?: string;
  searchType?: number;
  offset: number;
  hasMore: boolean;
}

export const SearchModal = ({ isOpen, onClose, onAdd, userId }: { isOpen: boolean, onClose: () => void, onAdd: (id: number, uid: string) => void | Promise<void>, userId: string }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState(1); // 1: Song, 10: Album, 100: Artist
  const [stack, setStack] = useState<ViewState[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'default' | 'name' | 'time'>('default');
  const [filterText, setFilterText] = useState('');

  const currentView = stack[stack.length - 1];

  useEffect(() => {
    if (isOpen) {
      // Initialize with empty search view if stack is empty
      if (stack.length === 0) {
        setStack([{ type: 'search', title: 'Search', data: [], offset: 0, hasMore: true, query: '', searchType: 1 }]);
      }
    } else {
      // Reset logic could go here, but maybe user wants to keep state? 
      // User requests usually imply fresh state on open, or persistence. 
      // Let's reset for consistency with previous behavior.
      setQuery('');
      setStack([]);
      setFilterText('');
    }
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent, newSearchType?: number) => {
    if (e) e.preventDefault();
    const typeToUse = newSearchType || searchType;
    if (!query.trim()) return;
    
    setLoading(true);
    setSortOrder('default');
    try {
      const results = await api.search(query, typeToUse, 20, 0);
      setStack([{ 
        type: 'search', 
        title: `Search: ${query}`, 
        data: results, 
        query, 
        searchType: typeToUse, 
        offset: 20, 
        hasMore: results.length === 20 
      }]);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    if (!currentView || loading || !currentView.hasMore) return;
    setLoading(true);
    try {
      let newResults: any[] = [];
      const limit = 20;
      
      if (currentView.type === 'search' && currentView.query) {
        newResults = await api.search(currentView.query, currentView.searchType, limit, currentView.offset);
      } else if (currentView.type === 'artist' && currentView.context) {
        newResults = await api.browse('artist', currentView.context.id, limit, currentView.offset);
      }
      // Album view usually returns all songs at once, so no pagination needed usually.
      
      if (newResults.length > 0) {
        const updatedView = {
          ...currentView,
          data: [...currentView.data, ...newResults],
          offset: currentView.offset + limit,
          hasMore: newResults.length === limit
        };
        setStack(prev => [...prev.slice(0, -1), updatedView]);
      } else {
         const updatedView = { ...currentView, hasMore: false };
         setStack(prev => [...prev.slice(0, -1), updatedView]);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleItemClick = async (item: SearchResult) => {
    if (item.type === 'artist') {
      setLoading(true);
      try {
        const albums = await api.browse('artist', item.id);
        setStack(prev => [...prev, {
          type: 'artist',
          title: item.name,
          data: albums,
          context: item,
          offset: 20,
          hasMore: albums.length === 20
        }]);
      } catch (e) { console.error(e); }
      setLoading(false);
    } else if (item.type === 'album') {
       setLoading(true);
      try {
        const result = await api.browse('album', item.id);
        // Result is { album: Album, songs: Song[] }
        setStack(prev => [...prev, {
          type: 'album',
          title: result.album.name,
          data: result.songs,
          context: result.album,
          offset: 0,
          hasMore: false
        }]);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    // Songs are handled by add button
  };

  const goBack = () => {
    if (stack.length > 1) {
      setStack(prev => prev.slice(0, -1));
    }
  };

  const getFilteredAndSortedData = () => {
    if (!currentView) return [];
    let data = [...currentView.data];
    
    // Filter
    if (filterText) {
      const lower = filterText.toLowerCase();
      data = data.filter(item => item.name.toLowerCase().includes(lower));
    }

    // Sort
    if (sortOrder === 'name') {
      data.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'time') {
       // Only for songs or albums with publishTime
       data.sort((a, b) => {
         const timeA = a.publishTime || a.duration || 0;
         const timeB = b.publishTime || b.duration || 0;
         return timeB - timeA; // Descending
       });
    }

    return data;
  };

  const renderItem = (item: any) => {
    const isSong = !item.type || item.type === 'song';
    return (
      <div 
        key={item.id} 
        onClick={() => !isSong && handleItemClick(item)}
        className={`flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition group ${!isSong ? 'cursor-pointer' : ''}`}
      >
        <div className="relative w-12 h-12 flex-shrink-0">
           <img src={item.cover} alt={item.name} className="w-full h-full rounded object-cover bg-slate-800" />
           {/* Overlay Icon for containers */}
           {!isSong && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition">
               <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
               </svg>
             </div>
           )}
        </div>
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="marquee-container group-hover:bg-transparent"> 
            <h3 className={`font-medium text-white truncate marquee-text ${item.name.length > 20 ? 'group-hover:animate-[marquee_5s_linear_infinite]' : ''}`}>
               {item.name}
            </h3>
          </div>
          <p className="text-sm text-slate-400 truncate">
            {item.artist || (item.type === 'artist' ? `Albums: ${item.albumSize}` : '')}
          </p>
        </div>

        {isSong && (
          <button 
            onClick={async (e) => { 
              e.stopPropagation();
              if (addingId !== null) return;
              setAddingId(item.id);
              try {
                await onAdd(item.id, userId);
                // Optional: Don't close, allow adding more
              } catch (err) {
                console.error("Failed to add song:", err);
              } finally {
                setAddingId(null);
              }
            }}
            disabled={addingId !== null}
            className={`p-2 rounded-full transition flex-shrink-0 ${
              addingId === item.id 
                ? 'bg-purple-500 text-white' 
                : 'bg-white/10 hover:bg-purple-500 text-white opacity-0 group-hover:opacity-100'
            } ${addingId !== null && addingId !== item.id ? 'cursor-not-allowed opacity-20' : ''}`}
          >
            {addingId === item.id ? (
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            )}
          </button>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            {stack.length > 1 && (
               <button onClick={goBack} className="p-2 hover:bg-white/10 rounded-full transition text-slate-300 hover:text-white">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
               </button>
            )}
            <h2 className="text-xl font-semibold text-white">
               {currentView?.title || 'Discover'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full">✕</button>
        </div>

        {/* Content Container */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* Sidebar (Context Info) - Only if not root search */}
            {currentView?.type !== 'search' && currentView?.context && (
                <div className="w-1/3 border-r border-white/10 p-6 flex flex-col items-center text-center bg-slate-900/30 overflow-y-auto">
                    <img src={currentView.context.cover} alt={currentView.context.name} className="w-48 h-48 rounded-xl shadow-2xl mb-4 object-cover" />
                    <h2 className="text-2xl font-bold text-white mb-2">{currentView.context.name}</h2>
                    {currentView.type === 'album' && (
                        <>
                             <p className="text-purple-400 mb-4">{currentView.context.artist}</p>
                             <p className="text-sm text-slate-400 text-left w-full mt-4 leading-relaxed opacity-80 line-clamp-[10]">
                                 {currentView.context.description || 'No description available.'}
                             </p>
                        </>
                    )}
                     {currentView.type === 'artist' && (
                        <div className="mt-4 flex gap-2">
                            <span className="px-3 py-1 rounded-full bg-white/10 text-sm text-slate-300">Artist</span>
                        </div>
                    )}
                </div>
            )}

            {/* Main List */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-900/20">
                {/* Search Bar & Controls (Only show at root or if needed) */}
                {stack.length === 1 && (
                    <div className="p-4 space-y-4 border-b border-white/5">
                        <form onSubmit={(e) => handleSearch(e)} className="relative">
                            <input
                            type="text"
                            className="w-full bg-slate-800/50 border border-white/10 rounded-full py-3 px-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            placeholder="Search..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Icons.Search />
                            </div>
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 py-1.5 text-sm font-medium transition">
                                Search
                            </button>
                        </form>
                        <div className="flex gap-2">
                             {[
                                 { id: 1, label: 'Songs' }, 
                                 { id: 10, label: 'Albums' }, 
                                 { id: 100, label: 'Artists' }
                             ].map(type => (
                                 <button
                                     key={type.id}
                                     onClick={() => { setSearchType(type.id); handleSearch(undefined, type.id); }}
                                     className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${searchType === type.id ? 'bg-white text-slate-900' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                 >
                                     {type.label}
                                 </button>
                             ))}
                        </div>
                    </div>
                )}

                {/* Filters & Sort (If data exists) */}
                {currentView && currentView.data.length > 0 && (
                     <div className="px-4 py-2 border-b border-white/5 flex gap-4 items-center">
                         <div className="relative flex-1">
                            <input 
                                type="text" 
                                placeholder="Filter results..." 
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="w-full bg-transparent border-none text-sm text-white placeholder-slate-500 focus:ring-0 p-0"
                            />
                         </div>
                         <select 
                            value={sortOrder} 
                            onChange={(e) => setSortOrder(e.target.value as any)}
                            className="bg-slate-800 text-xs text-slate-300 border-none rounded p-1 outline-none"
                         >
                             <option value="default">Default</option>
                             <option value="name">Name</option>
                             <option value="time">Date/Duration</option>
                         </select>
                     </div>
                )}

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {loading && stack.length === 1 && currentView?.data.length === 0 && (
                        <div className="text-center py-12 text-slate-400 animate-pulse">Searching...</div>
                    )}
                    
                    {getFilteredAndSortedData().map((item: any) => renderItem(item))}
                    
                    {!loading && getFilteredAndSortedData().length === 0 && (
                        <div className="text-center py-12 text-slate-500">No results found</div>
                    )}

                    {currentView?.hasMore && !filterText && (
                        <div className="p-4 flex justify-center">
                            <button 
                                onClick={loadMore} 
                                disabled={loading}
                                className="text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};