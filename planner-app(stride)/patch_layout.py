import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# For TaskBankCard (first match), replace w-[320px] -> w-[384px] and dragConstraints={{ left: -320 -> -384
content = content.replace('w-[320px]', 'w-[384px]', 1)
content = content.replace('dragConstraints={{ left: -320', 'dragConstraints={{ left: -384', 1)

# For the next two (DayTask items), replace w-[320px] -> w-[256px] and -320 -> -256
content = content.replace('w-[320px]', 'w-[256px]')
content = content.replace('dragConstraints={{ left: -320', 'dragConstraints={{ left: -256')

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
