import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('id: empty-priority-slot-,', 'id: empty-priority-slot-,')
content = content.replace('id: empty-todo-slot-,', 'id: empty-todo-slot-,')
content = content.replace('id: empty-goal-slot-,', 'id: empty-goal-slot-,')

# Without the comma:
content = content.replace('id: empty-priority-slot- ', 'id: empty-priority-slot- ')
content = content.replace('id: empty-todo-slot- ', 'id: empty-todo-slot- ')
content = content.replace('id: empty-goal-slot- ', 'id: empty-goal-slot- ')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
