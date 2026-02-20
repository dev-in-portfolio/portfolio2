
import React, { useRef } from 'react';
import { VideoAsset } from '../types';

interface AssetLibraryProps {
  assets: VideoAsset[];
  onImportFiles: (files: FileList) => void;
  onAddToTimeline: (assetId: string) => void;
  onSelect: (assetId: string) => void;
  selectedAssetId: string | null;
}

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ assets, onImportFiles, onAddToTimeline, onSelect, selectedAssetId }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="w-72 shrink-0 border-r border-white/5 bg-black/20 flex flex-col overflow-hidden z-40">
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Library</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-zinc-300 hover:bg-white/10 transition-colors"
            title="Import clips"
          >
            Import
          </button>
          <span className="text-[10px] tabular-nums font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
            {assets.length}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onImportFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {assets.map((asset) => (
          <div 
            key={asset.id} 
            className={`group relative rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${selectedAssetId === asset.id ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
            onClick={() => onSelect(asset.id)}
            draggable={asset.status === 'ready'}
            onDragStart={(e) => {
              // allow dragging into timeline
              e.dataTransfer.setData('application/x-splice-asset', asset.id);
              e.dataTransfer.effectAllowed = 'copy';
            }}
          >
            {asset.status === 'pending' ? (
              <div className="aspect-video bg-black/40 flex flex-col items-center justify-center gap-3">
                <div className="w-5 h-5 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">Processing</span>
              </div>
            ) : asset.status === 'error' ? (
              <div className="aspect-video bg-red-950/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-red-500/80 uppercase">Failed</span>
              </div>
            ) : (
              <div className="relative aspect-video">
                <video src={asset.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                
                {/* Floating Add Action */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAddToTimeline(asset.id); }}
                    className="p-2 rounded-lg bg-indigo-600 text-white shadow-xl hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all"
                    title="Add to sequence"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            <div className="p-3 space-y-2">
              <p className="text-[10px] text-zinc-300 font-black truncate leading-relaxed group-hover:text-white transition-colors">{asset.name}</p>
              {asset.note && (
                <p className="text-[9px] text-zinc-500 line-clamp-2 leading-relaxed">{asset.note}</p>
              )}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                   <span className="text-[9px] font-black text-zinc-600 uppercase">{(asset.duration ?? 0).toFixed(1)}s</span>
                </div>
                <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-tighter">HD • 30FPS</span>
              </div>
            </div>
          </div>
        ))}

        {assets.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-700 mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No assets</p>
            <p className="text-[9px] text-zinc-700 mt-2">Import clips to start building a timeline.</p>
          </div>
        )}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};
