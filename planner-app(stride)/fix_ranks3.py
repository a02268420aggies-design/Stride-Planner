import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(r'id: \empty-priority-slot-\,', 'id: empty-priority-slot-,')
content = content.replace(r'id: \empty-todo-slot-\,', 'id: empty-todo-slot-,')
content = content.replace(r'id: \empty-goal-slot-\,', 'id: empty-goal-slot-,')
content = content.replace('empty-goal-slot-,', 'empty-goal-slot-,')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
