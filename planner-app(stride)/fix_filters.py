import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add isGhost filter to computedDailyItems
content = content.replace(
    'const items = [...dayData.items];',
    'const items = [...dayData.items].filter((i: any) => i.isGhost !== true);'
)
content = content.replace(
    'let items = [...dayData.items];',
    'let items = [...dayData.items].filter((i: any) => i.isGhost !== true);'
)

# Add debug log before return items in computedDailyItems
content = content.replace(
    'return items;\n  }, [dayData.items, dateKey, recurringTasks, completedRoutines]);',
    'console.log("Selected Day:", dateKey, "Filtered Tasks:", items);\n    return items;\n  }, [dayData.items, dateKey, recurringTasks, completedRoutines]);'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
