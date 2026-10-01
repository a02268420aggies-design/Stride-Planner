import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'type MealEntry = { id: string; type: MealType; text: string; };',
    'type MealEntry = { id: string; type: MealType; text?: string; title?: string; name?: string; };'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
