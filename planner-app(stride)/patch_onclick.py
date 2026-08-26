import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace TaskBankCard click
content = re.sub(
    r'(\s+)className="relative z-10 w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 rounded-xl"\s+onClick=\{\(\) => setEditingTask\(task\)\}',
    r'\1className="relative z-10 w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 rounded-xl"',
    content
)

# Replace other Task Card clicks
content = re.sub(
    r'(\s+)className="relative z-10 w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 rounded-xl"\s+onClick=\{\(\) => \{ const m = taskBank\.find\(t => t\.id === task\.master_id\); if\(m\) setEditingTask\(m\); \}\}',
    r'\1className="relative z-10 w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 rounded-xl"',
    content
)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
