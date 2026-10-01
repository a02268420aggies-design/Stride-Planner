import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<span className="text-base font-bold text-white leading-snug">{item.text}</span>',
    '<span className="text-base font-bold text-white leading-snug">{item.title || item.text || item.name || "Untitled Task"}</span>'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
