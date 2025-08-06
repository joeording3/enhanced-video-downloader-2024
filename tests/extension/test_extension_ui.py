from pathlib import Path

import pytest

pytestmark = pytest.mark.ui

# existing code follows


def test_popup_html_exists() -> None:
    """Ensure the extension popup HTML file exists."""
    # Handle mutation testing context - check both current directory and project root
    current_dir = Path.cwd()
    project_root = Path(__file__).parents[2]

    # Try multiple possible locations for the file
    possible_paths = [
        current_dir / "extension" / "ui" / "popup.html",
        project_root / "extension" / "ui" / "popup.html",
        current_dir / ".." / "extension" / "ui" / "popup.html",
    ]

    popup_path = None
    for path in possible_paths:
        if path.exists():
            popup_path = path
            break

    assert popup_path is not None, f"popup.html not found in any of: {[str(p) for p in possible_paths]}"


def test_options_html_contains_form() -> None:
    """Ensure the extension options page contains form or input elements."""
    # Handle mutation testing context - check both current directory and project root
    current_dir = Path.cwd()
    project_root = Path(__file__).parents[2]

    # Try multiple possible locations for the file
    possible_paths = [
        current_dir / "extension" / "ui" / "options.html",
        project_root / "extension" / "ui" / "options.html",
        current_dir / ".." / "extension" / "ui" / "options.html",
    ]

    options_path = None
    for path in possible_paths:
        if path.exists():
            options_path = path
            break

    assert options_path is not None, f"options.html not found in any of: {[str(p) for p in possible_paths]}"
    content = options_path.read_text()
    assert "<form" in content or "<input" in content, "Options page does not contain a form or input elements"


def test_manifest_json_exists() -> None:
    """Ensure extension manifest.json is present in project root."""
    # Handle mutation testing context - check both current directory and project root
    current_dir = Path.cwd()
    project_root = Path(__file__).parents[2]

    # Try multiple possible locations for the file
    possible_paths = [
        current_dir / "manifest.json",
        project_root / "manifest.json",
        current_dir / ".." / "manifest.json",
    ]

    manifest_path = None
    for path in possible_paths:
        if path.exists():
            manifest_path = path
            break

    assert manifest_path is not None, f"manifest.json not found in any of: {[str(p) for p in possible_paths]}"
