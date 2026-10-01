import re

file_path = r'c:\codeprojects\planner-app(stride)\src\app\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix in computedDailyItems
content = content.replace(
    "if (rt.startDate && activeDate < new Date(rt.startDate + 'T00:00:00')) return;",
    "if (rt.startDate && dateKey < rt.startDate) return;"
)
content = content.replace(
    "if (rt.endDate && activeDate > new Date(rt.endDate + 'T00:00:00')) return;",
    "if (rt.endDate && dateKey > rt.endDate) return;"
)

# Fix in renderWeekCard
content = content.replace(
    "if (rt.startDate && activeDate < new Date(rt.startDate + 'T00:00:00')) return;",
    "if (rt.startDate && colKey < rt.startDate) return;"
)
content = content.replace(
    "if (rt.endDate && activeDate > new Date(rt.endDate + 'T00:00:00')) return;",
    "if (rt.endDate && colKey > rt.endDate) return;"
)

# Fix in Month view
content = content.replace(
    "if (rt.startDate && mActiveDate < new Date(rt.startDate + 'T00:00:00')) return;",
    "if (rt.startDate && mKey < rt.startDate) return;"
)
content = content.replace(
    "if (rt.endDate && mActiveDate > new Date(rt.endDate + 'T00:00:00')) return;",
    "if (rt.endDate && mKey > rt.endDate) return;"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
