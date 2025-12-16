import { useStore } from '../store/useStore';

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
          <div className="mt-2 grid grid-cols-2 gap-2 text-text-700 text-xs min-w-0">
            <span className="truncate" title={`Duration: ${videoFile.duration.toFixed(2)}s`}>
              Duration: {videoFile.duration.toFixed(2)}s
            </span>
            <span className="truncate" title={`Size: ${videoFile.width}×${videoFile.height}`}>
              Size: {videoFile.width}×{videoFile.height}
            </span>
            <span className="truncate" title={`Codec: ${videoFile.codec}`}>
              Codec: {videoFile.codec}
            </span>
            <span className="truncate" title={`Format: ${videoFile.format}`}>
              Format: {videoFile.format}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
