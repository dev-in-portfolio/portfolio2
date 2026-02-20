
import React, { useRef, useEffect, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onEnded?: () => void;
  className?: string;
  startTime?: number;
  endTime?: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, onEnded, className = "", startTime = 0, endTime }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.currentTime = startTime;
    }
  }, [src, startTime]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      if (endTime !== undefined && time >= endTime) {
        videoRef.current.pause();
        videoRef.current.currentTime = endTime;
        onEnded?.();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (Math.abs(videoRef.current.currentTime - startTime) > 0.1) {
        videoRef.current.currentTime = startTime;
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      const finalTime = Math.max(startTime, endTime ? Math.min(time, endTime) : time);
      videoRef.current.currentTime = finalTime;
      setCurrentTime(finalTime);
    }
  };

  const formatTime = (time: number) => {
    const totalSeconds = Math.max(0, time);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const effectiveEnd = endTime || duration;
  const effectiveDuration = Math.max(0.1, effectiveEnd - startTime);
  const progressPercent = ((currentTime - startTime) / effectiveDuration) * 100;

  return (
    <div className={`relative group overflow-hidden rounded-2xl bg-black ring-1 ring-white/5 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-center ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
      />
      
      {/* Play Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] cursor-pointer pointer-events-none transition-all duration-500">
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-2xl flex items-center justify-center border border-white/20 shadow-2xl scale-100 group-hover:scale-110 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white ml-1 shadow-indigo-500/50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Modern Controls */}
      <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black via-black/60 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out flex flex-col gap-4">
        
        {/* Progress Bar Container */}
        <div className="relative w-full h-1 group/progress cursor-pointer">
            <div className="absolute inset-0 bg-white/10 rounded-full" />
            <div 
              className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} 
            />
            <input 
                type="range"
                min={startTime}
                max={effectiveEnd || 0}
                step="0.01"
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer z-10 opacity-0"
            />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-all transform active:scale-90">
                {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                )}
            </button>

            <div className="flex items-center gap-2 text-[10px] font-mono font-black tracking-widest text-zinc-300">
                <span className="text-white">{formatTime(currentTime - startTime)}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-500">{formatTime(effectiveDuration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-all transform active:scale-90">
                {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                )}
            </button>
            <button className="text-zinc-400 hover:text-white transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
               </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
