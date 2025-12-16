import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VideoFile {
  path: string;
  name: string;
  duration: number;
  width: number;
  height: number;
  codec: string;
  format: string;
}

export interface TrimSettings {
  startTime: number;
  endTime: number;
  enabled: boolean;
}

export interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  enabled: boolean;
}

export type OutputFormat = 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv' | 'wmv' | 'flv' | 'gif';

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error' | 'cancelled';

// Timeline clip model
export interface TimelineClip {
  id: string;
  sourceFile: VideoFile;
  inPoint: number;      // start time in source
  outPoint: number;     // end time in source
  startTime: number;    // position on timeline
}

// Export settings with presets
export type ExportPreset = 'youtube-1080p' | 'youtube-4k' | 'twitter' | 'instagram' | 'tiktok' | 'high-quality' | 'small-file' | 'custom';

export type FFmpegSpeed = 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';

export interface ExportSettings {
  preset: ExportPreset;
  format: OutputFormat;
  codec: 'h264' | 'h265' | 'vp9' | 'prores' | 'mpeg4';
  resolution: { width: number; height: number } | 'source';
  fps: number | 'source';
  bitrate: number | 'auto';  // kbps
  crf: number;               // 0-51, lower = better quality
  speed: FFmpegSpeed;        // FFmpeg encoding speed preset
}

// Undo/redo history
interface HistoryState {
  clips: TimelineClip[];
  crop: CropSettings;
  exportSettings: ExportSettings;
}

// App screen navigation
export type AppScreen = 'welcome' | 'editor' | 'settings';

// App settings (persisted)
export type ColorTheme = 'sandstone';

export interface AppSettings {
  colorTheme: ColorTheme;
  defaultFormat: OutputFormat;
  defaultCodec: 'h264' | 'h265' | 'vp9';
  defaultPreset: ExportPreset;
  autoSaveProjects: boolean;
  isDarkMode: boolean;
}

interface AppState {
  // App navigation
  currentScreen: AppScreen;
  appSettings: AppSettings;
  
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  // Video & Timeline
  videoFile: VideoFile | null;
  clips: TimelineClip[];
  playheadTime: number;
  timelineZoom: number;  // pixels per second
  
  // Edit settings
  trim: TrimSettings;
  crop: CropSettings;
  outputFormat: OutputFormat;
  exportSettings: ExportSettings;
  
  // Processing
  processingStatus: ProcessingStatus;
  progress: number;
  errorMessage: string | null;
  
  // History (undo/redo)
  history: HistoryState[];
  historyIndex: number;
  
  // Project
  projectPath: string | null;
  projectDirty: boolean;

  // Actions
  setVideoFile: (file: VideoFile | null) => void;
  setTrim: (trim: Partial<TrimSettings>) => void;
  setCrop: (crop: Partial<CropSettings>) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setProcessingStatus: (status: ProcessingStatus) => void;
  setProgress: (progress: number) => void;
  setErrorMessage: (message: string | null) => void;
  resetEditSettings: () => void;
  reset: () => void;
  
  // Timeline actions
  setPlayheadTime: (time: number) => void;
  setTimelineZoom: (zoom: number) => void;
  addClip: (clip: TimelineClip) => void;
  addVideoToTimeline: (file: VideoFile) => void;
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  removeClip: (id: string) => void;
  splitClipAtPlayhead: (clipId: string) => void;
  rippleDelete: (clipId: string) => void;
  
  // Undo/redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Project
  setProjectPath: (path: string | null) => void;
  setProjectDirty: (dirty: boolean) => void;
  getProjectData: () => object;
  loadProjectData: (data: object) => void;
  
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
  
  // Edit settings
  trim: initialTrim,
  crop: initialCrop,
  outputFormat: 'mp4',
  exportSettings: initialExportSettings,
  
  // Processing
  processingStatus: 'idle',
  progress: 0,
  errorMessage: null,
  
  // History
  history: [],
  historyIndex: -1,
  
  // Project
  projectPath: null,
  projectDirty: false,

  setVideoFile: (file) => {
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
      progress: 0,
      errorMessage: null,
      projectDirty: true,
    });
  },

  setTrim: (trim) => set((state) => ({
    trim: { ...state.trim, ...trim },
    projectDirty: true,
  })),

  setCrop: (crop) => {
    get().pushHistory();
    set((state) => ({
      crop: { ...state.crop, ...crop },
      projectDirty: true,
    }));
  },

  setOutputFormat: (format) => set({ 
    outputFormat: format,
    exportSettings: { ...get().exportSettings, format },
  }),
  
  setExportSettings: (settings) => set((state) => ({
    exportSettings: { ...state.exportSettings, ...settings },
  })),

  setProcessingStatus: (status) => set({ processingStatus: status }),

  setProgress: (progress) => set({ progress }),

  setErrorMessage: (message) => set({ errorMessage: message }),

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
    trim: initialTrim,
    crop: initialCrop,
    outputFormat: 'mp4',
    exportSettings: initialExportSettings,
    processingStatus: 'idle',
    progress: 0,
    errorMessage: null,
    history: [],
    historyIndex: -1,
    projectPath: null,
    projectDirty: false,
  }),
  
  // Timeline actions
  setPlayheadTime: (time) => set({ playheadTime: Math.max(0, time) }),
  
  setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(10, Math.min(200, zoom)) }),
  
  addClip: (clip) => {
    get().pushHistory();
    set((state) => ({
      clips: [...state.clips, clip],
      projectDirty: true,
    }));
  },
  
  addVideoToTimeline: (file) => {
    const { clips, pushHistory } = get();
    pushHistory();
    
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
  
  updateClip: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      clips: state.clips.map(c => c.id === id ? { ...c, ...updates } : c),
      projectDirty: true,
    }));
  },
  
  removeClip: (id) => {
    get().pushHistory();
    set((state) => ({
      clips: state.clips.filter(c => c.id !== id),
      projectDirty: true,
    }));
  },
  
  splitClipAtPlayhead: (clipId) => {
    const { clips, playheadTime, pushHistory } = get();
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    
    const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
    if (playheadTime <= clip.startTime || playheadTime >= clipEnd) return;
    
    pushHistory();
    
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
  
  rippleDelete: (clipId) => {
    const { clips, pushHistory } = get();
    const clipIndex = clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return;
    
    pushHistory();
    
    const clip = clips[clipIndex];
    const clipDuration = clip.outPoint - clip.inPoint;
    
    const newClips = clips
      .filter(c => c.id !== clipId)
      .map(c => c.startTime > clip.startTime ? { ...c, startTime: c.startTime - clipDuration } : c);
    
    set({ clips: newClips, projectDirty: true });
  },
  
  // Undo/redo
  pushHistory: () => {
    const { clips, crop, exportSettings, history, historyIndex } = get();
    const newState: HistoryState = {
      clips: JSON.parse(JSON.stringify(clips)),
      crop: { ...crop },
      exportSettings: { ...exportSettings },
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prevState = history[historyIndex - 1];
    set({
      clips: prevState.clips,
      crop: prevState.crop,
      exportSettings: prevState.exportSettings,
      historyIndex: historyIndex - 1,
    });
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const nextState = history[historyIndex + 1];
    set({
      clips: nextState.clips,
      crop: nextState.crop,
      exportSettings: nextState.exportSettings,
      historyIndex: historyIndex + 1,
    });
  },
  
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  
  // Project
  setProjectPath: (path) => set({ projectPath: path }),
  setProjectDirty: (dirty) => set({ projectDirty: dirty }),
  
  getProjectData: () => {
    const { videoFile, clips, crop, trim, exportSettings, outputFormat } = get();
    return {
      version: 1,
      videoFile,
      clips,
      crop,
      trim,
      exportSettings,
      outputFormat,
    };
  },
  
  loadProjectData: (data: any) => {
    set({
      videoFile: data.videoFile || null,
      clips: data.clips || [],
      crop: data.crop || initialCrop,
      trim: data.trim || initialTrim,
      exportSettings: data.exportSettings || initialExportSettings,
      outputFormat: data.outputFormat || 'mp4',
      playheadTime: 0,
      history: [],
      historyIndex: -1,
      projectDirty: false,
      currentScreen: 'editor',
    });
  },
  
  // Navigation & Settings
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  
  setAppSettings: (settings) => set((state) => ({
    appSettings: { ...state.appSettings, ...settings },
  })),
  
  goToEditor: () => set({ currentScreen: 'editor' }),
}));
