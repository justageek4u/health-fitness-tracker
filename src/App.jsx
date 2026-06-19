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

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
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

function isWithinDateRange(timestamp, startDate, endDate) {
  const dateOnly = String(timestamp || "").slice(0, 10);
  if (!dateOnly) return false;
  if (startDate && dateOnly < startDate) return false;
  if (endDate && dateOnly > endDate) return false;
  return true;
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
  const [selectedWorkoutDay, setSelectedWorkoutDay] = useState(appDayFromDate());
  const [workoutDraft, setWorkoutDraft] = useState({});
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [sleepEntryDate, setSleepEntryDate] = useState(
    new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  );
  const [sleepEntryHours, setSleepEntryHours] = useState("");
  const [foodForm, setFoodForm] = useState({
    name: "",
    servingLabel: "",
    protein: "",
    carbs: "",
    fat: "",
    calories: "",
  });
  const [mealDraftName, setMealDraftName] = useState("");
  const [mealDraftItems, setMealDraftItems] = useState([]);
  const [foodSearch, setFoodSearch] = useState("");
  const [mealSearch, setMealSearch] = useState("");
  const [showFavoriteFoodsOnly, setShowFavoriteFoodsOnly] = useState(false);
  const [showFavoriteMealsOnly, setShowFavoriteMealsOnly] = useState(false);
  const [logStartDate, setLogStartDate] = useState(todayKey());
  const [logEndDate, setLogEndDate] = useState(todayKey());
  const [manualPlanText, setManualPlanText] = useState(
    "Day,Exercise,Type,TargetSets,TargetReps,TargetTime,TargetCalories,Notes\nMonday,Lat Pulldown,Lift,4,12,0,0,Wide grip\nMonday,Cable Row,Lift,4,12,0,0,Controlled tempo\nTuesday,Elliptical,Cardio,0,0,20,250,Moderate pace\nThursday,Bench Press,Lift,4,10,0,0,Flat bench\nFriday,Leg Press,Lift,4,15,0,0,Focus on control"
  );

  const [planBuilder, setPlanBuilder] = useState({
    day: appDayFromDate(),
    exercise: "",
    type: "lift",
    targetSets: "",
    targetReps: "",
    targetTime: "",
    targetCalories: "",
    notes: "",
  });
  
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

  const filteredFoodLogs = useMemo(() => {
    return (state.foodLogs || []).filter((log) =>
      isWithinDateRange(log.timestamp, logStartDate, logEndDate)
    );
  }, [state.foodLogs, logStartDate, logEndDate]);

  const filteredWaterLogs = useMemo(() => {
    return (state.waterLogs || []).filter((log) =>
      isWithinDateRange(log.timestamp, logStartDate, logEndDate)
    );
  }, [state.waterLogs, logStartDate, logEndDate]);

  const filteredWorkoutSessions = useMemo(() => {
    return (state.workoutSessions || []).filter((log) =>
      isWithinDateRange(log.timestamp, logStartDate, logEndDate)
    );
  }, [state.workoutSessions, logStartDate, logEndDate]);

  const filteredNoteLogs = useMemo(() => {
    return (state.noteLogs || []).filter((log) =>
      isWithinDateRange(log.timestamp, logStartDate, logEndDate)
    );
  }, [state.noteLogs, logStartDate, logEndDate]);

  const filteredSleepLogs = useMemo(() => {
    return (state.sleepLogs || []).filter((log) =>
      isWithinDateRange(log.timestamp, logStartDate, logEndDate)
    );
  }, [state.sleepLogs, logStartDate, logEndDate]);

  const filteredWeightLogs = useMemo(() => {
    return (state.weightLogs || []).filter((log) =>
      isWithinDateRange(log.timestamp, logStartDate, logEndDate)
    );
  }, [state.weightLogs, logStartDate, logEndDate]);
  
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

  const waterTrend = useMemo(() => {
  return groupByDay(state.waterLogs, "timestamp", (prev, log) => ({
    date: String(log.timestamp || "").slice(0, 10),
    ounces: Number(prev.ounces || 0) + Number(log.ounces || 0),
    goal: Number(state.goals.water || 0),
  }));
}, [state.waterLogs, state.goals]);
  
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

  const exercisesForDay = useMemo(() => {
    return (state.workoutPlan || []).filter((item) => item.day === selectedWorkoutDay);
  }, [state.workoutPlan, selectedWorkoutDay]);

  useEffect(() => {
    const nextDraft = {};

    exercisesForDay.forEach((exercise) => {
      if (exercise.type === "cardio") {
        nextDraft[exercise.id] = workoutDraft[exercise.id] || {
          minutes: exercise.targetTime || "",
          calories: exercise.targetCalories || "",
        };
      } else {
        const targetSets = Math.max(1, Number(exercise.targetSets || 1));
        const existingSets = workoutDraft[exercise.id]?.sets || [];

        nextDraft[exercise.id] = {
          sets: Array.from({ length: targetSets }, (_, idx) => {
            return existingSets[idx] || {
              reps: exercise.targetReps || "",
              weight: "",
            };
          }),
        };
      }
    });

    setWorkoutDraft(nextDraft);
  }, [selectedWorkoutDay, state.workoutPlan]);

  useEffect(() => {
    const existingSleep = (state.sleepLogs || []).find(
      (log) => String(log.timestamp || "").slice(0, 10) === sleepEntryDate
    );
    setSleepEntryHours(existingSleep?.hours ? String(existingSleep.hours) : "");
  }, [sleepEntryDate, state.sleepLogs]);
  
  const foodsById = useMemo(() => {
    return Object.fromEntries((state.foods || []).map((food) => [food.id, food]));
  }, [state.foods]);

  const filteredFoods = useMemo(() => {
    let items = [...(state.foods || [])];

    const query = foodSearch.trim().toLowerCase();
    if (query) {
      items = items.filter((food) => food.name.toLowerCase().includes(query));
    }

    if (showFavoriteFoodsOnly) {
      items = items.filter((food) => !!food.favorite);
    }

    return items.sort((a, b) => {
      const favDiff = Number(!!b.favorite) - Number(!!a.favorite);
      if (favDiff !== 0) return favDiff;
      return a.name.localeCompare(b.name);
    });
  }, [state.foods, foodSearch, showFavoriteFoodsOnly]);

  const filteredMeals = useMemo(() => {
    let items = [...(state.mealTemplates || [])];

    const query = mealSearch.trim().toLowerCase();
    if (query) {
      items = items.filter((meal) => (meal.name || "").toLowerCase().includes(query));
    }

    if (showFavoriteMealsOnly) {
      items = items.filter((meal) => !!meal.favorite);
    }

    return items.sort((a, b) => {
      const favDiff = Number(!!b.favorite) - Number(!!a.favorite);
      if (favDiff !== 0) return favDiff;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [state.mealTemplates, mealSearch, showFavoriteMealsOnly]);
  
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

  function saveExerciseSleepEntry() {
    let nextState = { ...state };
    let didAnything = false;
    const workoutEntries = [];
    const sessionSummary = [];

    exercisesForDay.forEach((exercise) => {
      const draft = workoutDraft[exercise.id];
      if (!draft) return;

      if (exercise.type === "cardio") {
        const minutes = Number(draft.minutes || 0);
        const calories = Number(draft.calories || 0);

        if (!minutes && !calories) return;

        workoutEntries.push({
          id: uid(),
          exerciseId: exercise.id,
          exercise: exercise.exercise,
          type: "cardio",
          minutes,
          cardioCalories: calories,
          day: selectedWorkoutDay,
          timestamp: new Date().toISOString(),
        });

        sessionSummary.push(`${exercise.exercise}: ${minutes || 0} min / ${calories || 0} cal`);
      } else {
        const sets = draft.sets || [];
        let completedSets = 0;

        sets.forEach((setRow, idx) => {
          const reps = Number(setRow.reps || 0);
          const weight = Number(setRow.weight || 0);

          if (!reps && !weight) return;

          completedSets += 1;

          workoutEntries.push({
            id: uid(),
            exerciseId: exercise.id,
            exercise: exercise.exercise,
            type: "set",
            setNumber: idx + 1,
            reps,
            weight,
            day: selectedWorkoutDay,
            timestamp: new Date().toISOString(),
          });
        });

        if (completedSets > 0) {
          sessionSummary.push(`${exercise.exercise}: ${completedSets} set(s)`);
        }
      }
    });

    if (workoutEntries.length > 0) {
      const workoutSession = {
        id: uid(),
        day: selectedWorkoutDay,
        timestamp: new Date().toISOString(),
        notes: workoutNotes.trim(),
        summary: sessionSummary,
      };

      nextState.workoutLogs = [...workoutEntries.reverse(), ...(nextState.workoutLogs || [])];
      nextState.workoutSessions = [
        workoutSession,
        ...(nextState.workoutSessions || []).filter(
          (session) => String(session.timestamp || "").slice(0, 10) !== todayKey()
        ),
      ];

      didAnything = true;
    }

    const sleepHours = Number(sleepEntryHours || 0);
    if (sleepEntryDate && sleepHours) {
      const existingSleepIndex = (nextState.sleepLogs || []).findIndex(
        (log) => String(log.timestamp || "").slice(0, 10) === sleepEntryDate
      );

      if (existingSleepIndex >= 0) {
        nextState.sleepLogs = [...(nextState.sleepLogs || [])];
        nextState.sleepLogs[existingSleepIndex] = {
          ...nextState.sleepLogs[existingSleepIndex],
          hours: sleepHours,
        };
      } else {
        nextState.sleepLogs = [
          {
            id: uid(),
            hours: sleepHours,
            timestamp: `${sleepEntryDate}T07:00:00.000Z`,
          },
          ...(nextState.sleepLogs || []),
        ];
      }

      didAnything = true;
    }

    if (!didAnything) return;

    setState(nextState);
    setWorkoutNotes("");
    setSaveMessage("Exercise / sleep entry saved.");
  }

  function editFoodLog(id) {
  const log = state.foodLogs.find((item) => item.id === id);
  if (!log) return;

  const name = window.prompt("Entry name", log.name || "");
  if (name === null) return;

  const calories = window.prompt("Calories", String(log.totals?.calories ?? 0));
  if (calories === null) return;

  const protein = window.prompt("Protein", String(log.totals?.protein ?? 0));
  if (protein === null) return;

  const carbs = window.prompt("Carbs", String(log.totals?.carbs ?? 0));
  if (carbs === null) return;

  const fat = window.prompt("Fat", String(log.totals?.fat ?? 0));
  if (fat === null) return;

  setState((prev) => ({
    ...prev,
    foodLogs: prev.foodLogs.map((item) =>
      item.id === id
        ? {
            ...item,
            name,
            totals: {
              ...item.totals,
              calories: Number(calories || 0),
              protein: Number(protein || 0),
              carbs: Number(carbs || 0),
              fat: Number(fat || 0),
            },
          }
        : item
    ),
  }));

  setSaveMessage("Food entry updated.");
}

function deleteFoodLog(id) {
  setState((prev) => ({
    ...prev,
    foodLogs: prev.foodLogs.filter((item) => item.id !== id),
  }));
  setSaveMessage("Food entry deleted.");
}

function editWaterLog(id) {
  const log = state.waterLogs.find((item) => item.id === id);
  if (!log) return;

  const ounces = window.prompt("Water in oz", String(log.ounces ?? 0));
  if (ounces === null) return;

  setState((prev) => ({
    ...prev,
    waterLogs: prev.waterLogs.map((item) =>
      item.id === id ? { ...item, ounces: Number(ounces || 0) } : item
    ),
  }));

  setSaveMessage("Water entry updated.");
}

function deleteWaterLog(id) {
  setState((prev) => ({
    ...prev,
    waterLogs: prev.waterLogs.filter((item) => item.id !== id),
  }));
  setSaveMessage("Water entry deleted.");
}

function editWorkoutSession(id) {
  const session = state.workoutSessions.find((item) => item.id === id);
  if (!session) return;

  const notes = window.prompt("Workout notes", session.notes || "");
  if (notes === null) return;

  setState((prev) => ({
    ...prev,
    workoutSessions: prev.workoutSessions.map((item) =>
      item.id === id ? { ...item, notes } : item
    ),
  }));

  setSaveMessage("Workout session updated.");
}

function deleteWorkoutSession(id) {
  const session = state.workoutSessions.find((item) => item.id === id);
  if (!session) return;

  const sessionDate = String(session.timestamp || "").slice(0, 10);

  setState((prev) => ({
    ...prev,
    workoutSessions: prev.workoutSessions.filter((item) => item.id !== id),
    workoutLogs: prev.workoutLogs.filter(
      (log) => String(log.timestamp || "").slice(0, 10) !== sessionDate
    ),
  }));

  setSaveMessage("Workout session deleted.");
}

function editNoteLog(id) {
  const log = state.noteLogs.find((item) => item.id === id);
  if (!log) return;

  const note = window.prompt("Edit note", log.note || "");
  if (note === null) return;

  setState((prev) => ({
    ...prev,
    noteLogs: prev.noteLogs.map((item) =>
      item.id === id ? { ...item, note } : item
    ),
  }));

  setSaveMessage("Note updated.");
}

function deleteNoteLog(id) {
  setState((prev) => ({
    ...prev,
    noteLogs: prev.noteLogs.filter((item) => item.id !== id),
  }));
  setSaveMessage("Note deleted.");
}

function editSleepLog(id) {
  const log = state.sleepLogs.find((item) => item.id === id);
  if (!log) return;

  const hours = window.prompt("Sleep hours", String(log.hours ?? 0));
  if (hours === null) return;

  setState((prev) => ({
    ...prev,
    sleepLogs: prev.sleepLogs.map((item) =>
      item.id === id ? { ...item, hours: Number(hours || 0) } : item
    ),
  }));

  setSaveMessage("Sleep entry updated.");
}

function deleteSleepLog(id) {
  setState((prev) => ({
    ...prev,
    sleepLogs: prev.sleepLogs.filter((item) => item.id !== id),
  }));
  setSaveMessage("Sleep entry deleted.");
}

function editWeightLog(id) {
  const log = state.weightLogs.find((item) => item.id === id);
  if (!log) return;

  const weight = window.prompt("Weight in lb", String(log.weight ?? 0));
  if (weight === null) return;

  setState((prev) => ({
    ...prev,
    weightLogs: prev.weightLogs.map((item) =>
      item.id === id ? { ...item, weight: Number(weight || 0) } : item
    ),
  }));

  setSaveMessage("Weight entry updated.");
}

function deleteWeightLog(id) {
  setState((prev) => ({
    ...prev,
    weightLogs: prev.weightLogs.filter((item) => item.id !== id),
  }));
  setSaveMessage("Weight entry deleted.");
}

  function toggleFoodFavorite(foodId) {
    setState((prev) => ({
      ...prev,
      foods: (prev.foods || []).map((food) =>
        food.id === foodId ? { ...food, favorite: !food.favorite } : food
      ),
    }));

    setSaveMessage("Food favorite updated.");
  }

  function toggleMealFavorite(mealId) {
    setState((prev) => ({
      ...prev,
      mealTemplates: (prev.mealTemplates || []).map((meal) =>
        meal.id === mealId ? { ...meal, favorite: !meal.favorite } : meal
      ),
    }));

    setSaveMessage("Meal favorite updated.");
  }
  
  function addFood() {
    if (!foodForm.name.trim() || !foodForm.servingLabel.trim()) return;

    const newFood = {
      id: uid(),
      name: foodForm.name.trim(),
      favorite: false,
      servings: [
        {
          id: uid(),
          label: foodForm.servingLabel.trim(),
          protein: Number(foodForm.protein || 0),
          carbs: Number(foodForm.carbs || 0),
          fat: Number(foodForm.fat || 0),
          calories: Number(foodForm.calories || 0),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      foods: [newFood, ...(prev.foods || [])],
    }));

    setFoodForm({
      name: "",
      servingLabel: "",
      protein: "",
      carbs: "",
      fat: "",
      calories: "",
    });

    setSaveMessage("Food added.");
  }

  function renameFood(foodId) {
    const food = state.foods.find((f) => f.id === foodId);
    if (!food) return;

    const nextName = window.prompt("Food name", food.name || "");
    if (nextName === null || !nextName.trim()) return;

    setState((prev) => ({
      ...prev,
      foods: prev.foods.map((f) =>
        f.id === foodId ? { ...f, name: nextName.trim() } : f
      ),
    }));

    setSaveMessage("Food updated.");
  }

  function deleteFood(foodId) {
    setState((prev) => ({
      ...prev,
      foods: prev.foods.filter((f) => f.id !== foodId),
    }));

    setSaveMessage("Food deleted.");
  }

  function addServingToFood(foodId) {
    const label = window.prompt("Serving label (example: 1 cup, 1 scoop, 8 oz)");
    if (label === null || !label.trim()) return;

    const protein = window.prompt("Protein (g)", "0");
    if (protein === null) return;

    const carbs = window.prompt("Carbs (g)", "0");
    if (carbs === null) return;

    const fat = window.prompt("Fat (g)", "0");
    if (fat === null) return;

    const calories = window.prompt("Calories", "0");
    if (calories === null) return;

    setState((prev) => ({
      ...prev,
      foods: prev.foods.map((food) =>
        food.id === foodId
          ? {
              ...food,
              servings: [
                ...(food.servings || []),
                {
                  id: uid(),
                  label: label.trim(),
                  protein: Number(protein || 0),
                  carbs: Number(carbs || 0),
                  fat: Number(fat || 0),
                  calories: Number(calories || 0),
                },
              ],
            }
          : food
      ),
    }));

    setSaveMessage("Serving size added.");
  }

  function editServing(foodId, servingId) {
    const food = state.foods.find((f) => f.id === foodId);
    const serving = food?.servings?.find((s) => s.id === servingId);
    if (!food || !serving) return;

    const label = window.prompt("Serving label", serving.label || "");
    if (label === null || !label.trim()) return;

    const protein = window.prompt("Protein (g)", String(serving.protein ?? 0));
    if (protein === null) return;

    const carbs = window.prompt("Carbs (g)", String(serving.carbs ?? 0));
    if (carbs === null) return;

    const fat = window.prompt("Fat (g)", String(serving.fat ?? 0));
    if (fat === null) return;

    const calories = window.prompt("Calories", String(serving.calories ?? 0));
    if (calories === null) return;

    setState((prev) => ({
      ...prev,
      foods: prev.foods.map((foodItem) =>
        foodItem.id === foodId
          ? {
              ...foodItem,
              servings: (foodItem.servings || []).map((servingItem) =>
                servingItem.id === servingId
                  ? {
                      ...servingItem,
                      label: label.trim(),
                      protein: Number(protein || 0),
                      carbs: Number(carbs || 0),
                      fat: Number(fat || 0),
                      calories: Number(calories || 0),
                    }
                  : servingItem
              ),
            }
          : foodItem
      ),
    }));

    setSaveMessage("Serving size updated.");
  }

  function deleteServing(foodId, servingId) {
    setState((prev) => ({
      ...prev,
      foods: prev.foods.map((food) =>
        food.id === foodId
          ? {
              ...food,
              servings: (food.servings || []).filter((s) => s.id !== servingId),
            }
          : food
      ),
    }));

    setSaveMessage("Serving size deleted.");
  }

  function logServingNow(foodId, servingId) {
    const food = state.foods.find((f) => f.id === foodId);
    const serving = food?.servings?.find((s) => s.id === servingId);
    if (!food || !serving) return;

    const log = {
      id: uid(),
      name: `${food.name} (${serving.label})`,
      items: [
        {
          id: uid(),
          foodId: food.id,
          foodName: food.name,
          servingId: serving.id,
          servingLabel: serving.label,
          quantity: 1,
        },
      ],
      totals: {
        calories: Number(serving.calories || 0),
        protein: Number(serving.protein || 0),
        carbs: Number(serving.carbs || 0),
        fat: Number(serving.fat || 0),
      },
      timestamp: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      foodLogs: [log, ...(prev.foodLogs || [])],
    }));

    setSaveMessage("Food logged.");
  }

  function addServingToMealDraft(foodId, servingId) {
    const food = state.foods.find((f) => f.id === foodId);
    const serving = food?.servings?.find((s) => s.id === servingId);
    if (!food || !serving) return;

    setMealDraftItems((prev) => [
      ...prev,
      {
        id: uid(),
        foodId,
        foodName: food.name,
        servingId,
        servingLabel: serving.label,
        quantity: 1,
        macros: {
          calories: Number(serving.calories || 0),
          protein: Number(serving.protein || 0),
          carbs: Number(serving.carbs || 0),
          fat: Number(serving.fat || 0),
        },
      },
    ]);

    setSaveMessage("Added to meal draft.");
  }

  function removeMealDraftItem(id) {
    setMealDraftItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateMealDraftQty(id, value) {
    setMealDraftItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Number(value || 1) } : item
      )
    );
  }

  function mealDraftTotals() {
    return mealDraftItems.reduce(
      (acc, item) => {
        const qty = Number(item.quantity || 1);
        acc.calories += Number(item.macros?.calories || 0) * qty;
        acc.protein += Number(item.macros?.protein || 0) * qty;
        acc.carbs += Number(item.macros?.carbs || 0) * qty;
        acc.fat += Number(item.macros?.fat || 0) * qty;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  function saveMealTemplate() {
    if (!mealDraftName.trim() || mealDraftItems.length === 0) return;

    const meal = {
  id: uid(),
  name: mealDraftName.trim(),
  favorite: false,
  itemSnapshots: mealDraftItems,
  totals: mealDraftTotals(),
  createdAt: new Date().toISOString(),
};

    setState((prev) => ({
      ...prev,
      mealTemplates: [meal, ...(prev.mealTemplates || [])],
    }));

    setMealDraftName("");
    setMealDraftItems([]);
    setSaveMessage("Meal saved.");
  }

  function logMealNow(mealId) {
    const meal = state.mealTemplates.find((m) => m.id === mealId);
    if (!meal) return;

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

    setState((prev) => ({
      ...prev,
      foodLogs: [mealLog, ...(prev.foodLogs || [])],
    }));

    setSaveMessage("Meal logged.");
  }

  function deleteMealTemplate(mealId) {
    setState((prev) => ({
      ...prev,
      mealTemplates: prev.mealTemplates.filter((m) => m.id !== mealId),
    }));

    setSaveMessage("Meal deleted.");
  }

  function normalizePlanRows(rows) {
    return rows
      .map((r) => ({
        id: uid(),
        day: r.day || r.weekday || appDayFromDate(),
        exercise: r.exercise || r.name || "",
        type: (r.type || "lift").toLowerCase().includes("card") ? "cardio" : "lift",
        targetSets: Number(r.targetsets || r.sets || 0),
        targetReps: Number(r.targetreps || r.reps || 0),
        targetTime: Number(r.targettime || r.minutes || 0),
        targetCalories: Number(r.targetcalories || r.calories || 0),
        notes: r.notes || "",
        createdAt: new Date().toISOString(),
      }))
      .filter((r) => r.exercise);
  }

  function applyWorkoutPlanRows(rows, mode = "replace") {
    const normalized = normalizePlanRows(rows);
    if (!normalized.length) return;

    setState((prev) => ({
      ...prev,
      workoutPlan: mode === "add" ? [...(prev.workoutPlan || []), ...normalized] : normalized,
    }));

    setSaveMessage(mode === "add" ? "Workout plan rows added." : "Workout plan replaced.");
  }

  async function handlePlanFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const mode =
      state.workoutPlan.length > 0 &&
      !window.confirm("Replace the current workout plan? Click Cancel to add to the existing plan.")
        ? "add"
        : "replace";

    applyWorkoutPlanRows(parseCsv(text), mode);

    if (event.target) {
      event.target.value = "";
    }
  }

  function importManualPlan() {
    const mode =
      state.workoutPlan.length > 0 &&
      !window.confirm("Replace the current workout plan? Click Cancel to add to the existing plan.")
        ? "add"
        : "replace";

    applyWorkoutPlanRows(parseCsv(manualPlanText), mode);
  }

  function addPlanRow() {
    if (!planBuilder.exercise.trim()) return;

    const row = {
      id: uid(),
      day: planBuilder.day,
      exercise: planBuilder.exercise.trim(),
      type: planBuilder.type,
      targetSets: Number(planBuilder.targetSets || 0),
      targetReps: Number(planBuilder.targetReps || 0),
      targetTime: Number(planBuilder.targetTime || 0),
      targetCalories: Number(planBuilder.targetCalories || 0),
      notes: planBuilder.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      workoutPlan: [...(prev.workoutPlan || []), row],
    }));

    setPlanBuilder({
      day: appDayFromDate(),
      exercise: "",
      type: "lift",
      targetSets: "",
      targetReps: "",
      targetTime: "",
      targetCalories: "",
      notes: "",
    });

    setSaveMessage("Plan row added.");
  }

  function updatePlanRow(rowId, field, value) {
    setState((prev) => ({
      ...prev,
      workoutPlan: (prev.workoutPlan || []).map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]:
                field.startsWith("target")
                  ? Number(value || 0)
                  : value,
            }
          : row
      ),
    }));
  }

  function deletePlanRow(rowId) {
    setState((prev) => ({
      ...prev,
      workoutPlan: (prev.workoutPlan || []).filter((row) => row.id !== rowId),
    }));

    setSaveMessage("Planned workout removed.");
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

        <div className="mb-6 hidden md:flex md:flex-col md:gap-3">
  <div className="flex flex-wrap items-center gap-2">
    <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
      Monitor
    </span>
    {monitorTabs.map(([key, label]) => (
      <DesktopTabButton key={key} active={activeTab === key} onClick={() => goToTab(key)}>
        {label}
      </DesktopTabButton>
    ))}
  </div>

  <div className="flex flex-wrap items-center gap-2">
    <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
      Record
    </span>
    {recordTabs.map(([key, label]) => (
      <DesktopTabButton key={key} active={activeTab === key} onClick={() => goToTab(key)}>
        {label}
      </DesktopTabButton>
    ))}
  </div>

  <div className="flex flex-wrap items-center gap-2">
    <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
      Plan
    </span>
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
      <AppSection title="Calories Trend">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={macroTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="calories" stroke="#f59e0b" strokeWidth={2} name="Calories" />
              <Line type="monotone" dataKey="goalCalories" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </AppSection>

      <AppSection title="Protein Trend">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={macroTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="protein" stroke="#10b981" strokeWidth={2} name="Protein" />
              <Line type="monotone" dataKey="goalProtein" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </AppSection>

      <AppSection title="Carbs Trend">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={macroTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="carbs" stroke="#0ea5e9" strokeWidth={2} name="Carbs" />
              <Line type="monotone" dataKey="goalCarbs" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </AppSection>

      <AppSection title="Fat Trend">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={macroTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="fat" stroke="#f43f5e" strokeWidth={2} name="Fat" />
              <Line type="monotone" dataKey="goalFat" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </AppSection>

      <AppSection title="Lifting Trend">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={liftingTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="volume" fill="#1d4ed8" name="Volume" />
              <Bar dataKey="sets" fill="#60a5fa" name="Sets" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AppSection>

      <AppSection title="Cardio Trend">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cardioTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="minutes" fill="#10b981" name="Minutes" />
              <Bar dataKey="calories" fill="#34d399" name="Calories" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AppSection>

      <AppSection title="Water Intake Trend">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ounces" fill="#06b6d4" name="Water (oz)" />
              <Line type="monotone" dataKey="goal" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AppSection>

      <AppSection title="Sleep Trend">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sleepTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" fill="#8b5cf6" name="Sleep Hours" />
              <Line type="monotone" dataKey="goal" stroke="#9ca3af" strokeDasharray="4 4" name="Goal" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AppSection>
    </div>

    <AppSection title="Weight Trend">
  <div className="h-[280px]">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={weightTrend}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#7c3aed"
          strokeWidth={3}
          name="Weight (lb)"
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
</AppSection>
  </div>
)}

        {activeTab === "log" && (
  <div className="space-y-4">
    <AppSection title="Log Filters">
      <div className="grid gap-3 md:grid-cols-[1fr,1fr,auto]">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Start date</label>
          <input
            type="date"
            value={logStartDate}
            onChange={(e) => setLogStartDate(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-3 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">End date</label>
          <input
            type="date"
            value={logEndDate}
            onChange={(e) => setLogEndDate(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-3 py-3"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setLogStartDate("");
              setLogEndDate("");
            }}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Show All
          </button>
        </div>
      </div>
    </AppSection>

    <div className="grid gap-4 xl:grid-cols-3">
      {/* Column 1: Food + Water */}
      <div className="space-y-4">
        <AppSection title="Food Logs">
          <div className="grid max-h-[520px] gap-3 overflow-auto pr-1">
            {filteredFoodLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No food logs in this date range.
              </div>
            ) : (
              filteredFoodLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{log.name}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {Math.round(log.totals?.calories || 0)} cal • P {Math.round(log.totals?.protein || 0)} • C {Math.round(log.totals?.carbs || 0)} • F {Math.round(log.totals?.fat || 0)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Logged {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => editFoodLog(log.id)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteFoodLog(log.id)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-1 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
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

        <AppSection title="Water Logs">
          <div className="grid max-h-[260px] gap-3 overflow-auto pr-1">
            {filteredWaterLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No water logs in this date range.
              </div>
            ) : (
              filteredWaterLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{log.ounces} oz</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => editWaterLog(log.id)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteWaterLog(log.id)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-1 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </AppSection>
      </div>

      {/* Column 2: Workouts */}
      <div className="space-y-4">
        <AppSection title="Workout Sessions">
          <div className="grid max-h-[700px] gap-3 overflow-auto pr-1">
            {filteredWorkoutSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No workout sessions in this date range.
              </div>
            ) : (
              filteredWorkoutSessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{session.day || "Workout Session"}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(session.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => editWorkoutSession(session.id)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteWorkoutSession(session.id)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-1 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
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
      </div>

      {/* Column 3: Notes + Sleep + Weight */}
      <div className="space-y-4">
        <AppSection title="Notes">
          <div className="grid max-h-[220px] gap-3 overflow-auto pr-1">
            {filteredNoteLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No notes in this date range.
              </div>
            ) : (
              filteredNoteLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      <div className="mt-1 text-slate-700">{log.note}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => editNoteLog(log.id)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteNoteLog(log.id)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-1 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </AppSection>

        <AppSection title="Sleep Logs">
          <div className="grid max-h-[200px] gap-3 overflow-auto pr-1">
            {filteredSleepLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No sleep logs in this date range.
              </div>
            ) : (
              filteredSleepLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{log.hours} hours</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => editSleepLog(log.id)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSleepLog(log.id)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-1 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </AppSection>

        <AppSection title="Weight Logs">
          <div className="grid max-h-[200px] gap-3 overflow-auto pr-1">
            {filteredWeightLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No weight logs in this date range.
              </div>
            ) : (
              filteredWeightLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{log.weight} lb</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => editWeightLog(log.id)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteWeightLog(log.id)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-1 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </AppSection>
      </div>
    </div>
  </div>
)}
        {activeTab === "foodWeightEntry" && (
  <div className="space-y-4">
    <div className="grid gap-4 xl:grid-cols-2">
      <AppSection title="Food Entry">
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
      </AppSection>

      <AppSection title="Meal Entry">
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
      </AppSection>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <AppSection title="Water Intake">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="number"
            value={waterAmount}
            onChange={(e) => setWaterAmount(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-3 py-3"
            placeholder="Water in oz"
          />
        </div>
      </AppSection>

      <AppSection title="Weight Entry">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="number"
            value={weightValue}
            onChange={(e) => setWeightValue(e.target.value)}
            placeholder="Enter bodyweight in lb"
            className="w-full rounded-2xl border border-slate-300 px-3 py-3"
          />
        </div>
      </AppSection>
    </div>

    <AppSection title="Notes Through the Day">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <textarea
          value={dailyNote}
          onChange={(e) => setDailyNote(e.target.value)}
          className="min-h-[140px] w-full rounded-2xl border border-slate-300 p-3"
          placeholder="Energy level, soreness, sickness, stress, appetite, etc."
        />
      </div>
    </AppSection>

    <div>
      <button
        onClick={saveFoodWeightEntry}
        className="w-full rounded-2xl bg-gradient-to-r from-sky-600 to-violet-600 px-4 py-4 text-base font-medium text-white shadow hover:opacity-95"
      >
        Save Food / Weight Entry
      </button>
    </div>
  </div>
)}
        {activeTab === "exerciseSleepEntry" && (
  <div className="space-y-4">
    <div className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
      <AppSection title={`Exercise Entry — ${selectedWorkoutDay}`}>
        <div className="space-y-4">
          <div className="max-w-xs">
            <label className="mb-2 block text-sm font-medium text-slate-700">Workout Day</label>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3"
              value={selectedWorkoutDay}
              onChange={(e) => setSelectedWorkoutDay(e.target.value)}
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {exercisesForDay.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              No exercises are planned for this day.
            </div>
          ) : (
            <div className="space-y-4">
              {exercisesForDay.map((exercise) => (
                <div key={exercise.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-medium text-slate-900">{exercise.exercise}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {exercise.type === "cardio"
                      ? `Cardio target: ${exercise.targetTime || 0} min / ${exercise.targetCalories || 0} cal`
                      : `Target: ${exercise.targetSets || 0} sets × ${exercise.targetReps || 0} reps`}
                  </div>

                  {exercise.notes ? (
                    <div className="mt-1 text-sm text-slate-500">{exercise.notes}</div>
                  ) : null}

                  {exercise.type === "cardio" ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input
                        type="number"
                        className="rounded-2xl border border-slate-300 px-3 py-3"
                        placeholder="Minutes"
                        value={workoutDraft[exercise.id]?.minutes ?? ""}
                        onChange={(e) =>
                          setWorkoutDraft((prev) => ({
                            ...prev,
                            [exercise.id]: {
                              ...(prev[exercise.id] || {}),
                              minutes: e.target.value,
                            },
                          }))
                        }
                      />
                      <input
                        type="number"
                        className="rounded-2xl border border-slate-300 px-3 py-3"
                        placeholder="Calories"
                        value={workoutDraft[exercise.id]?.calories ?? ""}
                        onChange={(e) =>
                          setWorkoutDraft((prev) => ({
                            ...prev,
                            [exercise.id]: {
                              ...(prev[exercise.id] || {}),
                              calories: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {(workoutDraft[exercise.id]?.sets || []).map((setRow, idx) => (
                        <div
                          key={`${exercise.id}_${idx}`}
                          className="grid gap-3 rounded-2xl border border-white bg-white p-3 sm:grid-cols-[90px,1fr,1fr] sm:items-center"
                        >
                          <div className="text-sm font-medium text-slate-700">Set {idx + 1}</div>
                          <input
                            type="number"
                            className="rounded-2xl border border-slate-300 px-3 py-2"
                            placeholder="Reps"
                            value={setRow.reps}
                            onChange={(e) =>
                              setWorkoutDraft((prev) => ({
                                ...prev,
                                [exercise.id]: {
                                  sets: prev[exercise.id].sets.map((row, setIdx) =>
                                    setIdx === idx ? { ...row, reps: e.target.value } : row
                                  ),
                                },
                              }))
                            }
                          />
                          <input
                            type="number"
                            className="rounded-2xl border border-slate-300 px-3 py-2"
                            placeholder="Weight"
                            value={setRow.weight}
                            onChange={(e) =>
                              setWorkoutDraft((prev) => ({
                                ...prev,
                                [exercise.id]: {
                                  sets: prev[exercise.id].sets.map((row, setIdx) =>
                                    setIdx === idx ? { ...row, weight: e.target.value } : row
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppSection>

      <AppSection title="Sleep Entry">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-800">Previous Night Sleep</div>
            <div className="mt-3 space-y-3">
              <input
                type="date"
                value={sleepEntryDate}
                onChange={(e) => setSleepEntryDate(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-3 py-3"
              />
              <input
                type="number"
                step="0.25"
                min="0"
                value={sleepEntryHours}
                onChange={(e) => setSleepEntryHours(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-3 py-3"
                placeholder="Hours slept"
              />
            </div>
            <div className="mt-3 text-sm text-slate-500">
              Enter or edit sleep for the previous night before saving.
            </div>
          </div>
        </div>
      </AppSection>
    </div>

    <AppSection title="Workout Notes">
      <textarea
        value={workoutNotes}
        onChange={(e) => setWorkoutNotes(e.target.value)}
        className="min-h-[120px] w-full rounded-2xl border border-slate-300 p-3"
        placeholder="How did the workout feel? Any pain, substitutions, energy notes, or recovery comments?"
      />
    </AppSection>

    <div>
      <button
        onClick={saveExerciseSleepEntry}
        className="w-full rounded-2xl bg-gradient-to-r from-sky-600 to-violet-600 px-4 py-4 text-base font-medium text-white shadow hover:opacity-95"
      >
        Save Exercise / Sleep Entry
      </button>
    </div>
  </div>
)}
        
        {activeTab === "workouts" && <PlaceholderPanel title="Workouts" description="Next section to implement: workout import, add/replace logic, manual plan builder, and workout plan editing." />}
        {activeTab === "goals" && <PlaceholderPanel title="Goals" description="Next section to implement: simplified goals page including the sleep goal." />}
        {activeTab === "export" && <PlaceholderPanel title="Export / Backup" description="Next section to implement: CSV export, JSON backup, and JSON restore." />}
        {activeTab === "howTo" && <PlaceholderPanel title="How-To" description="Next section to implement: feature-by-feature instructions for the app." />}
      </div>
    </div>
  );
}
