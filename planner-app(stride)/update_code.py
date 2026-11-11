import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Default categories & tags
old_tags_start = text.find('// Default Tags\nconst defaultTags: TagItem[] = [')
old_tags_end = text.find('];', old_tags_start) + 2
assert old_tags_start != -1 and old_tags_end != -1, "Default Tags not found"
print("Replacing defaultTags...")
new_tags_code = """// Default Categories
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
text = text[:old_tags_start] + new_tags_code + text[old_tags_end:]

# 2. Add CategorySelector
old_find_tag_start = text.find('const findTagNameByColor = (colorHex: string, tagsList: TagItem[]): string | null => {')
old_find_tag_end = text.find('};\n', old_find_tag_start) + 3
assert old_find_tag_start != -1, "findTagNameByColor not found"
print("Adding CategorySelector...")
category_selector_code = text[old_find_tag_start:old_find_tag_end] + """\nconst CategorySelector = ({
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
};\n"""
text = text[:old_find_tag_start] + category_selector_code + text[old_find_tag_end:]

# 3. Update TaskBankCard signature and add newTagCategory state
old_tbc = 'const TaskBankCard = ({\n  task,\n  schedulingState,'
assert old_tbc in text, "TaskBankCard signature not found"
print("Updating TaskBankCard props...")
# Find where `: any) => {` is
colon_any_pos = text.find(': any) => {', text.find('const TaskBankCard = ({'))
assert colon_any_pos != -1
tbc_params_end = colon_any_pos + len(': any) => {\n')
# We need to insert categories, setCategories, lastSelectedCategory, setLastSelectedCategory before `: any) => {`
text = text[:colon_any_pos] + "  categories,\n  setCategories,\n  lastSelectedCategory,\n  setLastSelectedCategory,\n" + text[colon_any_pos:]

# Now insert state right after TaskBankCard function start
tbc_body_start = text.find(': any) => {') + len(': any) => {\n')
tbc_state = """  const [newTagCategory, setNewTagCategory] = useState(lastSelectedCategory || "general");
  useEffect(() => {
    if (lastSelectedCategory) setNewTagCategory(lastSelectedCategory);
  }, [lastSelectedCategory]);\n"""
text = text[:tbc_body_start] + tbc_state + text[tbc_body_start:]

# 4. Update TaskBankCard tag popover creation
# Look for placeholder="New Tag Name"
pop_input_pos = text.find('placeholder="New Tag Name"')
assert pop_input_pos != -1, "placeholder New Tag Name not found"
print("Updating TaskBankCard tag popover...")
# Find the surrounding container div: `<div className="border-t border-zinc-100 dark:border-zinc-700 pt-2 flex flex-col gap-2">`
pop_div_start = text.rfind('<div className="border-t border-zinc-100 dark:border-zinc-700 pt-2 flex flex-col gap-2">', 0, pop_input_pos)
# Find the button with "Create & Apply"
pop_btn_pos = text.find('Create & Apply', pop_input_pos)
# Find the closing </button>\n           </div>
pop_div_end = text.find('</div>', pop_btn_pos) + 6

new_pop_block = """<div className="border-t border-zinc-100 dark:border-zinc-700 pt-2 flex flex-col gap-2">
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
text = text[:pop_div_start] + new_pop_block + text[pop_div_end:]

# 5. Update EditTaskModal
print("Updating EditTaskModal...")
etm_start = text.find('const EditTaskModal = ({ task, tags, onSave, onClose }')
assert etm_start != -1, "EditTaskModal signature not found"
etm_end = text.find('export default function Home() {', etm_start)
assert etm_end != -1, "Home export not found"

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
};\n\n"""
text = text[:etm_start] + new_edit_task_modal + text[etm_end:]

# 6. Update tags state in Home and add categories / bankSortMode / etc.
print("Updating Home states...")
tags_init_start = text.find('const [tags, setTags] = useState<TagItem[]>(() => {')
assert tags_init_start != -1, "tags state not found in Home"
tags_init_end = text.find('  const [animatingBufferId, setAnimatingBufferId]', tags_init_start)
assert tags_init_end != -1, "animatingBufferId not found"

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

  useEffect(() => {
    try { localStorage.setItem('stride-tags', JSON.stringify(tags)); } catch {}
  }, [tags]);

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
  };

  useEffect(() => {
    try { localStorage.setItem('stride-monthly-milestones', JSON.stringify(monthlyMilestones)); } catch {}
  }, [monthlyMilestones]);\n\n"""
text = text[:tags_init_start] + new_tags_init + text[tags_init_end:]

# 7. Update closeTaskBank
print("Updating closeTaskBank...")
ctb_start = text.find('const closeTaskBank = () => {')
assert ctb_start != -1
ctb_end = text.find('};', ctb_start) + 2
new_ctb = """const closeTaskBank = () => {
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
text = text[:ctb_start] + new_ctb + text[ctb_end:]

# 8. Update handleAddTag
print("Updating handleAddTag...")
hat_start = text.find('const handleAddTag = () => {')
assert hat_start != -1
hat_end = text.find('};', hat_start) + 2
new_hat = """const handleAddTag = () => {
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
text = text[:hat_start] + new_hat + text[hat_end:]

# 9. Update resetModal
print("Updating resetModal...")
rm_start = text.find('const resetModal = () => {')
assert rm_start != -1
rm_end = text.find('};', rm_start) + 2
new_rm = """const resetModal = () => {
    setNewTaskText(""); setNewTaskTagId(""); setNewTaskDate(dateKey);
    setNewTaskTime(""); setNewTaskNotes(""); setNewTaskPriority(false); setNewTaskIsGoal(false);
    setNewTaskReminderTime(""); setNewTaskReminderActive(false);
    setIsCreatingTag(false); setIsPaletteOpen(false);
    setNewTagName(""); setTempTagColor(aestheticColors[0]);
    setNewTagCategory(lastSelectedCategory || "general");
    setNewTaskIsRecurring(false); setNewTaskRecurringDays([]); setNewTaskRecurringEnd("");
    setNewTaskShowOnWeek(false); setNewTaskShowOnMonth(false);
  };"""
text = text[:rm_start] + new_rm + text[rm_end:]

# 10. Compute bankByCategory in Home
print("Adding bankByCategory...")
stk_start = text.find('const sortedTagKeys = Object.keys(bankByTag).sort')
assert stk_start != -1
stk_line_end = text.find(';\n', stk_start) + 2
# We check where sortedTagKeys ends
stk_block_end = text.find('});\n', stk_start) + 4

new_stk_plus_category = text[stk_start:stk_block_end] + """\n  const bankByCategory = useMemo(() => {
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
  }, [categories, sortedTagKeys, bankByTag, tagsById]);\n"""
text = text[:stk_start] + new_stk_plus_category + text[stk_block_end:]

# 11. Update inline tag form on column
print("Updating inline tag form...")
inline_select_pos = text.find('key={`inltag_${t.id}`}')
assert inline_select_pos != -1
# find enclosing div for this column
inline_div_start = text.rfind('<div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus-within:ring-2 ring-brand-navy/20 relative">', 0, inline_select_pos)
# find end of this div (the clock input follows it)
inline_div_end = text.find('<div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus-within:ring-2 ring-brand-navy/20">', inline_select_pos)

new_inline_block = """<div className="flex flex-col gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 focus-within:ring-2 ring-brand-navy/20 relative">
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
                          </div>
                          
                          """
text = text[:inline_div_start] + new_inline_block + text[inline_div_end:]

# 12. Update Task Bank drawer header tab bar
print("Updating Task Bank header view switcher...")
bhc_start = text.find("{bankActiveTab === 'tasks' && (\n            <div className=\"flex gap-2 items-center mt-3\">")
assert bhc_start != -1, "bankActiveTab tasks controls not found"
bhc_end = text.find('</div>\n          )}', bhc_start) + len('</div>\n          )}')

new_bhc = """{bankActiveTab === 'tasks' && (
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
text = text[:bhc_start] + new_bhc + text[bhc_end:]

# 13. Update Task Bank tasks view rendering
print("Updating Task Bank drawer list rendering...")
tb_render_start = text.find("{bankActiveTab === 'tasks' && (\n            sortedTagKeys.length === 0 ? (")
assert tb_render_start != -1, "Task Bank tasks render block not found"
tb_render_end = text.find("{bankActiveTab === 'buffers' &&", tb_render_start)
assert tb_render_end != -1, "Buffers tab start not found"

new_tasks_rendering = """{bankActiveTab === 'tasks' && (
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
          )}\n          \n          """
text = text[:tb_render_start] + new_tasks_rendering + text[tb_render_end:]

# 14. Update TaskBankCard calls in buffers tab (add categories props)
print("Updating buffers TaskBankCards...")
text = text.replace(
    'tags={tags}\n                                    setTags={setTags}\n                                    currentDate={currentDate}',
    'tags={tags}\n                                    setTags={setTags}\n                                    categories={categories}\n                                    setCategories={setCategories}\n                                    lastSelectedCategory={lastSelectedCategory}\n                                    setLastSelectedCategory={setLastSelectedCategory}\n                                    currentDate={currentDate}'
)
text = text.replace(
    'tags={tags}\n                                 setTags={setTags}\n                                 currentDate={currentDate}',
    'tags={tags}\n                                 setTags={setTags}\n                                 categories={categories}\n                                 setCategories={setCategories}\n                                 lastSelectedCategory={lastSelectedCategory}\n                                 setLastSelectedCategory={setLastSelectedCategory}\n                                 currentDate={currentDate}'
)

# 15. Update EditTaskModal invocation in Home
print("Updating EditTaskModal call in Home...")
old_etm_call = 'task={editingTask} \n          tags={tags} \n          onSave={handleSaveEditedTask}'
assert old_etm_call in text, "old_etm_call not found"
new_etm_call = """task={editingTask} 
          tags={tags} 
          setTags={setTags}
          categories={categories}
          setCategories={setCategories}
          lastSelectedCategory={lastSelectedCategory}
          setLastSelectedCategory={setLastSelectedCategory}
          onSave={handleSaveEditedTask}"""
text = text.replace(old_etm_call, new_etm_call, 1)

# 16. Update New Task Modal tag creation UI
print("Updating New Task Modal tag UI...")
ntm_start = text.find('{(newTaskTagId || isCreatingTag) ? (')
assert ntm_start != -1, "New task modal tag block not found"
ntm_div_start = text.rfind('<div className="flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-900', 0, ntm_start)
assert ntm_div_start != -1
# Find the next field in modal: CalendarIcon
cal_icon_pos = text.find('<CalendarIcon className="w-4 h-4 text-zinc-400 shrink-0" />', ntm_start)
ntm_div_end = text.rfind('</div>', 0, cal_icon_pos)
# Find start of CalendarIcon's parent div
ntm_div_end = text.rfind('</div>', 0, text.rfind('<div className="flex items-center gap-2 bg-zinc-50', 0, cal_icon_pos)) + 6

new_ntm_tag_block = """<div className="flex flex-col gap-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 col-span-2 sm:col-span-1 focus-within:ring-2 ring-brand-navy/20 relative">
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
text = text[:ntm_div_start] + new_ntm_tag_block + text[ntm_div_end:]

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("ALL CHANGES SUCCESSFULLY APPLIED!")
