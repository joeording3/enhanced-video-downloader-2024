"""
Provide Pydantic schemas for Enhanced Video Downloader server.

This module defines data validation models for configuration, download requests,
history queries, logging queries, and command-line options using Pydantic.
"""

import os
from pathlib import Path  # Corrected: Ensure this is the Path being used
from typing import Any  # Removed Literal import

from pydantic import BaseModel, ConfigDict, Field, field_validator

from server.constants import DEFAULT_SERVER_PORT, get_server_port


class YTDLPOptions(BaseModel):
    """
    Define yt-dlp options schema.

    Provides fields for formatting, logging, and download behaviors for yt-dlp.

    :cvar model_config: Pydantic configuration dict allowing extra fields.
    """

    model_config = ConfigDict(extra="allow")

    format: str = Field(
        default="bestvideo+bestaudio/best",
        description="Video format string for yt-dlp.",
    )
    merge_output_format: str = Field(
        default="mp4",
        description="Container format to merge video and audio into after download.",
    )
    concurrent_fragments: int = Field(
        default=4,
        ge=1,
        le=16,
        description="Number of concurrent fragments for HLS/DASH (1-16).",  # Added ge/le
    )

    quiet: bool = Field(default=False, description="Suppress all non-error console output from yt-dlp.")
    verbose: bool = Field(
        default=False,
        description="Enable verbose console output from yt-dlp for debugging.",
    )
    noprogress: bool = Field(default=False, description="Suppress the progress bar display from yt-dlp.")
    outtmpl: dict[str, str] = Field(
        default_factory=lambda: {"default": "%(title)s [%(id)s].%(ext)s"},
        description="Output filename template for yt-dlp. See yt-dlp documentation for template options.",
    )
    continuedl: bool = Field(default=True, description="Continue partial downloads by default.")
    nopart: bool = Field(default=True, description="Do not use .part files for incomplete downloads.")
    progress: bool = Field(default=True, description="Show progress bar during download.")


class ServerConfig(BaseModel):
    """
    Define server configuration schema.

    Validates server settings loaded from `config.json` including host, port,
    download directory, logging preferences, and advanced behavior options.

    :cvar model_config: Pydantic configuration dict forbidding extra fields and validating assignments.
    """

    model_config = ConfigDict(extra="forbid", validate_assignment=True)

    server_host: str = Field(
        default="127.0.0.1",
        description="Hostname or IP address for the server to listen on.",
    )
    server_port: int = Field(
        default=DEFAULT_SERVER_PORT,
        ge=1024,
        le=65535,
        description="Port number for the server (1024-65535).",
    )
    download_dir: Path = Field(
        default_factory=lambda: Path.home() / "Downloads" / "VideoDownloader",
        description="Default directory to save downloaded videos.",
    )
    debug_mode: bool = Field(
        default=False,
        description="Enable debug mode for the server (e.g., Werkzeug reloader).",
    )
    max_concurrent_downloads: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Maximum number of concurrent downloads (1-10).",
    )
    download_history_limit: int = Field(
        default=100,
        ge=0,
        description="Maximum number of entries to keep in download history (0 for unlimited).",
    )
    allowed_domains: list[str] = Field(
        default_factory=list,
        description="List of domains from which downloads are permitted. Empty list means all allowed.",
    )
    ffmpeg_path: str = Field(default="ffmpeg", description="Path to the ffmpeg executable.")
    log_level: str = Field(default="info", description="Logging level for the server.")
    console_log_level: str = Field(
        default="warning",
        description=(
            "Logging level for console output. 'warning' shows only warnings and errors. "
            "'info' or 'debug' for more verbose output."
        ),
    )
    log_path: Path | None = Field(
        default=None,
        description="Path to the server log file. If None, defaults to server_output.log in project root.",
    )

    scan_interval_ms: int = Field(
        default=get_server_port(),
        ge=1000,
        description="Interval in milliseconds for scanning incomplete downloads (min 1000ms).",
    )
    show_download_button: bool = Field(default=True, description="Whether the download button is injected by default.")
    button_position_memory: dict[str, dict[str, Any]] = Field(
        default_factory=dict,
        description="Stores last known button position and state per domain.",
    )
    enable_history: bool = Field(default=True, description="Enable or disable download history tracking.")
    allow_playlists: bool = Field(default=False, description="Whether to allow downloading entire playlists.")

    # Changed from Field(default_factory=YTDLPOptions) to a direct default instance
    yt_dlp_options: YTDLPOptions = YTDLPOptions()

    @field_validator("log_level", "console_log_level", mode="before")
    @classmethod
    def validate_log_level(cls, v: Any) -> str:
        """
        Normalize and validate log_level to be one of debug, info, warning, error, critical.

        :param v: The raw log level value.
        :type v: Any
        :returns: Normalized log level string.
        :rtype: str
        :raises ValueError: If v is not a valid log level.
        """
        v_str = str(v).strip().lower()
        allowed = {"debug", "info", "warning", "error", "critical"}
        if v_str not in allowed:
            raise ValueError("Invalid")
        return v_str

    @field_validator("download_dir", mode="before")  # Changed mode to 'before'
    @classmethod
    def ensure_download_dir_is_path_obj(cls, v: Any) -> Path:
        """
        Ensure download_dir is converted to a Path object.

        :param v: Raw download_dir value (string or Path).
        :type v: Any
        :returns: Path representation of the download directory.
        :rtype: Path
        """
        if not isinstance(v, Path):
            # Ensure v is a string before passing to Path constructor
            if isinstance(v, str):
                return Path(v)
            return Path(str(v))
        return v

    @field_validator("download_dir")  # Runs after the 'before' validator and Pydantic's own type conversion
    @classmethod
    def validate_download_dir_writable_and_absolute(cls, v: Path) -> Path:
        """
        Validate that download_dir is an absolute, writable directory, creating it if necessary.

        :param v: Path to validate.
        :type v: Path
        :returns: Validated Path object.
        :rtype: Path
        :raises ValueError: If directory cannot be created or is not writable.
        """
        # At this point, v should be a Path object due to the 'before' validator and Pydantic's processing
        if not v.is_absolute():
            v = v.expanduser().resolve()

        try:
            v.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            if v.is_file():
                raise ValueError("Invalid") from None
            raise ValueError("Failed") from e

        if not v.is_dir():  # Should be redundant if mkdir succeeded, but good for robustness
            raise ValueError("Invalid")

        if not os.access(v, os.W_OK):
            raise ValueError("Invalid")
        return v


class DownloadRequest(BaseModel):
    """
    Define schema for download API requests.

    Validates incoming download request payloads for required fields like URL
    and optional parameters such as playlist flags and page title.
    """

    url: str = Field(..., description="URL of the video to download")
    download_id: str | None = Field(None, description="Client-provided unique ID for the download")
    user_agent: str = Field(default="chrome", description="User agent to use for the download")
    referrer: str | None = Field(None, description="Referrer URL")
    format: str | None = Field(None, description="Video format specification")
    download_playlist: bool = Field(False, description="Whether to download a playlist")
    page_title: str | None = Field(None, description="Page title for naming the output file")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format and ensure it's not an obviously malicious URL."""
        v = v.strip()
        if not v or len(v) < 10:
            raise ValueError("Short")

        # Check for file:// and other potentially unsafe protocols
        unsafe_protocols = ["file://", "data:", "javascript:", "vbscript:"]
        if any(v.lower().startswith(proto) for proto in unsafe_protocols):
            raise ValueError("Unsafe")

        # Basic URL structure check
        if not (v.startswith(("http://", "https://"))):
            raise ValueError("Invalid")

        return v

    @field_validator("download_id")
    @classmethod
    def validate_download_id(cls, v: str | None) -> str | None:
        """Validate download_id format if provided."""
        if v is None:
            return v

        v = v.strip()
        if not v:
            return None

        if len(v) > 64:
            raise ValueError("Long")

        # Check for any characters that might be problematic in filenames or logs
        if any(c in v for c in ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]):
            raise ValueError("Invalid")

        return v

    @field_validator("page_title")
    @classmethod
    def validate_page_title(cls, v: str | None) -> str | None:
        """Validate page_title if provided."""
        if v is None or not v.strip():
            return None

        # Limit the length of page_title to prevent excessive titles
        if len(v) > 500:
            return v[:500]

        return v


class ConfigUpdate(BaseModel):
    """
    Define schema for configuration update requests.

    Validates API request payloads to update server configuration settings.
    """

    server_port: int | None = Field(
        None,
        ge=1024,
        le=65535,
        description="Server port (Caution: changing this can affect server accessibility)",
    )
    download_dir: str | None = Field(None, description="Download directory path. Must be absolute or use ~.")
    debug_mode: bool | None = Field(None, description="Debug mode")
    enable_history: bool | None = Field(None, description="Enable download history")
    log_level: str | None = Field(None, description="Logging level")
    console_log_level: str | None = Field(
        None,
        description=(
            "Console logging level (warning for minimal output, info for regular output, debug for verbose output)"
        ),
    )

    max_concurrent_downloads: int | None = Field(None, ge=1, description="Maximum number of concurrent downloads.")
    download_history_limit: int | None = Field(
        None, ge=0, description="Maximum number of entries in download history."
    )
    allowed_domains: list[str] | None = Field(
        None, description="List of allowed domains for downloads (empty means all)."
    )
    ffmpeg_path: str | None = Field(None, description="Path to the ffmpeg executable.")
    scan_interval_ms: int | None = Field(None, ge=1000, description="Scan interval in milliseconds.")
    allow_playlists: bool | None = Field(None, description="Allow or disallow downloading entire playlists.")
    yt_dlp_options: dict[str, Any] | None = Field(
        default=None,
        alias="ytdlp_options",
        description=("Specific options for yt-dlp. Values provided will be merged with existing yt-dlp options."),
    )

    @field_validator("download_dir")  # This is for ConfigUpdate, not ServerConfig
    @classmethod
    def validate_download_dir_format(cls, v: str | None) -> str | None:
        if v is not None:
            path = Path(v)  # Use pathlib.Path
            if str(path).startswith("~"):
                path = path.expanduser()
            if not path.is_absolute():
                raise ValueError("Invalid")
            return str(path)
        return v

    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,  # Allow using field names as well as aliases
    )  # Forbid unknown keys except recognized via name or alias


class GalleryDLRequest(BaseModel):
    """
    Define schema for gallery-dl API requests.

    Validates incoming request payloads for gallery-dl download endpoint.
    """

    url: str = Field(..., description="URL of the gallery to download")
    download_id: str | None = Field(
        None, description="Client-provided unique ID for the download"
    )  # Added download_id
    download_type: str = Field(default="gallery", description="Type of download (gallery or media)")


class ResumeRequest(BaseModel):
    """
    Define schema for download resume API requests.

    Validates incoming request payloads to resume downloads by ID.
    """

    ids: list[str] = Field(..., description="List of download IDs to resume")


class PriorityRequest(BaseModel):
    priority: int


class HistoryClearRequest(BaseModel):
    action: str


class HistoryQuery(BaseModel):
    """
    Define schema for history query parameters.

    Validates filtering and pagination options for history retrieval endpoint.
    """

    limit: int | None = Field(None, ge=1, description="Maximum number of entries to return")
    status: str | None = Field(None, description="Filter by status (completed, failed)")
    domain: str | None = Field(None, description="Filter by domain")


class LogsQuery(BaseModel):
    """
    Define schema for log retrieval query parameters.

    Validates optional parameters such as line count and ordering for log endpoint.
    """

    lines: int | None = Field(None, ge=1, description="Number of lines to return")
    recent: bool | None = Field(None, description="Whether to return most recent lines first")
