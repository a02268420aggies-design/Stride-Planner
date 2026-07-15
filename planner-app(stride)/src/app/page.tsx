"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ConcentricRings } from "@/components/ConcentricRings";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Star, Library, Plus, ArrowRightToLine, CheckCircle2, X, Trash2, Tag, Clock, Calendar as CalendarIcon, AlignLeft, Utensils, Edit3, Palette, Droplets, Footprints, Search, Inbox, Filter, List, ListOrdered, CheckSquare, Bell, PackageCheck, RotateCcw, Maximize, Target, LineChart, ShoppingCart, ShoppingBag, Sparkles, FolderUp, GripVertical } from "lucide-react";

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TagItem = { id: string; name: string; color: string; };
type RecurringTask = { id: string; text: string; time?: string; tag_id?: string; is_priority: boolean; is_goal: boolean; daysOfWeek: number[]; endDate?: string; showOnWeek: boolean; showOnMonth: boolean; };
type MasterTask = { id: string; text: string; is_priority: boolean; is_goal?: boolean; tag_id?: string; due_date?: string; dueDate?: string; time?: string; notes?: string; reminderTime?: string; isReminderActive?: boolean; nudgeDate?: string; };
type TaskItem = { id: string; master_id: string; text: string; is_done: boolean; is_priority: boolean; is_goal?: boolean; priority_rank?: number; todo_rank?: number; goal_rank?: number; tag_id?: string; due_date?: string; dueDate?: string; time?: string; notes?: string; reminderTime?: string; isReminderActive?: boolean; huddleDismissed?: boolean; nudgeDate?: string; };
type DeletedTask = MasterTask & { deletedAt: string; };

type MealType = "B" | "L" | "D" | "S";
type MealEntry = { id: string; type: MealType; text: string; };
type MealItem = { id: string; name: string; type: MealType; ingredients: string[]; planCount?: number; };
type GroceryItem = { id: string; name: string; isGhost: boolean; is_bought: boolean; sourceMealId?: string };
type GroceryStoreWeek = { items: GroceryItem[]; dismissedGhosts: string[] };

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

// Returns true if the task has a time, is on today, and that time has passed
const isOverdue = (taskTime: string | undefined, dateKey: string): boolean => {
  if (!taskTime) return false;
  const todayKey = getDateKey(new Date());
  if (dateKey !== todayKey) return false;
  const [hours, minutes] = taskTime.split(":").map(Number);
  const now = new Date();
  return now.getHours() > hours || (now.getHours() === hours && now.getMinutes() > minutes);
};

// Returns true if the task time is within 20 minutes from now (but not yet passed)
const isApproaching = (taskTime: string | undefined, dateKey: string): boolean => {
  if (!taskTime) return false;
  const todayKey = getDateKey(new Date());
  if (dateKey !== todayKey) return false;
  const [hours, minutes] = taskTime.split(":").map(Number);
  const now = new Date();
  const taskMinutes = hours * 60 + minutes;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return taskMinutes > nowMinutes && taskMinutes - nowMinutes <= 20;
};

// ─── Nudge helpers (for Task Bank — uses reminderTime, not tied to a day) ────

// Parse a reminderTime string like "2025-06-14T15:30" or "2025-06-14" into a Date
const parseReminderTime = (rt: string): Date | null => {
  const d = new Date(rt);
  return isNaN(d.getTime()) ? null : d;
};

// True if reminder or nudge is within 24 hours but not yet past
const isNudgeApproaching = (task: MasterTask): boolean => {
  let target: Date | null = null;
  if (task.nudgeDate) target = new Date(task.nudgeDate);
  else if (task.isReminderActive && task.reminderTime) target = parseReminderTime(task.reminderTime);
  
  if (!target || isNaN(target.getTime())) return false;
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
};

// True if reminder or nudge time has passed and task hasn't been scheduled
const isNudgeOverdue = (task: MasterTask): boolean => {
  let target: Date | null = null;
  if (task.nudgeDate) target = new Date(task.nudgeDate);
  else if (task.isReminderActive && task.reminderTime) target = parseReminderTime(task.reminderTime);
  
  if (!target || isNaN(target.getTime())) return false;
  return target.getTime() < new Date().getTime();
};
// ──────────────────────────────────────────────────────────────────────────────

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
const NUMBER_LINE_RE = /^(\s*)(\d+)\.\s/;  // matches "1. " at any indent level
const LETTER_LINE_RE = /^\s*([a-z])\.\s/;
const letterToIndex = (ch: string) => ch.charCodeAt(0) - 97;
const indexToLetter = (i: number) => String.fromCharCode(97 + (i % 26));

function nextNumberAbove(lines: string[]): number {
  let last = 0;
  for (const l of lines) {
    const m = l.match(NUMBER_LINE_RE);
    if (m) last = parseInt(m[2], 10);
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

const getActiveMealCategory = (): MealType => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "B";
  if (hour >= 11 && hour < 15) return "L";
  if (hour >= 15 && hour < 22) return "D";
  return "S";
};

const formatBufferLabel = (rawKey: string): string => {
  if (!rawKey) return "";
  if (rawKey === "BUFFER") return "Buffer";
  if (rawKey.includes("BUFFER_")) {
    const parts = rawKey.split("_");
    const datePart = parts[parts.length - 1];
    const [year, monthStr] = datePart.split(/[-/]/);
    if (year && monthStr) {
      const date = new Date(parseInt(year, 10), parseInt(monthStr, 10) - 1, 1);
      const monthName = date.toLocaleString('default', { month: 'long' });
      return `Buffer ${monthName}, ${year}`;
    }
  }
  return rawKey.substring(5).replace('-', '/');
};

const findTagNameByColor = (colorHex: string, tagsList: TagItem[]): string | null => {
  const match = tagsList.find(t => t.color.toLowerCase() === colorHex.toLowerCase());
  return match ? match.name : null;
};

const SortableListItem = ({ id, className, isDraggingClass, children }: { id: string; className?: string; isDraggingClass?: string; children: React.ReactNode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        className,
        "relative",
        isDragging && (isDraggingClass || "scale-[1.02] shadow-xl bg-white dark:bg-zinc-900 z-[100] border-transparent opacity-90")
      )}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
      >
        <GripVertical className="w-4 h-4 text-zinc-400" />
      </div>
      {children}
    </div>
  );
};


const TaskBankCard = ({
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
}: any) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => { setIsTouchDevice(typeof window !== 'undefined' && (window.matchMedia("(hover: none)").matches || navigator.maxTouchPoints > 0)); }, []);
  const [localPriority, setLocalPriority] = useState(task.is_priority);
  const [pulseColor, setPulseColor] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(aestheticColors[0]);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, right: 0, bottom: 0 });

  const handleTagUpdate = (tagId: string | null) => {
    const color = tagId ? tags.find((t: any) => t.id === tagId)?.color || '#94a3b8' : null;
    if (color) {
      setPulseColor(color);
      setTimeout(() => setPulseColor(null), 800);
    }
    
    setTaskBank((prev: any[]) => prev.map(t => t.id === task.id ? { ...t, tag_id: tagId || undefined } : t));
    
    setDataStore((prev: any) => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        const dayData = next[key];
        if (dayData && dayData.items) {
          next[key] = {
            ...dayData,
            items: dayData.items.map((item: any) => item.master_id === task.id ? { ...item, tag_id: tagId || undefined } : item)
          };
        }
      });
      return next;
    });

    setActiveTagDropdownId(null);
  };

  return (
    <div className={cn(
        "group relative bg-white border dark:bg-zinc-900/50 rounded-xl hover:shadow-md transition-all cursor-grab active:cursor-grabbing overflow-hidden",
      schedulingState === 'success' ? "border-brand-sage bg-brand-sage/10 scale-95 opacity-60 duration-300" :
      schedulingState === 'error' ? "border-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.3)] animate-pulse-opacity" :
      nudgeOverdue
        ? "border-amber-300 dark:border-amber-700 shadow-[0_0_12px_2px_rgba(251,191,36,0.2)] animate-pulse-opacity"
        : nudgeApproaching
        ? "border-amber-200 dark:border-amber-800 shadow-[0_0_8px_1px_rgba(251,191,36,0.15)]"
        : "border-zinc-200 dark:border-zinc-800 hover:border-brand-navy/50"
    )}
    style={pulseColor ? { boxShadow: `0 0 15px 2px ${pulseColor}40`, borderColor: pulseColor } : {}}
    >
            <div className="relative overflow-hidden isolate w-full">
        {isTouchDevice && (
          <div className="absolute inset-y-0 right-0 flex items-stretch bg-zinc-50 dark:bg-zinc-800/50 z-0 rounded-r-xl border-l border-zinc-200 dark:border-zinc-700/50">

           <button onClick={() => setEditingTask(task)} className="px-4 flex items-center justify-center text-zinc-400 hover:text-brand-navy hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border-r border-zinc-200 dark:border-zinc-700/50" title="Edit Task"><Edit3 className="w-5 h-5" /></button>
           <button onClick={() => setLocalPriority(!localPriority)} className="px-4 flex items-center justify-center text-zinc-400 hover:text-brand-sage hover:bg-brand-sage/10 transition-colors border-r border-zinc-200 dark:border-zinc-700/50" title="Toggle Priority"><Star className={cn("w-5 h-5", localPriority && "text-brand-sage fill-brand-sage")} /></button>
           <button onClick={(e) => { 
             const rect = e.currentTarget.getBoundingClientRect();
             setPopoverCoords({ top: rect.top, right: window.innerWidth - rect.right, bottom: rect.bottom });
             setActiveTagDropdownId(activeTagDropdownId === task.id ? null : task.id); 
             setActiveNudgeDropdownId(null); 
           }} className="px-4 flex items-center justify-center text-zinc-400 hover:text-brand-navy hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border-r border-zinc-200 dark:border-zinc-700/50 popover-container" title="Tag Task"><Tag className="w-5 h-5" style={task.tag_id ? { color: tags.find((t: any) => t.id === task.tag_id)?.color || '#94a3b8', fill: tags.find((t: any) => t.id === task.tag_id)?.color || '#94a3b8' } : {}} /></button>
           <button onClick={(e) => { 
             const rect = e.currentTarget.getBoundingClientRect();
             setPopoverCoords({ top: rect.top, right: window.innerWidth - rect.right, bottom: rect.bottom });
             setActiveNudgeDropdownId(activeNudgeDropdownId === task.id ? null : task.id); 
             setActiveTagDropdownId(null); 
           }} className={cn("px-4 flex items-center justify-center transition-colors border-r border-zinc-200 dark:border-zinc-700/50 popover-container", task.nudgeDate || (task.isReminderActive && task.reminderTime) ? "text-brand-sage hover:text-brand-navy bg-brand-sage/10 dark:hover:text-brand-sage/80" : "text-zinc-400 hover:text-brand-navy dark:hover:text-brand-sage hover:bg-brand-navy/5 dark:hover:bg-brand-sage/10")} title="Nudge Task"><Bell className="w-5 h-5" /></button>
           <button onClick={() => archiveMasterTask(task.id)} className="px-4 flex items-center justify-center text-zinc-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border-r border-zinc-200 dark:border-zinc-700/50" title="Archive task"><PackageCheck className="w-5 h-5" /></button>
           <button onClick={() => setTaskBank((prev: any) => prev.filter((t: any) => t.id !== task.id))} className="px-4 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete"><Trash2 className="w-5 h-5" /></button>
        
          </div>
        )}
        <motion.div
          drag="x"
          dragConstraints={{ left: -320, right: 0 }}
          dragElastic={0.1}
          style={{ touchAction: 'pan-y' }}
          className="relative z-10 w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 rounded-xl"
        >

        <div className="w-full shrink-0 snap-center flex flex-col gap-3 p-4 relative">
          <div className="flex items-start gap-3">
            <button onClick={() => setLocalPriority(!localPriority)} className={cn("focus:outline-none shrink-0 mt-0.5 transition-opacity", !localPriority && "opacity-0 group-hover:opacity-100")}>
              <Star className={cn("w-5 h-5 transition-colors", localPriority ? "text-brand-sage fill-brand-sage" : "text-zinc-300 dark:text-zinc-700 hover:text-brand-sage/50")} />
            </button>
            <div className="flex-1 flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span onClick={() => setEditingTask(task)} className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">{task.text}</span>
                {(task.dueDate || task.due_date) && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const dDate = task.dueDate || task.due_date;
                      if (dDate) {
                        setCurrentDate(new Date(dDate + 'T00:00:00'));
                        setViewMode('day');
                        if (closeTaskBank) closeTaskBank();
                      }
                    }}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold tracking-wider rounded border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                    title="Jump to Due Date"
                  >
                    DUE {formatBufferLabel(task.dueDate || task.due_date)}
                  </button>
                )}
              </div>
              {(task.nudgeDate || (task.isReminderActive && task.reminderTime)) && (
                <span className={cn(
                  "flex items-center gap-1 text-[11px] font-medium font-mono mt-0.5",
                  nudgeOverdue ? "text-amber-500" : nudgeApproaching ? "text-amber-400" : "text-brand-sage"
                )}>
                  <Bell className="w-3 h-3" />
                  {task.nudgeDate ? `Nudge: ${new Date(task.nudgeDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : new Date(task.reminderTime!).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            {hasNudge && (
              <Bell className={cn("w-4 h-4 shrink-0 mt-0.5 animate-pulse", nudgeOverdue ? "text-amber-500 fill-amber-400" : "text-amber-400")} />
            )}
          </div>
          <div className="flex items-center justify-between mt-1 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            {schedulingState === 'success' ? (
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-sage text-white text-xs font-bold rounded-md transition-colors shadow-sm whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Scheduled
              </button>
            ) : schedulingState === 'error' ? (
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-md transition-colors shadow-sm whitespace-nowrap">
                <X className="w-3.5 h-3.5 shrink-0" /> Already Scheduled
              </button>
            ) : hasNudge ? (
              <button onClick={() => handleScheduleTask(task, viewMode === 'week' ? (selectedWeekDate !== "BUFFER" ? selectedWeekDate : dateKey) : (viewMode === 'month' && isPeekOpen && peekDate) ? peekDate : (viewMode === 'month' && isMonthlyBufferExpanded) ? `MONTH_BUFFER_${currentMonthKey}` : dateKey, localPriority)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold rounded-md transition-colors shadow-sm">
                <ArrowRightToLine className="w-3.5 h-3.5" /> {(viewMode === 'month' && isPeekOpen && peekDate) ? `Quick Add to ${parseInt((peekDate || "").split('-')[2] || "0", 10)}` : (viewMode === 'month' && isMonthlyBufferExpanded) ? "Quick Add to Buffer" : "Quick Add Today"}
              </button>
            ) : (
              <button onClick={() => handleScheduleTask(task, viewMode === 'week' ? (selectedWeekDate !== "BUFFER" ? selectedWeekDate : "BUFFER") : (viewMode === 'month' && isPeekOpen && peekDate) ? peekDate : (viewMode === 'month' && isMonthlyBufferExpanded) ? `MONTH_BUFFER_${currentMonthKey}` : dateKey, localPriority)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/20 dark:text-brand-navy hover:bg-brand-navy hover:text-white text-xs font-bold rounded-md transition-colors shadow-sm whitespace-nowrap">
                <ArrowRightToLine className="w-3.5 h-3.5 shrink-0" /> {(viewMode === 'month' && isPeekOpen && peekDate) ? `Plan for ${parseInt((peekDate || "").split('-')[2] || "0", 10)}` : (viewMode === 'month' && isMonthlyBufferExpanded) ? "Add to Buffer" : `Plan for ${viewMode === 'week' ? (selectedWeekDate !== "BUFFER" ? new Date(selectedWeekDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }) : "Buffer") : "Today"}`}
              </button>
            )}
            {/* Empty space for desktop tray overlay */}
            <div className="w-8"></div>
          </div>
        </div>
        </motion.div>
      </div>

      {/* Desktop Hover Action Tray */}
      <div className="hidden lg:flex absolute right-4 bottom-3 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-zinc-950/95 pl-2 shadow-sm rounded-md border border-zinc-100 dark:border-zinc-800 p-1 z-[100]">
         <button onClick={() => setEditingTask(task)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Edit Task"><Edit3 className="w-4 h-4 text-zinc-400 hover:text-brand-navy" /></button>
         <button onClick={() => setLocalPriority(!localPriority)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Toggle Priority"><Star className={cn("w-4 h-4 text-zinc-400 hover:text-brand-sage", localPriority && "text-brand-sage fill-brand-sage")} /></button>
         <button 
           onClick={(e) => { 
             const rect = e.currentTarget.getBoundingClientRect();
             setPopoverCoords({ top: rect.top, right: window.innerWidth - rect.right, bottom: rect.bottom });
             setActiveTagDropdownId(activeTagDropdownId === task.id ? null : task.id); 
             setActiveNudgeDropdownId(null); 
           }} 
           className="flex items-center justify-center p-1.5 rounded-md transition-colors hover:bg-brand-navy/5 dark:hover:bg-brand-sage/10 text-zinc-400 hover:text-brand-navy dark:hover:text-brand-sage popover-container" title="Tag Task">
           <Tag className="w-4 h-4" style={task.tag_id ? { color: tags.find((t: any) => t.id === task.tag_id)?.color || '#94a3b8', fill: tags.find((t: any) => t.id === task.tag_id)?.color || '#94a3b8' } : {}} />
         </button>
         <button 
           onClick={(e) => { 
             const rect = e.currentTarget.getBoundingClientRect();
             setPopoverCoords({ top: rect.top, right: window.innerWidth - rect.right, bottom: rect.bottom });
             setActiveNudgeDropdownId(activeNudgeDropdownId === task.id ? null : task.id); 
             setActiveTagDropdownId(null); 
           }} 
           className={cn("flex items-center justify-center p-1.5 rounded-md transition-colors popover-container", task.nudgeDate || (task.isReminderActive && task.reminderTime) ? "text-brand-sage hover:text-brand-navy bg-brand-sage/10 dark:hover:text-brand-sage/80" : "text-zinc-400 hover:text-brand-navy dark:hover:text-brand-sage hover:bg-brand-navy/5 dark:hover:bg-brand-sage/10")} title="Nudge Task">
           <Bell className="w-4 h-4" />
         </button>
         <button onClick={() => archiveMasterTask(task.id)} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors" title="Archive task"><PackageCheck className="w-4 h-4 text-zinc-400 hover:text-green-600" /></button>
         <button onClick={() => setTaskBank((prev: any) => prev.filter((t: any) => t.id !== task.id))} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors shrink-0" title="Delete"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>
      </div>

      {activeTagDropdownId === task.id && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ position: 'fixed', top: popoverCoords.top < window.innerHeight / 2 ? popoverCoords.bottom + 5 : undefined, bottom: popoverCoords.top >= window.innerHeight / 2 ? window.innerHeight - popoverCoords.top + 5 : undefined, right: popoverCoords.right }} 
          className="w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-xl p-2 z-[200] animate-in zoom-in-95 duration-100 flex flex-col gap-2 popover-container"
        >
           <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
             {tags.map((t: any) => (
               <button 
                 key={t.id}
                 onClick={() => handleTagUpdate(t.id)}
                 className="w-full flex items-center gap-2 text-left px-2 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors"
               >
                 <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                 <span className="truncate">{t.name}</span>
               </button>
             ))}
             {task.tag_id && (
               <button 
                 onClick={() => handleTagUpdate(null)}
                 className="w-full text-left px-2 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors mt-1 border-t border-zinc-100 dark:border-zinc-700/50"
               >
                 Clear Tag
               </button>
             )}
           </div>
           <div className="border-t border-zinc-100 dark:border-zinc-700 pt-2 flex flex-col gap-2">
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
           </div>
        </div>,
        document.body
      )}

      {activeNudgeDropdownId === task.id && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ position: 'fixed', top: popoverCoords.top < window.innerHeight / 2 ? popoverCoords.bottom + 5 : undefined, bottom: popoverCoords.top >= window.innerHeight / 2 ? window.innerHeight - popoverCoords.top + 5 : undefined, right: popoverCoords.right }} 
          className="w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-xl p-1 z-[200] animate-in zoom-in-95 duration-100 flex flex-col popover-container"
        >
           <button 
             onClick={() => {
               const d = new Date();
               d.setDate(d.getDate() + 1);
               d.setHours(9, 0, 0, 0);
               setTaskBank((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, nudgeDate: d.toISOString() } : t));
               setActiveNudgeDropdownId(null);
             }}
             className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors border-b border-zinc-100 dark:border-zinc-700/50"
           >
             Tomorrow Morning
           </button>
           <button 
             onClick={() => {
               const d = new Date();
               d.setDate(d.getDate() + 2);
               d.setHours(9, 0, 0, 0);
               setTaskBank((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, nudgeDate: d.toISOString() } : t));
               setActiveNudgeDropdownId(null);
             }}
             className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors border-b border-zinc-100 dark:border-zinc-700/50"
           >
             In 2 Days
           </button>
           <div className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-700/50 flex flex-col gap-1.5">
             <span className="opacity-70">Custom Date:</span>
             <input type="datetime-local" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[11px] outline-none" onChange={(e) => {
               if (e.target.value) {
                 setTaskBank((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, nudgeDate: new Date(e.target.value).toISOString() } : t));
                 setActiveNudgeDropdownId(null);
               }
             }} />
           </div>
           {(task.nudgeDate || (task.isReminderActive && task.reminderTime)) && (
             <button 
               onClick={() => {
                 setTaskBank((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, nudgeDate: undefined, isReminderActive: false, reminderTime: undefined } : t));
                 setActiveNudgeDropdownId(null);
               }}
               className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors border-b border-zinc-100 dark:border-zinc-700/50"
             >
               Clear Nudge
             </button>
           )}
           <button onClick={() => archiveMasterTask(task.id)} className="w-full text-left px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors mt-0.5 flex items-center gap-2">
             <CheckCircle2 className="w-3.5 h-3.5" /> Archive Task
           </button>
        </div>,
        document.body
      )}
    </div>
  );
};
const EditTaskModal = ({ task, tags, onSave, onClose }: { task: MasterTask, tags: TagItem[], onSave: (t: MasterTask) => void, onClose: () => void }) => {
  const [text, setText] = useState(task.text);
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
};


export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('priorities');
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    setIsTouchDevice(typeof window !== 'undefined' && (window.matchMedia("(hover: none)").matches || navigator.maxTouchPoints > 0));
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const router = useRouter();
  const [isPulsingToday, setIsPulsingToday] = useState(false);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isMonthlyBufferExpanded, setIsMonthlyBufferExpanded] = useState(false);
  const [isMonthlyHorizonExpanded, setIsMonthlyHorizonExpanded] = useState(true);
  const [activeNudgeDropdownId, setActiveNudgeDropdownId] = useState<string | null>(null);
  const [activeTagDropdownId, setActiveTagDropdownId] = useState<string | null>(null);
  const [schedulingStates, setSchedulingStates] = useState<Record<string, 'success' | 'error'>>({});
  const [editingTask, setEditingTask] = useState<MasterTask | null>(null);

  const handleSaveEditedTask = (updatedTask: MasterTask) => {
    setTaskBank((prev) => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    setDataStore((prev) => {
      const next = { ...prev };
      
      const oldMasterTask = taskBank.find(t => t.id === updatedTask.id);
      const oldDate = oldMasterTask?.due_date || oldMasterTask?.dueDate;
      const newDate = updatedTask.due_date || updatedTask.dueDate;
      
      let itemToMigrate: TaskItem | null = null;
      
      if (oldDate !== newDate) {
         Object.keys(next).forEach(key => {
           if (next[key] && next[key].items) {
             const idx = next[key].items.findIndex((item: any) => item.master_id === updatedTask.id);
             if (idx !== -1) {
                itemToMigrate = { ...next[key].items[idx] };
                next[key] = { ...next[key], items: next[key].items.filter((_, i) => i !== idx) };
             }
           }
         });
         
         if (itemToMigrate) {
            const destKey = newDate || "BUFFER";
            if (!next[destKey]) next[destKey] = getEmptyDay();
            next[destKey] = {
              ...next[destKey],
              items: [...next[destKey].items, itemToMigrate]
            };
         }
      }
      
      Object.keys(next).forEach(key => {
        if (next[key] && next[key].items) {
          next[key] = {
            ...next[key],
            items: next[key].items.map((item: any) => {
              if (item.master_id === updatedTask.id) {
                 return {
                   ...item,
                   text: updatedTask.text,
                   tag_id: updatedTask.tag_id,
                   due_date: updatedTask.due_date,
                   dueDate: updatedTask.dueDate,
                   nudgeDate: updatedTask.nudgeDate,
                   reminderTime: updatedTask.reminderTime,
                   isReminderActive: updatedTask.isReminderActive
                 };
              }
              return item;
            })
          };
        }
      });
      
      return next;
    });
    
    setEditingTask(null);
  };

  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>(() => {
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
  // Recurring Dispatch Engine State
  const [recurringModalTask, setRecurringModalTask] = useState<any>(null);
  const [recurringDays, setRecurringDays] = useState<number[]>([]); // 0 = Sun, 1 = Mon ...
  const [recurringWeeks, setRecurringWeeks] = useState<number>(4);
  const [dispatchToast, setDispatchToast] = useState<string | null>(null);
  const [pulsedDates, setPulsedDates] = useState<string[]>([]);
  const [migratedDate, setMigratedDate] = useState<string | null>(null);
  const [migrationToast, setMigrationToast] = useState<string | null>(null);

  const handlePriorityDragEnd = (event: DragEndEvent, dateKey: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDataStore((prev: any) => {
      const dayData = prev[dateKey];
      if (!dayData || !dayData.items) return prev;
      
      const goalsTagId = tags.find((t: any) => t.name.toLowerCase() === "goals")?.id;
      const rawPriorities = dayData.items.filter((t: any) => t.is_priority && t.tag_id !== goalsTagId);
      
      let unranked = rawPriorities.filter((t: any) => t.priority_rank === undefined);
      const computedSlots = Array.from({ length: 5 }).map((_, i) => {
        const explicit = rawPriorities.find((t: any) => t.priority_rank === i);
        if (explicit) return explicit;
        if (unranked.length > 0) return unranked.shift();
        return { id: `empty-slot-${i}`, is_empty: true };
      });
      
      const oldIndex = computedSlots.findIndex((t: any) => t.id === active.id);
      const newIndex = computedSlots.findIndex((t: any) => t.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      const newSlots = arrayMove(computedSlots, oldIndex, newIndex);
      const newPriorities = newSlots.map((t: any, i: number) => t.is_empty ? null : { ...t, priority_rank: i }).filter(Boolean);
      const otherItems = dayData.items.filter((t: any) => !(t.is_priority && t.tag_id !== goalsTagId));
      
      return {
        ...prev,
        [dateKey]: {
          ...dayData,
          items: [...newPriorities, ...otherItems]
        }
      };
    });
  };

  const handleTodoDragEnd = (event: DragEndEvent, dateKey: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDataStore((prev: any) => {
      const dayData = prev[dateKey];
      if (!dayData || !dayData.items) return prev;
      
      const goalsTagId = tags.find((t: any) => t.name.toLowerCase() === "goals")?.id;
      const rawTodos = dayData.items.filter((t: any) => !t.is_priority && t.tag_id !== goalsTagId);
      
      let unranked = rawTodos.filter((t: any) => t.todo_rank === undefined);
      const maxLen = Math.max(9, rawTodos.length);
      const computedSlots = Array.from({ length: maxLen }).map((_, i) => {
        const explicit = rawTodos.find((t: any) => t.todo_rank === i);
        if (explicit) return explicit;
        if (unranked.length > 0) return unranked.shift();
        return { id: `empty-todo-slot-${i}`, is_empty: true };
      });
      
      const oldIndex = computedSlots.findIndex((t: any) => t.id === active.id);
      const newIndex = computedSlots.findIndex((t: any) => t.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      const newSlots = arrayMove(computedSlots, oldIndex, newIndex);
      const newTodos = newSlots.map((t: any, i: number) => t.is_empty ? null : { ...t, todo_rank: i }).filter(Boolean);
      const otherItems = dayData.items.filter((t: any) => t.is_priority || t.tag_id === goalsTagId);
      
      return {
        ...prev,
        [dateKey]: {
          ...dayData,
          items: [...newTodos, ...otherItems]
        }
      };
    });
  };

  const handleGoalDragEnd = (event: DragEndEvent, dateKey: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDataStore((prev: any) => {
      const dayData = prev[dateKey];
      if (!dayData || !dayData.items) return prev;
      
      const goalsTagId = tags.find((t: any) => t.name.toLowerCase() === "goals")?.id;
      const rawGoals = dayData.items.filter((t: any) => t.tag_id === goalsTagId);
      
      let unranked = rawGoals.filter((t: any) => t.goal_rank === undefined);
      const maxLen = Math.max(5, rawGoals.length);
      const computedSlots = Array.from({ length: maxLen }).map((_, i) => {
        const explicit = rawGoals.find((t: any) => t.goal_rank === i);
        if (explicit) return explicit;
        if (unranked.length > 0) return unranked.shift();
        return { id: `empty-goal-slot-${i}`, is_empty: true };
      });
      
      const oldIndex = computedSlots.findIndex((t: any) => t.id === active.id);
      const newIndex = computedSlots.findIndex((t: any) => t.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      const newSlots = arrayMove(computedSlots, oldIndex, newIndex);
      const newGoals = newSlots.map((t: any, i: number) => t.is_empty ? null : { ...t, goal_rank: i }).filter(Boolean);
      const otherItems = dayData.items.filter((t: any) => t.tag_id !== goalsTagId);
      
      return {
        ...prev,
        [dateKey]: {
          ...dayData,
          items: [...newGoals, ...otherItems]
        }
      };
    });
  };

  useEffect(() => setHasMounted(true), []);

  // Re-render every minute so overdue/approaching colors update without a refresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Global Outside Click Listener for Popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest?.('.popover-container')) {
        setActiveTagDropdownId(null);
        setActiveNudgeDropdownId(null);
      }
    };
    if (activeTagDropdownId || activeNudgeDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTagDropdownId, activeNudgeDropdownId]);

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const dateKey = getDateKey(currentDate);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  // Weekly Drill-down State
  const [drilledFromMonth, setDrilledFromMonth] = useState(false);
  const monthContainerRef = useRef<HTMLDivElement>(null);
  const monthScrollRef = useRef<number>(0);

  useEffect(() => {
    if (viewMode === 'month' && monthContainerRef.current) {
      monthContainerRef.current.scrollTop = monthScrollRef.current;
    }
    if (viewMode !== 'week' && viewMode !== 'month') {
      setDrilledFromMonth(false);
    }
  }, [viewMode]);
  
  // Weekly Strategic Context State
  const [expandedDays, setExpandedDays] = useState<string[]>([dateKey]);
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(dateKey);
  
  // Weekly In-Line Add State
  const [activeInlineCol, setActiveInlineCol] = useState<string | null>(null);
  const [inlineText, setInlineText] = useState("");
  const [inlineTagId, setInlineTagId] = useState("");
  const [inlineTime, setInlineTime] = useState("");
  const [inlineNotes, setInlineNotes] = useState("");
  const [inlinePriority, setInlinePriority] = useState(false);
  const [inlineReminderTime, setInlineReminderTime] = useState("");
  const [inlineReminderActive, setInlineReminderActive] = useState(false);

  const [dailyGoalText, setDailyGoalText] = useState("");
  const [isDailyGoalFocused, setIsDailyGoalFocused] = useState(false);

  // Peek interaction
  const [isPeekOpen, setIsPeekOpen] = useState(false);
  const [peekDate, setPeekDate] = useState<string | null>(null);

  // Monthly Insights
  const [insightsViewMode, setInsightsViewMode] = useState<'weekly' | 'monthly'>('weekly');

  const getWeekDates = (baseDate: Date) => {
    const dates: string[] = [];
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      dates.push(getDateKey(current));
    }
    return dates;
  };
  const weekDateKeys = getWeekDates(currentDate);

  const getMonthDateKeys = (baseDate: Date) => {
    const dates: string[] = [];
    const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    // Adjust to Monday-start week
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const endOffset = lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay();

    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startOffset);

    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + endOffset);

    let current = new Date(startDate);
    while (current <= endDate) {
      dates.push(getDateKey(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };
  const monthDateKeys = getMonthDateKeys(currentDate);
  const currentMonthKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

  const [isMorningHuddleOpen, setIsMorningHuddleOpen] = useState(false);
  const [isHuddleComplete, setIsHuddleComplete] = useState(false);
  const [isMonthlyReviewOpen, setIsMonthlyReviewOpen] = useState(false);
  const [monthlyReviewTasks, setMonthlyReviewTasks] = useState<TaskItem[]>([]);
  const [previousMonthKeyReview, setPreviousMonthKeyReview] = useState("");
  const [isSundayResetOpen, setIsSundayResetOpen] = useState(false);
  const [sundayResetStep, setSundayResetStep] = useState<1 | 2 | 3 | 4>(1);
  const [weeklyJournal, setWeeklyJournal] = useState<Record<string, { takeaway: string, proud: string }>>(() => {
    try {
      const saved = localStorage.getItem('stride-weekly-journal');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [monthlyMilestones, setMonthlyMilestones] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('stride-monthly-milestones');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const milestoneRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSaveMilestones = () => {
    // Intended for future explicit api saves (e.g. Supabase), 
    // current local storage handles auto-save via useEffect.
  };

  useEffect(() => {
    try { localStorage.setItem('stride-weekly-journal', JSON.stringify(weeklyJournal)); } catch {}
  }, [weeklyJournal]);

  const [tags, setTags] = useState<TagItem[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem('stride-tags');
        if (saved) return JSON.parse(saved);
      }
      return defaultTags;
    } catch { return defaultTags; }
  });

  useEffect(() => {
    try { localStorage.setItem('stride-tags', JSON.stringify(tags)); } catch {}
  }, [tags]);

  useEffect(() => {
    try { localStorage.setItem('stride-monthly-milestones', JSON.stringify(monthlyMilestones)); } catch {}
  }, [monthlyMilestones]);

  const [animatingBufferId, setAnimatingBufferId] = useState<string | null>(null);
  const [huddleYesterdayItems, setHuddleYesterdayItems] = useState<TaskItem[]>([]);
  const [huddleBufferItems, setHuddleBufferItems] = useState<TaskItem[]>([]);

  const [taskBank, setTaskBank] = useState<MasterTask[]>(() => {
    try {
      const saved = localStorage.getItem('stride-task-bank');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isShoppingMode, setIsShoppingMode] = useState(false);

  const [mealBank, setMealBank] = useState<MealItem[]>(() => {
    try {
      const saved = localStorage.getItem('stride-meal-bank');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [groceryStore, setGroceryStore] = useState<Record<string, GroceryStoreWeek>>(() => {
    try {
      const saved = localStorage.getItem('stride-grocery-store');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem('stride-meal-bank', JSON.stringify(mealBank)); } catch {}
  }, [mealBank]);

  useEffect(() => {
    try { localStorage.setItem('stride-grocery-store', JSON.stringify(groceryStore)); } catch {}
  }, [groceryStore]);

  const [expandedHeaders, setExpandedHeaders] = useState<string[]>([]);
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [bankActiveTab, setBankActiveTab] = useState<'tasks' | 'routines'>('tasks');
  const [newMealName, setNewMealName] = useState("");
  const [newMealType, setNewMealType] = useState<MealType>("D");
  const [newMealIngs, setNewMealIngs] = useState("");
  const [newGroceryName, setNewGroceryName] = useState("");
  const mealIngRef = useRef<HTMLInputElement>(null);
  const [mealSearchQuery, setMealSearchQuery] = useState("");
  const [mealFilterType, setMealFilterType] = useState<MealType | "ALL">("ALL");
  const [bankFilterTagId, setBankFilterTagId] = useState<string>("ALL");
  const [mealFocusedIndex, setMealFocusedIndex] = useState(-1);
  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>(() => {
    try {
      const saved = localStorage.getItem('stride-deleted-tasks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const closeTaskBank = () => {
    setIsBankOpen(false);
    setTimeout(() => {
      setExpandedHeaders([]);
      setBankSearchQuery("");
      setMealSearchQuery("");
      setMealFilterType("ALL");
      setBankFilterTagId("ALL");
    }, 300);
  };

  const handleDispatchRecurring = () => {
    if (!recurringModalTask || recurringDays.length === 0) return;
    
    let count = 0;
    const now = new Date();
    now.setHours(0,0,0,0);
    const targetDates: string[] = [];
    
    setDataStore(prev => {
      const next = { ...prev };
      for (let w = 0; w < recurringWeeks; w++) {
        for (let d = 0; d < 7; d++) {
          const iterDate = new Date(now);
          iterDate.setDate(now.getDate() + (w * 7) + d);
          
          if (recurringDays.includes(iterDate.getDay())) {
            const dateKeyStr = getDateKey(iterDate);
            const dayStore = next[dateKeyStr] || { items: [], meals: [], water: 0, steps: "", step_goal: "10000", notes: "" };
            
            // Check for duplicates
            const exists = dayStore.items.some((i: TaskItem) => i.master_id === recurringModalTask.id);
            if (!exists) {
              const newTask: TaskItem = {
                ...recurringModalTask,
                id: `t_${Date.now()}_${Math.random()}`,
                master_id: recurringModalTask.id,
                is_done: false,
                is_priority: recurringModalTask.is_priority,
                due_date: dateKeyStr,
              };
              next[dateKeyStr] = { ...dayStore, items: [...dayStore.items, newTask] };
              count++;
              targetDates.push(dateKeyStr);
            }
          }
        }
      }
      return next;
    });
    
    setDispatchToast(`Dispatched to ${count} days.`);
    setTimeout(() => setDispatchToast(null), 3000);
    setPulsedDates(targetDates);
    setTimeout(() => setPulsedDates([]), 1500);
    setRecurringModalTask(null);
  };

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
  const [newTaskIsGoal, setNewTaskIsGoal] = useState(false);
  const [newTaskReminderTime, setNewTaskReminderTime] = useState("");
  const [newTaskReminderActive, setNewTaskReminderActive] = useState(false);
  const [newTaskIsRecurring, setNewTaskIsRecurring] = useState(false);
  const [newTaskRecurringDays, setNewTaskRecurringDays] = useState<number[]>([]);
  const [newTaskRecurringEnd, setNewTaskRecurringEnd] = useState("");
  const [newTaskShowOnWeek, setNewTaskShowOnWeek] = useState(false);
  const [newTaskShowOnMonth, setNewTaskShowOnMonth] = useState(false);

  const [waterJustCompleted, setWaterJustCompleted] = useState(false);
  const [archivedFlashId, setArchivedFlashId] = useState<string | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setIsPaletteOpen(false);
      }
    };
    if (isPaletteOpen) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isPaletteOpen]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [tempTagColor, setTempTagColor] = useState(aestheticColors[0]);

  const tagsById = tags.reduce((acc, tag) => ({ ...acc, [tag.id]: tag }), {} as Record<string, TagItem>);
  const goalsTagId = tags.find(t => t.name.toLowerCase() === "goals")?.id;

  const [dismissedGhosts, setDismissedGhosts] = useState<Record<string, string[]>>({});

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

  // ─── Task Bank Scroll Isolation ──────────────────────────────────────────
  useEffect(() => {
    if (isBankOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isBankOpen]);

  useEffect(() => {
    try { localStorage.setItem('stride-deleted-tasks', JSON.stringify(deletedTasks)); } catch {}
  }, [deletedTasks]);

  const [weeklyGoals, setWeeklyGoals] = useState<Record<string, [string, string, string]>>(() => {
    try {
      const saved = localStorage.getItem('stride-weekly-goals');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  
  const [weeklyGoalHits, setWeeklyGoalHits] = useState<Record<string, [number, number, number]>>(() => {
    try {
      const saved = localStorage.getItem('stride-weekly-goal-hits');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem('stride-weekly-goals', JSON.stringify(weeklyGoals)); } catch {}
  }, [weeklyGoals]);

  useEffect(() => {
    try { localStorage.setItem('stride-weekly-goal-hits', JSON.stringify(weeklyGoalHits)); } catch {}
  }, [weeklyGoalHits]);

  // ─── 7-day cleanup: permanently remove soft-deleted tasks older than 7 days ──
  useEffect(() => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    setDeletedTasks(prev => prev.filter(t => Date.now() - new Date(t.deletedAt).getTime() < SEVEN_DAYS_MS));
  }, []); // runs once on mount
  // ──────────────────────────────────────────────────────────────────────────

  // --- Data Aggregation for Grocery List ---
  const currentWeekKey = weekDateKeys[0] || "ERROR_NO_WEEK";
  const currentGroceryList = useMemo(() => {
    const weekStore = groceryStore[currentWeekKey] || { items: [], dismissedGhosts: [] };
    const solidItems = weekStore.items || [];
    const dismissed = weekStore.dismissedGhosts || [];
    
    // 1. Map all meals in the mealBank to expand ingredients into Ghost suggestions
    const ghostCandidates = new Map<string, string>(); // lowercase name -> original name
    mealBank.forEach(meal => {
      if (meal && meal.ingredients) {
        meal.ingredients.forEach(ing => {
          const ingName = ing.trim();
          if (ingName && !dismissed.includes(ingName.toLowerCase())) {
            ghostCandidates.set(ingName.toLowerCase(), ingName);
          }
        });
      }
    });

    // 2. Remove ghosts that already exist in solidItems
    solidItems.forEach(si => {
      ghostCandidates.delete(si.name.toLowerCase());
    });

    // 3. Construct un-solidified Ghost objects
    const ghosts: GroceryItem[] = Array.from(ghostCandidates.values()).map(ingName => ({
      id: `ghost_${ingName}`,
      name: ingName,
      isGhost: true,
      is_bought: false
    }));

    const combined = [...solidItems, ...ghosts];
    if (isShoppingMode) {
      return combined.filter(t => !t.isGhost);
    }
    return combined;
  }, [groceryStore, currentWeekKey, mealBank, isShoppingMode]);

  // --- Data Aggregation for Insights ---
  const insightsData = useMemo(() => {
    if (!showInsights && !isSundayResetOpen) return null;

    const activeKeys = insightsViewMode === 'monthly' ? monthDateKeys : weekDateKeys;
    const currentDailyRates: number[] = [];
    let totalCompleted = 0;
    let totalTasks = 0;
    let totalCompletedPriorities = 0;
    let totalPriorities = 0;
    const tagCounts: Record<string, number> = {};
    let productiveDay = { date: '', count: -1 };
    let currentStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < activeKeys.length; i++) {
      const dKey = activeKeys[i];
      const items = dataStore[dKey]?.items || [];
      const total = items.length;
      const completed = items.filter(t => t.is_done).length;
      
      if (total > 0) {
        currentDailyRates.push((completed / total) * 100);
      } else {
        currentDailyRates.push(0); 
      }

      totalTasks += total;
      totalCompleted += completed;

      const pItems = items.filter(t => t.is_priority && t.tag_id !== goalsTagId);
      totalPriorities += pItems.length;
      totalCompletedPriorities += pItems.filter(t => t.is_done).length;

      if (completed > productiveDay.count && total > 0) {
        productiveDay = { date: dKey, count: completed };
      }

      if (completed > 0) {
        tempStreak++;
        if (tempStreak > currentStreak) currentStreak = tempStreak;
      } else {
        tempStreak = 0;
      }

      items.filter(t => t.is_done).forEach(t => {
        const tid = t.tag_id || 'untagged';
        tagCounts[tid] = (tagCounts[tid] || 0) + 1;
      });
    }

    const prevDailyRates: number[] = [];
    if (insightsViewMode === 'weekly') {
        const prevWeekKeys: string[] = [];
        const d = new Date(weekDateKeys[0] + 'T00:00:00');
        d.setDate(d.getDate() - 7);
        for (let i = 0; i < 7; i++) {
            const current = new Date(d);
            current.setDate(d.getDate() + i);
            prevWeekKeys.push(getDateKey(current));
        }
        for (let i = 0; i < 7; i++) {
            const dKey = prevWeekKeys[i];
            const items = dataStore[dKey]?.items || [];
            const total = items.length;
            const completed = items.filter(t => t.is_done).length;
            if (total > 0) prevDailyRates.push((completed / total) * 100);
            else prevDailyRates.push(0);
        }
    }

    const priorityHitRate = totalPriorities > 0 ? (totalCompletedPriorities / totalPriorities) * 100 : 0;

    const sortedTags = Object.entries(tagCounts)
      .map(([id, count]) => {
        let name = "Untagged";
        let color = "#cbd5e1"; 
        if (id === goalsTagId) {
          name = "Goals";
          color = "#9C9F84"; 
        } else {
          const tag = tags.find(t => t.id === id);
          if (tag) { name = tag.name; color = tag.color; }
        }
        return { id, name, color, count };
      })
      .sort((a,b) => b.count - a.count);

    return {
      currentDailyRates,
      prevDailyRates,
      productiveDay,
      currentStreak,
      priorityHitRate,
      sortedTags,
      totalCompleted
    };
  }, [showInsights, isSundayResetOpen, insightsViewMode, weekDateKeys, monthDateKeys, dataStore, tags, goalsTagId]);

  // ─── Grocery Interactions ──────────────────────────────────
  const solidifyGhost = (ghostName: string) => {
    setGroceryStore(prev => {
      const weekStore = prev[currentWeekKey] || { items: [], dismissedGhosts: [] };
      const newItem: GroceryItem = { id: `gro_${Date.now()}_${Math.random()}`, name: ghostName, isGhost: false, is_bought: false };
      return { ...prev, [currentWeekKey]: { ...weekStore, items: [...weekStore.items, newItem] } };
    });
  };

  const toggleGroceryBought = (id: string) => {
    setGroceryStore(prev => {
      const weekStore = prev[currentWeekKey] || { items: [], dismissedGhosts: [] };
      return {
        ...prev,
        [currentWeekKey]: { ...weekStore, items: weekStore.items.map(t => t.id === id ? { ...t, is_bought: !t.is_bought } : t) }
      };
    });
  };

  const dismissGhost = (ghostName: string) => {
    setGroceryStore(prev => {
      const weekStore = prev[currentWeekKey] || { items: [], dismissedGhosts: [] };
      return {
        ...prev,
        [currentWeekKey]: { ...weekStore, dismissedGhosts: [...weekStore.dismissedGhosts, ghostName.toLowerCase()] }
      };
    });
  };

  const addSolidGrocery = (name: string) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    setGroceryStore(prev => {
      const weekStore = prev[currentWeekKey] || { items: [], dismissedGhosts: [] };
      
      // Prevent explicit identical solid duplication
      if (weekStore.items.some(i => i.name.toLowerCase() === cleanName.toLowerCase())) {
         return prev; // already solid!
      }

      const newItem: GroceryItem = { id: `gro_${Date.now()}_${Math.random()}`, name: cleanName, isGhost: false, is_bought: false };
      // Prepend so new items strictly format to the very top in descending chronological order
      return { ...prev, [currentWeekKey]: { ...weekStore, items: [newItem, ...weekStore.items] } };
    });
  };

  const clearBoughtGroceries = () => {
    setGroceryStore(prev => {
      const weekStore = prev[currentWeekKey] || { items: [], dismissedGhosts: [] };
      return {
        ...prev,
        [currentWeekKey]: { ...weekStore, items: weekStore.items.filter(t => !t.is_bought) }
      };
    });
  };

  // ─── Sunday Reset Execution Hooks ──────────────────────────────────
  const finishSundayReset = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#9C9F84", "#1E293B", "#d97706"] });
    setTimeout(() => {
      setIsSundayResetOpen(false);
      setSundayResetStep(1);
      const nextMonday = new Date(currentDate);
      nextMonday.setDate(nextMonday.getDate() + 1);
      setCurrentDate(nextMonday);
    }, 1200);
  };

  const moveGroceryToNextWeek = (item: GroceryItem) => {
    const nextMonday = new Date(currentDate);
    nextMonday.setDate(nextMonday.getDate() + 1);
    const nextWeekKeys = getWeekDates(nextMonday);
    const nextWeekKey = nextWeekKeys[0];

    setGroceryStore(prev => {
      const currentWeekStore = prev[currentWeekKey] || { items: [], dismissedGhosts: [] };
      const nextWeekStore = prev[nextWeekKey] || { items: [], dismissedGhosts: [] };

      return {
        ...prev,
        [currentWeekKey]: { ...currentWeekStore, items: currentWeekStore.items.filter(i => i.id !== item.id) },
        [nextWeekKey]: { ...nextWeekStore, items: [item, ...nextWeekStore.items] }
      };
    });
  };

  const discardGroceryFromReset = (id: string) => {
    setGroceryStore(prev => {
      const weekStore = prev[currentWeekKey] || { items: [], dismissedGhosts: [] };
      return { ...prev, [currentWeekKey]: { ...weekStore, items: weekStore.items.filter(t => t.id !== id) } };
    });
  };

  const moveBufferTaskToMonday = (task: TaskItem) => {
    const nextMonday = new Date(currentDate);
    nextMonday.setDate(nextMonday.getDate() + 1);
    const nextMondayKey = getDateKey(nextMonday);

    setDataStore(prev => {
      const bdBuf = prev["BUFFER"] || getEmptyDay();
      const nItems = bdBuf.items.filter(t => t.id !== task.id);
      
      const monDay = prev[nextMondayKey] || getEmptyDay();
      const finalTask = { ...task, due_date: nextMondayKey };
      const monItems = [...monDay.items, finalTask];

      return { ...prev, "BUFFER": { ...bdBuf, items: nItems }, [nextMondayKey]: { ...monDay, items: monItems } };
    });
  };

  const returnBufferTaskToBank = (taskId: string) => {
    setDataStore(prev => {
      const bdBuf = prev["BUFFER"] || getEmptyDay();
      return { ...prev, "BUFFER": { ...bdBuf, items: bdBuf.items.filter(t => t.id !== taskId) } };
    });
  };

  // ─── Morning Huddle: Unified Launch Modal ──────────────────────────────────
  useEffect(() => {
    try {
      if (Object.keys(dataStore).length === 0) return; // Wait until datastore loads
      const savedLastOpenedDate = localStorage.getItem('stride-last-opened-date');
      const todayKey = getDateKey(new Date());

      if (savedLastOpenedDate !== todayKey) {
        // First open of a new day
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = getDateKey(yesterday);
        
        const yesterdayData = dataStore[yesterdayKey];
        const bufferData = dataStore["BUFFER"];
        
        let hasLeftovers = false;
        if (yesterdayData && yesterdayData.items.length > 0) {
          const incomplete = yesterdayData.items.filter(t => !t.is_done && !t.huddleDismissed);
          if (incomplete.length > 0) {
            setHuddleYesterdayItems(incomplete);
            hasLeftovers = true;
          }
        }
        
        let hasBuffer = false;
        if (bufferData && bufferData.items.length > 0) {
          const bufferIncomplete = bufferData.items.filter(t => !t.is_done && !t.huddleDismissed);
          if (bufferIncomplete.length > 0) {
            setHuddleBufferItems(bufferIncomplete);
            hasBuffer = true;
          }
        }

        if (hasLeftovers || hasBuffer) {
          setIsMorningHuddleOpen(true);
        } else {
          // If nothing to show, directly save today to avoid checking again
          localStorage.setItem('stride-last-opened-date', todayKey);
        }
      }
    } catch {}
  }, [dataStore]); // Depends on dataStore to ensure it has loaded before checking
  // ──────────────────────────────────────────────────────────────────────────

  // ─── Monthly Overflow / Clean Up ─────────────────────────────────────────
  useEffect(() => {
    try {
      if (Object.keys(dataStore).length === 0) return; 
      const savedLastOpenedMonth = localStorage.getItem('stride-last-opened-month');
      const todayDate = new Date();
      const currMonthStr = `${todayDate.getFullYear()}-${(todayDate.getMonth() + 1).toString().padStart(2, '0')}`;

      if (savedLastOpenedMonth && savedLastOpenedMonth !== currMonthStr) {
        const oldMonthBufferKey = `MONTH_BUFFER_${savedLastOpenedMonth}`;
        const oldBuffer = dataStore[oldMonthBufferKey];
        if (oldBuffer && oldBuffer.items.length > 0) {
           const incomplete = oldBuffer.items.filter(t => !t.is_done);
           if (incomplete.length > 0) {
             setMonthlyReviewTasks(incomplete);
             setPreviousMonthKeyReview(savedLastOpenedMonth);
             setIsMonthlyReviewOpen(true);
             return; 
           }
        }
      }
      if (!isMonthlyReviewOpen) {
         localStorage.setItem('stride-last-opened-month', currMonthStr);
      }
    } catch {}
  }, [dataStore, isMonthlyReviewOpen]);
  
  const checkMonthlyReviewCompletion = (remaining: number) => {
    if (remaining === 0) {
      setTimeout(() => {
        setIsMonthlyReviewOpen(false);
        const todayDate = new Date();
        localStorage.setItem('stride-last-opened-month', `${todayDate.getFullYear()}-${(todayDate.getMonth() + 1).toString().padStart(2, '0')}`);
      }, 500);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const checkHuddleCompletion = (remainingYesterday: number, remainingBuffer: number) => {
    if (remainingYesterday + remainingBuffer === 0) {
      setIsHuddleComplete(true);
      setTimeout(() => {
        setIsMorningHuddleOpen(false);
        localStorage.setItem('stride-last-opened-date', getDateKey(new Date()));
        setTimeout(() => setIsHuddleComplete(false), 500); // reset state cleanly
      }, 1200);
    }
  };

  const dismissTaskFromHuddle = (taskId: string, source: 'yesterday' | 'BUFFER') => {
    let remY = huddleYesterdayItems.length;
    let remB = huddleBufferItems.length;

    if (source === 'yesterday') {
      remY -= 1;
      const d = new Date(); d.setDate(d.getDate() - 1);
      const yStr = getDateKey(d);
      setDataStore(prev => {
        const bd = prev[yStr];
        if (!bd) return prev;
        return { ...prev, [yStr]: { ...bd, items: bd.items.map(t => t.id === taskId ? { ...t, huddleDismissed: true } : t) }};
      });
      setHuddleYesterdayItems(prev => prev.filter(t => t.id !== taskId));
    } else {
      remB -= 1;
      setDataStore(prev => {
        const bd = prev["BUFFER"];
        if (!bd) return prev;
        return { ...prev, "BUFFER": { ...bd, items: bd.items.map(t => t.id === taskId ? { ...t, huddleDismissed: true } : t) }};
      });
      setHuddleBufferItems(prev => prev.filter(t => t.id !== taskId));
    }
    checkHuddleCompletion(remY, remB);
  };

  const moveYesterdayToBuffer = (task: TaskItem) => {
    setAnimatingBufferId(task.id);
    setTimeout(() => {
      let remY = huddleYesterdayItems.length - 1;
      let remB = huddleBufferItems.length; // UI buffer state visually remains exactly identical while the app transitions the object to pure store.
      
      const d = new Date(); d.setDate(d.getDate() - 1);
      const yStr = getDateKey(d);

      setDataStore(prev => {
        const bdYest = prev[yStr];
        const newYestItems = bdYest ? bdYest.items.filter(t => t.id !== task.id) : [];

        const bdBuf = prev["BUFFER"] || getEmptyDay();
        const newBufItems = [...bdBuf.items, { ...task, huddleDismissed: false }];

        return { ...prev, [yStr]: { ...(bdYest || getEmptyDay()), items: newYestItems }, "BUFFER": { ...bdBuf, items: newBufItems } };
      });

      setHuddleYesterdayItems(prev => prev.filter(t => t.id !== task.id));
      setAnimatingBufferId(null);
      checkHuddleCompletion(remY, remB);
    }, 300);
  };

  const moveTaskToToday = (task: TaskItem, source: 'yesterday' | 'BUFFER') => {
    let remY = huddleYesterdayItems.length;
    let remB = huddleBufferItems.length;


    // 1. Remove from source array natively
    if (source === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const yStr = getDateKey(d);
      setDataStore(prev => {
        const bd = prev[yStr];
        if (!bd) return prev;
        return { ...prev, [yStr]: { ...bd, items: bd.items.filter(t => t.id !== task.id) }};
      });
      setHuddleYesterdayItems(prev => prev.filter(t => t.id !== task.id));
    } else {
      remB -= 1;
      setDataStore(prev => {
        const bd = prev["BUFFER"];
        if (!bd) return prev;
        return { ...prev, "BUFFER": { ...bd, items: bd.items.filter(t => t.id !== task.id) }};
      });
      setHuddleBufferItems(prev => prev.filter(t => t.id !== task.id));
    }
    // 2. Add to today by treating it essentially as a master item extraction
    const masterTask = taskBank.find(t => t.id === task.master_id) || task;
    const finalTask = { ...masterTask, is_priority: task.is_priority }; // maintain new priority override if toggled in huddle
    scheduleTaskToDay(finalTask, dateKey);
    checkHuddleCompletion(remY, remB);
  };

  const toggleHuddlePriority = (taskId: string, source: 'yesterday' | 'BUFFER') => {
    if (source === 'yesterday') {
      setHuddleYesterdayItems(prev => prev.map(t => t.id === taskId ? { ...t, is_priority: !t.is_priority } : t));
    } else {
      setHuddleBufferItems(prev => prev.map(t => t.id === taskId ? { ...t, is_priority: !t.is_priority } : t));
    }
  };

  const toggleDayTaskDone = (id: string) => {
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
    const existingDay = getDayData(dateKey);
    const task = existingDay.items.find(t => t.id === id);
    const willBecomeDone = task ? !task.is_done : false;

    setDataStore((prevStore) => {
      const day = prevStore[dateKey] || getEmptyDay();
      const newItems = day.items.map(t => t.id === id ? { ...t, is_done: !t.is_done } : t);
      return { ...prevStore, [dateKey]: { ...day, items: newItems } };
    });

    if (task && willBecomeDone && task.tag_id === goalsTagId) {
      const currentWeekGoals = weeklyGoals[weekDateKeys[0]] || ["", "", ""];
      const matchIdx = currentWeekGoals.findIndex(g => g.trim().toLowerCase() === task.text.trim().toLowerCase() && g.trim() !== "");
      if (matchIdx !== -1) {
        setWeeklyGoalHits(prev => {
          const currentHits = prev[weekDateKeys[0]] || [0, 0, 0];
          const newHits = [...currentHits] as [number, number, number];
          newHits[matchIdx] += 1;
          return { ...prev, [weekDateKeys[0]]: newHits };
        });
      }
    }

    if (task && willBecomeDone && taskBank.some(t => t.id === task.master_id)) {
      setArchiveConfirmId(task.id);
    }
  };

  // Called by the daily PackageCheck button
  const smartArchiveFromDay = (task: TaskItem) => {
    setDataStore((prevStore) => {
      const day = prevStore[dateKey] || getEmptyDay();
      return { ...prevStore, [dateKey]: { ...day, items: day.items.map(t => t.id === task.id ? { ...t, is_done: true } : t) } };
    });
    setArchiveConfirmId(task.id);
  };

  const confirmArchive = (task: TaskItem) => {
    setArchiveConfirmId(null);
    setArchivedFlashId(task.id);
    setTimeout(() => setArchivedFlashId(null), 800);
    setTimeout(() => archiveMasterTask(task.master_id), 200);
  };

  const declineArchive = () => {
    setArchiveConfirmId(null);
    // Task stays done on this day only — no bank change
  };

  const toggleDayTaskPriority = (id: string) => {
    setDataStore((prevStore) => {
      const existingDay = getDayData(dateKey);
      const newItems = existingDay.items.map(t => t.id === id ? { ...t, is_priority: !t.is_priority } : t);
      return { ...prevStore, [dateKey]: { ...existingDay, items: newItems } };
    });
  };

  const removeDayTask = (id: string, masterId: string, targetDate: string = dateKey) => {
    setDataStore((prevStore) => {
      const existingDay = prevStore[targetDate] || getEmptyDay();
      const newItems = existingDay.items.filter(t => t.id !== id);
      return { ...prevStore, [targetDate]: { ...existingDay, items: newItems } };
    });
  };

  const toggleDayWater = (index: number) => {
    setDataStore((prevStore) => {
      const existingDay = getDayData(dateKey);
      const newWater = existingDay.water === index + 1 ? index : index + 1;

      // Trigger celebration only when hitting exactly 8
      if (newWater === 8) {
        // Play a soft water drop sound via Web Audio API
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const playDrop = (time: number, freq: number, gain: number) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.4, time + 0.3);
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(gain, time + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
            osc.start(time);
            osc.stop(time + 0.35);
          };
          const now = ctx.currentTime;
          playDrop(now,        880, 0.08);
          playDrop(now + 0.1,  1100, 0.06);
          playDrop(now + 0.18, 1320, 0.05);
        } catch {}

        setWaterJustCompleted(true);
        setTimeout(() => setWaterJustCompleted(false), 2000);
      }

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

    const BULLET_RE = /^(\s*)(•|◦|-)\s/;  // matches any bullet style at any indent
    const SUB_BULLET_RE = /^(\s+)(•|◦|-)\s/; // indented bullet of any style

    // Returns the correct prefix char based on indent level (0-based)
    // Numbers: even levels = number, odd levels = letter
    // Bullets:  even levels = •,      odd levels = ◦
    const INDENT = "   "; // 3 spaces per level

    const getNumberPrefix = (indent: string, linesAbove: string[]): string => {
      const level = Math.round(indent.length / INDENT.length);
      if (level % 2 === 0) {
        // number level — find next number at this indent
        let last = 0;
        for (const l of linesAbove) {
          const m = l.match(/^(\s*)(\d+)\.\s/);
          if (m && m[1].length === indent.length) last = parseInt(m[2], 10);
          // reset when we hit a shallower indent
          if (m && m[1].length < indent.length) last = 0;
        }
        return `${indent}${last + 1}. `;
      } else {
        // letter level
        let last = -1;
        for (const l of linesAbove) {
          const m = l.match(/^(\s*)([a-z])\.\s/);
          if (m && m[1].length === indent.length) last = letterToIndex(m[2]);
          if (m && m[1].length < indent.length) last = -1;
        }
        return `${indent}${indexToLetter(last + 1)}. `;
      }
    };

    const getBulletChar = (indent: string): string => {
      const level = Math.round(indent.length / INDENT.length);
      return level % 2 === 0 ? "•" : "◦";
    };

    // ── Tab ───────────────────────────────────────────────────────────────────
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();

      const numMatch = currentLine.match(/^(\s*)(\d+|[a-z])\.\s/);
      const bulMatch = currentLine.match(BULLET_RE);

      if (numMatch) {
        const newIndent = numMatch[1] + INDENT;
        const rest = currentLine.slice(numMatch[0].length);
        const newPrefix = getNumberPrefix(newIndent, linesAbove);
        const newLine = newPrefix + rest;
        const newText = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
        setDayNotes(newText);
        const delta = newLine.length - currentLine.length;
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + delta; });

      } else if (bulMatch) {
        const newIndent = bulMatch[1] + INDENT;
        const rest = currentLine.slice(bulMatch[0].length);
        const newLine = `${newIndent}${getBulletChar(newIndent)} ${rest}`;
        const newText = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
        setDayNotes(newText);
        const delta = newLine.length - currentLine.length;
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + delta; });

      } else {
        // fallback: 2 spaces
        const newText = value.slice(0, selectionStart) + "  " + value.slice(selectionEnd);
        setDayNotes(newText);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + 2; });
      }
      return;
    }

    // ── Shift+Tab ─────────────────────────────────────────────────────────────
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();

      const numMatch = currentLine.match(/^(\s+)(\d+|[a-z])\.\s/); // must have indent
      const bulMatch = currentLine.match(SUB_BULLET_RE);            // must have indent

      if (numMatch) {
        const newIndent = numMatch[1].slice(INDENT.length); // remove one level
        const rest = currentLine.slice(numMatch[0].length);
        const newPrefix = getNumberPrefix(newIndent, linesAbove);
        const newLine = newPrefix + rest;
        const newText = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
        setDayNotes(newText);
        const delta = newLine.length - currentLine.length;
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + delta; });

      } else if (bulMatch) {
        const newIndent = bulMatch[1].slice(INDENT.length);
        const rest = currentLine.slice(bulMatch[0].length);
        const newLine = `${newIndent}${getBulletChar(newIndent)} ${rest}`;
        const newText = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
        setDayNotes(newText);
        const delta = newLine.length - currentLine.length;
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + delta; });
      }
      return;
    }

    // ── Enter ─────────────────────────────────────────────────────────────────
    if (e.key === "Enter") {
      const isNumber = NUMBER_LINE_RE.test(currentLine);
      const isLetter = LETTER_LINE_RE.test(currentLine);
      const isBullet = BULLET_RE.test(currentLine);

      if (!isNumber && !isLetter && !isBullet) return;

      e.preventDefault();

      // Strip prefix to check if line is empty
      const stripped = currentLine
        .replace(NUMBER_LINE_RE, "")
        .replace(LETTER_LINE_RE, "")
        .replace(BULLET_RE, "")
        .trim();

      // Empty prefix line → remove formatting, plain newline
      if (stripped === "") {
        const newText = value.slice(0, lineStart) + value.slice(lineEnd);
        setDayNotes(newText);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = lineStart; });
        return;
      }

      let nextPrefix = "";
      if (isNumber) {
        const m = currentLine.match(/^(\s*)(\d+)\.\s/)!;
        const indent = m[1];
        nextPrefix = getNumberPrefix(indent, [...linesAbove, currentLine]);
      } else if (isLetter) {
        const m = currentLine.match(/^(\s*)([a-z])\.\s/)!;
        const indent = m[1];
        nextPrefix = getNumberPrefix(indent, [...linesAbove, currentLine]);
      } else if (isBullet) {
        const m = currentLine.match(BULLET_RE)!;
        nextPrefix = `${m[1]}${m[2]} `;
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
    if (isCreatingTag) {
      const existingName = findTagNameByColor(colorHex, tags);
      if (existingName) setNewTagName(existingName);
      else setNewTagName("");
      return;
    }
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
    if (newTaskIsRecurring) {
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
    setIsModalOpen(false);
    resetModal();
  };

  const resetModal = () => {
    setNewTaskText(""); setNewTaskTagId(""); setNewTaskDate(dateKey);
    setNewTaskTime(""); setNewTaskNotes(""); setNewTaskPriority(false); setNewTaskIsGoal(false);
    setNewTaskReminderTime(""); setNewTaskReminderActive(false);
    setIsCreatingTag(false); setIsPaletteOpen(false);
    setNewTaskIsRecurring(false); setNewTaskRecurringDays([]); setNewTaskRecurringEnd("");
    setNewTaskShowOnWeek(false); setNewTaskShowOnMonth(false);
  };

  const scheduleTaskToDay = (masterTask: MasterTask, targetDateKey: string) => {
    const newDayId = `t_${Date.now()}_${Math.random()}`;
    const newScheduledTask: TaskItem = { ...masterTask, id: newDayId, master_id: masterTask.id, is_done: false };
    setDataStore((prevStore) => {
      const existingDay = prevStore[targetDateKey] || getEmptyDay();
      return { ...prevStore, [targetDateKey]: { ...existingDay, items: [...existingDay.items, newScheduledTask] } };
    });
  };

  const handleScheduleTask = (task: MasterTask, targetDateKey: string, overridePriority?: boolean) => {
    const existingDay = getDayData(targetDateKey);
    const isDuplicate = existingDay.items.some(t => t.master_id === task.id);
    
    if (isDuplicate) {
      setSchedulingStates(prev => ({ ...prev, [task.id]: 'error' }));
      setMigrationToast(`Already planned for ${targetDateKey === 'BUFFER' ? 'Buffer' : targetDateKey.startsWith('MONTH_BUFFER_') ? 'Month Buffer' : new Date(targetDateKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`);
      setTimeout(() => setMigrationToast(null), 2000);
      setTimeout(() => {
        setSchedulingStates(prev => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 800);
      return;
    }

    const finalTask = overridePriority !== undefined ? { ...task, is_priority: overridePriority } : task;
    scheduleTaskToDay(finalTask, targetDateKey);
    
    setSchedulingStates(prev => ({ ...prev, [task.id]: 'success' }));
    setMigratedDate(targetDateKey);
    setMigrationToast(`Task moved to ${targetDateKey === 'BUFFER' ? 'Buffer' : targetDateKey.startsWith('MONTH_BUFFER_') ? 'Month Buffer' : new Date(targetDateKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`);
    
    setTimeout(() => setMigratedDate(null), 800);
    setTimeout(() => setMigrationToast(null), 1000);
    setTimeout(() => {
      setSchedulingStates(prev => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
    }, 800);
  };

  const addGoalTask = (text: string) => {
    if (!text.trim()) return;
    const newMasterId = `m_${Date.now()}_g`;
    const newMasterTask: MasterTask = {
      id: newMasterId,
      text: text.trim(),
      is_priority: false,
      is_goal: true,
      tag_id: goalsTagId,
      due_date: dateKey,
    };
    setTaskBank((prev) => [...prev, newMasterTask]);
    scheduleTaskToDay(newMasterTask, dateKey);
  };

  const archiveMasterTask = (masterId: string) => {
    const masterTask = taskBank.find(t => t.id === masterId);
    // Soft-delete: move to deletedTasks with timestamp instead of permanent removal
    if (masterTask) {
      setDeletedTasks(prev => [...prev, { ...masterTask, deletedAt: new Date().toISOString() }]);
    }
    setTaskBank((prev) => prev.filter((t) => t.id !== masterId));
    setDataStore((prevStore) => {
      const newStore = { ...prevStore };
      Object.keys(newStore).forEach(date => {
        const day = newStore[date];
        const hasTask = day.items.some(item => item.master_id === masterId);
        if (hasTask) {
          newStore[date] = { ...day, items: day.items.map(item => item.master_id === masterId ? { ...item, is_done: true } : item) };
        }
      });
      if (masterTask?.due_date && newStore[masterTask.due_date]) {
        const dueDay = newStore[masterTask.due_date];
        newStore[masterTask.due_date] = { ...dueDay, items: dueDay.items.map(item => item.master_id === masterId ? { ...item, is_done: true } : item) };
      }
      return newStore;
    });
    confetti({ particleCount: 120, spread: 60, origin: { y: 0.6 }, colors: ['#000080', '#9C9F84', '#22c55e', '#d97706'] });
  };

  const restoreDeletedTask = (deletedTask: DeletedTask) => {
    const { deletedAt, ...masterTask } = deletedTask;
    setTaskBank(prev => [...prev, masterTask]);
    setDeletedTasks(prev => prev.filter(t => t.id !== deletedTask.id));
  };

  const shiftDate = (days: number) => {
    setSlideDirection(days > 0 ? 1 : -1);
    setCurrentDate((prev) => { const nextDate = new Date(prev); nextDate.setDate(nextDate.getDate() + days); return nextDate; });
  };
  const handleGoToToday = () => {
    const today = new Date();
    // Guarantee route is base
    router.push('/');
    
    // Check if user is already natively positioned on Today's layout completely unmodified
    if (viewMode === 'day' && dateKey === getDateKey(today) && !showInsights && !isBankOpen) {
      setIsPulsingToday(true);
      setTimeout(() => setIsPulsingToday(false), 500);
      return;
    }

    // Force strict overrides
    setCurrentDate(today);
    setViewMode('day');
    setShowInsights(false);
    if (isBankOpen) closeTaskBank();
    
    // Output physics confirmation to UI layer
    setIsPulsingToday(true);
    setTimeout(() => setIsPulsingToday(false), 500);
  };

  const saveActiveMeal = (type: MealType, value: string) => {
    if (!value.trim()) return;
    const newMealText = value.trim();
    setDataStore(prev => {
      const existingDay = prev[dateKey] || getEmptyDay();
      const newMeals = existingDay.meals.filter(m => m.type !== type);
      newMeals.push({ id: `meal_${Date.now()}`, type, text: newMealText });
      return { ...prev, [dateKey]: { ...existingDay, meals: newMeals } };
    });
    
    setMealBank(prevBank => 
      prevBank.map(m => 
        m.name.toLowerCase() === newMealText.toLowerCase() 
          ? { ...m, planCount: (m.planCount || 0) + 1 } 
          : m
      )
    );

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

  const handleMealKeyDownWrapper = (e: React.KeyboardEvent<HTMLInputElement>, type: MealType, suggestionsCount: number, showCreateNew: boolean, exactMatchName: string) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextType = getNextMealType(type, e.shiftKey);
      if (activeMealInput === type && mealInputValue.trim()) saveActiveMeal(type, mealInputValue);
      if (nextType) { setActiveMealInput(nextType); setMealInputValue(getMealText(nextType)); setMealFocusedIndex(-1); }
      else { setActiveMealInput(null); setMealInputValue(""); setMealFocusedIndex(-1); }
      return;
    }

    const optionsCount = suggestionsCount + (showCreateNew ? 1 : 0);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMealFocusedIndex(prev => (optionsCount === 0 ? -1 : (prev + 1) % optionsCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMealFocusedIndex(prev => (optionsCount === 0 ? -1 : prev - 1 < 0 ? optionsCount - 1 : prev - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setActiveMealInput(null);
      setMealInputValue("");
      setMealFocusedIndex(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (mealFocusedIndex >= 0 && mealFocusedIndex < suggestionsCount) {
        // Find the matching name manually since we only pass count to this wrapper securely
        // We will execute the submission hook natively inside the Input logic manually below to access the exact array 
      } else {
        // Fallback default enter behavior
        handleMealSubmit(e, type);
      }
    }
  };

  const handleInlineSubmit = (e: React.FormEvent, colKey: string) => {
    e.preventDefault();
    if (!inlineText.trim() || activeInlineCol !== colKey) return;
    
    let finalTagId = inlineTagId;
    if (isCreatingTag && newTagName.trim()) finalTagId = handleAddTag() || "";
    
    const newMasterId = `m_${Date.now()}`;
    const newMasterTask: MasterTask = { 
       id: newMasterId, 
       text: inlineText.trim(), 
       is_priority: inlinePriority, 
       tag_id: finalTagId || undefined, 
       due_date: colKey, 
       time: inlineTime, 
       notes: inlineNotes, 
       reminderTime: inlineReminderTime || undefined, 
       isReminderActive: inlineReminderActive 
    };
    
    setTaskBank((prev) => [...prev, newMasterTask]);
    scheduleTaskToDay(newMasterTask, colKey);
    
    setActiveInlineCol(null);
    setInlineText(""); setInlineTagId(""); setInlineTime("");
    setInlineNotes(""); setInlinePriority(false);
    setInlineReminderTime(""); setInlineReminderActive(false);
    setIsCreatingTag(false); setIsPaletteOpen(false);
  };

  const computedDailyItems = useMemo(() => {
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

  const goalsArray = computedDailyItems.filter(t => t.tag_id === goalsTagId);
  const prioritiesArray = computedDailyItems.filter(t => t.is_priority && t.tag_id !== goalsTagId);
  const tasksArray = computedDailyItems.filter(t => !t.is_priority && t.tag_id !== goalsTagId);
  const getMealText = (type: MealType) => dayData.meals.find(m => m.type === type)?.text || "";

  let unrankedPriorities = prioritiesArray.filter(t => t.priority_rank === undefined);
  const priorityRenderSlots = Array.from({ length: 5 }).map((_, i) => {
    const explicit = prioritiesArray.find(t => t.priority_rank === i);
    if (explicit) return explicit;
    if (unrankedPriorities.length > 0) return unrankedPriorities.shift();
    return null;
  });

  let unrankedTodos = tasksArray.filter(t => t.todo_rank === undefined);
  const todoRenderSlots = Array.from({ length: Math.max(9, tasksArray.length) }).map((_, i) => {
    const explicit = tasksArray.find(t => t.todo_rank === i);
    if (explicit) return explicit;
    if (unrankedTodos.length > 0) return unrankedTodos.shift();
    return null;
  });

  let unrankedGoals = goalsArray.filter(t => t.goal_rank === undefined);
  const goalRenderSlots = Array.from({ length: Math.max(5, goalsArray.length) }).map((_, i) => {
    const explicit = goalsArray.find(t => t.goal_rank === i);
    if (explicit) return explicit;
    if (unrankedGoals.length > 0) return unrankedGoals.shift();
    return null;
  });

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
  const anyNudge = taskBank.some(t => isNudgeApproaching(t) || isNudgeOverdue(t));
  const prioritiesCompleted = prioritiesArray.filter((p) => p.is_done).length;
  const goalsCompleted = goalsArray.filter((g) => g.is_done).length;

  // ─── Dynamic weighted center percentage ──────────────────────────────────────
  // Only average categories that have at least 1 task (active categories)
  // 3/3 Priorities + 0/0 Tasks/Goals → 100% (not 33%)
  const activeCategories: { completed: number; total: number }[] = [
    ...(tasksArray.length > 0 ? [{ completed: tasksCompleted, total: tasksArray.length }] : []),
    ...(prioritiesArray.length > 0 ? [{ completed: prioritiesCompleted, total: prioritiesArray.length }] : []),
    ...(goalsArray.length > 0 ? [{ completed: goalsCompleted, total: goalsArray.length }] : []),
  ];
  const centerPercent = activeCategories.length === 0
    ? null  // all empty → show "Ready"
    : Math.round(activeCategories.reduce((sum, c) => sum + (c.completed / c.total), 0) / activeCategories.length * 100);

  // ─── Ring pulse — detect when a category's total increases ───────────────────
  const prevOuterTotal = useRef(tasksArray.length);
  const prevInnerTotal = useRef(prioritiesArray.length);
  const prevCenterTotal = useRef(goalsArray.length);
  const [pulsingOuter, setPulsingOuter] = useState(false);
  const [pulsingInner, setPulsingInner] = useState(false);
  const [pulsingCenter, setPulsingCenter] = useState(false);

  useEffect(() => {
    if (tasksArray.length > prevOuterTotal.current) {
      setPulsingOuter(true);
      setTimeout(() => setPulsingOuter(false), 800);
    }
    prevOuterTotal.current = tasksArray.length;
  }, [tasksArray.length]);

  useEffect(() => {
    if (prioritiesArray.length > prevInnerTotal.current) {
      setPulsingInner(true);
      setTimeout(() => setPulsingInner(false), 800);
    }
    prevInnerTotal.current = prioritiesArray.length;
  }, [prioritiesArray.length]);

  useEffect(() => {
    if (goalsArray.length > prevCenterTotal.current) {
      setPulsingCenter(true);
      setTimeout(() => setPulsingCenter(false), 800);
    }
    prevCenterTotal.current = goalsArray.length;
  }, [goalsArray.length]);
  // ─────────────────────────────────────────────────────────────────────────────

  const formattedDate = viewMode === 'month'
    ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : currentDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const renderTagDot = (tagId?: string) => {
    if (!tagId || !tagsById[tagId]) return <div className="w-2.5 h-2.5 rounded-full shrink-0 invisible" />;
    const color = tagsById[tagId].color;
    return <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-in zoom-in duration-300 fill-mode-both" style={{ backgroundColor: color }} title={tagsById[tagId].name} />;
  };

  const mealSuggestions = useMemo(() => {
    if (!activeMealInput || !mealInputValue.trim()) return [];
    const query = mealInputValue.toLowerCase().trim();
    return mealBank
      .filter(m => m.type === activeMealInput && m.name.toLowerCase().includes(query))
      .sort((a,b) => (b.planCount || 0) - (a.planCount || 0))
      .slice(0, 4);
  }, [mealInputValue, activeMealInput, mealBank]);

  const exactMealMatch = mealSuggestions.some(m => m.name.toLowerCase() === mealInputValue.toLowerCase().trim());

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
                onChange={e => { setMealInputValue(e.target.value); setMealFocusedIndex(-1); }}
                onKeyDown={(e) => { 
                  if (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Escape') {
                    handleMealKeyDownWrapper(e, type, mealSuggestions.length, !exactMealMatch && mealInputValue.trim() !== "", exactMealMatch ? mealInputValue : "");
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (mealFocusedIndex >= 0 && mealFocusedIndex < mealSuggestions.length) {
                      saveActiveMeal(type, mealSuggestions[mealFocusedIndex].name);
                      setActiveMealInput(null);
                      setMealInputValue("");
                      setMealFocusedIndex(-1);
                    } else if (mealFocusedIndex === mealSuggestions.length && !exactMealMatch && mealInputValue.trim() !== "") {
                      setIsBankOpen(true);
                      setExpandedHeaders(prev => prev.includes("meal-bank") ? prev : [...prev, "meal-bank"]);
                      setNewMealName(mealInputValue);
                      setNewMealType(type);
                      setActiveMealInput(null);
                      setMealInputValue("");
                      setMealFocusedIndex(-1);
                    } else {
                      handleMealSubmit(e, type);
                    }
                  }
                }}
                onBlur={(e) => handleMealBlur(e, type)}
              />
            </div>
            {(mealSuggestions.length > 0 || (!exactMealMatch && mealInputValue.trim() !== "")) && (
              <div className="absolute top-full left-0 mt-2 w-[110%] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-md shadow-2xl overflow-hidden py-1 z-[200] animate-in fade-in slide-in-from-top-2 duration-200">
                {mealSuggestions.map((suggestion, idx) => (
                  <button key={idx} type="button"
                    onMouseEnter={() => setMealFocusedIndex(idx)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm font-serif italic transition-colors",
                      mealFocusedIndex === idx 
                        ? "bg-brand-sage/20 text-brand-navy dark:text-brand-sage border-l-2 border-brand-navy dark:border-brand-sage" 
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-brand-sage/20 hover:text-brand-navy border-l-2 border-transparent"
                    )}
                    onMouseDown={(e) => { e.preventDefault(); saveActiveMeal(type, suggestion.name); setActiveMealInput(null); setMealInputValue(""); setMealFocusedIndex(-1); }}
                  >{suggestion.name}</button>
                ))}
                {!exactMealMatch && mealInputValue.trim() !== "" && (
                  <button type="button"
                    onMouseEnter={() => setMealFocusedIndex(mealSuggestions.length)}
                    className={cn(
                      "w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold transition-colors border-t border-zinc-100 dark:border-zinc-800 mt-1",
                      mealFocusedIndex === mealSuggestions.length
                        ? "bg-brand-navy/10 dark:bg-brand-sage/20 text-brand-navy dark:text-brand-sage border-l-2 border-brand-navy dark:border-brand-sage"
                        : "text-brand-navy dark:text-brand-sage hover:bg-brand-navy/5 dark:hover:bg-brand-sage/10 border-l-2 border-transparent"
                    )}
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      setIsBankOpen(true); 
                      setExpandedHeaders(prev => prev.includes("meal-bank") ? prev : [...prev, "meal-bank"]); 
                      setNewMealName(mealInputValue); 
                      setNewMealType(type); 
                      setActiveMealInput(null); 
                      setMealInputValue(""); 
                      setMealFocusedIndex(-1);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Create New "{mealInputValue}"
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            tabIndex={getTabIndex(type)}
            className="border-b border-zinc-300 dark:border-zinc-700 h-6 w-full flex items-center cursor-text transition-colors hover:border-brand-navy/30 focus-visible:outline-none focus-visible:border-brand-sage focus-visible:ring-1 focus-visible:ring-brand-sage/50 rounded-sm"
            onClick={() => { setActiveMealInput(type); setMealInputValue(currentText); setMealFocusedIndex(-1); }}
            onFocus={() => { if (activeMealInput !== type) { setActiveMealInput(type); setMealInputValue(currentText); setMealFocusedIndex(-1); } }}
            onKeyDown={(e) => { if (e.key === 'Tab') handleMealKeyDownWrapper(e as unknown as React.KeyboardEvent<HTMLInputElement>, type, 0, false, ""); }}

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

  const renderWeekCard = (colKey: string) => {
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
    }

    const tCompleted = items.filter(t => t.is_done && !t.is_priority && t.tag_id !== goalsTagId).length;
    const tTotal = items.filter(t => !t.is_priority && t.tag_id !== goalsTagId).length;
    const pCompleted = items.filter(t => t.is_done && t.is_priority && t.tag_id !== goalsTagId).length;
    const pTotal = items.filter(t => t.is_priority && t.tag_id !== goalsTagId).length;
    const gCompleted = items.filter(t => t.is_done && t.tag_id === goalsTagId).length;
    const gTotal = items.filter(t => t.tag_id === goalsTagId).length;

    const ghosts = isBuffer ? [] : taskBank.filter(t => t.due_date === colKey && !items.some(i => i.master_id === t.id) && !dismissedGhosts[colKey]?.includes(t.id));
    const isExpanded = expandedDays.includes(colKey);

    const top5Items = [
      ...items.filter(t => t.is_priority && t.tag_id !== goalsTagId),
      ...items.filter(t => t.tag_id === goalsTagId),
      ...items.filter(t => !t.is_priority && t.tag_id !== goalsTagId && t.time),
      ...items.filter(t => !t.is_priority && t.tag_id !== goalsTagId && !t.time)
    ].slice(0, 5);

    const bankNudges = taskBank.filter(t => (isNudgeApproaching(t) || isNudgeOverdue(t)) && !items.some(i => i.master_id === t.id));
    const potentialGhosts = Array.from(new Set([...ghosts, ...bankNudges]));
    const paddingGhosts = isBuffer ? [] : potentialGhosts.filter(t => !dismissedGhosts[colKey]?.includes(t.id)).slice(0, Math.max(0, 5 - top5Items.length));

    return (
      <div 
        key={colKey}
        className={cn(
          "w-full shrink-0 flex flex-col bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md rounded-2xl shadow-sm border transition-all overflow-hidden",
          isBuffer 
            ? "border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50" 
            : isToday
              ? "ring-2 ring-brand-navy dark:ring-brand-sage border-transparent shadow-[0_0_25px_rgba(0,0,128,0.2)] dark:shadow-[0_0_25px_rgba(156,159,132,0.25)] relative z-10"
              : "border-zinc-200 dark:border-zinc-800",
          pulsedDates.includes(colKey) && "ring-4 ring-brand-sage dark:ring-brand-sage/50 bg-brand-sage/10 dark:bg-brand-sage/20 transition-none z-20 shadow-[0_0_20px_rgba(156,159,132,0.4)]",
          migratedDate === colKey && "ring-4 ring-brand-navy dark:ring-brand-navy/50 bg-brand-navy/10 scale-[1.05] z-30 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,128,0.3)]"
        )}
      >
        <div 
          onClick={() => {
            setSelectedWeekDate(colKey);
            if (isBuffer) {
              setExpandedDays([colKey]);
            } else {
              setExpandedDays(prev => prev.includes(colKey) ? prev.filter(k => k !== colKey) : [...prev, colKey]);
            }
          }}
          className="flex items-center justify-between p-4 w-full text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <h3 className={cn(
              "text-lg font-black uppercase tracking-widest transition-colors",
              selectedWeekDate === colKey ? "text-brand-navy dark:text-brand-sage" : "text-zinc-600 dark:text-zinc-400"
            )}>
              {isBuffer ? "Holding Pen (Buffer)" : new Date(colKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            {selectedWeekDate === colKey && (
               <span className="text-[10px] font-bold bg-brand-navy/10 text-brand-navy dark:bg-brand-sage/20 dark:text-brand-sage px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                 Actively Planning
               </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {!isBuffer && (
              <div className="scale-[0.55] origin-right -mr-4">
                <ConcentricRings
                  outerTotal={tTotal} outerCompleted={tCompleted}
                  innerTotal={pTotal} innerCompleted={pCompleted}
                  centerTotal={gTotal} centerCompleted={gCompleted}
                  pulsingOuter={false} pulsingInner={false} pulsingCenter={false}
                  centerPercent={null}
                />
              </div>
            )}
            {!isBuffer && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentDate(new Date(colKey + 'T00:00:00'));
                  setViewMode('day');
                  if (isBankOpen) closeTaskBank();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 ml-2 text-xs font-bold bg-brand-navy/5 text-brand-navy hover:bg-brand-navy hover:text-white dark:bg-brand-sage/10 dark:text-brand-sage dark:hover:bg-brand-sage dark:hover:text-zinc-900 border border-brand-navy/10 dark:border-brand-sage/20 rounded-md transition-all shadow-sm"
                title="Go to Daily View"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Focus Day</span>
              </button>
            )}
            <ChevronDown className={cn("w-5 h-5 text-zinc-400 transition-transform duration-300", isExpanded && "rotate-180")} />
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col border-t border-zinc-100 dark:border-zinc-800/50"
            >
              <div className="p-4 flex flex-col gap-3">
                {items.map(task => {
                   const isPast = !task.is_done && isOverdue(task.time, colKey);
                   const isSoon = !task.is_done && isApproaching(task.time, colKey);
                   return (
                     <div 
                       key={task.id} 
                       onDoubleClick={() => {
                         if (isBuffer) {
                           setDataStore(prev => {
                             const sourceDay = prev["BUFFER"] || getEmptyDay();
                             const targetDay = prev[dateKey] || getEmptyDay();
                             const taskToMove = sourceDay.items.find(t => t.id === task.id);
                             if (!taskToMove) return prev;
                             return {
                               ...prev,
                               ["BUFFER"]: { ...sourceDay, items: sourceDay.items.filter(t => t.id !== task.id) },
                               [dateKey]: { ...targetDay, items: [...targetDay.items, { ...taskToMove, due_date: dateKey }] }
                             };
                           });
                         }
                       }}
                       className={cn("flex items-start gap-3 p-3.5 bg-white dark:bg-zinc-900 border rounded-xl hover:shadow-md transition-shadow group relative", 
                         task.is_done && "opacity-50",
                         task.is_priority && task.tag_id !== goalsTagId ? "border-brand-sage dark:border-brand-sage/50" : task.tag_id === goalsTagId ? "border-slate-300 dark:border-slate-600" : "border-brand-navy border-opacity-30 dark:border-brand-navy/60"
                       )}
                     >
                        {!isBuffer && (
                          <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                            <input type="checkbox" checked={task.is_done} onChange={() => {
                              setDataStore(prev => {
                                 const d = prev[colKey] || getEmptyDay();
                                 const newI = d.items.map(t => t.id === task.id ? {...t, is_done: !t.is_done} : t);
                                 return {...prev, [colKey]: {...d, items: newI}};
                              });
                            }} className="peer appearance-none w-4 h-4 border-2 border-brand-navy/30 rounded-sm checked:bg-brand-navy checked:border-brand-navy transition-all cursor-pointer" />
                            <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        )}
                        {isBuffer && <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mt-2 shrink-0" />}
                        <div className="flex-1 flex items-center min-w-0 pr-8">
                           <div className="flex items-center gap-2 mt-0.5 shrink-0">
                             {renderTagDot(task.tag_id)}
                             {(task.is_goal || task.tag_id === goalsTagId) && <Target className="w-3.5 h-3.5 text-brand-sage" />}
                             {task.is_priority && <Star className="w-3.5 h-3.5 text-brand-sage fill-brand-sage" />}
                           </div>
                           <span className={cn("text-sm font-semibold leading-snug text-zinc-800 dark:text-zinc-200 ml-2", task.is_done && "line-through text-zinc-400 dark:text-zinc-500")}>
                             {task.text}
                           </span>
                           {task.time && (
                             <span className={cn(
                               "text-xs font-bold font-mono ml-auto shrink-0 tracking-tight",
                               isPast ? "text-red-500 animate-pulse-opacity" : isSoon ? "text-amber-500 animate-pulse-opacity" : "text-zinc-500 dark:text-zinc-400"
                             )}>
                               {task.time}
                             </span>
                           )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 pl-2 backdrop-blur-sm rounded-l-md">
                           <button onClick={() => {
                              if (isBuffer) {
                                setDataStore(prev => {
                                  const sb = prev["BUFFER"] || getEmptyDay();
                                  return {...prev, "BUFFER": {...sb, items: sb.items.filter(t => t.id !== task.id)}};
                                });
                              } else {
                                removeDayTask(task.id, task.master_id, colKey);
                              }
                           }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 rounded-md transition-colors text-zinc-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                     </div>
                   );
                })}
                <AnimatePresence>
                  {ghosts.map(ghost => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      exit={{ opacity: 0, scale: 0.95, height: 0, overflow: "hidden" }}
                      key={`ghost_${ghost.id}`}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        scheduleTaskToDay(ghost, colKey);
                      }}
                      className="flex items-center gap-3 p-3.5 bg-zinc-50/50 dark:bg-zinc-900/30 border-2 border-dashed border-amber-300 dark:border-amber-900 rounded-xl hover:opacity-100 hover:border-amber-400 transition-all cursor-pointer shadow-sm group relative"
                      title="Double click to solidify"
                    >
                       <Star className={cn("w-4 h-4 mt-0.5 shrink-0", ghost.is_priority ? "text-amber-500 fill-amber-500" : "text-zinc-300 dark:text-zinc-700")} />
                       <div className="flex-1 flex items-center min-w-0 pr-8">
                          <span className="text-sm font-semibold leading-snug text-zinc-600 dark:text-zinc-400 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">{ghost.text}</span>
                          {ghost.time && (
                            <span className="text-xs font-bold font-mono ml-auto shrink-0 tracking-tight text-amber-600/60 dark:text-amber-500/60 group-hover:text-amber-600">
                               {ghost.time}
                            </span>
                          )}
                       </div>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           setDismissedGhosts(prev => ({ ...prev, [colKey]: [...(prev[colKey] || []), ghost.id] }));
                         }}
                         className="absolute right-3 p-1 opacity-40 hover:opacity-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 rounded-md transition-all drop-shadow-sm"
                         title="Dismiss suggestion"
                       >
                         <X className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                       </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* INLINE QUICK ADD: */}
                <div className="mt-2 shrink-0">
                  {activeInlineCol === colKey ? (
                    <form onSubmit={(e) => handleInlineSubmit(e, colKey)} className="flex flex-col gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-inner animate-in fade-in zoom-in-95 duration-200">
                        {/* Top: Priority + Text */}
                        <div className="flex gap-3 items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
                          <button type="button" onClick={() => setInlinePriority(!inlinePriority)} className="p-1 mt-0.5 hover:scale-110 transition-transform shrink-0" title="Toggle Priority">
                            <Star className={cn("w-5 h-5 transition-colors", inlinePriority ? "text-brand-sage fill-brand-sage" : "text-zinc-300 dark:text-zinc-700")} />
                          </button>
                          <input type="text" value={inlineText || ""} onChange={(e) => setInlineText(e.target.value)} placeholder={`What to do on ${new Date(colKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}?`} autoFocus className="w-full text-base font-semibold bg-transparent border-none focus:ring-0 px-0 pb-1 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none" />
                        </div>
                        
                        {/* Middle: Tags & Time */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus-within:ring-2 ring-brand-navy/20 relative">
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
                          </div>
                          
                          <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus-within:ring-2 ring-brand-navy/20">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <input type="time" value={inlineTime || ""} onChange={e => setInlineTime(e.target.value)} className="bg-transparent border-none text-xs outline-none w-full text-zinc-800 dark:text-zinc-200" />
                          </div>
                        </div>
                        
                        {/* Nudge */}
                        <div className={cn(
                          "flex items-center gap-2 border rounded-lg px-2.5 py-1.5 transition-all",
                          inlineReminderActive
                            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 ring-1 ring-amber-200/50"
                            : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-within:ring-2 ring-brand-navy/20"
                        )}>
                          <button type="button" onClick={() => setInlineReminderActive(a => !a)} title="Set Deadline Nudge" className="shrink-0">
                            <Bell className={cn("w-3.5 h-3.5 transition-colors", inlineReminderActive ? "text-amber-500 fill-amber-400" : "text-zinc-400")} />
                          </button>
                          {inlineReminderActive ? (
                            <input type="datetime-local" value={inlineReminderTime || ""} onChange={e => setInlineReminderTime(e.target.value)} className="bg-transparent border-none text-xs outline-none w-full text-zinc-800 dark:text-zinc-200" />
                          ) : (
                            <span className="text-xs text-zinc-400 cursor-pointer" onClick={() => setInlineReminderActive(true)}>Add deadline nudge…</span>
                          )}
                        </div>
                        
                        {/* Bottom: Notes & Actions */}
                        <textarea rows={2} value={inlineNotes || ""} onChange={e => setInlineNotes(e.target.value)} placeholder="Additional notes..." className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:ring-2 ring-brand-navy/20 outline-none resize-none text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400" />
                        
                        <div className="flex gap-2 justify-end mt-1">
                          <button type="button" onClick={() => setActiveInlineCol(null)} className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors">Cancel</button>
                          <button type="submit" disabled={!inlineText.trim()} className="px-4 py-1.5 text-xs font-bold text-white bg-brand-navy hover:bg-brand-navy/90 dark:bg-brand-sage dark:text-zinc-900 dark:hover:bg-brand-sage/90 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all">Save Task</button>
                        </div>
                      </form>
                    ) : (
                      <button 
                        onClick={() => setActiveInlineCol(colKey)}
                        className="w-full flex justify-center items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-brand-navy/50 dark:hover:border-brand-navy/50 rounded-xl px-4 py-3 text-sm transition-all text-zinc-500 hover:text-brand-navy dark:hover:text-brand-sage font-medium group"
                      >
                         <Plus className="w-4 h-4 transition-transform group-hover:scale-125 group-hover:rotate-90" />
                         Add task for {new Date(colKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })}
                      </button>
                    )}
                  </div>
                
                {colKey === "BUFFER" && (
                  <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                    <div 
                      onClick={() => setIsMonthlyHorizonExpanded(!isMonthlyHorizonExpanded)}
                      className="flex items-center justify-between cursor-pointer group"
                    >
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-brand-navy dark:group-hover:text-brand-sage transition-colors">From Monthly Horizon</h4>
                      <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-300", isMonthlyHorizonExpanded && "rotate-180")} />
                    </div>
                    <AnimatePresence>
                      {isMonthlyHorizonExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex flex-col gap-2 mt-3 overflow-hidden"
                        >
                          {(() => {
                            const monthBufferKey = `MONTH_BUFFER_${currentMonthKey}`;
                            const mbItems = dataStore[monthBufferKey]?.items || [];
                            if (mbItems.length === 0) return <span className="text-xs text-zinc-500 italic px-2">No monthly horizon tasks.</span>;
                            return mbItems.map(task => (
                               <div key={task.id} className="flex items-center gap-3 p-2.5 bg-zinc-100/50 dark:bg-zinc-800/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded-lg group relative hover:border-brand-navy/30 dark:hover:border-brand-sage/40 transition-all">
                                  {renderTagDot(task.tag_id)}
                                  <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 flex-1 truncate">{task.text}</span>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 pl-2 backdrop-blur-md rounded-l-md shadow-sm">
                                    <button onClick={(e) => {
                                      e.stopPropagation();
                                      setDataStore(prev => {
                                        const mb = prev[monthBufferKey] || getEmptyDay();
                                        const wb = prev["BUFFER"] || getEmptyDay();
                                        const taskToMove = mb.items.find((t: TaskItem) => t.id === task.id);
                                        if (!taskToMove) return prev;
                                        return {
                                          ...prev,
                                          [monthBufferKey]: { ...mb, items: mb.items.filter((t: TaskItem) => t.id !== task.id) },
                                          ["BUFFER"]: { ...wb, items: [...wb.items, { ...taskToMove, due_date: "BUFFER" }] }
                                        };
                                      });
                                    }} className="flex items-center gap-1 p-1.5 hover:bg-brand-sage/20 hover:text-brand-navy dark:hover:text-brand-sage rounded-md transition-colors text-zinc-500" title="Promote to Weekly Buffer">
                                      <ArrowRightToLine className="w-3 h-3 -rotate-90" />
                                      <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline mr-1">Promote</span>
                                    </button>
                                  </div>
                               </div>
                            ));
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* UNEXPANDED TOP 5 PREVIEW */}
        {!isExpanded && (top5Items.length > 0 || paddingGhosts.length > 0) && (
          <div className="flex flex-col border-t border-zinc-100 dark:border-zinc-800/50 p-4 gap-2">
            {top5Items.map(task => {
              const isPast = !task.is_done && isOverdue(task.time, colKey);
              const isSoon = !task.is_done && isApproaching(task.time, colKey);
              return (
                <div key={`preview_${task.id}`} className={cn("flex items-center gap-2.5 px-3 py-2 bg-white/50 dark:bg-zinc-900/30 border rounded-lg", 
                  task.is_done && "opacity-50",
                  task.is_priority && task.tag_id !== goalsTagId ? "border-brand-sage dark:border-brand-sage/50" : task.tag_id === goalsTagId ? "border-slate-300 dark:border-slate-600" : "border-brand-navy border-opacity-30 dark:border-brand-navy/60"
                )}>
                   {renderTagDot(task.tag_id)}
                   <span className={cn("text-[13px] font-semibold leading-none text-zinc-800 dark:text-zinc-200 truncate", task.is_done && "line-through text-zinc-400 dark:text-zinc-500")}>
                     {task.text}
                   </span>
                   {task.time && (
                     <span className={cn(
                       "text-[11px] font-bold font-mono ml-auto shrink-0 tracking-tight",
                       isPast ? "text-red-500 animate-pulse-opacity" : isSoon ? "text-amber-500 animate-pulse-opacity" : "text-zinc-500 dark:text-zinc-400"
                     )}>
                       {task.time}
                     </span>
                   )}
                </div>
              );
            })}
            
            {paddingGhosts.map(ghost => (
              <div 
                key={`preview_g_${ghost.id}`} 
                onDoubleClick={(e) => {
                   e.stopPropagation();
                   scheduleTaskToDay(ghost, colKey);
                }}
                className="flex items-center gap-2.5 px-3 py-2 bg-zinc-50/30 dark:bg-zinc-900/10 border border-dashed border-amber-300 dark:border-amber-900 rounded-lg opacity-60 cursor-pointer hover:border-amber-400 hover:opacity-100 transition-all group"
                title="Double click to solidify"
              >
                 <Star className={cn("w-3.5 h-3.5 shrink-0", ghost.is_priority ? "text-amber-500 fill-amber-500" : "text-zinc-300 dark:text-zinc-700")} />
                 <span className="text-[13px] font-semibold leading-none text-zinc-600 dark:text-zinc-400 truncate">{ghost.text}</span>
                 {ghost.time && (
                   <span className="text-[11px] font-bold font-mono ml-auto shrink-0 tracking-tight text-amber-600/60 dark:text-amber-500/60">
                      {ghost.time}
                   </span>
                 )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!hasMounted) return null;

  return (
    <div className="flex min-h-screen justify-center bg-zinc-100 font-sans dark:bg-black p-4 sm:p-8 relative w-full">

      {/* Master Task Bank Slide-Out */}
      <div className={cn("fixed top-0 right-0 h-full w-[400px] bg-white dark:bg-zinc-950 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 transition-transform duration-300 z-50 flex flex-col pl-safe pb-safe", isBankOpen ? "translate-x-0" : "translate-x-full")}>
        <div className="flex flex-col gap-3 p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 drop-shadow-sm z-10 w-full shrink-0">
          <div className="flex items-center justify-between text-brand-navy dark:text-zinc-200">
            <div className="flex items-center gap-3">
              <Library className="w-5 h-5" />
              <h2 className="text-xl font-bold tracking-tight">Task Bank</h2>
            </div>
            <button onClick={() => closeTaskBank()} className="p-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 mt-2">
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
          ) : sortedTagKeys.length === 0 ? (
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
          
          {expandedHeaders.includes("meal-bank") && (() => {
            const filteredAndSortedMeals = mealBank
              .filter(m => mealFilterType === "ALL" || m.type === mealFilterType)
              .filter(m => {
                 if(!mealSearchQuery.trim()) return true;
                 const query = mealSearchQuery.toLowerCase();
                 if(m.name.toLowerCase().includes(query)) return true;
                 if(m.ingredients && m.ingredients.some(ing => ing.toLowerCase().includes(query))) return true;
                 return false;
              })
              .sort((a,b) => (b.planCount || 0) - (a.planCount || 0));

            return (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                
                <div className="flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/50 pb-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Filters</span>
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 p-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                      {(["ALL", "B", "L", "D", "S"] as const).map(f => (
                        <button
                          key={`mb-f-${f}`}
                          onClick={() => setMealFilterType(f)}
                          className={cn("px-2 py-1 text-[10px] font-bold rounded transition-colors", mealFilterType === f ? "bg-brand-sage text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
                        >
                          {f === "ALL" ? "All" : f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search meals or ingredients..." value={mealSearchQuery} onChange={e => setMealSearchQuery(e.target.value)} className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-2 py-1.5 focus:outline-none focus:border-brand-sage text-zinc-900 dark:text-zinc-100" />
                  </div>
                </div>

                {filteredAndSortedMeals.length === 0 ? (
                  <div className="text-center py-6 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <Utensils className="w-6 h-6 text-zinc-300 dark:text-zinc-700 mb-2 opacity-50" />
                    <span className="text-xs font-medium text-zinc-500">No meals found. Add a new one?</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {(["B", "L", "D", "S"] as const).map(cat => {
                      const catMeals = filteredAndSortedMeals.filter(m => m.type === cat);
                      if (catMeals.length === 0) return null;
                      return (
                        <div key={`cat-${cat}`} className="flex flex-col gap-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 pl-1 border-b border-zinc-200 dark:border-zinc-800/50 pb-1">
                            {cat === "B" ? "Breakfast" : cat === "L" ? "Lunch" : cat === "D" ? "Dinner" : "Snacks"}
                          </h4>
                          {catMeals.map(meal => (
                            <div key={meal.id} className="group relative flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-brand-navy/50 transition-all">
                              <div className="flex items-start justify-between">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                    {meal.name}
                                    <span className="text-[10px] font-bold bg-brand-sage/10 text-brand-sage px-1.5 py-0.5 rounded uppercase">{meal.type === 'B' ? 'Brkfst' : meal.type === 'L' ? 'Lunch' : meal.type === 'D' ? 'Dinner' : 'Snack'}</span>
                                    {(meal.planCount || 0) > 0 && (
                                      <span className="text-[10px] font-bold text-amber-500/70 border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5" title={`${meal.planCount} times planned`}>
                                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> {meal.planCount}
                                      </span>
                                    )}
                                  </span>
                                  {meal.ingredients && meal.ingredients.length > 0 && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{meal.ingredients.join(', ')}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => {
                                      const nextMap: Record<MealType, MealType> = { "B": "L", "L": "D", "D": "S", "S": "B" };
                                      setMealBank(prev => prev.map(m => m.id === meal.id ? { ...m, type: nextMap[meal.type] } : m));
                                    }}
                                    className="p-1.5 text-zinc-400 hover:text-brand-sage transition-all" title="Cycle Category"
                                  >
                                    <Tag className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setMealBank(prev => prev.filter(m => m.id !== meal.id))} className="p-1.5 text-zinc-400 hover:text-red-500 transition-all" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              
              <div className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <input 
                  type="text" 
                  placeholder="Meal Name" 
                  value={newMealName} 
                  onChange={e => setNewMealName(e.target.value)} 
                  onKeyDown={e => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      mealIngRef.current?.focus();
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if(!newMealName.trim()) return;
                      setMealBank(prev => [...prev, { id: `mb_${Date.now()}`, name: newMealName.trim(), type: newMealType, ingredients: newMealIngs.split(',').map(s=>s.trim()).filter(s=>s) }]);
                      setNewMealName(''); setNewMealIngs('');
                    }
                  }}
                  className="w-full text-sm bg-transparent border-b border-zinc-200 dark:border-zinc-700 px-1 py-1.5 focus:outline-none focus:border-brand-sage text-zinc-900 dark:text-zinc-100" 
                />
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1.5 p-1 bg-zinc-100/50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-800/80">
                    {(["B", "L", "D", "S"] as const).map(type => (
                      <button
                        key={`add-pill-${type}`}
                        type="button"
                        onClick={() => setNewMealType(type)}
                        className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all uppercase tracking-widest", newMealType === type ? "bg-white dark:bg-zinc-700 shadow-sm text-brand-navy dark:text-zinc-200" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
                      >
                        {type === "B" ? "Brkfst" : type === "L" ? "Lunch" : type === "D" ? "Dinner" : "Snack"}
                      </button>
                    ))}
                  </div>
                  <input 
                    ref={mealIngRef}
                    type="text" 
                    placeholder="Ingredients (comma separated)" 
                    value={newMealIngs} 
                    onChange={e => setNewMealIngs(e.target.value)} 
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if(!newMealName.trim()) return;
                        setMealBank(prev => [...prev, { id: `mb_${Date.now()}`, name: newMealName.trim(), type: newMealType, ingredients: newMealIngs.split(',').map(s=>s.trim()).filter(s=>s), planCount: 0 }]);
                        setNewMealName(''); setNewMealIngs('');
                      }
                    }}
                    className="w-full text-xs bg-transparent border-b border-zinc-200 dark:border-zinc-700 px-1 py-1.5 focus:outline-none focus:border-brand-sage text-zinc-900 dark:text-zinc-100" 
                  />
                </div>
                <button 
                  onClick={() => {
                    if(!newMealName.trim()) return;
                    setMealBank(prev => [...prev, { id: `mb_${Date.now()}`, name: newMealName.trim(), type: newMealType, ingredients: newMealIngs.split(',').map(s=>s.trim()).filter(s=>s), planCount: 0 }]);
                    setNewMealName(''); setNewMealIngs('');
                  }} 
                  disabled={!newMealName.trim()}
                  className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-sage text-white text-xs font-bold rounded-md disabled:opacity-50 hover:bg-brand-sage/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Meal
                </button>
              </div>
            </div>
          );})()}
        </div>

        {/* ── Soft-Delete Trash Footer ── */}
        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setIsTrashOpen(o => !o)}
            className={cn(
              "w-full flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-colors",
              isTrashOpen
                ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Recently Archived
            {deletedTasks.length > 0 && (
              <span className="ml-auto bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] px-1.5 py-0.5 rounded-full">{deletedTasks.length}</span>
            )}
            <span className={cn("ml-auto text-[10px] text-zinc-400 transition-transform duration-200", isTrashOpen ? "rotate-180" : "", deletedTasks.length > 0 ? "" : "ml-auto")}>▼</span>
          </button>

          {isTrashOpen && (
            <div className="max-h-64 overflow-y-auto flex flex-col gap-2 p-4 bg-zinc-50 dark:bg-zinc-900/50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {deletedTasks.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-4 italic">No recently archived tasks.</p>
              ) : (
                deletedTasks.slice().reverse().map(task => {
                  const daysAgo = Math.floor((Date.now() - new Date(task.deletedAt).getTime()) / (1000 * 60 * 60 * 24));
                  const expiresIn = 7 - daysAgo;
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg group">
                      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate line-through">{task.text}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {expiresIn <= 1 ? "Expires today" : `${expiresIn}d left`}
                        </span>
                      </div>
                      <button
                        onClick={() => restoreDeletedTask(task)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-brand-sage bg-brand-sage/10 hover:bg-brand-sage/20 rounded-md transition-colors shrink-0"
                        title="Restore to Bank"
                      >
                        <RotateCcw className="w-3 h-3" /> Restore
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {isBankOpen && <div className="fixed inset-0 bg-black/20 dark:bg-black/60 z-40 backdrop-blur-sm transition-opacity" onClick={() => closeTaskBank()} />}

      {/* ── Weekly Stats Overlay (Insights) ── */}
      {showInsights && insightsData && (
        <div className="fixed inset-0 bg-brand-navy/80 z-[100] flex items-center justify-center p-4 sm:p-8 backdrop-blur-md transition-all">
          <div className="bg-white dark:bg-zinc-950/90 border border-brand-navy/20 dark:border-brand-sage/20 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh]">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/30">
              <h2 className="text-2xl font-black text-brand-navy dark:text-brand-sage flex items-center gap-2">
                <LineChart className="w-6 h-6" /> {insightsViewMode === 'monthly' ? 'Monthly Insights' : 'Weekly Insights'}
              </h2>
              <button onClick={() => setShowInsights(false)} className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors bg-white dark:bg-zinc-800 rounded-full shadow-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 sm:gap-8 custom-scrollbar">
              
              {/* Scope Toggle */}
              <div className="flex justify-center mb-2">
                 <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full shadow-inner border border-zinc-200 dark:border-zinc-700">
                   <button onClick={() => setInsightsViewMode('weekly')} className={cn("px-6 py-2 text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-full transition-all", insightsViewMode === 'weekly' ? "bg-white dark:bg-zinc-600 shadow-md text-brand-navy dark:text-brand-sage" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700")}>Weekly</button>
                   <button onClick={() => setInsightsViewMode('monthly')} className={cn("px-6 py-2 text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-full transition-all", insightsViewMode === 'monthly' ? "bg-white dark:bg-zinc-600 shadow-md text-brand-navy dark:text-brand-sage" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700")}>Monthly</button>
                 </div>
              </div>

              {/* 1. Energy Audit (Tag Distribution) */}
              <div className="flex flex-col gap-4 bg-zinc-50/50 dark:bg-zinc-900/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800/50">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-sm font-black text-brand-navy dark:text-brand-sage uppercase tracking-widest">{insightsViewMode === 'monthly' ? "Monthly Distribution" : "Energy Audit"}</h3>
                    <p className="text-xs text-zinc-500 font-bold mt-1">Tag distribution of completed tasks</p>
                  </div>
                  <span className="text-sm font-black text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 px-3 py-1 rounded-full shadow-sm">{insightsData.totalCompleted} Total</span>
                </div>
                
                {insightsData.totalCompleted === 0 ? (
                  <div className="w-full h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-400 italic">No tasks completed this period.</div>
                ) : (
                  <>
                  <div className="relative w-full h-10 rounded-2xl overflow-hidden flex shadow-inner border border-zinc-200 dark:border-zinc-800 saturate-150">
                    {insightsData.sortedTags.map((tag: any, i: number) => (
                      <div 
                        key={tag.id}
                        title={`${tag.name}: ${tag.count}`}
                        style={{ width: `${(tag.count / insightsData.totalCompleted) * 100}%`, backgroundColor: tag.color }}
                        className={cn("h-full transition-all group relative cursor-pointer hover:brightness-110", i > 0 && "border-l-2 border-white/20 dark:border-black/20")}
                      >
                         <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-zinc-900 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none z-10 transition-opacity font-bold">
                           {tag.name} ({Math.round((tag.count / insightsData.totalCompleted) * 100)}%)
                         </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 px-1">
                     {insightsData.sortedTags.map((tag: any) => (
                       <div key={tag.id} className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                         <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: tag.color }} />
                         {tag.name} ({Math.round((tag.count / insightsData.totalCompleted) * 100)}%)
                       </div>
                     ))}
                  </div>
                  </>
                )}
              </div>

              {/* 2. Completion Rhythm */}
              <div className="flex flex-col gap-4 pb-2 bg-zinc-50/50 dark:bg-zinc-900/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800/50">
                <div>
                  <h3 className="text-sm font-black text-brand-navy dark:text-brand-sage uppercase tracking-widest">{insightsViewMode === 'monthly' ? "Monthly Momentum" : "Completion Rhythm"}</h3>
                  <p className="text-xs text-zinc-500 font-bold mt-1">Daily completion velocity</p>
                </div>
                
                <div className="relative w-full h-32 sm:h-48 border-l-2 border-b-2 border-zinc-200 dark:border-zinc-800 mt-4 ml-8">
                   {/* Y-axis labels */}
                   <div className="absolute -left-8 bottom-[-8px] text-[10px] font-black tracking-widest text-zinc-400">0%</div>
                   <div className="absolute -left-10 top-[-8px] text-[10px] font-black tracking-widest text-zinc-400">100%</div>
                   
                   {/* Grid lines */}
                   <div className="absolute w-full h-px bg-zinc-100 dark:bg-zinc-800/50 top-1/2" />
                   
                   <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                      {/* Ghost Line (Previous Week) - Only on Weekly */}
                      {insightsViewMode === 'weekly' && insightsData.prevDailyRates.length > 0 && (
                        <polyline 
                           fill="none" 
                           stroke="var(--brand-sage)" 
                           strokeWidth="2" 
                           strokeDasharray="4 4"
                           className="opacity-30"
                           points={insightsData.prevDailyRates.map((r: number, i: number) => `${(i / (insightsData.prevDailyRates.length - 1)) * 100},${100 - r}`).join(' ')} 
                        />
                      )}
                      
                      {/* Primary Line (Current Period) */}
                      <polyline 
                         fill="none" 
                         stroke="var(--brand-navy)" 
                         strokeWidth="4" 
                         className="dark:stroke-brand-sage drop-shadow-[0_5px_8px_rgba(28,45,66,0.3)] dark:drop-shadow-[0_5px_15px_rgba(156,159,132,0.4)]"
                         points={insightsData.currentDailyRates.map((r: number, i: number) => {
                            const length = insightsData.currentDailyRates.length;
                            return `${length > 1 ? (i / (length - 1)) * 100 : 50},${100 - r}`;
                         }).join(' ')} 
                      />
                   </svg>
                   
                   {/* Data Points on Primary if Weekly */}
                   {insightsViewMode === 'weekly' && insightsData.currentDailyRates.map((h: number, i: number) => (
                      <div 
                        key={`node_${i}`} 
                        className="absolute w-2 h-2 rounded-full bg-white border-[2px] border-brand-sage shadow-sm -ml-1 -mb-1 transition-all"
                        style={{ left: `${(i / 6) * 100}%`, bottom: `${h || 0}%` }}
                      />
                   ))}

                   {/* X-axis labels roughly */}
                   <div className="absolute -bottom-6 left-0 text-[9px] font-bold text-zinc-400 uppercase">{insightsViewMode === 'monthly' ? "1st" : "Mon"}</div>
                   <div className="absolute -bottom-6 right-0 text-[9px] font-bold text-zinc-400 uppercase transform translate-x-1/2">{insightsViewMode === 'monthly' ? "End" : "Sun"}</div>
                </div>

                {insightsViewMode === 'weekly' && (
                  <div className="flex gap-4 mt-8 justify-center">
                     <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><span className="w-3 h-0.5 bg-brand-navy dark:bg-brand-sage rounded-full" /> This Week</div>
                     <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                       <svg className="w-3 h-0.5"><line x1="0" y1="0" x2="100%" y2="0" stroke="var(--brand-sage)" strokeWidth="2" strokeDasharray="3 2" /></svg> Last Week
                     </div>
                  </div>
                )}
              </div>

              {/* 3. Achievement Badges */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold text-brand-navy dark:text-brand-sage uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800 pb-2">Personal Bests</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-amber-600/70 dark:text-amber-500/70 uppercase tracking-widest">Hit Rate</span>
                      <span className="text-lg font-black text-amber-700 dark:text-amber-400">{Math.round(insightsData.priorityHitRate)}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-gradient-to-br from-brand-sage/10 to-brand-sage/5 dark:from-brand-sage/20 dark:to-brand-sage/5 border border-brand-sage/20 p-3 rounded-xl shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-brand-sage/20 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 text-brand-sage" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-brand-sage/70 uppercase tracking-widest">Streak</span>
                      <span className="text-lg font-black text-brand-sage leading-tight">{insightsData.currentStreak} Days</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-gradient-to-br from-brand-navy/5 to-transparent dark:from-brand-navy/20 dark:to-transparent border border-brand-navy/10 dark:border-brand-navy/30 p-3 rounded-xl shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-brand-navy/10 dark:bg-brand-navy/30 flex items-center justify-center shrink-0 text-brand-navy dark:text-zinc-300 font-bold text-xs uppercase">
                      {insightsData.productiveDay.date ? new Date(insightsData.productiveDay.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }) : "-"}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-brand-navy/50 dark:text-zinc-500 uppercase tracking-widest">Power Day</span>
                      <span className="text-sm font-black text-brand-navy dark:text-zinc-300 leading-tight">{insightsData.productiveDay.count > 0 ? `${insightsData.productiveDay.count} Tasks` : "None yet"}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Sunday Reset Modal ── */}
      {isSundayResetOpen && (
        <div className="fixed inset-0 bg-brand-navy/95 z-[110] flex items-center justify-center p-4 backdrop-blur-3xl transition-all shadow-[inset_0_0_100px_rgba(156,159,132,0.15)]">
          <div className="bg-zinc-950/50 border border-brand-sage/20 w-full max-w-2xl rounded-[3rem] shadow-[0_0_80px_rgba(156,159,132,0.1)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-700 max-h-[85vh] relative">
            
            {/* Progress Bar (Zen Wizard) */}
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900">
              <div className="h-full bg-brand-sage transition-all duration-700 ease-out" style={{ width: `${(sundayResetStep / 4) * 100}%` }}></div>
            </div>

            <div className="p-8 border-b border-white/5 text-center shrink-0 flex items-center justify-between relative mt-2">
              <div className="w-8"></div>
              <h2 className="text-xl font-black text-brand-sage tracking-[0.2em] uppercase flex items-center gap-3">
                <Sparkles className="w-4 h-4 opacity-70" /> {["Reflection", "The Pantry", "The Workbench", "The North Stars"][sundayResetStep - 1]}
              </h2>
              <button onClick={() => setIsSundayResetOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-500 hover:text-brand-sage hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 flex flex-col custom-scrollbar">
              {sundayResetStep === 1 && insightsData && (
                <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-right-8 duration-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 flex flex-col items-center shadow-inner">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Energy Audit</h4>
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 100 100">
                          {(() => {
                            let total = insightsData.sortedTags.reduce((acc, t) => acc + t.count, 0);
                            let currentOffset = 0;
                            if (total === 0) return <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3f3f46" strokeWidth="20" />;
                            return insightsData.sortedTags.map((tag, idx) => {
                              const dash = (tag.count / total) * 251.2;
                              const offset = currentOffset;
                              currentOffset += dash;
                              return (
                                <circle key={idx} cx="50" cy="50" r="40" fill="transparent" stroke={tag.color} strokeWidth="20"
                                  strokeDasharray={`${dash} 251.2`} strokeDashoffset={-offset} className="transition-all duration-1000" />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-2xl font-black text-brand-sage">{insightsData.totalCompleted}</span>
                          <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Total</span>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-3 justify-center">
                        {insightsData.sortedTags.map((t, i) => (
                           <div key={i} className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: t.color}}></div><span className="text-[10px] font-bold text-zinc-400">{t.name}</span></div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-between shadow-inner">
                       <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Completion Rhythm</h4>
                       <div className="w-full h-32 relative flex items-end">
                         <svg className="w-full h-full overflow-visible drop-shadow-sm" viewBox="0 0 100 100" preserveAspectRatio="none">
                           <polyline fill="none" stroke="#52525b" strokeWidth="2" strokeDasharray="4 4" opacity="0.4"
                               points={insightsData.prevDailyRates.map((r: number, i: number) => `${(i / 6) * 100},${100 - r}`).join(' ')} />
                           <polyline fill="none" stroke="#9C9F84" strokeWidth="3"
                               points={insightsData.currentDailyRates.map((r: number, i: number) => `${(i / 6) * 100},${100 - r}`).join(' ')} />
                         </svg>
                       </div>
                       <div className="w-full flex justify-between mt-4 pt-3 border-t border-white/5">
                         {['M','T','W','T','F','S','S'].map((d,i) => <span key={i} className="text-[9px] font-bold text-zinc-500">{d}</span>)}
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="text-[11px] font-bold text-brand-sage uppercase tracking-[0.15em] pl-2 opacity-80">What's one thing you're proud of this week?</label>
                    <textarea 
                      rows={2}
                      className="w-full p-5 rounded-3xl bg-white/[0.03] border border-white/10 text-white font-serif resize-none outline-none focus:border-brand-sage/50 focus:ring-1 focus:ring-brand-sage/30 transition-all placeholder:text-zinc-600 shadow-inner"
                      placeholder="I'm proud that I..."
                      value={weeklyJournal[currentWeekKey]?.proud || ""}
                      onChange={(e) => setWeeklyJournal(p => ({...p, [currentWeekKey]: { takeaway: p[currentWeekKey]?.takeaway || "", proud: e.target.value}}))}
                    />
                  </div>
                </div>
              )}

              {sundayResetStep === 2 && (() => {
                const unbought = (groceryStore[currentWeekKey]?.items || []).filter(i => !i.isGhost && !i.is_bought);
                return (
                  <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-700 h-full">
                    <p className="text-sm font-medium text-zinc-400 text-center mb-2">You have {unbought.length} un-bought items taking up mental space. Clear them out.</p>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                      {unbought.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 py-16">
                          <CheckCircle2 className="w-16 h-16 text-brand-sage mb-4" />
                          <span className="text-sm font-black uppercase tracking-widest text-brand-sage">The Pantry is Clean</span>
                        </div>
                      ) : (
                        unbought.map(item => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02] gap-4 transition-all hover:bg-white/[0.04]">
                            <span className="text-base font-bold text-zinc-200 ml-2">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => discardGroceryFromReset(item.id)} className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-transparent text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all">Expire</button>
                              <button onClick={() => moveGroceryToNextWeek(item)} className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-brand-sage/10 text-brand-sage hover:bg-brand-sage hover:text-brand-navy transition-all">Roll Over</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}

              {sundayResetStep === 3 && (() => {
                const bufferItems = dataStore["BUFFER"]?.items || [];
                return (
                  <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-700 h-full">
                    <p className="text-sm font-medium text-zinc-400 text-center mb-2">{bufferItems.length} tasks sitting in the buffer. Give them a home.</p>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 gap-4">
                      {bufferItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 py-16">
                          <CheckCircle2 className="w-16 h-16 text-brand-sage mb-4" />
                          <span className="text-sm font-black uppercase tracking-widest text-brand-sage">Workbench Clear</span>
                        </div>
                      ) : (
                        bufferItems.map(item => (
                          <div key={item.id} className="flex flex-col p-5 rounded-3xl border border-white/5 bg-white/[0.02] gap-4 shadow-sm hover:shadow-md hover:bg-white/[0.04] transition-all">
                            <span className="text-base font-bold text-white leading-snug">{item.text}</span>
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <button onClick={() => returnBufferTaskToBank(item.id)} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all">Remove Flag</button>
                              <button onClick={() => moveBufferTaskToMonday(item)} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-brand-sage text-brand-navy shadow-lg hover:scale-105 transition-all">Move to Monday</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}

              {sundayResetStep === 4 && (
                 <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-8 duration-700 h-full justify-center py-6">
                    <div className="text-center mb-6">
                      <p className="text-sm font-medium text-brand-sage opacity-80 uppercase tracking-[0.2em]">Define your week</p>
                      <h3 className="text-3xl font-black text-white mt-2">The North Stars</h3>
                    </div>
                    <div className="flex flex-col gap-6 px-4">
                      {[0, 1, 2].map((idx) => {
                         const currentStars = weeklyGoals[currentWeekKey] || ["", "", ""];
                         const starVal = currentStars[idx];
                         return (
                           <input 
                             key={idx}
                             type="text"
                             className="w-full text-center text-xl sm:text-2xl font-black bg-transparent border-b-2 border-white/10 text-white placeholder:text-white/10 focus:border-brand-sage focus:outline-none pb-4 transition-all"
                             placeholder={`Priority Target ${idx + 1}...`}
                             value={starVal}
                             onChange={(e) => {
                               const newStars = [...currentStars] as [string, string, string];
                               newStars[idx] = e.target.value;
                               setWeeklyGoals(p => ({...p, [currentWeekKey]: newStars}));
                             }}
                           />
                         );
                      })}
                    </div>
                 </div>
              )}
            </div>

            <div className="p-8 border-t border-white/5 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                 {[1,2,3,4].map(step => (
                   <div key={step} className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${sundayResetStep >= step ? "bg-brand-sage scale-110 shadow-[0_0_10px_rgba(156,159,132,0.5)]" : "bg-white/10"}`}></div>
                 ))}
               </div>
               <button 
                 onClick={() => {
                   if (sundayResetStep < 4) setSundayResetStep(s => (s + 1) as 1|2|3|4);
                   else finishSundayReset();
                 }}
                 className="px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-[0.15em] bg-white text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 transition-all flex items-center gap-2"
               >
                 {sundayResetStep === 4 ? "Begin The Week" : "Continue"} <ChevronRight className="w-4 h-4 ml-1" />
               </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly Expiry Review Modal ── */}
      {isMonthlyReviewOpen && (
        <div className="fixed inset-0 bg-brand-navy/60 z-[105] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xl transition-all">
          <div className="bg-white dark:bg-zinc-950/90 border border-brand-navy/20 dark:border-brand-sage/20 w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 sm:zoom-in-95 duration-500 max-h-[85vh] sm:max-h-[75vh] relative">
            
            <button 
              onClick={() => {
                 setIsMonthlyReviewOpen(false);
                 const todayDate = new Date();
                 localStorage.setItem('stride-last-opened-month', `${todayDate.getFullYear()}-${(todayDate.getMonth() + 1).toString().padStart(2, '0')}`);
              }} 
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors z-10"
              title="Close (tasks will remain in old month buffer)"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30 text-center shrink-0">
              <h2 className="text-2xl font-black text-brand-navy dark:text-brand-sage mb-1 tracking-tight">Monthly Review</h2>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 capitalize">
                Unfinished tasks from {previousMonthKeyReview}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col gap-4 custom-scrollbar">
               {monthlyReviewTasks.map(task => (
                 <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm gap-4">
                   <div className="flex items-center gap-3">
                     <Star className={cn("w-4 h-4 shrink-0 mt-0.5 sm:mt-0", task.is_priority ? "text-brand-sage fill-brand-sage" : "text-zinc-300 dark:text-zinc-700")} />
                     <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug">{task.text}</span>
                   </div>
                   <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button 
                        onClick={() => {
                           const todayDate = new Date();
                           const currentMonthStr = `${todayDate.getFullYear()}-${(todayDate.getMonth() + 1).toString().padStart(2, '0')}`;
                           const targetKey = `MONTH_BUFFER_${currentMonthStr}`;
                           const oldMonthBufferKey = `MONTH_BUFFER_${previousMonthKeyReview}`;
                           
                           setDataStore(prev => {
                             const oldD = prev[oldMonthBufferKey];
                             const newD = prev[targetKey] || getEmptyDay();
                             const updatedTask = { ...task, due_date: targetKey };
                             return {
                               ...prev,
                               [oldMonthBufferKey]: { ...oldD, items: oldD.items.filter(t => t.id !== task.id) },
                               [targetKey]: { ...newD, items: [...newD.items, updatedTask] }
                             };
                           });
                           
                           setMonthlyReviewTasks(prev => {
                             const next = prev.filter(t => t.id !== task.id);
                             checkMonthlyReviewCompletion(next.length);
                             return next;
                           });
                        }}
                        className="px-3 py-1.5 bg-brand-navy dark:bg-brand-sage text-white dark:text-zinc-950 text-[10px] font-bold uppercase tracking-widest rounded-md hover:scale-105 transition-all shadow-sm"
                      >
                        Roll Over
                      </button>
                      <button 
                        onClick={() => {
                           const oldMonthBufferKey = `MONTH_BUFFER_${previousMonthKeyReview}`;
                           setDataStore(prev => {
                             const oldD = prev[oldMonthBufferKey];
                             return {
                               ...prev,
                               [oldMonthBufferKey]: { ...oldD, items: oldD.items.filter(t => t.id !== task.id) }
                             };
                           });
                           
                           const mTask: MasterTask = { id: task.master_id, text: task.text, is_priority: task.is_priority, tag_id: task.tag_id, reminderTime: task.reminderTime, isReminderActive: task.isReminderActive };
                           setTaskBank(prev => [...prev, mTask]);
                           
                           setMonthlyReviewTasks(prev => {
                             const next = prev.filter(t => t.id !== task.id);
                             checkMonthlyReviewCompletion(next.length);
                             return next;
                           });
                        }}
                        className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all font-mono"
                      >
                         Return to Bank
                      </button>
                   </div>
                 </div>
               ))}
               <p className="text-center text-xs text-zinc-400 mt-2">Dismissing (X) leaves these tasks intact in their original month.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Unified Morning Launch Modal ── */}
      {isMorningHuddleOpen && (
        <div className="fixed inset-0 bg-brand-navy/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xl transition-all">
          <div className="bg-white dark:bg-zinc-950/90 border border-brand-navy/20 dark:border-brand-sage/20 w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 sm:zoom-in-95 duration-500 max-h-[85vh] sm:max-h-[75vh]">
            <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30 text-center shrink-0">
              <h2 className="text-2xl font-black text-brand-navy dark:text-brand-sage mb-1 tracking-tight">Good Morning!</h2>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 capitalize">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-8 custom-scrollbar">

              {isHuddleComplete ? (
                <div className="text-center py-16 flex flex-col items-center justify-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
                  <div className="w-16 h-16 bg-brand-sage/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-brand-sage" />
                  </div>
                  <p className="text-sm font-black text-brand-sage uppercase tracking-widest">Triage Complete</p>
                </div>
              ) : (
                <>
                  {/* Section 1: Yesterday's Leftovers */}
                  {huddleYesterdayItems.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-brand-navy dark:text-brand-sage uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800 pb-2">Yesterday's Leftovers</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">
                    You have some tasks left over from yesterday. Would you like to work on any today?
                  </p>
                  <div className="flex flex-col gap-2">
                    {huddleYesterdayItems.map(task => {
                      const isGoal = task.tag_id === goalsTagId;
                      const isPriority = task.is_priority && !isGoal;
                      const bubbleColor = isGoal ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200" : isPriority ? "bg-brand-sage/10 text-brand-sage border-brand-sage/20" : "bg-brand-navy/5 text-brand-navy dark:border-brand-navy/20 border-brand-navy/10";
                      
                      return (
                        <div 
                          key={`yest_${task.id}`} 
                          onDoubleClick={() => moveTaskToToday(task, 'yesterday')}
                          className={cn("flex flex-col gap-3 p-3.5 border rounded-xl shadow-sm transition-all select-none cursor-pointer hover:border-brand-navy/30 dark:hover:border-brand-sage/40", bubbleColor, animatingBufferId === task.id && "-translate-x-8 opacity-0")}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-sm font-semibold flex-1 leading-snug">{task.text}</span>
                            {!isGoal && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); moveYesterdayToBuffer(task); }}
                                  className="p-1 hover:scale-110 transition-transform" 
                                  title="Move to Weekly Buffer"
                                >
                                  <Inbox className="w-4 h-4 text-zinc-300 dark:text-zinc-600 hover:text-brand-navy dark:hover:text-brand-sage transition-colors" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleHuddlePriority(task.id, 'yesterday'); }}
                                  className="p-1 hover:scale-110 transition-transform" 
                                  title="Toggle Priority"
                                >
                                  <Star className={cn("w-4 h-4 transition-colors", task.is_priority ? "text-brand-sage fill-brand-sage" : "text-zinc-300 dark:text-zinc-600")} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveTaskToToday(task, 'yesterday'); }}
                              className="flex-1 py-1.5 text-[11px] font-bold bg-white/50 dark:bg-black/20 rounded-md hover:bg-white/80 dark:hover:bg-black/40 transition-colors shadow-sm border border-black/5 dark:border-white/5 uppercase tracking-wider"
                            >
                              Add to Today
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); dismissTaskFromHuddle(task.id, 'yesterday'); }}
                              className="flex-1 py-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors uppercase tracking-wider"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 2: The Buffer Check-In */}
              {huddleBufferItems.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-brand-navy dark:text-brand-sage uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800 pb-2">The Buffer Check-In</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">
                    Items in your Buffer are waiting. Move any to today's schedule?
                  </p>
                  <div className="flex flex-col gap-2">
                    {huddleBufferItems.map(task => {
                      const isGoal = task.tag_id === goalsTagId;
                      const isPriority = task.is_priority && !isGoal;
                      const bubbleColor = isGoal ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200" : isPriority ? "bg-brand-sage/10 text-brand-sage border-brand-sage/20" : "bg-brand-navy/5 text-brand-navy dark:border-brand-navy/20 border-brand-navy/10";
                      
                      return (
                        <div 
                          key={`buf_${task.id}`} 
                          onDoubleClick={() => moveTaskToToday(task, 'BUFFER')}
                          className={cn("flex flex-col gap-3 p-3.5 border rounded-xl shadow-sm transition-all select-none cursor-pointer hover:border-brand-navy/30 dark:hover:border-brand-sage/40", bubbleColor)}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-sm font-semibold flex-1 leading-snug">{task.text}</span>
                            {!isGoal && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleHuddlePriority(task.id, 'BUFFER'); }}
                                className="p-1 hover:scale-110 transition-transform shrink-0" 
                                title="Toggle Priority"
                              >
                                <Star className={cn("w-4 h-4 transition-colors", task.is_priority ? "text-brand-sage fill-brand-sage" : "text-zinc-300 dark:text-zinc-600")} />
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveTaskToToday(task, 'BUFFER'); }}
                              className="flex-1 py-1.5 text-[11px] font-bold bg-white/50 dark:bg-black/20 rounded-md hover:bg-white/80 dark:hover:bg-black/40 transition-colors shadow-sm border border-black/5 dark:border-white/5 uppercase tracking-wider"
                            >
                              Add to Today
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); dismissTaskFromHuddle(task.id, 'BUFFER'); }}
                              className="flex-1 py-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors uppercase tracking-wider"
                            >
                              Leave in Buffer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {huddleYesterdayItems.length === 0 && huddleBufferItems.length === 0 && (
                <div className="text-center py-12 flex flex-col items-center justify-center opacity-50">
                  <Star className="w-12 h-12 mb-4 text-brand-navy dark:text-brand-sage opacity-20" />
                  <p className="text-sm font-bold text-brand-navy dark:text-brand-sage uppercase tracking-widest">Workspace Clear</p>
                </div>
              )}
                </>
              )}
            </div>
            
            <div className="p-4 sm:p-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
              <button 
                onClick={() => {
                  setIsMorningHuddleOpen(false);
                  localStorage.setItem('stride-last-opened-date', getDateKey(new Date()));
                }} 
                className="w-full py-4 text-sm font-black text-white bg-brand-navy hover:bg-brand-navy/90 dark:text-zinc-900 dark:bg-brand-sage dark:hover:bg-brand-sage/90 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-widest"
              >
                Start My Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal 
          task={editingTask} 
          tags={tags} 
          onSave={handleSaveEditedTask} 
          onClose={() => setEditingTask(null)} 
        />
      )}

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <h2 className="text-xl font-bold text-brand-navy dark:text-white">New Task</h2>
              <button onClick={() => { setIsModalOpen(false); resetModal(); }} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddTaskSubmit} className="flex flex-col gap-5 p-6">
              <div className="flex gap-3 items-start">
                <button type="button" onClick={() => setNewTaskPriority(!newTaskPriority)} className="p-1 mt-0.5 hover:scale-110 transition-transform shrink-0" title="Toggle Priority">
                  <Star className={cn("w-6 h-6 transition-colors", newTaskPriority ? "text-brand-sage fill-brand-sage" : "text-zinc-300 dark:text-zinc-700")} />
                </button>
                <button type="button" onClick={() => {
                  const nextIsGoal = !newTaskIsGoal;
                  setNewTaskIsGoal(nextIsGoal);
                  if (nextIsGoal) {
                    const goalTag = tags.find((t: any) => t.name.toLowerCase() === "goals");
                    if (goalTag) setNewTaskTagId(goalTag.id);
                  } else {
                    setNewTaskTagId("");
                  }
                }} className="p-1 mt-0.5 hover:scale-110 transition-transform shrink-0" title="Toggle Goal">
                  <Target className={cn("w-6 h-6 transition-colors", newTaskIsGoal ? "text-brand-sage" : "text-zinc-300 dark:text-zinc-700")} />
                </button>
                <div className="flex-1 flex flex-col">
                  <input type="text" value={newTaskText || ""} onChange={(e) => setNewTaskText(e.target.value)} placeholder="What do you need to do?" autoFocus className="w-full text-xl font-semibold bg-transparent border-0 border-b-2 border-transparent focus:border-brand-navy dark:focus:border-brand-navy focus:ring-0 px-1 pb-1 transition-colors text-zinc-900 dark:text-white placeholder:text-zinc-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 col-span-2 sm:col-span-1 focus-within:ring-2 ring-brand-navy/20 relative">
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
                </div>
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 focus-within:ring-2 ring-brand-navy/20">
                  <CalendarIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input type="date" value={newTaskDate || ""} onChange={e => setNewTaskDate(e.target.value)} className="bg-transparent border-none text-sm outline-none w-full text-zinc-800 dark:text-zinc-200" />
                </div>
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 col-span-2 focus-within:ring-2 ring-brand-navy/20">
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input type="time" value={newTaskTime || ""} onChange={e => setNewTaskTime(e.target.value)} className="bg-transparent border-none text-sm outline-none w-full text-zinc-800 dark:text-zinc-200" />
                </div>
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
                </div>
                {/* Bell — Deadline Nudge (no due_date required) */}
                <div className={cn(
                  "flex items-center gap-2 border rounded-lg px-3 py-2 col-span-2 transition-all",
                  newTaskReminderActive
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 ring-2 ring-amber-200/50"
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-within:ring-2 ring-brand-navy/20"
                )}>
                  <button
                    type="button"
                    onClick={() => setNewTaskReminderActive(a => !a)}
                    title="Set Deadline Nudge"
                    className="shrink-0"
                  >
                    <Bell className={cn("w-4 h-4 transition-colors", newTaskReminderActive ? "text-amber-500 fill-amber-400" : "text-zinc-400")} />
                  </button>
                  {newTaskReminderActive ? (
                    <input
                      type="datetime-local"
                      value={newTaskReminderTime || ""}
                      onChange={e => setNewTaskReminderTime(e.target.value)}
                      className="bg-transparent border-none text-sm outline-none w-full text-zinc-800 dark:text-zinc-200"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm text-zinc-400 cursor-pointer" onClick={() => setNewTaskReminderActive(true)}>
                      Add deadline nudge…
                    </span>
                  )}
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

      {/* Recurring Dispatch Modal */}
      {recurringModalTask && (
        <div className="fixed inset-0 bg-brand-navy/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 border border-brand-navy/20 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <h2 className="text-xl font-bold text-brand-navy dark:text-brand-sage">Repeat Task</h2>
              <p className="text-sm text-zinc-500 font-semibold mt-1">"{recurringModalTask.text}"</p>
            </div>
            <div className="p-6 flex flex-col gap-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 block">Days of the Week</label>
                <div className="flex flex-wrap gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => setRecurringDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-bold transition-colors border",
                        recurringDays.includes(idx) ? "bg-brand-sage text-white border-brand-sage" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-brand-sage/50"
                      )}
                    >
                      {dayName}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 block">Duration (Weeks)</label>
                <input 
                  type="range" 
                  min="1" max="12" 
                  value={recurringWeeks} 
                  onChange={(e) => setRecurringWeeks(parseInt(e.target.value, 10))}
                  className="w-full accent-brand-sage"
                />
                <div className="flex justify-between text-xs font-medium text-zinc-400 mt-2">
                  <span>1 Week</span>
                  <span className="font-bold text-brand-navy dark:text-brand-sage">{recurringWeeks} Weeks</span>
                  <span>12 Weeks</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-3">
              <button onClick={() => { setRecurringModalTask(null); setRecurringDays([]); setRecurringWeeks(4); }} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Cancel</button>
              <button onClick={handleDispatchRecurring} disabled={recurringDays.length === 0} className="px-5 py-2 bg-brand-navy text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-brand-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                <ArrowRightToLine className="w-4 h-4" /> Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Toast */}
      <AnimatePresence>
        {dispatchToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-8 z-[110] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-zinc-800 dark:border-zinc-200"
          >
            <CheckCircle2 className="w-5 h-5 text-brand-sage" />
            <span className="text-sm font-bold tracking-wide">{dispatchToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Migration Toast */}
      <AnimatePresence>
        {migrationToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[110] bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700"
          >
            <span className="text-sm font-semibold tracking-wide">{migrationToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Floating Add Button */}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center z-[250] hover:scale-105 active:scale-95 transition-transform group">
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Main App */}
      <main className="flex w-full max-w-5xl flex-col bg-white shadow-2xl dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl relative z-10 transition-transform duration-300 my-auto">

        {/* Navigation Wrapper */}
        <div className="sticky top-0 z-[50] w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 shadow-sm rounded-t-xl">
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between px-4 sm:px-6 py-4 gap-y-3">
            <div className="flex items-center gap-3">
            <button onClick={handleGoToToday} className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-navy dark:text-zinc-300 bg-brand-navy/5 hover:bg-brand-navy/10 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors", isPulsingToday && "animate-pulse ring-4 ring-brand-navy/30 dark:ring-brand-sage/30")}>
              <CalendarDays className="w-4 h-4" /> Today
            </button>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full">
              <button onClick={() => setViewMode('day')} className={cn("px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200", viewMode === 'day' ? "bg-white dark:bg-zinc-700 shadow-sm text-brand-navy dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200")}>Day</button>
              <button onClick={() => setViewMode('week')} className={cn("px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200", viewMode === 'week' ? "bg-white dark:bg-zinc-700 shadow-sm text-brand-navy dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200")}>Week</button>
              <button onClick={() => setViewMode('month')} className={cn("px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200", viewMode === 'month' ? "bg-white dark:bg-zinc-700 shadow-sm text-brand-navy dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200")}>Month</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => {
              if (viewMode === 'month') {
                const nextDate = new Date(currentDate); nextDate.setMonth(nextDate.getMonth() - 1); setCurrentDate(nextDate); setSlideDirection(-1);
              } else if (viewMode === 'week') {
                shiftDate(-7);
              } else shiftDate(-1);
            }} className="p-2 text-zinc-500 hover:text-brand-navy hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200 select-none min-w-[220px] text-center">{formattedDate}</span>
            <button onClick={() => {
              if (viewMode === 'month') {
                const nextDate = new Date(currentDate); nextDate.setMonth(nextDate.getMonth() + 1); setCurrentDate(nextDate); setSlideDirection(1);
              } else if (viewMode === 'week') {
                shiftDate(7);
              } else shiftDate(1);
            }} className="p-2 text-zinc-500 hover:text-brand-navy hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowInsights(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-navy dark:text-brand-sage bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-brand-navy/40 dark:hover:border-brand-sage/40 rounded-full transition-all shadow-xl">
              <LineChart className="w-4 h-4" /> 
              <span className="hidden sm:inline">Insights</span>
            </button>
            <button onClick={() => setIsBankOpen(true)} className="relative flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-sage bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-brand-sage/40 rounded-full transition-all shadow-xl">
              <Library className="w-4 h-4" /> 
              <span className="hidden sm:inline">Task Bank</span>
              <span className="bg-brand-sage text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{taskBank.length}</span>
              {anyNudge && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-amber-400 rounded-full animate-pulse-opacity">
                  <Bell className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden flex overflow-x-auto whitespace-nowrap px-4 pb-3 gap-2 custom-scrollbar no-scrollbar">
          {['priorities', 'todos', 'goals', 'meals', 'health', 'notes'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveMobileTab(tab)}
              className={cn(
                "px-4 py-1.5 text-sm font-bold rounded-full transition-all capitalize whitespace-nowrap shrink-0",
                activeMobileTab === tab 
                  ? "bg-brand-navy text-white shadow-md ring-2 ring-brand-navy/30 dark:ring-brand-sage/30" 
                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
              )}
            >
              {tab === 'todos' ? "To Do's" : tab}
            </button>
          ))}
        </div>
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
              <div className="flex items-center gap-2">
                <span className={cn("w-3 h-3 rounded-full bg-brand-navy transition-all", pulsingOuter && "animate-dot-pulse-navy")} />
                <span className="text-zinc-600 dark:text-zinc-400">Tasks: {tasksCompleted}/{tasksArray.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("w-3 h-3 rounded-full bg-brand-sage transition-all", pulsingInner && "animate-dot-pulse-sage")} />
                <span className="text-zinc-600 dark:text-zinc-400">Prior: {prioritiesCompleted}/{prioritiesArray.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("w-3 h-3 rounded-full bg-[#475569] transition-all", pulsingCenter && "animate-dot-pulse-slate")} />
                <span className="text-zinc-600 dark:text-zinc-400">Goals: {goalsCompleted}/{goalsArray.length}</span>
              </div>
            </div>
            {/* Rings wrapper */}
            <div className="relative scale-75 origin-right">
              <ConcentricRings
                outerTotal={tasksArray.length}
                outerCompleted={tasksArray.length === 0 ? 0 : tasksCompleted}
                innerTotal={prioritiesArray.length}
                innerCompleted={prioritiesArray.length === 0 ? 0 : prioritiesCompleted}
                centerTotal={goalsArray.length}
                centerCompleted={goalsArray.length === 0 ? 0 : goalsCompleted}
                pulsingOuter={pulsingOuter}
                pulsingInner={pulsingInner}
                pulsingCenter={pulsingCenter}
                centerPercent={centerPercent}
              />
              {/* Per-ring flash overlays — each sized to approximate its ring radius */}
              {pulsingOuter && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-full rounded-full animate-ring-flash-navy" />
                </div>
              )}
              {pulsingInner && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[72%] h-[72%] rounded-full animate-ring-flash-sage" />
                </div>
              )}
              {pulsingCenter && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[44%] h-[44%] rounded-full animate-ring-flash-slate" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Columns */}
        {viewMode === 'day' ? (() => {
          const todosSection = (
            <div className="flex flex-col gap-4 flex-1">
<div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand-navy uppercase tracking-wider border-b-2 border-brand-navy/20 pb-1 w-full shrink-0">To Do's:</h2>
            </div>
<div className="flex flex-col gap-4 flex-1 touch-pan-y">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleTodoDragEnd(e, dateKey)}>
                <SortableContext items={todoRenderSlots.map((t, i) => t ? t.id : `empty-todo-slot-${i}`)} strategy={verticalListSortingStrategy}>
                  {todoRenderSlots.map((task, i) => {
                    if (task) {
                      return (
                        <SortableListItem key={task.id} id={task.id} className={cn(
                          "group border-b border-zinc-100 dark:border-zinc-800/50 isolate rounded-md transition-all duration-300 bg-transparent cursor-pointer relative overflow-hidden",
                          archivedFlashId === task.id && "bg-green-50 dark:bg-green-900/20 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                        )}>
                                <div className="relative overflow-hidden isolate w-full">
        {isTouchDevice && (
          <div className="absolute inset-y-0 right-0 flex items-stretch bg-zinc-50 dark:bg-zinc-800/50 z-0 rounded-r-xl border-l border-zinc-200 dark:border-zinc-700/50">

                               <button onClick={() => { const m = taskBank.find(t => t.id === task.master_id); if(m) setEditingTask(m); }} className="px-4 flex items-center justify-center text-zinc-400 hover:text-brand-navy hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border-r border-zinc-200 dark:border-zinc-700/50" title="Edit Task"><Edit3 className="w-5 h-5" /></button>
                               <button onClick={() => toggleDayTaskPriority(task.id)} className="px-4 flex items-center justify-center text-zinc-400 hover:text-brand-sage hover:bg-brand-sage/10 transition-colors border-r border-zinc-200 dark:border-zinc-700/50" title="Make Priority"><Star className="w-5 h-5" /></button>
                               {taskBank.some(t => t.id === task.master_id) ? (
                                 <button onClick={() => smartArchiveFromDay(task)} className="px-4 flex items-center justify-center text-zinc-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border-r border-zinc-200 dark:border-zinc-700/50" title="Archive task"><PackageCheck className="w-5 h-5" /></button>
                               ) : (
                                 <div className="border-r border-zinc-200 dark:border-zinc-700/50"></div>
                               )}
                               <button onClick={() => removeDayTask(task.id, task.master_id)} className="px-4 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete"><Trash2 className="w-5 h-5" /></button>
                            
          </div>
        )}
        <motion.div
          drag="x"
          dragConstraints={{ left: -320, right: 0 }}
          dragElastic={0.1}
          style={{ touchAction: 'pan-y' }}
          className="relative z-10 w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 rounded-xl"
        >

                            <div className="w-full shrink-0 snap-center flex items-start gap-3 pb-3 pr-2">
                              <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                                <input type="checkbox" checked={task.is_done} onChange={() => toggleDayTaskDone(task.id)} className="peer appearance-none w-5 h-5 border-2 border-brand-navy/30 rounded-md checked:bg-brand-navy checked:border-brand-navy transition-all cursor-pointer" />
                                <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              </div>
                              <div className="flex-1 flex flex-col min-w-0">
                                <span className={cn("text-foreground text-lg transition-all duration-200 select-none leading-tight mt-0.5 cursor-pointer hover:text-brand-navy dark:hover:text-brand-sage", task.is_done && "line-through text-zinc-400 dark:text-zinc-600")} onClick={() => { const m = taskBank.find(t => t.id === task.master_id); if(m) setEditingTask(m); }}>{task.text}</span>
                                {task.time && (
                                  <span className={cn(
                                    "flex items-center gap-1 text-[11px] font-medium mt-0.5 font-mono",
                                    !task.is_done && isOverdue(task.time, dateKey)
                                      ? "text-red-400 animate-pulse-opacity"
                                      : !task.is_done && isApproaching(task.time, dateKey)
                                      ? "text-amber-400 animate-pulse-opacity"
                                      : "text-zinc-400"
                                  )}>
                                    <Clock className="w-3 h-3" />{task.time}
                                  </span>
                                )}
                                {/* Confirmation tooltip — early/manual archive prompt */}
                                {archiveConfirmId === task.id && (
                                  <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Archive from Bank?</span>
                                    <button onClick={() => confirmArchive(task)} className="px-2.5 py-1 text-[11px] font-bold bg-brand-navy text-white rounded-md hover:bg-brand-navy/80 transition-colors">Yes</button>
                                    <button onClick={declineArchive} className="px-2.5 py-1 text-[11px] font-bold bg-brand-sage/20 text-brand-sage rounded-md hover:bg-brand-sage/30 transition-colors">No</button>
                                  </div>
                                )}
                              </div>
                              {renderTagDot(task.tag_id)}
                            </div>
        </motion.div>
      </div>

      {/* Desktop Hover Action Tray */}
                          <div className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-zinc-950/95 pl-2 shadow-sm rounded-l-md border border-zinc-100 dark:border-zinc-800 p-1 z-10">
                            <button onClick={() => { const m = taskBank.find(t => t.id === task.master_id); if(m) setEditingTask(m); }} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Edit Task"><Edit3 className="w-4 h-4 text-zinc-400 hover:text-brand-navy" /></button>
                            <button onClick={() => toggleDayTaskPriority(task.id)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Make Priority"><Star className="w-4 h-4 text-zinc-400 hover:text-brand-sage" /></button>
                            {taskBank.some(t => t.id === task.master_id) && (
                              <button onClick={() => smartArchiveFromDay(task)} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors" title="Archive task — marks done & removes from Bank">
                                <PackageCheck className="w-4 h-4 text-zinc-400 hover:text-green-600" />
                              </button>
                            )}
                            <button onClick={() => removeDayTask(task.id, task.master_id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors" title="Delete from day"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>
                          </div>
                        </SortableListItem>
                      );
                    } else {
                      return (
                        <SortableListItem key={`empty-todo-slot-${i}`} id={`empty-todo-slot-${i}`} isDraggingClass="opacity-50 scale-100 bg-zinc-50/50 dark:bg-zinc-800/50" className="border-b border-zinc-200 dark:border-zinc-800/50 h-10 w-full bg-transparent cursor-pointer">
                          <div className="w-full h-full"></div>
                        </SortableListItem>
                      );
                    }
                  })}
                </SortableContext>
              </DndContext>
            </div>
            </div>
          );
          
          const mealsSection = (
<>

{/* Meals */}
            {(() => {
              const currentDateObj = new Date(currentDate);
              const isToday = dateKey === getDateKey(new Date());
              const activeTimeCat = getActiveMealCategory();
              const dayMeals = dayData.meals || [];
              const activeTimeCatMealEmpty = !dayMeals.some(m => m.type === activeTimeCat);
              
              const recentMeals = new Set<string>();
              for (let i = 1; i <= 3; i++) {
                const d = new Date(currentDateObj);
                d.setDate(d.getDate() - i);
                const dk = getDateKey(d);
                (dataStore[dk]?.meals || []).forEach(m => recentMeals.add(m.text.toLowerCase()));
              }

              const intelligentSuggestions = mealBank
                .filter(m => m.type === activeTimeCat)
                .filter(m => !recentMeals.has(m.name.toLowerCase()))
                .sort((a,b) => (b.planCount || 0) - (a.planCount || 0))
                .slice(0, 3);
                
              return (
                <div className="mt-8 border-t-2 border-zinc-200 dark:border-zinc-800 pt-5 flex flex-col gap-4 shrink-0 overflow-visible">
                  <h3 className="text-md font-bold text-zinc-600 dark:text-zinc-400 italic mb-1 uppercase tracking-wider">Meals:</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6 w-full px-2 overflow-visible">
                    {renderMealBlock("B", "Breakfast")}
                    {renderMealBlock("L", "Lunch")}
                    {renderMealBlock("D", "Dinner")}
                    {renderMealBlock("S", "Snack")}
                  </div>
                  
                  {activeTimeCatMealEmpty && isToday && intelligentSuggestions.length > 0 && (
                    <div className="mt-2 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-sage" /> {activeTimeCat === 'B' ? 'Breakfast' : activeTimeCat === 'L' ? 'Lunch' : activeTimeCat === 'D' ? 'Dinner' : 'Snack'} Suggestions
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {intelligentSuggestions.map(meal => (
                          <button 
                            key={meal.id}
                            onClick={() => saveActiveMeal(activeTimeCat, meal.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-sage/10 hover:bg-brand-sage/20 text-brand-navy dark:text-brand-sage border border-brand-sage/20 rounded-full text-xs font-bold transition-all shadow-sm opacity-60 hover:opacity-100 hover:scale-105"
                          >
                            {meal.name}
                          </button>
                        ))}
                        <button onClick={() => setIsBankOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full text-xs font-bold transition-all shadow-sm opacity-60 hover:opacity-100">
                          <Search className="w-3.5 h-3.5" /> Browse Bank
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

</>
          );
          
          const prioritiesSection = (
<>

{/* Priorities */}
            <div className="p-6 border-b-2 border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-brand-sage uppercase tracking-wider mb-4 flex items-center justify-between">
                Priorities:
                <span className="text-xs font-normal text-zinc-400 normal-case bg-brand-sage/10 px-2 py-0.5 rounded-full">Top 5</span>
              </h2>
<div className="flex flex-col gap-0 touch-pan-y">
                <DndContext 
                  sensors={sensors} 
                  collisionDetection={closestCenter} 
                  onDragEnd={(e) => handlePriorityDragEnd(e, dateKey)}
                >
                  <SortableContext 
                    items={priorityRenderSlots.map((t, i) => t ? t.id : `empty-slot-${i}`)} 
                    strategy={verticalListSortingStrategy}
                  >
                    {priorityRenderSlots.map((task, i) => {
                      if (task) {
                        return (
                          <SortableListItem key={task.id} id={task.id} className={cn(
                            "group border-b border-zinc-200 dark:border-zinc-800 isolate rounded-md transition-colors duration-300 bg-transparent cursor-pointer overflow-hidden relative",
                            archivedFlashId === task.id && "bg-green-50 dark:bg-green-900/20 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                          )}>
                                  <div className="relative overflow-hidden isolate w-full">
        {isTouchDevice && (
          <div className="absolute inset-y-0 right-0 flex items-stretch bg-zinc-50 dark:bg-zinc-800/50 z-0 rounded-r-xl border-l border-zinc-200 dark:border-zinc-700/50">

                                 <button onClick={() => { const m = taskBank.find(t => t.id === task.master_id); if(m) setEditingTask(m); }} className="px-4 flex items-center justify-center text-zinc-400 hover:text-brand-navy hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border-r border-zinc-200 dark:border-zinc-700/50" title="Edit Task"><Edit3 className="w-5 h-5" /></button>
                                 <button onClick={() => toggleDayTaskPriority(task.id)} className="px-4 flex items-center justify-center text-brand-sage hover:bg-brand-sage/10 transition-colors border-r border-zinc-200 dark:border-zinc-700/50" title="Remove Priority"><Star className="w-5 h-5 fill-brand-sage" /></button>
                                 {taskBank.some(t => t.id === task.master_id) ? (
                                   <button onClick={() => smartArchiveFromDay(task)} className="px-4 flex items-center justify-center text-zinc-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border-r border-zinc-200 dark:border-zinc-700/50" title="Archive task"><PackageCheck className="w-5 h-5" /></button>
                                 ) : (
                                   <div className="border-r border-zinc-200 dark:border-zinc-700/50"></div>
                                 )}
                                 <button onClick={() => removeDayTask(task.id, task.master_id)} className="px-4 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete"><Trash2 className="w-5 h-5" /></button>
                              
          </div>
        )}
        <motion.div
          drag="x"
          dragConstraints={{ left: -320, right: 0 }}
          dragElastic={0.1}
          style={{ touchAction: 'pan-y' }}
          className="relative z-10 w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 rounded-xl"
        >

                              <div className="w-full shrink-0 snap-center flex items-center gap-3 py-3 pr-2">
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="relative flex items-center justify-center shrink-0">
                                    <input type="checkbox" checked={task.is_done} onChange={() => toggleDayTaskDone(task.id)} className="peer appearance-none w-5 h-5 border-2 border-brand-sage/40 rounded-full checked:bg-brand-sage checked:border-brand-sage transition-colors cursor-pointer" />
                                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  </div>
                                  <span className="font-mono text-lg font-bold text-brand-sage/60 w-6 shrink-0 text-center">{i + 1}</span>
                                </div>
                                <div className="flex-1 flex flex-col cursor-pointer overflow-hidden min-w-0">
                                  <span className={cn("text-foreground text-lg transition-colors duration-200 select-none leading-tight truncate cursor-pointer hover:text-brand-navy dark:hover:text-brand-sage", task.is_done && "line-through text-zinc-400 dark:text-zinc-600")} onClick={() => { const m = taskBank.find(t => t.id === task.master_id); if(m) setEditingTask(m); }}>{task.text}</span>
                                  {task.time && (
                                    <span className={cn(
                                      "flex items-center gap-1 text-[11px] font-medium mt-0.5 font-mono",
                                      !task.is_done && isOverdue(task.time, dateKey)
                                        ? "text-red-400 animate-pulse-opacity"
                                        : !task.is_done && isApproaching(task.time, dateKey)
                                        ? "text-amber-400 animate-pulse-opacity"
                                        : "text-zinc-400"
                                    )}>
                                      <Clock className="w-3 h-3" />{task.time}
                                    </span>
                                  )}
                                  {archiveConfirmId === task.id && (
                                    <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Archive from Bank?</span>
                                      <button onClick={() => confirmArchive(task)} className="px-2.5 py-1 text-[11px] font-bold bg-brand-navy text-white rounded-md hover:bg-brand-navy/80 transition-colors">Yes</button>
                                      <button onClick={declineArchive} className="px-2.5 py-1 text-[11px] font-bold bg-brand-sage/20 text-brand-sage rounded-md hover:bg-brand-sage/30 transition-colors">No</button>
                                    </div>
                                  )}
                                </div>
                                {renderTagDot(task.tag_id)}
                              </div>
        </motion.div>
      </div>

      {/* Desktop Hover Action Tray */}
                            <div className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-zinc-950/95 pl-2 shadow-sm rounded-l-md border border-zinc-100 dark:border-zinc-800 p-1 z-10">
                              <button onClick={() => { const m = taskBank.find(t => t.id === task.master_id); if(m) setEditingTask(m); }} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Edit Task"><Edit3 className="w-4 h-4 text-zinc-400 hover:text-brand-navy" /></button>
                              <button onClick={() => toggleDayTaskPriority(task.id)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Remove Priority"><Star className="w-4 h-4 text-brand-sage fill-brand-sage" /></button>
                              {taskBank.some(t => t.id === task.master_id) && (
                                <button onClick={() => smartArchiveFromDay(task)} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors" title="Archive task — marks done & removes from Bank">
                                  <PackageCheck className="w-4 h-4 text-zinc-400 hover:text-green-600" />
                                </button>
                              )}
                              <button onClick={() => removeDayTask(task.id, task.master_id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors shrink-0" title="Delete from day"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>
                            </div>
                          </SortableListItem>
                        );
                      } else {
                        return (
                          <SortableListItem key={`empty-slot-${i}`} id={`empty-slot-${i}`} isDraggingClass="opacity-50 scale-100 bg-zinc-50/50 dark:bg-zinc-800/50" className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 py-3 bg-transparent">
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-5 h-5 border-2 border-brand-sage/10 rounded-full shrink-0"></div>
                              <span className="font-mono text-lg font-bold text-brand-sage/30 w-6 shrink-0 text-center">{i + 1}</span>
                            </div>
                            <div className="flex-1"></div>
                          </SortableListItem>
                        );
                      }
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            </div>

</>
          );
          
          const goalsSection = (
<>

{/* Goals */}
            <div className="p-6 flex-1 flex flex-col gap-2 min-h-[300px]">
              <h3 className="text-md font-bold text-zinc-600 dark:text-zinc-400 italic mb-2 border-b border-zinc-200 dark:border-zinc-800/50 pb-2 flex justify-between uppercase tracking-wider">
                Goals: <Tag className="w-4 h-4 text-zinc-300" />
              </h3>

              {/* Daily Guidance Bridge (Ghost Pills) */}
              <AnimatePresence>
                {isDailyGoalFocused && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 0, height: 0 }}
                    className="flex flex-wrap gap-2 mb-2"
                  >
                    {(weeklyGoals[weekDateKeys[0]] || []).filter(g => g.trim() !== "").length > 0 ? (
                      (weeklyGoals[weekDateKeys[0]] || []).filter(g => g.trim() !== "").map((goal, idx) => (
                        <button
                          key={`ghost-goal-${idx}`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-sage/10 text-brand-sage border border-brand-sage/20 hover:bg-brand-sage/20 hover:border-brand-sage/40 transition-all text-left truncate max-w-[200px]"
                          onMouseDown={(e) => e.preventDefault()} // Prevent blur so tap registers
                          onClick={() => {
                            addGoalTask(goal);
                            setDailyGoalText("");
                            setIsDailyGoalFocused(false);
                          }}
                          title="Tap to set as Daily Goal"
                        >
                          {goal}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic px-1">No Weekly Goals set yet.</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (dailyGoalText.trim()) {
                    addGoalTask(dailyGoalText.trim());
                    setDailyGoalText("");
                  }
                }}
                className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 mb-3 shadow-sm focus-within:ring-2 focus-within:border-brand-sage/50 ring-brand-sage/20 transition-all"
              >
                <Target className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Add a Daily Goal..."
                  value={dailyGoalText}
                  onChange={e => setDailyGoalText(e.target.value)}
                  onFocus={() => setIsDailyGoalFocused(true)}
                  onBlur={() => setIsDailyGoalFocused(false)}
                  className="bg-transparent border-none outline-none w-full text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
                />
              </form>
<div className="flex flex-col gap-3 touch-pan-y">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleGoalDragEnd(e, dateKey)}>
                  <SortableContext items={goalRenderSlots.map((t, i) => t ? t.id : `empty-goal-slot-${i}`)} strategy={verticalListSortingStrategy}>
                    {goalRenderSlots.map((task, i) => {
                      if (task) {
                        return (
                          <SortableListItem key={task.id} id={task.id} className="flex items-center gap-3 group isolate cursor-pointer bg-transparent">
                            <div className="relative flex items-center justify-center shrink-0">
                              <input type="checkbox" checked={task.is_done} onChange={() => toggleDayTaskDone(task.id)} className="peer appearance-none w-4 h-4 border-2 border-zinc-300 dark:border-zinc-700 rounded-sm checked:bg-zinc-400 checked:border-zinc-400 transition-all cursor-pointer" />
                              <svg className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <span className={cn("text-base transition-all flex-1 cursor-pointer hover:text-brand-navy dark:hover:text-brand-sage", task.is_done ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-300")} onClick={() => { const m = taskBank.find(t => t.id === task.master_id); if(m) setEditingTask(m); }}>{task.text}</span>
                            <button onClick={() => removeDayTask(task.id, task.master_id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>
                          </SortableListItem>
                        );
                      } else {
                        return (
                          <SortableListItem key={`empty-goal-slot-${i}`} id={`empty-goal-slot-${i}`} isDraggingClass="opacity-50 scale-100 bg-zinc-50/50 dark:bg-zinc-800/50" className="border-b border-zinc-200 dark:border-zinc-800/50 h-8 w-full mt-2 bg-transparent cursor-pointer">
                            <div className="w-full h-full"></div>
                          </SortableListItem>
                        );
                      }
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            </div>

</>
          );
          
          const healthSection = (
<>

{/* Health & Habits */}
            <div className="p-6 border-t-2 border-zinc-200 dark:border-zinc-800 flex flex-col gap-4">
              <h3 className="text-md font-bold text-zinc-600 dark:text-zinc-400 italic mb-2 uppercase tracking-wider">Health & Habits:</h3>
              <div className="flex flex-col gap-5">

                {/* ── Water Tracker ── */}
                <div className="flex items-center gap-4 group">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-all duration-500",
                    waterGoalMet
                      ? "bg-[#9C9F84]/20 text-[#9C9F84]"
                      : "bg-blue-50 dark:bg-blue-900/30 text-blue-500"
                  )}>
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Water</span>
                      {waterGoalMet && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#9C9F84] uppercase tracking-widest bg-[#9C9F84]/10 px-2 py-0.5 rounded-full border border-[#9C9F84]/30 animate-in fade-in zoom-in duration-300">
                          <CheckCircle2 className="w-3 h-3" /> Hydrated
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "flex gap-1 rounded-lg p-1 transition-all duration-500",
                      waterGoalMet && "shadow-[0_0_15px_rgba(156,159,132,0.6)] bg-[#9C9F84]/5",
                      waterJustCompleted && "animate-pulse"
                    )}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <button
                          key={`water-${i}`}
                          onClick={() => toggleDayWater(i)}
                          className={cn(
                            "w-6 h-8 rounded-full border-2 transition-all duration-300",
                            i < dayData.water
                              ? waterGoalMet
                                ? "bg-[#9C9F84] border-[#9C9F84] scale-100 shadow-[0_0_8px_rgba(156,159,132,0.6)]"
                                : "bg-blue-500 border-blue-500 scale-100 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                              : waterGoalMet
                                ? "border-[#9C9F84]/30 bg-transparent hover:border-[#9C9F84]/60 scale-95"
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

</>
          );
          
          const notesSection = (
<>

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

</>
          );
          
          const mobileTabs = ['priorities', 'todos', 'goals', 'meals', 'health', 'notes'];
          const activeIdx = mobileTabs.indexOf(activeMobileTab);
          
          return (
            <>
              {currentDate.getDay() === 0 && (
                <div className="w-full bg-brand-sage/10 border-b-2 border-brand-sage/20 p-4 shrink-0 flex flex-col gap-2">
                  <h3 className="text-sm font-bold text-brand-sage uppercase tracking-widest flex items-center gap-2">
                    <Star className="w-4 h-4" /> Weekly Goals Recap
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {[0, 1, 2].map(idx => {
                      const goal = (weeklyGoals[weekDateKeys[0]] || [])[idx];
                      const hits = (weeklyGoalHits[weekDateKeys[0]] || [])[idx] || 0;
                      if (!goal) return null;
                      return (
                        <div key={`recap-${idx}`} className="flex items-center gap-2 bg-white/70 dark:bg-zinc-900/70 rounded-lg px-3 py-2 border border-brand-sage/20 shadow-sm">
                          <div className={cn("w-3 h-3 rounded-full shrink-0", hits > 0 ? "bg-brand-sage shadow-[0_0_8px_rgba(156,159,132,0.8)]" : "bg-zinc-300 dark:bg-zinc-700")} />
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{goal}</span>
                          <span className="text-xs font-bold text-brand-sage bg-brand-sage/20 px-1.5 py-0.5 rounded-md ml-2">{hits} hit{hits !== 1 ? 's' : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isMobile ? (
                <div className="flex flex-col flex-1 shrink-0 overflow-hidden relative touch-pan-y" style={{ height: 'calc(100vh - 180px)' }}>
                  <motion.div
                    className="flex w-[600%] h-full items-start"
                    animate={{ x: `-${activeIdx * (100 / 6)}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden">{prioritiesSection}</div>
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden p-6">{todosSection}</div>
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden">{goalsSection}</div>
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden p-6">{mealsSection}</div>
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden">{healthSection}</div>
                    <div className="w-1/6 shrink-0 h-full overflow-y-auto overflow-x-hidden">{notesSection}</div>
                  </motion.div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col lg:flex-row flex-1 shrink-0">
                    <div className={cn(
                      "flex-[1.2] overflow-x-hidden border-r-2 border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4 transition-all duration-300",
                      migratedDate === dateKey && "ring-4 ring-brand-navy dark:ring-brand-navy/50 bg-brand-navy/5 scale-[1.02] z-30 shadow-[0_0_20px_rgba(0,0,128,0.2)] rounded-2xl border-transparent"
                    )}>
                      {todosSection}
                      {mealsSection}
                    </div>
                    <div className="flex-1 flex flex-col border-none overflow-x-hidden">
                      {prioritiesSection}
                      {goalsSection}
                      {healthSection}
                    </div>
                  </div>
                  {notesSection}
                </>
              )}
            </>
          );
        })() : viewMode === 'week' ? (
          <div className="flex w-full h-full flex-1 overflow-y-auto overflow-x-hidden p-6 gap-6 pb-12 flex-col items-start bg-zinc-100/50 dark:bg-zinc-950/20 mt-4 custom-scrollbar">
            <div className="w-full shrink-0 -mb-2 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-black text-brand-navy dark:text-brand-sage tracking-tight flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 opacity-70" />
                {new Date(weekDateKeys[0] + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                <span className="text-zinc-400 dark:text-zinc-600 font-normal mx-1">—</span>
                {new Date(weekDateKeys[6] + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                {drilledFromMonth && (
                  <button onClick={() => { setViewMode('month'); setDrilledFromMonth(false); }} className="px-3 py-1.5 mr-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-navy bg-brand-navy/10 hover:bg-brand-navy/20 dark:text-brand-sage dark:bg-brand-sage/10 dark:hover:bg-brand-sage/20 rounded-full shadow-sm transition-all hover:-translate-x-1">
                    <FolderUp className="w-3.5 h-3.5" /> Back to Month
                  </button>
                )}
                {currentDate.getDay() === 0 && (
                  <button onClick={() => setIsSundayResetOpen(true)} className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white bg-brand-navy dark:bg-brand-sage dark:text-zinc-950 rounded-full shadow-sm hover:scale-105 transition-all">
                    <Sparkles className="w-3.5 h-3.5" /> Start Sunday Reset
                  </button>
                )}
                <button onClick={() => shiftDate(-7)} className="p-2 text-zinc-500 hover:text-brand-navy hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-all bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => shiftDate(7)} className="p-2 text-zinc-500 hover:text-brand-navy hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-all bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={weekDateKeys[0]}
                custom={slideDirection}
                initial={{ opacity: 0, x: slideDirection * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -slideDirection * 20 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="w-full flex-1 flex flex-col gap-6"
              >
                {(() => {
                  const allWeeklyTasksCount = weekDateKeys.reduce((acc, date) => acc + getDayData(date).items.length, 0);

                  return (
                    <>
                      {/* WEEKLY GOALS SECTION */}
                      <div className="w-full shrink-0 flex flex-col bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md rounded-2xl shadow-sm border border-brand-sage/40 overflow-hidden">
                        <div className="p-4 bg-brand-sage/10 dark:bg-brand-sage/5 border-b border-brand-sage/20 flex items-center gap-3">
                <Target className="w-5 h-5 text-brand-sage" />
                <h3 className="text-lg font-black uppercase tracking-widest text-brand-sage">Weekly Goals</h3>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {[0, 1, 2].map(idx => {
                  const currentGoalsofWeek = weeklyGoals[weekDateKeys[0]] || ["", "", ""];
                  const hits = (weeklyGoalHits[weekDateKeys[0]] || [])[idx] || 0;
                  return (
                    <div key={`wg-${idx}`} className={cn(
                      "flex items-center gap-3 border rounded-xl px-3 py-2.5 shadow-sm focus-within:ring-1 transition-all",
                      hits > 0 ? "bg-brand-sage/10 border-brand-sage/40 ring-brand-sage/30 shadow-[0_0_15px_rgba(156,159,132,0.15)]" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-within:border-brand-sage/50 ring-brand-sage/30"
                    )}>
                      <div className="w-6 h-6 rounded-full bg-brand-sage/20 text-brand-sage flex items-center justify-center font-mono text-xs font-bold shrink-0">{idx + 1}</div>
                      <input 
                        type="text" 
                        placeholder={`Weekly Goal ${idx + 1}...`}
                        value={currentGoalsofWeek[idx]}
                        onChange={(e) => {
                          const newGoals = [...currentGoalsofWeek] as [string, string, string];
                          newGoals[idx] = e.target.value;
                          setWeeklyGoals(prev => ({ ...prev, [weekDateKeys[0]]: newGoals }));
                        }}
                        className="bg-transparent border-none outline-none w-full text-zinc-800 dark:text-zinc-200 font-semibold placeholder:text-zinc-400"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

                      {allWeeklyTasksCount === 0 && (
                        <div className="w-full shrink-0 flex flex-col items-center justify-center py-12 px-6 bg-white/50 dark:bg-zinc-950/30 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-center">
                          <div className="w-16 h-16 bg-brand-navy/5 text-brand-navy dark:bg-brand-sage/10 dark:text-brand-sage rounded-full flex items-center justify-center mb-4">
                            <CalendarDays className="w-8 h-8" />
                          </div>
                          <h3 className="text-lg font-black text-brand-navy dark:text-brand-sage uppercase tracking-widest mb-1">Fresh Start</h3>
                          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No tasks planned yet. Ready to fill the week?</p>
                        </div>
                      )}

                      {["BUFFER", ...weekDateKeys].map(renderWeekCard)}

            {/* ── Grocery List Section ── */}
            <div className="w-full shrink-0 flex flex-col bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md rounded-2xl shadow-sm border border-brand-navy/20 overflow-hidden mt-2">
              <div className="p-4 bg-brand-navy/5 dark:bg-brand-navy/10 border-b border-brand-navy/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-brand-navy dark:text-brand-sage" />
                  <h3 className="text-lg font-black uppercase tracking-widest text-brand-navy dark:text-brand-sage">Grocery List</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => clearBoughtGroceries()} className="text-xs font-bold text-zinc-500 hover:text-red-500 transition-colors uppercase">
                    Clear Bought
                  </button>
                  <button onClick={() => setIsShoppingMode(!isShoppingMode)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border", isShoppingMode ? "bg-brand-navy text-white border-brand-navy scale-105" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-brand-navy/50")}>
                    <ShoppingBag className="w-3.5 h-3.5" /> {isShoppingMode ? "Shopping Mode" : "List Mode"}
                  </button>
                </div>
              </div>
              
              <div className="p-4 flex flex-col gap-3">
                <form 
                  onSubmit={(e) => { e.preventDefault(); addSolidGrocery(newGroceryName); setNewGroceryName(""); }}
                  className="flex items-center gap-1.5 px-3 py-2 border-b border-brand-navy/10 dark:border-brand-sage/20 bg-white/50 dark:bg-zinc-950/50 mb-2 group transition-colors focus-within:bg-white dark:focus-within:bg-zinc-900 rounded-md"
                >
                  <button type="submit" className="p-1 rounded-md text-zinc-400 hover:text-brand-navy hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Add Item">
                    <Plus className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    placeholder="+ Add item (e.g., Milk, Eggs)"
                    value={newGroceryName}
                    onChange={e => setNewGroceryName(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-sm font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  />
                </form>

                <div className="flex flex-col gap-1.5">
                  {currentGroceryList.length === 0 ? (
                    <div className="text-center text-sm text-zinc-400 italic py-4">Your grocery list is empty.</div>
                  ) : (
                    currentGroceryList.map(item => (
                      <div 
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if(item.isGhost) solidifyGhost(item.name);
                          else toggleGroceryBought(item.id);
                        }}
                        className={cn("animate-in fade-in slide-in-from-top-2 duration-300 flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none group relative",
                          item.isGhost ? "border-dashed border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-900/10 opacity-70 hover:opacity-100 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                          : item.is_bought ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 opacity-60" 
                          : "border-brand-navy/20 dark:border-brand-sage/30 bg-white dark:bg-zinc-900 shadow-sm hover:border-brand-navy/40"
                        )}
                        title={item.isGhost ? "Click to Solidify" : "Click to Check"}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn("w-5 h-5 flex flex-col items-center justify-center shrink-0 transition-all",
                            item.isGhost ? "border-2 border-dashed border-amber-400 rounded-full" 
                            : item.is_bought ? "bg-brand-sage flex items-center justify-center rounded-full" : "border-2 border-brand-navy/40 dark:border-brand-sage/40 rounded-full"
                          )}>
                            {item.is_bought && <CheckCircle2 className="w-5 h-5 text-white bg-brand-sage rounded-full" />}
                            {item.isGhost && <Star className="w-3 h-3 text-amber-500 fill-amber-500 opacity-60" />}
                          </div>
                          <span className={cn("text-sm font-semibold transition-all truncate", 
                            item.is_bought ? "line-through text-zinc-400" 
                            : item.isGhost ? "text-amber-700 dark:text-amber-500 italic" : "text-zinc-800 dark:text-zinc-200"
                          )}>
                            {item.name}
                          </span>
                        </div>
                        {item.isGhost && !isShoppingMode && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); dismissGhost(item.name); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 rounded-md transition-colors text-amber-600 dark:text-amber-400 shrink-0"
                            title="Dismiss Suggestion"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {!item.isGhost && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setGroceryStore(prev => {
                                const weekStore = prev[currentWeekKey] || { items: [], dismissedGhosts: [] };
                                return { ...prev, [currentWeekKey]: { ...weekStore, items: weekStore.items.filter(t => t.id !== item.id) } };
                              });
                           }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors text-zinc-400 hover:text-red-500 shrink-0"
                            title="Remove completely"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
                    </>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : viewMode === 'month' ? (
          <div className="flex w-full h-full flex-1 overflow-hidden relative">
            {/* Sidebar for Milestones */}
            <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-6 flex flex-col gap-6 overflow-y-auto hidden lg:flex shrink-0 z-10">
              <h3 className="text-xs font-black text-brand-sage uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4" /> Monthly Milestones
              </h3>
              <div className="flex flex-col gap-4">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const currentList = monthlyMilestones[currentMonthKey] || ["", "", "", "", ""];
                  return (
                    <div key={idx} className="flex gap-2 isolate group">
                      <div className="w-6 h-6 rounded-full bg-brand-sage/10 text-brand-sage font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-brand-sage/20">{idx + 1}</div>
                      <input 
                         ref={(el) => { milestoneRefs.current[idx] = el; }}
                         type="text"
                         className="flex-1 bg-transparent text-xs font-bold text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-b focus:border-brand-sage focus:bg-brand-sage/5 focus:ring-1 focus:ring-brand-sage focus:ring-offset-2 focus:ring-offset-zinc-50 dark:focus:ring-offset-zinc-900 rounded-sm px-1.5 resize-none transition-all py-0.5"
                         placeholder={`Anchor ${idx + 1}...`}
                         value={currentList[idx] || ""}
                         onChange={(e) => {
                            const newList = [...currentList];
                            newList[idx] = e.target.value;
                            setMonthlyMilestones(p => ({...p, [currentMonthKey]: newList}));
                         }}
                         onKeyDown={(e) => {
                           if (e.key === "Enter" || (!e.shiftKey && e.key === "Tab")) {
                             e.preventDefault();
                             if (idx < 4) {
                               milestoneRefs.current[idx + 1]?.focus();
                             } else if (e.key === "Enter") {
                               handleSaveMilestones();
                               e.currentTarget.blur();
                             }
                           } else if (e.shiftKey && e.key === "Tab") {
                             if (idx > 0) {
                               e.preventDefault();
                               milestoneRefs.current[idx - 1]?.focus();
                             }
                           }
                         }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 flex flex-col overflow-hidden bg-zinc-100/40 dark:bg-zinc-950/60 p-4 sm:p-6 lg:p-8 z-0">
               <div className="grid grid-cols-[44px_repeat(7,1fr)] gap-2 mb-2 w-full shrink-0">
                  {['', 'M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-[10px] sm:text-xs font-black uppercase text-zinc-400 tracking-widest">{day}</div>
                  ))}
               </div>
               
               <div ref={monthContainerRef} className="flex-1 overflow-y-auto custom-scrollbar w-full relative">
                 <AnimatePresence mode="wait" custom={slideDirection}>
                   <motion.div
                     key={currentMonthKey}
                     custom={slideDirection}
                     initial={{ opacity: 0, x: slideDirection * 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -slideDirection * 20 }}
                     transition={{ duration: 0.2, ease: "easeInOut" }}
                     className="grid grid-cols-[44px_repeat(7,1fr)] gap-2 sm:gap-3 lg:gap-4 auto-rows-[minmax(80px,1fr)] w-full pb-16"
                     drag="x"
                     dragConstraints={{ left: 0, right: 0 }}
                     dragElastic={0.2}
                     onDragEnd={(e, { offset, velocity }) => {
                       const swipe = swipePower(offset.x, velocity.x);
                       if (swipe < -swipeConfidenceThreshold) {
                         const nextDate = new Date(currentDate); nextDate.setMonth(nextDate.getMonth() + 1); setCurrentDate(nextDate); setSlideDirection(1);
                       } else if (swipe > swipeConfidenceThreshold) {
                         const nextDate = new Date(currentDate); nextDate.setMonth(nextDate.getMonth() - 1); setCurrentDate(nextDate); setSlideDirection(-1);
                       }
                     }}
                   >
                     {(() => {
                        const mKeys = monthDateKeys;
                        return mKeys.map((mKey, index) => {
                          const isCurrentMonth = mKey.startsWith(currentMonthKey);
                          const isToday = mKey === getDateKey(new Date());
                          
                          const storedDay = dataStore[mKey] || { items: [], meals: [], completedSteps: 0, waterOunces: 0, notesText: "" };
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
                          });
                          const dayPriorities = dayItems.filter(i => i.is_priority);
                          
                          const totalPri = dayPriorities.length;
                          const completedPri = dayPriorities.filter(i => i.is_done).length;
                          
                          const allPrioritiesCompleted = totalPri > 0 && completedPri === totalPri;
                          
                          return (
                            <React.Fragment key={`week_frag_${mKey}`}>
                              {index % 7 === 0 && (
                                <div className="flex items-center justify-center h-full">
                                  <button
                                    onClick={() => {
                                      if (monthContainerRef.current) {
                                        monthScrollRef.current = monthContainerRef.current.scrollTop;
                                      }
                                      setDrilledFromMonth(true);
                                      const weekStart = new Date(mKeys[index] + 'T00:00:00');
                                      setCurrentDate(weekStart);
                                      setViewMode('week');
                                    }}
                                    className="flex flex-col items-center justify-center w-full h-full min-h-[80px] rounded-xl text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-brand-navy dark:hover:text-brand-sage transition-all group"
                                    title="Drill down to Week"
                                  >
                                    <span className="text-[10px] font-bold group-hover:hidden tracking-tighter">W{(index / 7) + 1}</span>
                                    <ArrowRightToLine className="w-4 h-4 hidden group-hover:block" />
                                  </button>
                                </div>
                              )}
                              <div 
                                onDoubleClick={() => {
                                 const jumpDate = new Date(mKey + 'T00:00:00');
                                 setCurrentDate(jumpDate);
                                 setViewMode('day');
                                 if (isBankOpen) closeTaskBank();
                              }}
                              onTouchStart={() => {}}
                              onContextMenu={(e) => {
                                 e.preventDefault();
                                 const jumpDate = new Date(mKey + 'T00:00:00');
                                 setCurrentDate(jumpDate);
                                 setViewMode('day');
                                 if (isBankOpen) closeTaskBank();
                              }}
                              onClick={() => {
                                setPeekDate(mKey);
                                setIsPeekOpen(true);
                              }}
                              className={cn(
                                "flex flex-col relative rounded-xl sm:rounded-2xl border transition-all duration-300 md:min-h-[100px] cursor-pointer group active:scale-95 shadow-sm overflow-hidden",
                                isCurrentMonth ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" : "bg-transparent border-transparent opacity-30 pointer-events-none",
                                isToday && isCurrentMonth && "ring-2 ring-brand-sage border-transparent shadow-[0_0_15px_rgba(156,159,132,0.2)]",
                                allPrioritiesCompleted && isCurrentMonth && !isToday && "shadow-[inset_0_0_20px_rgba(34,197,94,0.1)] border-green-500/20 bg-green-50/10 dark:bg-green-900/5",
                                pulsedDates.includes(mKey) && "ring-4 ring-brand-sage dark:ring-brand-sage/50 bg-brand-sage/10 dark:bg-brand-sage/20 transition-none z-20 shadow-[0_0_20px_rgba(156,159,132,0.4)]",
                                migratedDate === mKey && "ring-4 ring-brand-navy dark:ring-brand-navy/50 bg-brand-navy/10 scale-[1.05] z-30 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,128,0.3)]",
                                "hover:border-brand-navy/30 dark:hover:border-brand-sage/40 hover:shadow-md"
                              )}
                            >
                               {/* Desktop priorities */ }
                               <div className="absolute top-2 right-2 flex flex-col items-end z-10 w-full px-2" style={{ pointerEvents: 'none' }}>
                                  <span className={cn(
                                    "font-black tracking-tighter text-lg leading-none transition-colors",
                                    isToday ? "text-brand-sage drop-shadow-md" : "text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 dark:group-hover:text-zinc-500",
                                    allPrioritiesCompleted && !isToday && "text-green-600/40 dark:text-green-400/40"
                                  )}>
                                    {parseInt(mKey.split('-')[2], 10)}
                                  </span>
                               </div>
                               
                               {/* Fill space natively */}
                               <div className="flex-1 mt-6 px-2 pb-2 flex flex-col gap-1 w-full relative z-20 pointer-events-none">
                                  {/* Mobile Single Dot indicator */}
                                  <div className="flex sm:hidden items-end justify-center h-full w-full">
                                    {dayItems.length > 0 && <div className={cn("w-2 h-2 rounded-full", allPrioritiesCompleted ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-brand-navy dark:bg-brand-sage")} />}
                                  </div>
                                  
                                  {/* Desktop Items */}
                                  <div className="hidden sm:flex flex-col gap-0.5 w-full items-start overflow-hidden pt-1">
                                    {dayPriorities.slice(0, 3).map((pri, idx) => (
                                       <div key={idx} className="flex items-center gap-1.5 w-full max-w-full">
                                         <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-in zoom-in duration-300 fill-mode-both" style={{ backgroundColor: tagsById[pri.tag_id as string]?.color || '#94a3b8' }} />
                                         <span className={cn("text-[9px] font-bold truncate leading-none pt-[1px]", pri.is_done ? "line-through text-zinc-400 dark:text-zinc-600/50" : "text-zinc-600 dark:text-zinc-400")}>
                                           {pri.text}
                                         </span>
                                       </div>
                                    ))}
                                    {dayPriorities.length === 0 && dayItems.length > 0 && (
                                       <span className="text-[9px] font-bold text-zinc-400 italic">No top priorities</span>
                                    )}
                                  </div>
                               </div>
                            </div>
                          </React.Fragment>
                        );
                        });
                     })()}
                   </motion.div>
                 </AnimatePresence>
               </div>
               
               {/* ── Monthly Buffer Accordion (Below Grid) ── */}
               <div className="w-full shrink-0 flex flex-col bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md rounded-2xl shadow-sm border border-brand-navy/20 overflow-hidden mt-4">
                 <div 
                   onClick={() => setIsMonthlyBufferExpanded(!isMonthlyBufferExpanded)}
                   className="p-4 bg-brand-navy/5 dark:bg-brand-navy/10 border-b border-brand-navy/10 flex items-center justify-between cursor-pointer"
                 >
                   <div className="flex items-center gap-3">
                     <Target className="w-5 h-5 text-brand-navy dark:text-brand-sage" />
                     <h3 className="text-lg font-black uppercase tracking-widest text-brand-navy dark:text-brand-sage">Monthly Buffer</h3>
                   </div>
                   <ChevronDown className={cn("w-5 h-5 text-zinc-400 transition-transform duration-300", isMonthlyBufferExpanded && "rotate-180")} />
                 </div>
                 <AnimatePresence>
                   {isMonthlyBufferExpanded && (
                     <motion.div 
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: "auto", opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="flex flex-col border-t border-zinc-100 dark:border-zinc-800/50 overflow-hidden"
                     >
                       <div className="p-4 flex flex-col gap-3">
                         {(() => {
                           const mBufferKey = `MONTH_BUFFER_${currentMonthKey}`;
                           const mbItems = dataStore[mBufferKey]?.items || [];
                           return mbItems.map((task: TaskItem) => (
                             <div 
                               key={task.id} 
                               className={cn("flex items-start gap-3 p-3.5 bg-white dark:bg-zinc-900 border rounded-xl hover:shadow-md transition-shadow group relative", 
                                 task.is_done && "opacity-50",
                                 task.is_priority && task.tag_id !== goalsTagId ? "border-brand-sage dark:border-brand-sage/50" : task.tag_id === goalsTagId ? "border-slate-300 dark:border-slate-600" : "border-brand-navy border-opacity-30 dark:border-brand-navy/60"
                               )}
                             >
                               <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                                 <input type="checkbox" checked={task.is_done} onChange={() => {
                                   setDataStore(prev => {
                                      const d = prev[mBufferKey] || getEmptyDay();
                                      const newI = d.items.map((t: TaskItem) => t.id === task.id ? {...t, is_done: !t.is_done} : t);
                                      return {...prev, [mBufferKey]: {...d, items: newI}};
                                   });
                                 }} className="peer appearance-none w-4 h-4 border-2 border-brand-navy/30 rounded-sm checked:bg-brand-navy checked:border-brand-navy transition-all cursor-pointer" />
                                 <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                               </div>
                               <div className="flex-1 flex items-center min-w-0 pr-8">
                                  <div className="flex items-center gap-2 mt-0.5 shrink-0">
                                    {renderTagDot(task.tag_id)}
                                    {(task.is_goal || task.tag_id === goalsTagId) && <Target className="w-3.5 h-3.5 text-brand-sage" />}
                                    {task.is_priority && <Star className="w-3.5 h-3.5 text-brand-sage fill-brand-sage" />}
                                  </div>
                                  <span className={cn("text-sm font-semibold leading-snug text-zinc-800 dark:text-zinc-200 ml-2", task.is_done && "line-through text-zinc-400 dark:text-zinc-500")}>
                                    {task.text}
                                  </span>
                               </div>
                               <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 pl-2 backdrop-blur-sm rounded-l-md">
                                  <button onClick={() => {
                                      setDataStore(prev => {
                                        const sb = prev[mBufferKey] || getEmptyDay();
                                        return {...prev, [mBufferKey]: {...sb, items: sb.items.filter((t: TaskItem) => t.id !== task.id)}};
                                      });
                                  }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 rounded-md transition-colors text-zinc-400"><Trash2 className="w-4 h-4" /></button>
                               </div>
                             </div>
                           ));
                         })()}
                         
                         {/* Inline Quick Add for Monthly Buffer */}
                         <div className="mt-2 shrink-0">
                           {activeInlineCol === `MONTH_BUFFER_${currentMonthKey}` ? (
                             <form onSubmit={(e) => handleInlineSubmit(e, `MONTH_BUFFER_${currentMonthKey}`)} className="flex flex-col gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-inner animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex gap-3 items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
                                  <button type="button" onClick={() => setInlinePriority(!inlinePriority)} className="p-1 mt-0.5 hover:scale-110 transition-transform shrink-0" title="Toggle Priority">
                                    <Star className={cn("w-5 h-5 transition-colors", inlinePriority ? "text-brand-sage fill-brand-sage" : "text-zinc-300 dark:text-zinc-700")} />
                                  </button>
                                  <input type="text" value={inlineText || ""} onChange={(e) => setInlineText(e.target.value)} placeholder={`Add to Monthly Buffer...`} autoFocus className="w-full text-base font-semibold bg-transparent border-none focus:ring-0 px-0 pb-1 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus-within:ring-2 ring-brand-navy/20 relative">
                                     <Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                     <select value={inlineTagId || ""} onChange={e => setInlineTagId(e.target.value)} className="bg-transparent border-none text-xs focus:ring-0 w-full text-zinc-800 dark:text-zinc-200 cursor-pointer appearance-none p-0 outline-none">
                                       <option value="">No Tag</option>
                                       {tags.map(t => <option key={`inltag_${t.id}`} value={t.id}>{t.name}</option>)}
                                     </select>
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end mt-1">
                                  <button type="button" onClick={() => setActiveInlineCol(null)} className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors">Cancel</button>
                                  <button type="submit" disabled={!inlineText.trim()} className="px-4 py-1.5 text-xs font-bold text-white bg-brand-navy hover:bg-brand-navy/90 dark:bg-brand-sage dark:text-zinc-900 dark:hover:bg-brand-sage/90 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all">Save Task</button>
                                </div>
                             </form>
                           ) : (
                             <button 
                               onClick={() => setActiveInlineCol(`MONTH_BUFFER_${currentMonthKey}`)}
                               className="w-full flex justify-center items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-brand-navy/50 dark:hover:border-brand-navy/50 rounded-xl px-4 py-3 text-sm transition-all text-zinc-500 hover:text-brand-navy dark:hover:text-brand-sage font-medium group"
                             >
                                <Plus className="w-4 h-4 transition-transform group-hover:scale-125 group-hover:rotate-90" />
                                Add task to Monthly Buffer
                             </button>
                           )}
                         </div>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
            </div>
          </div>
        ) : null}

      </main>

      {/* Peek Drawer */}
      <AnimatePresence>
        {isPeekOpen && peekDate && (
           <motion.div 
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 300 }}
               className="absolute top-auto bottom-0 left-0 right-0 mx-auto w-full sm:max-w-xl bg-white dark:bg-zinc-900 border-t border-x border-zinc-200 dark:border-zinc-800 shadow-[0_-15px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden max-h-[85vh] z-[45] pointer-events-auto rounded-t-3xl sm:rounded-t-[2.5rem]"
            >
               <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col gap-4 shrink-0">
                  <div className="flex justify-between items-start">
                     <div className="flex flex-col">
                       <span className="text-[10px] font-black tracking-widest uppercase text-brand-sage">The Peek</span>
                       <h3 className="text-xl font-black text-zinc-800 dark:text-zinc-100 mt-1">
                         {new Date(peekDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                       </h3>
                     </div>
                     <button onClick={() => setIsPeekOpen(false)} className="p-2 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <X className="w-5 h-5"/>
                     </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsBankOpen(true)} className="px-3 py-2 bg-brand-sage text-zinc-950 hover:bg-brand-sage/90 text-[11px] font-bold uppercase tracking-widest rounded-lg shadow-sm transition-all flex items-center gap-1.5">
                      <Library className="w-3.5 h-3.5"/> Plan from Bank
                    </button>
                    <button onClick={() => {
                       const jumpDate = new Date(peekDate + 'T00:00:00');
                       setCurrentDate(jumpDate);
                       setViewMode('day');
                       setIsPeekOpen(false);
                       if (isBankOpen) closeTaskBank();
                    }} className="px-3 py-2 bg-brand-navy dark:bg-zinc-800 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg shadow-sm hover:scale-105 transition-all">Jump to Day</button>
                  </div>
               </div>
               
               <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 custom-scrollbar">
                  {(() => {
                    const dStore = dataStore[peekDate] || { items: [] };
                    const topPri = dStore.items.filter((i: any) => !i.isGhost && i.is_priority);
                    if (topPri.length === 0) return <p className="text-sm text-zinc-400 italic text-center py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl m-2">Active priority goals will appear here.</p>;
                    return topPri.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 bg-white dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 p-4 rounded-xl shadow-sm">
                         <div className={cn("w-4 h-4 rounded-full border-2 shrink-0 transition-colors", p.is_done ? "bg-brand-sage border-brand-sage" : "border-zinc-300 dark:border-zinc-600")} />
                         <span className={cn("text-sm font-semibold truncate", p.is_done ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-200")}>{p.text}</span>
                         <div className="ml-auto w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tagsById[p.tag_id as string]?.color || '#94a3b8' }} />
                      </div>
                    ));
                  })()}
               </div>
               
               {/* Quick Add Form identical to Daily view */}
               <div className="p-4 sm:p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0">
                  <form onSubmit={(e) => {
                     e.preventDefault();
                     if (!inlineText.trim()) return;
                     const newMasterId = `m_${Date.now()}`;
                     const newItem: TaskItem = {
                       id: Date.now().toString(), text: inlineText.trim(), is_priority: inlinePriority, is_done: false, tag_id: inlineTagId || undefined, master_id: newMasterId, due_date: peekDate, time: inlineTime, notes: inlineNotes, isReminderActive: inlineReminderActive, reminderTime: inlineReminderTime || undefined
                     };
                     setDataStore(prev => {
                       const ds = prev[peekDate] || { items: [], meals: [], completedSteps: 0, waterOunces: 0, notesText: "" };
                       return { ...prev, [peekDate]: { ...ds, items: [...ds.items, newItem] } };
                     });
                     setInlineText("");
                     setInlinePriority(false);
                     setInlineTagId("");
                     setInlineTime("");
                     setInlineNotes("");
                     setInlineReminderActive(false);
                     setInlineReminderTime("");
                  }} className="flex flex-col gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-inner animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex gap-3 items-start border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <button type="button" onClick={() => setInlinePriority(!inlinePriority)} className="p-1 mt-0.5 hover:scale-110 transition-transform shrink-0" title="Toggle Priority">
                        <Star className={cn("w-5 h-5 transition-colors", inlinePriority ? "text-brand-sage fill-brand-sage" : "text-zinc-300 dark:text-zinc-700")} />
                      </button>
                      <input type="text" value={inlineText || ""} onChange={(e) => setInlineText(e.target.value)} placeholder={`What to do on ${new Date(peekDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}?`} className="w-full text-base font-semibold bg-transparent border-none focus:ring-0 px-0 pb-1 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus-within:ring-2 ring-brand-navy/20 relative">
                         <Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                         <select value={inlineTagId || ""} onChange={e => setInlineTagId(e.target.value)} className="bg-transparent border-none text-xs focus:ring-0 w-full text-zinc-800 dark:text-zinc-200 cursor-pointer appearance-none p-0 outline-none">
                           <option value="">No Tag</option>
                           {tags.map(t => <option key={`inltag_${t.id}`} value={t.id}>{t.name}</option>)}
                         </select>
                      </div>
                      <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus-within:ring-2 ring-brand-navy/20">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <input type="time" value={inlineTime || ""} onChange={e => setInlineTime(e.target.value)} className="bg-transparent border-none text-xs outline-none w-full text-zinc-800 dark:text-zinc-200" />
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-2 border rounded-lg px-2.5 py-1.5 transition-all", inlineReminderActive ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 ring-1 ring-amber-200/50" : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-within:ring-2 ring-brand-navy/20")}>
                      <button type="button" onClick={() => setInlineReminderActive(a => !a)} className="shrink-0"><Bell className={cn("w-3.5 h-3.5 transition-colors", inlineReminderActive ? "text-amber-500 fill-amber-400" : "text-zinc-400")} /></button>
                      {inlineReminderActive ? (
                        <input type="datetime-local" value={inlineReminderTime || ""} onChange={e => setInlineReminderTime(e.target.value)} className="bg-transparent border-none text-xs outline-none w-full text-zinc-800 dark:text-zinc-200" />
                      ) : (
                        <span className="text-xs text-zinc-400 cursor-pointer" onClick={() => setInlineReminderActive(true)}>Add deadline nudge…</span>
                      )}
                    </div>
                    <textarea rows={2} value={inlineNotes || ""} onChange={e => setInlineNotes(e.target.value)} placeholder="Additional notes..." className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:ring-2 ring-brand-navy/20 outline-none resize-none text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400" />
                    <div className="flex justify-end gap-2 mt-1">
                      <button type="button" onClick={() => {
                        setInlineText(""); setInlinePriority(false); setInlineTagId(""); setInlineTime(""); setInlineNotes(""); setInlineReminderActive(false); setInlineReminderTime("");
                      }} className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">Cancel</button>
                      <button type="submit" disabled={!inlineText.trim()} className="px-4 py-1.5 text-xs font-bold text-white bg-brand-navy hover:bg-brand-navy/90 dark:bg-brand-sage dark:text-zinc-900 dark:hover:bg-brand-sage/90 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all">Save Task</button>
                    </div>
                  </form>
               </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
