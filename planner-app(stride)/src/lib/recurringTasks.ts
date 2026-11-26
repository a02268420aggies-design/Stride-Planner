export type RecurrenceFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export type RecurringTask = {
  id: string;
  text: string;
  title?: string;
  name?: string;
  label?: string;
  tag_id?: string;
  time?: string;
  notes?: string;
  isStarred?: boolean;
  isPriority?: boolean;
  is_priority?: boolean;
  is_goal?: boolean;
  startDate: string; // YYYY-MM-DD
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[];
  endDate?: string;
  completedDates: string[];
  deletedDates?: string[];
  showOnWeek?: boolean;
  showOnMonth?: boolean;
};

export type NormalTaskItem = {
  id: string;
  master_id: string;
  text?: string;
  title?: string;
  name?: string;
  label?: string;
  is_done: boolean;
  is_priority: boolean;
  is_goal?: boolean;
  priority_rank?: number;
  todo_rank?: number;
  goal_rank?: number;
  tag_id?: string;
  due_date?: string;
  dueDate?: string;
  time?: string;
  notes?: string;
  reminderTime?: string;
  isReminderActive?: boolean;
  huddleDismissed?: boolean;
  nudgeDate?: string;
  isGhost?: boolean;
};

export type RecurringInstanceTaskItem = NormalTaskItem & {
  isRecurringInstance: true;
  recurringRuleId: string;
  completed: boolean;
  isStarred?: boolean;
  isPriority?: boolean;
};

export type ProjectedTaskItem = NormalTaskItem | RecurringInstanceTaskItem;

export const RECURRING_TASKS_STORAGE_KEY = "stride_recurring_tasks";
const LEGACY_RECURRING_TASKS_STORAGE_KEY = "stride_recurringTasks";
const LEGACY_COMPLETED_ROUTINES_STORAGE_KEY = "stride_completedRoutines";

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateParts(
  dateStr: string | undefined | null
): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const match = DATE_KEY_RE.exec(dateStr.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    check.getFullYear() !== year ||
    check.getMonth() !== month - 1 ||
    check.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function parseLocalDateStr(dateStr: string | undefined | null): Date | null {
  const parts = parseLocalDateParts(dateStr);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
}

function toUtcDayEpoch(parts: { year: number; month: number; day: number }): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function isRecurringInstance(
  task: ProjectedTaskItem | null | undefined
): task is RecurringInstanceTaskItem {
  return Boolean(
    task &&
      "isRecurringInstance" in task &&
      task.isRecurringInstance === true &&
      typeof task.recurringRuleId === "string"
  );
}

export function extractRecurringRuleId(
  taskOrId: ProjectedTaskItem | string
): string | null {
  if (typeof taskOrId !== "string") {
    if (isRecurringInstance(taskOrId)) return taskOrId.recurringRuleId;
    if (taskOrId.id.startsWith("recur_") && taskOrId.master_id) {
      return taskOrId.master_id;
    }
    return null;
  }
  if (!taskOrId.startsWith("recur_")) return null;
  // Format: recur_<ruleId>_YYYY-MM-DD
  const lastUnderscore = taskOrId.lastIndexOf("_");
  if (lastUnderscore <= 6) return null;
  return taskOrId.slice(6, lastUnderscore);
}

export function doesRuleMatchDate(rule: RecurringTask, dateStr: string): boolean {
  const targetParts = parseLocalDateParts(dateStr);
  const startParts = parseLocalDateParts(rule.startDate);
  if (!targetParts || !startParts) return false;

  if (dateStr < rule.startDate) return false;
  if (rule.endDate && parseLocalDateParts(rule.endDate) && dateStr > rule.endDate) {
    return false;
  }
  if (Array.isArray(rule.deletedDates) && rule.deletedDates.includes(dateStr)) {
    return false;
  }

  const targetUtc = toUtcDayEpoch(targetParts);
  const startUtc = toUtcDayEpoch(startParts);
  const targetDow = new Date(targetUtc).getUTCDay();
  const startDow = new Date(startUtc).getUTCDay();
  const diffDays = Math.round((targetUtc - startUtc) / MS_PER_DAY);

  const frequency: RecurrenceFrequency = rule.frequency || "weekly";
  const hasCustomDays = Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 0;
  const dowMatches = hasCustomDays
    ? rule.daysOfWeek!.includes(targetDow)
    : targetDow === startDow;

  switch (frequency) {
    case "daily":
      return true;
    case "weekly":
      return dowMatches;
    case "biweekly":
      return dowMatches && Math.floor(diffDays / 7) % 2 === 0;
    case "monthly":
      return targetParts.day === startParts.day;
    default:
      return false;
  }
}

export function projectTasksForDate(
  dateStr: string,
  dataStore: Record<string, { items?: NormalTaskItem[] } | undefined>,
  recurringTasks: RecurringTask[]
): ProjectedTaskItem[] {
  const normalItems = (dataStore[dateStr]?.items || []).filter(
    (item) => item?.isGhost !== true
  );

  // Non-calendar buffer keys only return normal tasks directly
  if (!parseLocalDateParts(dateStr)) {
    return [...normalItems];
  }

  const projectedRecurring: RecurringInstanceTaskItem[] = [];

  for (const rule of recurringTasks || []) {
    if (!doesRuleMatchDate(rule, dateStr)) continue;
    if (normalItems.some((item) => item.master_id === rule.id)) continue;

    const completed = Array.isArray(rule.completedDates)
      ? rule.completedDates.includes(dateStr)
      : false;
    const isPriority = Boolean(rule.isPriority ?? rule.isStarred ?? rule.is_priority);

    projectedRecurring.push({
      id: `recur_${rule.id}_${dateStr}`,
      master_id: rule.id,
      text: rule.text || rule.title || rule.name || rule.label || "Untitled",
      is_done: completed,
      completed,
      isRecurringInstance: true,
      recurringRuleId: rule.id,
      is_priority: isPriority,
      isPriority,
      isStarred: Boolean(rule.isStarred ?? isPriority),
      is_goal: Boolean(rule.is_goal),
      tag_id: rule.tag_id,
      time: rule.time,
      notes: rule.notes,
      due_date: dateStr,
    });
  }

  return [...normalItems, ...projectedRecurring];
}

export function toggleRecurringDateCompletion(
  rules: RecurringTask[],
  ruleId: string,
  dateStr: string
): RecurringTask[] {
  return rules.map((rule) => {
    if (rule.id !== ruleId) return rule;
    const completedDates = Array.isArray(rule.completedDates) ? rule.completedDates : [];
    const exists = completedDates.includes(dateStr);
    return {
      ...rule,
      completedDates: exists
        ? completedDates.filter((d) => d !== dateStr)
        : [...completedDates, dateStr],
    };
  });
}

export function deleteRecurringOccurrence(
  rules: RecurringTask[],
  ruleId: string,
  dateStr: string
): RecurringTask[] {
  return rules.map((rule) => {
    if (rule.id !== ruleId) return rule;
    const deletedDates = Array.isArray(rule.deletedDates) ? rule.deletedDates : [];
    if (deletedDates.includes(dateStr)) return rule;
    return {
      ...rule,
      deletedDates: [...deletedDates, dateStr],
    };
  });
}

export function deleteRecurringRule(
  rules: RecurringTask[],
  ruleId: string
): RecurringTask[] {
  return rules.filter((rule) => rule.id !== ruleId);
}

function normalizeRecurringRule(
  raw: any,
  fallbackStartDate: string,
  legacyCompletedMap?: Record<string, boolean>
): RecurringTask {
  const isPriority = Boolean(raw?.isPriority ?? raw?.isStarred ?? raw?.is_priority);
  const validFrequency: RecurrenceFrequency =
    raw?.frequency === "daily" ||
    raw?.frequency === "weekly" ||
    raw?.frequency === "biweekly" ||
    raw?.frequency === "monthly"
      ? raw.frequency
      : "weekly";

  const completedDatesSet = new Set<string>(
    Array.isArray(raw?.completedDates)
      ? raw.completedDates.filter((d: unknown) => typeof d === "string" && parseLocalDateParts(d))
      : []
  );

  if (legacyCompletedMap && raw?.id) {
    const prefix = `recur_${raw.id}_`;
    for (const [k, done] of Object.entries(legacyCompletedMap)) {
      if (done && k.startsWith(prefix)) {
        const dStr = k.slice(prefix.length);
        if (parseLocalDateParts(dStr)) {
          completedDatesSet.add(dStr);
        }
      }
    }
  }

  const deletedDates = Array.isArray(raw?.deletedDates)
    ? Array.from(
        new Set<string>(
          raw.deletedDates.filter((d: unknown) => typeof d === "string" && parseLocalDateParts(d))
        )
      )
    : [];

  return {
    id: String(raw?.id || `rt_${Date.now()}_${Math.random()}`),
    text: String(raw?.text || raw?.title || raw?.name || raw?.label || "Untitled"),
    tag_id: raw?.tag_id || undefined,
    time: raw?.time || undefined,
    notes: raw?.notes || undefined,
    isStarred: Boolean(raw?.isStarred ?? isPriority),
    isPriority,
    is_priority: isPriority,
    is_goal: Boolean(raw?.is_goal),
    startDate: parseLocalDateParts(raw?.startDate) ? raw.startDate : fallbackStartDate,
    frequency: validFrequency,
    daysOfWeek: Array.isArray(raw?.daysOfWeek) ? raw.daysOfWeek : undefined,
    endDate: parseLocalDateParts(raw?.endDate) ? raw.endDate : undefined,
    completedDates: Array.from(completedDatesSet),
    deletedDates,
    showOnWeek: raw?.showOnWeek ?? true,
    showOnMonth: raw?.showOnMonth ?? true,
  };
}

export function loadRecurringTasksFromStorage(todayKey: string): RecurringTask[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(RECURRING_TASKS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((raw) => normalizeRecurringRule(raw, todayKey));
      }
    }

    const legacySaved = localStorage.getItem(LEGACY_RECURRING_TASKS_STORAGE_KEY);
    if (legacySaved) {
      const parsedLegacy = JSON.parse(legacySaved);
      let legacyCompleted: Record<string, boolean> = {};
      try {
        const savedCompleted = localStorage.getItem(LEGACY_COMPLETED_ROUTINES_STORAGE_KEY);
        if (savedCompleted) legacyCompleted = JSON.parse(savedCompleted) || {};
      } catch {}
      if (Array.isArray(parsedLegacy)) {
        return parsedLegacy.map((raw) =>
          normalizeRecurringRule(raw, todayKey, legacyCompleted)
        );
      }
    }
  } catch {}
  return [];
}
