// Video thumbnail generator utility
// Extracts frames from video at specified time points

interface ThumbnailCache {
  [key: string]: string[]; // videoPath -> array of thumbnail data URLs
}

const thumbnailCache: ThumbnailCache = {};

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  count?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: ThumbnailOptions = {
  width: 120,
  height: 68,
  count: 10,
  quality: 0.7,
};

/**
 * Extract a single frame from a video at a specific time
 */
export const extractFrame = (
  videoPath: string,
  time: number,
  options: ThumbnailOptions = {}
): Promise<string> => {
  const { width, height, quality } = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    const canvas = document.createElement('canvas');
    canvas.width = width!;
    canvas.height = height!;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.onloadedmetadata = () => {
      // Clamp time to valid range
      const seekTime = Math.min(Math.max(0, time), video.duration - 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, width!, height!);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Clean up
        video.src = '';
        video.load();
        
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      reject(new Error(`Failed to load video: ${videoPath}`));
    };

    // Set video source - handle file:// protocol for local files
    if (videoPath.startsWith('/') || videoPath.match(/^[A-Z]:\\/i)) {
      video.src = `file://${videoPath}`;
    } else {
      video.src = videoPath;
    }
  });
};

/**
 * Generate multiple thumbnails for a video clip
 */
export const generateThumbnails = async (
  videoPath: string,
  startTime: number,
  endTime: number,
  options: ThumbnailOptions = {}
): Promise<string[]> => {
  const { count, ...frameOptions } = { ...DEFAULT_OPTIONS, ...options };
  const duration = endTime - startTime;
  
  // Check cache first
  const cacheKey = `${videoPath}-${startTime}-${endTime}-${count}`;
  if (thumbnailCache[cacheKey]) {
    return thumbnailCache[cacheKey];
  }

  const thumbnails: string[] = [];
  const interval = duration / count!;

  for (let i = 0; i < count!; i++) {
    const time = startTime + (interval * i) + (interval / 2); // Center of each segment
    try {
      const thumbnail = await extractFrame(videoPath, time, frameOptions);
      thumbnails.push(thumbnail);
    } catch (err) {
      // If extraction fails, use a placeholder
      console.warn(`Failed to extract frame at ${time}s:`, err);
      thumbnails.push('');
    }
  }

  // Cache the results
  thumbnailCache[cacheKey] = thumbnails;

  return thumbnails;
};

/**
 * Clear thumbnail cache for a specific video or all videos
 */
export const clearThumbnailCache = (videoPath?: string): void => {
  if (videoPath) {
    Object.keys(thumbnailCache).forEach(key => {
      if (key.startsWith(videoPath)) {
        delete thumbnailCache[key];
      }
    });
  } else {
    Object.keys(thumbnailCache).forEach(key => {
      delete thumbnailCache[key];
    });
  }
};

export default {
  extractFrame,
  generateThumbnails,
  clearThumbnailCache,
};
