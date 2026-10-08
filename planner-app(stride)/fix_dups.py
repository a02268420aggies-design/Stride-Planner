import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('label?: string; label?: string;', 'label?: string;')
content = content.replace('label || task.label', 'label')
content = content.replace('label || ghost.label', 'label')
content = content.replace('label || rt.label', 'label')
content = content.replace('label || item.label', 'label')
content = content.replace('label || m.label', 'label')
content = content.replace('label || pri.label', 'label')
content = content.replace('label || p.label', 'label')
content = content.replace('label || recurringModalTask.label', 'label')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
