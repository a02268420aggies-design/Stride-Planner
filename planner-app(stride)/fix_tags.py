import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace goalsArray filtering
content = content.replace(
    'computedDailyItems.filter(t => t.tag_id === goalsTagId)',
    'computedDailyItems.filter(t => goalsTagId && t.tag_id === goalsTagId)'
)

# Replace prioritiesArray filtering
content = content.replace(
    'computedDailyItems.filter(t => t.is_priority && t.tag_id !== goalsTagId)',
    'computedDailyItems.filter(t => t.is_priority && (!goalsTagId || t.tag_id !== goalsTagId))'
)

# Replace tasksArray filtering
content = content.replace(
    'computedDailyItems.filter(t => !t.is_priority && t.tag_id !== goalsTagId)',
    'computedDailyItems.filter(t => !t.is_priority && (!goalsTagId || t.tag_id !== goalsTagId))'
)

# Also fix the counts calculation at line 2522
content = content.replace(
    'items.filter(t => t.is_done && !t.is_priority && t.tag_id !== goalsTagId)',
    'items.filter(t => t.is_done && !t.is_priority && (!goalsTagId || t.tag_id !== goalsTagId))'
)
content = content.replace(
    'items.filter(t => !t.is_priority && t.tag_id !== goalsTagId)',
    'items.filter(t => !t.is_priority && (!goalsTagId || t.tag_id !== goalsTagId))'
)
content = content.replace(
    'items.filter(t => t.is_done && t.is_priority && t.tag_id !== goalsTagId)',
    'items.filter(t => t.is_done && t.is_priority && (!goalsTagId || t.tag_id !== goalsTagId))'
)
content = content.replace(
    'items.filter(t => t.is_priority && t.tag_id !== goalsTagId)',
    'items.filter(t => t.is_priority && (!goalsTagId || t.tag_id !== goalsTagId))'
)
content = content.replace(
    'items.filter(t => t.is_done && t.tag_id === goalsTagId)',
    'items.filter(t => t.is_done && goalsTagId && t.tag_id === goalsTagId)'
)
content = content.replace(
    'items.filter(t => t.tag_id === goalsTagId)',
    'items.filter(t => goalsTagId && t.tag_id === goalsTagId)'
)

# And in border colors
content = content.replace(
    'task.is_priority && task.tag_id !== goalsTagId ?',
    'task.is_priority && (!goalsTagId || task.tag_id !== goalsTagId) ?'
)
content = content.replace(
    'task.tag_id === goalsTagId ?',
    '(goalsTagId && task.tag_id === goalsTagId) ?'
)

# And in Target icon logic
content = content.replace(
    '(task.is_goal || task.tag_id === goalsTagId)',
    '(task.is_goal || (goalsTagId && task.tag_id === goalsTagId))'
)
content = content.replace(
    'const isGoal = task.tag_id === goalsTagId;',
    'const isGoal = goalsTagId && task.tag_id === goalsTagId;'
)

# Replace all remaining .text usages just to be 100% thorough
content = content.replace('{ghost.text}', '{ghost.title || ghost.text || ghost.name || "Untitled"}')
content = content.replace('rt.text', '(rt.title || rt.text || rt.name || "Untitled")')
content = content.replace('{pri.text}', '{pri.title || pri.text || pri.name || "Untitled"}')
content = content.replace('{p.text}', '{p.title || p.text || p.name || "Untitled"}')
content = content.replace('m.text.toLowerCase()', '(m.title || m.text || m.name || "").toLowerCase()')


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
