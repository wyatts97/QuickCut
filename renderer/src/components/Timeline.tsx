import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useStore, TimelineClip } from '../store/useStore';
import { TimelineClipComponent, TimelineControls, TimelineRuler } from './Timeline/index';
import { TimelineClipThumbnails } from './Timeline/TimelineClipThumbnails';
import { log } from '../utils/logger';

// Virtual scrolling configuration
const VIRTUAL_SCROLL_BUFFER = 200; // pixels
const CLIP_HEIGHT = 48; // pixels
const TIMELINE_HEIGHT = 120; // pixels

export function Timeline() {
  const {
    clips,
    videoFile,
    playheadTime,
    timelineZoom,
    isPlaying,
    setPlayheadTime,
    setTimelineZoom,
    setIsPlaying,
    splitClipAtPlayhead,
    rippleDelete,
    updateClip,
    addVideoToTimeline,
    crop,
    setCrop,
  } = useStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 1000 }); // pixels
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [draggedClip, setDraggedClip] = useState<{ id: string; startX: number; originalStart: number } | null>(null);
  const dragOffsetRef = useRef<number>(0);
  const clipElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const playIntervalRef = useRef<number | null>(null);

  // Snapping configuration
  const SNAP_THRESHOLD = 10; // pixels
  const [snapLinePosition, setSnapLinePosition] = useState<number | null>(null);

  // Calculate total timeline duration from clips
  const clipsDuration = clips.reduce((max, clip) => {
    const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
    return Math.max(max, clipEnd);
  }, videoFile?.duration || 10);

  // Extend timeline to next 5-second increment beyond actual content
  const nextFiveSecondIncrement = Math.ceil((clipsDuration + 1) / 5) * 5;
  const totalDuration = Math.max(nextFiveSecondIncrement, 10); // Minimum 10 seconds for very short videos

  const timelineWidth = totalDuration * timelineZoom + 200; // Extra space at end
  const timelineInset = 8; // px-2

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Virtual scrolling - calculate visible clips
  const visibleClips = useMemo(() => {
    return clips;
  }, [clips]);

  // Calculate gaps between clips for visual indicators
  const timelineGaps = useMemo(() => {
    if (clips.length === 0) return [];

    const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
    const gaps: { start: number; end: number; duration: number }[] = [];

    // Check for gap at the beginning
    if (sortedClips[0].startTime > 0.1) {
      gaps.push({
        start: 0,
        end: sortedClips[0].startTime,
        duration: sortedClips[0].startTime
      });
    }

    // Check for gaps between clips
    for (let i = 0; i < sortedClips.length - 1; i++) {
      const currentClip = sortedClips[i];
      const nextClip = sortedClips[i + 1];
      const currentEnd = currentClip.startTime + (currentClip.outPoint - currentClip.inPoint);
      const nextStart = nextClip.startTime;

      if (nextStart - currentEnd > 0.1) { // Only show gaps larger than 0.1s
        gaps.push({
          start: currentEnd,
          end: nextStart,
          duration: nextStart - currentEnd
        });
      }
    }

    return gaps;
  }, [clips]);

  // Calculate visible gaps (for virtual scrolling)
  const visibleGaps = useMemo(() => {
    const { start, end } = visibleRange;
    const bufferStart = start - VIRTUAL_SCROLL_BUFFER;
    const bufferEnd = end + VIRTUAL_SCROLL_BUFFER;

    return timelineGaps.filter(gap => {
      const gapLeft = gap.start * timelineZoom + 200;
      const gapRight = gap.end * timelineZoom + 200;
      return gapRight >= bufferStart && gapLeft <= bufferEnd;
    });
  }, [timelineGaps, visibleRange, timelineZoom]);

  // Update visible range on scroll
  const handleScroll = useCallback(() => {
    if (!timelineRef.current) return;

    const scrollLeft = timelineRef.current.scrollLeft;
    const containerWidth = timelineRef.current.clientWidth;

    setVisibleRange({
      start: scrollLeft,
      end: scrollLeft + containerWidth
    });
  }, []);

  // Optimized clip selection handlers
  const handleClipSelect = useCallback((clipId: string, isShiftClick: boolean) => {
    if (isShiftClick) {
      setSelectedClipIds(prev => {
        if (prev.includes(clipId)) {
          return prev.filter(id => id !== clipId);
        } else {
          return [...prev, clipId];
        }
      });
    } else {
      setSelectedClipIds([clipId]);
    }
  }, []);

  const handleClipDragStart = useCallback((clipId: string, startX: number) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    setDraggedClip({
      id: clipId,
      startX,
      originalStart: clip.startTime
    });
  }, [clips]);

  // Get all clip edge points for playhead snapping
  const getPlayheadSnapPoints = useCallback(() => {
    const points: number[] = [0];
    clips.forEach(clip => {
      const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
      points.push(clip.startTime);
      points.push(clipEnd);
    });
    return points.sort((a, b) => a - b);
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
    const rawTime = Math.max(0, (x - timelineInset) / timelineZoom);
    const time = snapPlayheadTime(rawTime);
    setPlayheadTime(time);
  }, [timelineZoom, setPlayheadTime, snapPlayheadTime, timelineInset]);

  // Timeline mouse handlers for playhead positioning
  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const rawTime = Math.max(0, (x - timelineInset) / timelineZoom);
    const time = snapPlayheadTime(rawTime);
    setPlayheadTime(time);
    setIsDraggingPlayhead(true);
  }, [timelineZoom, setPlayheadTime, snapPlayheadTime, timelineInset]);

  const handleTimelineMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingPlayhead || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const rawTime = Math.max(0, (x - timelineInset) / timelineZoom);
    const time = snapPlayheadTime(rawTime);
    setPlayheadTime(time);
  }, [isDraggingPlayhead, timelineZoom, setPlayheadTime, snapPlayheadTime, timelineInset]);

  const handleTimelineMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
  }, []);

  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const rawTime = Math.max(0, (x - timelineInset) / timelineZoom);
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
  }, [isDraggingPlayhead, timelineZoom, setPlayheadTime, snapPlayheadTime, timelineInset]);

  // Handle clip selection with multi-select support
  const handleClipMouseDown = (e: React.MouseEvent, clip: TimelineClip, clipIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+click: toggle selection
      setSelectedClipIds(prev => {
        if (prev.includes(clip.id)) {
          return prev.filter(id => id !== clip.id);
        } else {
          return [...prev, clip.id];
        }
      });
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

  // Initialize virtual scrolling and update visible range
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    // Initial visible range calculation
    handleScroll();

    // Add scroll listener for virtual scrolling
    timeline.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      timeline.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Handle split at playhead
  const handleSplit = () => {
    if (selectedClipIds.length === 0) return;
    // Split the first selected clip
    splitClipAtPlayhead(selectedClipIds[0]);
    log.timeline('Split clip at playhead', { clipId: selectedClipIds[0], time: playheadTime });
  };

  // Handle delete selected clips
  const handleDelete = () => {
    if (selectedClipIds.length === 0) return;

    // Delete all selected clips
    selectedClipIds.forEach(id => rippleDelete(id));
    setSelectedClipIds([]);
    log.timeline('Deleted clips', { clipIds: selectedClipIds });
  };

  // Handle adding a new video to the timeline
  const handleAddVideo = async () => {
    try {
      const result = await window.quickcut.openFile();
      if (result) {
        addVideoToTimeline(result);
        log.timeline('Added video to timeline', { file: result.name });
      }
    } catch (error) {
      log.error('Timeline', 'Failed to add video', error);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setTimelineZoom(Math.min(timelineZoom * 1.2, 500));
    log.timeline('Zoomed in', { newZoom: timelineZoom * 1.2 });
  };

  const handleZoomOut = () => {
    setTimelineZoom(Math.max(timelineZoom / 1.2, 10));
    log.timeline('Zoomed out', { newZoom: timelineZoom / 1.2 });
  };

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
  }, [isPlaying, playheadTime, totalDuration, setPlayheadTime, setIsPlaying]);

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
    <div className="flex flex-col h-48 bg-background-200 border-t border-background-300">
      <TimelineControls
        onAddVideo={handleAddVideo}
        onSplit={handleSplit}
        onDelete={handleDelete}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        selectedClipIds={selectedClipIds}
        timelineZoom={timelineZoom}
        crop={crop}
        setCrop={setCrop}
      />

      {/* Timeline content - scrollbar hidden, scroll via drag or wheel */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-x-scroll overflow-y-hidden relative select-none outline-none scrollbar-thin scrollbar-track-background-100 scrollbar-thumb-background-400"
        onMouseDown={handleTimelineMouseDown}
        onMouseMove={handleTimelineMouseMove}
        onMouseUp={handleTimelineMouseUp}
        onMouseLeave={handleTimelineMouseUp}
        tabIndex={-1}
      >
        {/* Background layers that extend full width of scrollable area */}
        <div className="absolute inset-0 bg-background-300 z-0" /> {/* Track background */}
        <div className="absolute top-0 left-0 right-0 h-7 bg-background-100 z-0" /> {/* Ruler background */}
        
        <div className="relative h-full z-10" style={{ minWidth: timelineWidth }}>
          {/* Time ruler - fixed height at top with dark background */}
          <div className="h-7 relative">
            <TimelineRuler
              totalDuration={totalDuration}
              timelineZoom={timelineZoom}
              timelineWidth={timelineWidth}
              timelineInset={timelineInset}
            />
          </div>

          {/* Track area - fills all remaining space below ruler with lighter background */}
          <div className="absolute left-0 right-0 bottom-0" style={{ top: '28px' }}>
            {/* Render clips with thumbnails */}
            {clips.map((clip) => {
              const isSelected = selectedClipIds.includes(clip.id);
              const clipWidth = (clip.outPoint - clip.inPoint) * timelineZoom;
              const clipLeft = clip.startTime * timelineZoom + timelineInset;
              const clipDuration = clip.outPoint - clip.inPoint;

              return (
                <div 
                  key={clip.id}
                  className={`absolute top-0 bottom-0 rounded overflow-hidden cursor-pointer ${
                    isSelected 
                      ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-transparent' 
                      : 'hover:ring-1 hover:ring-white/30'
                  }`}
                  style={{
                    left: `${clipLeft}px`,
                    width: `${clipWidth}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClipSelect(clip.id, e.shiftKey);
                  }}
                >
                  {/* Video thumbnails */}
                  <TimelineClipThumbnails
                    videoFile={clip.sourceFile}
                    inPoint={clip.inPoint}
                    outPoint={clip.outPoint}
                    clipWidth={clipWidth}
                  />
                  
                  {/* Clip info overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                    <div className="text-white text-xs font-medium truncate">
                      {clip.sourceFile.name}
                    </div>
                    <div className="text-white/60 text-xs">
                      {clipDuration.toFixed(1)}s
                    </div>
                  </div>

                  {/* Selection border overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-blue-400 rounded pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Playhead */}
          <div
            className="absolute cursor-ew-resize z-20"
            style={{
              left: `${timelineInset + playheadTime * timelineZoom}px`,
              top: '0px',
              bottom: '0px',
              width: '2px',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingPlayhead(true);
            }}
          >
            {/* Playhead line */}
            <div 
              className="absolute inset-0 bg-red-500"
              style={{ boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)' }}
            />
            {/* Playhead handle (triangle at top) */}
            <div
              className="absolute -top-0 left-1/2 -translate-x-1/2"
              style={{
                width: '12px',
                height: '12px',
                background: '#ef4444',
                clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
