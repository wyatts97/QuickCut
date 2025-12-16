import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore, TimelineClip } from '../store/useStore';

export function Timeline() {
  const {
    clips,
    playheadTime,
    timelineZoom,
    videoFile,
    crop,
    setCrop,
    setPlayheadTime,
    setTimelineZoom,
    splitClipAtPlayhead,
    rippleDelete,
    updateClip,
    addVideoToTimeline,
  } = useStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [draggedClip, setDraggedClip] = useState<{ id: string; startX: number; originalStart: number } | null>(null);
  const dragOffsetRef = useRef<number>(0);
  const clipElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);
  
  // Snapping configuration
  const SNAP_THRESHOLD = 10; // pixels
  const [snapLinePosition, setSnapLinePosition] = useState<number | null>(null);

  // Calculate total timeline duration from clips
  const clipsDuration = clips.reduce((max, clip) => {
    const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
    return Math.max(max, clipEnd);
  }, videoFile?.duration || 10);
  
  // Always show at least 120 seconds (2 min) of timeline for aesthetics
  const minTimelineSeconds = 120;
  const totalDuration = Math.max(clipsDuration, minTimelineSeconds);

  const timelineWidth = totalDuration * timelineZoom + 200; // Extra space at end
  const timelineInset = 8; // px-2

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Get all clip edge points for playhead snapping
  const getPlayheadSnapPoints = useCallback(() => {
    const points: number[] = [0];
    clips.forEach(clip => {
      const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
      points.push(clip.startTime);
      points.push(clipEnd);
    });
    return points;
  }, [clips]);

  // Snap playhead time to nearby clip edges
  const snapPlayheadTime = useCallback((time: number): number => {
    const thresholdTime = SNAP_THRESHOLD / timelineZoom;
    const snapPoints = getPlayheadSnapPoints();
    let snappedTime = time;
    let minDistance = thresholdTime;
    
    for (const point of snapPoints) {
      const distance = Math.abs(time - point);
      if (distance < minDistance) {
        minDistance = distance;
        snappedTime = point;
      }
    }
    
    return snappedTime;
  }, [timelineZoom, getPlayheadSnapPoints]);

  // Handle playhead drag
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const rawTime = Math.max(0, x / timelineZoom);
    const time = snapPlayheadTime(rawTime);
    setPlayheadTime(time);
  }, [timelineZoom, setPlayheadTime, snapPlayheadTime]);

  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const rawTime = Math.max(0, x / timelineZoom);
      const time = snapPlayheadTime(rawTime);
      setPlayheadTime(time);
    };

    const handleMouseUp = () => setIsDraggingPlayhead(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, timelineZoom, setPlayheadTime, snapPlayheadTime]);

  // Handle clip selection with multi-select support
  const handleClipMouseDown = (e: React.MouseEvent, clip: TimelineClip, clipIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+click: toggle selection
      setSelectedClipIds(prev => 
        prev.includes(clip.id) 
          ? prev.filter(id => id !== clip.id)
          : [...prev, clip.id]
      );
      setLastSelectedIndex(clipIndex);
    } else if (e.shiftKey && lastSelectedIndex !== null) {
      // Shift+click: range selection
      const start = Math.min(lastSelectedIndex, clipIndex);
      const end = Math.max(lastSelectedIndex, clipIndex);
      const rangeIds = clips.slice(start, end + 1).map(c => c.id);
      setSelectedClipIds(rangeIds);
    } else {
      // Regular click: single selection
      setSelectedClipIds([clip.id]);
      setLastSelectedIndex(clipIndex);
    }
    
    // Start drag
    setDraggedClip({
      id: clip.id,
      startX: e.clientX,
      originalStart: clip.startTime,
    });
  };

  // Find snap points from other clips
  const getSnapPoints = useCallback((excludeClipId: string) => {
    const points: number[] = [0]; // Always snap to start
    clips.forEach(clip => {
      if (clip.id === excludeClipId) return;
      const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
      points.push(clip.startTime); // Clip start
      points.push(clipEnd); // Clip end
    });
    return points;
  }, [clips]);

  // Snap a time value to nearby snap points, returns snapped time and snap point for visual indicator
  const snapToPoint = useCallback((time: number, snapPoints: number[], clipDuration: number): { time: number; snapPoint: number | null } => {
    const thresholdTime = SNAP_THRESHOLD / timelineZoom;
    let snappedTime = time;
    let minDistance = thresholdTime;
    let snapPoint: number | null = null;
    
    // Check snap for clip start
    for (const point of snapPoints) {
      const distance = Math.abs(time - point);
      if (distance < minDistance) {
        minDistance = distance;
        snappedTime = point;
        snapPoint = point;
      }
    }
    
    // Also check snap for clip end
    const clipEnd = time + clipDuration;
    for (const point of snapPoints) {
      const distance = Math.abs(clipEnd - point);
      if (distance < minDistance) {
        minDistance = distance;
        snappedTime = point - clipDuration;
        snapPoint = point;
      }
    }
    
    return { time: Math.max(0, snappedTime), snapPoint };
  }, [timelineZoom]);

  useEffect(() => {
    if (!draggedClip) return;
    
    const draggedClipData = clips.find(c => c.id === draggedClip.id);
    const clipDuration = draggedClipData ? draggedClipData.outPoint - draggedClipData.inPoint : 0;
    const snapPoints = getSnapPoints(draggedClip.id);
    
    // Initialize dragOffsetRef to original position (fixes snap-to-zero on click)
    dragOffsetRef.current = draggedClip.originalStart;
    let hasMoved = false;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - draggedClip.startX;
      // Only consider it a drag if moved more than 3 pixels
      if (Math.abs(dx) > 3) {
        hasMoved = true;
      }
      
      const deltaTime = dx / timelineZoom;
      const rawStart = Math.max(0, draggedClip.originalStart + deltaTime);
      
      // Apply snapping
      const { time: newStart, snapPoint } = snapToPoint(rawStart, snapPoints, clipDuration);
      
      // Show snap line indicator
      setSnapLinePosition(snapPoint);
      
      dragOffsetRef.current = newStart;
      
      // Direct DOM manipulation for smooth visual feedback
      const clipEl = clipElementsRef.current.get(draggedClip.id);
      if (clipEl) {
        clipEl.style.left = `${timelineInset + newStart * timelineZoom}px`;
      }
    };

    const handleMouseUp = () => {
      // Only commit position if actually dragged (not just clicked)
      if (hasMoved && dragOffsetRef.current !== draggedClip.originalStart) {
        updateClip(draggedClip.id, { startTime: dragOffsetRef.current });
      }
      dragOffsetRef.current = 0;
      setDraggedClip(null);
      setSnapLinePosition(null); // Hide snap line
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setSnapLinePosition(null); // Clear snap line on cleanup
    };
  }, [draggedClip, timelineZoom, timelineInset, updateClip, clips, getSnapPoints, snapToPoint]);

  // Prevent text selection while dragging clips/playhead
  useEffect(() => {
    if (isDraggingPlayhead || draggedClip) {
      const prev = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.userSelect = prev;
      };
    }
  }, [isDraggingPlayhead, draggedClip]);

  // Handle split at playhead
  const handleSplit = () => {
    if (selectedClipIds.length === 0) return;
    // Split the first selected clip
    splitClipAtPlayhead(selectedClipIds[0]);
  };

  // Handle delete selected clips
  const handleDelete = () => {
    if (selectedClipIds.length === 0) return;
    // Delete all selected clips
    selectedClipIds.forEach(id => rippleDelete(id));
    setSelectedClipIds([]);
    setLastSelectedIndex(null);
  };

  // Handle adding a new video to the timeline
  const handleAddVideo = async () => {
    const file = await window.quickcut.openFile();
    if (file) {
      addVideoToTimeline(file);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setTimelineZoom(timelineZoom + 20);
  const handleZoomOut = () => setTimelineZoom(timelineZoom - 20);

  // Playback controls
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      // Stop
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start
      setIsPlaying(true);
      const startTime = Date.now();
      const startPlayhead = playheadTime;
      
      playIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newTime = startPlayhead + elapsed;
        
        if (newTime >= totalDuration) {
          setPlayheadTime(0);
          if (playIntervalRef.current) {
            clearInterval(playIntervalRef.current);
            playIntervalRef.current = null;
          }
          setIsPlaying(false);
        } else {
          setPlayheadTime(newTime);
        }
      }, 33); // ~30fps update
    }
  }, [isPlaying, playheadTime, totalDuration, setPlayheadTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Stop playback when manually dragging playhead
  useEffect(() => {
    if (isDraggingPlayhead && isPlaying) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      setIsPlaying(false);
    }
  }, [isDraggingPlayhead, isPlaying]);

  // Generate time markers with sub-second ticks
  const generateMarkers = () => {
    const majorMarkers: number[] = [];
    const minorMarkers: number[] = [];
    const microMarkers: number[] = [];
    
    // Determine intervals based on zoom level
    let majorInterval = 1; // seconds
    let minorInterval = 0.5; // half-seconds
    let microInterval = 0.1; // 100ms
    
    if (timelineZoom < 40) {
      majorInterval = 5;
      minorInterval = 1;
      microInterval = 0.5;
    } else if (timelineZoom < 80) {
      majorInterval = 2;
      minorInterval = 1;
      microInterval = 0.25;
    } else if (timelineZoom >= 150) {
      majorInterval = 1;
      minorInterval = 0.5;
      microInterval = 0.1;
    }
    
    const maxTime = totalDuration + 10;
    
    // Generate micro markers (smallest ticks)
    for (let t = 0; t <= maxTime; t += microInterval) {
      const rounded = Math.round(t * 1000) / 1000;
      if (rounded % minorInterval !== 0) {
        microMarkers.push(rounded);
      }
    }
    
    // Generate minor markers (medium ticks)
    for (let t = 0; t <= maxTime; t += minorInterval) {
      const rounded = Math.round(t * 1000) / 1000;
      if (rounded % majorInterval !== 0) {
        minorMarkers.push(rounded);
      }
    }
    
    // Generate major markers (with labels)
    for (let t = 0; t <= maxTime; t += majorInterval) {
      majorMarkers.push(t);
    }
    
    return { majorMarkers, minorMarkers, microMarkers };
  };
  
  const { majorMarkers, minorMarkers, microMarkers } = generateMarkers();

  if (!videoFile) {
    return (
      <div className="h-32 bg-background-200 border-t border-background-300 flex items-center justify-center text-text-500">
        Load a video to see the timeline
      </div>
    );
  }

  return (
    <div className="h-48 bg-background-200 border-t border-background-300 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-background-300 bg-background-100">
        {/* Play button */}
        <button
          onClick={togglePlay}
          className="p-1.5 bg-background-300 hover:bg-background-400 rounded-lg transition-colors"
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
          onClick={handleAddVideo}
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
          onClick={handleSplit}
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
          onClick={handleDelete}
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
          onClick={handleZoomOut}
          className="p-1 text-text-700 hover:text-text-950"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <span className="text-xs text-text-700 w-12 text-center">{timelineZoom}px/s</span>
        <button
          onClick={handleZoomIn}
          className="p-1 text-text-700 hover:text-text-950"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
      </div>

      {/* Timeline content */}
      <div 
        ref={timelineRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative select-none bg-background-300"
        onClick={handleTimelineClick}
      >
        <div className="relative" style={{ width: timelineWidth, height: '100%' }}>
          {/* Time ruler */}
          <div className="h-7 relative bg-background-200">
            {/* Micro tick marks (smallest - 100ms) */}
            {microMarkers.map(t => (
              <div
                key={`micro-${t}`}
                className="absolute bottom-0 w-px"
                style={{ 
                  left: timelineInset + t * timelineZoom,
                  height: '6px',
                  background: 'var(--background-500)'
                }}
              />
            ))}
            
            {/* Minor tick marks (medium - 500ms) */}
            {minorMarkers.map(t => (
              <div
                key={`minor-${t}`}
                className="absolute bottom-0 w-px"
                style={{ 
                  left: timelineInset + t * timelineZoom,
                  height: '10px',
                  background: 'var(--background-600)'
                }}
              />
            ))}
            
            {/* Major markers with labels */}
            {majorMarkers.map(t => (
              <div
                key={`major-${t}`}
                className="absolute top-0 h-full flex flex-col items-start"
                style={{ left: timelineInset + t * timelineZoom }}
              >
                <span className="text-[10px] text-text-700 mt-1 ml-1 font-medium tabular-nums">
                  {formatTime(t)}
                </span>
                <div className="flex-1" />
                <div 
                  className="w-px" 
                  style={{ 
                    height: '14px',
                    background: 'var(--background-500)'
                  }} 
                />
              </div>
            ))}
          </div>

          {/* Ruler bottom divider with gradient */}
          <div 
            className="absolute left-0 right-0" 
            style={{ 
              top: 28, 
              height: '1px',
              background: 'var(--background-400)'
            }} 
          />

          {/* Full-height grid lines */}
          {majorMarkers.map(t => (
            <div
              key={`grid-major-${t}`}
              className="absolute w-px"
              style={{ 
                left: timelineInset + t * timelineZoom,
                top: 28,
                bottom: 0,
                background: 'var(--background-400)'
              }}
            />
          ))}
          {minorMarkers.map(t => (
            <div
              key={`grid-minor-${t}`}
              className="absolute w-px"
              style={{ 
                left: timelineInset + t * timelineZoom,
                top: 28,
                bottom: 0,
                background: 'var(--background-300)'
              }}
            />
          ))}

          {/* Track */}
          <div className="h-16 relative mt-2">
            
            {/* Clips */}
            {clips.map((clip, clipIndex) => {
              const duration = clip.outPoint - clip.inPoint;
              const width = duration * timelineZoom;
              const left = timelineInset + clip.startTime * timelineZoom;
              const isSelected = selectedClipIds.includes(clip.id);
              
              const isDragging = draggedClip?.id === clip.id;
              
              return (
                <div
                  key={clip.id}
                  ref={(el) => {
                    if (el) clipElementsRef.current.set(clip.id, el);
                    else clipElementsRef.current.delete(clip.id);
                  }}
                  className={`absolute top-1.5 bottom-1.5 rounded-md cursor-grab active:cursor-grabbing
                              overflow-hidden ${isSelected 
                                ? '' 
                                : 'hover:brightness-110'}`}
                  style={{ 
                    left, 
                    width: Math.max(width, 4),
                    transition: isDragging ? 'none' : 'box-shadow 150ms, filter 150ms, border 150ms',
                    willChange: isDragging ? 'left' : 'auto',
                    background: 'var(--primary-600)',
                    boxShadow: isSelected 
                      ? '0 0 0 3px var(--primary-400), 0 4px 12px rgba(212, 119, 43, 0.5)'
                      : '0 2px 8px rgba(0, 0, 0, 0.3)',
                    border: isSelected ? '2px solid var(--primary-400)' : '2px solid transparent'
                  }}
                  onMouseDown={(e) => handleClipMouseDown(e, clip, clipIndex)}
                >
                  
                  <div className="px-2 py-1.5 text-xs text-white truncate h-full flex items-center overflow-hidden">
                    <span className="truncate font-medium drop-shadow-sm">{clip.sourceFile.name}</span>
                  </div>
                  
                  {/* Duration badge */}
                  {width > 80 && (
                    <div 
                      className="absolute bottom-1.5 right-1.5 text-[10px] text-primary-100 px-1.5 py-0.5 rounded font-medium tabular-nums"
                      style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                    >
                      {formatTime(duration)}
                    </div>
                  )}
                  
                  {/* Resize handles visual hint */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/10 hover:bg-white/20 transition-colors" />
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/10 hover:bg-white/20 transition-colors" />
                </div>
              );
            })}
          </div>

          {/* Snap line indicator */}
          {snapLinePosition !== null && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-20"
              style={{ 
                left: timelineInset + snapLinePosition * timelineZoom,
                width: '2px',
                background: '#22c55e',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)'
              }}
            />
          )}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 cursor-ew-resize z-10"
            style={{ 
              left: timelineInset + playheadTime * timelineZoom,
              width: '2px',
              background: 'linear-gradient(to bottom, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
            }}
            onMouseDown={handlePlayheadMouseDown}
          >
            {/* Playhead handle */}
            <div 
              className="absolute -top-1 left-1/2 -translate-x-1/2" 
              style={{
                width: '12px',
                height: '12px',
                background: 'linear-gradient(to bottom, #f87171 0%, #ef4444 100%)',
                clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
