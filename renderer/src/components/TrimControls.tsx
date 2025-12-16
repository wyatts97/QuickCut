import { useStore } from '../store/useStore';
import { formatTime } from '../utils/format';

export function TrimControls() {
  const { videoFile, trim, setTrim, processingStatus } = useStore();

  if (!videoFile) return null;

  const isDisabled = processingStatus === 'processing';

  const handleStartChange = (value: number) => {
    const clamped = Math.max(0, Math.min(value, trim.endTime - 0.1));
    setTrim({ startTime: clamped, enabled: true });
  };

  const handleEndChange = (value: number) => {
    const clamped = Math.max(trim.startTime + 0.1, Math.min(value, videoFile.duration));
    setTrim({ endTime: clamped, enabled: true });
  };

  const toggleEnabled = () => {
    setTrim({ enabled: !trim.enabled });
  };

  const duration = trim.endTime - trim.startTime;

  return (
    <div className="bg-background-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-900">Trim</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={trim.enabled}
            onChange={toggleEnabled}
            disabled={isDisabled}
            className="w-4 h-4 rounded bg-background-300 border-background-400 text-primary-500 
                       focus:ring-primary-500 focus:ring-offset-background-200"
          />
          <span className="text-xs text-text-600">Enable</span>
        </label>
      </div>

      <div className={`space-y-3 ${!trim.enabled ? 'opacity-50' : ''}`}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-600 mb-1">Start Time (s)</label>
            <input
              type="number"
              value={trim.startTime.toFixed(2)}
              onChange={(e) => handleStartChange(parseFloat(e.target.value) || 0)}
              disabled={isDisabled || !trim.enabled}
              min={0}
              max={trim.endTime - 0.1}
              step={0.1}
              className="w-full px-3 py-2 bg-background-300 border border-background-400 rounded-lg 
                         text-sm text-text-950 focus:outline-none focus:border-primary-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs text-text-600 mb-1">End Time (s)</label>
            <input
              type="number"
              value={trim.endTime.toFixed(2)}
              onChange={(e) => handleEndChange(parseFloat(e.target.value) || 0)}
              disabled={isDisabled || !trim.enabled}
              min={trim.startTime + 0.1}
              max={videoFile.duration}
              step={0.1}
              className="w-full px-3 py-2 bg-background-300 border border-background-400 rounded-lg 
                         text-sm text-text-950 focus:outline-none focus:border-primary-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-600 pt-1">
          <span>Duration: {formatTime(duration)}</span>
          <span>Original: {formatTime(videoFile.duration)}</span>
        </div>
      </div>
    </div>
  );
}
