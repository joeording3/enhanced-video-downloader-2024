from pathlib import Path
from typing import Any


def test_debug_paths_endpoint(client: Any) -> None:
    # Exercise the debug/paths endpoint
    response = client.get("/debug/paths")
    assert response.status_code == 200
    data = response.get_json()

    # Check required fields
    assert "project_root" in data
    assert isinstance(data["project_root"], str)
    assert Path(data["project_root"]).is_dir()

    assert "current_working_dir" in data
    assert isinstance(data["current_working_dir"], str)

    assert "config_path" in data
    assert isinstance(data["config_path"], str)

    assert "config_exists" in data
    assert isinstance(data["config_exists"], bool)

    assert "config_content" in data
    # config_content can be None or dict
    assert data["config_content"] is None or isinstance(data["config_content"], dict)

    assert "log_files" in data
    assert isinstance(data["log_files"], list)
    # Each log entry should have a path and exists flag
    for entry in data["log_files"]:
        assert "path" in entry
        assert isinstance(entry["path"], str)
        assert "exists" in entry
        assert isinstance(entry["exists"], bool)

    assert "logging_config" in data
    assert "root_level" in data["logging_config"]
    assert isinstance(data["logging_config"]["root_level"], int)

    assert "test_write" in data
    test_write = data["test_write"]
    assert "path" in test_write
    assert isinstance(test_write["path"], str)
    assert "success" in test_write
    assert isinstance(test_write["success"], bool)
