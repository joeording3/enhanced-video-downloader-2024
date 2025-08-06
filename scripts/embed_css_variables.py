#!/usr/bin/env python3
"""
Embed CSS variables from styles.css into other CSS files.

This script extracts CSS variables from styles.css and embeds them at the top
of popup.css and options.css to ensure the variables are available.
"""

import re
from pathlib import Path


def extract_css_variables(css_file):
    """Extract CSS variables from a CSS file."""
    with open(css_file, 'r') as f:
        content = f.read()
    
    # Find the :root block
    root_match = re.search(r':root\s*\{([^}]+)\}', content, re.DOTALL)
    if root_match:
        return root_match.group(1).strip()
    return ""


def embed_variables_in_css(target_file, variables_content):
    """Embed CSS variables at the top of a CSS file."""
    with open(target_file, 'r') as f:
        content = f.read()
    
    # Check if variables are already embedded
    if ':root' in content:
        print(f"Variables already present in {target_file}")
        return
    
    # Add variables at the top
    new_content = f"""/* CSS Variables from styles.css */
:root {{
{variables_content}
}}

{content}"""
    
    with open(target_file, 'w') as f:
        f.write(new_content)
    
    print(f"Embedded variables in {target_file}")


def main():
    """Main function to embed CSS variables."""
    ui_dir = Path("extension/ui")
    styles_file = ui_dir / "styles.css"
    popup_file = ui_dir / "popup.css"
    options_file = ui_dir / "options.css"
    
    if not styles_file.exists():
        print(f"Error: {styles_file} not found")
        return
    
    # Extract variables from styles.css
    variables = extract_css_variables(styles_file)
    if not variables:
        print("Error: No CSS variables found in styles.css")
        return
    
    # Embed variables in other CSS files
    if popup_file.exists():
        embed_variables_in_css(popup_file, variables)
    
    if options_file.exists():
        embed_variables_in_css(options_file, variables)
    
    print("CSS variables embedded successfully!")


if __name__ == "__main__":
    main()
