import { useMemo } from 'react';

interface TimelineRulerProps {
  totalDuration: number;
  timelineZoom: number;
  timelineWidth: number;
  timelineInset: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  totalDuration,
  timelineZoom,
  timelineWidth,
  timelineInset
}) => {
  // Generate time markers based on zoom level
  const { majorMarkers, minorMarkers, microMarkers } = useMemo(() => {
    const majorMarkers: number[] = [];
    const minorMarkers: number[] = [];
    const microMarkers: number[] = [];
    
    // Adjust marker intervals based on zoom level
    let majorInterval = 10; // seconds
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
    
    // Generate major markers (largest ticks with labels)
    for (let t = 0; t <= maxTime; t += majorInterval) {
      majorMarkers.push(t);
    }
    
    return { majorMarkers, minorMarkers, microMarkers };
  }, [totalDuration, timelineZoom]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative" style={{ width: timelineWidth, height: '100%' }}>
      {/* Time ruler */}
      <div className="h-7 relative">
        {/* Micro tick marks (smallest - 100ms) */}
        {microMarkers.map(t => (
          <div
            key={`micro-${t}`}
            className="absolute bottom-0 w-px"
            style={{ 
              left: timelineInset + t * timelineZoom,
              height: '6px',
              background: 'var(--background-600)'
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
                background: 'var(--background-600)'
              }} 
            />
          </div>
        ))}
      </div>

      {/* Ruler bottom divider */}
      <div 
        className="absolute left-0 right-0 bg-background-500" 
        style={{ 
          top: 27, 
          height: '1px'
        }} 
      />
    </div>
  );
};
