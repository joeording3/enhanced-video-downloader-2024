/**
 * Type definitions for the Enhanced Video Downloader extension.
 * Centralized type definitions used throughout the extension.
 */

// Button state for position and visibility
export interface ButtonState {
  x: number;
  y: number;
  hidden: boolean;
}

// Download options
export interface DownloadOptions {
  url: string;
  format?: string;
  quality?: string;
  audioOnly?: boolean;
  subtitles?: boolean;
  customOptions?: string;
  isPlaylist?: boolean;
}

// Download history entry
export interface HistoryEntry {
  id?: string | number;
  url?: string;
  status?: string;
  timestamp?: number | string;
  filename?: string;
  filepath?: string;
  page_title?: string;
  title?: string;
  thumbnailUrl?: string;
  error?: string;
  detail?: string | string[];
  sourceUrl?: string;
  downloaded_at?: string;
}

// Server configuration
export interface ServerConfig {
  server_port: number;
  download_dir: string;
  debug_mode: boolean;
  enable_history: boolean;
  log_level: string;
  console_log_level: "debug" | "info" | "warning" | "error" | "critical";
  max_concurrent_downloads?: number;
  allow_playlists?: boolean;
  yt_dlp_options?: {
    format?: string;
    [key: string]: any;
  };
}

// Message types for background communication
export type MessageType =
  | "downloadVideo"
  | "setConfig"
  | "getConfig"
  | "getHistory"
  | "clearHistory"
  | "getStatus"
  | "fetchLogs"
  | "restartServer"
  | "reorderQueue";

// Base message interface
export interface Message {
  type: MessageType;
}

// Download message
export interface DownloadMessage extends Message {
  type: "downloadVideo";
  url: string;
  options?: Partial<DownloadOptions>;
}

// Server response
export interface ServerResponse {
  status: "success" | "error";
  message?: string;
  data?: any;
}

// Theme type
export type Theme = "light" | "dark" | "auto";

// Queue message for active and queued downloads
export interface QueueMessage {
  type: "queueUpdated";
  queue: string[];
  active: Record<
    string,
    {
      status: string;
      progress: number;
      filename?: string;
      title?: string;
      id?: string;
      url: string;
      error?: string;
      message?: string;
    }
  >;
}

// Message for queue reordering
export interface ReorderQueueMessage extends Message {
  type: "reorderQueue";
  queue: string[];
}
