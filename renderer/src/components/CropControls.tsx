import { useStore } from '../store/useStore';

export function CropControls() {
  const { videoFile, crop, setCrop, processingStatus } = useStore();
  const isDisabled = processingStatus === 'processing';

  if (!videoFile) return null;

  const toggleEnabled = () => {
    if (!crop.enabled) {
      setCrop({
        enabled: true,
        x: 0,
        y: 0,
        width: videoFile.width,
        height: videoFile.height,
      });
    } else {
      setCrop({ enabled: false });
    }
  };

  const handleInputChange = (field: 'x' | 'y' | 'width' | 'height', value: number) => {
    const newCrop = { ...crop, [field]: value, enabled: true };
    
    if (field === 'x') {
      newCrop.x = Math.max(0, Math.min(value, videoFile.width - crop.width));
    } else if (field === 'y') {
      newCrop.y = Math.max(0, Math.min(value, videoFile.height - crop.height));
    } else if (field === 'width') {
      newCrop.width = Math.max(1, Math.min(value, videoFile.width - crop.x));
    } else if (field === 'height') {
      newCrop.height = Math.max(1, Math.min(value, videoFile.height - crop.y));
    }
    
    setCrop(newCrop);
  };

  return (
    <div className="bg-background-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-900">Crop</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={crop.enabled}
            onChange={toggleEnabled}
            disabled={isDisabled}
            className="w-4 h-4 rounded bg-background-300 border-background-400 text-primary-500 
                       focus:ring-primary-500 focus:ring-offset-background-200"
          />
          <span className="text-xs text-text-600">Enable</span>
        </label>
      </div>

      {crop.enabled && (
        <div className="space-y-3">
          <p className="text-xs text-text-500">
            Drag the crop overlay on the video preview, or enter values below:
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-text-600 mb-1">X</label>
              <input
                type="number"
                value={crop.x}
                onChange={(e) => handleInputChange('x', parseInt(e.target.value) || 0)}
                disabled={isDisabled}
                min={0}
                max={videoFile.width - crop.width}
                className="w-full px-2 py-1.5 bg-background-300 border border-background-400 rounded 
                           text-xs text-text-950 focus:outline-none focus:border-primary-500
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-text-600 mb-1">Y</label>
              <input
                type="number"
                value={crop.y}
                onChange={(e) => handleInputChange('y', parseInt(e.target.value) || 0)}
                disabled={isDisabled}
                min={0}
                max={videoFile.height - crop.height}
                className="w-full px-2 py-1.5 bg-background-300 border border-background-400 rounded 
                           text-xs text-text-950 focus:outline-none focus:border-primary-500
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-text-600 mb-1">Width</label>
              <input
                type="number"
                value={crop.width}
                onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 1)}
                disabled={isDisabled}
                min={1}
                max={videoFile.width - crop.x}
                className="w-full px-2 py-1.5 bg-background-300 border border-background-400 rounded 
                           text-xs text-text-950 focus:outline-none focus:border-primary-500
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-text-600 mb-1">Height</label>
              <input
                type="number"
                value={crop.height}
                onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 1)}
                disabled={isDisabled}
                min={1}
                max={videoFile.height - crop.y}
                className="w-full px-2 py-1.5 bg-background-300 border border-background-400 rounded 
                           text-xs text-text-950 focus:outline-none focus:border-primary-500
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
