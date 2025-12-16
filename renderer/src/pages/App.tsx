import { useEffect } from 'react';
import {
  FileSelector,
  VideoPreview,
  ExportButton,
  ProgressBar,
  Timeline,
  ExportSettings,
  WelcomeScreen,
  SettingsScreen,
  ColorGrading,
} from '../components';
import { 
  ErrorBoundary, 
  VideoPreviewErrorBoundary, 
  TimelineErrorBoundary,
  SettingsErrorBoundary 
} from '../components/ErrorBoundary';
import { useStore } from '../store/useStore';

function EditorScreen() {
  const { 
    undo, redo, canUndo, canRedo, 
    projectDirty, projectPath, 
    getProjectData, loadProjectData, 
    setProjectPath, setProjectDirty,
    setCurrentScreen,
    isDarkMode,
    toggleDarkMode
  } = useStore();

  // Save project
  const handleSaveProject = async () => {
    const projectData = getProjectData();
    const result = await window.quickcut.saveProject(projectData, projectPath || undefined);
    if (result.success && result.path) {
      setProjectPath(result.path);
      setProjectDirty(false);
    }
  };

  // Load project
  const handleLoadProject = async () => {
    const result = await window.quickcut.loadProject();
    if (result.success && result.data) {
      loadProjectData(result.data);
      if (result.path) setProjectPath(result.path);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl + Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
      }
      // Open: Ctrl/Cmd + O
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleLoadProject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, projectPath]);

  return (
    <div className="h-full flex flex-col bg-background-100">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-background-200">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => setCurrentScreen('welcome')}
            className="p-1.5 text-text-600 hover:text-text-900 hover:bg-background-300 rounded-lg transition-colors"
            title="Back to Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg 
                          flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-text-950">QuickCut</h1>
          {projectDirty && <span className="text-xs text-amber-500">Unsaved</span>}
          
          {/* Project buttons */}
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={handleLoadProject}
              className="px-2 py-1 text-xs text-text-700 hover:text-text-950 hover:bg-background-300 rounded transition-colors"
              title="Open Project (Ctrl+O)"
            >
              Open
            </button>
            <button
              onClick={handleSaveProject}
              className="px-2 py-1 text-xs text-text-700 hover:text-text-950 hover:bg-background-300 rounded transition-colors"
              title="Save Project (Ctrl+S)"
            >
              Save
            </button>
          </div>
          
          <div className="flex-1" />
          
          {/* Undo/Redo buttons */}
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 text-text-600 hover:text-text-900 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 text-text-600 hover:text-text-900 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          
          {/* Dark/Light Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 ml-2 text-text-600 hover:text-text-900 hover:bg-background-300 rounded-lg transition-colors"
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Controls */}
        <aside className="w-72 flex-shrink-0 border-r border-background-200 overflow-y-auto p-3 space-y-3">
          <ErrorBoundary>
            <FileSelector />
          </ErrorBoundary>
          <ErrorBoundary>
            <ColorGrading />
          </ErrorBoundary>
          <ErrorBoundary>
            <ExportSettings />
          </ErrorBoundary>
          <ErrorBoundary>
            <ExportButton />
          </ErrorBoundary>
        </aside>

        {/* Right Panel - Preview */}
        <section className="flex-1 p-3 flex flex-col min-w-0">
          <VideoPreviewErrorBoundary>
            <VideoPreview />
          </VideoPreviewErrorBoundary>
        </section>
      </main>

      {/* Timeline */}
      <footer className="flex-shrink-0">
        <TimelineErrorBoundary>
          <Timeline />
        </TimelineErrorBoundary>
      </footer>

      {/* Progress Notification */}
      <ErrorBoundary>
        <ProgressBar />
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  const { currentScreen, appSettings } = useStore();

  // Apply theme to document (dark mode class)
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  switch (currentScreen) {
    case 'welcome':
      return (
        <ErrorBoundary>
          <WelcomeScreen />
        </ErrorBoundary>
      );
    case 'settings':
      return (
        <SettingsErrorBoundary>
          <SettingsScreen />
        </SettingsErrorBoundary>
      );
    case 'editor':
    default:
      return (
        <ErrorBoundary>
          <EditorScreen />
        </ErrorBoundary>
      );
  }
}
