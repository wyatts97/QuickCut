import { useStore } from '../store/useStore';

const resolutions = [
  { label: 'Source', value: 'source' },
  { label: '4K', value: '3840x2160' },
  { label: '1440p', value: '2560x1440' },
  { label: '1080p', value: '1920x1080' },
  { label: '720p', value: '1280x720' },
  { label: '480p', value: '854x480' },
];

const fpsOptions = [
  { label: 'Source', value: 'source' },
  { label: '60', value: 60 },
  { label: '30', value: 30 },
  { label: '24', value: 24 },
];

const speedPresets = [
  { label: 'Ultrafast', value: 'ultrafast', desc: 'Fastest, larger file' },
  { label: 'Superfast', value: 'superfast', desc: 'Very fast' },
  { label: 'Veryfast', value: 'veryfast', desc: 'Fast encoding' },
  { label: 'Faster', value: 'faster', desc: 'Above average' },
  { label: 'Fast', value: 'fast', desc: 'Faster than medium' },
  { label: 'Medium', value: 'medium', desc: 'Balanced (default)' },
  { label: 'Slow', value: 'slow', desc: 'Better compression' },
  { label: 'Slower', value: 'slower', desc: 'Even better' },
  { label: 'Veryslow', value: 'veryslow', desc: 'Best compression' },
];

export function ExportSettings() {
  const { exportSettings, setExportSettings, videoFile, processingStatus } = useStore();
  const isDisabled = processingStatus === 'processing';

  const handleResolutionChange = (value: string) => {
    if (value === 'source') {
      setExportSettings({ resolution: 'source' });
    } else {
      const [width, height] = value.split('x').map(Number);
      setExportSettings({ resolution: { width, height } });
    }
  };

  const handleFpsChange = (value: string) => {
    if (value === 'source') {
      setExportSettings({ fps: 'source' });
    } else {
      setExportSettings({ fps: parseInt(value) });
    }
  };

  const getResolutionValue = () => {
    if (exportSettings.resolution === 'source') return 'source';
    return `${exportSettings.resolution.width}x${exportSettings.resolution.height}`;
  };

  const getFpsValue = () => {
    if (exportSettings.fps === 'source') return 'source';
    return exportSettings.fps.toString();
  };

  // Estimate file size (very rough estimate)
  const estimateFileSize = () => {
    if (!videoFile) return null;
    const duration = videoFile.duration;
    let bitrate = exportSettings.bitrate === 'auto' 
      ? (exportSettings.crf <= 20 ? 15000 : exportSettings.crf <= 25 ? 8000 : 4000)
      : exportSettings.bitrate;
    const sizeBytes = (bitrate * 1000 * duration) / 8;
    if (sizeBytes > 1024 * 1024 * 1024) {
      return `~${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    return `~${(sizeBytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  if (!videoFile) return null;

  return (
    <div className="bg-background-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-900">Export Settings</h3>
        {estimateFileSize() && (
          <span className="text-xs text-text-700">Est. {estimateFileSize()}</span>
        )}
      </div>

      {/* Export options */}
      <div className="space-y-3">
        {/* Format */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label className="block text-xs text-text-800 mb-1">Format</label>
            <select
              value={exportSettings.format}
              onChange={(e) => setExportSettings({ format: e.target.value as any })}
              disabled={isDisabled}
              className="w-full px-2 py-1.5 bg-background-300 border border-background-400 rounded text-xs 
                         text-text-950 focus:outline-none focus:border-primary-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="mp4">MP4</option>
              <option value="mov">MOV</option>
              <option value="webm">WebM</option>
              <option value="avi">AVI</option>
              <option value="mkv">MKV</option>
              <option value="wmv">WMV</option>
              <option value="flv">FLV</option>
              <option value="gif">GIF</option>
            </select>
          </div>
          
          {/* Codec */}
          <div className="col-span-2">
            <label className="block text-xs text-text-800 mb-1">Codec</label>
            <select
              value={exportSettings.codec}
              onChange={(e) => setExportSettings({ codec: e.target.value as any })}
              disabled={isDisabled}
              className="w-full px-2 py-1.5 bg-background-300 border border-background-400 rounded text-xs 
                         text-text-950 focus:outline-none focus:border-primary-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="h264">H.264 (Most compatible)</option>
              <option value="h265">H.265/HEVC (Smaller)</option>
              <option value="vp9">VP9 (WebM)</option>
              <option value="prores">ProRes (High quality)</option>
              <option value="mpeg4">MPEG-4</option>
            </select>
          </div>
        </div>

        {/* Resolution & FPS */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-text-800 mb-1">Resolution</label>
            <select
              value={getResolutionValue()}
              onChange={(e) => handleResolutionChange(e.target.value)}
              disabled={isDisabled}
              className="w-full px-2 py-1.5 bg-background-300 border border-background-400 rounded text-xs 
                         text-text-950 focus:outline-none focus:border-primary-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resolutions.map(res => (
                <option key={res.value} value={res.value}>{res.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-text-800 mb-1">Frame Rate</label>
            <select
              value={getFpsValue()}
              onChange={(e) => handleFpsChange(e.target.value)}
              disabled={isDisabled}
              className="w-full px-2 py-1.5 bg-background-300 border border-background-400 rounded text-xs 
                         text-text-950 focus:outline-none focus:border-primary-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fpsOptions.map(fps => (
                <option key={fps.value} value={fps.value}>{fps.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Speed & Quality */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-text-800 mb-1">Speed</label>
            <select
              value={exportSettings.speed || 'medium'}
              onChange={(e) => setExportSettings({ speed: e.target.value as any })}
              disabled={isDisabled}
              className="w-full px-2 py-1.5 bg-background-300 border border-background-400 rounded text-xs 
                         text-text-950 focus:outline-none focus:border-primary-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {speedPresets.map(preset => (
                <option key={preset.value} value={preset.value}>{preset.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-text-800 mb-1">Quality (CRF: {exportSettings.crf})</label>
            <input
              type="range"
              min={15}
              max={35}
              value={exportSettings.crf}
              onChange={(e) => setExportSettings({ crf: parseInt(e.target.value) })}
              disabled={isDisabled}
              className="w-full h-2 bg-background-400 rounded-lg appearance-none cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
