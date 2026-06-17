import sys

file_path = r"c:\codeprojects\planner-app(stride)\src\app\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

states_orig = """  const [newTaskReminderActive, setNewTaskReminderActive] = useState(false);"""
states_new = """  const [newTaskReminderActive, setNewTaskReminderActive] = useState(false);
  const [newTaskIsRecurring, setNewTaskIsRecurring] = useState(false);
  const [newTaskRecurringDays, setNewTaskRecurringDays] = useState<number[]>([]);
  const [newTaskRecurringEnd, setNewTaskRecurringEnd] = useState("");
  const [newTaskShowOnWeek, setNewTaskShowOnWeek] = useState(false);
  const [newTaskShowOnMonth, setNewTaskShowOnMonth] = useState(false);"""
if "const [newTaskIsRecurring" not in content:
    content = content.replace(states_orig, states_new)

reset_orig = """  const resetModal = () => {
    setNewTaskText(""); setNewTaskTagId(""); setNewTaskDate(dateKey);
    setNewTaskTime(""); setNewTaskNotes(""); setNewTaskPriority(false); setNewTaskIsGoal(false);
    setNewTaskReminderTime(""); setNewTaskReminderActive(false);
    setIsCreatingTag(false); setIsPaletteOpen(false);
  };"""
reset_new = """  const resetModal = () => {
    setNewTaskText(""); setNewTaskTagId(""); setNewTaskDate(dateKey);
    setNewTaskTime(""); setNewTaskNotes(""); setNewTaskPriority(false); setNewTaskIsGoal(false);
    setNewTaskReminderTime(""); setNewTaskReminderActive(false);
    setIsCreatingTag(false); setIsPaletteOpen(false);
    setNewTaskIsRecurring(false); setNewTaskRecurringDays([]); setNewTaskRecurringEnd("");
    setNewTaskShowOnWeek(false); setNewTaskShowOnMonth(false);
  };"""
content = content.replace(reset_orig, reset_new)

handle_orig = """    const newMasterTask: MasterTask = { id: newMasterId, text: newTaskText.trim(), is_priority: newTaskPriority, is_goal: newTaskIsGoal, tag_id: finalTagId || undefined, due_date: newTaskDate, time: newTaskTime, notes: newTaskNotes, reminderTime: newTaskReminderTime || undefined, isReminderActive: newTaskReminderActive };
    setTaskBank((prev) => [...prev, newMasterTask]);
    scheduleTaskToDay(newMasterTask, newTaskDate || dateKey);
    setIsModalOpen(false);"""
handle_new = """    if (newTaskIsRecurring) {
      const newRecurring: RecurringTask = {
        id: `rt_${Date.now()}`, text: newTaskText.trim(), time: newTaskTime || undefined,
        tag_id: finalTagId || undefined, is_priority: newTaskPriority, is_goal: newTaskIsGoal,
        daysOfWeek: newTaskRecurringDays, endDate: newTaskRecurringEnd || undefined,
        showOnWeek: newTaskShowOnWeek, showOnMonth: newTaskShowOnMonth
      };
      setRecurringTasks(prev => [...prev, newRecurring]);
    } else {
      const newMasterTask: MasterTask = { id: newMasterId, text: newTaskText.trim(), is_priority: newTaskPriority, is_goal: newTaskIsGoal, tag_id: finalTagId || undefined, due_date: newTaskDate, time: newTaskTime, notes: newTaskNotes, reminderTime: newTaskReminderTime || undefined, isReminderActive: newTaskReminderActive };
      setTaskBank((prev) => [...prev, newMasterTask]);
      scheduleTaskToDay(newMasterTask, newTaskDate || dateKey);
    }
    setIsModalOpen(false);"""
content = content.replace(handle_orig, handle_new)

ui_orig = """                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 col-span-2 focus-within:ring-2 ring-brand-navy/20">
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input type="time" value={newTaskTime || ""} onChange={e => setNewTaskTime(e.target.value)} className="bg-transparent border-none text-sm outline-none w-full text-zinc-800 dark:text-zinc-200" />
                </div>"""
ui_new = ui_orig + """
                {/* Make Recurring Toggle */}
                <div className="col-span-2 flex flex-col gap-2 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    <input type="checkbox" checked={newTaskIsRecurring} onChange={e => setNewTaskIsRecurring(e.target.checked)} className="peer appearance-none w-4 h-4 border-2 border-zinc-300 dark:border-zinc-700 rounded-sm checked:bg-brand-sage checked:border-brand-sage transition-all" />
                    Make Recurring?
                  </label>
                  {newTaskIsRecurring && (
                    <div className="flex flex-col gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Days of the week</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {["Su", "M", "T", "W", "Th", "F", "S"].map((d, i) => (
                            <button type="button" key={d} onClick={() => setNewTaskRecurringDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])} className={cn("w-8 h-8 rounded-full text-xs font-bold transition-all", newTaskRecurringDays.includes(i) ? "bg-brand-sage text-white shadow-md" : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-brand-sage/50")}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-1">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">End Date (Optional)</span>
                        <input type="date" value={newTaskRecurringEnd} onChange={e => setNewTaskRecurringEnd(e.target.value)} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-sm outline-none" />
                      </div>
                      <div className="flex flex-col gap-2 mt-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
                          <input type="checkbox" checked={newTaskShowOnWeek} onChange={e => setNewTaskShowOnWeek(e.target.checked)} className="appearance-none w-3.5 h-3.5 border-2 border-zinc-300 dark:border-zinc-600 rounded-sm checked:bg-brand-navy checked:border-brand-navy transition-all" /> Add to Weekly View
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
                          <input type="checkbox" checked={newTaskShowOnMonth} onChange={e => setNewTaskShowOnMonth(e.target.checked)} className="appearance-none w-3.5 h-3.5 border-2 border-zinc-300 dark:border-zinc-600 rounded-sm checked:bg-brand-navy checked:border-brand-navy transition-all" /> Add to Monthly View
                        </label>
                      </div>
                    </div>
                  )}
                </div>"""
if "Make Recurring Toggle" not in content:
    content = content.replace(ui_orig, ui_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patch part 2 complete")
