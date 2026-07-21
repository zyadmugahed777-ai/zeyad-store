import os
import re

css_files = ["styles.css", "product-page.css", "responsive-pro.css", "production-polish.css"]

replacements = [
    # Backgrounds
    (r'background(?:-color)?\s*:\s*(?:#ffffff|#fff|white)\b(?![^;]*\))', r'background-color: var(--surface)'),
    (r'background(?:-color)?\s*:\s*(?:#fafafa|#f8f8f8|#f5f5f5)\b', r'background-color: var(--surface-2)'),
    (r'background\s*:\s*(?:#ffffff|#fff|white)\b\s+url', r'background: var(--surface) url'),
    
    # Text Colors
    (r'color\s*:\s*(?:#000000|#000|black)\b', r'color: var(--ink)'),
    (r'color\s*:\s*(?:#333333|#333|#444)\b', r'color: var(--ink-soft)'),
    (r'color\s*:\s*(?:#666666|#666|#777|#888)\b', r'color: var(--muted)'),
    
    # Borders
    (r'border(?:-(?:top|bottom|left|right))?\s*:\s*([^;]*)(?:#eeeeee|#eee|#dddddd|#ddd|#e0e0e0|#e5e5e5|#cccccc|#ccc)\b', r'border: \1 var(--line)'),
    (r'border-color\s*:\s*(?:#eeeeee|#eee|#dddddd|#ddd|#e0e0e0|#e5e5e5|#cccccc|#ccc)\b', r'border-color: var(--line)'),
]

for filename in css_files:
    filepath = os.path.join("d:\\played\\Zeyad For Business", filename)
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original_content = content
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content, flags=re.IGNORECASE)
        
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filename}")
    else:
        print(f"No changes for {filename}")
