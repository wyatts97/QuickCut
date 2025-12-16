import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useStore, TimelineClip } from '../store/useStore';
import { log } from '../utils/logger';

type DragHandle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

// Video frame cache for performance
interface VideoFrameCache {
  [key: string]: HTMLImageElement | null;
}

// Frame cache configuration
const FRAME_CACHE_SIZE = 50;
const FRAME_THROTTLE_MS = 100; // Throttle frame generation to 10fps

export function VideoPreview() {
  const { videoFile, clips, crop, setCrop, playheadTime, isPlaying } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoRect, setVideoRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  
  // Refs for cleanup and performance
  const frameCacheRef = useRef<VideoFrameCache>({});
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const videoCleanupRef = useRef<(() => void) | null>(null);
  const frameGenerationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  
  // Crop drag state
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Calculate video display dimensions and position
  const updateVideoRect = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || !videoFile) return;

    const containerRect = container.getBoundingClientRect();
    const videoAspect = videoFile.width / videoFile.height;
    const containerAspect = containerRect.width / containerRect.height;

    let displayWidth, displayHeight;
    if (videoAspect > containerAspect) {
      displayWidth = containerRect.width;
      displayHeight = containerRect.width / videoAspect;
    } else {
      displayHeight = containerRect.height;
      displayWidth = containerRect.height * videoAspect;
    }

    const x = (containerRect.width - displayWidth) / 2;
    const y = (containerRect.height - displayHeight) / 2;
    
    setVideoRect({ x, y, width: displayWidth, height: displayHeight });
    setScale(displayWidth / videoFile.width);
  }, [videoFile]);

  // Frame caching utilities
  const generateFrameKey = useCallback((time: number, path: string): string => {
    return `${path}_${Math.floor(time * 10)}`; // 10fps precision
  }, []);

  const getCachedFrame = useCallback((key: string): HTMLImageElement | null => {
    return frameCacheRef.current[key] || null;
  }, []);

  const setCachedFrame = useCallback((key: string, frame: HTMLImageElement): void => {
    // Implement LRU cache - remove oldest frames if cache is full
    const cache = frameCacheRef.current;
    const keys = Object.keys(cache);
    
    if (keys.length >= FRAME_CACHE_SIZE) {
      // Remove oldest frames (simple FIFO)
      const keysToRemove = keys.slice(0, keys.length - FRAME_CACHE_SIZE + 1);
      keysToRemove.forEach(oldKey => {
        if (cache[oldKey]) {
          cache[oldKey]!.src = '';
        }
        delete cache[oldKey];
      });
    }
    
    cache[key] = frame;
  }, []);

  const generateVideoFrame = useCallback((time: number): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) {
        reject(new Error('Video element not available'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const originalTime = video.currentTime;
      
      const onSeeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const img = new Image();
          img.onload = () => {
            // Restore original time
            video.currentTime = originalTime;
            resolve(img);
          };
          img.onerror = () => reject(new Error('Failed to create image'));
          img.src = canvas.toDataURL('image/jpeg', 0.8);
        } catch (error) {
          video.currentTime = originalTime;
          reject(error);
        }
        
        video.removeEventListener('seeked', onSeeked);
      };

      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;
    });
  }, []);

  // Track current video source to switch between different clips
  const [currentVideoPath, setCurrentVideoPath] = useState<string | null>(null);

  // Optimized video rect calculation with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !videoFile) return;

    // Use ResizeObserver for better performance than window resize
    resizeObserverRef.current = new ResizeObserver(() => {
      updateVideoRect();
    });
    
    resizeObserverRef.current.observe(container);
    
    // Initial calculation
    updateVideoRect();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [updateVideoRect, videoFile]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => updateVideoRect();
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [updateVideoRect]);

  // Find which clip is at the current playhead position
  const activeClip = useMemo((): TimelineClip | null => {
    for (const clip of clips) {
      const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
      if (playheadTime >= clip.startTime && playheadTime < clipEnd) {
        return clip;
      }
    }
    return null;
  }, [clips, playheadTime]);

  // Calculate the source time for the active clip
  const sourceTime = useMemo(() => {
    if (!activeClip) return null;
    // Map timeline position to source video position
    return activeClip.inPoint + (playheadTime - activeClip.startTime);
  }, [activeClip, playheadTime]);

  // Optimized video source loading with proper cleanup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const targetPath = activeClip?.sourceFile.path || videoFile?.path;
    if (targetPath && targetPath !== currentVideoPath) {
      const videoSrc = `local-file://${targetPath}`;
      
      // Cleanup previous video event listeners
      if (videoCleanupRef.current) {
        videoCleanupRef.current();
      }
      
      // Set new source
      video.src = videoSrc;
      setCurrentVideoPath(targetPath);
      
      // Create new event handlers with cleanup function
      const handleError = (e: Event) => {
        log.error('Video loading error', `Error: ${e}, VideoPath: ${activeClip?.sourceFile.path}`);
        log.error('Video error code', `ErrorCode: ${video.error}, VideoPath: ${activeClip?.sourceFile.path}`);
      };
      
      const handleLoadedData = () => {
        log.video('Video loaded successfully', { videoPath: activeClip?.sourceFile.path, duration: video.duration });
      };
      
      video.addEventListener('error', handleError);
      video.addEventListener('loadeddata', handleLoadedData);
      
      // Store cleanup function
      videoCleanupRef.current = () => {
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadeddata', handleLoadedData);
      };
    }
  }, [activeClip?.sourceFile.path, videoFile?.path, currentVideoPath]);

  // Optimized video seeking with frame caching and throttling
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoFile || sourceTime === null) return;
    
    // Only seek if difference is significant (avoid micro-updates)
    if (Math.abs(video.currentTime - sourceTime) > 0.05) {
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Throttle seeking to improve performance
      const now = Date.now();
      if (now - lastFrameTimeRef.current < FRAME_THROTTLE_MS) {
        animationFrameRef.current = requestAnimationFrame(() => {
          if (video && sourceTime !== null) {
            video.currentTime = sourceTime;
          }
        });
        return;
      }
      
      lastFrameTimeRef.current = now;
      
      // Use requestAnimationFrame for smoother seeking
      animationFrameRef.current = requestAnimationFrame(() => {
        if (video && sourceTime !== null) {
          video.currentTime = sourceTime;
        }
      });
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [sourceTime, videoFile]);

  // Optimized video playback control with proper cleanup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoFile) return;

    // Check if playhead is in dead space (no active clip)
    const isInDeadSpace = activeClip === null;
    
    let playPromise: Promise<void> | null = null;
    
    if (isPlaying && !isInDeadSpace) {
      // Play the video if not in dead space
      playPromise = video.play().catch(error => {
        log.error('Video play error', `Error: ${error}, CurrentTime: ${video.currentTime}, Paused: ${video.paused}`);
      });
    } else {
      // Pause the video if not playing or in dead space
      video.pause();
    }
    
    // Cleanup function to handle component unmount during playback
    return () => {
      if (playPromise) {
        playPromise.catch(() => {}); // Suppress unhandled promise rejection
      }
      video.pause();
    };
  }, [isPlaying, activeClip, videoFile]);

  // Comprehensive cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup all resources on component unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (frameGenerationRef.current) {
        cancelAnimationFrame(frameGenerationRef.current);
        frameGenerationRef.current = null;
      }
      
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      
      if (videoCleanupRef.current) {
        videoCleanupRef.current();
        videoCleanupRef.current = null;
      }
      
      // Clear frame cache
      if (frameCacheRef.current) {
        Object.values(frameCacheRef.current).forEach(img => {
          if (img) {
            img.src = '';
          }
        });
        frameCacheRef.current = {};
      }
      
      // Cleanup video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      }
      
      // Reset timing refs
      lastFrameTimeRef.current = 0;
    };
  }, []);

  // Handle crop drag
  const handleMouseDown = (e: React.MouseEvent, handle: DragHandle) => {
    if (!crop.enabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    setDragHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({ x: crop.x, y: crop.y, width: crop.width, height: crop.height });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragHandle || !videoFile) return;

    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;

    let newX = cropStart.x;
    let newY = cropStart.y;
    let newW = cropStart.width;
    let newH = cropStart.height;

    switch (dragHandle) {
      case 'move':
        newX = Math.max(0, Math.min(cropStart.x + dx, videoFile.width - cropStart.width));
        newY = Math.max(0, Math.min(cropStart.y + dy, videoFile.height - cropStart.height));
        break;
      case 'nw':
        newX = Math.max(0, Math.min(cropStart.x + dx, cropStart.x + cropStart.width - 20));
        newY = Math.max(0, Math.min(cropStart.y + dy, cropStart.y + cropStart.height - 20));
        newW = cropStart.width - (newX - cropStart.x);
        newH = cropStart.height - (newY - cropStart.y);
        break;
      case 'n':
        newY = Math.max(0, Math.min(cropStart.y + dy, cropStart.y + cropStart.height - 20));
        newH = cropStart.height - (newY - cropStart.y);
        break;
      case 'ne':
        newY = Math.max(0, Math.min(cropStart.y + dy, cropStart.y + cropStart.height - 20));
        newW = Math.max(20, Math.min(cropStart.width + dx, videoFile.width - cropStart.x));
        newH = cropStart.height - (newY - cropStart.y);
        break;
      case 'e':
        newW = Math.max(20, Math.min(cropStart.width + dx, videoFile.width - cropStart.x));
        break;
      case 'se':
        newW = Math.max(20, Math.min(cropStart.width + dx, videoFile.width - cropStart.x));
        newH = Math.max(20, Math.min(cropStart.height + dy, videoFile.height - cropStart.y));
        break;
      case 's':
        newH = Math.max(20, Math.min(cropStart.height + dy, videoFile.height - cropStart.y));
        break;
      case 'sw':
        newX = Math.max(0, Math.min(cropStart.x + dx, cropStart.x + cropStart.width - 20));
        newW = cropStart.width - (newX - cropStart.x);
        newH = Math.max(20, Math.min(cropStart.height + dy, videoFile.height - cropStart.y));
        break;
      case 'w':
        newX = Math.max(0, Math.min(cropStart.x + dx, cropStart.x + cropStart.width - 20));
        newW = cropStart.width - (newX - cropStart.x);
        break;
    }

    setCrop({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  }, [dragHandle, dragStart, cropStart, scale, videoFile, setCrop]);

  const handleMouseUp = useCallback(() => {
    setDragHandle(null);
  }, []);

  useEffect(() => {
    if (dragHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragHandle, handleMouseMove, handleMouseUp]);

  if (!videoFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-200 rounded-xl">
        <div className="text-center text-text-600">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-lg">No video loaded</p>
          <p className="text-sm mt-1">Open a video file to get started</p>
        </div>
      </div>
    );
  }

  // Crop overlay coordinates in display space
  const cropDisplay = {
    x: videoRect.x + crop.x * scale,
    y: videoRect.y + crop.y * scale,
    width: crop.width * scale,
    height: crop.height * scale,
  };

  // Check if playhead is in dead space (no active clip)
  const isInDeadSpace = activeClip === null && clips.length > 0;

  return (
    <div className="flex-1 flex flex-col bg-background-200 rounded-xl overflow-hidden">
      {/* Video container with crop overlay */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-black min-h-0 overflow-hidden"
        style={{ cursor: dragHandle ? 'grabbing' : 'default' }}
      >
        {/* Video element - always rendered to maintain state */}
        <video
          ref={videoRef}
          className="absolute object-contain"
          style={{
            left: videoRect.x,
            top: videoRect.y,
            width: videoRect.width,
            height: videoRect.height,
            opacity: isInDeadSpace ? 0.3 : 1,
          }}
          controls={false}
          autoPlay={false}
          muted={false}
          playsInline={true}
        />
        
        {/* Dead space indicator overlay */}
        {isInDeadSpace && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white/60 text-sm">
              Playhead is outside clip range
            </div>
          </div>
        )}

        {/* Crop overlay */}
        {crop.enabled && (
          <>
            {/* Darkened areas outside crop */}
            <div 
              className="absolute bg-black/60 pointer-events-none"
              style={{ left: videoRect.x, top: videoRect.y, width: videoRect.width, height: crop.y * scale }}
            />
            <div 
              className="absolute bg-black/60 pointer-events-none"
              style={{ 
                left: videoRect.x, 
                top: videoRect.y + (crop.y + crop.height) * scale, 
                width: videoRect.width, 
                height: videoRect.height - (crop.y + crop.height) * scale 
              }}
            />
            <div 
              className="absolute bg-black/60 pointer-events-none"
              style={{ 
                left: videoRect.x, 
                top: cropDisplay.y, 
                width: crop.x * scale, 
                height: cropDisplay.height 
              }}
            />
            <div 
              className="absolute bg-black/60 pointer-events-none"
              style={{ 
                left: cropDisplay.x + cropDisplay.width, 
                top: cropDisplay.y, 
                width: videoRect.width - (crop.x + crop.width) * scale, 
                height: cropDisplay.height 
              }}
            />

            {/* Crop box */}
            <div
              className="absolute border-2 border-blue-500 cursor-move"
              style={{
                left: cropDisplay.x,
                top: cropDisplay.y,
                width: cropDisplay.width,
                height: cropDisplay.height,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-blue-500/30" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-blue-500/30" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-blue-500/30" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-blue-500/30" />
              </div>

              {/* Corner handles */}
              <div 
                className="absolute -left-2 -top-2 w-4 h-4 bg-blue-500 rounded-sm cursor-nw-resize shadow-lg"
                onMouseDown={(e) => handleMouseDown(e, 'nw')}
              />
              <div 
                className="absolute -right-2 -top-2 w-4 h-4 bg-blue-500 rounded-sm cursor-ne-resize shadow-lg"
                onMouseDown={(e) => handleMouseDown(e, 'ne')}
              />
              <div 
                className="absolute -left-2 -bottom-2 w-4 h-4 bg-blue-500 rounded-sm cursor-sw-resize shadow-lg"
                onMouseDown={(e) => handleMouseDown(e, 'sw')}
              />
              <div 
                className="absolute -right-2 -bottom-2 w-4 h-4 bg-blue-500 rounded-sm cursor-se-resize shadow-lg"
                onMouseDown={(e) => handleMouseDown(e, 'se')}
              />

              {/* Edge handles */}
              <div 
                className="absolute top-1/2 -translate-x-1/2 -top-2 w-8 h-4 bg-blue-500 rounded-sm cursor-n-resize shadow-lg"
                onMouseDown={(e) => handleMouseDown(e, 'n')}
              />
              <div 
                className="absolute top-1/2 -translate-x-1/2 -bottom-2 w-8 h-4 bg-blue-500 rounded-sm cursor-s-resize shadow-lg"
                onMouseDown={(e) => handleMouseDown(e, 's')}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-8 bg-blue-500 rounded-sm cursor-w-resize shadow-lg"
                onMouseDown={(e) => handleMouseDown(e, 'w')}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-8 bg-blue-500 rounded-sm cursor-e-resize shadow-lg"
                onMouseDown={(e) => handleMouseDown(e, 'e')}
              />

              {/* Size indicator */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-background-100/90 rounded text-xs text-text-900 whitespace-nowrap">
                {crop.width} × {crop.height}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
