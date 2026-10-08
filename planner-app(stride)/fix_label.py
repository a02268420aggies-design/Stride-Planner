import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix types to include label?: string;
content = content.replace(
    'text?: string; title?: string; name?: string;',
    'text?: string; title?: string; name?: string; label?: string;'
)

# Fix replacements in UI logic (tasks, meals, recurring tasks, ghost, priorities)
# e.g., task.title || task.text || task.name || "Untitled Task"
# Since they can be 'task', 'ghost', 'rt', 'pri', 'p', 'item', 'm', etc., I will use a regex.

# We want to replace obj.title || obj.text || obj.name || "Untitled Task" (and similar variations like "Untitled")
# with obj.title || obj.text || obj.name || obj.label || "Untitled Task"

# Regex to match: (\\w+)\\.title \\|\\| \\1\\.text \\|\\| \\1\\.name \\|\\| "([^"]*)"
def replacer(match):
    obj = match.group(1)
    fallback = match.group(2)
    return f'{obj}.title || {obj}.text || {obj}.name || {obj}.label || "{fallback}"'

content = re.sub(r'(\w+)\.title \|\| \1\.text \|\| \1\.name \|\| "([^"]*)"', replacer, content)

# There is also one with empty string fallback: (task.title || task.text || task.name || "")
def replacer_empty(match):
    obj = match.group(1)
    return f'({obj}.title || {obj}.text || {obj}.name || {obj}.label || "")'

content = re.sub(r'\((\w+)\.title \|\| \1\.text \|\| \1\.name \|\| ""\)', replacer_empty, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
