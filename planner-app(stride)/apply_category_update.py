import re

file_path = r"src\app\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update defaultCategories and defaultTags
old_default_tags = """// Default Tags
const defaultTags: TagItem[] = [
  { id: "tag-goals", name: "Goals", color: "#9C9F84" },
  { id: "tag-assignments", name: "Assignments", color: "#000080" },
  { id: "tag-appointments", name: "Appointments", color: "#d97706" },
  { id: "tag-projects", name: "Projects", color: "#7c3aed" },
];"""

new_default_tags = """// Default Categories
const defaultCategories: CategoryItem[] = [
  { id: "general", name: "General" },
  { id: "projects", name: "Projects" },
  { id: "goals", name: "Goals" },
  { id: "assignments", name: "Assignments" },
  { id: "personal", name: "Personal" },
];

// Default Tags
const defaultTags: TagItem[] = [
  { id: "tag-goals", name: "Goals", color: "#9C9F84", category_id: "goals" },
  { id: "tag-assignments", name: "Assignments", color: "#000080", category_id: "assignments" },
  { id: "tag-appointments", name: "Appointments", color: "#d97706", category_id: "personal" },
  { id: "tag-projects", name: "Projects", color: "#7c3aed", category_id: "projects" },
];"""

assert old_default_tags in code, "old_default_tags not found"
code = code.replace(old_default_tags, new_default_tags, 1)

# 2. Add CategorySelector right after findTagNameByColor
old_find_tag = """const findTagNameByColor = (colorHex: string, tagsList: TagItem[]): string | null => {
  const match = tagsList.find(t => t.color.toLowerCase() === colorHex.toLowerCase());
  return match ? match.name : null;
};"""

category_selector_code = """const findTagNameByColor = (colorHex: string, tagsList: TagItem[]): string | null => {
  const match = tagsList.find(t => t.color.toLowerCase() === colorHex.toLowerCase());
  return match ? match.name : null;
};

const CategorySelector = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onAddCategory,
}: {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  onAddCategory: (name: string) => string;
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [catName, setCatName] = useState("");

  const handleAdd = () => {
    if (!catName.trim()) return;
    const newId = onAddCategory(catName.trim());
    setCatName("");
    setIsAdding(false);
    onSelectCategory(newId);
  };

  return (
    <div className="flex flex-col gap-1 w-full text-left">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        Category
      </label>
      {isAdding ? (
        <div className="flex items-center gap-1.5 w-full">
          <input
            type="text"
            placeholder="New Category..."
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
              if (e.key === "Escape") {
                setIsAdding(false);
                setCatName("");
              }
            }}
            className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:border-brand-navy dark:text-zinc-100"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!catName.trim()}
            className="px-2 py-1 bg-brand-navy dark:bg-brand-sage text-white text-xs font-bold rounded disabled:opacity-50 hover:opacity-90 shrink-0"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setCatName("");
            }}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <select
          value={selectedCategory || "general"}
          onChange={(e) => {
            if (e.target.value === "__ADD_CATEGORY__") {
              setIsAdding(true);
            } else {
              onSelectCategory(e.target.value);
            }
          }}
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-brand-navy cursor-pointer"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="__ADD_CATEGORY__" className="font-semibold text-brand-navy dark:text-brand-sage">
            + Add Category
          </option>
        </select>
      )}
    </div>
  );
};"""

assert old_find_tag in code, "old_find_tag not found"
code = code.replace(old_find_tag, category_selector_code, 1)

# 3. Update TaskBankCard props and tag popover
old_taskbankcard_header = """const TaskBankCard = ({
  task,
  schedulingState,
  nudgeApproaching,
  nudgeOverdue,
  hasNudge,
  viewMode,
  selectedWeekDate,
  dateKey,
  isPeekOpen,
  peekDate,
  isMonthlyBufferExpanded,
  currentMonthKey,
  handleScheduleTask,
  activeNudgeDropdownId,
  setActiveNudgeDropdownId,
  activeTagDropdownId,
  setActiveTagDropdownId,
  tags,
  setTags,
  currentDate,
  setDataStore,
  setTaskBank,
  archiveMasterTask,
  setCurrentDate,
  setViewMode,
  closeTaskBank,
  setRecurringModalTask,
  setEditingTask
}: any) => {"""

new_taskbankcard_header = """const TaskBankCard = ({
  task,
  schedulingState,
  nudgeApproaching,
  nudgeOverdue,
  hasNudge,
  viewMode,
  selectedWeekDate,
  dateKey,
  isPeekOpen,
  peekDate,
  isMonthlyBufferExpanded,
  currentMonthKey,
  handleScheduleTask,
  activeNudgeDropdownId,
  setActiveNudgeDropdownId,
  activeTagDropdownId,
  setActiveTagDropdownId,
  tags,
  setTags,
  categories,
  setCategories,
  lastSelectedCategory,
  setLastSelectedCategory,
  currentDate,
  setDataStore,
  setTaskBank,
  archiveMasterTask,
  setCurrentDate,
  setViewMode,
  closeTaskBank,
  setRecurringModalTask,
  setEditingTask
}: any) => {
  const [newTagCategory, setNewTagCategory] = useState(lastSelectedCategory || "general");
  useEffect(() => {
    if (lastSelectedCategory) setNewTagCategory(lastSelectedCategory);
  }, [lastSelectedCategory]);"""

assert old_taskbankcard_header in code, "old_taskbankcard_header not found"
code = code.replace(old_taskbankcard_header, new_taskbankcard_header, 1)

# 4. Update TaskBankCard tag popover
old_tag_popover = """            <div className="border-t border-zinc-100 dark:border-zinc-700 pt-2 flex flex-col gap-2">
              <input 
                type="text" 
                placeholder="New Tag Name" 
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-xs outline-none focus:border-brand-navy/50"
              />
              <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                {aestheticColors.map(c => (
                  <button 
                    key={c}
                    onClick={() => {
                      setNewTagColor(c);
                      const existingName = findTagNameByColor(c, tags);
                      if (existingName) setNewTagName(existingName);
                      else setNewTagName("");
                    }}
                    className={cn("w-5 h-5 rounded-full shrink-0 border-2 transition-all", newTagColor === c ? "border-brand-navy dark:border-brand-sage scale-110" : "border-transparent hover:scale-110")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button 
                onClick={() => {
                  if (!newTagName.trim()) return;
                  const newTag = { id: `tag_${Date.now()}`, name: newTagName.trim(), color: newTagColor };
                  setTags((prev: any) => [...prev, newTag]);
                  handleTagUpdate(newTag.id);
                  setNewTagName("");
                }}
                disabled={!newTagName.trim()}
                className="w-full bg-brand-navy dark:bg-brand-sage text-white font-bold text-xs py-1.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                Create & Apply
              </button>
            </div>"""

new_tag_popover = """            <div className="border-t border-zinc-100 dark:border-zinc-700 pt-2 flex flex-col gap-2">
              <input 
                type="text" 
                placeholder="New Tag Name" 
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-xs outline-none focus:border-brand-navy/50"
              />
              <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                {aestheticColors.map(c => (
                  <button 
                    key={c}
                    type="button"
                    onClick={() => {
                      setNewTagColor(c);
                      const existingName = findTagNameByColor(c, tags);
                      if (existingName) setNewTagName(existingName);
                      else setNewTagName("");
                    }}
                    className={cn("w-5 h-5 rounded-full shrink-0 border-2 transition-all", newTagColor === c ? "border-brand-navy dark:border-brand-sage scale-110" : "border-transparent hover:scale-110")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Category dropdown selector right beneath the color picker */}
              <CategorySelector
                categories={categories || defaultCategories}
                selectedCategory={newTagCategory}
                onSelectCategory={(id) => {
                  setNewTagCategory(id);
                  if (setLastSelectedCategory) setLastSelectedCategory(id);
                }}
                onAddCategory={(catName) => {
                  const newId = `cat_${Date.now()}`;
                  const newCat = { id: newId, name: catName };
                  if (setCategories) setCategories((prev: any) => [...prev, newCat]);
                  if (setLastSelectedCategory) setLastSelectedCategory(newId);
                  return newId;
                }}
              />

              <button 
                onClick={() => {
                  if (!newTagName.trim()) return;
                  const newTag = {
                    id: `tag_${Date.now()}`,
                    name: newTagName.trim(),
                    color: newTagColor,
                    category_id: newTagCategory || "general"
                  };
                  setTags((prev: any) => [...prev, newTag]);
                  handleTagUpdate(newTag.id);
                  setNewTagName("");
                  setActiveTagDropdownId(null);
                }}
                disabled={!newTagName.trim()}
                className="w-full bg-brand-navy dark:bg-brand-sage text-white font-bold text-xs py-1.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                Create & Apply
              </button>
            </div>"""

assert old_tag_popover in code, "old_tag_popover not found"
code = code.replace(old_tag_popover, new_tag_popover, 1)

# 5. Update EditTaskModal
old_edit_task_modal = """const EditTaskModal = ({ task, tags, onSave, onClose }: { task: MasterTask, tags: TagItem[], onSave: (t: MasterTask) => void, onClose: () => void }) => {
  const [text, setText] = useState(task.title || task.text || task.name || task.label || "");
  const [dueDate, setDueDate] = useState(task.due_date || task.dueDate || "");
  const [tagId, setTagId] = useState(task.tag_id || "");
  const [nudgeDate, setNudgeDate] = useState(task.nudgeDate ? new Date(task.nudgeDate).toISOString().slice(0, 16) : "");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
          <h2 className="text-lg font-bold text-brand-navy dark:text-zinc-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-brand-sage" /> Edit Task
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Task Title</label>
            <input 
              type="text" 
              value={text} 
              onChange={e => setText(e.target.value)} 
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-sage/50 outline-none transition-all"
              autoFocus
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Due Date</label>
            <input 
              type="date" 
              value={dueDate} 
              onChange={e => setDueDate(e.target.value)} 
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-sage/50 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tag</label>
            <select 
              value={tagId} 
              onChange={e => setTagId(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-sage/50 outline-none transition-all"
            >
              <option value="">No Tag</option>
              {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Nudge Time</label>
            <input 
              type="datetime-local" 
              value={nudgeDate} 
              onChange={e => setNudgeDate(e.target.value)} 
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-sage/50 outline-none transition-all"
            />
            {nudgeDate && <button onClick={() => setNudgeDate("")} className="text-xs text-red-500 text-left mt-1 hover:underline">Clear Nudge</button>}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-950/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancel</button>
          <button 
            onClick={() => {
              if (!text.trim()) return;
              onSave({
                ...task,
                text: text.trim(),
                due_date: dueDate || undefined,
                dueDate: dueDate || undefined,
                tag_id: tagId || undefined,
                nudgeDate: nudgeDate ? new Date(nudgeDate).toISOString() : undefined,
                isReminderActive: !!nudgeDate,
                reminderTime: nudgeDate ? new Date(nudgeDate).toISOString() : undefined
              });
            }}
            className="px-6 py-2 text-sm font-bold bg-brand-navy dark:bg-brand-sage text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};"""

new_edit_task_modal = """const EditTaskModal = ({
  task,
  tags,
  setTags,
  categories,
  setCategories,
  lastSelectedCategory,
  setLastSelectedCategory,
  onSave,
  onClose
}: {
  task: MasterTask;
  tags: TagItem[];
  setTags?: React.Dispatch<React.SetStateAction<TagItem[]>>;
  categories?: CategoryItem[];
  setCategories?: React.Dispatch<React.SetStateAction<CategoryItem[]>>;
  lastSelectedCategory?: string;
  setLastSelectedCategory?: (cat: string) => void;
  onSave: (t: MasterTask) => void;
  onClose: () => void;
}) => {
  const [text, setText] = useState(task.title || task.text || task.name || task.label || "");
  const [dueDate, setDueDate] = useState(task.due_date || task.dueDate || "");
  const [tagId, setTagId] = useState(task.tag_id || "");
  const [nudgeDate, setNudgeDate] = useState(task.nudgeDate ? new Date(task.nudgeDate).toISOString().slice(0, 16) : "");
  
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(aestheticColors[0]);
  const [newTagCategory, setNewTagCategory] = useState(lastSelectedCategory || "general");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
          <h2 className="text-lg font-bold text-brand-navy dark:text-zinc-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-brand-sage" /> Edit Task
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Task Title</label>
            <input 
              type="text" 
              value={text} 
              onChange={e => setText(e.target.value)} 
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-sage/50 outline-none transition-all"
              autoFocus
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Due Date</label>
            <input 
              type="date" 
              value={dueDate} 
              onChange={e => setDueDate(e.target.value)} 
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-sage/50 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tag</label>
              {!isCreatingTag && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingTag(true);
                    setNewTagName("");
                    setNewTagColor(aestheticColors[0]);
                    setNewTagCategory(lastSelectedCategory || "general");
                  }}
                  className="text-xs font-semibold text-brand-navy dark:text-brand-sage hover:underline"
                >
                  + New Tag
                </button>
              )}
            </div>
            {!isCreatingTag ? (
              <select 
                value={tagId} 
                onChange={e => {
                  if (e.target.value === "NEW") {
                    setIsCreatingTag(true);
                    setNewTagName("");
                    setNewTagColor(aestheticColors[0]);
                    setNewTagCategory(lastSelectedCategory || "general");
                  } else {
                    setTagId(e.target.value);
                  }
                }}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-sage/50 outline-none transition-all"
              >
                <option value="">No Tag</option>
                {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                <option value="NEW" className="font-bold text-brand-navy">➕ Create new tag...</option>
              </select>
            ) : (
              <div className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tag name"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2.5 py-1.5 text-xs outline-none focus:border-brand-navy dark:text-zinc-100"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setIsCreatingTag(false); setNewTagName(""); }}
                    className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Color picker */}
                <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                  {aestheticColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTagColor(c)}
                      className={cn("w-5 h-5 rounded-full shrink-0 border-2 transition-all", newTagColor === c ? "border-brand-navy dark:border-brand-sage scale-110" : "border-transparent hover:scale-110")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 flex items-center justify-center">
                    <Palette className="w-3 h-3 text-zinc-500 absolute pointer-events-none" />
                    <input type="color" value={newTagColor || "#000000"} onChange={e => setNewTagColor(e.target.value)} className="w-8 h-8 absolute -top-1 -left-1 cursor-pointer opacity-0" />
                  </div>
                </div>

                {/* Category selector right beneath the color picker */}
                <CategorySelector
                  categories={categories || defaultCategories}
                  selectedCategory={newTagCategory}
                  onSelectCategory={(id) => {
                    setNewTagCategory(id);
                    if (setLastSelectedCategory) setLastSelectedCategory(id);
                  }}
                  onAddCategory={(catName) => {
                    const newId = `cat_${Date.now()}`;
                    const newCat = { id: newId, name: catName };
                    if (setCategories) setCategories((prev: any) => [...prev, newCat]);
                    if (setLastSelectedCategory) setLastSelectedCategory(newId);
                    return newId;
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    if (!newTagName.trim()) return;
                    const createdTag: TagItem = {
                      id: `tag_${Date.now()}`,
                      name: newTagName.trim(),
                      color: newTagColor,
                      category_id: newTagCategory || "general"
                    };
                    if (setTags) setTags((prev: any) => [...prev, createdTag]);
                    setTagId(createdTag.id);
                    setIsCreatingTag(false);
                    setNewTagName("");
                  }}
                  disabled={!newTagName.trim()}
                  className="w-full bg-brand-navy dark:bg-brand-sage text-white font-bold text-xs py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  Create & Select Tag
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Nudge Time</label>
            <input 
              type="datetime-local" 
              value={nudgeDate} 
              onChange={e => setNudgeDate(e.target.value)} 
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-sage/50 outline-none transition-all"
            />
            {nudgeDate && <button onClick={() => setNudgeDate("")} className="text-xs text-red-500 text-left mt-1 hover:underline">Clear Nudge</button>}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-950/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancel</button>
          <button 
            onClick={() => {
              if (!text.trim()) return;
              let finalTagId = tagId;
              if (isCreatingTag && newTagName.trim()) {
                const createdTag: TagItem = {
                  id: `tag_${Date.now()}`,
                  name: newTagName.trim(),
                  color: newTagColor,
                  category_id: newTagCategory || "general"
                };
                if (setTags) setTags((prev: any) => [...prev, createdTag]);
                finalTagId = createdTag.id;
              }
              onSave({
                ...task,
                text: text.trim(),
                due_date: dueDate || undefined,
                dueDate: dueDate || undefined,
                tag_id: finalTagId || undefined,
                nudgeDate: nudgeDate ? new Date(nudgeDate).toISOString() : undefined,
                isReminderActive: !!nudgeDate,
                reminderTime: nudgeDate ? new Date(nudgeDate).toISOString() : undefined
              });
            }}
            className="px-6 py-2 text-sm font-bold bg-brand-navy dark:bg-brand-sage text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};"""

assert old_edit_task_modal in code, "old_edit_task_modal not found"
code = code.replace(old_edit_task_modal, new_edit_task_modal, 1)

# 6. Update tags initialization and add categories / lastSelectedCategory in Home
old_tags_init = """  const [tags, setTags] = useState<TagItem[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem('stride-tags');
        if (saved) return JSON.parse(saved);
      }
      return defaultTags;
    } catch { return defaultTags; }
  });"""

new_tags_init = """  const [tags, setTags] = useState<TagItem[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem('stride-tags');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.map((t: any) => ({ ...t, category_id: t.category_id || "general" }));
        }
      }
      return defaultTags;
    } catch { return defaultTags; }
  });

  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem('stride-categories');
        if (saved) return JSON.parse(saved);
      }
      return defaultCategories;
    } catch { return defaultCategories; }
  });

  useEffect(() => {
    try { localStorage.setItem('stride-categories', JSON.stringify(categories)); } catch {}
  }, [categories]);

  const [lastSelectedCategory, setLastSelectedCategory] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        return localStorage.getItem('stride-last-category') || "general";
      }
    } catch {}
    return "general";
  });

  useEffect(() => {
    try { localStorage.setItem('stride-last-category', lastSelectedCategory); } catch {}
  }, [lastSelectedCategory]);

  const [bankSortMode, setBankSortMode] = useState<'categories' | 'tags'>('categories');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [collapsedTagBuckets, setCollapsedTagBuckets] = useState<string[]>([]);
  const [newTagCategory, setNewTagCategory] = useState<string>("general");

  const handleAddCategory = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "general";
    const existing = categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setLastSelectedCategory(existing.id);
      return existing.id;
    }
    const newId = `cat_${Date.now()}`;
    const newCategory: CategoryItem = { id: newId, name: trimmed };
    setCategories(prev => [...prev, newCategory]);
    setLastSelectedCategory(newId);
    return newId;
  };"""

assert old_tags_init in code, "old_tags_init not found"
code = code.replace(old_tags_init, new_tags_init, 1)

# 7. Update closeTaskBank to also reset expandedCategories
old_close_task_bank = """  const closeTaskBank = () => {
    setIsBankOpen(false);
    setTimeout(() => {
      setExpandedHeaders([]);
      setBankSearchQuery("");
      setMealSearchQuery("");
      setMealFilterType("ALL");
      setBankFilterTagId("ALL");
    }, 300);
  };"""

new_close_task_bank = """  const closeTaskBank = () => {
    setIsBankOpen(false);
    setTimeout(() => {
      setExpandedHeaders([]);
      setExpandedCategories([]);
      setBankSearchQuery("");
      setMealSearchQuery("");
      setMealFilterType("ALL");
      setBankFilterTagId("ALL");
    }, 300);
  };"""

assert old_close_task_bank in code, "old_close_task_bank not found"
code = code.replace(old_close_task_bank, new_close_task_bank, 1)

# 8. Update handleAddTag in Home to include category_id
old_handle_add_tag = """  const handleAddTag = () => {
    if (!newTagName.trim()) return null;
    const newTag: TagItem = { id: `tag_${Date.now()}`, name: newTagName.trim(), color: tempTagColor };
    setTags(prev => [...prev, newTag]);
    setNewTaskTagId(newTag.id);
    setIsCreatingTag(false);
    setNewTagName("");
    setTempTagColor(aestheticColors[0]);
    return newTag.id;
  };"""

new_handle_add_tag = """  const handleAddTag = () => {
    if (!newTagName.trim()) return null;
    const newTag: TagItem = {
      id: `tag_${Date.now()}`,
      name: newTagName.trim(),
      color: tempTagColor,
      category_id: newTagCategory || "general"
    };
    setTags(prev => [...prev, newTag]);
    setNewTaskTagId(newTag.id);
    setIsCreatingTag(false);
    setNewTagName("");
    setTempTagColor(aestheticColors[0]);
    return newTag.id;
  };"""

assert old_handle_add_tag in code, "old_handle_add_tag not found"
code = code.replace(old_handle_add_tag, new_handle_add_tag, 1)

# 9. Update resetModal in Home
old_reset_modal = """  const resetModal = () => {
    setNewTaskText(""); setNewTaskTagId(""); setNewTaskDate(dateKey);
    setNewTaskTime(""); setNewTaskNotes(""); setNewTaskPriority(false); setNewTaskIsGoal(false);
    setNewTaskReminderTime(""); setNewTaskReminderActive(false);
    setIsCreatingTag(false); setIsPaletteOpen(false);
    setNewTaskIsRecurring(false); setNewTaskRecurringDays([]); setNewTaskRecurringEnd("");
    setNewTaskShowOnWeek(false); setNewTaskShowOnMonth(false);
  };"""

new_reset_modal = """  const resetModal = () => {
    setNewTaskText(""); setNewTaskTagId(""); setNewTaskDate(dateKey);
    setNewTaskTime(""); setNewTaskNotes(""); setNewTaskPriority(false); setNewTaskIsGoal(false);
    setNewTaskReminderTime(""); setNewTaskReminderActive(false);
    setIsCreatingTag(false); setIsPaletteOpen(false);
    setNewTagName(""); setTempTagColor(aestheticColors[0]);
    setNewTagCategory(lastSelectedCategory || "general");
    setNewTaskIsRecurring(false); setNewTaskRecurringDays([]); setNewTaskRecurringEnd("");
    setNewTaskShowOnWeek(false); setNewTaskShowOnMonth(false);
  };"""

assert old_reset_modal in code, "old_reset_modal not found"
code = code.replace(old_reset_modal, new_reset_modal, 1)

# 10. Compute bankByCategory in Home (after sortedTagKeys)
old_bank_derived = """  filteredBank.forEach(task => {
    const tagKey = task.tag_id || "untagged";
    if (!bankByTag[tagKey]) bankByTag[tagKey] = [];
    bankByTag[tagKey].push(task);
  });
  const sortedTagKeys = Object.keys(bankByTag).sort((a, b) => {
    if (a === "untagged") return 1; if (b === "untagged") return -1;
    return (tagsById[a]?.name || "").localeCompare(tagsById[b]?.name || "");
  });"""

new_bank_derived = """  filteredBank.forEach(task => {
    const tagKey = task.tag_id || "untagged";
    if (!bankByTag[tagKey]) bankByTag[tagKey] = [];
    bankByTag[tagKey].push(task);
  });
  const sortedTagKeys = Object.keys(bankByTag).sort((a, b) => {
    if (a === "untagged") return 1; if (b === "untagged") return -1;
    return (tagsById[a]?.name || "").localeCompare(tagsById[b]?.name || "");
  });

  const bankByCategory = useMemo(() => {
    const catMap: Record<string, {
      category: CategoryItem;
      tags: {
        tagId: string;
        tag?: TagItem;
        tasks: MasterTask[];
      }[];
      totalTasks: number;
    }> = {};

    categories.forEach(cat => {
      catMap[cat.id] = { category: cat, tags: [], totalTasks: 0 };
    });

    if (!catMap["general"]) {
      catMap["general"] = { category: { id: "general", name: "General" }, tags: [], totalTasks: 0 };
    }

    sortedTagKeys.forEach(tagId => {
      const items = bankByTag[tagId];
      if (!items || items.length === 0) return;

      const tag = tagId !== "untagged" ? tagsById[tagId] : undefined;
      let catId = tag?.category_id || "general";
      if (!catMap[catId]) {
        const found = categories.find(c => c.id === catId);
        if (found) {
          catMap[catId] = { category: found, tags: [], totalTasks: 0 };
        } else {
          catId = "general";
        }
      }

      catMap[catId].tags.push({ tagId, tag, tasks: items });
      catMap[catId].totalTasks += items.length;
    });

    return categories
      .map(cat => catMap[cat.id])
      .filter(entry => entry && entry.totalTasks > 0);
  }, [categories, sortedTagKeys, bankByTag, tagsById]);"""

assert old_bank_derived in code, "old_bank_derived not found"
code = code.replace(old_bank_derived, new_bank_derived, 1)

# 11. Update inline task creation (lines ~2790-2815)
old_inline_tag_block = """                          <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus-within:ring-2 ring-brand-navy/20 relative">
                             {(inlineTagId || isCreatingTag) ? (
                               <button type="button" onClick={() => setIsPaletteOpen(!isPaletteOpen)} className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-black/10 transition-transform hover:scale-110" style={{ backgroundColor: tempTagColor }} title="Change tag color" />
                             ) : (<Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />)}
                             {isPaletteOpen && activeInlineCol === colKey && (
                               <div ref={paletteRef} className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-[250] flex flex-wrap gap-2 w-[90vw] max-w-[320px] mx-auto sm:w-max animate-in fade-in slide-in-from-top-2 duration-100">
                                 {aestheticColors.map(color => (
                                   <button key={color} type="button" className={cn("w-5 h-5 rounded-full hover:scale-110 transition-transform", tempTagColor === color && "ring-2 ring-offset-2 ring-brand-navy dark:ring-offset-zinc-800")} style={{ backgroundColor: color }} onClick={() => handleUpdateTagColor(color)} />
                                 ))}
                                </div>
                             )}
                             {!isCreatingTag ? (
                               <select value={inlineTagId || ""} onChange={e => { if (e.target.value === "NEW") { setIsCreatingTag(true); setTempTagColor(aestheticColors[0]); } else { setInlineTagId(e.target.value); setIsPaletteOpen(false); } }} className="bg-transparent border-none text-xs focus:ring-0 w-full text-zinc-800 dark:text-zinc-200 cursor-pointer appearance-none p-0 outline-none">
                                 <option value="">No Tag</option>
                                 {tags.map(t => <option key={`inltag_${t.id}`} value={t.id}>{t.name}</option>)}
                                 <option value="NEW" className="font-bold text-brand-navy">➕ Create new...</option>
                               </select>
                             ) : (
                               <div className="flex items-center gap-2 w-full h-full">
                                 <input type="text" placeholder="Tag name" value={newTagName || ""} onChange={e => setNewTagName(e.target.value)} className="bg-transparent border-none text-xs focus:ring-0 w-full p-0 outline-none text-zinc-900 dark:text-zinc-100" autoFocus />
                                 <button type="button" onClick={() => { setIsCreatingTag(false); setIsPaletteOpen(false); }} className="text-zinc-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                                </div>
                             )}
                          </div>"""

new_inline_tag_block = """                          <div className="flex flex-col gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 focus-within:ring-2 ring-brand-navy/20 relative">
                             {!isCreatingTag ? (
                               <div className="flex items-center gap-2">
                                 {inlineTagId ? (
                                   <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-black/10" style={{ backgroundColor: tagsById[inlineTagId]?.color || tempTagColor }} />
                                 ) : (<Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />)}
                                 <select value={inlineTagId || ""} onChange={e => { if (e.target.value === "NEW") { setIsCreatingTag(true); setTempTagColor(aestheticColors[0]); setNewTagCategory(lastSelectedCategory || "general"); } else { setInlineTagId(e.target.value); setIsPaletteOpen(false); } }} className="bg-transparent border-none text-xs focus:ring-0 w-full text-zinc-800 dark:text-zinc-200 cursor-pointer appearance-none p-0 outline-none">
                                   <option value="">No Tag</option>
                                   {tags.map(t => <option key={`inltag_${t.id}`} value={t.id}>{t.name}</option>)}
                                   <option value="NEW" className="font-bold text-brand-navy">➕ Create new tag...</option>
                                 </select>
                               </div>
                             ) : (
                               <div className="flex flex-col gap-2 w-full">
                                 <div className="flex items-center gap-2 w-full">
                                   <input type="text" placeholder="Tag name" value={newTagName || ""} onChange={e => setNewTagName(e.target.value)} className="bg-transparent border-none text-xs focus:ring-0 w-full p-0 outline-none text-zinc-900 dark:text-zinc-100" autoFocus />
                                   <button type="button" onClick={() => { setIsCreatingTag(false); setIsPaletteOpen(false); }} className="text-zinc-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                                 </div>
                                 <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                                   {aestheticColors.map(color => (
                                     <button key={color} type="button" className={cn("w-4 h-4 rounded-full hover:scale-110 transition-transform shrink-0 border", tempTagColor === color ? "border-brand-navy dark:border-brand-sage scale-110" : "border-transparent")} style={{ backgroundColor: color }} onClick={() => handleUpdateTagColor(color)} />
                                   ))}
                                 </div>
                                 <CategorySelector
                                   categories={categories}
                                   selectedCategory={newTagCategory}
                                   onSelectCategory={(id) => {
                                     setNewTagCategory(id);
                                     setLastSelectedCategory(id);
                                   }}
                                   onAddCategory={handleAddCategory}
                                 />
                               </div>
                             )}
                          </div>"""

assert old_inline_tag_block in code, "old_inline_tag_block not found"
code = code.replace(old_inline_tag_block, new_inline_tag_block, 1)

# 12. Update Task Bank drawer header tab bar and task list
old_bank_header_controls = """          {bankActiveTab === 'tasks' && (
            <div className="flex gap-2 items-center mt-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search..." value={bankSearchQuery || ""} onChange={e => setBankSearchQuery(e.target.value)} className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-brand-navy/50 transition-colors text-sm outline-none" />
              </div>
              <select value={bankFilterTagId || ""} onChange={e => setBankFilterTagId(e.target.value)} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-navy/50 transition-colors text-sm text-zinc-700 dark:text-zinc-300 min-w-[100px] outline-none">
                <option value="ALL">All Tags</option>
                <option value="untagged">Untagged</option>
                {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}"""

new_bank_header_controls = """          {bankActiveTab === 'tasks' && (
            <>
              {/* Task Bank Header View Switcher */}
              <div className="grid grid-cols-2 gap-1 bg-zinc-200/60 dark:bg-zinc-800/60 p-1 rounded-lg text-xs font-semibold mt-2">
                <button
                  type="button"
                  onClick={() => setBankSortMode('categories')}
                  className={cn(
                    "py-1.5 px-3 rounded-md text-xs font-bold transition-all text-center",
                    bankSortMode === 'categories'
                      ? "bg-white dark:bg-zinc-900 text-brand-navy dark:text-brand-sage shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  Sort by Categories
                </button>
                <button
                  type="button"
                  onClick={() => setBankSortMode('tags')}
                  className={cn(
                    "py-1.5 px-3 rounded-md text-xs font-bold transition-all text-center",
                    bankSortMode === 'tags'
                      ? "bg-white dark:bg-zinc-900 text-brand-navy dark:text-brand-sage shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  Sort by Tags
                </button>
              </div>

              <div className="flex gap-2 items-center mt-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search..." value={bankSearchQuery || ""} onChange={e => setBankSearchQuery(e.target.value)} className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-brand-navy/50 transition-colors text-sm outline-none" />
                </div>
                <select value={bankFilterTagId || ""} onChange={e => setBankFilterTagId(e.target.value)} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-navy/50 transition-colors text-sm text-zinc-700 dark:text-zinc-300 min-w-[100px] outline-none">
                  <option value="ALL">All Tags</option>
                  <option value="untagged">Untagged</option>
                  {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </>
          )}"""

assert old_bank_header_controls in code, "old_bank_header_controls not found"
code = code.replace(old_bank_header_controls, new_bank_header_controls, 1)

# 13. Update Task Bank tasks view rendering (Category View & Tag View)
old_tasks_rendering = """          {bankActiveTab === 'tasks' && (
            sortedTagKeys.length === 0 ? (
            <div className="text-center text-zinc-500 mt-10 text-sm">No tasks in the bank.</div>
          ) : (
            sortedTagKeys.map(tagId => {
              const tag = tagsById[tagId];
              const items = bankByTag[tagId];
              const isExpanded = expandedHeaders.includes(tagId);
              const hasNudgeCategory = items.some(t => isNudgeApproaching(t) || isNudgeOverdue(t));

              return (
                <div key={tagId} className="flex flex-col gap-4">
                  <button 
                    onClick={() => setExpandedHeaders(prev => isExpanded ? prev.filter(id => id !== tagId) : [...prev, tagId])}
                    className={cn(
                      "flex items-center gap-2 border-b pb-2 sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm transition-colors text-left",
                      isExpanded ? "border-slate-300 dark:border-slate-700" : "border-zinc-100 dark:border-zinc-800/50"
                    )}
                  >
                    {tag ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                        <h3 className={cn("text-sm font-bold uppercase tracking-widest", isExpanded ? "text-brand-navy dark:text-zinc-200" : "text-zinc-700 dark:text-zinc-400")}>{tag.name}</h3>
                      </>
                    ) : (
                      <h3 className={cn("text-sm font-bold uppercase tracking-widest", isExpanded ? "text-brand-navy dark:text-zinc-200" : "text-zinc-400")}>Untagged</h3>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md relative">
                          {items.length}
                          {!isExpanded && hasNudgeCategory && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse-opacity border border-white dark:border-zinc-950" />
                          )}
                      </span>
                      <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-300 shrink-0", isExpanded && "rotate-180")} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      {items.map(task => {
                        const nudgeApproaching = isNudgeApproaching(task);
                        const nudgeOverdue = isNudgeOverdue(task);
                        const hasNudge = nudgeApproaching || nudgeOverdue;
                        return (
                          <TaskBankCard 
                            key={task.id}
                            task={task}
                            schedulingState={schedulingStates[task.id]}
                            nudgeApproaching={nudgeApproaching}
                            nudgeOverdue={nudgeOverdue}
                            hasNudge={hasNudge}
                            viewMode={viewMode}
                            selectedWeekDate={selectedWeekDate}
                            dateKey={dateKey}
                            isPeekOpen={isPeekOpen}
                            peekDate={peekDate}
                            isMonthlyBufferExpanded={isMonthlyBufferExpanded}
                            currentMonthKey={currentMonthKey}
                            handleScheduleTask={handleScheduleTask}
                            activeNudgeDropdownId={activeNudgeDropdownId}
                            setActiveNudgeDropdownId={setActiveNudgeDropdownId}
                            activeTagDropdownId={activeTagDropdownId}
                            setActiveTagDropdownId={setActiveTagDropdownId}
                            tags={tags}
                            setTags={setTags}
                            currentDate={currentDate}
                            setDataStore={setDataStore}
                            setTaskBank={setTaskBank}
                            setRecurringModalTask={setRecurringModalTask}
                            archiveMasterTask={archiveMasterTask}
                            setCurrentDate={setCurrentDate}
                            setViewMode={setViewMode}
                            closeTaskBank={closeTaskBank}
                            setEditingTask={setEditingTask}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ))}"""

new_tasks_rendering = """          {bankActiveTab === 'tasks' && (
            bankSortMode === 'categories' ? (
              bankByCategory.length === 0 ? (
                <div className="text-center text-zinc-500 mt-10 text-sm">No tasks in the bank.</div>
              ) : (
                bankByCategory.map(catGroup => {
                  const { category, tags: catTags, totalTasks } = catGroup;
                  const isExpanded = expandedCategories.includes(category.id) || Boolean(bankSearchQuery.trim());
                  const hasNudgeCategory = catTags.some(t => t.tasks.some(task => isNudgeApproaching(task) || isNudgeOverdue(task)));

                  return (
                    <div key={category.id} className="flex flex-col gap-3">
                      {/* Collapsible Accordion Header Grouped by Category */}
                      <button 
                        onClick={() => setExpandedCategories(prev => isExpanded ? prev.filter(id => id !== category.id) : [...prev, category.id])}
                        className={cn(
                          "flex items-center gap-2 border-b pb-2 sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm transition-colors text-left group",
                          isExpanded ? "border-slate-300 dark:border-slate-700" : "border-zinc-100 dark:border-zinc-800/50"
                        )}
                      >
                        <Folder className={cn("w-4 h-4 transition-colors", isExpanded ? "text-brand-navy dark:text-brand-sage" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300")} />
                        <h3 className={cn("text-sm font-bold uppercase tracking-widest", isExpanded ? "text-brand-navy dark:text-zinc-200" : "text-zinc-700 dark:text-zinc-400")}>
                          {category.name}
                        </h3>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md relative">
                            {totalTasks}
                            {!isExpanded && hasNudgeCategory && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse-opacity border border-white dark:border-zinc-950" />
                            )}
                          </span>
                          <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-300 shrink-0", isExpanded && "rotate-180")} />
                        </div>
                      </button>

                      {/* Expanded Category Content: Render Assigned Tags & matching task buckets */}
                      {isExpanded && (
                        <div className="flex flex-col gap-4 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800/70 ml-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                          {catTags.map(({ tagId, tag, tasks: tagTasks }) => {
                            const hasTagNudge = tagTasks.some(t => isNudgeApproaching(t) || isNudgeOverdue(t));
                            const isTagCollapsed = collapsedTagBuckets.includes(`${category.id}_${tagId}`);

                            return (
                              <div key={tagId} className="flex flex-col gap-2.5">
                                {/* Tag Bucket Header */}
                                <div 
                                  onClick={() => setCollapsedTagBuckets(prev => isTagCollapsed ? prev.filter(k => k !== `${category.id}_${tagId}`) : [...prev, `${category.id}_${tagId}`])}
                                  className="flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors select-none"
                                >
                                  {tag ? (
                                    <>
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: tag.color }} />
                                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 truncate">
                                        {tag.name}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-zinc-400" />
                                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        Untagged
                                      </span>
                                    </>
                                  )}
                                  <div className="ml-auto flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded relative">
                                      {tagTasks.length}
                                      {isTagCollapsed && hasTagNudge && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse-opacity" />
                                      )}
                                    </span>
                                    <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0", !isTagCollapsed && "rotate-180")} />
                                  </div>
                                </div>

                                {/* Inside Tag Bucket: Map matching tasks */}
                                {!isTagCollapsed && (
                                  <div className="flex flex-col gap-2.5 pl-3 border-l-2 border-zinc-200/60 dark:border-zinc-800/60 ml-2">
                                    {tagTasks.map(task => {
                                      const nudgeApproaching = isNudgeApproaching(task);
                                      const nudgeOverdue = isNudgeOverdue(task);
                                      const hasNudge = nudgeApproaching || nudgeOverdue;
                                      return (
                                        <TaskBankCard 
                                          key={task.id}
                                          task={task}
                                          schedulingState={schedulingStates[task.id]}
                                          nudgeApproaching={nudgeApproaching}
                                          nudgeOverdue={nudgeOverdue}
                                          hasNudge={hasNudge}
                                          viewMode={viewMode}
                                          selectedWeekDate={selectedWeekDate}
                                          dateKey={dateKey}
                                          isPeekOpen={isPeekOpen}
                                          peekDate={peekDate}
                                          isMonthlyBufferExpanded={isMonthlyBufferExpanded}
                                          currentMonthKey={currentMonthKey}
                                          handleScheduleTask={handleScheduleTask}
                                          activeNudgeDropdownId={activeNudgeDropdownId}
                                          setActiveNudgeDropdownId={setActiveNudgeDropdownId}
                                          activeTagDropdownId={activeTagDropdownId}
                                          setActiveTagDropdownId={setActiveTagDropdownId}
                                          tags={tags}
                                          setTags={setTags}
                                          categories={categories}
                                          setCategories={setCategories}
                                          lastSelectedCategory={lastSelectedCategory}
                                          setLastSelectedCategory={setLastSelectedCategory}
                                          currentDate={currentDate}
                                          setDataStore={setDataStore}
                                          setTaskBank={setTaskBank}
                                          setRecurringModalTask={setRecurringModalTask}
                                          archiveMasterTask={archiveMasterTask}
                                          setCurrentDate={setCurrentDate}
                                          setViewMode={setViewMode}
                                          closeTaskBank={closeTaskBank}
                                          setEditingTask={setEditingTask}
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              // Tag View (Flat list of all tags and their tasks)
              sortedTagKeys.length === 0 ? (
                <div className="text-center text-zinc-500 mt-10 text-sm">No tasks in the bank.</div>
              ) : (
                sortedTagKeys.map(tagId => {
                  const tag = tagsById[tagId];
                  const items = bankByTag[tagId];
                  const isExpanded = expandedHeaders.includes(tagId);
                  const hasNudgeCategory = items.some(t => isNudgeApproaching(t) || isNudgeOverdue(t));

                  return (
                    <div key={tagId} className="flex flex-col gap-4">
                      <button 
                        onClick={() => setExpandedHeaders(prev => isExpanded ? prev.filter(id => id !== tagId) : [...prev, tagId])}
                        className={cn(
                          "flex items-center gap-2 border-b pb-2 sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm transition-colors text-left",
                          isExpanded ? "border-slate-300 dark:border-slate-700" : "border-zinc-100 dark:border-zinc-800/50"
                        )}
                      >
                        {tag ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                            <h3 className={cn("text-sm font-bold uppercase tracking-widest", isExpanded ? "text-brand-navy dark:text-zinc-200" : "text-zinc-700 dark:text-zinc-400")}>{tag.name}</h3>
                          </>
                        ) : (
                          <h3 className={cn("text-sm font-bold uppercase tracking-widest", isExpanded ? "text-brand-navy dark:text-zinc-200" : "text-zinc-400")}>Untagged</h3>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md relative">
                            {items.length}
                            {!isExpanded && hasNudgeCategory && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse-opacity border border-white dark:border-zinc-950" />
                            )}
                          </span>
                          <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-300 shrink-0", isExpanded && "rotate-180")} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          {items.map(task => {
                            const nudgeApproaching = isNudgeApproaching(task);
                            const nudgeOverdue = isNudgeOverdue(task);
                            const hasNudge = nudgeApproaching || nudgeOverdue;
                            return (
                              <TaskBankCard 
                                key={task.id}
                                task={task}
                                schedulingState={schedulingStates[task.id]}
                                nudgeApproaching={nudgeApproaching}
                                nudgeOverdue={nudgeOverdue}
                                hasNudge={hasNudge}
                                viewMode={viewMode}
                                selectedWeekDate={selectedWeekDate}
                                dateKey={dateKey}
                                isPeekOpen={isPeekOpen}
                                peekDate={peekDate}
                                isMonthlyBufferExpanded={isMonthlyBufferExpanded}
                                currentMonthKey={currentMonthKey}
                                handleScheduleTask={handleScheduleTask}
                                activeNudgeDropdownId={activeNudgeDropdownId}
                                setActiveNudgeDropdownId={setActiveNudgeDropdownId}
                                activeTagDropdownId={activeTagDropdownId}
                                setActiveTagDropdownId={setActiveTagDropdownId}
                                tags={tags}
                                setTags={setTags}
                                categories={categories}
                                setCategories={setCategories}
                                lastSelectedCategory={lastSelectedCategory}
                                setLastSelectedCategory={setLastSelectedCategory}
                                currentDate={currentDate}
                                setDataStore={setDataStore}
                                setTaskBank={setTaskBank}
                                setRecurringModalTask={setRecurringModalTask}
                                archiveMasterTask={archiveMasterTask}
                                setCurrentDate={setCurrentDate}
                                setViewMode={setViewMode}
                                closeTaskBank={closeTaskBank}
                                setEditingTask={setEditingTask}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )
          )}"""

assert old_tasks_rendering in code, "old_tasks_rendering not found"
code = code.replace(old_tasks_rendering, new_tasks_rendering, 1)

# 14. Update TaskBankCard calls in Buffers tab to include category props
old_buf_card = """                                <TaskBankCard
                                  key={taskItem.id}
                                  task={masterTask}
                                  schedulingState={schedulingStates[masterTask.id] || 'default'}
                                  nudgeApproaching={false}
                                  nudgeOverdue={false}
                                  hasNudge={false}
                                  viewMode={viewMode}
                                  selectedWeekDate={selectedWeekDate}
                                  dateKey={dateKey}
                                  isPeekOpen={isPeekOpen}
                                  peekDate={peekDate}
                                  isMonthlyBufferExpanded={isMonthlyBufferExpanded}
                                  currentMonthKey={currentMonthKey}
                                  handleScheduleTask={handleScheduleTask}
                                  activeNudgeDropdownId={activeNudgeDropdownId}
                                  setActiveNudgeDropdownId={setActiveNudgeDropdownId}
                                  activeTagDropdownId={activeTagDropdownId}
                                  setActiveTagDropdownId={setActiveTagDropdownId}
                                  tags={tags}
                                  setTags={setTags}
                                  currentDate={currentDate}
                                  setDataStore={setDataStore}
                                  setTaskBank={setTaskBank}
                                  setRecurringModalTask={setRecurringModalTask}
                                  archiveMasterTask={archiveMasterTask}
                                  setCurrentDate={setCurrentDate}
                                  setViewMode={setViewMode}
                                  closeTaskBank={closeTaskBank}
                                  setEditingTask={setEditingTask}
                                />"""

new_buf_card = """                                <TaskBankCard
                                  key={taskItem.id}
                                  task={masterTask}
                                  schedulingState={schedulingStates[masterTask.id] || 'default'}
                                  nudgeApproaching={false}
                                  nudgeOverdue={false}
                                  hasNudge={false}
                                  viewMode={viewMode}
                                  selectedWeekDate={selectedWeekDate}
                                  dateKey={dateKey}
                                  isPeekOpen={isPeekOpen}
                                  peekDate={peekDate}
                                  isMonthlyBufferExpanded={isMonthlyBufferExpanded}
                                  currentMonthKey={currentMonthKey}
                                  handleScheduleTask={handleScheduleTask}
                                  activeNudgeDropdownId={activeNudgeDropdownId}
                                  setActiveNudgeDropdownId={setActiveNudgeDropdownId}
                                  activeTagDropdownId={activeTagDropdownId}
                                  setActiveTagDropdownId={setActiveTagDropdownId}
                                  tags={tags}
                                  setTags={setTags}
                                  categories={categories}
                                  setCategories={setCategories}
                                  lastSelectedCategory={lastSelectedCategory}
                                  setLastSelectedCategory={setLastSelectedCategory}
                                  currentDate={currentDate}
                                  setDataStore={setDataStore}
                                  setTaskBank={setTaskBank}
                                  setRecurringModalTask={setRecurringModalTask}
                                  archiveMasterTask={archiveMasterTask}
                                  setCurrentDate={setCurrentDate}
                                  setViewMode={setViewMode}
                                  closeTaskBank={closeTaskBank}
                                  setEditingTask={setEditingTask}
                                />"""

count_buf = code.count(old_buf_card)
print(f"Found {count_buf} occurrences of old_buf_card")
code = code.replace(old_buf_card, new_buf_card)

# 15. Update EditTaskModal invocation in Home to pass category props
old_edit_modal_call = """      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal 
          task={editingTask} 
          tags={tags} 
          onSave={handleSaveEditedTask} 
          onClose={() => setEditingTask(null)} 
        />
      )}"""

new_edit_modal_call = """      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal 
          task={editingTask} 
          tags={tags} 
          setTags={setTags}
          categories={categories}
          setCategories={setCategories}
          lastSelectedCategory={lastSelectedCategory}
          setLastSelectedCategory={setLastSelectedCategory}
          onSave={handleSaveEditedTask} 
          onClose={() => setEditingTask(null)} 
        />
      )}"""

assert old_edit_modal_call in code, "old_edit_modal_call not found"
code = code.replace(old_edit_modal_call, new_edit_modal_call, 1)

# 16. Update New Task Modal tag creation UI (lines ~4140-4169)
old_new_task_modal_tag = """                <div className="flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 col-span-2 sm:col-span-1 focus-within:ring-2 ring-brand-navy/20 relative">
                  <div className="flex items-center gap-2 h-full relative">
                    {(newTaskTagId || isCreatingTag) ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setIsPaletteOpen(!isPaletteOpen); }} className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-black/10 transition-transform hover:scale-110" style={{ backgroundColor: tempTagColor }} title="Change tag color" />
                    ) : (<Tag className="w-4 h-4 text-zinc-400 shrink-0" />)}
                    {isPaletteOpen && (
                      <div ref={paletteRef} className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl z-[250] flex flex-wrap gap-2 w-[90vw] max-w-[320px] mx-auto sm:w-max sm:left-auto sm:right-0 animate-in fade-in zoom-in-95 duration-100">
                        {aestheticColors.map(color => (
                          <button key={color} type="button" className={cn("w-6 h-6 rounded-full hover:scale-110 transition-transform", tempTagColor === color && "ring-2 ring-offset-2 ring-brand-navy dark:ring-offset-zinc-800")} style={{ backgroundColor: color }} onClick={() => handleUpdateTagColor(color)} />
                        ))}
                        <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 hover:scale-110 transition-transform border border-zinc-200 dark:border-zinc-700 bg-zinc-100 flex items-center justify-center">
                          <Palette className="w-3 h-3 text-zinc-500 absolute pointer-events-none" />
                          <input type="color" value={tempTagColor || "#000000"} onChange={e => handleUpdateTagColor(e.target.value)} className="w-10 h-10 absolute -top-2 -left-2 cursor-pointer opacity-0" />
                        </div>
                      </div>
                    )}
                    {!isCreatingTag ? (
                      <select value={newTaskTagId || ""} onChange={e => { if (e.target.value === "NEW") { setIsCreatingTag(true); setTempTagColor(aestheticColors[0]); } else { setNewTaskTagId(e.target.value); setIsPaletteOpen(false); } }} className="bg-transparent border-none text-sm focus:ring-0 w-full text-zinc-800 dark:text-zinc-200 cursor-pointer appearance-none p-0 outline-none">
                        <option value="">No Tag</option>
                        {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        <option value="NEW" className="font-bold text-brand-navy">➕ Create new tag...</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-2 w-full h-full">
                        <input type="text" placeholder="Tag name" value={newTagName || ""} onChange={e => setNewTagName(e.target.value)} className="bg-transparent border-none text-sm focus:ring-0 w-full p-0 h-auto outline-none text-zinc-900 dark:text-zinc-100" autoFocus />
                        <button type="button" onClick={() => { setIsCreatingTag(false); setIsPaletteOpen(false); }} className="text-zinc-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>"""

new_new_task_modal_tag = """                <div className="flex flex-col gap-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 col-span-2 sm:col-span-1 focus-within:ring-2 ring-brand-navy/20 relative">
                  {!isCreatingTag ? (
                    <div className="flex items-center gap-2 h-full">
                      {newTaskTagId ? (
                        <div className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-black/10" style={{ backgroundColor: tagsById[newTaskTagId]?.color || "#94a3b8" }} />
                      ) : (
                        <Tag className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                      <select 
                        value={newTaskTagId || ""} 
                        onChange={e => { 
                          if (e.target.value === "NEW") { 
                            setIsCreatingTag(true); 
                            setTempTagColor(aestheticColors[0]);
                            setNewTagCategory(lastSelectedCategory || "general");
                          } else { 
                            setNewTaskTagId(e.target.value); 
                          } 
                        }} 
                        className="bg-transparent border-none text-sm focus:ring-0 w-full text-zinc-800 dark:text-zinc-200 cursor-pointer appearance-none p-0 outline-none"
                      >
                        <option value="">No Tag</option>
                        {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        <option value="NEW" className="font-bold text-brand-navy">➕ Create new tag...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 w-full">
                      <div className="flex items-center gap-2 w-full">
                        <Tag className="w-4 h-4 text-brand-navy dark:text-brand-sage shrink-0" />
                        <input 
                          type="text" 
                          placeholder="Tag name" 
                          value={newTagName || ""} 
                          onChange={e => setNewTagName(e.target.value)} 
                          className="bg-transparent border-none text-sm focus:ring-0 w-full p-0 h-auto outline-none text-zinc-900 dark:text-zinc-100" 
                          autoFocus 
                        />
                        <button type="button" onClick={() => { setIsCreatingTag(false); setNewTagName(""); }} className="text-zinc-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Color picker */}
                      <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                        {aestheticColors.map(color => (
                          <button 
                            key={color} 
                            type="button" 
                            className={cn("w-5 h-5 rounded-full hover:scale-110 transition-transform shrink-0 border-2", tempTagColor === color ? "border-brand-navy dark:border-brand-sage scale-110" : "border-transparent")} 
                            style={{ backgroundColor: color }} 
                            onClick={() => handleUpdateTagColor(color)} 
                          />
                        ))}
                        <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 hover:scale-110 transition-transform border border-zinc-200 dark:border-zinc-700 bg-zinc-100 flex items-center justify-center">
                          <Palette className="w-3 h-3 text-zinc-500 absolute pointer-events-none" />
                          <input type="color" value={tempTagColor || "#000000"} onChange={e => handleUpdateTagColor(e.target.value)} className="w-8 h-8 absolute -top-1 -left-1 cursor-pointer opacity-0" />
                        </div>
                      </div>

                      {/* Category selector right beneath the color picker */}
                      <CategorySelector
                        categories={categories}
                        selectedCategory={newTagCategory}
                        onSelectCategory={(id) => {
                          setNewTagCategory(id);
                          setLastSelectedCategory(id);
                        }}
                        onAddCategory={handleAddCategory}
                      />
                    </div>
                  )}
                </div>"""

assert old_new_task_modal_tag in code, "old_new_task_modal_tag not found"
code = code.replace(old_new_task_modal_tag, new_new_task_modal_tag, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully applied category update!")
