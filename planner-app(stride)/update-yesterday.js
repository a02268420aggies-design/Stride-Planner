const fs = require('fs');

let pageStr = fs.readFileSync('src/app/page.tsx', 'utf-8');

const targetStr = `          {bankActiveTab === 'buffers' && (() => {
             const weeklyBufferTasks = dataStore["BUFFER"]?.items || [];
             const monthBufferKey = \`MONTH_BUFFER_\${currentMonthKey}\`;
             const monthlyBufferTasks = dataStore[monthBufferKey]?.items || [];
             return (
                <div className="flex flex-col gap-8 pb-8">
                  {/* Weekly Buffer Section */}`;

const replacementStr = `          {bankActiveTab === 'buffers' && (() => {
             const weeklyBufferTasks = dataStore["BUFFER"]?.items || [];
             const monthBufferKey = \`MONTH_BUFFER_\${currentMonthKey}\`;
             const monthlyBufferTasks = dataStore[monthBufferKey]?.items || [];
             
             const yesterday = new Date(currentDate);
             yesterday.setDate(yesterday.getDate() - 1);
             const yesterdayKey = getDateKey(yesterday);
             const yesterdayTasks = (dataStore[yesterdayKey]?.items || []).filter((item: any) => !item.is_done);

             return (
                <div className="flex flex-col gap-8 pb-8">
                  {/* Yesterday's Unfinished Section */}
                  {yesterdayTasks.length > 0 && (
                  <div className="flex flex-col gap-4">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/50 pb-2">Yesterday's Unfinished</h3>
                     <div className="flex flex-col gap-3">
                        {yesterdayTasks.map((taskItem: any) => {
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
                  </div>
                  )}

                  {/* Weekly Buffer Section */}`;

// make sure carriage returns are uniform
pageStr = pageStr.replace(/\r\n/g, '\n');
if (pageStr.includes(targetStr)) {
  pageStr = pageStr.replace(targetStr, replacementStr);
  fs.writeFileSync('src/app/page.tsx', pageStr, 'utf-8');
  console.log('Successfully added yesterday\\'s unfinished tasks.');
} else {
  console.log('Target string not found.');
}
