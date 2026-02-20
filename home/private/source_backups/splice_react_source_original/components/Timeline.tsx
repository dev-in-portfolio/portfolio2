
import React, { useState, useRef } from 'react';
import { VideoAsset, TimelineTrack } from '../types';

interface TimelineProps {
  assets: VideoAsset[];
  timeline: TimelineTrack[];
  setTimeline: React.Dispatch<React.SetStateAction<TimelineTrack[]>>;
  activeIndex: number;
  onSelectIndex: (index: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ assets, timeline, setTimeline, activeIndex, onSelectIndex }) => {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const removeItem = (id: string) => {
    setTimeline(prev => prev.filter(item => item.id !== id));
    if (playingTrackId === id) setPlayingTrackId(null);
  };

  const duplicateItem = (index: number) => {
    const item = timeline[index];
    const newItem = { ...item, id: Math.random().toString(36).substring(7) };
    const newTimeline = [...timeline];
    newTimeline.splice(index + 1, 0, newItem);
    setTimeline(newTimeline);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const insertAssetAt = (assetId: string, index: number) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const duration = asset.duration ?? 7;
    const newTrack: TimelineTrack = {
      id: Math.random().toString(36).substring(7),
      assetId,
      startTime: 0,
      endTime: duration
    };
    setTimeline(prev => {
      const next = [...prev];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, newTrack);
      return next;
    });
    onSelectIndex(Math.max(0, Math.min(index, timeline.length)));
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();

    const externalAssetId = e.dataTransfer.getData('application/x-splice-asset');
    if (externalAssetId && draggedIndex === null) {
      // dropped from library into timeline
      insertAssetAt(externalAssetId, targetIndex);
      setDragOverIndex(null);
      return;
    }

    // internal reorder
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const newTimeline = [...timeline];
    const [movedItem] = newTimeline.splice(draggedIndex, 1);
    newTimeline.splice(targetIndex, 0, movedItem);
    setTimeline(newTimeline);
    setDraggedIndex(null);
    setDragOverIndex(null);
    onSelectIndex(targetIndex);
  };

  const updateTrim = (trackId: string, type: 'startTime' | 'endTime', value: number) => {
    setTimeline(prev => prev.map(track => {
      if (track.id === trackId) {
        const updated = { ...track, [type]: value };
        if (playingTrackId === trackId) {
          const video = videoRefs.current[trackId];
          if (video) {
            video.pause();
            video.currentTime = type === 'startTime' ? value : track.startTime || 0;
            setPlayingTrackId(null);
          }
        }
        return updated;
      }
      return track;
    }));
  };

  const togglePreview = (e: React.MouseEvent, track: TimelineTrack) => {
    e.stopPropagation();
    const video = videoRefs.current[track.id];
    if (!video) return;

    if (playingTrackId === track.id) {
      video.pause();
      setPlayingTrackId(null);
    } else {
      if (playingTrackId && videoRefs.current[playingTrackId]) {
        videoRefs.current[playingTrackId]?.pause();
      }
      video.currentTime = track.startTime || 0;
      video.play();
      setPlayingTrackId(track.id);
    }
  };

  const handleTrackTimeUpdate = (track: TimelineTrack) => {
    const video = videoRefs.current[track.id];
    if (!video) return;
    const end = track.endTime || 7;
    if (video.currentTime >= end) {
      video.pause();
      video.currentTime = track.startTime || 0;
      setPlayingTrackId(null);
    }
  };

  const formatTime = (time: number) => {
    const seconds = Math.floor(time || 0);
    const ms = Math.floor(((time || 0) % 1) * 10);
    return `${seconds.toString().padStart(2, '0')}.${ms}s`;
  };

  return (
    <div className="h-72 border-t border-white/5 bg-[#0a0a0a] flex flex-col z-40">
      {/* Timeline Header */}
      <div className="h-10 shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sequence Editor</span>
          </div>
          <div className="h-3 w-[1px] bg-white/10" />
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">Tracks: {timeline.length}</span>
        </div>
        
        <div className="text-[10px] font-mono text-indigo-400 font-bold tracking-widest flex items-center gap-2">
           <span className="text-zinc-600 font-medium">TOTAL DURATION:</span>
           <span className="bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {timeline.reduce((acc, t) => acc + ((t.endTime || 7) - (t.startTime || 0)), 0).toFixed(1)}s
           </span>
        </div>
      </div>
      
      {/* Scrollable Tracks Area */}
      <div
        className="flex-1 flex gap-4 p-4 overflow-x-auto overflow-y-hidden custom-scrollbar bg-black/40"
        onDragOver={(e) => {
          const externalAssetId = e.dataTransfer.getData('application/x-splice-asset');
          if (externalAssetId) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          const externalAssetId = e.dataTransfer.getData('application/x-splice-asset');
          if (externalAssetId && draggedIndex === null) {
            e.preventDefault();
            insertAssetAt(externalAssetId, timeline.length);
          }
        }}
      >
        {timeline.map((track, idx) => {
          const asset = assets.find(a => a.id === track.assetId);
          if (!asset) return null;

          const duration = asset.duration ?? 7;
          const start = track.startTime || 0;
          const end = track.endTime || duration;
          const isPlaying = playingTrackId === track.id;
          const isBeingDragged = draggedIndex === idx;
          const isBeingHoveredByDrag = dragOverIndex === idx;

          return (
            <div 
              key={track.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, idx)}
              className={`relative group shrink-0 w-64 h-full flex flex-col rounded-xl border transition-all duration-300 ${
                idx === activeIndex ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/5'
              } ${isBeingDragged ? 'opacity-30 scale-95' : 'opacity-100'} ${
                isBeingHoveredByDrag ? 'border-indigo-400 translate-x-1' : ''
              }`}
              onClick={() => onSelectIndex(idx)}
            >
              {/* Clip Thumbnail Area */}
              <div className="relative flex-1 min-h-0 overflow-hidden rounded-t-[10px] group/item">
                <video 
                  ref={el => videoRefs.current[track.id] = el}
                  src={asset.url} 
                  muted
                  onTimeUpdate={() => handleTrackTimeUpdate(track)}
                  className={`w-full h-full object-cover transition-all duration-700 ${isPlaying ? 'scale-110' : 'scale-100 opacity-60'}`} 
                />
                
                {/* Visual Indicators */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-black text-zinc-300">
                  {idx + 1}
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity bg-black/20">
                   <button 
                    onClick={(e) => togglePreview(e, track)}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all shadow-2xl"
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                </div>

                {/* Track Actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); duplicateItem(idx); }}
                    className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10 backdrop-blur-md transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeItem(track.id); }}
                    className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 backdrop-blur-md transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="absolute inset-x-0 bottom-2 px-3">
                  <p className="text-[9px] text-zinc-300 truncate font-medium group-hover:text-white transition-colors">{asset.name}</p>
                </div>
              </div>

              {/* Trim Controls */}
              <div className="p-3 bg-[#0a0a0a] border-t border-white/5 space-y-3 rounded-b-xl">
                <div className="flex justify-between items-center text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                  <span className={start > 0 ? "text-indigo-400" : ""}>IN: {formatTime(start)}</span>
                  <span className={end < duration ? "text-indigo-400" : ""}>OUT: {formatTime(end)}</span>
                </div>
                
                <div className="relative flex flex-col gap-2 pt-1">
                  <div className="h-1.5 bg-white/5 rounded-full relative overflow-hidden">
                    <div 
                      className="absolute h-full bg-indigo-500" 
                      style={{ 
                        left: `${(start / duration) * 100}%`, 
                        width: `${((end - start) / duration) * 100}%` 
                      }} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="range"
                      min="0"
                      max={end - 0.2}
                      step="0.1"
                      value={start}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); updateTrim(track.id, 'startTime', parseFloat(e.target.value)); }}
                      className="w-full h-1 appearance-none bg-zinc-800 rounded-full accent-indigo-500 cursor-ew-resize opacity-60 hover:opacity-100 transition-opacity"
                    />
                    <input 
                      type="range"
                      min={start + 0.2}
                      max={duration}
                      step="0.1"
                      value={end}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); updateTrim(track.id, 'endTime', parseFloat(e.target.value)); }}
                      className="w-full h-1 appearance-none bg-zinc-800 rounded-full accent-indigo-500 cursor-ew-resize opacity-60 hover:opacity-100 transition-opacity"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                       <span className="text-[8px] font-bold text-zinc-500 uppercase">Trimmed:</span>
                       <span className="text-[9px] font-black text-zinc-300">{(end - start).toFixed(1)}s</span>
                    </div>
                    {isPlaying && (
                        <div className="flex gap-0.5">
                            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
                        </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}

        {timeline.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/5 rounded-2xl p-8 bg-white/5 group hover:border-white/10 transition-all duration-500">
            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center text-zinc-800 group-hover:scale-110 group-hover:text-indigo-500 transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Workspace Available</p>
              <p className="text-[9px] text-zinc-700 mt-1">Drag clips from library here to build your masterpiece.</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 8px;
          height: 8px;
          background: #ffffff;
          cursor: pointer;
          border-radius: 50%;
        }
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};
