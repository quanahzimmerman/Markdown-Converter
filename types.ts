export type OutputFormat = 'docx' | 'pdf' | 'txt';

export interface ConversionFile {
  name: string;
  content: string;
}

export enum AppState {
  IDLE = 'IDLE',
  FILE_LOADED = 'FILE_LOADED',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
