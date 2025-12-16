import { useStore, ColorTheme, ExportPreset } from '../store/useStore';

const colorThemes: { value: ColorTheme; label: string; preview: string[] }[] = [
  { value: 'sandstone', label: 'Sandstone', preview: ['#1a1a19', '#d4772b', '#b4b847'] },
];

const defaultPresets: { value: ExportPreset; label: string }[] = [
  { value: 'youtube-1080p', label: 'YouTube 1080p' },
  { value: 'youtube-4k', label: 'YouTube 4K' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'high-quality', label: 'High Quality' },
  { value: 'small-file', label: 'Small File' },
];

export function SettingsScreen() {
  const { appSettings, setAppSettings, setCurrentScreen } = useStore();

  return (
    <div className="h-full flex flex-col bg-background-100">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-background-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentScreen('welcome')}
            className="p-2 text-text-600 hover:text-text-900 hover:bg-background-200 rounded-lg transition-colors"
            title="Back to Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-950">Settings</h1>
            <p className="text-xs text-text-500">Customize your QuickCut experience</p>
          </div>
        </div>
      </header>

      {/* Settings Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Appearance Section */}
          <section>
            <h2 className="text-sm font-medium text-text-700 uppercase tracking-wider mb-4">
              Appearance
            </h2>
            <div className="bg-background-200 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-sm text-text-900 mb-3">Color Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {colorThemes.map(theme => (
                    <button
                      key={theme.value}
                      onClick={() => setAppSettings({ colorTheme: theme.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        appSettings.colorTheme === theme.value
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-background-400 hover:border-background-500'
                      }`}
                    >
                      <div className="flex gap-1 mb-2">
                        {theme.preview.map((color, i) => (
                          <div 
                            key={i} 
                            className="w-6 h-6 rounded" 
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-text-700">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Export Defaults Section */}
          <section>
            <h2 className="text-sm font-medium text-text-700 uppercase tracking-wider mb-4">
              Export Defaults
            </h2>
            <div className="bg-background-200 rounded-xl p-5 space-y-5">
              {/* Default Format */}
              <div>
                <label className="block text-sm text-text-900 mb-2">Default Format</label>
                <select
                  value={appSettings.defaultFormat}
                  onChange={(e) => setAppSettings({ defaultFormat: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background-300 border border-background-400 rounded-lg 
                             text-text-950 focus:outline-none focus:border-primary-500"
                >
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                  <option value="mov">MOV</option>
                </select>
              </div>

              {/* Default Codec */}
              <div>
                <label className="block text-sm text-text-900 mb-2">Default Codec</label>
                <select
                  value={appSettings.defaultCodec}
                  onChange={(e) => setAppSettings({ defaultCodec: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background-300 border border-background-400 rounded-lg 
                             text-text-950 focus:outline-none focus:border-primary-500"
                >
                  <option value="h264">H.264 (Most compatible)</option>
                  <option value="h265">H.265/HEVC (Smaller files)</option>
                  <option value="vp9">VP9 (WebM)</option>
                </select>
              </div>

              {/* Default Preset */}
              <div>
                <label className="block text-sm text-text-900 mb-2">Default Export Preset</label>
                <select
                  value={appSettings.defaultPreset}
                  onChange={(e) => setAppSettings({ defaultPreset: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background-300 border border-background-400 rounded-lg 
                             text-text-950 focus:outline-none focus:border-primary-500"
                >
                  {defaultPresets.map(preset => (
                    <option key={preset.value} value={preset.value}>{preset.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Behavior Section */}
          <section>
            <h2 className="text-sm font-medium text-text-700 uppercase tracking-wider mb-4">
              Behavior
            </h2>
            <div className="bg-background-200 rounded-xl p-5 space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm text-text-900">Auto-save projects</span>
                  <p className="text-xs text-text-500 mt-0.5">
                    Automatically save project changes every few minutes
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={appSettings.autoSaveProjects}
                    onChange={(e) => setAppSettings({ autoSaveProjects: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-background-400 rounded-full peer 
                                  peer-checked:bg-primary-500 transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full 
                                  transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            </div>
          </section>

          {/* About Section */}
          <section>
            <h2 className="text-sm font-medium text-text-700 uppercase tracking-wider mb-4">
              About
            </h2>
            <div className="bg-background-200 rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl 
                                flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-text-950 font-medium">QuickCut</h3>
                  <p className="text-xs text-text-500">Version 2.0</p>
                </div>
              </div>
              <p className="text-xs text-text-500 mt-4">
                A fast and simple video editor built with Electron and FFmpeg.
              </p>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
