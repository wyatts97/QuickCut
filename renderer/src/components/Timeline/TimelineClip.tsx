import { useState, useEffect, useCallback, memo } from 'react';
import { useStore, TimelineClip } from '../../store/useStore';
import { log } from '../../utils/logger';

// Configuration constants
const WAVEFORM_SAMPLES = 100;
const WAVEFORM_HEIGHT = 20;
const THUMBNAIL_INTERVAL = 2;
const MAX_THUMBNAILS = 10;
const THUMBNAIL_HEIGHT = 40;

interface TimelineClipComponentProps {
  clip: TimelineClip;
  isSelected: boolean;
  timelineZoom: number;
  onSelect: (clipId: string, isShiftClick: boolean) => void;
  onDragStart: (clipId: string, startX: number) => void;
  showWaveform?: boolean;
  timelineInset: number;
}

export const TimelineClipComponent = memo<TimelineClipComponentProps>(({ 
  clip, 
  isSelected, 
  timelineZoom, 
  timelineInset,
  onSelect, 
  onDragStart,
  showWaveform = true 
}) => {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isGeneratingWaveform, setIsGeneratingWaveform] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  
  const clipWidth = (clip.outPoint - clip.inPoint) * timelineZoom;
  const clipLeft = clip.startTime * timelineZoom + timelineInset;
  const clipDuration = clip.outPoint - clip.inPoint;
  
  // Generate mock thumbnails (in real implementation, this would use video frames)
  useEffect(() => {
    if (clipDuration < 1) return; // Don't generate thumbnails for very short clips
    
    setIsGeneratingThumbnails(true);
    
    const generateMockThumbnails = () => {
      const thumbnailCount = Math.min(
        Math.floor(clipDuration / THUMBNAIL_INTERVAL),
        MAX_THUMBNAILS
      );
      
      const mockThumbnails: string[] = [];
      for (let i = 0; i < thumbnailCount; i++) {
        // Generate placeholder image data URL
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 45;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Create gradient background
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#374151');
          gradient.addColorStop(1, '#1f2937');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Add timestamp text
          ctx.fillStyle = '#9ca3af';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          const timestamp = (i * THUMBNAIL_INTERVAL).toFixed(1);
          ctx.fillText(`${timestamp}s`, canvas.width / 2, canvas.height / 2);
        }
        
        mockThumbnails.push(canvas.toDataURL('image/jpeg', 0.8));
      }
      
      return mockThumbnails;
    };
    
    // Simulate async thumbnail generation
    const timer = setTimeout(() => {
      const generatedThumbnails = generateMockThumbnails();
      setThumbnails(generatedThumbnails);
      setIsGeneratingThumbnails(false);
      log.timeline('Generated thumbnails', { clipId: clip.id, count: generatedThumbnails.length });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [clip.id, clipDuration]);
  
  // Generate mock waveform data (in real implementation, this would use Web Audio API)
  useEffect(() => {
    if (!showWaveform) return;
    
    setIsGeneratingWaveform(true);
    
    const generateMockWaveform = () => {
      const samples: number[] = [];
      for (let i = 0; i < WAVEFORM_SAMPLES; i++) {
        // Generate random-looking but consistent waveform
        const base = Math.sin(i * 0.1) * 0.3;
        const noise = (Math.random() - 0.5) * 0.4;
        const envelope = Math.sin((i / WAVEFORM_SAMPLES) * Math.PI);
        samples.push(Math.abs(base + noise) * envelope);
      }
      return samples;
    };
    
    // Simulate async processing
    const timer = setTimeout(() => {
      setWaveformData(generateMockWaveform());
      setIsGeneratingWaveform(false);
      log.timeline('Generated waveform', { clipId: clip.id, samples: WAVEFORM_SAMPLES });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [clip.id, showWaveform]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStart(clip.id, e.clientX);
  }, [clip.id, onDragStart]);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(clip.id, e.shiftKey);
  }, [clip.id, onSelect]);
  
  // Render waveform
  const renderWaveform = () => {
    if (!showWaveform || isGeneratingWaveform || waveformData.length === 0) {
      return null;
    }
    
    const barWidth = Math.max(1, clipWidth / WAVEFORM_SAMPLES);
    
    return (
      <div className="absolute bottom-0 left-0 right-0 h-5 flex items-end justify-center overflow-hidden">
        {waveformData.map((amplitude, index) => (
          <div
            key={index}
            className="bg-blue-400/30 mx-px"
            style={{
              width: `${barWidth}px`,
              height: `${amplitude * WAVEFORM_HEIGHT}px`,
              minWidth: '1px'
            }}
          />
        ))}
      </div>
    );
  };
  
  // Render thumbnail filmstrip
  const renderThumbnails = () => {
    if (isGeneratingThumbnails || thumbnails.length === 0) {
      return null;
    }
    
    const thumbnailWidth = Math.max(40, clipWidth / thumbnails.length);
    
    return (
      <div className="absolute top-8 left-0 right-0 h-10 flex overflow-hidden rounded">
        {thumbnails.map((thumbnail, index) => (
          <div
            key={index}
            className="flex-shrink-0 border border-gray-600/30"
            style={{
              width: `${thumbnailWidth}px`,
              backgroundImage: `url(${thumbnail})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        ))}
      </div>
    );
  };
  
  return (
    <div
      className={`absolute h-12 rounded cursor-pointer transition-all duration-150 ${
        isSelected 
          ? 'bg-blue-500 border-2 border-blue-600 shadow-lg z-10' 
          : 'bg-gray-600 border border-gray-700 hover:bg-gray-500'
      }`}
      style={{
        left: `${clipLeft}px`,
        width: `${clipWidth}px`,
        top: '0px', // Position at top of track
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Thumbnail filmstrip */}
      {renderThumbnails()}
      
      <div className="px-2 py-1 text-white text-xs truncate">
        {clip.sourceFile.name}
      </div>
      <div className="px-2 text-white/70 text-xs">
        {(clip.outPoint - clip.inPoint).toFixed(1)}s
      </div>
      
      {/* Waveform overlay */}
      {renderWaveform()}
    </div>
  );
});

TimelineClipComponent.displayName = 'TimelineClipComponent';
