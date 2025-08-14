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

// Details for queued items in the background/popup UI
export interface QueuedItemDetails {
  url?: string;
  title?: string;
  filename?: string;
  page_title?: string;
}

export type QueuedDetailsMap = Record<string, QueuedItemDetails>;

// Active download entry as used by popup/background
export interface ActiveDownloadEntry {
  status: string;
  progress: number;
  filename?: string;
  title?: string;
  page_title?: string;
  id?: string;
  url: string;
  error?: string;
  message?: string;
}

export type ActiveDownloadMap = Record<string, ActiveDownloadEntry>;

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
  history_file?: string;
  yt_dlp_options?: {
    format?: string;
    merge_output_format?: string;
    concurrent_fragments?: number;
    cookiesfrombrowser?: string[];
    continuedl?: boolean;
    fragment_retries?: number;
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

// Raw server history item and response (used for mapping in `history.ts`)
export interface ServerHistoryItem {
  id?: string;
  download_id?: string;
  url?: string;
  webpage_url?: string;
  original_url?: string;
  status?: string;
  filename?: string;
  filepath?: string;
  page_title?: string;
  title?: string;
  error?: string;
  message?: string;
  timestamp?: number | string;
}

export interface ServerHistoryResponse {
  history?: ServerHistoryItem[];
  total_items?: number;
}
