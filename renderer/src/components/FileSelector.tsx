import { useStore } from '../store/useStore';

// Format duration in seconds to readable format (MM:SS or HH:MM:SS)
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

export function FileSelector() {
  const { videoFile, setVideoFile, processingStatus } = useStore();

  const handleOpenFile = async () => {
    const file = await window.quickcut.openFile();
    if (file) {
      setVideoFile(file);
    }
  };

  const isDisabled = processingStatus === 'processing';

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleOpenFile}
        disabled={isDisabled}
        className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 
                   disabled:cursor-not-allowed text-white font-medium rounded-lg 
                   transition-colors duration-150 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        {videoFile ? 'Change Video' : 'Open Video'}
      </button>

      {videoFile && (
        <div className="bg-background-200 rounded-lg p-3 text-sm">
          <p className="text-text-900 font-medium truncate" title={videoFile.name}>
            {videoFile.name}
          </p>
          <div className="mt-3 space-y-2 text-xs">
            {/* File Type and Size */}
            <div className="flex justify-between items-center">
              <span className="text-text-600">File Type:</span>
              <span className="text-text-900 font-medium">{videoFile.format ? videoFile.format.toUpperCase() : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-600">File Size:</span>
              <span className="text-text-900 font-medium">
                {videoFile.size && !isNaN(videoFile.size) 
                  ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` 
                  : 'N/A'
                }
              </span>
            </div>
            
            {/* Video Dimensions */}
            <div className="flex justify-between items-center">
              <span className="text-text-600">Dimensions:</span>
              <span className="text-text-900 font-medium">{videoFile.width} × {videoFile.height}</span>
            </div>
            
            {/* Duration */}
            <div className="flex justify-between items-center">
              <span className="text-text-600">Duration:</span>
              <span className="text-text-900 font-medium">{formatDuration(videoFile.duration)}</span>
            </div>
            
            {/* Codec */}
            <div className="flex justify-between items-center">
              <span className="text-text-600">Codec:</span>
              <span className="text-text-900 font-medium">{videoFile.codec}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
