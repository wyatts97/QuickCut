"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const { ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg_1 = require("./ffmpeg");
function registerIpcHandlers(mainWindow) {
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
            const metadata = await (0, ffmpeg_1.getVideoMetadata)(filePath);
            return {
                path: filePath,
                name: path.basename(filePath),
                ...metadata
            };
        }
        catch (error) {
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
    ipcMain.handle('save-file', async (_event, defaultName, format) => {
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
    ipcMain.handle('trim-video', async (_event, params) => {
        try {
            const result = await (0, ffmpeg_1.trimVideo)(params);
            return { success: true, outputPath: result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Crop video
    ipcMain.handle('crop-video', async (_event, params) => {
        try {
            const result = await (0, ffmpeg_1.cropVideo)(params);
            return { success: true, outputPath: result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Convert video
    ipcMain.handle('convert-video', async (_event, params) => {
        try {
            const result = await (0, ffmpeg_1.convertVideo)(params);
            return { success: true, outputPath: result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Export video with all options (legacy single-file)
    ipcMain.handle('export-video', async (_event, params) => {
        try {
            const result = await (0, ffmpeg_1.exportVideo)(params);
            return { success: true, outputPath: result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Export timeline with multiple clips
    ipcMain.handle('export-timeline', async (_event, params) => {
        try {
            const result = await (0, ffmpeg_1.exportTimeline)(params);
            return { success: true, outputPath: result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Get current progress
    ipcMain.handle('get-progress', () => {
        return (0, ffmpeg_1.getProgress)();
    });
    // Cancel current job
    ipcMain.handle('cancel-job', () => {
        return (0, ffmpeg_1.cancelCurrentJob)();
    });
    // Check if a job is running
    ipcMain.handle('is-job-running', () => {
        return (0, ffmpeg_1.isJobRunning)();
    });
    // Get video metadata
    ipcMain.handle('get-video-metadata', async (_event, filePath) => {
        try {
            const metadata = await (0, ffmpeg_1.getVideoMetadata)(filePath);
            return { success: true, metadata };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
}
