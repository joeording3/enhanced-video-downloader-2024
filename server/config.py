"""
Load and save server configuration from `config.json` using Pydantic validation.

This module provides the `Config` class for loading, accessing, and
saving server configuration with type validation and default handling.
"""

import os  # Added os for the __main__ example
from typing import Any, Callable, Dict, List, Tuple, Union

from pydantic import ValidationError

# Use relative import for ServerConfig from schemas.py
from .schemas import ServerConfig  # Removed YTDLPOptions as it's part of ServerConfig

try:
    from dotenv import find_dotenv, load_dotenv, set_key

    load_dotenv()
except ImportError:
    pass


class Config:
    """
    Manage server configuration using Pydantic validation.

    Provides methods to load, access, and save configuration
    stored in `config.json`, ensuring type validation and defaults.
    """

    # JSON config file support removed; configuration is derived solely from environment variables.

    def __init__(self, config_data: Union[ServerConfig, Dict[str, Any]]) -> None:
        """
        Initialize Config instance with provided data.

        :param config_data: Pydantic ServerConfig instance or dict to initialize from.
        :type config_data: Union[ServerConfig, Dict[str, Any]]
        :raises TypeError: If config_data is neither ServerConfig nor dict.
        """
        if isinstance(config_data, ServerConfig):
            self._pydantic_config: ServerConfig = config_data
        elif isinstance(config_data, dict):
            try:
                self._pydantic_config = ServerConfig.model_validate(config_data)
            except ValidationError:
                self._pydantic_config = ServerConfig.model_validate({})
        else:
            # Raise TypeError for invalid input type (expected by tests and more appropriate for user input validation)
            raise TypeError("Invalid")

    def get_value(self, key: str, default: Any = None) -> Any:
        """
        Retrieve a value from the configuration.

        :param key: The name of the configuration key to retrieve.
        :type key: str
        :param default: The default value to return if the key is not present.
        :type default: Any
        :returns: The value of the configuration key, or the default if not found.
        :rtype: Any
        """
        if hasattr(self._pydantic_config, key):
            return getattr(self._pydantic_config, key)
        return default

    def __getattr__(self, name: str) -> Any:
        """
        Allow attribute-style access for configuration fields.

        :param name: Name of the configuration attribute to retrieve.
        :type name: str
        :returns: Value of the configuration attribute.
        :rtype: Any
        :raises AttributeError: If the attribute does not exist in the configuration model.
        """
        if hasattr(self._pydantic_config, name):
            return getattr(self._pydantic_config, name)
        raise AttributeError("Missing")

    def get_download_options(self) -> dict:
        """
        Return yt-dlp options as a dictionary.

        :returns: Dictionary of yt-dlp options.
        :rtype: dict
        """
        return self._pydantic_config.yt_dlp_options.model_dump(mode="json")

    @classmethod
    def load(cls) -> "Config":
        """
        Load configuration from environment variables only.

        :returns: Config instance with environment data.
        :rtype: Config
        """
        env_data = _collect_env_data()
        pydantic_config = ServerConfig.model_validate(env_data)
        return cls(pydantic_config)

    def update_config(self, update_payload: Dict[str, Any]) -> None:
        """
        Update configuration in memory and persist changes to the .env file and environment variables.

        :param update_payload: Mapping of configuration keys to new values.
        :type update_payload: Dict[str, Any]
        :raises RuntimeError: If python-dotenv is not installed.
        :raises FileNotFoundError: If .env file is not found for persisting updates.
        :raises AttributeError: If a provided key does not exist in the configuration model.
        """
        try:
            dotenv_path = find_dotenv()
        except ImportError:
            raise RuntimeError("Missing") from None
        if not dotenv_path:
            raise FileNotFoundError("Missing")

        for key, value in update_payload.items():
            if not hasattr(self._pydantic_config, key):
                raise AttributeError("Missing")
            setattr(self._pydantic_config, key, value)
            # Persist to .env and environment
            env_var = key.upper()
            set_key(dotenv_path, env_var, str(value))
            os.environ[env_var] = str(value)

    @classmethod
    def valid_keys(cls) -> List[str]:
        """
        Get valid top-level configuration keys.

        :returns: Names of all valid configuration fields in `ServerConfig`.
        :rtype: List[str]
        """
        return list(ServerConfig.model_fields.keys())

    def as_dict(self) -> Dict[str, Any]:
        """
        Get configuration data as a plain dictionary.

        :returns: Dictionary representation of the configuration data.
        :rtype: Dict[str, Any]
        """
        # model_dump converts Path objects to strings, which is good for plain dict representation
        return self._pydantic_config.model_dump(mode="json")  # mode='json' ensures Path -> str


# Example usage (optional, for testing)
if __name__ == "__main__":  # pragma: no cover
    try:
        # Ensure os is imported if this example is to be run directly

        cfg = Config.load()
        exists = cfg.download_dir.exists()
        writable = os.access(cfg.download_dir, os.W_OK) if exists else "N/A"

    except Exception:
        pass


# Configuration is now environment-only, no JSON files needed


# Mapping of environment variables to config keys and caster functions
_ENV_VAR_MAPPINGS: List[Tuple[str, str, Callable[[str], Any]]] = [
    ("SERVER_HOST", "server_host", lambda v: v),
    ("SERVER_PORT", "server_port", lambda v: int(v)),
    ("DOWNLOAD_DIR", "download_dir", lambda v: v),
    ("DEBUG_MODE", "debug_mode", lambda v: v.lower() in ("1", "true", "yes")),
    ("MAX_CONCURRENT_DOWNLOADS", "max_concurrent_downloads", lambda v: int(v)),
    ("DOWNLOAD_HISTORY_LIMIT", "download_history_limit", lambda v: int(v)),
    ("ALLOWED_DOMAINS", "allowed_domains", lambda v: [d.strip() for d in v.split(",") if d.strip()]),
    ("FFMPEG_PATH", "ffmpeg_path", lambda v: v),
    ("LOG_LEVEL", "log_level", lambda v: v),
    ("CONSOLE_LOG_LEVEL", "console_log_level", lambda v: v),
    ("LOG_PATH", "log_path", lambda v: v),
    ("SCAN_INTERVAL_MS", "scan_interval_ms", lambda v: int(v)),
    ("SHOW_DOWNLOAD_BUTTON", "show_download_button", lambda v: v.lower() in ("1", "true", "yes")),
    ("ENABLE_HISTORY", "enable_history", lambda v: v.lower() in ("1", "true", "yes")),
    ("ALLOW_PLAYLISTS", "allow_playlists", lambda v: v.lower() in ("1", "true", "yes")),
]


def _collect_env_data() -> Dict[str, Any]:
    """
    Collect configuration overrides from environment variables.

    :returns: Environment configuration data as a dict.
    :rtype: Dict[str, Any]
    """
    env_data: Dict[str, Any] = {}
    for env_var, key, caster in _ENV_VAR_MAPPINGS:
        v = os.getenv(env_var)
        if v is None:
            continue
        try:
            env_data[key] = caster(v)
        except Exception:
            continue
    return env_data
