import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """  let unrankedPriorities = [...prioritiesArray];
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
  });"""

start_str = "let unrankedPriorities = prioritiesArray.filter(t => t.priority_rank === undefined);"
end_str = "return { id: empty-goal-slot-, is_empty: true };\n  });"

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + replacement + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
