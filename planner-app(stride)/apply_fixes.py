import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Label Fix
content = content.replace(
    'text?: string; title?: string; name?: string;',
    'text?: string; title?: string; name?: string; label?: string;'
)

def replacer(match):
    obj = match.group(1)
    fallback = match.group(2)
    return f'{obj}.title || {obj}.text || {obj}.name || {obj}.label || "{fallback}"'
content = re.sub(r'(\w+)\.title \|\| \1\.text \|\| \1\.name \|\| "([^"]*)"', replacer, content)

def replacer_empty(match):
    obj = match.group(1)
    return f'({obj}.title || {obj}.text || {obj}.name || {obj}.label || "")'
content = re.sub(r'\((\w+)\.title \|\| \1\.text \|\| \1\.name \|\| ""\)', replacer_empty, content)


# 2. Ranks Fix
rank_logic = '''  let unrankedPriorities = [...prioritiesArray];
  const priorityRenderSlots = Array.from({ length: Math.max(5, prioritiesArray.length) }).map((_, i) => {
    const explicitIdx = unrankedPriorities.findIndex(t => t.priority_rank === i);
    if (explicitIdx !== -1) return unrankedPriorities.splice(explicitIdx, 1)[0];
    return null;
  }).map((slot, i) => {
    if (slot) return slot;
    if (unrankedPriorities.length > 0) return unrankedPriorities.shift();
    return { id: empty-priority-slot-, is_empty: true };
  });

  let unrankedTodos = [...tasksArray];
  const todoRenderSlots = Array.from({ length: Math.max(9, tasksArray.length) }).map((_, i) => {
    const explicitIdx = unrankedTodos.findIndex(t => t.todo_rank === i);
    if (explicitIdx !== -1) return unrankedTodos.splice(explicitIdx, 1)[0];
    return null;
  }).map((slot, i) => {
    if (slot) return slot;
    if (unrankedTodos.length > 0) return unrankedTodos.shift();
    return { id: empty-todo-slot-, is_empty: true };
  });

  let unrankedGoals = [...goalsArray];
  const goalRenderSlots = Array.from({ length: Math.max(5, goalsArray.length) }).map((_, i) => {
    const explicitIdx = unrankedGoals.findIndex(t => t.goal_rank === i);
    if (explicitIdx !== -1) return unrankedGoals.splice(explicitIdx, 1)[0];
    return null;
  }).map((slot, i) => {
    if (slot) return slot;
    if (unrankedGoals.length > 0) return unrankedGoals.shift();
    return { id: empty-goal-slot-, is_empty: true };
  });'''

pattern = re.compile(r'  let unrankedPriorities = prioritiesArray\.filter.*?return \{ id: empty-goal-slot-\$\{i\}.*?\}\);\n', re.DOTALL)
content = pattern.sub(rank_logic + '\n', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
