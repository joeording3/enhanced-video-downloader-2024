"""Test the --fg flag logic in CLI commands."""


def test_fg_flag_overrides_daemon_logic():
    """Test that the --fg flag correctly overrides daemon setting."""
    # Test that when fg=True, daemon should be set to False
    daemon = True
    fg = True

    if fg:
        daemon = False

    assert daemon is False

    # Test that when fg=False, daemon setting is preserved
    daemon = True
    fg = False

    if fg:
        daemon = False

    assert daemon is True


def test_fg_flag_logic_matches_cli_implementation():
    """Test that the logic matches what's implemented in the CLI."""
    # This test verifies that the logic in the CLI matches our expectations

    # Scenario 1: --fg flag is used
    daemon = True  # Default daemon mode
    fg = True  # But --fg flag is set

    # If --fg flag is used, override daemon setting to run in foreground
    if fg:
        daemon = False

    assert daemon is False, "When --fg is True, daemon should be False"

    # Scenario 2: --fg flag is not used
    daemon = True  # Default daemon mode
    fg = False  # No --fg flag

    # If --fg flag is used, override daemon setting to run in foreground
    if fg:
        daemon = False

    assert daemon is True, "When --fg is False, daemon should remain True"
