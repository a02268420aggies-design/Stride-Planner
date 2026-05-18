# STRIDE: Project Manifest & Architectural Record

*This document serves as the absolute source of truth for the Stride Planner application. Any future AI Agent entering this environment MUST read, parse, and rigorously adhere to this manifest to maintain 100% context retention.*

---

## 1. Tech Stack
- **Framework:** Next.js (App Router, React 18+)
- **Styling:** Tailwind CSS (Strictly utilizing native classes, extensive `group`, `peer`, and `backdrop-blur` mechanics).
- **Animation Engine:** Framer Motion (`<AnimatePresence>` for DOM layout physics, sliding, and layout updates).
- **Icons:** `lucide-react`.
- **Primary Data Persistence:** Client-side generic `localStorage` caching executing heavily through `useEffect` hook syncing.
- **Backend (Future-State):** Supabase structured arrays (Schemas initialized for User, Tags, Tasks sync mapping).

---

## 2. Color Palette & UI Physics (HEDI Specs)
- **Primary Canvas:** `bg-white` (Light) transitioning to `bg-zinc-950` (Dark).
- **Brand Navy:** Highly saturated deep structural elements tracking to `#1E293B` or equivalent strict `brand-navy` config.
- **Brand Sage:** Saturated green interactive highlight elements natively `brand-sage`.
- **Borders & Dividers:** Soft structural boundaries relying strictly on `border-zinc-200` (Light) and `border-zinc-800/50` (Dark).
- **Overlays / Modals:** All structural drawers and modals map explicitly to `bg-white/95 backdrop-blur-md` (Light) and `bg-zinc-950/95 backdrop-blur-md` (Dark) arrays globally.

---

## 3. Global State Schema
Data is strictly isolated into discrete Object dictionaries mapping ID boundaries natively cached to Local Storage:
- **`dataStore` (Daily Planner):** An object mapping `YYYY-MM-DD` strings natively to `{ items: DayTask[], meals: DayMeal[], completedSteps: number, waterOunces: number, notesText: string }`. Also manages unique strings like `"BUFFER"` and `"MONTH_BUFFER_YYYY-MM"` seamlessly without schema fractures.
- **`taskBank` (Master Task Database):** An exact Array `MasterTask[]` modeling structural generic `is_priority`, `tag_id`, and `due_date` constraints independently.
- **`mealBank` (Master Meal Database):** An exact Array `MealItem[]` preserving recipes (`ingredients: string[]`) and time formats (`type: "B" | "L" | "D" | "S"`). Tracking frequency natively via `planCount`.
- **`groceryStore` (Weekly Logistics):** An object tracking week strings (`YYYY-[W]ww`) rigidly mapped against `{ items: GroceryItem[], ghostsRevealed: boolean }`.

---

## 4. Feature Inventory & Logic Engines

### A. The "Morning Huddle" (Triage Engine)
- **Objective:** Forces users to triage uncompleted tasks from Yesterday and unprocessed buffer arrays fundamentally.
- **Logic:** Hooked functionally via `lastOpenedDate`. If `!== today`, a `<AnimatePresence>` modal completely locks the UI.
- **Data Hook:** Users move Leftover tasks directly to "Today" or migrate to the global "Weekly Buffer".
- **Auto-Close:** A `checkHuddleCompletion` hook recursively calculates the length of un-triaged arrays dynamically. The second it strikes `0`, the engine throws a generic success delay map and natively unmounts completely automatically.

### B. The Task Bank (Sidebar Engine)
- **Objective:** Global Master component library mapping Goals, Priorities, and Meals visually mapping out natively dynamically.
- **Scroll Physics:** Mapping `overflow: hidden` identically directly to `document.body` identically securing background lockout dynamically natively allowing perfect `-webkit-overflow-scrolling: touch` mobile smoothing inside the panel.
- **Auto-Collapse Integrity:** A `closeTaskBank()` delay variable triggers exactly wiping `setExpandedHeaders([])` completely resetting Search queries natively forcing the module to physically spawn closed fundamentally cleanly exactly securely on initial launch and every subsequent map identically. 
- **Non-Destructive Persistence:** When scheduling a task from the Task Bank, it explicitly DOES NOT remove the card from the bank. TaskBank items are considered "Templates" whereas dataStore scheduled tasks are "Instances". This allows multiple instances of the same task template to be scheduled across different days, protected by a duplicate check per day.
- **Priority State Override:** TaskBank cards carry a local `isPriority` state that acts as a deployment flag for new `TaskItem` instances. Toggling the star visualizes the override locally and applies it to any newly generated instance injected into the `dataStore`.
- **Inline Editing & Sync Engine:** `MasterTask` templates natively support inline editing of Tags (via `TagPickerPopover`) and Nudges (via `NudgePopover`) directly from the Task Bank sidebar. These systems provide immediate visual feedback (e.g. dynamic color pulsing) and implement **Retroactive Synchronization**—updating the `tag_id` or `nudgeDate` on the template also recursively pushes the new data downstream to all previously deployed instances of that task across the entire `dataStore` architecture.

### C. Meal & Grocery Mechanics (Ghost Sync & AI)
- **Ghost Tracking:** Ingredients configured natively inside the `Meal Bank` magically propagate into the Weekly `GroceryStore` array precisely natively via heavily optimized `useMemo()` dependency maps running inherently against the global `dataStore` loops internally without manual UI triggers. 
- **Time-Based Suggestions:** Daily views parse `new Date().getHours()` explicitly defining exactly the Time boundary mapping strictly past 3 day historic overrides yielding a conditional array of `Autocomplete Bubbles` cleanly natively formatting exclusively matching historical logic strictly tracking specifically density loops seamlessly cleanly!
- **Autocomplete Logic:** Input grids conditionally conditionally conditionally mapping keystrokes actively mapping strictly overriding `mealBank` components actively mapping `ArrowDown` variables sequentially formatting exclusively dynamic boundaries cleanly exactly automatically safely seamlessly flawlessly formatting mapping arrays.

### D. The Sunday Reset "Zen Wizard"
- **Objective:** Provides a deeply focused 4-step transitional end-of-week review natively bridging Data Visualization, Logistics, Task Buffers, and Weekly Targets.
- **Trigger Logic:** Conditionally mounts exclusively on Sundays via `currentDate.getDay() === 0` rendering a `SundayReset` overlay `<AnimatePresence>`. 
- **Step 1 (Reflection):** Computes `insightsData` outputting tag distribution rings and Week-over-Week hit rate paths alongside a textual prompt ("What's one thing you're proud of this week?") mapped to `weeklyJournal`.
- **Step 2 (The Pantry):** Iterates strictly through `groceryStore` arrays, offering text-driven block buttons `[Expire]` and `[Roll Over]` to strictly pass objects relative to Monday boundaries.
- **Step 3 (The Workbench):** Exposes `dataStore["BUFFER"]` contents visually matching rich isolated triage cards resolving `[Move to Monday]` or `[Remove Flag]` destinations cleanly.
- **Step 4 (The North Stars):** Captures three high-contrast text string targets mapped to `weeklyNorthStars`. Exiting the wizard physically triggers system date `handleGoToToday` equivalencies pushing into Monday, strictly permanently anchoring the non-empty North Stars cleanly at the peak of the Weekly View.

### E. Monthly Boundary & Clean Up Mechanics
- **Objective:** Prevent monthly mapped buffer items from sinking into the abyss when the month boundary explicitly rolls over.
- **Trigger Logic:** Checks `stride-last-opened-month` against `currentMonthKey` on boot. If mismatched, instantly parses the old `dataStore["MONTH_BUFFER_${old_month}"]`.
- **Review UI:** Yields a modal demanding unassigned targets be processed explicitly. Users can strictly `[Roll Over]` into the newly minted Month dictionary, or `[Return to Bank]` natively re-building the object globally unassigned. It maintains an `(X)` soft-dismissal intentionally leaving old strings unmapped in history.
- **Sunday Reset Integration:** The Sunday Wizard inherently exclusively pulls from the active boundary constraint `currentMonthKey`, inherently filtering out stale records and preventing ghost anomalies securely.
- **Monthly Peek Drawer:** Clicking a calendar day exposes the Peek as a non-blocking bottom sheet, allowing concurrent Task Bank access. The inline form maps structurally via `peekDate`, exclusively toggling Priorities when the `<Star>` acts. 

### F. Interaction Systems
- **Sequential Focus Logic (Monthly Milestones):** The Monthly Milestones sidebar dynamically manages input focus via a custom `onKeyDown` hook paired with a strongly-typed `milestoneRefs` array. Keystrokes (`Tab`, `Enter`, `Shift + Tab`) seamlessly traverse array indices in both directions perfectly cleanly perfectly! Submitting (`Enter`) on the final bound index triggers a generic save handler (`handleSaveMilestones()`) and safely fires `blur()` mitigating hidden soft-locks elegantly. Active elements display a subtle simulated Sage glow (`shadow-[...]`) providing critical state visibility natively safely natively format clean!
- **Buffer Promotion Pipeline:** Tasks adhere to an intentional buffer escalation logic pipeline: `Bank -> Month -> Week -> Day`. Moving a task is strictly a Delete-and-Insert operation propagating vertically across dictionary keys. `dataStore` serves as the explicit Source of Truth for task physical location, rather than relying on intrinsic ID tags on the `TaskItem`. Furthermore, opening the Monthly Peek enables an explicit targeting override: `Bank -> Peek Date`, cleanly routing bank objects into `dataStore[peekDate]`.
  - `Bank → Month`: Move TaskItem securely from the global `taskBank` unassigned view natively into `dataStore["MONTH_BUFFER_YYYY-MM"]`.
  - `Month → Week`: Escalated securely out of the Monthly schema directly into `dataStore["BUFFER"]` natively.
  - `Week → Day`: Mapped cleanly exclusively directly to `dataStore["YYYY-MM-DD"]`.

### G. Micro-Interactions & Visual Feedback
- **Origin Scale-Down:** When a task is planned from the Task Bank, it triggers a 0.3s Sage-colored scale-down animation (`bg-brand-sage/10 scale-95 opacity-60 duration-300`) to confirm the action without removing the master template.
- **Destination Pulse:** The target calendar cell (Monthly) or day container (Weekly/Daily) receives an 0.8s Navy pulse animation (`scale-[1.05]` or `scale-[1.02]`, `ring-4 ring-brand-navy`) immediately upon successful scheduling.
- **Activity Dots:** Project dots added to the Monthly Grid animate in natively using `animate-in zoom-in duration-300 fill-mode-both`, visualizing the calendar filling up in real-time.
- **Global Toast:** A minimalist Slate-colored toast (`bg-slate-800 text-white`) appears at the bottom-center for 1s confirming task migration ("Task moved to [Date]"). Duplicate attempts trigger a 2s error toast.

### H. Intelligence & Shortcuts
- **Color-to-Name Mapping:** When creating a new tag globally or via the Task Bank Quick-Tag system, clicking an aesthetic color swatch triggers a `findTagNameByColor` lookup against the user's existing generic Tags array. If a matching hex code is found, the system magically auto-fills the "Tag Name" input field to maintain nomenclature consistency (e.g., clicking "Navy" auto-fills "Assignments" if previously mapped), accelerating task creation while remaining non-destructive if the color is unused. Unmapped color swatches reset the Tag Name field to blank to prevent mislabeling.

---

## 5. Change Log & Update Protocol

### Modification Engine Requirements
*All future modifications mapped into this codebase MUST identically inject exact patch descriptions and structural updates below precisely!*

#### v1.0.0 (Log Update: March 30, 2026)
- Initialized Manifest.
- Integrated "Intelligent Daily Meal Suggestions" relying on `planCount` density arrays checking historic `dataStore` explicitly conditionally masking loops dynamically natively exactly tracking system time implicitly cleanly.
- Integrated "Frequency-Based Meal Autocomplete", physically overriding Native input strings manually intercepting `ArrowUp/Down`, dynamically applying Keyboard styling natively mapped globally dynamically perfectly!

#### v1.1.0 (Log Update: April 7, 2026)
- Implemented the "Sunday Reset Engine" Phase 1 & Phase 2 directly into the root context.
- Injected strict data visualization charts (Energy Audit, Rhythm Line) mapping dynamically against strictly `insightsData` dependency chains exactly cleanly cleanly.
- Attached robust Grocery and Buffer mapping structures shifting natively explicitly mapped object dictionaries precisely across week boundaries flawlessly cleanly seamlessly.

#### v1.2.0 (Log Update: April 7, 2026)
- Overhauled the Sunday Reset into the "Zen Wizard" workflow injecting Step 4 (North Stars mapping array) seamlessly gracefully modifying the UI physics entirely relying on a deep `bg-brand-navy` styling.
- Defined the initial schema bounds inside `init_schema.sql` to house `weekly_journal` cleanly mapping backend foundations natively formatting future sync loops!

#### v1.3.0 (Log Update: April 8, 2026)
- Implemented the "Monthly Command Center" (Phase 1 & 2), introducing a 7-column minimalist calendar grid.
- Added heavy gesture-based navigation (`drag` handlers) mapping directly to month pagination smoothly natively.
- Injected "The Peek" bottom-sheet interaction natively intercepting single tap UI mechanics to expose quick-add priority inputs cleanly.
- Attached Monthly Milestones Sidebar mapping global side-targets natively directly linked to `monthlyMilestones` dictionary array dependencies smoothly smoothly.
- Overhauled `<Insights>` logic natively conditionally parsing exactly against 7-day bounds or dynamically measuring entire Month boundaries identically seamlessly outputting a native Pie Chart renderer natively exclusively running under 'month' mode dynamically!

#### v1.3.1 (Log Update: April 15, 2026)
- Implemented **Sequential Focus Logic** for the Monthly Milestones tracking `useRef` arrays internally gracefully natively enabling `Tab/Enter` boundary-aware navigation paths effectively identically elegantly. Injected aesthetic glowing sage rings exclusively formatting active inputs efficiently completely exactly.
- Added **Monthly Horizon Buffer** and the Promotion Pipeline directly natively mapped to `MONTH_BUFFER_YYYY-MM`. Embedded corresponding native inline additions via UI accordions directly attached strictly identical completely perfectly seamlessly without breaking Weekly arrays realistically effectively perfectly securely.

#### V1.1 UI Polish
- **Sticky Navigation:** Replaced static header with a fixed, blurred `sticky top-0 z-[100] bg-white/80 backdrop-blur-md py-2` UI element to ensure the primary navigation buttons remain visible during deep scrolling.
- **Weekly Drill-down:** Injected a fast-action "Jump to Week" button array cleanly into the starting column (`index % 7 === 0`) of the Monthly grid, formatted as `W1, W2...` with icon hovers, hooking directly into the `setViewMode('week')` state logic mapping seamlessly identically gracefully perfectly.
- **UI Alignment:** Ensured the Daily Priority lists correctly render the completion check-bubbles strictly to the left of the priority index numeric (`[Circle] [Number] [Task Name]`), matching intended scanning readability patterns identically.
- **Tag Picker Blur:** Upgraded the `isPaletteOpen` external-click boundary from `mousedown` to `click` and implemented proper event `stopPropagation()` to seamlessly hide the bubble unconditionally natively efficiently securely.

#### V1.2 UI Declutter & Interactivity Polish
- **Z-Index Hierarchy Fix:** Established a strict stacking context where the global Sticky Header occupies `z-[100]`, and Task Bank Popovers (Tag Picker, Nudge Menu) elevate to `z-[200]` utilizing React `createPortal()` strictly mapped to `document.body` dynamically maintaining rigid positional coordinates to prevent container clipping precisely effectively cleanly securely! Included an explicit `mousedown` generic Outside Click Listener globally enforcing dismissal.
- **Ghost Actions (Hover States):** Implemented a "Zen Mode" declarative layout where non-active action buttons (Star, Tag, Bell) explicitly adopt `opacity-0` base states seamlessly transitioning to `opacity-100` specifically via `group-hover` physics exactly reducing visual cognitive load actively when un-targeted natively elegantly.
- **Manual Priority Ranking (DnD):** Daily Priorities now support manual drag-and-drop reordering with automatic rank updating using `@dnd-kit`. Reordered state persists instantly via immediate splice-and-merge propagation back into `dataStore[dateKey].items`.

## 5. Interaction Flow
- Navigation actions (Jump to Day) trigger a cleanup of the sidebar context.
- **Due Date Jump:** TaskBank cards conditionally render a Due Date badge based on the optional dueDate property mapped in the MasterTask schema. Clicking this badge inherently triggers a navigation jump to the target day view while seamlessly closing the Task Bank via the global cleanup cycle.

## 6. UI/UX Standards
- All data keys are displayed in human-readable 'Buffer [Month], [Year]' format, but remain stored as 'DUE_BUFFER_YYYY/MM'.
