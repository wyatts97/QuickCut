import { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getOutputFileName } from '../utils/format';

export function ExportButton() {
  const { 
    videoFile, 
    clips,
    crop, 
    exportSettings,
    processingStatus,
    setProcessingStatus,
    setProgress,
    setErrorMessage 
  } = useStore();

  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleExport = async () => {
    if (!videoFile) return;

    const defaultName = getOutputFileName(videoFile.name, exportSettings.format);
    const outputPath = await window.quickcut.saveFile(defaultName, exportSettings.format);
    
    if (!outputPath) return;

    setProcessingStatus('processing');
    setProgress(0);
    setErrorMessage(null);

    progressIntervalRef.current = window.setInterval(async () => {
      const progress = await window.quickcut.getProgress();
      setProgress(progress);
    }, 200);

    try {
      // Build clips array for timeline export - sorted by startTime
      const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
      const exportClips = sortedClips.map(clip => ({
        sourcePath: clip.sourceFile.path,
        inPoint: clip.inPoint,
        outPoint: clip.outPoint,
      }));

      const result = await window.quickcut.exportTimeline({
        clips: exportClips,
        outputPath,
        format: exportSettings.format,
        crop: crop.enabled ? { x: crop.x, y: crop.y, width: crop.width, height: crop.height } : undefined,
        codec: exportSettings.codec,
        resolution: exportSettings.resolution,
        fps: exportSettings.fps,
        bitrate: exportSettings.bitrate,
        crf: exportSettings.crf,
        speed: exportSettings.speed,
      });

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      if (result.success) {
        setProgress(100);
        setProcessingStatus('completed');
      } else {
        setErrorMessage(result.error || 'Unknown error occurred');
        setProcessingStatus('error');
      }
    } catch (error) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setErrorMessage((error as Error).message);
      setProcessingStatus('error');
    }
  };

  const isDisabled = !videoFile || processingStatus === 'processing';

  return (
    <button
      onClick={handleExport}
      disabled={isDisabled}
      className="w-full px-4 py-3 disabled:opacity-50 
                 disabled:cursor-not-allowed text-white font-medium rounded-lg 
                 transition-colors duration-150 flex items-center justify-center gap-2"
      style={{
        background: isDisabled ? '#7f2d1e' : '#c2410c',
      }}
      onMouseEnter={(e) => !isDisabled && (e.currentTarget.style.background = '#9a3412')}
      onMouseLeave={(e) => !isDisabled && (e.currentTarget.style.background = '#c2410c')}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      {processingStatus === 'processing' ? 'Exporting...' : 'Export Video'}
    </button>
  );
}
