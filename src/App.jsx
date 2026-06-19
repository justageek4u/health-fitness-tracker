import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const STORAGE_KEY = "health_fitness_tracker_v3";
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const todayKey = () => new Date().toISOString().slice(0, 10);
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function appDayFromDate(dateInput = new Date()) {
  const d = new Date(dateInput);
  const n = d.getDay();
  return days[n === 0 ? 6 : n - 1];
}

const defaultState = {
  account: {
    mode: "local",
    userId: "local-user",
    displayName: "Josh",
  },
  goals: {
    calories: 2200,
    protein: 180,
    carbs: 220,
    fat: 70,
    water: 100,
    sleep: 8,
  },
  foods: [
    {
      id: uid(),
      name: "Fairlife",
      favorite: true,
      servings: [{ id: uid(), label: "1 bottle", protein: 30, carbs: 4, fat: 2.5, calories: 150 }],
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      name: "White Rice",
      favorite: true,
      servings: [
        { id: uid(), label: "1/2 cup", protein: 2, carbs: 22, fat: 0, calories: 102 },
        { id: uid(), label: "1 cup", protein: 4, carbs: 45, fat: 0, calories: 205 },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      name: "Cottage Cheese",
      favorite: true,
      servings: [{ id: uid(), label: "1 cup", protein: 26, carbs: 10, fat: 6, calories: 200 }],
      createdAt: new Date().toISOString(),
    },
  ],
  mealTemplates: [],
  foodLogs: [],
  waterLogs: [],
  weightLogs: [],
  sleepLogs: [],
  noteLogs: [],
  workoutPlan: [],
  workoutLogs: [],
  workoutSessions: [],
};

function loadState() {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      account: { ...defaultState.account, ...(parsed.account || {}) },
      goals: { ...defaultState.goals, ...(parsed.goals || {}) },
      foods: parsed.foods || defaultState.foods,
      mealTemplates: parsed.mealTemplates || [],
      foodLogs: parsed.foodLogs || [],
      waterLogs: parsed.waterLogs || [],
      weightLogs: parsed.weightLogs || [],
      sleepLogs: parsed.sleepLogs || [],
      noteLogs: parsed.noteLogs || [],
      workoutPlan: parsed.workoutPlan || [],
      workoutLogs: parsed.workoutLogs || [],
      workoutSessions: parsed.workoutSessions || [],
    };
  } catch {
    return defaultState;
  }
}

function saveState(nextState) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }
}

function groupByDay(records, dateField, reducer) {
  const map = new Map();
  records.forEach((record) => {
    const d = String(record[dateField] || "").slice(0, 10);
    if (!d) return;
    const prev = map.get(d) || { date: d };
    map.set(d, reducer(prev, record));
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function StatTile({ label, value, subtext, accent = "bg-sky-50 border-sky-100" }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accent}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {subtext ? <div className="mt-1 text-sm text-slate-600">{subtext}</div> : null}
    </div>
  );
}

function AppSection({ title, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PlaceholderPanel({ title, description }) {
  return (
    <AppSection title={title}>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        {description}
      </div>
    </AppSection>
  );
}

function DesktopTabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-gradient-to-r from-sky-600 to-violet-600 text-white shadow"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function MobileMenuItem({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
        active
          ? "bg-gradient-to-r from-sky-600 to-violet-600 text-white"
          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function HealthFitnessTracker() {
  const [state, setState] = useState(loadState);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickFoodId, setQuickFoodId] = useState("");
  const [quickFoodServingId, setQuickFoodServingId] = useState("");
  const [quickFoodQty, setQuickFoodQty] = useState(1);
  const [quickMealId, setQuickMealId] = useState("");
  const [waterAmount, setWaterAmount] = useState("");
  const [weightValue, setWeightValue] = useState("");
  const [dailyNote, setDailyNote] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  
  useEffect(() => {
    saveState(state);
  }, [state]);

  const monitorTabs = [
    ["dashboard", "Dashboard"],
    ["log", "Log"],
  ];
  const recordTabs = [
    ["foodWeightEntry", "Food & Weight Entry"],
    ["exerciseSleepEntry", "Exercise & Sleep Entry"],
  ];
  const planTabs = [
    ["foodsMeals", "Foods / Meals"],
    ["workouts", "Workouts"],
    ["goals", "Goals"],
    ["export", "Export / Backup"],
    ["howTo", "How-To"],
  ];
  const allTabs = [...monitorTabs, ...recordTabs, ...planTabs];

  const activeLabel = useMemo(() => {
    return allTabs.find(([key]) => key === activeTab)?.[1] || "Dashboard";
  }, [activeTab]);

  const todaysFoodLogs = useMemo(() => {
    return state.foodLogs.filter((log) => String(log.timestamp || "").slice(0, 10) === todayKey());
  }, [state.foodLogs]);

  const todaysWater = useMemo(() => {
    return state.waterLogs
      .filter((log) => String(log.timestamp || "").slice(0, 10) === todayKey())
      .reduce((sum, log) => sum + Number(log.ounces || 0), 0);
  }, [state.waterLogs]);

  const todaysWorkoutSession = useMemo(() => {
    return state.workoutSessions.find((log) => String(log.timestamp || "").slice(0, 10) === todayKey());
  }, [state.workoutSessions]);

  const todayMacros = useMemo(() => {
    return todaysFoodLogs.reduce(
      (acc, log) => {
        acc.calories += Number(log.totals?.calories || 0);
        acc.protein += Number(log.totals?.protein || 0);
        acc.carbs += Number(log.totals?.carbs || 0);
        acc.fat += Number(log.totals?.fat || 0);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todaysFoodLogs]);

  const macroTrend = useMemo(() => {
    return groupByDay(state.foodLogs, "timestamp", (prev, log) => ({
      date: String(log.timestamp || "").slice(0, 10),
      calories: Number(prev.calories || 0) + Number(log.totals?.calories || 0),
      protein: Number(prev.protein || 0) + Number(log.totals?.protein || 0),
      carbs: Number(prev.carbs || 0) + Number(log.totals?.carbs || 0),
      fat: Number(prev.fat || 0) + Number(log.totals?.fat || 0),
      goalCalories: Number(state.goals.calories || 0),
      goalProtein: Number(state.goals.protein || 0),
      goalCarbs: Number(state.goals.carbs || 0),
      goalFat: Number(state.goals.fat || 0),
    }));
  }, [state.foodLogs, state.goals]);

  const sleepTrend = useMemo(() => {
    return groupByDay(state.sleepLogs, "timestamp", (_, log) => ({
      date: String(log.timestamp || "").slice(0, 10),
      hours: Number(log.hours || 0),
      goal: Number(state.goals.sleep || 0),
    }));
  }, [state.sleepLogs, state.goals]);

  const weightTrend = useMemo(() => {
    return groupByDay(state.weightLogs, "timestamp", (_, log) => ({
      date: String(log.timestamp || "").slice(0, 10),
      weight: Number(log.weight || 0),
    }));
  }, [state.weightLogs]);

  const liftingTrend = useMemo(() => {
    return groupByDay(
      state.workoutLogs.filter((log) => log.type === "set"),
      "timestamp",
      (prev, log) => ({
        date: String(log.timestamp || "").slice(0, 10),
        volume: Number(prev.volume || 0) + Number(log.weight || 0) * Number(log.reps || 0),
        sets: Number(prev.sets || 0) + 1,
      })
    );
  }, [state.workoutLogs]);

  const cardioTrend = useMemo(() => {
    return groupByDay(
      state.workoutLogs.filter((log) => log.type === "cardio"),
      "timestamp",
      (prev, log) => ({
        date: String(log.timestamp || "").slice(0, 10),
        minutes: Number(prev.minutes || 0) + Number(log.minutes || 0),
        calories: Number(prev.calories || 0) + Number(log.cardioCalories || 0),
      })
    );
  }, [state.workoutLogs]);

  const workoutPlanCompliance = useMemo(() => {
    const plannedToday = state.workoutPlan.some((item) => item.day === appDayFromDate());
    const uniquePlannedDays = new Set(state.workoutPlan.map((item) => item.day));
    const completedPlannedDayTypes = new Set(
      state.workoutSessions
        .map((session) => appDayFromDate(session.timestamp))
        .filter((day) => state.workoutPlan.some((item) => item.day === day))
    );
    return {
      plannedToday,
      completedToday: !!todaysWorkoutSession,
      plannedDays: uniquePlannedDays.size,
      completedPlannedDays: completedPlannedDayTypes.size,
    };
  }, [state.workoutPlan, state.workoutSessions, todaysWorkoutSession]);

  const foodsById = useMemo(() => {
    return Object.fromEntries((state.foods || []).map((food) => [food.id, food]));
  }, [state.foods]);

  useEffect(() => {
    if (!quickFoodId) {
      setQuickFoodServingId("");
      return;
    }

    const food = foodsById[quickFoodId];
    const firstServing = food?.servings?.[0]?.id || "";

    if (!food?.servings?.some((s) => s.id === quickFoodServingId)) {
      setQuickFoodServingId(firstServing);
    }
  }, [quickFoodId, quickFoodServingId, foodsById]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = setTimeout(() => setSaveMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  function saveFoodWeightEntry() {
    let nextState = { ...state };
    let didAnything = false;

    if (quickFoodId && quickFoodServingId) {
      const food = foodsById[quickFoodId];
      const serving = food?.servings?.find((s) => s.id === quickFoodServingId);

      if (food && serving) {
        const qty = Number(quickFoodQty || 1);
        const foodLog = {
          id: uid(),
          name: `${food.name} (${serving.label})`,
          items: [
            {
              id: uid(),
              foodId: food.id,
              foodName: food.name,
              servingId: serving.id,
              servingLabel: serving.label,
              quantity: qty,
            },
          ],
          totals: {
            calories: Number(serving.calories || 0) * qty,
            protein: Number(serving.protein || 0) * qty,
            carbs: Number(serving.carbs || 0) * qty,
            fat: Number(serving.fat || 0) * qty,
          },
          timestamp: new Date().toISOString(),
        };

        nextState.foodLogs = [foodLog, ...(nextState.foodLogs || [])];
        didAnything = true;
      }
    }

    if (quickMealId) {
      const meal = (nextState.mealTemplates || []).find((m) => m.id === quickMealId);
      if (meal) {
        const mealLog = {
          id: uid(),
          name: meal.name,
          items: (meal.itemSnapshots || []).map((item) => ({
            ...item,
            id: uid(),
          })),
          totals: { ...(meal.totals || {}) },
          timestamp: new Date().toISOString(),
        };

        nextState.foodLogs = [mealLog, ...(nextState.foodLogs || [])];
        didAnything = true;
      }
    }

    const water = Number(waterAmount || 0);
    if (water) {
      nextState.waterLogs = [
        {
          id: uid(),
          ounces: water,
          timestamp: new Date().toISOString(),
        },
        ...(nextState.waterLogs || []),
      ];
      didAnything = true;
    }

    const note = dailyNote.trim();
    if (note) {
      nextState.noteLogs = [
        {
          id: uid(),
          note,
          timestamp: new Date().toISOString(),
        },
        ...(nextState.noteLogs || []),
      ];
      didAnything = true;
    }

    const weight = Number(weightValue || 0);
    if (weight) {
      nextState.weightLogs = [
        {
          id: uid(),
          weight,
          timestamp: new Date().toISOString(),
        },
        ...(nextState.weightLogs || []),
      ];
      didAnything = true;
    }

    if (!didAnything) return;

    setState(nextState);
    setQuickFoodId("");
    setQuickFoodServingId("");
    setQuickFoodQty(1);
    setQuickMealId("");
    setWaterAmount("");
    setWeightValue("");
    setDailyNote("");
    setSaveMessage("Food / weight entry saved.");
  }
  
  function goToTab(tabKey) {
    setActiveTab(tabKey);
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-violet-50 to-white text-slate-900">
      <AnimatePresence>
        {saveMessage ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl"
          >
            {saveMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-5 rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Health and Fitness Tracker
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Monitor progress, record your day, plan your training, and back up your data.
              </p>
            </div>
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
              >
                Menu
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 hidden md:flex md:flex-wrap md:items-start md:gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Monitor</span>
            {monitorTabs.map(([key, label]) => (
              <DesktopTabButton key={key} active={activeTab === key} onClick={() => goToTab(key)}>
                {label}
              </DesktopTabButton>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Record</span>
            {recordTabs.map(([key, label]) => (
              <DesktopTabButton key={key} active={activeTab === key} onClick={() => goToTab(key)}>
                {label}
              </DesktopTabButton>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Plan</span>
            {planTabs.map(([key, label]) => (
              <DesktopTabButton key={key} active={activeTab === key} onClick={() => goToTab(key)}>
                {label}
              </DesktopTabButton>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:hidden"
            >
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Monitor</div>
                  <div className="space-y-2">
                    {monitorTabs.map(([key, label]) => (
                      <MobileMenuItem key={key} active={activeTab === key} onClick={() => goToTab(key)}>{label}</MobileMenuItem>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Record</div>
                  <div className="space-y-2">
                    {recordTabs.map(([key, label]) => (
                      <MobileMenuItem key={key} active={activeTab === key} onClick={() => goToTab(key)}>{label}</MobileMenuItem>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Plan</div>
                  <div className="space-y-2">
                    {planTabs.map(([key, label]) => (
                      <MobileMenuItem key={key} active={activeTab === key} onClick={() => goToTab(key)}>{label}</MobileMenuItem>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-4 md:hidden">
          <div className="text-sm font-medium text-slate-600">Current section</div>
          <div className="text-xl font-semibold text-slate-900">{activeLabel}</div>
        </div>

        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <StatTile label="Calories" value={Math.round(todayMacros.calories)} subtext={`Goal ${state.goals.calories}`} accent="bg-amber-50 border-amber-100" />
              <StatTile label="Protein" value={`${Math.round(todayMacros.protein)} g`} subtext={`Goal ${state.goals.protein} g`} accent="bg-emerald-50 border-emerald-100" />
              <StatTile label="Carbs" value={`${Math.round(todayMacros.carbs)} g`} subtext={`Goal ${state.goals.carbs} g`} accent="bg-sky-50 border-sky-100" />
              <StatTile label="Fat" value={`${Math.round(todayMacros.fat)} g`} subtext={`Goal ${state.goals.fat} g`} accent="bg-rose-50 border-rose-100" />
              <StatTile label="Workout to Plan" value={workoutPlanCompliance.plannedToday ? (workoutPlanCompliance.completedToday ? "Done" : "Due") : "Rest"} subtext={`${workoutPlanCompliance.completedPlannedDays} of ${workoutPlanCompliance.plannedDays || 0} planned day-types hit`} accent="bg-violet-50 border-violet-100" />
              <StatTile label="Water Intake" value={`${Math.round(todaysWater)} oz`} subtext={`Goal ${state.goals.water} oz`} accent="bg-cyan-50 border-cyan-100" />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <AppSection title="Calories Trend"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={macroTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="calories" stroke="#f59e0b" strokeWidth={2} name="Calories" /><Line type="monotone" dataKey="goalCalories" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" /></LineChart></ResponsiveContainer></div></AppSection>
              <AppSection title="Protein Trend"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={macroTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="protein" stroke="#10b981" strokeWidth={2} name="Protein" /><Line type="monotone" dataKey="goalProtein" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" /></LineChart></ResponsiveContainer></div></AppSection>
              <AppSection title="Carbs Trend"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={macroTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="carbs" stroke="#0ea5e9" strokeWidth={2} name="Carbs" /><Line type="monotone" dataKey="goalCarbs" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" /></LineChart></ResponsiveContainer></div></AppSection>
              <AppSection title="Fat Trend"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={macroTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="fat" stroke="#f43f5e" strokeWidth={2} name="Fat" /><Line type="monotone" dataKey="goalFat" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" /></LineChart></ResponsiveContainer></div></AppSection>
              <AppSection title="Sleep Trend"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={sleepTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Bar dataKey="hours" fill="#8b5cf6" name="Sleep Hours" /><Line type="monotone" dataKey="goal" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" /></BarChart></ResponsiveContainer></div></AppSection>
              <AppSection title="Weight Trend"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={weightTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={["dataMin - 2", "dataMax + 2"]} /><Tooltip /><Line type="monotone" dataKey="weight" stroke="#7c3aed" strokeWidth={3} name="Weight (lb)" /></LineChart></ResponsiveContainer></div></AppSection>
              <AppSection title="Lifting Trend"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={liftingTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Bar dataKey="volume" fill="#1d4ed8" name="Volume" /><Bar dataKey="sets" fill="#60a5fa" name="Sets" /></BarChart></ResponsiveContainer></div></AppSection>
              <AppSection title="Cardio Trend"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={cardioTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Bar dataKey="minutes" fill="#10b981" name="Minutes" /><Bar dataKey="calories" fill="#34d399" name="Calories" /></BarChart></ResponsiveContainer></div></AppSection>
            </div>
          </div>
        )}

        {activeTab === "log" && (
  <div className="grid gap-4 xl:grid-cols-3">
    <AppSection title="Recent Food Logs">
      <div className="grid max-h-[700px] gap-3 overflow-auto pr-1">
        {state.foodLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No food logs yet.
          </div>
        ) : (
          state.foodLogs.slice(0, 12).map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-medium text-slate-900">{log.name}</div>
              <div className="mt-1 text-sm text-slate-600">
                {Math.round(log.totals?.calories || 0)} cal • P {Math.round(log.totals?.protein || 0)} • C{" "}
                {Math.round(log.totals?.carbs || 0)} • F {Math.round(log.totals?.fat || 0)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Logged {new Date(log.timestamp).toLocaleString()}
              </div>

              {(log.items || []).length > 0 && (
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  {log.items.map((item, idx) => (
                    <div key={`${log.id}_${idx}`}>
                      • {item.quantity} × {item.foodName || item.foodId} ({item.servingLabel || "serving"})
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppSection>

    <div className="space-y-4 xl:col-span-1">
      <AppSection title="Recent Workout Sessions">
        <div className="grid max-h-[240px] gap-3 overflow-auto pr-1">
          {state.workoutSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No workout sessions yet.
            </div>
          ) : (
            state.workoutSessions.slice(0, 8).map((session) => (
              <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="font-medium text-slate-900">{session.day || "Workout Session"}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(session.timestamp).toLocaleString()}
                </div>

                {(session.summary || []).length > 0 && (
                  <div className="mt-2 space-y-1 text-slate-600">
                    {session.summary.map((item, idx) => (
                      <div key={`${session.id}_${idx}`}>• {item}</div>
                    ))}
                  </div>
                )}

                {session.notes ? (
                  <div className="mt-2 rounded-xl bg-white p-2 text-slate-600">
                    Notes: {session.notes}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </AppSection>

      <AppSection title="Recent Notes">
        <div className="grid max-h-[180px] gap-3 overflow-auto pr-1">
          {state.noteLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No notes yet.
            </div>
          ) : (
            state.noteLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="text-xs text-slate-500">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                <div className="mt-1 text-slate-700">{log.note}</div>
              </div>
            ))
          )}
        </div>
      </AppSection>

      <AppSection title="Water / Sleep / Weight Snapshot">
        <div className="space-y-3 text-sm">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            Water today: <span className="font-medium">{Math.round(todaysWater)} oz</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            Latest sleep:{" "}
            <span className="font-medium">
              {state.sleepLogs?.[0]?.hours ? `${state.sleepLogs[0].hours} hours` : "—"}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            Latest weight:{" "}
            <span className="font-medium">
              {state.weightLogs?.[0]?.weight ? `${state.weightLogs[0].weight} lb` : "—"}
            </span>
          </div>
        </div>
      </AppSection>
    </div>
  </div>
)}
        {activeTab === "foodWeightEntry" && (
  <div className="grid gap-4 xl:grid-cols-2">
    <AppSection title="Food, Water, and Notes Entry">
      <div className="space-y-5">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-800">Food</div>
          <select
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3"
            value={quickFoodId}
            onChange={(e) => setQuickFoodId(e.target.value)}
          >
            <option value="">Choose a food</option>
            {(state.foods || []).map((food) => (
              <option key={food.id} value={food.id}>
                {food.name}
              </option>
            ))}
          </select>

          <select
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3"
            value={quickFoodServingId}
            onChange={(e) => setQuickFoodServingId(e.target.value)}
          >
            <option value="">Choose serving size</option>
            {(foodsById[quickFoodId]?.servings || []).map((serving) => (
              <option key={serving.id} value={serving.id}>
                {serving.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0.25"
            step="0.25"
            value={quickFoodQty}
            onChange={(e) => setQuickFoodQty(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-3 py-3"
            placeholder="Quantity"
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-800">Meal</div>
          <select
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3"
            value={quickMealId}
            onChange={(e) => setQuickMealId(e.target.value)}
          >
            <option value="">Choose a saved meal</option>
            {(state.mealTemplates || []).map((meal) => (
              <option key={meal.id} value={meal.id}>
                {meal.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-800">Water Intake</div>
          <input
            type="number"
            value={waterAmount}
            onChange={(e) => setWaterAmount(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-3 py-3"
            placeholder="Water in oz"
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-800">Notes Through the Day</div>
          <textarea
            value={dailyNote}
            onChange={(e) => setDailyNote(e.target.value)}
            className="min-h-[110px] w-full rounded-2xl border border-slate-300 p-3"
            placeholder="Energy level, soreness, sickness, stress, appetite, etc."
          />
        </div>
      </div>
    </AppSection>

    <AppSection title="Weight Entry">
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-800">Weight</div>
          <input
            type="number"
            value={weightValue}
            onChange={(e) => setWeightValue(e.target.value)}
            placeholder="Enter bodyweight in lb"
            className="mt-3 w-full rounded-2xl border border-slate-300 px-3 py-3"
          />
        </div>

        <button
          onClick={saveFoodWeightEntry}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-600 to-violet-600 px-4 py-4 text-base font-medium text-white shadow hover:opacity-95"
        >
          Save Food / Weight Entry
        </button>
      </div>
    </AppSection>
  </div>
)}
        {activeTab === "exerciseSleepEntry" && <PlaceholderPanel title="Exercise & Sleep Entry" description="Next section to implement: whole-workout entry screen, workout notes, and previous-night sleep entry/edit." />}
        {activeTab === "foodsMeals" && <PlaceholderPanel title="Foods / Meals" description="Next section to implement: combined food + meal management, editable foods, serving sizes, and meal-building." />}
        {activeTab === "workouts" && <PlaceholderPanel title="Workouts" description="Next section to implement: workout import, add/replace logic, manual plan builder, and workout plan editing." />}
        {activeTab === "goals" && <PlaceholderPanel title="Goals" description="Next section to implement: simplified goals page including the sleep goal." />}
        {activeTab === "export" && <PlaceholderPanel title="Export / Backup" description="Next section to implement: CSV export, JSON backup, and JSON restore." />}
        {activeTab === "howTo" && <PlaceholderPanel title="How-To" description="Next section to implement: feature-by-feature instructions for the app." />}
      </div>
    </div>
  );
}
