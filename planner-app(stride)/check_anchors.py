with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

checks = [
    '// Default Tags',
    'findTagNameByColor',
    'const TaskBankCard = ({',
    'placeholder="New Tag Name"',
    'const EditTaskModal = ({ task, tags',
    'const [tags, setTags] = useState<TagItem[]>(() => {',
    'const closeTaskBank = () => {',
    'const handleAddTag = () => {',
    'const resetModal = () => {',
    'const sortedTagKeys = Object.keys(bankByTag).sort',
    'activeInlineCol === colKey',
    "bankActiveTab === 'tasks'",
    "Yesterday's Unfinished Section",
    '{/* Edit Task Modal */}',
    'newTaskTagId || isCreatingTag'
]

for c in checks:
    print(c, '-->', c in text)
