export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function parseTime(timeStr: string): number {
  const parts = timeStr.split(':');
  let seconds = 0;
  
  if (parts.length === 3) {
    seconds += parseInt(parts[0], 10) * 3600;
    seconds += parseInt(parts[1], 10) * 60;
    const secParts = parts[2].split('.');
    seconds += parseInt(secParts[0], 10);
    if (secParts[1]) {
      seconds += parseInt(secParts[1], 10) / 100;
    }
  } else if (parts.length === 2) {
    seconds += parseInt(parts[0], 10) * 60;
    const secParts = parts[1].split('.');
    seconds += parseInt(secParts[0], 10);
    if (secParts[1]) {
      seconds += parseInt(secParts[1], 10) / 100;
    }
  }
  
  return seconds;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getOutputFileName(inputName: string, format: string): string {
  const baseName = inputName.replace(/\.[^/.]+$/, '');
  return `${baseName}_edited.${format}`;
}
