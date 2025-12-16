import { useState, useEffect, memo } from 'react';
import { VideoFile } from '../../store/useStore';

interface TimelineClipThumbnailsProps {
  videoFile: VideoFile;
  inPoint: number;
  outPoint: number;
  clipWidth: number;
}

export const TimelineClipThumbnails = memo<TimelineClipThumbnailsProps>(({
  videoFile,
  inPoint,
  outPoint,
  clipWidth,
}) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate how many thumbnails we need based on clip width
  const thumbnailWidth = 80; // Each thumbnail is roughly 80px wide
  const thumbnailCount = Math.max(1, Math.ceil(clipWidth / thumbnailWidth));
  const duration = outPoint - inPoint;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setThumbnails([]);

    const generateThumbnails = async () => {
      const newThumbnails: string[] = [];
      const interval = duration / thumbnailCount;

      // Use local-file:// protocol like VideoPreview does
      const videoSrc = `local-file://${videoFile.path}`;

      for (let i = 0; i < thumbnailCount; i++) {
        if (!isMounted) return;

        const time = inPoint + (interval * i) + (interval / 2);
        
        try {
          const thumbnail = await extractFrameFromVideo(videoSrc, time);
          if (isMounted) {
            newThumbnails.push(thumbnail);
            setThumbnails([...newThumbnails]);
          }
        } catch (err) {
          console.warn(`Failed to extract frame at ${time}s:`, err);
          newThumbnails.push('');
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    generateThumbnails();

    return () => {
      isMounted = false;
    };
  }, [videoFile.path, inPoint, outPoint, thumbnailCount, duration]);

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-gray-800">
      {thumbnails.length > 0 ? (
        thumbnails.map((thumbnail, i) => (
          <div
            key={i}
            className="flex-shrink-0 h-full"
            style={{
              width: `${clipWidth / thumbnailCount}px`,
              backgroundImage: thumbnail ? `url(${thumbnail})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: thumbnail ? undefined : '#374151',
            }}
          >
            {!thumbnail && isLoading && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        ))
      ) : (
        // Loading placeholders
        Array.from({ length: thumbnailCount }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 h-full bg-gray-700 flex items-center justify-center"
            style={{ width: `${clipWidth / thumbnailCount}px` }}
          >
            <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ))
      )}
    </div>
  );
});

TimelineClipThumbnails.displayName = 'TimelineClipThumbnails';

/**
 * Extract a single frame from a video at a specific time using canvas
 */
async function extractFrameFromVideo(
  videoSrc: string,
  time: number,
  width: number = 160,
  height: number = 90
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    let hasResolved = false;
    const timeout = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        video.src = '';
        reject(new Error('Thumbnail extraction timeout'));
      }
    }, 5000);

    video.onloadedmetadata = () => {
      const seekTime = Math.min(Math.max(0, time), video.duration - 0.1);
      
      // Calculate proper aspect ratio
      const videoAspect = video.videoWidth / video.videoHeight;
      const targetAspect = width / height;
      
      if (videoAspect > targetAspect) {
        // Video is wider, fit to width
        canvas.width = width;
        canvas.height = width / videoAspect;
      } else {
        // Video is taller, fit to height  
        canvas.height = height;
        canvas.width = height * videoAspect;
      }
      
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      if (hasResolved) return;
      
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        hasResolved = true;
        clearTimeout(timeout);
        video.src = '';
        video.load();
        
        resolve(dataUrl);
      } catch (err) {
        hasResolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    };

    video.onerror = () => {
      if (hasResolved) return;
      hasResolved = true;
      clearTimeout(timeout);
      reject(new Error(`Failed to load video: ${videoSrc}`));
    };

    // Use the videoSrc directly (already has local-file:// protocol)
    video.src = videoSrc;
  });
}

export default TimelineClipThumbnails;
