import { useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { log } from '../../utils/logger';

interface TimelineControlsProps {
  onAddVideo: () => void;
  onSplit: () => void;
  onDelete: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  selectedClipIds: string[];
  timelineZoom: number;
  crop: { enabled: boolean };
  setCrop: (crop: any) => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  onAddVideo,
  onSplit,
  onDelete,
  onZoomIn,
  onZoomOut,
  selectedClipIds,
  timelineZoom,
  crop,
  setCrop,
}) => {
  const { playheadTime, setIsPlaying, isPlaying } = useStore();

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
    log.timeline('Toggle playback', { isPlaying: !isPlaying, currentTime: playheadTime });
  }, [isPlaying, playheadTime, setIsPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-background-200 border-b border-background-300">
      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        className="p-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      
      <span className="text-xs text-text-800 font-mono min-w-[80px]">
        {formatTime(playheadTime)}
      </span>
      
      <div className="w-px h-4 bg-background-400 mx-2" />
      
      {/* Add Video button */}
      <button
        onClick={onAddVideo}
        className="px-2 py-1 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 
                   rounded flex items-center gap-1"
        title="Add another video to timeline"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Video
      </button>
      
      <div className="flex-1" />
      
      {/* Crop toggle */}
      <button
        onClick={() => setCrop({ enabled: !crop.enabled })}
        className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors
                   ${crop.enabled 
                     ? 'bg-primary-500 text-white' 
                     : 'bg-background-300 hover:bg-background-400'}`}
        title="Toggle crop overlay (C)"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10H7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h3M7 4v3M17 20v-3M20 17h-3" />
        </svg>
        Crop
      </button>
      
      <button
        onClick={onSplit}
        disabled={selectedClipIds.length === 0}
        className="px-2 py-1 text-xs bg-background-300 hover:bg-background-400 disabled:opacity-50 
                   disabled:cursor-not-allowed rounded flex items-center gap-1"
        title="Split clip at playhead (S)"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0-16l-4 4m4-4l4 4" />
        </svg>
        Split
      </button>
      
      <button
        onClick={onDelete}
        disabled={selectedClipIds.length === 0}
        className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 
                   disabled:opacity-50 disabled:cursor-not-allowed rounded flex items-center gap-1"
        title="Delete selected clips (Del)"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete{selectedClipIds.length > 1 ? ` (${selectedClipIds.length})` : ''}
      </button>
      
      <div className="w-px h-4 bg-background-400 mx-2" />
      
      <button
        onClick={onZoomOut}
        className="p-1 text-text-700 hover:text-text-950"
        title="Zoom out"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>
      <span className="text-xs text-text-700 w-14 text-center">{Math.round(timelineZoom)}px/s</span>
      <button
        onClick={onZoomIn}
        className="p-1 text-text-700 hover:text-text-950"
        title="Zoom in"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
        </svg>
      </button>
    </div>
  );
};
