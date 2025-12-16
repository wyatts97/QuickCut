import type { BrowserWindow as BrowserWindowType, IpcMainInvokeEvent } from 'electron';
const { ipcMain, dialog } = require('electron');
const path = require('path');
import {
  trimVideo,
  cropVideo,
  convertVideo,
  exportVideo,
  exportTimeline,
  getProgress,
  cancelCurrentJob,
  isJobRunning,
  getVideoMetadata
} from './ffmpeg';

export function registerIpcHandlers(mainWindow: BrowserWindowType): void {
  // Open file dialog and return selected video file path + metadata
  ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    
    try {
      const metadata = await getVideoMetadata(filePath);
      return {
        path: filePath,
        name: path.basename(filePath),
        ...metadata
      };
    } catch (error) {
      console.error('Error getting video metadata:', error);
      return {
        path: filePath,
        name: path.basename(filePath),
        duration: 0,
        width: 0,
        height: 0,
        codec: 'unknown',
        format: 'unknown'
      };
    }
  });

  // Save file dialog
  ipcMain.handle('save-file', async (_event: IpcMainInvokeEvent, defaultName: string, format: string) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [
        { name: format.toUpperCase(), extensions: [format] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return result.filePath;
  });

  // Trim video
  ipcMain.handle('trim-video', async (_event: IpcMainInvokeEvent, params: {
    inputPath: string;
    outputPath: string;
    startTime: number;
    endTime: number;
  }) => {
    try {
      const result = await trimVideo(params);
      return { success: true, outputPath: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Crop video
  ipcMain.handle('crop-video', async (_event: IpcMainInvokeEvent, params: {
    inputPath: string;
    outputPath: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    try {
      const result = await cropVideo(params);
      return { success: true, outputPath: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Convert video
  ipcMain.handle('convert-video', async (_event: IpcMainInvokeEvent, params: {
    inputPath: string;
    outputPath: string;
    format: 'mp4' | 'webm' | 'mov';
  }) => {
    try {
      const result = await convertVideo(params);
      return { success: true, outputPath: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Export video with all options (legacy single-file)
  ipcMain.handle('export-video', async (_event: IpcMainInvokeEvent, params: {
    inputPath: string;
    outputPath: string;
    format: 'mp4' | 'webm' | 'mov';
    trim?: { startTime: number; endTime: number };
    crop?: { x: number; y: number; width: number; height: number };
  }) => {
    try {
      const result = await exportVideo(params);
      return { success: true, outputPath: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Export timeline with multiple clips
  ipcMain.handle('export-timeline', async (_event: IpcMainInvokeEvent, params: {
    clips: Array<{ sourcePath: string; inPoint: number; outPoint: number }>;
    outputPath: string;
    format: 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv' | 'wmv' | 'flv' | 'gif';
    crop?: { x: number; y: number; width: number; height: number };
    codec?: 'h264' | 'h265' | 'vp9' | 'prores' | 'mpeg4';
    resolution?: { width: number; height: number } | 'source';
    fps?: number | 'source';
    bitrate?: number | 'auto';
    crf?: number;
    speed?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  }) => {
    try {
      const result = await exportTimeline(params);
      return { success: true, outputPath: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get current progress
  ipcMain.handle('get-progress', () => {
    return getProgress();
  });

  // Cancel current job
  ipcMain.handle('cancel-job', () => {
    return cancelCurrentJob();
  });

  // Check if a job is running
  ipcMain.handle('is-job-running', () => {
    return isJobRunning();
  });

  // Get video metadata
  ipcMain.handle('get-video-metadata', async (_event: IpcMainInvokeEvent, filePath: string) => {
    try {
      const metadata = await getVideoMetadata(filePath);
      return { success: true, metadata };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
