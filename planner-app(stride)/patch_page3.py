import sys

file_path = r"c:\codeprojects\planner-app(stride)\src\app\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Weekly View rendering
week_render_orig = """  const renderWeekCard = (colKey: string) => {
    const isBuffer = colKey === "BUFFER";
    const isToday = colKey === getDateKey(new Date());
    const dayData = dataStore[colKey] || getEmptyDay();
    const items = dayData.items;"""
week_render_new = """  const renderWeekCard = (colKey: string) => {
    const isBuffer = colKey === "BUFFER";
    const isToday = colKey === getDateKey(new Date());
    const dayData = dataStore[colKey] || getEmptyDay();
    
    let items = [...dayData.items];
    if (colKey !== "BUFFER" && !colKey.startsWith("BUFFER_")) {
        const activeDate = new Date(colKey + 'T00:00:00');
        const dow = activeDate.getDay();
        recurringTasks.forEach(rt => {
          if (rt.showOnWeek && rt.daysOfWeek.includes(dow)) {
            if (rt.endDate && activeDate > new Date(rt.endDate + 'T00:00:00')) return;
            if (items.some(i => i.master_id === rt.id)) return;
            const compositeKey = `recur_${rt.id}_${colKey}`;
            items.push({
              id: compositeKey, master_id: rt.id, text: rt.text, is_done: !!completedRoutines[compositeKey],
              is_priority: rt.is_priority, is_goal: rt.is_goal, tag_id: rt.tag_id, time: rt.time
            } as any);
          }
        });
    }"""
if "let items = [...dayData.items];" not in content:
    content = content.replace(week_render_orig, week_render_new)


# 2. Update Monthly View rendering
month_render_orig = """                          const storedDay = dataStore[mKey] || { items: [], meals: [], completedSteps: 0, waterOunces: 0, notesText: "" };
                          const dayItems: TaskItem[] = storedDay.items.filter(i => (i as any).isGhost !== true);"""
month_render_new = """                          const storedDay = dataStore[mKey] || { items: [], meals: [], completedSteps: 0, waterOunces: 0, notesText: "" };
                          let dayItems: TaskItem[] = storedDay.items.filter(i => (i as any).isGhost !== true);
                          const mActiveDate = new Date(mKey + 'T00:00:00');
                          const dow = mActiveDate.getDay();
                          recurringTasks.forEach(rt => {
                            if (rt.showOnMonth && rt.daysOfWeek.includes(dow)) {
                              if (rt.endDate && mActiveDate > new Date(rt.endDate + 'T00:00:00')) return;
                              if (dayItems.some(i => i.master_id === rt.id)) return;
                              const compositeKey = `recur_${rt.id}_${mKey}`;
                              dayItems.push({
                                id: compositeKey, master_id: rt.id, text: rt.text, is_done: !!completedRoutines[compositeKey],
                                is_priority: rt.is_priority, is_goal: rt.is_goal, tag_id: rt.tag_id, time: rt.time
                              } as any);
                            }
                          });"""
if "mActiveDate" not in content:
    content = content.replace(month_render_orig, month_render_new)


# 3. Add `bankActiveTab` state
state_orig = """  const [bankSearchQuery, setBankSearchQuery] = useState("");"""
state_new = """  const [bankSearchQuery, setBankSearchQuery] = useState("");\n  const [bankActiveTab, setBankActiveTab] = useState<'tasks' | 'routines'>('tasks');"""
if "bankActiveTab" not in content:
    content = content.replace(state_orig, state_new)


# 4. Modify Task Bank Header
tb_header_orig = """          <div className="flex gap-2 items-center">
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
        </div>
        <div 
          className="flex-1 overflow-y-auto p-5 flex flex-col gap-8"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {sortedTagKeys.length === 0 ? ("""

tb_header_new = """          <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 mt-2">
            <button onClick={() => setBankActiveTab('tasks')} className={cn("px-4 py-2 text-sm font-bold border-b-2 transition-colors", bankActiveTab === 'tasks' ? "border-brand-navy text-brand-navy dark:border-brand-sage dark:text-brand-sage" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>Tasks</button>
            <button onClick={() => setBankActiveTab('routines')} className={cn("px-4 py-2 text-sm font-bold border-b-2 transition-colors", bankActiveTab === 'routines' ? "border-brand-navy text-brand-navy dark:border-brand-sage dark:text-brand-sage" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>Routines</button>
          </div>
          {bankActiveTab === 'tasks' && (
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
          )}
        </div>
        <div 
          className="flex-1 overflow-y-auto p-5 flex flex-col gap-8"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {bankActiveTab === 'routines' ? (
            <div className="flex flex-col gap-4">
              {recurringTasks.length === 0 ? (
                <div className="text-center text-zinc-500 mt-10 text-sm">No active routines. Create one in the New Task menu!</div>
              ) : (
                recurringTasks.map(rt => (
                  <div key={rt.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{rt.text}</span>
                        {rt.tag_id && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tagsById[rt.tag_id]?.color }} />}
                      </div>
                      <button onClick={() => setRecurringTasks(prev => prev.filter(r => r.id !== rt.id))} className="text-xs font-bold px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">Delete / End Routine</button>
                    </div>
                    <div className="text-xs text-zinc-500 font-semibold flex flex-wrap gap-x-4 gap-y-1">
                      <span>Days: {rt.daysOfWeek.map(d => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(', ')}</span>
                      {rt.time && <span>Time: {rt.time}</span>}
                      {rt.endDate && <span className="text-amber-600">Ends: {rt.endDate}</span>}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-zinc-400 mt-1 flex gap-3">
                      {rt.showOnWeek && <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">Weekly View</span>}
                      {rt.showOnMonth && <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">Monthly View</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : sortedTagKeys.length === 0 ? ("""

if "bankActiveTab === 'routines'" not in content:
    content = content.replace(tb_header_orig, tb_header_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patch part 3 complete")
