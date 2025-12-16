import type { ChildProcess } from 'child_process';
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let currentProcess: ChildProcess | null = null;
let currentProgress = 0;
let totalDuration = 0;

// Cache for FFmpeg path detection
let cachedFFmpegPath: string | null = null;
let cachedFFprobePath: string | null = null;

function isDev(): boolean {
  const { app } = require('electron');
  return !app.isPackaged;
}

// Check if FFmpeg exists on system PATH
function isFFmpegOnPath(): boolean {
  try {
    const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ffmpeg'], {
      encoding: 'utf8',
      timeout: 5000
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

// Check if bundled FFmpeg exists
function getBundledFFmpegPath(): string | null {
  if (isDev()) return null;
  
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '';
  const bundledPath = path.join(process.resourcesPath, 'ffmpeg', `ffmpeg${ext}`);
  
  try {
    if (fs.existsSync(bundledPath)) {
      return bundledPath;
    }
  } catch {}
  
  return null;
}

function getBundledFFprobePath(): string | null {
  if (isDev()) return null;
  
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '';
  const bundledPath = path.join(process.resourcesPath, 'ffmpeg', `ffprobe${ext}`);
  
  try {
    if (fs.existsSync(bundledPath)) {
      return bundledPath;
    }
  } catch {}
  
  return null;
}

function getFFmpegPath(): string {
  // Return cached path if available
  if (cachedFFmpegPath) return cachedFFmpegPath;
  
  // In dev mode, always use system PATH
  if (isDev()) {
    cachedFFmpegPath = 'ffmpeg';
    return cachedFFmpegPath;
  }
  
  // Try bundled FFmpeg first (if user didn't opt out during install)
  const bundledPath = getBundledFFmpegPath();
  if (bundledPath) {
    cachedFFmpegPath = bundledPath;
    return cachedFFmpegPath;
  }
  
  // Fall back to system PATH
  if (isFFmpegOnPath()) {
    cachedFFmpegPath = 'ffmpeg';
    return cachedFFmpegPath;
  }
  
  // Last resort - return 'ffmpeg' and let it fail with a clear error
  cachedFFmpegPath = 'ffmpeg';
  return cachedFFmpegPath;
}

function getFFprobePath(): string {
  // Return cached path if available
  if (cachedFFprobePath) return cachedFFprobePath;
  
  // In dev mode, always use system PATH
  if (isDev()) {
    cachedFFprobePath = 'ffprobe';
    return cachedFFprobePath;
  }
  
  // Try bundled FFprobe first
  const bundledPath = getBundledFFprobePath();
  if (bundledPath) {
    cachedFFprobePath = bundledPath;
    return cachedFFprobePath;
  }
  
  // Fall back to system PATH
  cachedFFprobePath = 'ffprobe';
  return cachedFFprobePath;
}

// Export function to check FFmpeg availability (for installer/UI)
export function checkFFmpegAvailability(): { available: boolean; source: 'bundled' | 'system' | 'none'; version?: string } {
  const bundledPath = getBundledFFmpegPath();
  
  if (bundledPath) {
    try {
      const result = spawnSync(bundledPath, ['-version'], { encoding: 'utf8', timeout: 5000 });
      if (result.status === 0) {
        const versionMatch = result.stdout.match(/ffmpeg version ([^\s]+)/);
        return { available: true, source: 'bundled', version: versionMatch?.[1] };
      }
    } catch {}
  }
  
  if (isFFmpegOnPath()) {
    try {
      const result = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', timeout: 5000 });
      if (result.status === 0) {
        const versionMatch = result.stdout.match(/ffmpeg version ([^\s]+)/);
        return { available: true, source: 'system', version: versionMatch?.[1] };
      }
    } catch {}
  }
  
  return { available: false, source: 'none' };
}

function parseProgress(stderrLine: string): void {
  const timeMatch = stderrLine.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
  if (timeMatch && totalDuration > 0) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseInt(timeMatch[3], 10);
    const centiseconds = parseInt(timeMatch[4], 10);
    const currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
    currentProgress = Math.min(100, Math.round((currentTime / totalDuration) * 100));
  }
}

export function getProgress(): number {
  return currentProgress;
}

export function cancelCurrentJob(): boolean {
  if (currentProcess) {
    currentProcess.kill('SIGTERM');
    currentProcess = null;
    currentProgress = 0;
    return true;
  }
  return false;
}

export function isJobRunning(): boolean {
  return currentProcess !== null;
}

export async function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(getFFprobePath(), [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    ffprobe.on('close', (code: number | null) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 0 : duration);
      } else {
        reject(new Error(`ffprobe exited with code ${code}`));
      }
    });

    ffprobe.on('error', reject);
  });
}

export async function getVideoMetadata(inputPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  codec: string;
  format: string;
  size: number;
}> {
  return new Promise((resolve, reject) => {
    // Get file size
    const stats = require('fs').statSync(inputPath);
    const fileSize = stats.size;

    const ffprobe = spawn(getFFprobePath(), [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,codec_name:format=duration,format_name',
      '-of', 'json',
      inputPath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    ffprobe.on('close', (code: number | null) => {
      if (code === 0) {
        try {
          const data = JSON.parse(output);
          const stream = data.streams?.[0] || {};
          const format = data.format || {};
          
          // Get file extension for actual format
          const fileExtension = path.extname(inputPath).toLowerCase().substring(1);
          
          resolve({
            duration: parseFloat(format.duration) || 0,
            width: stream.width || 0,
            height: stream.height || 0,
            codec: stream.codec_name || 'unknown',
            format: fileExtension || 'unknown',
            size: fileSize
          });
        } catch (e) {
          reject(new Error('Failed to parse video metadata'));
        }
      } else {
        reject(new Error(`ffprobe exited with code ${code}`));
      }
    });

    ffprobe.on('error', reject);
  });
}

interface TrimParams {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
}

export async function trimVideo(params: TrimParams): Promise<string> {
  const { inputPath, outputPath, startTime, endTime } = params;

  if (isJobRunning()) {
    throw new Error('A job is already running');
  }

  const duration = endTime - startTime;
  totalDuration = duration;
  currentProgress = 0;

  // FFmpeg command: ffmpeg -i input.mp4 -ss 10 -t 20 -c copy output.mp4
  // Using -ss before -i for fast seek, -t for duration
  const args = [
    '-y',
    '-ss', startTime.toString(),
    '-i', inputPath,
    '-t', duration.toString(),
    '-c', 'copy',
    '-avoid_negative_ts', 'make_zero',
    outputPath
  ];

  console.log('FFmpeg trim command:', getFFmpegPath(), args.join(' '));

  return new Promise((resolve, reject) => {
    const proc = spawn(getFFmpegPath(), args);
    currentProcess = proc;

    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      parseProgress(line);
    });

    proc.on('close', (code: number | null) => {
      currentProcess = null;
      if (code === 0) {
        currentProgress = 100;
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg trim exited with code ${code}`));
      }
    });

    proc.on('error', (err: Error) => {
      currentProcess = null;
      reject(err);
    });
  });
}

interface CropParams {
  inputPath: string;
  outputPath: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropVideo(params: CropParams): Promise<string> {
  const { inputPath, outputPath, x, y, width, height } = params;

  if (isJobRunning()) {
    throw new Error('A job is already running');
  }

  totalDuration = await getVideoDuration(inputPath);
  currentProgress = 0;

  // FFmpeg command: ffmpeg -i input.mp4 -vf "crop=width:height:x:y" output.mp4
  const cropFilter = `crop=${width}:${height}:${x}:${y}`;
  const args = [
    '-y',
    '-i', inputPath,
    '-vf', cropFilter,
    '-c:a', 'copy',
    outputPath
  ];

  console.log('FFmpeg crop command:', getFFmpegPath(), args.join(' '));

  return new Promise((resolve, reject) => {
    const proc = spawn(getFFmpegPath(), args);
    currentProcess = proc;

    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      parseProgress(line);
    });

    proc.on('close', (code: number | null) => {
      currentProcess = null;
      if (code === 0) {
        currentProgress = 100;
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg crop exited with code ${code}`));
      }
    });

    proc.on('error', (err: Error) => {
      currentProcess = null;
      reject(err);
    });
  });
}

interface ConvertParams {
  inputPath: string;
  outputPath: string;
  format: 'mp4' | 'webm' | 'mov';
}

export async function convertVideo(params: ConvertParams): Promise<string> {
  const { inputPath, outputPath, format } = params;

  if (isJobRunning()) {
    throw new Error('A job is already running');
  }

  totalDuration = await getVideoDuration(inputPath);
  currentProgress = 0;

  // Format-specific encoding settings
  let args: string[];
  
  switch (format) {
    case 'webm':
      // FFmpeg command: ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus output.webm
      args = [
        '-y',
        '-i', inputPath,
        '-c:v', 'libvpx-vp9',
        '-crf', '30',
        '-b:v', '0',
        '-c:a', 'libopus',
        outputPath
      ];
      break;
    case 'mov':
      // FFmpeg command: ffmpeg -i input.mp4 -c:v libx264 -c:a aac -movflags +faststart output.mov
      args = [
        '-y',
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        outputPath
      ];
      break;
    case 'mp4':
    default:
      // FFmpeg command: ffmpeg -i input.webm -c:v libx264 -c:a aac -movflags +faststart output.mp4
      args = [
        '-y',
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        outputPath
      ];
      break;
  }

  console.log('FFmpeg convert command:', getFFmpegPath(), args.join(' '));

  return new Promise((resolve, reject) => {
    const proc = spawn(getFFmpegPath(), args);
    currentProcess = proc;

    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      parseProgress(line);
    });

    proc.on('close', (code: number | null) => {
      currentProcess = null;
      if (code === 0) {
        currentProgress = 100;
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg convert exited with code ${code}`));
      }
    });

    proc.on('error', (err: Error) => {
      currentProcess = null;
      reject(err);
    });
  });
}

interface ExportParams {
  inputPath: string;
  outputPath: string;
  format: 'mp4' | 'webm' | 'mov';
  trim?: { startTime: number; endTime: number };
  crop?: { x: number; y: number; width: number; height: number };
}

// Timeline clip for multi-clip export
interface TimelineClipExport {
  sourcePath: string;
  inPoint: number;
  outPoint: number;
}

interface ExportTimelineParams {
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

// Export timeline with multiple clips - uses FFmpeg concat filter
export async function exportTimeline(params: ExportTimelineParams): Promise<string> {
  const { clips, outputPath, format, crop, codec, resolution, fps, bitrate, crf, speed } = params;

  if (isJobRunning()) {
    throw new Error('A job is already running');
  }

  if (clips.length === 0) {
    throw new Error('No clips to export');
  }

  // Calculate total duration for progress tracking
  totalDuration = clips.reduce((sum, clip) => sum + (clip.outPoint - clip.inPoint), 0);
  currentProgress = 0;

  const args: string[] = ['-y'];

  // Add each clip as an input with trim
  clips.forEach((clip) => {
    args.push('-ss', clip.inPoint.toString());
    args.push('-t', (clip.outPoint - clip.inPoint).toString());
    args.push('-i', clip.sourcePath);
  });

  // Build filter complex for concatenation
  const filterParts: string[] = [];
  const streamLabels: string[] = [];

  clips.forEach((_, index) => {
    streamLabels.push(`[${index}:v]`);
    streamLabels.push(`[${index}:a]`);
  });

  // Concat filter
  let filterComplex = `${clips.map((_, i) => `[${i}:v][${i}:a]`).join('')}concat=n=${clips.length}:v=1:a=1[outv][outa]`;
  
  // Apply crop if specified
  if (crop) {
    filterComplex = `${clips.map((_, i) => `[${i}:v][${i}:a]`).join('')}concat=n=${clips.length}:v=1:a=1[concatv][outa];[concatv]crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}[outv]`;
  }

  args.push('-filter_complex', filterComplex);
  args.push('-map', '[outv]');
  args.push('-map', '[outa]');

  // Encoding settings
  const presetSpeed = speed || 'medium';
  const crfValue = crf || 23;

  switch (format) {
    case 'webm':
      args.push('-c:v', 'libvpx-vp9', '-crf', crfValue.toString(), '-b:v', '0', '-c:a', 'libopus');
      break;
    case 'gif':
      // GIF doesn't support audio
      args.pop(); // Remove -map [outa]
      args.pop(); // Remove [outa]
      args.push('-c:v', 'gif', '-loop', '0');
      break;
    case 'mov':
    case 'mp4':
    case 'mkv':
    case 'avi':
    default:
      const videoCodec = codec === 'h265' ? 'libx265' : 
                         codec === 'vp9' ? 'libvpx-vp9' :
                         codec === 'prores' ? 'prores_ks' : 'libx264';
      args.push('-c:v', videoCodec);
      if (videoCodec !== 'prores_ks') {
        args.push('-preset', presetSpeed, '-crf', crfValue.toString());
      }
      args.push('-c:a', 'aac');
      if (format === 'mp4' || format === 'mov') {
        args.push('-movflags', '+faststart');
      }
      break;
  }

  // Resolution
  if (resolution && resolution !== 'source') {
    args.push('-s', `${resolution.width}x${resolution.height}`);
  }

  // FPS
  if (fps && fps !== 'source') {
    args.push('-r', fps.toString());
  }

  // Bitrate
  if (bitrate && bitrate !== 'auto') {
    args.push('-b:v', `${bitrate}k`);
  }

  args.push(outputPath);

  console.log('FFmpeg export timeline command:', getFFmpegPath(), args.join(' '));

  return new Promise((resolve, reject) => {
    const proc = spawn(getFFmpegPath(), args);
    currentProcess = proc;

    let stderrOutput = '';
    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      stderrOutput += line;
      parseProgress(line);
    });

    proc.on('close', (code: number | null) => {
      currentProcess = null;
      if (code === 0) {
        currentProgress = 100;
        resolve(outputPath);
      } else {
        console.error('FFmpeg stderr:', stderrOutput);
        reject(new Error(`FFmpeg export exited with code ${code}`));
      }
    });

    proc.on('error', (err: Error) => {
      currentProcess = null;
      reject(err);
    });
  });
}

export async function exportVideo(params: ExportParams): Promise<string> {
  const { inputPath, outputPath, format, trim, crop } = params;

  if (isJobRunning()) {
    throw new Error('A job is already running');
  }

  const metadata = await getVideoMetadata(inputPath);
  totalDuration = trim ? (trim.endTime - trim.startTime) : metadata.duration;
  currentProgress = 0;

  const args: string[] = ['-y'];

  // Input seeking (fast seek before -i)
  if (trim) {
    args.push('-ss', trim.startTime.toString());
  }

  args.push('-i', inputPath);

  // Duration limit
  if (trim) {
    args.push('-t', (trim.endTime - trim.startTime).toString());
  }

  // Video filters
  const filters: string[] = [];
  if (crop) {
    filters.push(`crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`);
  }

  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

  // Encoding settings based on format
  switch (format) {
    case 'webm':
      args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-c:a', 'libopus');
      break;
    case 'mov':
      args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart');
      break;
    case 'mp4':
    default:
      if (filters.length === 0 && !trim) {
        args.push('-c', 'copy');
      } else {
        args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart');
      }
      break;
  }

  args.push(outputPath);

  console.log('FFmpeg export command:', getFFmpegPath(), args.join(' '));

  return new Promise((resolve, reject) => {
    const proc = spawn(getFFmpegPath(), args);
    currentProcess = proc;

    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      parseProgress(line);
    });

    proc.on('close', (code: number | null) => {
      currentProcess = null;
      if (code === 0) {
        currentProgress = 100;
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg export exited with code ${code}`));
      }
    });

    proc.on('error', (err: Error) => {
      currentProcess = null;
      reject(err);
    });
  });
}
