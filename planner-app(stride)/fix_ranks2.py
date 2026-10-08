import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('empty-priority-slot-', 'empty-priority-slot-')
content = content.replace('empty-todo-slot-', 'empty-todo-slot-')
content = content.replace('empty-goal-slot-', 'empty-goal-slot-')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
