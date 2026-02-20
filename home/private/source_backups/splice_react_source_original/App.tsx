import React, { useMemo, useRef, useState } from 'react';
import { AssetLibrary } from './components/AssetLibrary';
import { Timeline } from './components/Timeline';
import { VideoPlayer } from './components/VideoPlayer';
import type { AudioAsset, TimelineTrack, VideoAsset } from './types';

type ExportPreset = 'Standard' | 'High' | 'Lossless';

function id() {
  return Math.random().toString(36).slice(2, 10);
}

async function readVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = url;
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? v.duration : 0;
      resolve(d || 0);
    };
    v.onerror = () => resolve(0);
  });
}

// --- Tiny built-in "public domain style" synth tracks (no external files/keys) ---
// These are procedurally generated tones so the app ships self-contained.
async function synthTrack(kind: 'Drone' | 'Pulse' | 'Chiptune'): Promise<AudioAsset> {
  const sampleRate = 44100;
  const seconds = 18;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  const buffer = ctx.createBuffer(1, sampleRate * seconds, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    let s = 0;
    if (kind === 'Drone') {
      s = 0.25 * Math.sin(2 * Math.PI * 55 * t) + 0.12 * Math.sin(2 * Math.PI * 110 * t);
      s += 0.06 * Math.sin(2 * Math.PI * 220 * t);
    } else if (kind === 'Pulse') {
      const bpm = 92;
      const beat = (t * bpm) / 60;
      const env = Math.pow(Math.max(0, 1 - (beat % 1)), 2);
      s = env * (0.35 * Math.sin(2 * Math.PI * 82.41 * t) + 0.18 * Math.sin(2 * Math.PI * 164.81 * t));
      s += 0.03 * (Math.random() * 2 - 1);
    } else {
      // chiptune-ish arpeggio
      const notes = [261.63, 329.63, 392.0, 523.25];
      const step = Math.floor(t * 8) % notes.length;
      const f = notes[step];
      const sq = Math.sign(Math.sin(2 * Math.PI * f * t));
      const env = 0.15 + 0.1 * Math.sin(2 * Math.PI * 0.5 * t);
      s = env * sq;
    }
    // soft clip
    data[i] = Math.tanh(s * 1.4);
  }

  // encode WAV
  const wav = audioBufferToWav(buffer);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  try { await ctx.close(); } catch {}

  return {
    id: id(),
    name: `Built-in: ${kind}`,
    url,
    duration: seconds
  };
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, length - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numOfChan * 2, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, length - 44, true);

  // interleave
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));

  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numOfChan; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return out;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

const App: React.FC = () => {
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [timeline, setTimeline] = useState<TimelineTrack[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0);

  // audio / project polish
  const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);

  const [exportPreset, setExportPreset] = useState<ExportPreset>('High');
  const [exportFormat, setExportFormat] = useState<'MP4' | 'MOV'>('MP4');
  const [exportResolution, setExportResolution] = useState<'720p' | '1080p'>('1080p');
  const [toast, setToast] = useState<string>('');

  const currentTrack = isPreviewMode ? timeline[activeTimelineIndex] : null;
  const currentAssetId = isPreviewMode ? currentTrack?.assetId : selectedAssetId;
  const currentAsset = assets.find(a => a.id === currentAssetId);

  const totalDuration = useMemo(() => {
    return timeline.reduce((acc, t) => {
      const asset = assets.find(a => a.id === t.assetId);
      const duration = asset?.duration ?? 0;
      const start = t.startTime ?? 0;
      const end = t.endTime ?? duration;
      return acc + Math.max(0, end - start);
    }, 0);
  }, [timeline, assets]);

  const addToTimeline = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const duration = asset.duration ?? 7;

    setTimeline(prev => {
      const next: TimelineTrack[] = [...prev, { id: id(), assetId, startTime: 0, endTime: duration }];
      // immediately preview the newly added clip
      setActiveTimelineIndex(next.length - 1);
      setIsPreviewMode(true);
      return next;
    });
  };

  const importVideoFiles = async (files: FileList) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setToast('Importing clips…');

    const created: VideoAsset[] = [];
    for (const f of list) {
      const url = URL.createObjectURL(f);
      const duration = await readVideoDuration(url);
      created.push({
        id: id(),
        url,
        name: f.name,
        note: duration ? `${duration.toFixed(1)}s • Local import` : 'Local import',
        duration: duration || 7,
        status: 'ready'
      });
    }

    setAssets(prev => [...created.reverse(), ...prev]);
    setSelectedAssetId(created[0].id);
    setIsPreviewMode(false);
    setToast('Imported. Drag into timeline or click + on a clip.');
    window.setTimeout(() => setToast(''), 2500);
  };

  const importAudioFile = (files: FileList) => {
    const file = files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a: AudioAsset = { id: id(), name: file.name, url };
    setAudioAssets(prev => [a, ...prev]);
    setActiveAudioId(a.id);
    setToast('Audio track added to project.');
    window.setTimeout(() => setToast(''), 2000);
  };

  const addBuiltInTrack = async (kind: 'Drone' | 'Pulse' | 'Chiptune') => {
    setToast('Generating built-in track…');
    const t = await synthTrack(kind);
    setAudioAssets(prev => [t, ...prev]);
    setActiveAudioId(t.id);
    setToast('Built-in track added.');
    window.setTimeout(() => setToast(''), 2000);
  };

  const playAudio = () => {
    const track = audioAssets.find(a => a.id === activeAudioId);
    if (!track) return;
    if (audioEl.current) {
      audioEl.current.src = track.url;
      audioEl.current.loop = true;
      audioEl.current.volume = 0.45;
      audioEl.current.play().catch(() => void 0);
    }
  };

  const stopAudio = () => {
    if (audioEl.current) {
      audioEl.current.pause();
      audioEl.current.currentTime = 0;
    }
  };

  const handleVideoEnded = () => {
    if (!isPreviewMode) return;
    if (activeTimelineIndex < timeline.length - 1) {
      setActiveTimelineIndex(i => i + 1);
    } else {
      setActiveTimelineIndex(0);
    }
  };

  const handleExport = () => {
    if (timeline.length === 0) {
      setToast('Add clips to timeline before exporting.');
      window.setTimeout(() => setToast(''), 1800);
      return;
    }

    // portfolio demo: simulated export pipeline
    const steps = [
      'Analyzing sequence…',
      `Rendering ${exportResolution} ${exportFormat}…`,
      exportPreset === 'Lossless' ? 'Applying lossless pipeline…' : 'Polishing transitions…',
      activeAudioId ? 'Mixing audio bed…' : 'Finalizing…',
      'Export ready (demo)'
    ];
    let i = 0;
    setToast(steps[i]);
    const timer = window.setInterval(() => {
      i++;
      if (i >= steps.length) {
        window.clearInterval(timer);
        setToast('Export complete ✅ (demo)');
        window.setTimeout(() => setToast(''), 2200);
        return;
      }
      setToast(steps[i]);
    }, 900);
  };

  const setPreset = (p: ExportPreset) => {
    setExportPreset(p);
    setExportResolution(p === 'Standard' ? '720p' : '1080p');
  };

  return (
    <div className="flex h-screen flex-col bg-[#050505] overflow-hidden text-zinc-100 antialiased selection:bg-indigo-500/30">
      <audio ref={audioEl} />

      {/* Dynamic Background Blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/5 rounded-full blur-[120px]" />
      </div>

      <header className="h-14 shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 7h16v10H4V7zm6 2v6l6-3-6-3z" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Splice</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10 mx-2" />
          <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
            <span>Project: Untitled_Sequence</span>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[10px] font-mono text-indigo-400 font-bold tracking-widest flex items-center gap-2">
            <span className="text-zinc-600 font-medium">DURATION:</span>
            <span className="bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{totalDuration.toFixed(1)}s</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => { setIsPreviewMode(false); }}
              className="px-3 py-1 text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
              title="Focus source clip view"
            >
              Source
            </button>
            <button
              onClick={() => { setIsPreviewMode(true); setActiveTimelineIndex(0); }}
              className="px-3 py-1 text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
              title="Preview the timeline"
            >
              Preview
            </button>
            <div className="w-7 h-7 rounded-md bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-400">PRO</div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AssetLibrary
          assets={assets}
          onImportFiles={importVideoFiles}
          onAddToTimeline={addToTimeline}
          onSelect={(id) => { setSelectedAssetId(id); setIsPreviewMode(false); }}
          selectedAssetId={selectedAssetId}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-[#080808]">
          <div className="flex-1 p-6 flex flex-col items-center relative">
            <div className="w-full max-w-5xl h-full flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                  <button
                    onClick={() => setIsPreviewMode(false)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${!isPreviewMode ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Source Clip
                  </button>
                  <button
                    onClick={() => { setIsPreviewMode(true); setActiveTimelineIndex(0); }}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${isPreviewMode ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Timeline Preview
                  </button>
                </div>
                {isPreviewMode && timeline.length > 0 && (
                  <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Clip {activeTimelineIndex + 1} / {timeline.length}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center min-h-0">
                {currentAsset?.url ? (
                  <VideoPlayer
                    src={currentAsset.url}
                    className="max-h-full aspect-video shadow-2xl shadow-black/50 ring-1 ring-white/10"
                    onEnded={handleVideoEnded}
                    startTime={isPreviewMode ? currentTrack?.startTime : 0}
                    endTime={isPreviewMode ? currentTrack?.endTime : undefined}
                  />
                ) : (
                  <div className="aspect-video w-full rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent flex flex-col items-center justify-center gap-4 group transition-colors hover:border-white/10">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-600 group-hover:scale-105 group-hover:text-indigo-500 transition-all duration-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-zinc-400">Empty Viewport</p>
                      <p className="text-[10px] text-zinc-600">Import clips, then add to timeline.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Timeline
            assets={assets}
            timeline={timeline}
            setTimeline={setTimeline}
            activeIndex={isPreviewMode ? activeTimelineIndex : -1}
            onSelectIndex={(idx) => { setActiveTimelineIndex(idx); setIsPreviewMode(true); }}
          />
        </main>

        <aside className="w-[340px] shrink-0 border-l border-white/5 bg-black/20 backdrop-blur-md flex flex-col overflow-y-auto z-40">
          <div className="p-6 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Toolbox</h3>
                <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">NO KEYS</span>
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-white/5 border border-white/10 shadow-xl">
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-2.5 rounded-xl bg-[#0a0a0a] border border-white/5 text-[10px] font-black text-zinc-400 hover:border-white/10 hover:text-white transition">
                    Auto Cut (demo)
                  </button>
                  <button className="py-2.5 rounded-xl bg-[#0a0a0a] border border-white/5 text-[10px] font-black text-zinc-400 hover:border-white/10 hover:text-white transition">
                    Color Grade (demo)
                  </button>
                  <button className="py-2.5 rounded-xl bg-[#0a0a0a] border border-white/5 text-[10px] font-black text-zinc-400 hover:border-white/10 hover:text-white transition">
                    Captions (demo)
                  </button>
                  <button className="py-2.5 rounded-xl bg-[#0a0a0a] border border-white/5 text-[10px] font-black text-zinc-400 hover:border-white/10 hover:text-white transition">
                    Stabilize (demo)
                  </button>
                </div>

                <div className="h-px bg-white/10" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Audio Bed</label>
                    <span className="text-[10px] text-zinc-600 font-bold">Optional</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="audio/*"
                        hidden
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length) {
                            importAudioFile(e.target.files);
                            e.target.value = '';
                          }
                        }}
                      />
                      <span className="block w-full text-center py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black text-zinc-200 cursor-pointer">
                        Import Audio
                      </span>
                    </label>
                    <button
                      onClick={playAudio}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black"
                    >
                      Play
                    </button>
                    <button
                      onClick={stopAudio}
                      className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[10px] font-black"
                    >
                      Stop
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => addBuiltInTrack('Drone')} className="py-2 rounded-lg bg-[#0a0a0a] border border-white/5 text-[9px] font-black text-zinc-400 hover:text-white hover:border-white/10 transition">Drone</button>
                    <button onClick={() => addBuiltInTrack('Pulse')} className="py-2 rounded-lg bg-[#0a0a0a] border border-white/5 text-[9px] font-black text-zinc-400 hover:text-white hover:border-white/10 transition">Pulse</button>
                    <button onClick={() => addBuiltInTrack('Chiptune')} className="py-2 rounded-lg bg-[#0a0a0a] border border-white/5 text-[9px] font-black text-zinc-400 hover:text-white hover:border-white/10 transition">Chip</button>
                  </div>

                  <div className="space-y-2">
                    {audioAssets.slice(0, 6).map(a => (
                      <button
                        key={a.id}
                        onClick={() => setActiveAudioId(a.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-[10px] font-bold transition ${activeAudioId === a.id ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/5 bg-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'}`}
                      >
                        {a.name}
                      </button>
                    ))}
                    {audioAssets.length === 0 && (
                      <p className="text-[9px] text-zinc-600">Use Import Audio or generate a built-in track (Drone/Pulse/Chip).</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 pb-12">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Export</h3>
              <div className="space-y-6 p-5 rounded-2xl bg-white/5 border border-white/10 shadow-xl">
                <div className="space-y-3">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Quality Presets</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-[#0a0a0a] rounded-xl border border-white/5">
                    {(['Standard', 'High', 'Lossless'] as ExportPreset[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPreset(p)}
                        className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all duration-300 ${exportPreset === p ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Res</label>
                    <select
                      value={exportResolution}
                      onChange={(e) => setExportResolution(e.target.value as any)}
                      className="w-full bg-[#0a0a0a] border border-white/5 rounded-lg py-2 px-2 text-[10px] font-bold outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                    >
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Format</label>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                      className="w-full bg-[#0a0a0a] border border-white/5 rounded-lg py-2 px-2 text-[10px] font-bold outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                    >
                      <option value="MP4">MP4</option>
                      <option value="MOV">MOV</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleExport}
                  className="w-full py-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-[11px] uppercase tracking-[0.2em] transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Render & Polish
                </button>
              </div>
            </section>
          </div>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 border border-white/10 text-[11px] font-bold text-zinc-200 backdrop-blur-xl shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
};

export default App;
