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
  size: number;
}

export interface TrimParams {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
}

export interface CropParams {
  inputPath: string;
  outputPath: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConvertParams {
  inputPath: string;
  outputPath: string;
  format: 'mp4' | 'webm' | 'mov';
}

export interface ExportParams {
  inputPath: string;
  outputPath: string;
  format: 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv' | 'wmv' | 'flv' | 'gif';
  trim?: { startTime: number; endTime: number };
  crop?: { x: number; y: number; width: number; height: number };
  // Advanced export settings
  codec?: 'h264' | 'h265' | 'vp9' | 'prores' | 'mpeg4';
  resolution?: { width: number; height: number } | 'source';
  fps?: number | 'source';
  bitrate?: number | 'auto';
  crf?: number;
  speed?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
}

export interface TimelineClipExport {
  sourcePath: string;
  inPoint: number;
  outPoint: number;
}

export interface ExportTimelineParams {
  clips: TimelineClipExport[];
  outputPath: string;
  format: 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv' | 'wmv' | 'flv' | 'gif';
  crop?: { x: number; y: number; width: number; height: number };
  codec?: 'h264' | 'h265' | 'vp9' | 'prores' | 'mpeg4';
  resolution?: { width: number; height: number } | 'source';
  fps?: number | 'source';
  bitrate?: number | 'auto';
  crf?: number;
  speed?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
}

export interface OperationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface ProjectResult {
  success: boolean;
  path?: string;
  data?: any;
  error?: string;
  cancelled?: boolean;
}

export interface QuickCutAPI {
  openFile: () => Promise<VideoFile | null>;
  saveFile: (defaultName: string, format: string) => Promise<string | null>;
  trimVideo: (params: TrimParams) => Promise<OperationResult>;
  cropVideo: (params: CropParams) => Promise<OperationResult>;
  convertVideo: (params: ConvertParams) => Promise<OperationResult>;
  exportVideo: (params: ExportParams) => Promise<OperationResult>;
  exportTimeline: (params: ExportTimelineParams) => Promise<OperationResult>;
  getProgress: () => Promise<number>;
  cancelJob: () => Promise<boolean>;
  isJobRunning: () => Promise<boolean>;
  saveProject: (projectData: any, filePath?: string) => Promise<ProjectResult>;
  loadProject: () => Promise<ProjectResult>;
}

declare global {
  interface Window {
    quickcut: QuickCutAPI;
  }
}
