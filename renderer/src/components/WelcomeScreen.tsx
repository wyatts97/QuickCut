import { useCallback, useState } from 'react';
import { useStore } from '../store/useStore';

export function WelcomeScreen() {
  const { 
    setVideoFile, 
    goToEditor, 
    setCurrentScreen,
    loadProjectData,
    setProjectPath,
    isDarkMode,
    toggleDarkMode
  } = useStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Handle file upload
  const handleFileSelect = async () => {
    const file = await window.quickcut.openFile();
    if (file) {
      setVideoFile(file);
      goToEditor();
    }
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(f => 
      f.type.startsWith('video/') || 
      /\.(mp4|mov|avi|mkv|webm|m4v|wmv|flv)$/i.test(f.name)
    );
    
    if (videoFile) {
      // Note: In Electron, we'd need to handle this via IPC to get full file path
      // For now, trigger the file dialog
      handleFileSelect();
    }
  }, []);

  // Handle open project
  const handleOpenProject = async () => {
    setLoadError(null);
    const result = await window.quickcut.loadProject();
    
    if (result.cancelled) return;
    
    if (!result.success) {
      setLoadError(result.error || 'Failed to load project');
      return;
    }
    
    if (result.data) {
      loadProjectData(result.data);
      if (result.path) setProjectPath(result.path);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background-100 p-8 relative">
      {/* Dark/Light Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 p-2 text-text-600 hover:text-text-900 hover:bg-background-300 rounded-lg transition-colors"
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDarkMode ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {/* Logo & Title */}
      <div className="flex items-center gap-4 mb-12">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl 
                        flex items-center justify-center shadow-lg shadow-primary-500/20">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-text-950">QuickCut</h1>
          <p className="text-text-600 text-sm">Fast & Simple Video Editing</p>
        </div>
      </div>

      {/* Upload Area */}
      <div 
        className={`w-full max-w-lg mb-10 p-8 border-2 border-dashed rounded-2xl 
                    transition-all duration-200 cursor-pointer
                    ${isDragging 
                      ? 'border-primary-500 bg-primary-500/10' 
                      : 'border-background-400 hover:border-background-500 bg-background-200/50 hover:bg-background-200'}`}
        onClick={handleFileSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4
                          ${isDragging ? 'bg-primary-500/20' : 'bg-background-300'}`}>
            <svg className={`w-8 h-8 ${isDragging ? 'text-primary-500' : 'text-text-600'}`} 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-900 mb-1">
            {isDragging ? 'Drop your video here' : 'Drop a video file here'}
          </h3>
          <p className="text-sm text-text-500">
            or click to browse
          </p>
          <p className="text-xs text-text-400 mt-3">
            Supports MP4, MOV, WebM, MKV, AVI, and more
          </p>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleFileSelect}
          className="w-full py-3 px-6 bg-gradient-to-r from-primary-600 to-primary-500 
                     hover:from-primary-500 hover:to-primary-400 text-white font-medium rounded-xl
                     transition-all duration-200 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40
                     flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          QuickCut
        </button>

        <button
          onClick={handleOpenProject}
          className="w-full py-3 px-6 bg-background-300 hover:bg-background-400 text-text-900 
                     font-medium rounded-xl transition-all duration-200
                     flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
          Open Project
        </button>

        <button
          onClick={() => setCurrentScreen('settings')}
          className="w-full py-3 px-6 bg-background-200 hover:bg-background-300 text-text-600 hover:text-text-700
                     font-medium rounded-xl transition-all duration-200
                     flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>

      {/* Error message */}
      {loadError && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg max-w-xs">
          <p className="text-sm text-red-400 text-center">{loadError}</p>
          <p className="text-xs text-red-500/70 text-center mt-1">
            Create a new project or locate the project file
          </p>
        </div>
      )}

      {/* Version */}
      <p className="absolute bottom-4 text-xs text-text-400">v2.0</p>
    </div>
  );
}
