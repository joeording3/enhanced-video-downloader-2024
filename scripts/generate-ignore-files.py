#!/usr/bin/env python3
"""
Generate ignore files for all development tools from centralized configuration.

This script reads config/ignore-patterns.json and generates:
- .gitignore
- .prettierignore
- .stylelintignore
- jest.config.js (ignore patterns section)
- eslint.config.cjs (ignore patterns section)
- .flake8 (exclude section)
- pyproject.toml (tool-specific exclude sections)

Usage:
    python scripts/generate-ignore-files.py
"""

import json
import re
from pathlib import Path
from typing import Any


def load_ignore_patterns() -> dict[str, Any]:
    """Load the centralized ignore patterns configuration."""
    config_path = Path("config/ignore-patterns.json")
    if not config_path.exists():
        raise FileNotFoundError("Missing")

    with config_path.open(encoding="utf-8") as f:
        data = json.load(f)
        return data if isinstance(data, dict) else {}


def get_patterns_for_tool(config: dict[str, Any], tool_name: str) -> list[str]:
    """Get the patterns for a specific tool."""
    if tool_name not in config["tool_specific"]:
        raise ValueError("Unknown")

    tool_config = config["tool_specific"][tool_name]
    pattern_groups = tool_config["patterns"]

    # Collect all patterns from the specified groups
    all_patterns = []
    for group_name in pattern_groups:
        if group_name in config["patterns"]:
            all_patterns.extend(config["patterns"][group_name])
        else:
            pass

    return sorted(set(all_patterns))  # Remove duplicates and sort


def generate_gitignore(patterns: list[str]) -> str:
    """Generate .gitignore content."""
    lines = [
        "# Generated from config/ignore-patterns.json - DO NOT EDIT DIRECTLY",
        "# Run: python scripts/generate-ignore-files.py to update",
        "",
    ]

    # Group patterns by type for better organization
    python_patterns = [p for p in patterns if "py" in p or "__pycache__" in p or ".py" in p]
    node_patterns = [p for p in patterns if "node" in p or "npm" in p or "yarn" in p]
    build_patterns = [p for p in patterns if "build" in p or "dist" in p or "cache" in p]
    system_patterns = [
        p for p in patterns if p.startswith(".") and not any(x in p for x in ["py", "node", "build", "dist"])
    ]
    other_patterns = [
        p for p in patterns if p not in python_patterns + node_patterns + build_patterns + system_patterns
    ]

    if python_patterns:
        lines.extend(["# Python", "", *python_patterns, ""])

    if node_patterns:
        lines.extend(["# Node.js", "", *node_patterns, ""])

    if build_patterns:
        lines.extend(["# Build artifacts", "", *build_patterns, ""])

    if system_patterns:
        lines.extend(["# System files", "", *system_patterns, ""])

    if other_patterns:
        lines.extend(["# Other", "", *other_patterns, ""])

    return "\n".join(lines)


def generate_prettierignore(patterns: list[str]) -> str:
    """Generate .prettierignore content."""
    lines = [
        "# Generated from config/ignore-patterns.json - DO NOT EDIT DIRECTLY",
        "# Run: python scripts/generate-ignore-files.py to update",
        "",
    ]
    lines.extend(patterns)
    return "\n".join(lines)


def generate_stylelintignore(patterns: list[str]) -> str:
    """Generate .stylelintignore content."""
    lines = [
        "# Generated from config/ignore-patterns.json - DO NOT EDIT DIRECTLY",
        "# Run: python scripts/generate-ignore-files.py to update",
        "",
    ]
    lines.extend(patterns)
    return "\n".join(lines)


def update_jest_config(patterns: list[str]) -> None:
    """Update jest.config.js with new ignore patterns."""
    config_path = Path("jest.config.js")
    if not config_path.exists():
        return

    with config_path.open(encoding="utf-8") as f:
        content = f.read()

    # Convert patterns to Jest format (remove trailing slashes, add leading slashes)
    jest_patterns = []
    for pattern in patterns:
        # Remove trailing slash and add leading slash for Jest
        clean_pattern = pattern.rstrip("/")
        if not clean_pattern.startswith("/"):
            clean_pattern = "/" + clean_pattern
        jest_patterns.append(clean_pattern)

    # Create the new testPathIgnorePatterns array
    patterns_str = ",\n    ".join(f'"{pattern}"' for pattern in jest_patterns)

    # Replace the existing testPathIgnorePatterns section
    pattern = r"testPathIgnorePatterns:\s*\[[\s\S]*?\],"
    replacement = f"testPathIgnorePatterns: [\n    {patterns_str},\n  ],"

    new_content = re.sub(pattern, replacement, content)

    with config_path.open("w", encoding="utf-8") as f:
        f.write(new_content)


def update_eslint_config(patterns: list[str]) -> None:
    """Update eslint.config.cjs with new ignore patterns."""
    config_path = Path("eslint.config.cjs")
    if not config_path.exists():
        return

    with config_path.open(encoding="utf-8") as f:
        content = f.read()

    # Convert patterns to ESLint format (add **/ prefix for glob patterns)
    eslint_patterns = []
    for pattern in patterns:
        if pattern.startswith("*"):
            # File patterns like *.log, *.tmp
            eslint_patterns.append(f"**/{pattern}")
        elif pattern.endswith("/"):
            # Directory patterns like node_modules/
            eslint_patterns.append(f"**/{pattern}**")
        else:
            # Other patterns
            eslint_patterns.append(f"**/{pattern}")

    # Create the new ignores array
    patterns_str = ",\n      ".join(f'"{pattern}"' for pattern in eslint_patterns)

    # Replace the existing ignores section
    pattern = r"ignores:\s*\[[\s\S]*?\],"
    replacement = f"ignores: [\n      {patterns_str},\n    ],"

    new_content = re.sub(pattern, replacement, content)

    with config_path.open("w", encoding="utf-8") as f:
        f.write(new_content)


def update_flake8_config(patterns: list[str]) -> None:
    """Update .flake8 with new exclude patterns."""
    config_path = Path(".flake8")
    if not config_path.exists():
        return

    with config_path.open(encoding="utf-8") as f:
        content = f.read()

    # Convert patterns to Flake8 format (remove trailing slashes, comma-separated)
    flake8_patterns = []
    for pattern in patterns:
        clean_pattern = pattern.rstrip("/")
        if clean_pattern.startswith("*"):
            # Keep glob patterns as-is
            flake8_patterns.append(clean_pattern)
        else:
            # Remove leading slash if present
            clean_pattern = clean_pattern.lstrip("/")
            flake8_patterns.append(clean_pattern)

    # Create the new exclude line
    exclude_str = ", ".join(flake8_patterns)

    # Replace the existing exclude line
    pattern = r"exclude\s*=\s*[\s\S]*?(?=\n#|\nper-file-ignores|\n$)"
    replacement = f"exclude =\n    {exclude_str}"

    new_content = re.sub(pattern, replacement, content)

    with config_path.open("w", encoding="utf-8") as f:
        f.write(new_content)


def update_pyproject_toml(patterns: dict[str, list[str]]) -> None:
    """Update pyproject.toml with new exclude patterns for all Python tools."""
    config_path = Path("pyproject.toml")
    if not config_path.exists():
        return

    with config_path.open(encoding="utf-8") as f:
        content = f.read()

    # Update each tool's exclude section
    tools_to_update = ["black", "isort", "flake8", "ruff"]

    for tool in tools_to_update:
        if tool in patterns:
            tool_patterns = patterns[tool]

            # Convert patterns to TOML format
            if tool in ["black", "isort"]:
                # These tools use regex patterns
                toml_patterns = []
                for pattern in tool_patterns:
                    clean_pattern = pattern.rstrip("/")
                    if clean_pattern.startswith("*"):
                        # Convert glob to regex
                        regex_pattern = clean_pattern.replace("*", ".*")
                        toml_patterns.append(regex_pattern)
                    else:
                        toml_patterns.append(clean_pattern)

                # Create the exclude section
                if tool == "black":
                    exclude_str = " | ".join(toml_patterns)
                    pattern = r"exclude = \'\'\'[\s\S]*?\'\'\'"
                    replacement = f"exclude = '''\n/(\n  {' | '.join(toml_patterns)}\n)/\n'''"
                else:  # isort
                    exclude_str = ", ".join(toml_patterns)
                    pattern = rf"\[tool\.{tool}\]\s*profile\s*=.*?\nskip\s*=.*?\n"
                    replacement = f'[tool.{tool}]\nprofile = "black"\nline_length = 120\nskip = {exclude_str}\n'
            else:
                # These tools use simple patterns
                exclude_str = ", ".join(f'"{pattern}"' for pattern in tool_patterns)
                pattern = rf"\[tool\.{tool}\]\s*line-length\s*=.*?\nexclude\s*=.*?\n"
                replacement = f"[tool.{tool}]\nline-length = 120\nexclude = [{exclude_str}]\n"

            new_content = re.sub(pattern, replacement, content)
            content = new_content

    with config_path.open("w", encoding="utf-8") as f:
        f.write(new_content)


def main() -> None:
    """Main function to generate all ignore files."""
    config = load_ignore_patterns()

    # Generate .gitignore
    git_patterns = get_patterns_for_tool(config, "git")
    gitignore_content = generate_gitignore(git_patterns)
    with Path(".gitignore").open("w", encoding="utf-8") as f:
        f.write(gitignore_content)

    # Generate .prettierignore
    prettier_patterns = get_patterns_for_tool(config, "prettier")
    prettierignore_content = generate_prettierignore(prettier_patterns)
    with Path(".prettierignore").open("w", encoding="utf-8") as f:
        f.write(prettierignore_content)

    # Generate .stylelintignore
    stylelint_patterns = get_patterns_for_tool(config, "stylelint")
    stylelintignore_content = generate_stylelintignore(stylelint_patterns)
    with Path(".stylelintignore").open("w", encoding="utf-8") as f:
        f.write(stylelintignore_content)

    # Update Jest config
    jest_patterns = get_patterns_for_tool(config, "jest")
    update_jest_config(jest_patterns)

    # Update ESLint config
    eslint_patterns = get_patterns_for_tool(config, "eslint")
    update_eslint_config(eslint_patterns)

    # Update Flake8 config
    flake8_patterns = get_patterns_for_tool(config, "flake8")
    update_flake8_config(flake8_patterns)

    # Update pyproject.toml for Python tools
    python_tool_patterns = {}
    for tool in ["black", "isort", "flake8", "ruff"]:
        python_tool_patterns[tool] = get_patterns_for_tool(config, tool)
    update_pyproject_toml(python_tool_patterns)


if __name__ == "__main__":
    main()
