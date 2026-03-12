"use client";

import { useState, useEffect, useRef } from "react";
import { ConcentricRings } from "@/components/ConcentricRings";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { ChevronLeft, ChevronRight, CalendarDays, Star, Library, Plus, ArrowRightToLine, CheckCircle2, X, Trash2, Tag, Clock, Calendar as CalendarIcon, AlignLeft, Utensils, Edit3, Palette, Droplets, Footprints, Search, Filter, List, ListOrdered, CheckSquare } from "lucide-react";

type TagItem = { id: string; name: string; color: string; };
type MasterTask = { id: string; text: string; is_priority: boolean; tag_id?: string; due_date?: string; time?: string; notes?: string; };
type TaskItem = { id: string; master_id: string; text: string; is_done: boolean; is_priority: boolean; tag_id?: string; due_date?: string; time?: string; notes?: string; };

type MealType = "B" | "L" | "D" | "S";
type MealEntry = { id: string; type: MealType; text: string; };

type DayTasks = {
  items: TaskItem[];
  meals: MealEntry[];
  water: number;
  steps: string;
  step_goal: string;
  notes: string;
};
type TaskData = Record<string, DayTasks>;

const getDateKey = (date: Date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

const getEmptyDay = (): DayTasks => ({ items: [], meals: [], water: 0, steps: "", step_goal: "10000", notes: "" });

// Aesthetic Color Palette
const aestheticColors = [
  "#000080", // Navy
  "#9C9F84", // Sage
  "#d97706", // Amber
  "#7c3aed", // Violet
  "#ec4899", // Pink
  "#0ea5e9", // Sky
  "#14b8a6", // Teal
  "#f43f5e", // Rose
];

// Default Tags
const defaultTags: TagItem[] = [
  { id: "tag-goals", name: "Goals", color: "#9C9F84" },
  { id: "tag-assignments", name: "Assignments", color: "#000080" },
  { id: "tag-appointments", name: "Appointments", color: "#d97706" },
  { id: "tag-projects", name: "Projects", color: "#7c3aed" },
];



// ─── Notes keyboard helpers ────────────────────────────────────────────────────
const NUMBER_LINE_RE = /^(\d+)\.\s/;
const LETTER_LINE_RE = /^\s*([a-z])\.\s/;
const letterToIndex = (ch: string) => ch.charCodeAt(0) - 97;
const indexToLetter = (i: number) => String.fromCharCode(97 + (i % 26));

function nextNumberAbove(lines: string[]): number {
  let last = 0;
  for (const l of lines) {
    const m = l.match(NUMBER_LINE_RE);
    if (m) last = parseInt(m[1], 10);
  }
  return last + 1;
}

function nextLetterAbove(lines: string[]): string {
  let last = -1;
  for (const l of lines) {
    if (NUMBER_LINE_RE.test(l)) last = -1;
    const m = l.match(/^\s*([a-z])\.\s/);
    if (m) last = letterToIndex(m[1]);
  }
  return indexToLetter(last + 1);
}
// ──────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const dateKey = getDateKey(currentDate);

  const [tags, setTags] = useState<TagItem[]>(defaultTags);
  const [taskBank, setTaskBank] = useState<MasterTask[]>(() => {
    try {
      const saved = localStorage.getItem('stride-task-bank');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [bankFilterTagId, setBankFilterTagId] = useState<string>("ALL");

  const [mealMemory, setMealMemory] = useState<string[]>(["Chicken Stir Fry", "Oatmeal with Berries", "Turkey Sandwich", "Protein Shake", "Salmon and Rice"]);
  const [activeMealInput, setActiveMealInput] = useState<MealType | null>(null);
  const [mealInputValue, setMealInputValue] = useState("");
  const mealInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskTagId, setNewTaskTagId] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(dateKey);
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState(false);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [tempTagColor, setTempTagColor] = useState(aestheticColors[0]);

  const tagsById = tags.reduce((acc, tag) => ({ ...acc, [tag.id]: tag }), {} as Record<string, TagItem>);
  const goalsTagId = tags.find(t => t.name.toLowerCase() === "goals")?.id;

  useEffect(() => {
    if (!isModalOpen) setNewTaskDate(dateKey);
  }, [dateKey, isModalOpen]);

  useEffect(() => {
    if (activeMealInput && mealInputRef.current) {
      setTimeout(() => mealInputRef.current?.focus(), 0);
    }
  }, [activeMealInput]);

  useEffect(() => {
    if (isCreatingTag) setTempTagColor(aestheticColors[0]);
    else if (newTaskTagId && tagsById[newTaskTagId]) setTempTagColor(tagsById[newTaskTagId].color);
  }, [isCreatingTag, newTaskTagId]);

  const [dataStore, setDataStore] = useState<TaskData>(() => {
    try {
      const saved = localStorage.getItem('stride-data-store');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const getDayData = (key: string): DayTasks => dataStore[key] || getEmptyDay();
  const dayData = getDayData(dateKey);

  // ─── Persist to localStorage on every change ───────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('stride-data-store', JSON.stringify(dataStore)); } catch {}
  }, [dataStore]);

  useEffect(() => {
    try { localStorage.setItem('stride-task-bank', JSON.stringify(taskBank)); } catch {}
  }, [taskBank]);
  // ──────────────────────────────────────────────────────────────────────────

  const toggleDayTaskDone = (id: string) => {
    setDataStore((prevStore) => {
      const existingDay = getDayData(dateKey);
      const newItems = existingDay.items.map(t => t.id === id ? { ...t, is_done: !t.is_done } : t);
      return { ...prevStore, [dateKey]: { ...existingDay, items: newItems } };
    });
  };

  const toggleDayTaskPriority = (id: string) => {
    setDataStore((prevStore) => {
      const existingDay = getDayData(dateKey);
      const newItems = existingDay.items.map(t => t.id === id ? { ...t, is_priority: !t.is_priority } : t);
      return { ...prevStore, [dateKey]: { ...existingDay, items: newItems } };
    });
  };

  const removeDayTask = (id: string, masterId: string) => {
    setDataStore((prevStore) => {
      const existingDay = getDayData(dateKey);
      const newItems = existingDay.items.filter(t => t.id !== id);
      return { ...prevStore, [dateKey]: { ...existingDay, items: newItems } };
    });
  };

  const toggleDayWater = (index: number) => {
    setDataStore((prevStore) => {
      const existingDay = getDayData(dateKey);
      const newWater = existingDay.water === index + 1 ? index : index + 1;
      return { ...prevStore, [dateKey]: { ...existingDay, water: newWater } };
    });
  };

  const setDaySteps = (steps: string) => {
    setDataStore((prevStore) => {
      const existingDay = getDayData(dateKey);
      return { ...prevStore, [dateKey]: { ...existingDay, steps } };
    });
  };

  const setDayStepGoal = (step_goal: string) => {
    setDataStore((prevStore) => {
      const existingDay = getDayData(dateKey);
      return { ...prevStore, [dateKey]: { ...existingDay, step_goal } };
    });
  };

  const setDayNotes = (notes: string) => {
    setDataStore((prevStore) => {
      const existingDay = getDayData(dateKey);
      return { ...prevStore, [dateKey]: { ...existingDay, notes } };
    });
  };

  // ─── UPGRADED handleNotesKeyDown ────────────────────────────────────────────
  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const { selectionStart, selectionEnd, value } = ta;

    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEndRaw = value.indexOf("\n", selectionStart);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
    const currentLine = value.slice(lineStart, lineEnd);
    const linesAbove = value.slice(0, lineStart).split("\n").filter(Boolean);

    // ── Tab: number → indented letter ─────────────────────────────────────────
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      if (NUMBER_LINE_RE.test(currentLine)) {
        const nextLetter = nextLetterAbove(linesAbove);
        // Strip leading spaces from currentLine before replacing, then re-indent
        const stripped = currentLine.replace(/^\s*/, "");
        const newLine = "   " + stripped.replace(NUMBER_LINE_RE, `${nextLetter}. `);
        const newText = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
        setDayNotes(newText);
        const delta = newLine.length - currentLine.length;
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + delta; });
      } else {
        // fallback: insert 2 spaces for non-list lines
        const newText = value.slice(0, selectionStart) + "  " + value.slice(selectionEnd);
        setDayNotes(newText);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + 2; });
      }
      return;
    }

    // ── Shift+Tab: indented letter → outdent back to number ───────────────────
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      // Match letter lines with optional leading spaces
      const indentedLetterRE = /^(\s*)([a-z])\.\s/;
      const m = currentLine.match(indentedLetterRE);
      if (m) {
        const nextNum = nextNumberAbove(linesAbove);
        // Remove indent, replace letter prefix with number prefix
        const rest = currentLine.slice(m[0].length);
        const newLine = `${nextNum}. ${rest}`;
        const newText = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
        setDayNotes(newText);
        const delta = newLine.length - currentLine.length;
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + delta; });
      }
      return;
    }

    // ── Enter: auto-increment number or letter ─────────────────────────────────
    if (e.key === "Enter") {
      const isNumber = NUMBER_LINE_RE.test(currentLine);
      const isLetter = LETTER_LINE_RE.test(currentLine);
      if (!isNumber && !isLetter) return;

      e.preventDefault();
      const textAfterPrefix = currentLine.replace(isNumber ? NUMBER_LINE_RE : LETTER_LINE_RE, "").trim();

      // If line is empty prefix only → remove formatting and do normal newline
      if (textAfterPrefix === "") {
        const prefixLen = currentLine.length;
        const newText = value.slice(0, lineStart) + value.slice(lineEnd);
        setDayNotes(newText);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = lineStart; });
        return;
      }

      let nextPrefix = "";
      if (isNumber) {
        const m = currentLine.match(NUMBER_LINE_RE)!;
        nextPrefix = `${parseInt(m[1], 10) + 1}. `;
      } else {
        const m = currentLine.match(/^(\s*)([a-z])\.\s/)!;
        const indent = m[1]; // preserve leading spaces
        nextPrefix = `${indent}${indexToLetter(letterToIndex(m[2]) + 1)}. `;
      }

      const insertion = "\n" + nextPrefix;
      const newText = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
      setDayNotes(newText);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + insertion.length; });
    }
  };
  // ──────────────────────────────────────────────────────────────────────────────

  const insertNoteFormatting = (prefix: string) => {
    if (!notesRef.current) return;
    const textarea = notesRef.current;
    const { selectionStart, selectionEnd, value } = textarea;
    const beforeCursor = value.substring(0, selectionStart);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const currentLine = value.substring(lineStart, selectionEnd || value.length).split('\n')[0];
    const hasFormatting = /^(\s*)(•\s+|\[\s\]\s+|\[x\]\s+)/.test(currentLine);
    let newText = value;
    let newCursorPos = selectionStart;
    if (hasFormatting) {
      newText = value.substring(0, selectionStart) + prefix + value.substring(selectionEnd);
      newCursorPos = selectionStart + prefix.length;
    } else {
      newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
      newCursorPos = selectionStart + prefix.length;
    }
    setDayNotes(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    }, 0);
  };

  const notesRef = useRef<HTMLTextAreaElement>(null);

  const handleUpdateTagColor = (colorHex: string) => {
    setTempTagColor(colorHex);
    if (isCreatingTag) return;
    if (newTaskTagId) {
      setTags(prev => prev.map(t => t.id === newTaskTagId ? { ...t, color: colorHex } : t));
      setIsPaletteOpen(false);
    }
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return null;
    const newTag: TagItem = { id: `tag_${Date.now()}`, name: newTagName.trim(), color: tempTagColor };
    setTags(prev => [...prev, newTag]);
    setNewTaskTagId(newTag.id);
    setIsCreatingTag(false);
    setNewTagName("");
    setTempTagColor(aestheticColors[0]);
    return newTag.id;
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    let finalTagId = newTaskTagId;
    if (isCreatingTag && newTagName.trim()) finalTagId = handleAddTag() || "";
    const newMasterId = `m_${Date.now()}`;
    const newMasterTask: MasterTask = { id: newMasterId, text: newTaskText.trim(), is_priority: newTaskPriority, tag_id: finalTagId || undefined, due_date: newTaskDate, time: newTaskTime, notes: newTaskNotes };
    setTaskBank((prev) => [...prev, newMasterTask]);
    scheduleTaskToDay(newMasterTask, newTaskDate || dateKey);
    setIsModalOpen(false);
    resetModal();
  };

  const resetModal = () => {
    setNewTaskText(""); setNewTaskTagId(""); setNewTaskDate(dateKey);
    setNewTaskTime(""); setNewTaskNotes(""); setNewTaskPriority(false);
    setIsCreatingTag(false); setIsPaletteOpen(false);
  };

  const scheduleTaskToDay = (masterTask: MasterTask, targetDateKey: string) => {
    const newDayId = `t_${Date.now()}_${Math.random()}`;
    const newScheduledTask: TaskItem = { ...masterTask, id: newDayId, master_id: masterTask.id, is_done: false };
    setDataStore((prevStore) => {
      const existingDay = prevStore[targetDateKey] || getEmptyDay();
      return { ...prevStore, [targetDateKey]: { ...existingDay, items: [...existingDay.items, newScheduledTask] } };
    });
  };

  const archiveMasterTask = (masterId: string) => {
    setTaskBank((prev) => prev.filter((t) => t.id !== masterId));
    setDataStore((prevStore) => {
      const newStore = { ...prevStore };
      Object.keys(newStore).forEach(date => {
        const day = newStore[date];
        newStore[date] = { ...day, items: day.items.map(item => item.master_id === masterId ? { ...item, is_done: true } : item) };
      });
      return newStore;
    });
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#000080', '#9C9F84', '#d97706', '#7c3aed'] });
  };

  const shiftDate = (days: number) => {
    setCurrentDate((prev) => { const nextDate = new Date(prev); nextDate.setDate(nextDate.getDate() + days); return nextDate; });
  };
  const goToToday = () => setCurrentDate(new Date());

  const saveActiveMeal = (type: MealType, value: string) => {
    if (!value.trim()) return;
    const newMealText = value.trim();
    setDataStore(prev => {
      const existingDay = prev[dateKey] || getEmptyDay();
      const newMeals = existingDay.meals.filter(m => m.type !== type);
      newMeals.push({ id: `meal_${Date.now()}`, type, text: newMealText });
      return { ...prev, [dateKey]: { ...existingDay, meals: newMeals } };
    });
    if (!mealMemory.some(m => m.toLowerCase() === newMealText.toLowerCase())) {
      setMealMemory(prev => [...prev, newMealText]);
    }
  };

  const handleMealSubmit = (e: React.FormEvent | React.KeyboardEvent, type: MealType) => {
    if ('key' in e && e.key !== 'Enter') return;
    if ('preventDefault' in e) e.preventDefault();
    saveActiveMeal(type, mealInputValue);
    setActiveMealInput(null);
    setMealInputValue("");
  };

  const handleMealBlur = (e: React.FocusEvent<HTMLInputElement>, type: MealType) => {
    setTimeout(() => {
      if (activeMealInput === type) {
        if (mealInputValue.trim() !== "") saveActiveMeal(type, mealInputValue);
        else if (getMealText(type) && mealInputValue.trim() === "") removeMeal(type);
        setActiveMealInput(null);
        setMealInputValue("");
      }
    }, 150);
  };

  const removeMeal = (type: MealType) => {
    setDataStore(prev => {
      const existingDay = prev[dateKey] || getEmptyDay();
      return { ...prev, [dateKey]: { ...existingDay, meals: existingDay.meals.filter(m => m.type !== type) } };
    });
    if (activeMealInput === type) { setActiveMealInput(null); setMealInputValue(""); }
  };

  const getNextMealType = (current: MealType, reverse: boolean = false): MealType | null => {
    const order: MealType[] = ["B", "L", "D", "S"];
    const idx = order.indexOf(current);
    if (reverse) return idx > 0 ? order[idx - 1] : null;
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const handleMealKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLDivElement>, type: MealType) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextType = getNextMealType(type, e.shiftKey);
      if (activeMealInput === type && mealInputValue.trim()) saveActiveMeal(type, mealInputValue);
      if (nextType) { setActiveMealInput(nextType); setMealInputValue(getMealText(nextType)); }
      else { setActiveMealInput(null); setMealInputValue(""); }
    }
  };

  const goalsArray = dayData.items.filter(t => t.tag_id === goalsTagId);
  const prioritiesArray = dayData.items.filter(t => t.is_priority && t.tag_id !== goalsTagId);
  const tasksArray = dayData.items.filter(t => !t.is_priority && t.tag_id !== goalsTagId);
  const getMealText = (type: MealType) => dayData.meals.find(m => m.type === type)?.text || "";

  // ─── Derived goal states (tied to dateKey via dayData) ────────────────────
  const stepsGoalMet = parseInt(dayData.steps || "0") >= parseInt(dayData.step_goal || "10000");
  const waterGoalMet = dayData.water >= 8;
  // ──────────────────────────────────────────────────────────────────────────

  const bankByTag: Record<string, MasterTask[]> = {};
  const filteredBank = taskBank.filter(task => {
    if (bankFilterTagId !== "ALL") {
      const isUntagged = !task.tag_id;
      if (bankFilterTagId === "untagged" && !isUntagged) return false;
      if (bankFilterTagId !== "untagged" && task.tag_id !== bankFilterTagId) return false;
    }
    if (bankSearchQuery.trim() && !task.text.toLowerCase().includes(bankSearchQuery.toLowerCase())) return false;
    return true;
  });
  filteredBank.forEach(task => {
    const tagKey = task.tag_id || "untagged";
    if (!bankByTag[tagKey]) bankByTag[tagKey] = [];
    bankByTag[tagKey].push(task);
  });
  const sortedTagKeys = Object.keys(bankByTag).sort((a, b) => {
    if (a === "untagged") return 1; if (b === "untagged") return -1;
    return (tagsById[a]?.name || "").localeCompare(tagsById[b]?.name || "");
  });

  const tasksCompleted = tasksArray.filter((t) => t.is_done).length;
  const prioritiesCompleted = prioritiesArray.filter((p) => p.is_done).length;
  const goalsCompleted = goalsArray.filter((g) => g.is_done).length;
  const formattedDate = currentDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const renderTagDot = (tagId?: string) => {
    if (!tagId || !tagsById[tagId]) return <div className="w-2.5 h-2.5 rounded-full shrink-0 invisible" />;
    const color = tagsById[tagId].color;
    return <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} title={tagsById[tagId].name} />;
  };

  const mealSuggestions = mealInputValue.trim()
    ? mealMemory.filter(m => m.toLowerCase().includes(mealInputValue.toLowerCase().trim()) && m.toLowerCase() !== mealInputValue.toLowerCase().trim()).slice(0, 3)
    : [];

  const getTabIndex = (type: MealType) => {
    const base = 10;
    switch (type) { case "B": return base + 1; case "L": return base + 2; case "D": return base + 3; case "S": return base + 4; default: return base; }
  };

  const renderMealBlock = (type: MealType, label: string) => {
    const currentText = getMealText(type);
    const isActive = activeMealInput === type;
    return (
      <div className="flex flex-col gap-1 relative group">
        <span className="text-xs uppercase font-bold tracking-widest text-zinc-400 flex items-center justify-between">
          {label}
          {currentText && !isActive && (
            <button onClick={(e) => { e.stopPropagation(); removeMeal(type); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 dark:hover:bg-red-900/40 rounded transition-all">
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          )}
        </span>
        {isActive ? (
          <div className="relative z-10 -m-1 p-1 bg-white dark:bg-zinc-900 ring-2 ring-brand-sage dark:ring-brand-sage/50 rounded-md transition-shadow">
            <div className="flex items-center gap-2 border-b border-brand-sage pb-0.5">
              <Utensils className="w-3.5 h-3.5 text-brand-sage shrink-0" />
              <input
                ref={mealInputRef} type="text"
                className="bg-transparent border-none text-sm font-serif italic focus:ring-0 w-full p-0 text-zinc-800 dark:text-zinc-200 outline-none"
                placeholder={`What's for ${label.toLowerCase()}?`}
                value={mealInputValue || ""}
                onChange={e => setMealInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Tab') handleMealKeyDown(e, type); else handleMealSubmit(e, type); }}
                onBlur={(e) => handleMealBlur(e, type)}
              />
            </div>
            {mealSuggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-[110%] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-2xl overflow-hidden py-1 z-50">
                {mealSuggestions.map((suggestion, idx) => (
                  <button key={idx} type="button"
                    className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-brand-sage/10 hover:text-brand-navy transition-colors font-serif italic"
                    onMouseDown={(e) => { e.preventDefault(); saveActiveMeal(type, suggestion); setActiveMealInput(null); setMealInputValue(""); }}
                  >{suggestion}</button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            tabIndex={getTabIndex(type)}
            className="border-b border-zinc-300 dark:border-zinc-700 h-6 w-full flex items-center cursor-text transition-colors hover:border-brand-navy/30 focus-visible:outline-none focus-visible:border-brand-sage focus-visible:ring-1 focus-visible:ring-brand-sage/50 rounded-sm"
            onClick={() => { setActiveMealInput(type); setMealInputValue(currentText); }}
            onFocus={() => { if (activeMealInput !== type) { setActiveMealInput(type); setMealInputValue(currentText); } }}
            onKeyDown={(e) => handleMealKeyDown(e, type)}
          >
            {currentText ? (
              <span className="text-sm font-serif italic text-zinc-800 dark:text-zinc-200 w-full truncate pr-2">{currentText}</span>
            ) : (
              <span className="text-xs font-serif italic text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 w-full">
                <Edit3 className="w-3 h-3" /> Add {label.toLowerCase()}...
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen justify-center bg-zinc-100 font-sans dark:bg-black p-4 sm:p-8 relative overflow-y-auto">

      {/* Master Task Bank Slide-Out */}
      <div className={cn("fixed top-0 right-0 h-full w-[400px] bg-white dark:bg-zinc-950 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 transition-transform duration-300 z-50 flex flex-col pl-safe pb-safe", isBankOpen ? "translate-x-0" : "translate-x-full")}>
        <div className="flex flex-col gap-3 p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 drop-shadow-sm z-10 w-full shrink-0">
          <div className="flex items-center justify-between text-brand-navy dark:text-zinc-200">
            <div className="flex items-center gap-3">
              <Library className="w-5 h-5" />
              <h2 className="text-xl font-bold tracking-tight">Task Bank</h2>
            </div>
            <button onClick={() => setIsBankOpen(false)} className="p-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-2 items-center">
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
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8">
          {sortedTagKeys.length === 0 ? (
            <div className="text-center text-zinc-500 mt-10 text-sm">No tasks in the bank.</div>
          ) : (
            sortedTagKeys.map(tagId => {
              const tag = tagsById[tagId];
              const items = bankByTag[tagId];
              return (
                <div key={tagId} className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b-2 border-zinc-100 dark:border-zinc-800/50 pb-2">
                    {tag ? (<><span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: tag.color }} /><h3 className="text-sm font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">{tag.name}</h3></>) : (<h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Untagged</h3>)}
                    <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md ml-auto">{items.length}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {items.map(task => (
                      <div key={task.id} className="group relative flex flex-col gap-3 p-4 bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800 rounded-xl hover:border-brand-navy/50 hover:shadow-md transition-all">
                        <div className="flex items-start gap-3">
                          <Star className={cn("w-5 h-5 mt-0.5 shrink-0 transition-colors", task.is_priority ? "text-brand-sage fill-brand-sage" : "text-zinc-300 dark:text-zinc-700")} />
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug">{task.text}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                          <button onClick={() => scheduleTaskToDay(task, dateKey)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/20 dark:text-brand-navy hover:bg-brand-navy hover:text-white text-xs font-bold rounded-md transition-colors shadow-sm">
                            <ArrowRightToLine className="w-3.5 h-3.5" /> Plan for {new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                          </button>
                          <button onClick={() => archiveMasterTask(task.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold rounded-md transition-colors">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Archive
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isBankOpen && <div className="fixed inset-0 bg-black/20 dark:bg-black/60 z-40 backdrop-blur-sm transition-opacity" onClick={() => setIsBankOpen(false)} />}

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <h2 className="text-xl font-bold text-brand-navy dark:text-white">New Task</h2>
              <button onClick={() => { setIsModalOpen(false); resetModal(); }} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddTaskSubmit} className="flex flex-col gap-5 p-6">
              <div className="flex gap-3 items-start">
                <button type="button" onClick={() => setNewTaskPriority(!newTaskPriority)} className="p-1 mt-0.5 hover:scale-110 transition-transform shrink-0" title="Toggle Priority">
                  <Star className={cn("w-6 h-6 transition-colors", newTaskPriority ? "text-brand-sage fill-brand-sage" : "text-zinc-300 dark:text-zinc-700")} />
                </button>
                <div className="flex-1 flex flex-col">
                  <input type="text" value={newTaskText || ""} onChange={(e) => setNewTaskText(e.target.value)} placeholder="What do you need to do?" autoFocus className="w-full text-xl font-semibold bg-transparent border-0 border-b-2 border-transparent focus:border-brand-navy dark:focus:border-brand-navy focus:ring-0 px-1 pb-1 transition-colors text-zinc-900 dark:text-white placeholder:text-zinc-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 col-span-2 sm:col-span-1 focus-within:ring-2 ring-brand-navy/20 relative">
                  <div className="flex items-center gap-2 h-full relative">
                    {(newTaskTagId || isCreatingTag) ? (
                      <button type="button" onClick={() => setIsPaletteOpen(!isPaletteOpen)} className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-black/10 transition-transform hover:scale-110" style={{ backgroundColor: tempTagColor }} title="Change tag color" />
                    ) : (<Tag className="w-4 h-4 text-zinc-400 shrink-0" />)}
                    {isPaletteOpen && (
                      <div className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 flex gap-2 w-max animate-in fade-in zoom-in-95 duration-100">
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
                </div>
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 focus-within:ring-2 ring-brand-navy/20">
                  <CalendarIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input type="date" value={newTaskDate || ""} onChange={e => setNewTaskDate(e.target.value)} className="bg-transparent border-none text-sm outline-none w-full text-zinc-800 dark:text-zinc-200" />
                </div>
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 col-span-2 focus-within:ring-2 ring-brand-navy/20">
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input type="time" value={newTaskTime || ""} onChange={e => setNewTaskTime(e.target.value)} className="bg-transparent border-none text-sm outline-none w-full text-zinc-800 dark:text-zinc-200" />
                </div>
              </div>
              <div className="flex items-start gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-3 focus-within:ring-2 ring-brand-navy/20">
                <AlignLeft className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <textarea rows={3} placeholder="Additional notes..." value={newTaskNotes || ""} onChange={e => setNewTaskNotes(e.target.value)} className="bg-transparent border-none text-sm outline-none w-full resize-none text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400" />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); resetModal(); }} className="px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">Cancel</button>
                <button type="submit" disabled={!newTaskText.trim()} className="px-5 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-8 right-8 w-14 h-14 bg-brand-navy text-white rounded-full shadow-2xl hover:bg-brand-navy/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-40 group">
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Main App */}
      <main className="flex w-full max-w-5xl flex-col bg-white shadow-2xl dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden relative z-10 transition-transform duration-300">

        {/* Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-20">
          <button onClick={goToToday} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-navy dark:text-zinc-300 bg-brand-navy/5 hover:bg-brand-navy/10 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <CalendarDays className="w-4 h-4" /> Today
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => shiftDate(-1)} className="p-2 text-zinc-500 hover:text-brand-navy hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200 select-none min-w-[220px] text-center">{formattedDate}</span>
            <button onClick={() => shiftDate(1)} className="p-2 text-zinc-500 hover:text-brand-navy hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <button onClick={() => setIsBankOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-sage bg-brand-sage/10 hover:bg-brand-sage/20 rounded-full transition-colors">
            <Library className="w-4 h-4" /> Task Bank
            <span className="bg-brand-sage text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{taskBank.length}</span>
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-brand-navy p-6 bg-zinc-50 dark:bg-zinc-900/50 box-border shrink-0">
          <div className="flex flex-col gap-1 z-10">
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy dark:text-white">Stride Planner</h1>
            <div className="flex items-end gap-2 text-xl font-medium text-zinc-700 dark:text-zinc-300 mt-2">
              <span className="text-brand-sage uppercase text-sm font-bold tracking-widest">Date:</span>
              <span className="border-b border-zinc-300 dark:border-zinc-700 pb-0.5 px-2 min-w-[250px] font-serif italic text-2xl">{formattedDate}</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6 bg-white dark:bg-zinc-950 p-4 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 relative z-0 origin-right">
            <div className="flex flex-col text-sm font-medium gap-3">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-brand-navy"></span><span className="text-zinc-600 dark:text-zinc-400">Tasks: {tasksCompleted}/{Math.max(1, tasksArray.length)}</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-brand-sage"></span><span className="text-zinc-600 dark:text-zinc-400">Prior: {prioritiesCompleted}/{Math.max(1, prioritiesArray.length)}</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#475569]"></span><span className="text-zinc-600 dark:text-zinc-400">Goals: {goalsCompleted}/{Math.max(1, goalsArray.length)}</span></div>
            </div>
            <ConcentricRings outerTotal={Math.max(1, tasksArray.length)} outerCompleted={tasksCompleted} innerTotal={Math.max(1, prioritiesArray.length)} innerCompleted={prioritiesCompleted} centerTotal={Math.max(1, goalsArray.length)} centerCompleted={goalsCompleted} className="scale-75 origin-right" />
          </div>
        </div>

        {/* Main Columns */}
        <div className="flex flex-col md:flex-row flex-1 shrink-0">

          {/* Left Column */}
          <div className="flex-[1.2] border-r-2 border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand-navy uppercase tracking-wider border-b-2 border-brand-navy/20 pb-1 w-full shrink-0">To Do's:</h2>
            </div>
            <div className="flex flex-col gap-4 flex-1">
              {tasksArray.map((task) => (
                <div key={task.id} className="flex items-start gap-3 group border-b border-zinc-100 dark:border-zinc-800/50 pb-3 isolate">
                  <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                    <input type="checkbox" checked={task.is_done} onChange={() => toggleDayTaskDone(task.id)} className="peer appearance-none w-5 h-5 border-2 border-brand-navy/30 rounded-md checked:bg-brand-navy checked:border-brand-navy transition-all cursor-pointer" />
                    <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className={cn("text-foreground text-lg transition-all duration-200 select-none leading-tight mt-0.5 cursor-pointer", task.is_done && "line-through text-zinc-400 dark:text-zinc-600")} onClick={() => toggleDayTaskDone(task.id)}>{task.text}</span>
                    {task.time && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 mt-0.5 font-mono">
                        <Clock className="w-3 h-3" />{task.time}
                      </span>
                    )}
                  </div>
                  {renderTagDot(task.tag_id)}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleDayTaskPriority(task.id)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Make Priority"><Star className="w-4 h-4 text-zinc-400 hover:text-brand-sage" /></button>
                    <button onClick={() => removeDayTask(task.id, task.master_id)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Delete from day"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>
                  </div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 9 - tasksArray.length) }).map((_, i) => (
                <div key={`empty-todo-${i}`} className="border-b border-zinc-200 dark:border-zinc-800/50 h-10 w-full" />
              ))}
            </div>

            {/* Meals */}
            <div className="mt-8 border-t-2 border-zinc-200 dark:border-zinc-800 pt-5 flex flex-col gap-4 shrink-0 overflow-visible">
              <h3 className="text-md font-bold text-zinc-600 dark:text-zinc-400 italic mb-1 uppercase tracking-wider">Meals:</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 w-full px-2 overflow-visible">
                {renderMealBlock("B", "Breakfast")}
                {renderMealBlock("L", "Lunch")}
                {renderMealBlock("D", "Dinner")}
                {renderMealBlock("S", "Snack")}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 flex flex-col border-none">

            {/* Priorities */}
            <div className="p-6 border-b-2 border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-brand-sage uppercase tracking-wider mb-4 flex items-center justify-between">
                Priorities:
                <span className="text-xs font-normal text-zinc-400 normal-case bg-brand-sage/10 px-2 py-0.5 rounded-full">Top 5</span>
              </h2>
              <div className="flex flex-col gap-0">
                {prioritiesArray.map((task, idx) => (
                  <div key={task.id} className="flex items-center gap-3 group border-b border-zinc-200 dark:border-zinc-800 py-3 isolate">
                    <span className="font-mono text-lg font-bold text-brand-sage/60 w-6 shrink-0 text-center">{idx + 1}</span>
                    <div className="flex-1 flex flex-col cursor-pointer overflow-hidden" onClick={() => toggleDayTaskDone(task.id)}>
                      <span className={cn("text-foreground text-lg transition-all duration-200 select-none leading-tight truncate", task.is_done && "line-through text-zinc-400 dark:text-zinc-600")}>{task.text}</span>
                      {task.time && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 mt-0.5 font-mono">
                          <Clock className="w-3 h-3" />{task.time}
                        </span>
                      )}
                    </div>
                    {renderTagDot(task.tag_id)}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleDayTaskPriority(task.id)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Remove Priority"><Star className="w-4 h-4 text-brand-sage fill-brand-sage" /></button>
                      <button onClick={() => removeDayTask(task.id, task.master_id)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors shrink-0" title="Delete from day"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>
                    </div>
                    <div className="relative flex items-center justify-center shrink-0 ml-2">
                      <input type="checkbox" checked={task.is_done} onChange={() => toggleDayTaskDone(task.id)} className="peer appearance-none w-5 h-5 border-2 border-brand-sage/40 rounded-full checked:bg-brand-sage checked:border-brand-sage transition-all cursor-pointer" />
                      <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 5 - prioritiesArray.length) }).map((_, i) => (
                  <div key={`empty-prior-${i}`} className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 py-3">
                    <span className="font-mono text-lg font-bold text-brand-sage/30 w-6 shrink-0 text-center">{prioritiesArray.length + i + 1}</span>
                    <div className="flex-1"></div>
                    <div className="w-5 h-5 border-2 border-brand-sage/10 rounded-full shrink-0"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div className="p-6 flex-1 flex flex-col gap-2 min-h-[300px]">
              <h3 className="text-md font-bold text-zinc-600 dark:text-zinc-400 italic mb-2 border-b border-zinc-200 dark:border-zinc-800/50 pb-2 flex justify-between uppercase tracking-wider">
                Goals: <Tag className="w-4 h-4 text-zinc-300" />
              </h3>
              <div className="flex flex-col gap-3">
                {goalsArray.length === 0 ? (
                  <div className="text-sm text-zinc-400 italic">No tasks tagged as Goals today.</div>
                ) : (
                  goalsArray.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 group isolate">
                      <div className="relative flex items-center justify-center shrink-0">
                        <input type="checkbox" checked={task.is_done} onChange={() => toggleDayTaskDone(task.id)} className="peer appearance-none w-4 h-4 border-2 border-zinc-300 dark:border-zinc-700 rounded-sm checked:bg-zinc-400 checked:border-zinc-400 transition-all cursor-pointer" />
                        <svg className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className={cn("text-base transition-all flex-1 cursor-pointer", task.is_done ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-300")} onClick={() => toggleDayTaskDone(task.id)}>{task.text}</span>
                      <button onClick={() => removeDayTask(task.id, task.master_id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>
                    </div>
                  ))
                )}
              </div>
              {Array.from({ length: Math.max(0, 5 - goalsArray.length) }).map((_, i) => (
                <div key={`empty-goal-${i}`} className="border-b border-zinc-200 dark:border-zinc-800/50 h-8 w-full mt-2" />
              ))}
            </div>

            {/* Health & Habits */}
            <div className="p-6 border-t-2 border-zinc-200 dark:border-zinc-800 flex flex-col gap-4">
              <h3 className="text-md font-bold text-zinc-600 dark:text-zinc-400 italic mb-2 uppercase tracking-wider">Health & Habits:</h3>
              <div className="flex flex-col gap-5">

                {/* ── Water Tracker ── */}
                <div className="flex items-center gap-4 group">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 shrink-0">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Water</span>
                      {/* ── HYDRATED BADGE: shows when all 8 droplets are filled ── */}
                      {waterGoalMet && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#475569] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 animate-in fade-in zoom-in duration-300">
                          <CheckCircle2 className="w-3 h-3 text-[#475569]" /> Hydrated
                        </div>
                      )}
                    </div>
                    {/* ── HYDRATED GLOW: subtle ring around droplets when goal met ── */}
                    <div className={cn(
                      "flex gap-1 rounded-lg p-1 transition-all duration-500",
                      waterGoalMet && "shadow-[0_0_12px_3px_rgba(71,85,105,0.25)] bg-slate-50 dark:bg-slate-900/30"
                    )}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <button
                          key={`water-${i}`}
                          onClick={() => toggleDayWater(i)}
                          className={cn(
                            "w-6 h-8 rounded-full border-2 transition-all duration-300",
                            i < dayData.water
                              ? "bg-blue-500 border-blue-500 scale-100 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                              : "border-blue-200 dark:border-blue-900/50 bg-transparent hover:border-blue-400 scale-95"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Steps Counter ── */}
                <div className="flex items-center gap-4 group">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-500 shrink-0">
                    <Footprints className="w-4 h-4" />
                  </div>
                  <div className="flex-1 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Steps</span>
                      {/* ── GOAL MET BADGE: slate-blue ribbon style ── */}
                      {stepsGoalMet && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#475569] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 animate-in fade-in zoom-in duration-300">
                          <CheckCircle2 className="w-3 h-3 text-[#475569]" /> Goal Met
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="text"
                        value={dayData.steps || ""}
                        onChange={e => setDaySteps(e.target.value)}
                        placeholder="0"
                        className="w-16 text-right bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-zinc-800 dark:text-zinc-200 outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-1"
                      />
                      <span className="text-sm font-medium text-zinc-400">/</span>
                      <input
                        type="text"
                        value={dayData.step_goal || "10000"}
                        onChange={e => setDayStepGoal(e.target.value)}
                        placeholder="10000"
                        className="w-16 text-left bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-zinc-400 outline-none hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-1 transition-colors"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <div className="border-t-4 border-brand-navy flex flex-col bg-zinc-50 dark:bg-zinc-900/30 shrink-0">
          <div className="flex flex-col flex-1">
            <div className="p-6 pb-2 border-b-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 group">
              <h2 className="text-md font-bold text-brand-navy uppercase tracking-widest flex items-center gap-2">
                <AlignLeft className="w-4 h-4" /> Smart Notes
              </h2>
              <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button onClick={() => insertNoteFormatting("• ")} className="p-1.5 text-zinc-500 hover:text-brand-navy hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Insert Bullet"><List className="w-4 h-4" /></button>
                <button onClick={() => insertNoteFormatting("1. ")} className="p-1.5 text-zinc-500 hover:text-brand-navy hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Insert Numbered List"><ListOrdered className="w-4 h-4" /></button>
              </div>
            </div>
            <textarea
              ref={notesRef}
              rows={6}
              style={{ height: "auto", overflow: "hidden" }}
              onInput={(e) => {
                const ta = e.currentTarget;
                ta.style.height = "auto";
                ta.style.height = ta.scrollHeight + "px";
              }}
              className="w-full p-6 bg-transparent resize-none outline-none text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 font-serif leading-relaxed border-none focus:ring-0"
              placeholder={"Jot down notes here...\n\nTip: Type '1. ' then Tab to indent → letter\nShift+Tab to outdent back → number"}
              value={dayData.notes || ""}
              onChange={(e) => setDayNotes(e.target.value)}
              onKeyDown={handleNotesKeyDown}
            />
          </div>
        </div>

      </main>
    </div>
  );
}
