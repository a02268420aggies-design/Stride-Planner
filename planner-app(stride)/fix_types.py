import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'type RecurringTask = { id: string; text: string;',
    'type RecurringTask = { id: string; text?: string; title?: string; name?: string;'
)

content = content.replace(
    'type MasterTask = { id: string; text: string;',
    'type MasterTask = { id: string; text?: string; title?: string; name?: string;'
)

content = content.replace(
    'type TaskItem = { id: string; master_id: string; text: string;',
    'type TaskItem = { id: string; master_id: string; text?: string; title?: string; name?: string;'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
