import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{task.text}', '{task.title || task.text || task.name || "Untitled Task"}')
content = content.replace('task.text.trim()', '(task.title || task.text || task.name || "").trim()')
content = content.replace('task.text.toLowerCase()', '(task.title || task.text || task.name || "").toLowerCase()')
content = content.replace('{recurringModalTask.text}', '{recurringModalTask.title || recurringModalTask.text || recurringModalTask.name || "Untitled Task"}')
content = content.replace('useState(task.text)', 'useState(task.title || task.text || task.name || "")')
content = content.replace('text: task.text', 'text: task.title || task.text || task.name || "Untitled Task"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Replacements done.')
