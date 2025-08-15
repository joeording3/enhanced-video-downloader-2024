from server.downloads.ytdlp import _format_duration, map_error_message, parse_bytes


def test_map_error_message_common() -> None:
    et, um = map_error_message("HTTP Error 404: Not Found")
    assert et == "YT_DLP_HTTP_404_NOT_FOUND"
    assert "not found" in um.lower()

    et, um = map_error_message("Unsupported URL: foo")
    assert et == "YT_DLP_UNSUPPORTED_URL"


def test_map_error_message_default() -> None:
    et, um = map_error_message("weird site blew up")
    assert et == "YT_DLP_UNKNOWN_ERROR"
    assert "weird site" in um


def test_parse_bytes_units() -> None:
    assert parse_bytes("1.5MiB") == int(1.5 * 1024**2)
    assert parse_bytes("2GB") == 2 * 1024**3
    assert parse_bytes("123") == 123
    assert parse_bytes("") is None


def test_format_duration() -> None:
    assert _format_duration(5.2) == "5s"
    assert _format_duration(125.0) == "2m5s"
    assert _format_duration(3666.0) == "1h1m"
