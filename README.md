# QuickCut

A cross-platform desktop video editor built with Electron, React, and FFmpeg.

## Features

- **Load Video**: Open local video files (MP4, WebM, MOV, AVI, MKV, etc.)
- **Trim**: Cut video by specifying start and end timestamps
- **Crop**: Select a region to crop using drag-and-drop on canvas or numeric inputs
- **Convert**: Export to MP4, WebM, or MOV formats
- **Progress Feedback**: Real-time progress bar during export
- **Cancellable Jobs**: Cancel ongoing FFmpeg operations

## Tech Stack

- **Desktop Shell**: Electron
- **UI Framework**: React
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Build Tool**: Vite
- **Video Engine**: FFmpeg (native binary)

## Prerequisites

- Node.js 18+
- FFmpeg installed and available in PATH (for development)
- For production builds, FFmpeg binaries should be placed in the `ffmpeg/` directory

## Installation

```bash
cd app
npm install
```

## Development

```bash
npm run dev
```

This starts the Vite dev server and launches Electron.

## Build

```bash
npm run electron:build
```

This creates distributable packages in the `release/` directory.

## Project Structure

```
app/
├── electron/           # Main process (Node.js)
│   ├── main.ts         # Electron app entry, window management
│   ├── preload.ts      # Context bridge, IPC API exposure
│   ├── ipc.ts          # IPC handler registration
│   └── ffmpeg.ts       # FFmpeg spawn logic, progress parsing
├── renderer/           # Renderer process (Browser)
│   ├── src/
│   │   ├── components/ # React UI components
│   │   ├── store/      # Zustand state management
│   │   ├── pages/      # Page components
│   │   ├── utils/      # Helper utilities
│   │   ├── types/      # TypeScript declarations
│   │   ├── main.tsx    # React entry point
│   │   └── index.css   # TailwindCSS imports
│   └── index.html      # HTML entry
├── vite.config.ts      # Vite + Electron plugin config
├── tailwind.config.js  # TailwindCSS config
├── tsconfig.json       # TypeScript config (renderer)
├── tsconfig.node.json  # TypeScript config (main process)
└── package.json        # Dependencies and scripts
```

## Architecture

### IPC Contract

The renderer communicates with the main process through a strict IPC contract:

| Method | Description |
|--------|-------------|
| `openFile()` | Opens file dialog, returns video metadata |
| `saveFile(name, format)` | Opens save dialog, returns output path |
| `trimVideo(params)` | Trims video between timestamps |
| `cropVideo(params)` | Crops video to specified region |
| `convertVideo(params)` | Converts video to target format |
| `exportVideo(params)` | Combined export with trim/crop/convert |
| `getProgress()` | Returns current job progress (0-100) |
| `cancelJob()` | Cancels the running FFmpeg job |
| `isJobRunning()` | Checks if a job is in progress |

### FFmpeg Commands

**Trim:**
```bash
ffmpeg -y -ss [start] -i input.mp4 -t [duration] -c copy -avoid_negative_ts make_zero output.mp4
```

**Crop:**
```bash
ffmpeg -y -i input.mp4 -vf "crop=[width]:[height]:[x]:[y]" -c:a copy output.mp4
```

**Convert to MP4:**
```bash
ffmpeg -y -i input.webm -c:v libx264 -preset medium -crf 23 -c:a aac -movflags +faststart output.mp4
```

**Convert to WebM:**
```bash
ffmpeg -y -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus output.webm
```

**Convert to MOV:**
```bash
ffmpeg -y -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -movflags +faststart output.mov
```

## State Management (Zustand)

```typescript
interface AppState {
  videoFile: VideoFile | null;     // Loaded video metadata
  trim: TrimSettings;              // Trim parameters
  crop: CropSettings;              // Crop parameters
  outputFormat: OutputFormat;      // mp4 | webm | mov
  processingStatus: ProcessingStatus;
  progress: number;                // 0-100
  errorMessage: string | null;
}
```

## Security

- `nodeIntegration: false` - No Node.js in renderer
- `contextIsolation: true` - Isolated contexts
- Minimal preload API surface
- All FFmpeg operations in main process

## License

MIT
