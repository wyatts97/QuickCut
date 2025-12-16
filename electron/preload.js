"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { contextBridge, ipcRenderer } = require('electron');
const api = {
    openFile: () => ipcRenderer.invoke('open-file'),
    saveFile: (defaultName, format) => ipcRenderer.invoke('save-file', defaultName, format),
    trimVideo: (params) => ipcRenderer.invoke('trim-video', params),
    cropVideo: (params) => ipcRenderer.invoke('crop-video', params),
    convertVideo: (params) => ipcRenderer.invoke('convert-video', params),
    exportVideo: (params) => ipcRenderer.invoke('export-video', params),
    exportTimeline: (params) => ipcRenderer.invoke('export-timeline', params),
    getProgress: () => ipcRenderer.invoke('get-progress'),
    cancelJob: () => ipcRenderer.invoke('cancel-job'),
    isJobRunning: () => ipcRenderer.invoke('is-job-running'),
};
contextBridge.exposeInMainWorld('quickcut', api);
