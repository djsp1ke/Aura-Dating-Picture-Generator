
export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export interface Preset {
  id: string;
  label: string;
  prompt: string;
  description: string;
  icon: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  EDITING = 'EDITING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
