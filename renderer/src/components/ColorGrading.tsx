import { useState, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';

// Picture settings interface
export interface PictureSettings {
  brightness: number;    // -100 to 100
  contrast: number;      // -100 to 100
  saturation: number;    // -100 to 100
  gamma: number;         // 0.2 to 2.5
  vibrance: number;      // -100 to 100
}

const DEFAULT_SETTINGS: PictureSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  gamma: 1.0,
  vibrance: 0,
};

export const ColorGrading: React.FC = () => {
  const [settings, setSettings] = useState<PictureSettings>(DEFAULT_SETTINGS);
  const [isExpanded, setIsExpanded] = useState(true);

  const { videoFile } = useStore();

  // Generate CSS filter string for preview
  const generateCSSFilter = useCallback((s: PictureSettings): string => {
    const filters: string[] = [];
    filters.push(`brightness(${100 + s.brightness}%)`);
    filters.push(`contrast(${100 + s.contrast}%)`);
    filters.push(`saturate(${100 + s.saturation + s.vibrance}%)`);
    if (s.gamma !== 1.0) {
      const gammaAdjust = Math.pow(s.gamma, 0.5) * 100;
      filters.push(`brightness(${gammaAdjust}%)`);
    }
    return filters.join(' ');
  }, []);

  // Apply settings to video element for preview
  useEffect(() => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      const filterString = generateCSSFilter(settings);
      video.style.filter = filterString;
    }
  }, [settings, generateCSSFilter]);

  const handleSettingChange = useCallback((key: keyof PictureSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.style.filter = '';
    }
  }, []);

  if (!videoFile) {
    return null;
  }

  return (
    <div className="bg-background-200 rounded-lg p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-text-900">Picture Settings</span>
        <svg 
          className={`w-4 h-4 text-text-600 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Brightness */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-700">Brightness</span>
              <span className="text-text-500">{settings.brightness}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.brightness}
              onChange={(e) => handleSettingChange('brightness', Number(e.target.value))}
              className="w-full h-1.5 bg-background-400 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>

          {/* Contrast */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-700">Contrast</span>
              <span className="text-text-500">{settings.contrast}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.contrast}
              onChange={(e) => handleSettingChange('contrast', Number(e.target.value))}
              className="w-full h-1.5 bg-background-400 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>

          {/* Saturation */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-700">Saturation</span>
              <span className="text-text-500">{settings.saturation}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.saturation}
              onChange={(e) => handleSettingChange('saturation', Number(e.target.value))}
              className="w-full h-1.5 bg-background-400 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>

          {/* Vibrance */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-700">Vibrance</span>
              <span className="text-text-500">{settings.vibrance}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.vibrance}
              onChange={(e) => handleSettingChange('vibrance', Number(e.target.value))}
              className="w-full h-1.5 bg-background-400 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>

          {/* Gamma */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-700">Gamma</span>
              <span className="text-text-500">{settings.gamma.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.05"
              value={settings.gamma}
              onChange={(e) => handleSettingChange('gamma', Number(e.target.value))}
              className="w-full h-1.5 bg-background-400 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="w-full mt-2 px-3 py-1.5 text-xs font-medium bg-background-300 hover:bg-background-400 text-text-700 rounded transition-colors"
          >
            Reset All
          </button>
        </div>
      )}
    </div>
  );
};

export default ColorGrading;

