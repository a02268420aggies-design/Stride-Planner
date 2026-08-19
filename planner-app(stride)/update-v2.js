const fs = require('fs');

let pageStr = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Update state
pageStr = pageStr.replace(
  "const [bankActiveTab, setBankActiveTab] = useState<'tasks' | 'routines'>('tasks');",
  "const [bankActiveTab, setBankActiveTab] = useState<'tasks' | 'routines' | 'buffers' | 'meals'>('tasks');"
);

// 2. Update Header Tab Bar
pageStr = pageStr.replace(
  `<div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 mt-2">
            <button onClick={() => setBankActiveTab('tasks')} className={cn("px-4 py-2 text-sm font-bold border-b-2 transition-colors", bankActiveTab === 'tasks' ? "border-brand-navy text-brand-navy dark:border-brand-sage dark:text-brand-sage" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>Tasks</button>
            <button onClick={() => setBankActiveTab('routines')} className={cn("px-4 py-2 text-sm font-bold border-b-2 transition-colors", bankActiveTab === 'routines' ? "border-brand-navy text-brand-navy dark:border-brand-sage dark:text-brand-sage" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>Routines</button>
          </div>`,
  `<div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 mt-2 overflow-x-auto custom-scrollbar pb-1">
            <button onClick={() => setBankActiveTab('tasks')} className={cn("px-2 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap", bankActiveTab === 'tasks' ? "border-brand-navy text-brand-navy dark:border-brand-sage dark:text-brand-sage" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>Tasks</button>
            <button onClick={() => setBankActiveTab('routines')} className={cn("px-2 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap", bankActiveTab === 'routines' ? "border-brand-navy text-brand-navy dark:border-brand-sage dark:text-brand-sage" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>Routines</button>
            <button onClick={() => setBankActiveTab('buffers')} className={cn("px-2 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap", bankActiveTab === 'buffers' ? "border-brand-navy text-brand-navy dark:border-brand-sage dark:text-brand-sage" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>Buffers</button>
            <button onClick={() => setBankActiveTab('meals')} className={cn("px-2 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap", bankActiveTab === 'meals' ? "border-brand-navy text-brand-navy dark:border-brand-sage dark:text-brand-sage" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>Meals</button>
          </div>`
);

// 3. Routines and Tasks Tab conditionals
pageStr = pageStr.replace(
  "{bankActiveTab === 'routines' ? (",
  "{bankActiveTab === 'routines' && ("
);

pageStr = pageStr.replace(
  ") : sortedTagKeys.length === 0 ? (",
  ")}\n          {bankActiveTab === 'tasks' && (\n            sortedTagKeys.length === 0 ? ("
);

// 4. End of Tasks, Insert Buffers Tab, and connect to Meals Tab
// Replace the exact string block from the end of tasks through the Meal Bank Accordion header
const stringToReplace = `              );
            })
          )}
        </div>

        {/* ── Meal Bank Accordion ── */}
        <div className="flex flex-col gap-4 px-5 pb-5">
          <button 
            onClick={() => setExpandedHeaders(prev => prev.includes("meal-bank") ? prev.filter(k => k !== "meal-bank") : [...prev, "meal-bank"])}
            className={cn(
              "flex items-center gap-2 border-b pb-2 sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm transition-colors text-left",
              expandedHeaders.includes("meal-bank") ? "border-slate-300 dark:border-slate-700" : "border-zinc-100 dark:border-zinc-800/50"
            )}
          >
            <Utensils className="w-4 h-4 text-brand-sage" />
            <h3 className={cn("text-sm font-bold uppercase tracking-widest", expandedHeaders.includes("meal-bank") ? "text-brand-navy dark:text-zinc-200" : "text-zinc-700 dark:text-zinc-400")}>Meal Bank</h3>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md relative">{mealBank.length}</span>
              <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-300 shrink-0", expandedHeaders.includes("meal-bank") && "rotate-180")} />
            </div>
          </button>
          
          {expandedHeaders.includes("meal-bank") && (() => {`;

const newString = `              );
            })
          )}
          
          {bankActiveTab === 'buffers' && (() => {
             const weeklyBufferTasks = dataStore["BUFFER"]?.items || [];
             const monthBufferKey = \`MONTH_BUFFER_\${currentMonthKey}\`;
             const monthlyBufferTasks = dataStore[monthBufferKey]?.items || [];
             return (
                <div className="flex flex-col gap-8 pb-8">
                  {/* Weekly Buffer Section */}
                  <div className="flex flex-col gap-4">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/50 pb-2">Weekly Buffer</h3>
                     {weeklyBufferTasks.length === 0 ? (
                        <div className="text-center text-zinc-500 mt-4 text-sm">No tasks in weekly buffer.</div>
                     ) : (
                        <div className="flex flex-col gap-3">
                           {weeklyBufferTasks.map((taskItem) => {
                               const masterTask = taskBank.find((t) => t.id === taskItem.master_id) || { ...taskItem, id: taskItem.master_id };
                               return (
                                 <TaskBankCard
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
                                 />
                               );
                           })}
                        </div>
                     )}
                  </div>

                  {/* Monthly Buffer Section */}
                  <div className="flex flex-col gap-4">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/50 pb-2">Monthly Buffer</h3>
                     {monthlyBufferTasks.length === 0 ? (
                        <div className="text-center text-zinc-500 mt-4 text-sm">No tasks in monthly horizon.</div>
                     ) : (
                        <div className="flex flex-col gap-3">
                           {monthlyBufferTasks.map((taskItem) => {
                               const masterTask = taskBank.find((t) => t.id === taskItem.master_id) || { ...taskItem, id: taskItem.master_id };
                               return (
                                 <TaskBankCard
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
                                 />
                               );
                           })}
                        </div>
                     )}
                  </div>
                </div>
             );
          })()}

          {bankActiveTab === 'meals' && (() => {`;

if (pageStr.includes(stringToReplace)) {
  pageStr = pageStr.replace(stringToReplace, newString);
} else {
  console.log("Failed to match block 4.");
}

// 5. Fix the end of the meals block
const mealsEndStr = `            </div>
          );})()}
        </div>`;

const newMealsEndStr = `            </div>
          );})()}
        </div>`;

// Wait, since we removed `        </div>` that closed the tasks tab scrollable area,
// and we removed the outer `<div className="flex flex-col gap-4 px-5 pb-5">` of Meal Bank,
// The original code had:
//             </div> // closes inner meal-bank body
//           );})()}
//         </div> // closes meal bank outer container
//         {/* ── Soft-Delete Trash Footer ── */}
// 
// So the `</div>` that closes meal bank outer container must NOW act as the `</div>` that closes the scrollable area!
// It aligns perfectly. There is no need to replace the `</div>` at the end because it will naturally close the `flex-1 overflow-y-auto` container!
// We only need to make sure we don't have an extra `</div>`.
// Wait, the original code had:
// 1. `</div>` closing scrollable area.
// 2. `<div>` opening meal bank.
// 3. `</div>` closing inner meal bank body.
// 4. `);})()}`
// 5. `</div>` closing outer meal bank.
//
// My `stringToReplace` included:
// `        </div>`
// `        {/* ── Meal Bank Accordion ── */}`
// `        <div className="flex flex-col gap-4 px-5 pb-5">`
//
// And I replaced it with:
// `          {bankActiveTab === 'buffers' ... }`
// `          {bankActiveTab === 'meals' && (() => {`
//
// So I effectively removed `</div>` (the closing of the scrollable area) AND `<div>` (the opening of the meal bank).
// Thus, the `</div>` that formerly closed the meal bank will now close the scrollable area!
// This is perfect.

fs.writeFileSync('src/app/page.tsx', pageStr, 'utf-8');
console.log('done!');
