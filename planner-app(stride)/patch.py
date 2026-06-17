import sys

def main():
    with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. State
    content = content.replace(
        '''export default function Home() {\n  const [hasMounted, setHasMounted] = useState(false);''',
        '''export default function Home() {\n  const [hasMounted, setHasMounted] = useState(false);\n  const [activeMobileTab, setActiveMobileTab] = useState('priorities');\n  const [isMobile, setIsMobile] = useState(false);\n\n  useEffect(() => {\n    const handleResize = () => setIsMobile(window.innerWidth < 768);\n    handleResize();\n    window.addEventListener('resize', handleResize);\n    return () => window.removeEventListener('resize', handleResize);\n  }, []);'''
    )

    # 2. FAB
    content = content.replace(
        '''      {/* Floating Add Button */}\n      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-8 right-8 w-14 h-14 bg-brand-navy text-white rounded-full shadow-2xl hover:bg-brand-navy/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-40 group">\n        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />\n      </button>''',
        '''      {/* Floating Add Button */}\n      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center z-[250] hover:scale-105 active:scale-95 transition-transform group">\n        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />\n      </button>'''
    )

    # 3. Navigation Wrapper
    nav_old = '''        {/* Navigation Bar */}\n        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-[50] w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 shadow-sm rounded-t-xl">\n          <div className="flex items-center gap-3">'''
    nav_new = '''        {/* Navigation Wrapper */}\n        <div className="sticky top-0 z-[50] w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 shadow-sm rounded-t-xl">\n          <div className="flex flex-wrap md:flex-nowrap items-center justify-between px-4 sm:px-6 py-4 gap-y-3">\n            <div className="flex items-center gap-3">'''
    content = content.replace(nav_old, nav_new)

    # 4. Mobile Tab Bar
    tab_old = '''              )}\n            </button>\n          </div>\n        </div>\n\n        {/* Header */}'''
    tab_new = '''              )}\n            </button>\n          </div>\n        </div>\n\n        {/* Mobile Tab Bar */}\n        <div className="md:hidden flex overflow-x-auto whitespace-nowrap px-4 pb-3 gap-2 custom-scrollbar no-scrollbar">\n          {['priorities', 'todos', 'goals', 'meals', 'health', 'notes'].map(tab => (\n            <button\n              key={tab}\n              onClick={() => setActiveMobileTab(tab)}\n              className={cn(\n                "px-4 py-1.5 text-sm font-bold rounded-full transition-all capitalize whitespace-nowrap shrink-0",\n                activeMobileTab === tab \n                  ? "bg-brand-navy text-white shadow-md ring-2 ring-brand-navy/30 dark:ring-brand-sage/30" \n                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"\n              )}\n            >\n              {tab === 'todos' ? "To Do's" : tab}\n            </button>\n          ))}\n        </div>\n      </div>\n\n      {/* Header */}'''
    content = content.replace(tab_old, tab_new)

    # 5. Extract components
    idx_start = content.find("            <div className=\"flex flex-col md:flex-row flex-1 shrink-0\">\n\n          {/* Left Column */}")
    idx_end = content.find("          </>\n        ) : viewMode === 'week' ? (")
    
    if idx_start == -1 or idx_end == -1:
        print("COULD NOT FIND BOUNDARIES")
        return
        
    day_view_inner = content[idx_start:idx_end]
    
    # We need to split day_view_inner into the 6 sections.
    # Left Column
    left_col_start = day_view_inner.find("          {/* Left Column */}")
    right_col_start = day_view_inner.find("          {/* Right Column */}")
    
    # In Left Column we have To Dos and Meals
    meals_start = day_view_inner.find("            {/* Meals */}")
    
    # In Right Column we have Priorities, Goals, Health
    goals_start = day_view_inner.find("            {/* Goals */}")
    health_start = day_view_inner.find("            {/* Health & Habits */}")
    
    notes_start = day_view_inner.find("        <div className=\"border-t-4 border-brand-navy")
    
    if -1 in [left_col_start, right_col_start, meals_start, goals_start, health_start, notes_start]:
        print("COULD NOT FIND SECTION MARKERS")
        return

    # Extract exactly what is inside the columns
    todos_content = day_view_inner[left_col_start:meals_start].replace("          {/* Left Column */}\n          <div className={cn(\n            \"flex-[1.2] border-r-2 border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4 transition-all duration-300\",\n            migratedDate === dateKey && \"ring-4 ring-brand-navy dark:ring-brand-navy/50 bg-brand-navy/5 scale-[1.02] z-30 shadow-[0_0_20px_rgba(0,0,128,0.2)] rounded-2xl border-transparent\"\n          )}>\n", "")
    meals_content = day_view_inner[meals_start:right_col_start]
    
    # Remove the closing </div> of the Left Column from meals_content
    meals_content = meals_content[:meals_content.rfind("          </div>")]

    priorities_content = day_view_inner[right_col_start:goals_start].replace("          {/* Right Column */}\n          <div className=\"flex-1 flex flex-col border-none\">\n", "")
    goals_content = day_view_inner[goals_start:health_start]
    health_content = day_view_inner[health_start:notes_start]

    # Remove the closing </div> of the Right Column from health_content
    health_content = health_content[:health_content.rfind("          </div>")]
    
    notes_content = day_view_inner[notes_start:]

    # Now assemble the new wrapper logic
    new_day_view = f'''        {{/* Main Columns */}}
        {{viewMode === 'day' ? (() => {{
          const todosSection = (
            <div className="flex flex-col gap-4 flex-1">
{todos_content.strip()}
            </div>
          );
          
          const mealsSection = (
{meals_content.strip()}
          );
          
          const prioritiesSection = (
{priorities_content.strip()}
          );
          
          const goalsSection = (
{goals_content.strip()}
          );
          
          const healthSection = (
{health_content.strip()}
          );
          
          const notesSection = (
{notes_content.strip()}
          );
          
          const mobileTabs = ['priorities', 'todos', 'goals', 'meals', 'health', 'notes'];
          const activeIdx = mobileTabs.indexOf(activeMobileTab);
          
          return (
            <>
              {{currentDate.getDay() === 0 && (
                <div className="w-full bg-brand-sage/10 border-b-2 border-brand-sage/20 p-4 shrink-0 flex flex-col gap-2">
                  <h3 className="text-sm font-bold text-brand-sage uppercase tracking-widest flex items-center gap-2">
                    <Star className="w-4 h-4" /> Weekly Goals Recap
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {{[0, 1, 2].map(idx => {{
                      const goal = (weeklyGoals[weekDateKeys[0]] || [])[idx];
                      const hits = (weeklyGoalHits[weekDateKeys[0]] || [])[idx] || 0;
                      if (!goal) return null;
                      return (
                        <div key={{`recap-${{idx}}`}} className="flex items-center gap-2 bg-white/70 dark:bg-zinc-900/70 rounded-lg px-3 py-2 border border-brand-sage/20 shadow-sm">
                          <div className={{cn("w-3 h-3 rounded-full shrink-0", hits > 0 ? "bg-brand-sage shadow-[0_0_8px_rgba(156,159,132,0.8)]" : "bg-zinc-300 dark:bg-zinc-700")}} />
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{{goal}}</span>
                          <span className="text-xs font-bold text-brand-sage bg-brand-sage/20 px-1.5 py-0.5 rounded-md ml-2">{{hits}} hit{{hits !== 1 ? 's' : ''}}</span>
                        </div>
                      );
                    }})}}
                  </div>
                </div>
              )}}

              {{isMobile ? (
                <div className="flex flex-col flex-1 shrink-0 overflow-hidden relative touch-pan-y" style={{{{ height: 'calc(100vh - 180px)' }}}}>
                  <motion.div
                    className="flex w-[600%] h-full items-start"
                    animate={{{{ x: `-${{activeIdx * (100 / 6)}}%` }}}}
                    transition={{{{ type: "spring", stiffness: 300, damping: 30 }}}}
                    drag="x"
                    dragConstraints={{{{ left: 0, right: 0 }}}}
                    onDragEnd={{(e, {{ offset, velocity }}) => {{
                      const swipe = Math.abs(offset.x) * velocity.x;
                      if (swipe < -10000 && activeIdx < mobileTabs.length - 1) setActiveMobileTab(mobileTabs[activeIdx + 1]);
                      else if (swipe > 10000 && activeIdx > 0) setActiveMobileTab(mobileTabs[activeIdx - 1]);
                      else if (offset.x < -50 && activeIdx < mobileTabs.length - 1) setActiveMobileTab(mobileTabs[activeIdx + 1]);
                      else if (offset.x > 50 && activeIdx > 0) setActiveMobileTab(mobileTabs[activeIdx - 1]);
                    }}}}
                  >
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden">{{prioritiesSection}}</div>
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden p-6">{{todosSection}}</div>
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden">{{goalsSection}}</div>
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden p-6">{{mealsSection}}</div>
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden">{{healthSection}}</div>
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden">{{notesSection}}</div>
                  </motion.div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row flex-1 shrink-0">
                    <div className={{cn(
                      "flex-[1.2] border-r-2 border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4 transition-all duration-300",
                      migratedDate === dateKey && "ring-4 ring-brand-navy dark:ring-brand-navy/50 bg-brand-navy/5 scale-[1.02] z-30 shadow-[0_0_20px_rgba(0,0,128,0.2)] rounded-2xl border-transparent"
                    )}}>
                      {{todosSection}}
                      {{mealsSection}}
                    </div>
                    <div className="flex-1 flex flex-col border-none">
                      {{prioritiesSection}}
                      {{goalsSection}}
                      {{healthSection}}
                    </div>
                  </div>
                  {{notesSection}}
                </>
              )}}
            </>
          );
        }})() : viewMode === 'week' ? ('''

    full_old = "        {/* Main Columns */}\n        {viewMode === 'day' ? (\n          <>\n            {currentDate.getDay() === 0 && (\n              <div className=\"w-full bg-brand-sage/10 border-b-2 border-brand-sage/20 p-4 shrink-0 flex flex-col gap-2\">\n                <h3 className=\"text-sm font-bold text-brand-sage uppercase tracking-widest flex items-center gap-2\">\n                  <Star className=\"w-4 h-4\" /> Weekly Goals Recap\n                </h3>\n                <div className=\"flex flex-wrap gap-4\">\n                  {[0, 1, 2].map(idx => {\n                    const goal = (weeklyGoals[weekDateKeys[0]] || [])[idx];\n                    const hits = (weeklyGoalHits[weekDateKeys[0]] || [])[idx] || 0;\n                    if (!goal) return null;\n                    return (\n                      <div key={`recap-${idx}`} className=\"flex items-center gap-2 bg-white/70 dark:bg-zinc-900/70 rounded-lg px-3 py-2 border border-brand-sage/20 shadow-sm\">\n                        <div className={cn(\"w-3 h-3 rounded-full shrink-0\", hits > 0 ? \"bg-brand-sage shadow-[0_0_8px_rgba(156,159,132,0.8)]\" : \"bg-zinc-300 dark:bg-zinc-700\")} />\n                        <span className=\"text-sm font-semibold text-zinc-800 dark:text-zinc-200\">{goal}</span>\n                        <span className=\"text-xs font-bold text-brand-sage bg-brand-sage/20 px-1.5 py-0.5 rounded-md ml-2\">{hits} hit{hits !== 1 ? 's' : ''}</span>\n                      </div>\n                    );\n                  })}\n                </div>\n              </div>\n            )}\n" + day_view_inner

    if full_old not in content:
        print("COULD NOT FIND FULL OLD TO REPLACE")
        return

    content = content.replace(full_old, new_day_view)
    
    with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("SUCCESS")

if __name__ == '__main__':
    main()