import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Enhanced video file interface with more specific types
export interface VideoFile {
  path: string;
  name: string;
  duration: number;
  width: number;
  height: number;
  codec: string;
  format: string;
  bitrate?: number;
  frameRate?: number;
  aspectRatio: string;
  size: number; // file size in bytes
}

// Enhanced trim settings with validation
export interface TrimSettings {
  startTime: number;
  endTime: number;
  enabled: boolean;
}

// Enhanced crop settings with constraints
export interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  enabled: boolean;
}

// More specific output formats
export type OutputFormat = 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv' | 'wmv' | 'flv' | 'gif';

// Processing status with more granular states
export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error' | 'cancelled' | 'paused';

// Enhanced timeline clip model with more metadata
export interface TimelineClip {
  id: string;
  sourceFile: VideoFile;
  inPoint: number;      // start time in source
  outPoint: number;     // end time in source
  startTime: number;    // position on timeline
  trackIndex?: number;  // track index for multi-track support
  muted?: boolean;      // audio mute state
  volume?: number;      // volume level 0-1
  speed?: number;       // playback speed
}

// Export presets with specific configurations
export type ExportPreset = 
  | 'youtube-1080p' 
  | 'youtube-4k' 
  | 'twitter' 
  | 'instagram' 
  | 'tiktok' 
  | 'high-quality' 
  | 'small-file' 
  | 'custom';

// FFmpeg speed presets with performance characteristics
export type FFmpegSpeed = 
  | 'ultrafast' 
  | 'superfast' 
  | 'veryfast' 
  | 'faster' 
  | 'fast' 
  | 'medium' 
  | 'slow' 
  | 'slower' 
  | 'veryslow';

// Enhanced export settings with validation
export interface ExportSettings {
  preset: ExportPreset;
  format: OutputFormat;
  codec: 'h264' | 'h265' | 'vp9' | 'prores' | 'mpeg4';
  resolution: { width: number; height: number } | 'source';
  fps: number | 'source';
  bitrate: number | 'auto';  // kbps
  crf: number;               // 0-51, lower = better quality
  speed: FFmpegSpeed;        // FFmpeg encoding speed preset
  audioCodec?: 'aac' | 'mp3' | 'opus' | 'none';
  audioBitrate?: number;     // kbps
  audioSampleRate?: number;  // Hz
}

// History state with version tracking
interface HistoryState {
  version: number;
  timestamp: number;
  clips: TimelineClip[];
  crop: CropSettings;
  exportSettings: ExportSettings;
  playheadTime: number;
}

// App screen navigation with more specific types
export type AppScreen = 'welcome' | 'editor' | 'settings' | 'export';

// Color themes with specific configurations
export type ColorTheme = 'sandstone' | 'dark' | 'light';

// Enhanced app settings with validation
export interface AppSettings {
  colorTheme: ColorTheme;
  defaultFormat: OutputFormat;
  defaultCodec: 'h264' | 'h265' | 'vp9';
  defaultPreset: ExportPreset;
  autoSaveProjects: boolean;
  isDarkMode: boolean;
  language: 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';
  autoBackup: boolean;
  maxHistorySize: number;
}

// Keyboard shortcuts configuration
export interface KeyboardShortcuts {
  playPause: string;
  split: string;
  delete: string;
  crop: string;
  undo: string;
  redo: string;
  save: string;
  export: string;
}

// Project metadata
export interface ProjectMetadata {
  name: string;
  createdAt: Date;
  updatedAt: Date;
  duration: number;
  clipCount: number;
  settings: ExportSettings;
}

// Project data structure for serialization
export interface ProjectData {
  version: string;
  metadata: ProjectMetadata;
  videoFile: VideoFile | null;
  clips: TimelineClip[];
  trim: TrimSettings;
  crop: CropSettings;
  exportSettings: ExportSettings;
  playheadTime: number;
  timelineZoom: number;
  appSettings: AppSettings;
}

// Enhanced app state with better type safety
interface AppState {
  // App navigation
  currentScreen: AppScreen;
  appSettings: AppSettings;
  projectMetadata?: ProjectMetadata;
  
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  // Video & editing
  videoFile: VideoFile | null;
  clips: TimelineClip[];
  playheadTime: number;
  timelineZoom: number;
  isPlaying: boolean;
  trim: TrimSettings;
  crop: CropSettings;
  exportSettings: ExportSettings;
  
  // Processing
  processingStatus: ProcessingStatus;
  processingProgress: number;
  processingError?: string;
  
  // History (undo/redo)
  history: HistoryState[];
  historyIndex: number;
  
  // Selection
  selectedClipIds: string[];
  
  // Keyboard shortcuts
  keyboardShortcuts: KeyboardShortcuts;
  
  // Project
  projectPath: string | null;
  projectDirty: boolean;

  setVideoFile: (file: VideoFile | null) => void;
  setTrim: (trim: Partial<TrimSettings>) => void;
  setCrop: (crop: Partial<CropSettings>) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setProcessingStatus: (status: ProcessingStatus) => void;
  setProcessingProgress: (progress: number) => void;
  setProcessingError: (error: string | undefined) => void;
  resetEditSettings: () => void;
  reset: () => void;
  
  // Timeline actions with validation
  setPlayheadTime: (time: number) => void;
  setTimelineZoom: (zoom: number) => void;
  setIsPlaying: (playing: boolean) => void;
  addClip: (clip: TimelineClip) => void;
  addVideoToTimeline: (file: VideoFile) => void;
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  removeClip: (id: string) => void;
  splitClipAtPlayhead: (clipId: string) => void;
  rippleDelete: (clipId: string) => void;
  selectClips: (clipIds: string[]) => void;
  clearSelection: () => void;
  
  // Enhanced undo/redo with type safety
  undo: () => boolean;
  redo: () => boolean;
  pushHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  
  // Project management with validation
  setProjectPath: (path: string | null) => void;
  setProjectDirty: (dirty: boolean) => void;
  getProjectData: () => ProjectData;
  loadProjectData: (data: ProjectData) => void;
  saveProject: () => Promise<void>;
  loadProject: (path: string) => Promise<void>;
  
  // Navigation & Settings
  setCurrentScreen: (screen: AppScreen) => void;
  setAppSettings: (settings: Partial<AppSettings>) => void;
  goToEditor: () => void;
}

const initialTrim: TrimSettings = {
  startTime: 0,
  endTime: 0,
  enabled: false,
};

const initialCrop: CropSettings = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  enabled: false,
};

const initialExportSettings: ExportSettings = {
  preset: 'youtube-1080p',
  format: 'mp4',
  codec: 'h264',
  resolution: 'source',
  fps: 'source',
  bitrate: 'auto',
  crf: 23,
  speed: 'medium',
};

const initialAppSettings: AppSettings = {
  colorTheme: 'sandstone',
  defaultFormat: 'mp4',
  defaultCodec: 'h264',
  defaultPreset: 'youtube-1080p',
  autoSaveProjects: false,
  isDarkMode: true,
  language: 'en',
  autoBackup: true,
  maxHistorySize: 50
};

const generateClipId = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useStore = create<AppState>((set, get) => ({
  // App navigation
  currentScreen: 'welcome',
  appSettings: initialAppSettings,
  
  // Theme
  isDarkMode: true,
  toggleDarkMode: () => {
    const newDarkMode = !get().isDarkMode;
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ isDarkMode: newDarkMode });
  },
  
  // Video & Timeline
  videoFile: null,
  clips: [],
  playheadTime: 0,
  timelineZoom: 50, // 50px per second default
  isPlaying: false,
  
  // Edit settings
  trim: initialTrim,
  crop: initialCrop,
  exportSettings: initialExportSettings,
  
  // Processing
  processingStatus: 'idle',
  processingProgress: 0,
  processingError: undefined,
  
  // History
  history: [],
  historyIndex: -1,
  
  // Selection
  selectedClipIds: [],
  
  // Keyboard shortcuts
  keyboardShortcuts: {
    playPause: 'Space',
    split: 'S',
    delete: 'Delete',
    crop: 'C',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    save: 'Ctrl+S',
    export: 'Ctrl+E'
  },
  
  // Project
  projectPath: null,
  projectDirty: false,

  setVideoFile: (file: VideoFile | null) => {
    const clips: TimelineClip[] = file ? [{
      id: generateClipId(),
      sourceFile: file,
      inPoint: 0,
      outPoint: file.duration,
      startTime: 0,
    }] : [];
    
    set({ 
      videoFile: file,
      clips,
      playheadTime: 0,
      trim: file ? { 
        startTime: 0, 
        endTime: file.duration, 
        enabled: false 
      } : initialTrim,
      crop: file ? {
        x: 0,
        y: 0,
        width: file.width,
        height: file.height,
        enabled: false,
      } : initialCrop,
      processingStatus: 'idle',
      processingProgress: 0,
      processingError: undefined,
      projectDirty: true,
    });
  },

  setTrim: (trim: Partial<TrimSettings>) => set((state) => ({
    trim: { ...state.trim, ...trim },
    projectDirty: true,
  })),

  setCrop: (crop: Partial<CropSettings>) => {
    (get() as any).pushHistory();
    set((state) => ({
      crop: { ...state.crop, ...crop },
      projectDirty: true,
    }));
  },

  setOutputFormat: (format: OutputFormat) => set({ 
    exportSettings: { ...get().exportSettings, format },
  }),
  
  setExportSettings: (settings: Partial<ExportSettings>) => set((state) => ({
    exportSettings: { ...state.exportSettings, ...settings },
  })),

  setProcessingStatus: (status: ProcessingStatus) => set({ processingStatus: status }),

  setProcessingProgress: (progress: number) => set({ processingProgress: progress }),

  setProcessingError: (error: string | undefined) => set({ processingError: error }),

  resetEditSettings: () => {
    const { videoFile } = get();
    set({
      trim: videoFile ? {
        startTime: 0,
        endTime: videoFile.duration,
        enabled: false,
      } : initialTrim,
      crop: videoFile ? {
        x: 0,
        y: 0,
        width: videoFile.width,
        height: videoFile.height,
        enabled: false,
      } : initialCrop,
    });
  },

  reset: () => set({
    videoFile: null,
    clips: [],
    playheadTime: 0,
    timelineZoom: 50,
    isPlaying: false,
    trim: initialTrim,
    crop: initialCrop,
    exportSettings: initialExportSettings,
    processingStatus: 'idle',
    processingProgress: 0,
    processingError: undefined,
    history: [],
    historyIndex: -1,
    projectPath: null,
    projectDirty: false,
    selectedClipIds: [],
  }),
  
  // Timeline actions
  setPlayheadTime: (time: number) => set({ playheadTime: Math.max(0, time) }),
  
  setTimelineZoom: (zoom: number) => set({ timelineZoom: Math.max(10, Math.min(200, zoom)) }),
  
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  
  addClip: (clip: TimelineClip) => {
    (get() as any).pushHistory();
    set((state) => ({
      clips: [...state.clips, clip],
      projectDirty: true,
    }));
  },
  
  addVideoToTimeline: (file: VideoFile) => {
    const { clips } = get();
    (get() as any).pushHistory();
    
    // Calculate the end of the last clip to place new video after it
    const timelineEnd = clips.reduce((max, clip) => {
      const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
      return Math.max(max, clipEnd);
    }, 0);
    
    const newClip: TimelineClip = {
      id: generateClipId(),
      sourceFile: file,
      inPoint: 0,
      outPoint: file.duration,
      startTime: timelineEnd,
    };
    
    set((state) => ({
      clips: [...state.clips, newClip],
      projectDirty: true,
    }));
  },
  
  updateClip: (id: string, updates: Partial<TimelineClip>) => {
    (get() as any).pushHistory();
    set((state) => ({
      clips: state.clips.map(c => c.id === id ? { ...c, ...updates } : c),
      projectDirty: true,
    }));
  },
  
  removeClip: (id: string) => {
    (get() as any).pushHistory();
    set((state) => ({
      clips: state.clips.filter(c => c.id !== id),
      projectDirty: true,
    }));
  },
  
  splitClipAtPlayhead: (clipId: string) => {
    const { clips, playheadTime } = get();
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    
    const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
    if (playheadTime <= clip.startTime || playheadTime >= clipEnd) return;
    
    (get() as any).pushHistory();
    
    const splitPointInSource = clip.inPoint + (playheadTime - clip.startTime);
    
    const clip1: TimelineClip = {
      ...clip,
      outPoint: splitPointInSource,
    };
    
    const clip2: TimelineClip = {
      id: generateClipId(),
      sourceFile: clip.sourceFile,
      inPoint: splitPointInSource,
      outPoint: clip.outPoint,
      startTime: playheadTime,
    };
    
    set((state) => ({
      clips: state.clips.map(c => c.id === clipId ? clip1 : c).concat(clip2).sort((a, b) => a.startTime - b.startTime),
      projectDirty: true,
    }));
  },
  
  rippleDelete: (clipId: string) => {
    const { clips } = get();
    const clipIndex = clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return;
    
    (get() as any).pushHistory();
    
    const clip = clips[clipIndex];
    const clipDuration = clip.outPoint - clip.inPoint;
    
    const newClips = clips
      .filter(c => c.id !== clipId)
      .map(c => c.startTime > clip.startTime ? { ...c, startTime: c.startTime - clipDuration } : c);
    
    set({ clips: newClips, projectDirty: true });
  },
  
  selectClips: (clipIds: string[]) => set({ selectedClipIds: clipIds }),
  
  clearSelection: () => set({ selectedClipIds: [] }),
  
  // Undo/redo
  pushHistory: () => {
    const { clips, crop, exportSettings, playheadTime, history, historyIndex } = get();
    const newState: HistoryState = {
      version: 1,
      timestamp: Date.now(),
      clips: JSON.parse(JSON.stringify(clips)),
      crop: { ...crop },
      exportSettings: { ...exportSettings },
      playheadTime
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  
  undo: (): boolean => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return false;
    const prevState = history[historyIndex - 1];
    set({
      clips: prevState.clips,
      crop: prevState.crop,
      exportSettings: prevState.exportSettings,
      playheadTime: prevState.playheadTime,
      historyIndex: historyIndex - 1,
    });
    return true;
  },
  
  redo: (): boolean => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return false;
    const nextState = history[historyIndex + 1];
    set({
      clips: nextState.clips,
      crop: nextState.crop,
      exportSettings: nextState.exportSettings,
      playheadTime: nextState.playheadTime,
      historyIndex: historyIndex + 1,
    });
    return true;
  },
  
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  
  clearHistory: () => set({ history: [], historyIndex: -1 }),
  
  // Project
  setProjectPath: (path: string | null) => set({ projectPath: path }),
  setProjectDirty: (dirty: boolean) => set({ projectDirty: dirty }),
  
  getProjectData: (): ProjectData => {
    const { videoFile, clips, crop, trim, exportSettings, playheadTime, timelineZoom, appSettings } = get();
    return {
      version: '1.0.0',
      metadata: {
        name: 'QuickCut Project',
        createdAt: new Date(),
        updatedAt: new Date(),
        duration: clips.reduce((max, clip) => {
          const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
          return Math.max(max, clipEnd);
        }, 0),
        clipCount: clips.length,
        settings: exportSettings
      },
      videoFile,
      clips,
      trim,
      crop,
      exportSettings,
      playheadTime,
      timelineZoom,
      appSettings
    };
  },
  
  loadProjectData: (data: ProjectData) => {
    set({
      videoFile: data.videoFile || null,
      clips: data.clips || [],
      crop: data.crop || initialCrop,
      trim: data.trim || initialTrim,
      exportSettings: data.exportSettings || initialExportSettings,
      playheadTime: data.playheadTime || 0,
      timelineZoom: data.timelineZoom || 50,
      history: [],
      historyIndex: -1,
      projectDirty: false,
      selectedClipIds: [],
      currentScreen: 'editor',
    });
  },
  
  saveProject: async () => {
    const { getProjectData, projectPath } = get();
    try {
      const projectData = getProjectData();
      await window.quickcut.saveProject(projectData, projectPath || undefined);
      set({ projectDirty: false });
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  },
  
  loadProject: async (path: string) => {
    try {
      const result = await window.quickcut.loadProject();
      if (result.success && result.data) {
        get().loadProjectData(result.data);
        set({ projectPath: path, projectDirty: false });
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  },
  
  // Navigation & Settings
  setCurrentScreen: (screen: AppScreen) => set({ currentScreen: screen }),
  
  setAppSettings: (settings: Partial<AppSettings>) => set((state) => ({
    appSettings: { ...state.appSettings, ...settings },
  })),
  
  goToEditor: () => set({ currentScreen: 'editor' }),
}));
