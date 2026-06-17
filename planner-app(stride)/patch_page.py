import sys

file_path = r"c:\codeprojects\planner-app(stride)\src\app\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Types
type_injection = """type RecurringTask = { id: string; text: string; time?: string; tag_id?: string; is_priority: boolean; is_goal: boolean; daysOfWeek: number[]; endDate?: string; showOnWeek: boolean; showOnMonth: boolean; };\n"""
if "type RecurringTask =" not in content:
    content = content.replace("type MasterTask = {", type_injection + "type MasterTask = {")

# 2. Update States
state_injection = """  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("stride_recurringTasks");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  const [completedRoutines, setCompletedRoutines] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("stride_completedRoutines");
      if (saved) return JSON.parse(saved);
    }
    return {};
  });
"""
if "const [recurringTasks" not in content:
    content = content.replace("  // Recurring Dispatch Engine State\n  const [recurringModalTask, setRecurringModalTask] = useState<any>(null);", state_injection + "  // Recurring Dispatch Engine State\n  const [recurringModalTask, setRecurringModalTask] = useState<any>(null);")

# 3. Add useEffect to save state
effect_injection = """  useEffect(() => {
    try { localStorage.setItem('stride_recurringTasks', JSON.stringify(recurringTasks)); } catch {}
  }, [recurringTasks]);
  useEffect(() => {
    try { localStorage.setItem('stride_completedRoutines', JSON.stringify(completedRoutines)); } catch {}
  }, [completedRoutines]);
"""
if "stride_recurringTasks" not in content.split("useEffect(() => {")[1]: # rough check
    content = content.replace("  useEffect(() => setHasMounted(true), []);", "  useEffect(() => setHasMounted(true), []);\n" + effect_injection)

# 4. Modifying Daily Check-Off Logic
toggle_orig = """  const toggleDayTaskDone = (id: string) => {
    const existingDay = getDayData(dateKey);"""
toggle_new = """  const toggleDayTaskDone = (id: string) => {
    if (id.startsWith("recur_")) {
      setCompletedRoutines(prev => {
        const isDone = !!prev[id];
        if (!isDone) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#4ade80', '#22c55e', '#16a34a'] });
        }
        return { ...prev, [id]: !isDone };
      });
      return;
    }
    const existingDay = getDayData(dateKey);"""
content = content.replace(toggle_orig, toggle_new)

# 5. Injecting Dynamic Tasks into Daily View
# We will intercept where goalsArray is declared and prepend the dynamic tasks to `dayData.items`.
daily_render_orig = """  const goalsArray = dayData.items.filter(t => t.tag_id === goalsTagId);"""
daily_render_new = """  const computedDailyItems = useMemo(() => {
    const items = [...dayData.items];
    if (dateKey === "BUFFER" || dateKey.startsWith("BUFFER_")) return items;
    const activeDate = new Date(dateKey + 'T00:00:00');
    const dow = activeDate.getDay();
    recurringTasks.forEach(rt => {
      if (rt.daysOfWeek.includes(dow)) {
        if (rt.endDate && activeDate > new Date(rt.endDate + 'T00:00:00')) return;
        if (items.some(i => i.master_id === rt.id)) return;
        const compositeKey = `recur_${rt.id}_${dateKey}`;
        items.push({
          id: compositeKey, master_id: rt.id, text: rt.text, is_done: !!completedRoutines[compositeKey],
          is_priority: rt.is_priority, is_goal: rt.is_goal, tag_id: rt.tag_id, time: rt.time
        });
      }
    });
    return items;
  }, [dayData.items, dateKey, recurringTasks, completedRoutines]);

  const goalsArray = computedDailyItems.filter(t => t.tag_id === goalsTagId);"""
if "computedDailyItems" not in content:
    content = content.replace(daily_render_orig, daily_render_new)
    content = content.replace("const prioritiesArray = dayData.items.filter", "const prioritiesArray = computedDailyItems.filter")
    content = content.replace("const tasksArray = dayData.items.filter", "const tasksArray = computedDailyItems.filter")
    # we need to make sure we don't break drag and drop, but DND operates on dataStore which is fine.

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patch part 1 complete")
