import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  type GestureResponderEvent,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  RectButton,
  Swipeable,
} from "react-native-gesture-handler";

import { supabase } from "@/lib/supabase";
import { useAppTheme } from "@/lib/app-theme";

type AgendaEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  completed: boolean;
  dateKey: string;
  startTime: string;
  color: string;
  tone: string;
  reminder: string;
  recurrence: Recurrence;
  recurrenceInterval: number;
  recurrenceWeekdays: number[];
  recurrenceEndDate?: string;
  category: EventCategory;
  notificationId?: string;
  deletedAt?: string;
};

type EventForm = {
  title: string;
  description: string;
  location: string;
  completed: boolean;
  dateKey: string;
  startTime: string;
  color: string;
  tone: string;
  reminder: string;
  recurrence: Recurrence;
  recurrenceInterval: number;
  recurrenceWeekdays: number[];
  recurrenceEndDate?: string;
  category: EventCategory;
};

type AgendaEventTask = {
  id: string;
  eventId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
};

type AgendaEventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  location: string | null;
  completed: boolean | null;
  date_key: string;
  start_time: string;
  color: string;
  tone: string;
  reminder: string;
  recurrence: Recurrence | null;
  recurrence_interval: number | null;
  recurrence_weekdays: number[] | null;
  recurrence_end_date: string | null;
  category: EventCategory | null;
  notification_id: string | null;
  deleted_at: string | null;
};

type AgendaEventTaskRow = {
  user_id: string;
  id: string;
  event_id: string;
  title: string;
  completed: boolean | null;
  sort_order: number | null;
};

type AgendaCategoryRow = {
  user_id: string;
  id: string;
  label: string;
  icon: string;
  color: string;
  tone: string;
  sort_order: number | null;
  is_default: boolean | null;
};

type Recurrence = "none" | "daily" | "weekly" | "monthly";
type EventCategory = string;
type CategoryFilter = "all" | EventCategory;
type StatusFilter = "pending" | "all" | "completed";
type CategoryIcon = keyof typeof Ionicons.glyphMap;
type AgendaCategory = {
  id: string;
  label: string;
  icon: CategoryIcon;
  color: string;
  tone: string;
  sortOrder: number;
  isDefault: boolean;
};
type SearchScope = "day" | "week" | "all";
type ActiveTimePicker = "startTime" | null;
type FormErrors = Partial<Record<"title", string>>;
type UpcomingEvent = {
  event: AgendaEvent;
  occurrenceDate: Date;
};
type DayDropZone = {
  dateKey: string;
  height: number;
  index: number;
  width: number;
  x: number;
  y: number;
};
type HourDropZone = {
  height: number;
  hour: number;
  time: string;
  width: number;
  x: number;
  y: number;
};
type QuickDragState = {
  eventId: string;
  mode: "day" | "hour";
  targetIndex: number | null;
  targetHour: number | null;
  x: number;
  y: number;
};

type SwipeableEventRowProps = {
  children: ReactNode;
  completed: boolean;
  enabled?: boolean;
  onComplete: () => void;
  onDelete: () => void;
};
type CompletionAnimatedRowProps = {
  children: ReactNode;
  completed: boolean;
};
type QuickDraggableEventProps = {
  children: ReactNode;
  dragEnabled?: boolean;
  event: AgendaEvent;
  isDragging: boolean;
  onDragCancel: () => void;
  onDragEnd: (pageX: number, pageY: number) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragStart: (event: AgendaEvent, pageX: number, pageY: number) => void;
  onOpen: () => void;
  variant?: "compact" | "plain";
};
type ReminderVisualState =
  | "completed"
  | "overdue"
  | "now"
  | "soon"
  | "today"
  | "future";
type ReminderVisualInfo = {
  color: string;
  icon: CategoryIcon;
  label: string;
  state: ReminderVisualState;
  tone: string;
};
type ReminderBadgeProps = {
  currentTime: Date;
  event: AgendaEvent;
  occurrenceDate: Date;
  variant?: "compact" | "detail" | "inline";
};
type EventTaskPillProps = {
  color: string;
  tasks: AgendaEventTask[];
  variant?: "compact" | "detail" | "inline";
};
type AgendaEmptyStateProps = {
  actionIcon?: CategoryIcon;
  actionLabel?: string;
  compact?: boolean;
  icon: CategoryIcon;
  onAction?: () => void;
  text: string;
  title: string;
};
type CategoryForm = {
  label: string;
  icon: CategoryIcon;
  color: string;
  tone: string;
};
type CategoryFormErrors = Partial<Record<"label", string>>;
type EventTemplate = {
  categoryId: EventCategory;
  description: string;
  icon: CategoryIcon;
  id: string;
  isDefault: boolean;
  label: string;
  location: string;
  reminder: string;
  sortOrder: number;
  startTime?: string;
  tasks: string[];
  title: string;
};

type EventTemplateRow = {
  user_id: string;
  id: string;
  label: string;
  title: string;
  description: string;
  location: string | null;
  reminder: string;
  start_time: string | null;
  category_id: string | null;
  icon: string;
  tasks: string[] | null;
  sort_order: number | null;
  is_default: boolean | null;
};

type DeletedEventUndo = {
  event: AgendaEvent;
  tasks: AgendaEventTask[];
};
type AppToastVariant = "success" | "info" | "warning" | "danger";
type AppToastAction = "undo-delete";
type AppToast = {
  action?: AppToastAction;
  duration?: number;
  icon: CategoryIcon;
  id: string;
  message?: string;
  title: string;
  variant: AppToastVariant;
};

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("es-ES", { month: "long" });
const DAY_FORMATTER = new Intl.DateTimeFormat("es-ES", { day: "numeric" });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  weekday: "long",
});
const TIME_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});
const UPCOMING_DATE_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  weekday: "short",
});
const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const EVENTS_STORAGE_KEY = "agenda-app/events";
const EVENTS_STORAGE_FILE = "agenda-events.json";
const CATEGORIES_STORAGE_KEY = "agenda-app/categories";
const CATEGORIES_STORAGE_FILE = "agenda-categories.json";
const EVENT_TASKS_STORAGE_KEY = "agenda-app/event-tasks";
const EVENT_TASKS_STORAGE_FILE = "agenda-event-tasks.json";
const EVENT_TEMPLATES_STORAGE_KEY = "agenda-app/event-templates";
const EVENT_TEMPLATES_STORAGE_FILE = "agenda-event-templates.json";
const FALLBACK_CATEGORY_ID = "personal";
const TIMELINE_HOUR_SLOT_HEIGHT = 72;
const UPCOMING_WINDOW_DAYS = 10;
const SEARCH_RESULTS_LIMIT = 12;

const SEARCH_SCOPES: { label: string; value: SearchScope }[] = [
  { label: "Día", value: "day" },
  { label: "Semana", value: "week" },
  { label: "Todos", value: "all" },
];

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "Pendientes", value: "pending" },
  { label: "Todos", value: "all" },
  { label: "Completados", value: "completed" },
];

const EVENT_COLORS = [
  { color: "#E05D5D", tone: "#FDECEC" },
  { color: "#3D8B7D", tone: "#E7F4F1" },
  { color: "#9B6AAB", tone: "#F3EAF7" },
  { color: "#D28A2E", tone: "#FFF1DF" },
  { color: "#4D74B8", tone: "#EAF0FB" },
  { color: "#6B7280", tone: "#F1F3F5" },
  { color: "#C6537A", tone: "#FBEAF1" },
  { color: "#5B6ED6", tone: "#EEF0FF" },
  { color: "#2F8FA3", tone: "#E5F6FA" },
  { color: "#6A9442", tone: "#EDF6E6" },
  { color: "#E16F4F", tone: "#FDEFEA" },
  { color: "#B85C9E", tone: "#F8EAF4" },
];

const CATEGORY_ICON_OPTIONS: CategoryIcon[] = [
  "heart-outline",
  "calendar-outline",
  "briefcase-outline",
  "home-outline",
  "gift-outline",
  "notifications-outline",
  "star-outline",
  "fitness-outline",
  "book-outline",
  "restaurant-outline",
  "medical-outline",
  "cart-outline",
];

const DEFAULT_EVENT_CATEGORIES: AgendaCategory[] = [
  {
    color: "#E05D5D",
    icon: "heart-outline",
    id: FALLBACK_CATEGORY_ID,
    isDefault: true,
    label: "Personal",
    sortOrder: 0,
    tone: "#FDECEC",
  },
  {
    color: "#4D74B8",
    icon: "calendar-outline",
    id: "cita",
    isDefault: true,
    label: "Cita",
    sortOrder: 1,
    tone: "#EAF0FB",
  },
  {
    color: "#3D8B7D",
    icon: "briefcase-outline",
    id: "trabajo",
    isDefault: true,
    label: "Trabajo/estudio",
    sortOrder: 2,
    tone: "#E7F4F1",
  },
  {
    color: "#D28A2E",
    icon: "home-outline",
    id: "casa",
    isDefault: true,
    label: "Casa",
    sortOrder: 3,
    tone: "#FFF1DF",
  },
  {
    color: "#9B6AAB",
    icon: "gift-outline",
    id: "cumpleanos",
    isDefault: true,
    label: "Cumpleaños",
    sortOrder: 4,
    tone: "#F3EAF7",
  },
  {
    color: "#6B7280",
    icon: "notifications-outline",
    id: "recordatorio",
    isDefault: true,
    label: "Recordatorio",
    sortOrder: 5,
    tone: "#F1F3F5",
  },
];

const DEFAULT_EVENT_TEMPLATES: EventTemplate[] = [
  {
    categoryId: "cita",
    description: "Revisar hora, dirección y llevar lo necesario.",
    icon: "medical-outline",
    id: "medico",
    isDefault: true,
    label: "Médico",
    location: "",
    reminder: "1 hora antes",
    sortOrder: 0,
    startTime: "10:00",
    tasks: [
      "Confirmar hora de la cita",
      "Llevar tarjeta sanitaria o documentación",
      "Anotar síntomas o preguntas",
      "Revisar dirección y tiempo de llegada",
    ],
    title: "Cita médica",
  },
  {
    categoryId: "casa",
    description: "Lista rápida para no olvidarse de nada importante.",
    icon: "cart-outline",
    id: "compra",
    isDefault: true,
    label: "Compra",
    location: "Supermercado",
    reminder: "30 min antes",
    sortOrder: 1,
    startTime: "11:00",
    tasks: [
      "Revisar nevera y despensa",
      "Apuntar productos básicos",
      "Añadir capricho o plan especial",
      "Llevar bolsas",
    ],
    title: "Compra",
  },
  {
    categoryId: "cita",
    description: "Plan bonito reservado para disfrutar sin prisas.",
    icon: "heart-outline",
    id: "cita",
    isDefault: true,
    label: "Cita",
    location: "",
    reminder: "1 hora antes",
    sortOrder: 2,
    startTime: "20:30",
    tasks: [
      "Reservar sitio",
      "Confirmar hora",
      "Preparar detalle",
      "Mirar ruta o transporte",
    ],
    title: "Cita especial",
  },
  {
    categoryId: "personal",
    description: "Organizar viaje con lo esencial controlado.",
    icon: "airplane-outline",
    id: "viaje",
    isDefault: true,
    label: "Viaje",
    location: "",
    reminder: "1 hora antes",
    sortOrder: 3,
    startTime: "09:00",
    tasks: [
      "Revisar documentación",
      "Preparar maleta",
      "Confirmar reservas",
      "Mirar horarios y transporte",
      "Cargar móvil y batería externa",
    ],
    title: "Viaje",
  },
  {
    categoryId: "cumpleanos",
    description: "Preparar cumpleaños con regalo, felicitación y plan.",
    icon: "gift-outline",
    id: "cumpleanos",
    isDefault: true,
    label: "Cumple",
    location: "",
    reminder: "1 hora antes",
    sortOrder: 4,
    startTime: "18:00",
    tasks: [
      "Comprar regalo",
      "Preparar felicitación",
      "Confirmar plan o reserva",
      "Llevar velas o detalle",
    ],
    title: "Cumpleaños",
  },
  {
    categoryId: "trabajo",
    description: "Bloque enfocado para avanzar sin interrupciones.",
    icon: "briefcase-outline",
    id: "trabajo",
    isDefault: true,
    label: "Trabajo",
    location: "",
    reminder: "15 min antes",
    sortOrder: 5,
    startTime: "09:00",
    tasks: [
      "Definir objetivo del bloque",
      "Preparar material",
      "Cerrar distracciones",
      "Anotar siguiente paso",
    ],
    title: "Bloque de trabajo",
  },
];

const REMINDER_OPTIONS = [
  "Sin aviso",
  "15 min antes",
  "30 min antes",
  "1 hora antes",
];
const RECURRENCE_OPTIONS: { label: string; value: Recurrence }[] = [
  { label: "Nunca", value: "none" },
  { label: "Cada día", value: "daily" },
  { label: "Cada semana", value: "weekly" },
  { label: "Cada mes", value: "monthly" },
];

const RECURRENCE_WEEK_DAYS = [
  { label: "L", value: 1 },
  { label: "M", value: 2 },
  { label: "X", value: 3 },
  { label: "J", value: 4 },
  { label: "V", value: 5 },
  { label: "S", value: 6 },
  { label: "D", value: 0 },
];

const RECURRENCE_END_OPTIONS = [
  { label: "Sin fin", months: null },
  { label: "1 mes", months: 1 },
  { label: "3 meses", months: 3 },
  { label: "6 meses", months: 6 },
  { label: "1 año", months: 12 },
];

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "No se repite",
  daily: "Cada día",
  weekly: "Cada semana",
  monthly: "Cada mes",
};

const RECURRENCE_END_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

const REMINDER_OFFSETS_IN_MINUTES: Record<string, number | null> = {
  "Sin aviso": null,
  "15 min antes": 15,
  "30 min antes": 30,
  "1 hora antes": 60,
};

const TOAST_PALETTE: Record<
  AppToastVariant,
  { backgroundColor: string; iconBackgroundColor: string; iconColor: string }
> = {
  success: {
    backgroundColor: "#102B25",
    iconBackgroundColor: "#3D8B7D",
    iconColor: "#FFFFFF",
  },
  info: {
    backgroundColor: "#172033",
    iconBackgroundColor: "#4D74B8",
    iconColor: "#FFFFFF",
  },
  warning: {
    backgroundColor: "#3B2A12",
    iconBackgroundColor: "#D28A2E",
    iconColor: "#FFFFFF",
  },
  danger: {
    backgroundColor: "#3A1616",
    iconBackgroundColor: "#B42318",
    iconColor: "#FFFFFF",
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DEFAULT_CATEGORY_BY_ID = DEFAULT_EVENT_CATEGORIES.reduce(
  (categories, category) => ({
    ...categories,
    [category.id]: category,
  }),
  {} as Record<string, AgendaCategory>,
);

type BrowserLocalStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type ConfirmDialogOptions = {
  confirmText: string;
  message: string;
  onConfirm: () => void;
  title: string;
};

function showConfirmDialog({
  confirmText,
  message,
  onConfirm,
  title,
}: ConfirmDialogOptions) {
  if (Platform.OS === "web") {
    const browserConfirm = (
      globalThis as { confirm?: (text: string) => boolean }
    ).confirm;

    if (!browserConfirm || browserConfirm(`${title}\n\n${message}`)) {
      onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    {
      text: confirmText,
      style: "destructive",
      onPress: onConfirm,
    },
  ]);
}

function createDefaultCategories() {
  return DEFAULT_EVENT_CATEGORIES.map((category) => ({ ...category }));
}

function createDefaultEventTemplates() {
  return DEFAULT_EVENT_TEMPLATES.map((template) => ({
    ...template,
    tasks: [...template.tasks],
  }));
}

function sortEventTemplates(templates: EventTemplate[]) {
  return [...templates].sort((firstTemplate, secondTemplate) => {
    if (firstTemplate.sortOrder !== secondTemplate.sortOrder) {
      return firstTemplate.sortOrder - secondTemplate.sortOrder;
    }

    return firstTemplate.label.localeCompare(secondTemplate.label, "es");
  });
}

function sortCategories(categories: AgendaCategory[]) {
  return [...categories].sort((firstCategory, secondCategory) => {
    if (firstCategory.sortOrder !== secondCategory.sortOrder) {
      return firstCategory.sortOrder - secondCategory.sortOrder;
    }

    return firstCategory.label.localeCompare(secondCategory.label, "es");
  });
}

function normalizeCategoryIcon(value: unknown): CategoryIcon {
  if (typeof value === "string" && value in Ionicons.glyphMap) {
    return value as CategoryIcon;
  }

  return "pricetag-outline";
}

function normalizeCategoryId(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : FALLBACK_CATEGORY_ID;
}

function getCategoriesById(categories: AgendaCategory[]) {
  return categories.reduce(
    (categoryMap, category) => ({
      ...categoryMap,
      [category.id]: category,
    }),
    {} as Record<string, AgendaCategory>,
  );
}

function getCategoryById(
  categoryId: string,
  categoriesById: Record<string, AgendaCategory>,
) {
  return (
    categoriesById[categoryId] ??
    categoriesById[FALLBACK_CATEGORY_ID] ??
    DEFAULT_CATEGORY_BY_ID[FALLBACK_CATEGORY_ID] ??
    DEFAULT_EVENT_CATEGORIES[0]
  );
}

function getEventCategory(
  event: Pick<AgendaEvent, "category">,
  categoriesById: Record<string, AgendaCategory>,
) {
  return getCategoryById(event.category, categoriesById);
}

function startOfWeek(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(date.getMonth() + months);
  return nextDate;
}

function startOfMonth(date: Date) {
  const monthStart = new Date(date);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
}

function isSameDay(firstDate: Date, secondDate: Date) {
  return firstDate.toDateString() === secondDate.toDateString();
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const startMonth = MONTH_FORMATTER.format(weekStart);
  const endMonth = MONTH_FORMATTER.format(weekEnd);
  const startDay = DAY_FORMATTER.format(weekStart);
  const endDay = DAY_FORMATTER.format(weekEnd);

  if (startMonth === endMonth) {
    return `${startDay}-${endDay} de ${startMonth}`;
  }

  return `${startDay} de ${startMonth} - ${endDay} de ${endMonth}`;
}

function getOccurrenceStartForDate(event: AgendaEvent, date: Date) {
  const occurrenceDate = new Date(date);
  const { hour, minute } = splitTime(event.startTime);
  occurrenceDate.setHours(Number(hour), Number(minute), 0, 0);
  return occurrenceDate;
}

function getReminderVisualInfo(
  event: AgendaEvent,
  occurrenceDate: Date,
  currentTime: Date,
): ReminderVisualInfo {
  const minutesUntil = Math.ceil(
    (occurrenceDate.getTime() - currentTime.getTime()) / (60 * 1000),
  );
  const eventTime = TIME_FORMATTER.format(occurrenceDate);

  if (event.completed) {
    return {
      color: "#3D8B7D",
      icon: "checkmark-circle-outline",
      label: "Completado",
      state: "completed",
      tone: "#E7F4F1",
    };
  }

  if (occurrenceDate < currentTime && !isSameDay(occurrenceDate, currentTime)) {
    return {
      color: "#B42318",
      icon: "alert-circle-outline",
      label: "Atrasado",
      state: "overdue",
      tone: "#FFF1F0",
    };
  }

  if (isSameDay(occurrenceDate, currentTime)) {
    if (minutesUntil <= -5) {
      return {
        color: "#B42318",
        icon: "alert-circle-outline",
        label: `Pendiente desde ${eventTime}`,
        state: "overdue",
        tone: "#FFF1F0",
      };
    }

    if (minutesUntil <= 0) {
      return {
        color: "#B42318",
        icon: "flash-outline",
        label: "Ahora",
        state: "now",
        tone: "#FFF1F0",
      };
    }

    if (minutesUntil <= 15) {
      return {
        color: "#B42318",
        icon: "alarm-outline",
        label: `En ${minutesUntil} min`,
        state: "soon",
        tone: "#FFF1F0",
      };
    }

    if (minutesUntil <= 60) {
      return {
        color: "#D28A2E",
        icon: "time-outline",
        label: `En ${minutesUntil} min`,
        state: "soon",
        tone: "#FFF1DF",
      };
    }

    return {
      color: event.color,
      icon: "today-outline",
      label: `Hoy ${eventTime}`,
      state: "today",
      tone: event.tone,
    };
  }

  if (isSameDay(occurrenceDate, addDays(currentTime, 1))) {
    return {
      color: event.color,
      icon: "sunny-outline",
      label: `Mañana ${eventTime}`,
      state: "future",
      tone: event.tone,
    };
  }

  return {
    color: event.color,
    icon: "calendar-outline",
    label: `${UPCOMING_DATE_FORMATTER.format(occurrenceDate)} · ${eventTime}`,
    state: "future",
    tone: event.tone,
  };
}

function getReminderBadgeLabel(
  reminderInfo: ReminderVisualInfo,
  variant: ReminderBadgeProps["variant"] = "compact",
) {
  if (
    variant !== "detail" &&
    reminderInfo.state === "overdue" &&
    reminderInfo.label.startsWith("Pendiente desde ")
  ) {
    return reminderInfo.label.replace("Pendiente desde ", "Desde ");
  }

  return reminderInfo.label;
}

function createInitialEvents(today: Date): AgendaEvent[] {
  const weekStart = startOfWeek(today);
  const eventData = [
    {
      id: "coffee",
      title: "Café juntas",
      description: "Plan tranquilo para empezar el día sin prisas.",
      location: "Cafetería favorita",
      dayOffset: 0,
      startTime: "09:30",
      reminder: "15 min antes",
      palette: EVENT_COLORS[0],
      category: "personal" as EventCategory,
    },
    {
      id: "workout",
      title: "Pilates",
      description: "Clase reservada. Llevar agua y calcetines.",
      location: "Centro deportivo",
      dayOffset: 1,
      startTime: "18:00",
      reminder: "1 hora antes",
      palette: EVENT_COLORS[1],
      category: "personal" as EventCategory,
    },
    {
      id: "dinner",
      title: "Cena especial",
      description: "Reservar sitio bonito y confirmar hora.",
      location: "Restaurante pendiente",
      dayOffset: 2,
      startTime: "21:00",
      reminder: "2 horas antes",
      palette: EVENT_COLORS[2],
      category: "cita" as EventCategory,
    },
    {
      id: "study",
      title: "Bloque personal",
      description: "Tiempo para ordenar tareas, notas y pendientes.",
      location: "Casa",
      dayOffset: 3,
      startTime: "17:15",
      reminder: "30 min antes",
      palette: EVENT_COLORS[3],
      category: "trabajo" as EventCategory,
    },
    {
      id: "market",
      title: "Compra semanal",
      description: "Fruta, cena del finde y cosas de casa.",
      location: "Supermercado",
      dayOffset: 5,
      startTime: "11:00",
      reminder: "Sin aviso",
      palette: EVENT_COLORS[4],
      category: "casa" as EventCategory,
    },
  ];

  return eventData.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    completed: false,
    dateKey: toDateKey(addDays(weekStart, event.dayOffset)),
    startTime: event.startTime,
    color: event.palette.color,
    tone: event.palette.tone,
    reminder: event.reminder,
    recurrence: "none",
    recurrenceInterval: 1,
    recurrenceWeekdays: [],
    recurrenceEndDate: undefined,
    category: event.category,
  }));
}

function createEmptyForm(date: Date): EventForm {
  return {
    title: "",
    description: "",
    location: "",
    completed: false,
    dateKey: toDateKey(date),
    startTime: "09:00",
    color: EVENT_COLORS[0].color,
    tone: EVENT_COLORS[0].tone,
    reminder: REMINDER_OPTIONS[1],
    recurrence: "none",
    recurrenceInterval: 1,
    recurrenceWeekdays: [date.getDay()],
    recurrenceEndDate: undefined,
    category: "personal",
  };
}

function splitTime(time: string) {
  const [hour = "09", minute = "00"] = time.split(":");

  return {
    hour: hour.padStart(2, "0"),
    minute: minute.padStart(2, "0"),
  };
}

function formatTimelineHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getDateWithTime(date: Date, time: string) {
  const nextDate = new Date(date);
  const { hour, minute } = splitTime(time);
  nextDate.setHours(Number(hour), Number(minute), 0, 0);
  return nextDate;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

function getDaysBetween(firstDate: Date, secondDate: Date) {
  return Math.round(
    (startOfDay(secondDate).getTime() - startOfDay(firstDate).getTime()) /
      (24 * 60 * 60 * 1000),
  );
}

function getMonthsBetween(firstDate: Date, secondDate: Date) {
  return (
    (secondDate.getFullYear() - firstDate.getFullYear()) * 12 +
    secondDate.getMonth() -
    firstDate.getMonth()
  );
}

function isValidRecurrence(value: unknown): value is Recurrence {
  return (
    value === "none" ||
    value === "daily" ||
    value === "weekly" ||
    value === "monthly"
  );
}

function isValidEventCategory(value: unknown): value is EventCategory {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeRecurrenceInterval(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.round(value), 1), 365);
}

function normalizeRecurrenceWeekdays(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((weekday) => Number(weekday))
        .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6),
    ),
  );
}

function normalizeRecurrenceEndDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return value;
}

function normalizeAgendaCategory(value: unknown): AgendaCategory | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AgendaCategory>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.label !== "string" ||
    typeof candidate.color !== "string" ||
    typeof candidate.tone !== "string"
  ) {
    return null;
  }

  return {
    id: normalizeCategoryId(candidate.id),
    label: candidate.label.trim() || "Categoría",
    icon: normalizeCategoryIcon(candidate.icon),
    color: candidate.color,
    tone: candidate.tone,
    sortOrder:
      typeof candidate.sortOrder === "number" ? candidate.sortOrder : 999,
    isDefault:
      typeof candidate.isDefault === "boolean" ? candidate.isDefault : false,
  };
}

function createEmptyCategoryForm(): CategoryForm {
  return {
    label: "",
    icon: "star-outline",
    color: EVENT_COLORS[0].color,
    tone: EVENT_COLORS[0].tone,
  };
}

function normalizeAgendaCategoryList(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedCategories = value
    .map((category) => normalizeAgendaCategory(category))
    .filter((category): category is AgendaCategory => category !== null);

  return normalizedCategories.length === value.length
    ? sortCategories(normalizedCategories)
    : null;
}

function normalizeEventTemplate(value: unknown): EventTemplate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<EventTemplate>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.label !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.description !== "string" ||
    typeof candidate.location !== "string" ||
    typeof candidate.reminder !== "string" ||
    typeof candidate.categoryId !== "string" ||
    !Array.isArray(candidate.tasks)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    label: candidate.label,
    title: candidate.title,
    description: candidate.description,
    location: candidate.location,
    reminder: candidate.reminder,
    startTime:
      typeof candidate.startTime === "string" ? candidate.startTime : undefined,
    categoryId: candidate.categoryId,
    icon: normalizeCategoryIcon(candidate.icon),
    tasks: candidate.tasks.filter((task): task is string => typeof task === "string"),
    sortOrder:
      typeof candidate.sortOrder === "number" ? candidate.sortOrder : 999,
    isDefault:
      typeof candidate.isDefault === "boolean" ? candidate.isDefault : false,
  };
}

function normalizeEventTemplateList(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedTemplates = value
    .map((template) => normalizeEventTemplate(template))
    .filter((template): template is EventTemplate => template !== null);

  return normalizedTemplates.length > 0
    ? sortEventTemplates(normalizedTemplates)
    : null;
}

function normalizeAgendaEvent(value: unknown): AgendaEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AgendaEvent>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.description !== "string" ||
    typeof candidate.dateKey !== "string" ||
    typeof candidate.startTime !== "string" ||
    typeof candidate.color !== "string" ||
    typeof candidate.tone !== "string" ||
    typeof candidate.reminder !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    title: candidate.title,
    description: candidate.description,
    location: typeof candidate.location === "string" ? candidate.location : "",
    completed:
      typeof candidate.completed === "boolean" ? candidate.completed : false,
    dateKey: candidate.dateKey,
    startTime: candidate.startTime,
    color: candidate.color,
    tone: candidate.tone,
    reminder: candidate.reminder,
    recurrence: isValidRecurrence(candidate.recurrence)
      ? candidate.recurrence
      : "none",
    recurrenceInterval: normalizeRecurrenceInterval(
      candidate.recurrenceInterval,
    ),
    recurrenceWeekdays: normalizeRecurrenceWeekdays(
      candidate.recurrenceWeekdays,
    ),
    recurrenceEndDate: normalizeRecurrenceEndDate(
      candidate.recurrenceEndDate,
    ),
    category: isValidEventCategory(candidate.category)
      ? candidate.category
      : "personal",
    notificationId:
      typeof candidate.notificationId === "string"
        ? candidate.notificationId
        : undefined,
    deletedAt:
      typeof candidate.deletedAt === "string" ? candidate.deletedAt : undefined,
  };
}

function normalizeAgendaEventTask(value: unknown): AgendaEventTask | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AgendaEventTask>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.eventId !== "string" ||
    typeof candidate.title !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    eventId: candidate.eventId,
    title: candidate.title,
    completed:
      typeof candidate.completed === "boolean" ? candidate.completed : false,
    sortOrder:
      typeof candidate.sortOrder === "number" ? candidate.sortOrder : 999,
  };
}

function eventOccursOnDate(event: AgendaEvent, date: Date) {
  const eventDate = parseDateKey(event.dateKey);
  const occurrenceDate = startOfDay(date);
  const interval = normalizeRecurrenceInterval(event.recurrenceInterval);
  const daysSinceStart = getDaysBetween(eventDate, occurrenceDate);

  if (daysSinceStart < 0) {
    return false;
  }

  if (event.recurrenceEndDate) {
    const recurrenceEndDate = parseDateKey(event.recurrenceEndDate);

    if (getDaysBetween(recurrenceEndDate, occurrenceDate) > 0) {
      return false;
    }
  }

  if (event.recurrence === "none") {
    return isSameDay(occurrenceDate, eventDate);
  }

  if (event.recurrence === "daily") {
    return daysSinceStart % interval === 0;
  }

  if (event.recurrence === "weekly") {
    const selectedWeekdays =
      event.recurrenceWeekdays.length > 0
        ? event.recurrenceWeekdays
        : [eventDate.getDay()];
    const weeksSinceStart = Math.floor(
      getDaysBetween(startOfWeek(eventDate), startOfWeek(occurrenceDate)) / 7,
    );

    return (
      weeksSinceStart >= 0 &&
      weeksSinceStart % interval === 0 &&
      selectedWeekdays.includes(occurrenceDate.getDay())
    );
  }

  const monthsSinceStart = getMonthsBetween(eventDate, occurrenceDate);

  if (monthsSinceStart < 0 || monthsSinceStart % interval !== 0) {
    return false;
  }

  return occurrenceDate.getDate() === eventDate.getDate();
}

function getEventStartDate(event: AgendaEvent) {
  const date = parseDateKey(event.dateKey);
  const { hour, minute } = splitTime(event.startTime);
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date;
}

function getNextOccurrenceStart(event: AgendaEvent, fromDate = new Date()) {
  const firstOccurrence = getEventStartDate(event);

  if (event.recurrence === "none") {
    return firstOccurrence > fromDate ? firstOccurrence : null;
  }

  const searchEndDate = event.recurrenceEndDate
    ? parseDateKey(event.recurrenceEndDate)
    : addDays(fromDate, 365 * 3);
  const candidate = startOfDay(fromDate > firstOccurrence ? fromDate : firstOccurrence);
  const { hour, minute } = splitTime(event.startTime);

  while (candidate <= searchEndDate) {
    if (eventOccursOnDate(event, candidate)) {
      const occurrenceDate = new Date(candidate);
      occurrenceDate.setHours(Number(hour), Number(minute), 0, 0);

      if (occurrenceDate > fromDate) {
        return occurrenceDate;
      }
    }

    candidate.setDate(candidate.getDate() + 1);
  }

  return null;
}

function getRecurrenceSummaryLabel(
  event: Pick<
    AgendaEvent,
    | "dateKey"
    | "recurrence"
    | "recurrenceEndDate"
    | "recurrenceInterval"
    | "recurrenceWeekdays"
  >,
) {
  if (event.recurrence === "none") {
    return RECURRENCE_LABELS.none;
  }

  const interval = normalizeRecurrenceInterval(event.recurrenceInterval);
  const intervalText =
    event.recurrence === "daily"
      ? interval === 1
        ? "Cada día"
        : `Cada ${interval} días`
      : event.recurrence === "weekly"
        ? interval === 1
          ? "Cada semana"
          : `Cada ${interval} semanas`
        : interval === 1
          ? "Cada mes"
          : `Cada ${interval} meses`;
  const weekdayText =
    event.recurrence === "weekly"
      ? (
          event.recurrenceWeekdays.length > 0
            ? event.recurrenceWeekdays
            : [parseDateKey(event.dateKey).getDay()]
        )
          .map(
            (weekday) =>
              RECURRENCE_WEEK_DAYS.find((day) => day.value === weekday)
                ?.label,
          )
          .filter(Boolean)
          .join(", ")
      : "";
  const endText = event.recurrenceEndDate
    ? ` · hasta ${RECURRENCE_END_FORMATTER.format(
        parseDateKey(event.recurrenceEndDate),
      )}`
    : "";

  return `${intervalText}${weekdayText ? ` · ${weekdayText}` : ""}${endText}`;
}

function getEventTaskStats(tasks: AgendaEventTask[]) {
  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;

  return {
    completed,
    pending: total - completed,
    total,
  };
}

function getEventTaskStatsLabel(tasks: AgendaEventTask[]) {
  const stats = getEventTaskStats(tasks);

  if (stats.total === 0) {
    return "Sin tareas";
  }

  if (stats.pending === 0) {
    return `${stats.total} ${stats.total === 1 ? "tarea" : "tareas"} hechas`;
  }

  return `${stats.completed}/${stats.total} hechas`;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function createCategoryId(label: string) {
  const baseId =
    normalizeSearchText(label)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "categoria";

  return `${baseId}-${Date.now()}`;
}

function eventMatchesSearch(
  event: AgendaEvent,
  searchQuery: string,
  categoriesById: Record<string, AgendaCategory> = DEFAULT_CATEGORY_BY_ID,
  tasks: AgendaEventTask[] = [],
) {
  const normalizedQuery = normalizeSearchText(searchQuery);

  if (!normalizedQuery) {
    return true;
  }

  const categoryLabel = getEventCategory(event, categoriesById).label;
  const taskText = tasks.map((task) => task.title).join(" ");
  const searchableText = normalizeSearchText(
    `${event.title} ${event.description} ${event.location} ${categoryLabel} ${event.reminder} ${taskText} ${
      event.completed ? "completado hecho terminado" : "pendiente"
    }`,
  );

  return searchableText.includes(normalizedQuery);
}

function eventMatchesStatusFilter(
  event: AgendaEvent,
  statusFilter: StatusFilter,
) {
  if (statusFilter === "all") {
    return true;
  }

  return statusFilter === "completed" ? event.completed : !event.completed;
}

function ReminderBadge({
  currentTime,
  event,
  occurrenceDate,
  variant = "compact",
}: ReminderBadgeProps) {
  const styles = useAgendaStyles();
  const { isDark } = useAppTheme();
  const reminderInfo = getReminderVisualInfo(event, occurrenceDate, currentTime);
  const isDetail = variant === "detail";
  const isInline = variant === "inline";
  const reminderLabel = getReminderBadgeLabel(reminderInfo, variant);

  return (
    <View
      style={[
        styles.visualReminderBadge,
        isDetail && styles.visualReminderBadgeDetail,
        isInline && styles.visualReminderBadgeInline,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.08)"
            : reminderInfo.tone,
          borderColor: reminderInfo.color,
        },
      ]}
    >
      <Ionicons
        name={reminderInfo.icon}
        size={isDetail ? 17 : 13}
        color={reminderInfo.color}
      />
      <Text
        style={[
          styles.visualReminderText,
          isDetail && styles.visualReminderTextDetail,
          { color: reminderInfo.color },
        ]}
        numberOfLines={isDetail ? 2 : 1}
      >
        {reminderLabel}
      </Text>
    </View>
  );
}

function EventTaskPill({
  color,
  tasks,
  variant = "compact",
}: EventTaskPillProps) {
  const styles = useAgendaStyles();

  if (tasks.length === 0) {
    return null;
  }

  const isDetail = variant === "detail";
  const isInline = variant === "inline";

  return (
    <View
      style={[
        styles.eventTaskPill,
        isDetail && styles.eventTaskPillDetail,
        isInline && styles.eventTaskPillInline,
      ]}
    >
      <Ionicons
        name="checkbox-outline"
        size={isDetail ? 17 : 13}
        color={color}
      />
      <Text
        style={[
          styles.eventTaskPillText,
          isDetail && styles.eventTaskPillTextDetail,
          { color },
        ]}
        numberOfLines={1}
      >
        {getEventTaskStatsLabel(tasks)}
      </Text>
    </View>
  );
}

function AgendaEmptyState({
  actionIcon = "add",
  actionLabel,
  compact = false,
  icon,
  onAction,
  text,
  title,
}: AgendaEmptyStateProps) {
  const styles = useAgendaStyles();
  const { isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.agendaEmptyState,
        compact && styles.agendaEmptyStateCompact,
      ]}
    >
      <View style={styles.agendaEmptyIcon}>
        <Ionicons
          name={icon}
          size={compact ? 23 : 27}
          color={isDark ? "#F8FAFC" : "#172033"}
        />
      </View>
      <Text style={styles.agendaEmptyTitle}>{title}</Text>
      <Text style={styles.agendaEmptyText}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.agendaEmptyAction} onPress={onAction}>
          <Ionicons name={actionIcon} size={16} color="#FFFFFF" />
          <Text style={styles.agendaEmptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CompletionAnimatedRow({
  children,
  completed,
}: CompletionAnimatedRowProps) {
  const styles = useAgendaStyles();
  const checkAnimation = useRef(new Animated.Value(0)).current;
  const rowScale = useRef(new Animated.Value(1)).current;
  const previousCompletedRef = useRef(completed);

  useEffect(() => {
    if (previousCompletedRef.current === completed) {
      return;
    }

    previousCompletedRef.current = completed;

    Animated.sequence([
      Animated.timing(rowScale, {
        duration: 90,
        toValue: 0.985,
        useNativeDriver: true,
      }),
      Animated.spring(rowScale, {
        damping: 13,
        mass: 0.7,
        stiffness: 220,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    if (!completed) {
      checkAnimation.setValue(0);
      return;
    }

    checkAnimation.setValue(0);
    Animated.sequence([
      Animated.spring(checkAnimation, {
        damping: 11,
        mass: 0.7,
        stiffness: 210,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.delay(460),
      Animated.timing(checkAnimation, {
        duration: 220,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [checkAnimation, completed, rowScale]);

  const checkScale = checkAnimation.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0.55, 1.12, 1],
  });

  return (
    <Animated.View
      style={[
        styles.completionAnimatedWrap,
        { transform: [{ scale: rowScale }] },
      ]}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.completionCheckBadge,
          {
            opacity: checkAnimation,
            transform: [{ scale: checkScale }],
          },
        ]}
      >
        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
      </Animated.View>
    </Animated.View>
  );
}

function SwipeableEventRow({
  children,
  completed,
  enabled = true,
  onComplete,
  onDelete,
}: SwipeableEventRowProps) {
  const styles = useAgendaStyles();
  const swipeableRef = useRef<Swipeable>(null);

  const runAction = (action: () => void) => {
    swipeableRef.current?.close();
    action();
  };

  const renderLeftActions = () => (
    <View style={[styles.swipeActionPane, styles.swipeActionPaneLeft]}>
      <RectButton
        style={[styles.swipeActionButton, styles.swipeCompleteButton]}
        onPress={() => runAction(onComplete)}
      >
        <Ionicons
          name={completed ? "return-down-back-outline" : "checkmark-outline"}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.swipeActionText}>
          {completed ? "Pendiente" : "Completar"}
        </Text>
      </RectButton>
    </View>
  );

  const renderRightActions = () => (
    <View style={[styles.swipeActionPane, styles.swipeActionPaneRight]}>
      <RectButton
        style={[styles.swipeActionButton, styles.swipeDeleteButton]}
        onPress={() => runAction(onDelete)}
      >
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        <Text style={styles.swipeActionText}>Borrar</Text>
      </RectButton>
    </View>
  );

  if (!enabled) {
    return (
      <View style={styles.swipeRow}>
        <CompletionAnimatedRow completed={completed}>
          {children}
        </CompletionAnimatedRow>
      </View>
    );
  }

  return (
    <View style={styles.swipeRow}>
      <Swipeable
        ref={swipeableRef}
        friction={2}
        leftThreshold={42}
        overshootLeft={false}
        overshootRight={false}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        rightThreshold={42}
      >
        <CompletionAnimatedRow completed={completed}>
          {children}
        </CompletionAnimatedRow>
      </Swipeable>
    </View>
  );
}

function QuickDraggableEvent({
  children,
  dragEnabled = true,
  event,
  isDragging,
  onDragCancel,
  onDragEnd,
  onDragMove,
  onDragStart,
  onOpen,
  variant = "compact",
}: QuickDraggableEventProps) {
  const styles = useAgendaStyles();
  const isDraggingRef = useRef(false);
  const ignoreNextPressRef = useRef(false);
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const animateScale = useCallback(
    (value: number) => {
      Animated.spring(scaleAnimation, {
        damping: 16,
        mass: 0.8,
        stiffness: 220,
        toValue: value,
        useNativeDriver: true,
      }).start();
    },
    [scaleAnimation],
  );

  useEffect(() => {
    if (!isDragging) {
      animateScale(1);
    }
  }, [animateScale, isDragging]);

  const getTouchPosition = useCallback((gestureEvent: GestureResponderEvent) => {
    const touch =
      gestureEvent.nativeEvent.touches?.[0] ??
      gestureEvent.nativeEvent.changedTouches?.[0];

    return {
      pageX: touch?.pageX ?? gestureEvent.nativeEvent.pageX,
      pageY: touch?.pageY ?? gestureEvent.nativeEvent.pageY,
    };
  }, []);

  const handlePressIn = useCallback(() => {
    if (!isDraggingRef.current) {
      animateScale(0.97);
    }
  }, [animateScale]);

  const handlePressOut = useCallback(() => {
    if (!isDraggingRef.current) {
      animateScale(1);
    }
  }, [animateScale]);

  const handlePress = useCallback(() => {
    if (ignoreNextPressRef.current) {
      ignoreNextPressRef.current = false;
      return;
    }

    onOpen();
  }, [onOpen]);

  const handleLongPress = useCallback(
    (gestureEvent: GestureResponderEvent) => {
      if (!dragEnabled) {
        return;
      }

      const { pageX, pageY } = getTouchPosition(gestureEvent);

      isDraggingRef.current = true;
      ignoreNextPressRef.current = true;
      animateScale(1.04);
      onDragStart(event, pageX, pageY);
    },
    [animateScale, dragEnabled, event, getTouchPosition, onDragStart],
  );

  const handleTouchMove = useCallback(
    (gestureEvent: GestureResponderEvent) => {
      if (!isDraggingRef.current) {
        return;
      }

      const { pageX, pageY } = getTouchPosition(gestureEvent);
      onDragMove(pageX, pageY);
    },
    [getTouchPosition, onDragMove],
  );

  const handleTouchEnd = useCallback(
    (gestureEvent: GestureResponderEvent) => {
      if (!isDraggingRef.current) {
        return;
      }

      const { pageX, pageY } = getTouchPosition(gestureEvent);

      isDraggingRef.current = false;
      ignoreNextPressRef.current = true;
      animateScale(1);
      onDragEnd(pageX, pageY);
    },
    [animateScale, getTouchPosition, onDragEnd],
  );

  const handleTouchCancel = useCallback(() => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    ignoreNextPressRef.current = true;
    animateScale(1);
    onDragCancel();
  }, [animateScale, onDragCancel]);

  return (
    <Pressable
      accessibilityHint={
        !dragEnabled
          ? "Toca para abrir el detalle."
          : variant === "plain"
          ? "Toca para editar. Mantén pulsado para moverlo a otra hora."
          : "Toca para editar. Mantén pulsado para moverlo a otro día."
      }
      accessibilityLabel="Evento de vista rápida"
      accessibilityRole="button"
      delayLongPress={280}
      hitSlop={6}
      onLongPress={dragEnabled ? handleLongPress : undefined}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onTouchCancel={handleTouchCancel}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      style={styles.compactEventTouchArea}
    >
      <Animated.View
        style={[
          variant === "compact" && styles.compactEvent,
          variant === "compact" &&
            event.completed &&
            styles.compactEventCompleted,
          variant === "compact" && isDragging && styles.compactEventDragging,
          variant === "plain" && styles.draggablePlainEvent,
          variant === "plain" &&
            isDragging &&
            styles.draggablePlainEventDragging,
          { transform: [{ scale: scaleAnimation }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}



type DraggableBottomSheetProps = {
  animationKey?: string | number | boolean | null;
  canClose?: () => boolean;
  children: ReactNode;
  onClose: () => void;
  style?: object;
};

function DraggableBottomSheet({
  animationKey,
  canClose,
  children,
  onClose,
  style,
}: DraggableBottomSheetProps) {
  const styles = useAgendaStyles();
  const translateY = useRef(new Animated.Value(34)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetScale = useRef(new Animated.Value(0.98)).current;
  const startYRef = useRef(0);

  useEffect(() => {
    translateY.stopAnimation();
    sheetOpacity.stopAnimation();
    sheetScale.stopAnimation();
    translateY.setValue(34);
    sheetOpacity.setValue(0);
    sheetScale.setValue(0.98);

    Animated.parallel([
      Animated.spring(translateY, {
        damping: 20,
        mass: 0.75,
        stiffness: 190,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(sheetScale, {
        damping: 18,
        mass: 0.75,
        stiffness: 190,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        duration: 170,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animationKey, sheetOpacity, sheetScale, translateY]);

  const closeWithMotion = useCallback(() => {
    if (canClose && !canClose()) {
      Animated.spring(translateY, {
        damping: 18,
        mass: 0.8,
        stiffness: 170,
        toValue: 0,
        useNativeDriver: true,
      }).start();
      return;
    }

    translateY.stopAnimation();
    sheetOpacity.stopAnimation();
    sheetScale.stopAnimation();
    sheetScale.setValue(1);

    Animated.timing(sheetOpacity, {
      duration: 170,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  }, [canClose, onClose, sheetOpacity, sheetScale, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        Math.abs(gestureState.dy) > 6,
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        translateY.stopAnimation((value) => {
          startYRef.current = value;
        });
      },
      onPanResponderMove: (_event, gestureState) => {
        const nextY = Math.max(-120, startYRef.current + gestureState.dy);
        translateY.setValue(nextY);
      },
      onPanResponderRelease: (_event, gestureState) => {
        if (gestureState.dy > 130 || gestureState.vy > 1.05) {
          closeWithMotion();
          return;
        }

        Animated.spring(translateY, {
          damping: 18,
          mass: 0.8,
          stiffness: 170,
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          damping: 18,
          mass: 0.8,
          stiffness: 170,
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.draggableSheet,
        style,
        {
          opacity: sheetOpacity,
          transform: [{ translateY }, { scale: sheetScale }],
        },
      ]}
    >
      <View
        accessibilityLabel="Arrastrar modal"
        accessibilityRole="adjustable"
        style={styles.sheetDragHandleArea}
        {...panResponder.panHandlers}
      >
        <View style={styles.modalHandle} />
      </View>
      {children}
    </Animated.View>
  );
}

function getAllSearchResultEvents(events: AgendaEvent[]) {
  const now = new Date();

  return events
    .map((event) => ({
      event,
      occurrenceDate:
        getNextOccurrenceStart(event, now) ?? getEventStartDate(event),
    }))
    .sort((firstItem, secondItem) => {
      const firstIsFuture = firstItem.occurrenceDate >= now;
      const secondIsFuture = secondItem.occurrenceDate >= now;

      if (firstIsFuture !== secondIsFuture) {
        return firstIsFuture ? -1 : 1;
      }

      return (
        firstItem.occurrenceDate.getTime() - secondItem.occurrenceDate.getTime()
      );
    });
}

function getEventOccurrencesBetween(
  events: AgendaEvent[],
  startDate: Date,
  endDate: Date,
) {
  const occurrences: UpcomingEvent[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const finalDate = new Date(endDate);
  finalDate.setHours(0, 0, 0, 0);

  while (cursor <= finalDate) {
    events.forEach((event) => {
      if (eventOccursOnDate(event, cursor)) {
        const occurrenceDate = new Date(cursor);
        const { hour, minute } = splitTime(event.startTime);
        occurrenceDate.setHours(Number(hour), Number(minute), 0, 0);
        occurrences.push({ event, occurrenceDate });
      }
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences.sort(
    (firstItem, secondItem) =>
      firstItem.occurrenceDate.getTime() - secondItem.occurrenceDate.getTime(),
  );
}

function getNotificationDate(event: AgendaEvent) {
  const reminderOffset = REMINDER_OFFSETS_IN_MINUTES[event.reminder];

  if (reminderOffset === null || reminderOffset === undefined) {
    return null;
  }

  const nextOccurrence = getNextOccurrenceStart(event);

  if (!nextOccurrence) {
    return null;
  }

  const notificationDate = new Date(nextOccurrence);
  notificationDate.setMinutes(notificationDate.getMinutes() - reminderOffset);

  return notificationDate > new Date() ? notificationDate : null;
}

const WEB_NOTIFICATION_TIMEOUTS = new Map<string, ReturnType<typeof setTimeout>>();
const MAX_WEB_NOTIFICATION_DELAY = 2_147_000_000;

type WebNotificationPermission = "default" | "denied" | "granted";
type WebNotificationConstructor = {
  new (title: string, options?: { body?: string; tag?: string; requireInteraction?: boolean }): unknown;
  permission: WebNotificationPermission;
  requestPermission: () => Promise<WebNotificationPermission>;
};

function getWebNotificationApi() {
  return (globalThis as { Notification?: WebNotificationConstructor }).Notification;
}

function getWebNotificationId(eventId: string) {
  return `web-event-${eventId}`;
}

async function ensureNotificationPermissions() {
  if (Platform.OS === "web") {
    const webNotification = getWebNotificationApi();

    if (!webNotification) {
      return false;
    }

    if (webNotification.permission === "granted") {
      return true;
    }

    if (webNotification.permission === "denied") {
      return false;
    }

    try {
      const permission = await webNotification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.warn("No se pudieron pedir permisos de notificación web", error);
      return false;
    }
  }

  const currentPermissions = await Notifications.getPermissionsAsync();

  if (currentPermissions.granted) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.granted;
}

async function cancelEventNotification(notificationId?: string) {
  if (!notificationId) {
    return;
  }

  if (Platform.OS === "web") {
    const timeout = WEB_NOTIFICATION_TIMEOUTS.get(notificationId);

    if (timeout) {
      clearTimeout(timeout);
      WEB_NOTIFICATION_TIMEOUTS.delete(notificationId);
    }

    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn("No se pudo cancelar la notificación local", error);
  }
}

function cancelAllWebEventNotifications() {
  WEB_NOTIFICATION_TIMEOUTS.forEach((timeout) => clearTimeout(timeout));
  WEB_NOTIFICATION_TIMEOUTS.clear();
}

async function showWebEventNotification(
  event: AgendaEvent,
  category = getEventCategory(event, DEFAULT_CATEGORY_BY_ID),
) {
  const webNotification = getWebNotificationApi();

  if (!webNotification || webNotification.permission !== "granted") {
    return;
  }

  try {
    new webNotification(event.title || "Recordatorio de evento", {
      body: `${event.startTime} · ${category.label}`,
      requireInteraction: true,
      tag: getWebNotificationId(event.id),
    });
  } catch (error) {
    console.warn("No se pudo mostrar la notificación web", error);
  }
}

async function scheduleWebEventNotification(
  event: AgendaEvent,
  category = getEventCategory(event, DEFAULT_CATEGORY_BY_ID),
) {
  const notificationDate = getNotificationDate(event);

  if (!notificationDate) {
    return undefined;
  }

  const hasPermissions = await ensureNotificationPermissions();

  if (!hasPermissions) {
    return undefined;
  }

  const notificationId = getWebNotificationId(event.id);
  await cancelEventNotification(notificationId);

  const delay = notificationDate.getTime() - Date.now();

  if (delay <= 0 || delay > MAX_WEB_NOTIFICATION_DELAY) {
    return notificationId;
  }

  const timeout = setTimeout(() => {
    WEB_NOTIFICATION_TIMEOUTS.delete(notificationId);
    showWebEventNotification(event, category);
  }, delay);

  WEB_NOTIFICATION_TIMEOUTS.set(notificationId, timeout);
  return notificationId;
}

async function scheduleEventNotification(
  event: AgendaEvent,
  category = getEventCategory(event, DEFAULT_CATEGORY_BY_ID),
) {
  if (Platform.OS === "web") {
    return scheduleWebEventNotification(event, category);
  }

  const notificationDate = getNotificationDate(event);

  if (!notificationDate) {
    return undefined;
  }

  const hasPermissions = await ensureNotificationPermissions();

  if (!hasPermissions) {
    return undefined;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: event.title,
        body: `${event.startTime} · ${category.label}`,
        data: { eventId: event.id },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationDate,
      },
    });
  } catch (error) {
    console.warn("No se pudo programar la notificación local", error);
    return undefined;
  }
}

async function playCompletionFeedback(completed: boolean) {
  if (Platform.OS === "web") {
    return;
  }

  try {
    if (completed) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      return;
    }

    await Haptics.selectionAsync();
  } catch (error) {
    console.warn("No se pudo reproducir la vibración de completado", error);
  }
}

async function playAgendaActionFeedback(
  feedback: "light" | "selection" | "success" | "warning",
) {
  if (Platform.OS === "web") {
    return;
  }

  try {
    if (feedback === "success") {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      return;
    }

    if (feedback === "warning") {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      );
      return;
    }

    if (feedback === "light") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    await Haptics.selectionAsync();
  } catch (error) {
    console.warn("No se pudo reproducir la vibración de la agenda", error);
  }
}

function getEventsFile() {
  return new File(Paths.document, EVENTS_STORAGE_FILE);
}

function getCategoriesFile() {
  return new File(Paths.document, CATEGORIES_STORAGE_FILE);
}

function getEventTasksFile() {
  return new File(Paths.document, EVENT_TASKS_STORAGE_FILE);
}

function getEventTemplatesFile() {
  return new File(Paths.document, EVENT_TEMPLATES_STORAGE_FILE);
}

function normalizeAgendaEventList(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedEvents = value
    .map((event) => normalizeAgendaEvent(event))
    .filter((event): event is AgendaEvent => event !== null);

  return normalizedEvents.length === value.length ? normalizedEvents : null;
}

function normalizeAgendaEventTaskList(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedTasks = value
    .map((task) => normalizeAgendaEventTask(task))
    .filter((task): task is AgendaEventTask => task !== null);

  return normalizedTasks.length === value.length
    ? normalizedTasks.sort((firstTask, secondTask) => {
        if (firstTask.eventId !== secondTask.eventId) {
          return firstTask.eventId.localeCompare(secondTask.eventId);
        }

        return firstTask.sortOrder - secondTask.sortOrder;
      })
    : null;
}

async function loadStoredEvents() {
  try {
    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      const storedEvents = localStorage?.getItem(EVENTS_STORAGE_KEY);

      if (!storedEvents) {
        return null;
      }

      const parsedEvents: unknown = JSON.parse(storedEvents);
      return normalizeAgendaEventList(parsedEvents);
    }

    const eventsFile = getEventsFile();

    if (!eventsFile.exists) {
      return null;
    }

    const storedEvents = await eventsFile.text();
    const parsedEvents: unknown = JSON.parse(storedEvents);

    return normalizeAgendaEventList(parsedEvents);
  } catch (error) {
    console.warn("No se pudieron cargar los eventos locales", error);
    return null;
  }
}

function saveStoredEvents(events: AgendaEvent[]) {
  try {
    const serializedEvents = JSON.stringify(events);

    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      localStorage?.setItem(EVENTS_STORAGE_KEY, serializedEvents);
      return;
    }

    const eventsFile = getEventsFile();

    if (!eventsFile.exists) {
      eventsFile.create({ intermediates: true, overwrite: true });
    }

    eventsFile.write(serializedEvents);
  } catch (error) {
    console.warn("No se pudieron guardar los eventos locales", error);
  }
}

async function loadStoredEventTasks() {
  try {
    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      const storedTasks = localStorage?.getItem(EVENT_TASKS_STORAGE_KEY);

      if (!storedTasks) {
        return null;
      }

      const parsedTasks: unknown = JSON.parse(storedTasks);
      return normalizeAgendaEventTaskList(parsedTasks);
    }

    const tasksFile = getEventTasksFile();

    if (!tasksFile.exists) {
      return null;
    }

    const storedTasks = await tasksFile.text();
    const parsedTasks: unknown = JSON.parse(storedTasks);

    return normalizeAgendaEventTaskList(parsedTasks);
  } catch (error) {
    console.warn("No se pudieron cargar las tareas locales", error);
    return null;
  }
}

function saveStoredEventTasks(tasks: AgendaEventTask[]) {
  try {
    const serializedTasks = JSON.stringify(tasks);

    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      localStorage?.setItem(EVENT_TASKS_STORAGE_KEY, serializedTasks);
      return;
    }

    const tasksFile = getEventTasksFile();

    if (!tasksFile.exists) {
      tasksFile.create({ intermediates: true, overwrite: true });
    }

    tasksFile.write(serializedTasks);
  } catch (error) {
    console.warn("No se pudieron guardar las tareas locales", error);
  }
}

async function loadStoredCategories() {
  try {
    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      const storedCategories = localStorage?.getItem(CATEGORIES_STORAGE_KEY);

      if (!storedCategories) {
        return null;
      }

      const parsedCategories: unknown = JSON.parse(storedCategories);
      return normalizeAgendaCategoryList(parsedCategories);
    }

    const categoriesFile = getCategoriesFile();

    if (!categoriesFile.exists) {
      return null;
    }

    const storedCategories = await categoriesFile.text();
    const parsedCategories: unknown = JSON.parse(storedCategories);

    return normalizeAgendaCategoryList(parsedCategories);
  } catch (error) {
    console.warn("No se pudieron cargar las categorías locales", error);
    return null;
  }
}

function saveStoredCategories(categories: AgendaCategory[]) {
  try {
    const serializedCategories = JSON.stringify(categories);

    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      localStorage?.setItem(CATEGORIES_STORAGE_KEY, serializedCategories);
      return;
    }

    const categoriesFile = getCategoriesFile();

    if (!categoriesFile.exists) {
      categoriesFile.create({ intermediates: true, overwrite: true });
    }

    categoriesFile.write(serializedCategories);
  } catch (error) {
    console.warn("No se pudieron guardar las categorías locales", error);
  }
}

async function loadStoredEventTemplates() {
  try {
    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      const storedTemplates = localStorage?.getItem(EVENT_TEMPLATES_STORAGE_KEY);

      if (!storedTemplates) {
        return null;
      }

      const parsedTemplates: unknown = JSON.parse(storedTemplates);
      return normalizeEventTemplateList(parsedTemplates);
    }

    const templatesFile = getEventTemplatesFile();

    if (!templatesFile.exists) {
      return null;
    }

    const storedTemplates = await templatesFile.text();
    const parsedTemplates: unknown = JSON.parse(storedTemplates);

    return normalizeEventTemplateList(parsedTemplates);
  } catch (error) {
    console.warn("No se pudieron cargar las plantillas locales", error);
    return null;
  }
}

function saveStoredEventTemplates(templates: EventTemplate[]) {
  try {
    const serializedTemplates = JSON.stringify(templates);

    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      localStorage?.setItem(EVENT_TEMPLATES_STORAGE_KEY, serializedTemplates);
      return;
    }

    const templatesFile = getEventTemplatesFile();

    if (!templatesFile.exists) {
      templatesFile.create({ intermediates: true, overwrite: true });
    }

    templatesFile.write(serializedTemplates);
  } catch (error) {
    console.warn("No se pudieron guardar las plantillas locales", error);
  }
}

function eventToRow(event: AgendaEvent, userId: string): AgendaEventRow {
  return {
    id: event.id,
    user_id: userId,
    title: event.title,
    description: event.description,
    location: event.location,
    completed: event.completed,
    date_key: event.dateKey,
    start_time: event.startTime,
    color: event.color,
    tone: event.tone,
    reminder: event.reminder,
    recurrence: event.recurrence,
    recurrence_interval: event.recurrenceInterval,
    recurrence_weekdays: event.recurrenceWeekdays,
    recurrence_end_date: event.recurrenceEndDate ?? null,
    category: event.category,
    notification_id: event.notificationId ?? null,
    deleted_at: event.deletedAt ?? null,
  };
}

function rowToEvent(row: AgendaEventRow): AgendaEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location ?? "",
    completed: row.completed ?? false,
    dateKey: row.date_key,
    startTime: row.start_time,
    color: row.color,
    tone: row.tone,
    reminder: row.reminder,
    recurrence: isValidRecurrence(row.recurrence) ? row.recurrence : "none",
    recurrenceInterval: normalizeRecurrenceInterval(row.recurrence_interval),
    recurrenceWeekdays: normalizeRecurrenceWeekdays(row.recurrence_weekdays),
    recurrenceEndDate: normalizeRecurrenceEndDate(row.recurrence_end_date),
    category: isValidEventCategory(row.category) ? row.category : "personal",
    notificationId: row.notification_id ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function eventTemplateToRow(
  template: EventTemplate,
  userId: string,
): EventTemplateRow {
  return {
    user_id: userId,
    id: template.id,
    label: template.label,
    title: template.title,
    description: template.description,
    location: template.location,
    reminder: template.reminder,
    start_time: template.startTime ?? null,
    category_id: template.categoryId,
    icon: template.icon,
    tasks: template.tasks,
    sort_order: template.sortOrder,
    is_default: template.isDefault,
  };
}

function rowToEventTemplate(row: EventTemplateRow): EventTemplate {
  return {
    id: row.id,
    label: row.label,
    title: row.title,
    description: row.description,
    location: row.location ?? "",
    reminder: row.reminder,
    startTime: row.start_time ?? undefined,
    categoryId:
      typeof row.category_id === "string" && row.category_id.trim()
        ? row.category_id
        : FALLBACK_CATEGORY_ID,
    icon: normalizeCategoryIcon(row.icon),
    tasks: row.tasks ?? [],
    sortOrder: row.sort_order ?? 999,
    isDefault: row.is_default ?? false,
  };
}

function eventTaskToRow(
  task: AgendaEventTask,
  userId: string,
): AgendaEventTaskRow {
  return {
    user_id: userId,
    id: task.id,
    event_id: task.eventId,
    title: task.title,
    completed: task.completed,
    sort_order: task.sortOrder,
  };
}

function rowToEventTask(row: AgendaEventTaskRow): AgendaEventTask {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    completed: row.completed ?? false,
    sortOrder: row.sort_order ?? 999,
  };
}

function categoryToRow(
  category: AgendaCategory,
  userId: string,
): AgendaCategoryRow {
  return {
    user_id: userId,
    id: category.id,
    label: category.label,
    icon: category.icon,
    color: category.color,
    tone: category.tone,
    sort_order: category.sortOrder,
    is_default: category.isDefault,
  };
}

function rowToCategory(row: AgendaCategoryRow): AgendaCategory {
  return {
    id: normalizeCategoryId(row.id),
    label: row.label,
    icon: normalizeCategoryIcon(row.icon),
    color: row.color,
    tone: row.tone,
    sortOrder: row.sort_order ?? 999,
    isDefault: row.is_default ?? false,
  };
}

async function loadSupabaseCategories(userId: string) {
  const { data, error } = await supabase
    .from("agenda_categories")
    .select("user_id,id,label,icon,color,tone,sort_order,is_default")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    throw error;
  }

  return sortCategories(((data ?? []) as AgendaCategoryRow[]).map(rowToCategory));
}

async function saveSupabaseCategory(
  category: AgendaCategory,
  userId: string,
) {
  const { error } = await supabase
    .from("agenda_categories")
    .upsert(categoryToRow(category, userId));

  if (error) {
    throw error;
  }
}

async function saveSupabaseCategories(
  categories: AgendaCategory[],
  userId: string,
) {
  if (categories.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("agenda_categories")
    .upsert(categories.map((category) => categoryToRow(category, userId)));

  if (error) {
    throw error;
  }
}

async function deleteSupabaseCategory(categoryId: string, userId: string) {
  const { error } = await supabase
    .from("agenda_categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function ensureDefaultCategories(
  categories: AgendaCategory[],
  userId?: string,
) {
  const categoriesById = getCategoriesById(categories);
  const missingCategories = createDefaultCategories().filter(
    (category) => !categoriesById[category.id],
  );

  if (missingCategories.length === 0) {
    return sortCategories(categories);
  }

  const nextCategories = sortCategories([...categories, ...missingCategories]);

  if (userId) {
    await saveSupabaseCategories(missingCategories, userId);
  }

  return nextCategories;
}

async function ensureDefaultEventTemplates(
  templates: EventTemplate[],
  userId?: string,
) {
  const existingIds = new Set(templates.map((template) => template.id));
  const missingTemplates = createDefaultEventTemplates().filter(
    (template) => !existingIds.has(template.id),
  );

  if (missingTemplates.length === 0) {
    return sortEventTemplates(templates);
  }

  const nextTemplates = sortEventTemplates([...templates, ...missingTemplates]);

  if (userId) {
    await saveSupabaseEventTemplates(missingTemplates, userId);
  }

  return nextTemplates;
}

async function loadSupabaseEvents(userId: string) {
  const { data, error } = await supabase
    .from("agenda_events")
    .select(
      "id,user_id,title,description,location,completed,date_key,start_time,color,tone,reminder,recurrence,recurrence_interval,recurrence_weekdays,recurrence_end_date,category,notification_id,deleted_at",
    )
    .eq("user_id", userId)
    .order("date_key", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as AgendaEventRow[]).map(rowToEvent);
}

async function loadSupabaseEventTemplates(userId: string) {
  const { data, error } = await supabase
    .from("agenda_event_templates")
    .select(
      "user_id,id,label,title,description,location,reminder,start_time,category_id,icon,tasks,sort_order,is_default",
    )
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    throw error;
  }

  return sortEventTemplates(
    ((data ?? []) as EventTemplateRow[]).map(rowToEventTemplate),
  );
}

async function saveSupabaseEventTemplates(
  templates: EventTemplate[],
  userId: string,
) {
  if (templates.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("agenda_event_templates")
    .upsert(templates.map((template) => eventTemplateToRow(template, userId)));

  if (error) {
    throw error;
  }
}

async function saveSupabaseEvent(event: AgendaEvent, userId: string) {
  const { error } = await supabase
    .from("agenda_events")
    .upsert(eventToRow(event, userId));

  if (error) {
    throw error;
  }
}

async function saveSupabaseEvents(events: AgendaEvent[], userId: string) {
  if (events.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("agenda_events")
    .upsert(events.map((event) => eventToRow(event, userId)));

  if (error) {
    throw error;
  }
}

async function loadSupabaseEventTasks(userId: string) {
  const { data, error } = await supabase
    .from("agenda_event_tasks")
    .select("user_id,id,event_id,title,completed,sort_order")
    .eq("user_id", userId)
    .order("event_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as AgendaEventTaskRow[]).map(rowToEventTask);
}

async function saveSupabaseEventTasks(
  tasks: AgendaEventTask[],
  userId: string,
) {
  if (tasks.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("agenda_event_tasks")
    .upsert(tasks.map((task) => eventTaskToRow(task, userId)));

  if (error) {
    throw error;
  }
}

async function replaceSupabaseEventTasks(
  eventId: string,
  tasks: AgendaEventTask[],
  userId: string,
) {
  const { error: deleteError } = await supabase
    .from("agenda_event_tasks")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (deleteError) {
    throw deleteError;
  }

  await saveSupabaseEventTasks(tasks, userId);
}

export default function HomeScreen() {
  const { isDark } = useAppTheme();
  const styles = useMemo(() => getAgendaStyles(isDark), [isDark]);
  const primaryIconColor = isDark ? "#F8FAFC" : "#1F2A37";
  const modalScrollRef = useRef<ScrollView>(null);
  const modalScrollOffsetRef = useRef(0);
  const today = useMemo(() => new Date(), []);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const currentDay = today.getDay();
    return currentDay === 0 ? 6 : currentDay - 1;
  });
  const [events, setEvents] = useState(() => createInitialEvents(today));
  const [categories, setCategories] = useState(() => createDefaultCategories());
  const [eventTasks, setEventTasks] = useState<AgendaEventTask[]>([]);
  const [eventTemplates, setEventTemplates] = useState(() =>
    createDefaultEventTemplates(),
  );
  const [hasLoadedStoredEvents, setHasLoadedStoredEvents] = useState(false);
  const [hasLoadedStoredCategories, setHasLoadedStoredCategories] =
    useState(false);
  const [hasLoadedStoredTasks, setHasLoadedStoredTasks] = useState(false);
  const [hasLoadedStoredTemplates, setHasLoadedStoredTemplates] =
    useState(false);
  const [syncStatus, setSyncStatus] = useState("Cargando local...");
  const [session, setSession] = useState<Session | null>(null);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authFieldErrors, setAuthFieldErrors] = useState<{email?: string; password?: string; confirmPassword?: string}>({});
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEventModalVisible, setIsEventModalVisible] = useState(false);
  const [isEventDetailVisible, setIsEventDetailVisible] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventOccurrenceDate, setSelectedEventOccurrenceDate] =
    useState<Date | null>(null);
  const [isDayDetailVisible, setIsDayDetailVisible] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isQuickMoveExpanded, setIsQuickMoveExpanded] = useState(false);
  const [isCategoryManagerVisible, setIsCategoryManagerVisible] =
    useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [categoryForm, setCategoryForm] = useState(createEmptyCategoryForm);
  const [categoryFormErrors, setCategoryFormErrors] =
    useState<CategoryFormErrors>({});
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [quickDrag, setQuickDrag] = useState<QuickDragState | null>(null);
  const [isDayOrganizeMode, setIsDayOrganizeMode] = useState(false);
  const [lastDeletedEvent, setLastDeletedEvent] =
    useState<DeletedEventUndo | null>(null);
  const [appToast, setAppToast] = useState<AppToast | null>(null);
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState<string | null>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isDiscardConfirmVisible, setIsDiscardConfirmVisible] =
    useState(false);
  const [isSignOutConfirmVisible, setIsSignOutConfirmVisible] = useState(false);
  const [isSyncTooltipVisible, setIsSyncTooltipVisible] = useState(false);

  const deleteConfirmOpacity = useRef(new Animated.Value(0)).current;
  const deleteConfirmScale = useRef(new Animated.Value(0.9)).current;
  const discardConfirmOpacity = useRef(new Animated.Value(0)).current;
  const discardConfirmScale = useRef(new Animated.Value(0.9)).current;
  const signOutConfirmOpacity = useRef(new Animated.Value(0)).current;
  const signOutConfirmScale = useRef(new Animated.Value(0.9)).current;
  const eventDetailFadeOpacity = useRef(new Animated.Value(0)).current;
  const eventModalFadeOpacity = useRef(new Animated.Value(0)).current;
  const filtersFadeOpacity = useRef(new Animated.Value(0)).current;
  const syncTooltipOpacity = useRef(new Animated.Value(0)).current;
  const syncTooltipScale = useRef(new Animated.Value(0.9)).current;
  const syncTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickDragRef = useRef<QuickDragState | null>(null);
  const quickDropTargetRefs = useRef<Record<string, View | null>>({});
  const quickDropZonesRef = useRef<DayDropZone[]>([]);
  const timelineDropTargetRefs = useRef<Record<string, View | null>>({});
  const timelineDropZonesRef = useRef<HourDropZone[]>([]);
  const eventFormSnapshotRef = useRef<string | null>(null);
  const undoDeleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(18)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    if (isDeleteConfirmVisible) {
      Animated.parallel([
        Animated.timing(deleteConfirmOpacity, {
          duration: 200,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(deleteConfirmScale, {
          duration: 200,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      deleteConfirmOpacity.setValue(0);
      deleteConfirmScale.setValue(0.9);
    }
  }, [isDeleteConfirmVisible, deleteConfirmOpacity, deleteConfirmScale]);

  useEffect(() => {
    if (isDiscardConfirmVisible) {
      Animated.parallel([
        Animated.timing(discardConfirmOpacity, {
          duration: 200,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(discardConfirmScale, {
          duration: 200,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      discardConfirmOpacity.setValue(0);
      discardConfirmScale.setValue(0.9);
    }
  }, [
    isDiscardConfirmVisible,
    discardConfirmOpacity,
    discardConfirmScale,
  ]);

  useEffect(() => {
    if (isSignOutConfirmVisible) {
      Animated.parallel([
        Animated.timing(signOutConfirmOpacity, {
          duration: 200,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(signOutConfirmScale, {
          duration: 200,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      signOutConfirmOpacity.setValue(0);
      signOutConfirmScale.setValue(0.9);
    }
  }, [isSignOutConfirmVisible, signOutConfirmOpacity, signOutConfirmScale]);

  useEffect(() => {
    if (isSyncTooltipVisible) {
      Animated.parallel([
        Animated.timing(syncTooltipOpacity, {
          duration: 200,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(syncTooltipScale, {
          duration: 200,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();

      syncTooltipTimeoutRef.current = setTimeout(() => {
        closeSyncTooltip();
      }, 2000);
    } else {
      syncTooltipOpacity.setValue(0);
      syncTooltipScale.setValue(0.9);
    }

    return () => {
      if (syncTooltipTimeoutRef.current) {
        clearTimeout(syncTooltipTimeoutRef.current);
      }
    };
  }, [isSyncTooltipVisible, syncTooltipOpacity, syncTooltipScale]);

  function closeSyncTooltip() {
    if (syncTooltipTimeoutRef.current) {
      clearTimeout(syncTooltipTimeoutRef.current);
      syncTooltipTimeoutRef.current = null;
    }
    setIsSyncTooltipVisible(false);
  }

  function hideAppToast() {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    toastOpacity.stopAnimation();
    toastTranslateY.stopAnimation();
    Animated.parallel([
      Animated.timing(toastOpacity, {
        duration: 170,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        duration: 170,
        toValue: 18,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setAppToast(null);
      }
    });
  }

  function showAppToast(
    toast: Omit<AppToast, "id">,
    duration = toast.duration ?? 3600,
  ) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    const nextToast: AppToast = {
      ...toast,
      duration,
      id: `${Date.now()}-${toast.title}`,
    };

    setAppToast(nextToast);
    toastOpacity.stopAnimation();
    toastTranslateY.stopAnimation();
    toastOpacity.setValue(0);
    toastTranslateY.setValue(18);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        duration: 210,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(toastTranslateY, {
        damping: 18,
        mass: 0.8,
        stiffness: 180,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();

    AccessibilityInfo.announceForAccessibility(
      `${nextToast.title}${nextToast.message ? `. ${nextToast.message}` : ""}`,
    );

    if (duration > 0) {
      toastTimeoutRef.current = setTimeout(() => {
        hideAppToast();
      }, duration);
    }
  }

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<CategoryFilter>("all");
  const [activeStatusFilter, setActiveStatusFilter] =
    useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("week");
  const [form, setForm] = useState(() => createEmptyForm(today));
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formTasks, setFormTasks] = useState<AgendaEventTask[]>([]);
  const [taskDraft, setTaskDraft] = useState("");
  const [calendarMonthDate, setCalendarMonthDate] = useState(() =>
    startOfMonth(today),
  );
  const [calendarPreviewDateKey, setCalendarPreviewDateKey] = useState(() =>
    toDateKey(today),
  );
  const [activeTimeField, setActiveTimeField] = useState<ActiveTimePicker>(
    null,
  );
  const [timePickerHour, setTimePickerHour] = useState("09");
  const [timePickerMinute, setTimePickerMinute] = useState("00");
  const eventsRef = useRef(events);
  const categoriesRef = useRef(categories);
  const eventTasksRef = useRef(eventTasks);
  const eventTemplatesRef = useRef(eventTemplates);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    eventTasksRef.current = eventTasks;
  }, [eventTasks]);

  useEffect(() => {
    eventTemplatesRef.current = eventTemplates;
  }, [eventTemplates]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateEvents() {
      const storedEvents = await loadStoredEvents();

      if (!isMounted) {
        return;
      }

      if (storedEvents) {
        setEvents(storedEvents);
      }

      setHasLoadedStoredEvents(true);
      setSyncStatus("Local cargado");
    }

    hydrateEvents();

    return () => {
      isMounted = false;
    };
  }, [today]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateCategories() {
      const storedCategories = await loadStoredCategories();

      if (!isMounted) {
        return;
      }

      if (storedCategories) {
        setCategories(await ensureDefaultCategories(storedCategories));
      }

      setHasLoadedStoredCategories(true);
    }

    hydrateCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateEventTasks() {
      const storedTasks = await loadStoredEventTasks();

      if (!isMounted) {
        return;
      }

      if (storedTasks) {
        setEventTasks(storedTasks);
      }

      setHasLoadedStoredTasks(true);
    }

    hydrateEventTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateEventTemplates() {
      const storedTemplates = await loadStoredEventTemplates();

      if (!isMounted) {
        return;
      }

      setEventTemplates(
        await ensureDefaultEventTemplates(
          storedTemplates ?? createDefaultEventTemplates(),
        ),
      );
      setHasLoadedStoredTemplates(true);
    }

    hydrateEventTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function refreshStoredData() {
        const [
          storedCategories,
          storedEvents,
          storedTasks,
          storedTemplates,
        ] = await Promise.all([
          loadStoredCategories(),
          loadStoredEvents(),
          loadStoredEventTasks(),
          loadStoredEventTemplates(),
        ]);

        if (!isActive) {
          return;
        }

        if (storedCategories) {
          setCategories(await ensureDefaultCategories(storedCategories));
        }

        if (storedEvents) {
          setEvents(storedEvents);
        }

        if (storedTasks) {
          setEventTasks(storedTasks);
        }

        if (storedTemplates) {
          setEventTemplates(await ensureDefaultEventTemplates(storedTemplates));
        }
      }

      void refreshStoredData();

      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setHasLoadedSession(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setHasLoadedSession(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user.id;

    if (
      !hasLoadedStoredEvents ||
      !hasLoadedStoredCategories ||
      !hasLoadedStoredTasks ||
      !hasLoadedStoredTemplates ||
      typeof userId !== "string"
    ) {
      return;
    }

    const authenticatedUserId = userId;

    let isMounted = true;

    async function syncAuthenticatedEvents() {
      setSyncStatus("Sincronizando...");

      try {
        const remoteCategories =
          await loadSupabaseCategories(authenticatedUserId);
        const nextCategories = await ensureDefaultCategories(
          remoteCategories.length > 0
            ? remoteCategories
            : categoriesRef.current,
          authenticatedUserId,
        );
        const remoteEvents = await loadSupabaseEvents(authenticatedUserId);
        const remoteTasks = await loadSupabaseEventTasks(authenticatedUserId);
        const remoteTemplates =
          await loadSupabaseEventTemplates(authenticatedUserId);
        const nextTemplates = await ensureDefaultEventTemplates(
          remoteTemplates.length > 0
            ? remoteTemplates
            : eventTemplatesRef.current,
          authenticatedUserId,
        );

        if (!isMounted) {
          return;
        }

        setCategories(nextCategories);
        setEventTemplates(nextTemplates);
        saveStoredCategories(nextCategories);
        saveStoredEventTemplates(nextTemplates);

        if (remoteEvents.length > 0) {
          setEvents(remoteEvents);
          saveStoredEvents(remoteEvents);
          if (remoteTasks.length > 0) {
            setEventTasks(remoteTasks);
            saveStoredEventTasks(remoteTasks);
          } else {
            await saveSupabaseEventTasks(
              eventTasksRef.current,
              authenticatedUserId,
            );
          }
          if (remoteTemplates.length === 0) {
            await saveSupabaseEventTemplates(
              nextTemplates,
              authenticatedUserId,
            );
          }
          setSyncStatus("Sincronizado");
          return;
        }

        await saveSupabaseCategories(nextCategories, authenticatedUserId);
        await saveSupabaseEventTemplates(nextTemplates, authenticatedUserId);
        await saveSupabaseEvents(eventsRef.current, authenticatedUserId);
        await saveSupabaseEventTasks(eventTasksRef.current, authenticatedUserId);
        if (remoteTasks.length > 0) {
          setEventTasks(remoteTasks);
          saveStoredEventTasks(remoteTasks);
        }
        setSyncStatus("Sincronizado");
      } catch (error) {
        console.warn(
          "No se pudieron sincronizar los eventos con Supabase",
          error,
        );
        setSyncStatus("Modo local");
      }
    }

    syncAuthenticatedEvents();

    return () => {
      isMounted = false;
    };
  }, [
    hasLoadedStoredCategories,
    hasLoadedStoredEvents,
    hasLoadedStoredTasks,
    hasLoadedStoredTemplates,
    session?.user.id,
  ]);

  useEffect(() => {
    if (!hasLoadedStoredEvents) {
      return;
    }

    saveStoredEvents(events);
  }, [events, hasLoadedStoredEvents]);

  useEffect(() => {
    if (!hasLoadedStoredCategories) {
      return;
    }

    saveStoredCategories(categories);
  }, [categories, hasLoadedStoredCategories]);

  useEffect(() => {
    if (!hasLoadedStoredTasks) {
      return;
    }

    saveStoredEventTasks(eventTasks);
  }, [eventTasks, hasLoadedStoredTasks]);

  useEffect(() => {
    if (!hasLoadedStoredTemplates) {
      return;
    }

    saveStoredEventTemplates(eventTemplates);
  }, [eventTemplates, hasLoadedStoredTemplates]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    Notifications.setNotificationChannelAsync("default", {
      name: "Recordatorios",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || !hasLoadedStoredEvents) {
      return;
    }

    cancelAllWebEventNotifications();

    events
      .filter((event) => !event.completed && !event.deletedAt)
      .forEach((event) => {
        scheduleWebEventNotification(event, getCategoryForEvent(event));
      });

    return () => {
      cancelAllWebEventNotifications();
    };
  }, [events, categories, hasLoadedStoredEvents]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (undoDeleteTimeoutRef.current) {
        clearTimeout(undoDeleteTimeoutRef.current);
      }
    };
  }, []);

  const currentWeekStart = useMemo(
    () => addDays(startOfWeek(today), weekOffset * 7),
    [today, weekOffset],
  );
  const visibleEvents = useMemo(
    () => events.filter((event) => !event.deletedAt),
    [events],
  );
  const calendarDays = useMemo(() => {
    const firstCalendarDay = startOfWeek(startOfMonth(calendarMonthDate));

    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(firstCalendarDay, index);
      const dateKey = toDateKey(date);
      const dayEvents = visibleEvents
        .filter(
          (event) =>
            (activeCategoryFilter === "all" ||
              event.category === activeCategoryFilter) &&
            eventMatchesStatusFilter(event, activeStatusFilter) &&
            eventOccursOnDate(event, date),
        )
        .sort((firstEvent, secondEvent) =>
          firstEvent.startTime.localeCompare(secondEvent.startTime),
        );
      const eventDots = dayEvents.slice(0, 3).map((event) =>
        event.completed ? "#9CA3AF" : event.color,
      );
      const completedCount = dayEvents.filter((event) => event.completed).length;
      const pendingCount = dayEvents.length - completedCount;
      const overdueCount = dayEvents.filter((event) => {
        if (event.completed) {
          return false;
        }

        return (
          getReminderVisualInfo(
            event,
            getOccurrenceStartForDate(event, date),
            currentTime,
          ).state === "overdue"
        );
      }).length;

      return {
        completedCount,
        date,
        dateKey,
        eventCount: dayEvents.length,
        eventDots,
        events: dayEvents,
        isCurrentMonth: date.getMonth() === calendarMonthDate.getMonth(),
        overdueCount,
        pendingCount,
      };
    });
  }, [
    activeCategoryFilter,
    activeStatusFilter,
    calendarMonthDate,
    currentTime,
    visibleEvents,
  ]);

  const calendarPreviewDay = useMemo(
    () =>
      calendarDays.find((day) => day.dateKey === calendarPreviewDateKey) ??
      calendarDays.find((day) => isSameDay(day.date, today)) ??
      calendarDays[0],
    [calendarDays, calendarPreviewDateKey, today],
  );
  const calendarPreviewDate = calendarPreviewDay?.date ?? today;
  const calendarPreviewPendingCount = calendarPreviewDay?.pendingCount ?? 0;
  const calendarPreviewCompletedCount = calendarPreviewDay?.completedCount ?? 0;
  const calendarPreviewOverdueCount = calendarPreviewDay?.overdueCount ?? 0;

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(currentWeekStart, index);
        const dateKey = toDateKey(date);

        return {
          label: WEEK_DAYS[index],
          date,
          dateKey,
          events: visibleEvents
            .filter((event) => eventOccursOnDate(event, date))
            .filter(
              (event) =>
                (activeCategoryFilter === "all" ||
                  event.category === activeCategoryFilter) &&
                eventMatchesStatusFilter(event, activeStatusFilter),
            )
            .sort((firstEvent, secondEvent) =>
              firstEvent.startTime.localeCompare(secondEvent.startTime),
            ),
        };
      }),
    [activeCategoryFilter, activeStatusFilter, currentWeekStart, visibleEvents],
  );
  const categoriesById = useMemo(() => getCategoriesById(categories), [
    categories,
  ]);
  const getCategory = useCallback(
    (categoryId: string) => getCategoryById(categoryId, categoriesById),
    [categoriesById],
  );
  const getCategoryForEvent = useCallback(
    (event: Pick<AgendaEvent, "category">) =>
      getEventCategory(event, categoriesById),
    [categoriesById],
  );
  const tasksByEventId = useMemo(
    () =>
      eventTasks.reduce(
        (groupedTasks, task) => {
          const currentTasks = groupedTasks[task.eventId] ?? [];

          return {
            ...groupedTasks,
            [task.eventId]: [...currentTasks, task].sort(
              (firstTask, secondTask) =>
                firstTask.sortOrder - secondTask.sortOrder,
            ),
          };
        },
        {} as Record<string, AgendaEventTask[]>,
      ),
    [eventTasks],
  );
  const getTasksForEvent = useCallback(
    (eventId: string) => tasksByEventId[eventId] ?? [],
    [tasksByEventId],
  );
  const selectedDay = weekDays[selectedDayIndex];
  const selectedDayCurrentHour = isSameDay(selectedDay.date, currentTime)
    ? currentTime.getHours()
    : null;
  const selectedDayNowLineTop =
    selectedDayCurrentHour === null
      ? 0
      : Math.min(
          TIMELINE_HOUR_SLOT_HEIGHT + 8,
          12 + (currentTime.getMinutes() / 60) * TIMELINE_HOUR_SLOT_HEIGHT,
        );
  const selectedDayEventsByHour = useMemo(() => {
    return selectedDay.events.reduce(
      (eventsByHour, event) => {
        const { hour } = splitTime(event.startTime);
        const hourKey = Number(hour);

        return {
          ...eventsByHour,
          [hourKey]: [...(eventsByHour[hourKey] ?? []), event],
        };
      },
      {} as Record<number, AgendaEvent[]>,
    );
  }, [selectedDay.events]);
  const selectedDayTimelineHours = useMemo(() => {
    const eventHours = selectedDay.events.map(({ startTime }) =>
      Number(splitTime(startTime).hour),
    );
    const anchorHours = [
      ...eventHours,
      ...(selectedDayCurrentHour !== null ? [selectedDayCurrentHour] : []),
    ];

    if (anchorHours.length === 0) {
      return Array.from({ length: 10 }, (_, index) => index + 8);
    }

    const startHour = Math.max(0, Math.min(...anchorHours) - 1);
    const endHour = Math.min(
      23,
      Math.max(Math.max(...anchorHours) + 1, startHour + 5),
    );

    return Array.from(
      { length: endHour - startHour + 1 },
      (_, index) => startHour + index,
    );
  }, [selectedDay.events, selectedDayCurrentHour]);

  useEffect(() => {
    if (!isDayOrganizeMode || selectedDay.events.length > 0) {
      return;
    }

    quickDragRef.current = null;
    setQuickDrag(null);
    setIsDayOrganizeMode(false);
  }, [isDayOrganizeMode, selectedDay.events.length]);

  const activeQuickDragEventId = quickDrag?.eventId ?? null;
  const quickDragEvent = quickDrag
    ? visibleEvents.find((event) => event.id === quickDrag.eventId)
    : undefined;
  const totalEvents = weekDays.reduce(
    (total, day) => total + day.events.length,
    0,
  );
  const activityWeekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(currentWeekStart, index);
        const dayEvents = visibleEvents
          .filter((event) => eventOccursOnDate(event, date))
          .sort((firstEvent, secondEvent) =>
            firstEvent.startTime.localeCompare(secondEvent.startTime),
          );

        return {
          completedEvents: dayEvents.filter((event) => event.completed).length,
          date,
          events: dayEvents,
          label: WEEK_DAYS[index],
        };
      }),
    [currentWeekStart, visibleEvents],
  );
  const allWeekOccurrences = useMemo(
    () =>
      getEventOccurrencesBetween(
        visibleEvents,
        currentWeekStart,
        addDays(currentWeekStart, 6),
      ),
    [currentWeekStart, visibleEvents],
  );
  const weekSummaryEvents = useMemo(() => {
    const categoryFilteredEvents = visibleEvents.filter(
      (event) =>
        activeCategoryFilter === "all" ||
        event.category === activeCategoryFilter,
    );

    return getEventOccurrencesBetween(
      categoryFilteredEvents,
      currentWeekStart,
      addDays(currentWeekStart, 6),
    );
  }, [activeCategoryFilter, currentWeekStart, visibleEvents]);
  const completedWeekEvents = weekSummaryEvents.filter(
    ({ event }) => event.completed,
  ).length;
  const pendingWeekEvents = weekSummaryEvents.length - completedWeekEvents;
  const weekCompletionRatio =
    weekSummaryEvents.length > 0
      ? completedWeekEvents / weekSummaryEvents.length
      : 0;
  const activityWeekCompletedEvents = allWeekOccurrences.filter(
    ({ event }) => event.completed,
  ).length;
  const activityWeekPendingEvents =
    allWeekOccurrences.length - activityWeekCompletedEvents;
  const uniqueWeekEventIds = useMemo(
    () => Array.from(new Set(allWeekOccurrences.map(({ event }) => event.id))),
    [allWeekOccurrences],
  );
  const activityWeekTasks = useMemo(
    () => uniqueWeekEventIds.flatMap((eventId) => getTasksForEvent(eventId)),
    [getTasksForEvent, uniqueWeekEventIds],
  );
  const activityWeekCompletedTasks = activityWeekTasks.filter(
    (task) => task.completed,
  ).length;
  const activityMaxDayEvents = Math.max(
    1,
    ...activityWeekDays.map((day) => day.events.length),
  );
  const activityWeekBars = activityWeekDays.map((day) => ({
    ...day,
    barHeight: Math.max(12, (day.events.length / activityMaxDayEvents) * 52),
  }));
  const busiestActivityDay = activityWeekDays.reduce(
    (busiestDay, day) =>
      day.events.length > busiestDay.events.length ? day : busiestDay,
    activityWeekDays[0],
  );
  const topActivityCategory = useMemo(() => {
    const categoryCounts = allWeekOccurrences.reduce(
      (counts, { event }) => ({
        ...counts,
        [event.category]: (counts[event.category] ?? 0) + 1,
      }),
      {} as Record<string, number>,
    );
    const topCategoryEntry = Object.entries(categoryCounts).sort(
      (firstCategory, secondCategory) =>
        secondCategory[1] - firstCategory[1],
    )[0];

    if (!topCategoryEntry) {
      return {
        category: getCategory(FALLBACK_CATEGORY_ID),
        count: 0,
      };
    }

    return {
      category: getCategory(topCategoryEntry[0]),
      count: topCategoryEntry[1],
    };
  }, [allWeekOccurrences, getCategory]);
  const activityWeekCompletionPercent =
    allWeekOccurrences.length > 0
      ? Math.round(
          (activityWeekCompletedEvents / allWeekOccurrences.length) * 100,
        )
      : 0;
  const todayOccurrences = useMemo(
    () => getEventOccurrencesBetween(visibleEvents, currentTime, currentTime),
    [currentTime, visibleEvents],
  );
  const todayCompletedEvents = todayOccurrences.filter(
    ({ event }) => event.completed,
  ).length;
  const todayPendingEvents = todayOccurrences.length - todayCompletedEvents;
  const todayCompletionRatio =
    todayOccurrences.length > 0
      ? todayCompletedEvents / todayOccurrences.length
      : 0;
  const todayCompletionPercent = Math.round(todayCompletionRatio * 100);
  const nextTodayOccurrence =
    todayOccurrences.find(
      ({ event, occurrenceDate }) =>
        !event.completed && occurrenceDate >= currentTime,
    ) ??
    todayOccurrences.find(({ event }) => !event.completed) ??
    todayOccurrences[0] ??
    null;
  const todayReminderInfo = nextTodayOccurrence
    ? getReminderVisualInfo(
        nextTodayOccurrence.event,
        nextTodayOccurrence.occurrenceDate,
        currentTime,
      )
    : null;
  const overdueReminderCount = useMemo(() => {
    return getEventOccurrencesBetween(
      visibleEvents,
      addDays(currentTime, -1),
      currentTime,
    )
      .filter(({ event, occurrenceDate }) => {
        if (event.completed) {
          return false;
        }

        return (
          getReminderVisualInfo(event, occurrenceDate, currentTime).state ===
          "overdue"
        );
      }).length;
  }, [currentTime, visibleEvents]);
  const todaySummaryLabel =
    todayOccurrences.length === 0
      ? "Sin planes guardados para hoy"
      : `${todayOccurrences.length} planes · ${todayPendingEvents} pendientes`;
  const activityInsight = (() => {
    if (allWeekOccurrences.length === 0) {
      return "Semana ligera: todavía no hay planes guardados.";
    }

    if (overdueReminderCount > 0) {
      return `${overdueReminderCount} ${
        overdueReminderCount === 1 ? "plan atrasado" : "planes atrasados"
      } esperan atención.`;
    }

    if (
      activityWeekTasks.length > 0 &&
      activityWeekCompletedTasks === activityWeekTasks.length
    ) {
      return "Checklist semanal completada. Buena señal.";
    }

    if (busiestActivityDay.events.length >= 3) {
      return `${busiestActivityDay.label} concentra ${busiestActivityDay.events.length} planes esta semana.`;
    }

    if (topActivityCategory.count > 1) {
      return `${topActivityCategory.category.label} es tu categoría más activa.`;
    }

    return `${activityWeekPendingEvents} pendientes y ${activityWeekCompletedEvents} completados esta semana.`;
  })();
  const activeFilterLabel =
    activeCategoryFilter === "all"
      ? "Todo"
      : getCategory(activeCategoryFilter).label;
  const activeStatusLabel =
    STATUS_FILTERS.find((filter) => filter.value === activeStatusFilter)
      ?.label ?? "Pendientes";
  const activeViewFilterLabel = `${activeStatusLabel} · ${activeFilterLabel}`;
  const hasSearchText = normalizeSearchText(searchQuery).length > 0;
  const upcomingWindowEnd = useMemo(
    () => addDays(today, UPCOMING_WINDOW_DAYS - 1),
    [today],
  );
  const upcomingEvents = useMemo(() => {
    return getEventOccurrencesBetween(
      visibleEvents,
      today,
      upcomingWindowEnd,
    ).filter(({ occurrenceDate }) => occurrenceDate >= today);
  }, [visibleEvents, today, upcomingWindowEnd]);
  const scopedOccurrences = useMemo(() => {
    const categoryFilteredEvents = visibleEvents.filter(
      (event) =>
        (activeCategoryFilter === "all" ||
          event.category === activeCategoryFilter) &&
        eventMatchesStatusFilter(event, activeStatusFilter),
    );

    if (searchScope === "day") {
      return getEventOccurrencesBetween(
        categoryFilteredEvents,
        selectedDay.date,
        selectedDay.date,
      );
    }

    if (searchScope === "week") {
      return getEventOccurrencesBetween(
        categoryFilteredEvents,
        currentWeekStart,
        addDays(currentWeekStart, 6),
      );
    }

    return getAllSearchResultEvents(categoryFilteredEvents);
  }, [
    activeCategoryFilter,
    activeStatusFilter,
    currentWeekStart,
    visibleEvents,
    searchScope,
    selectedDay.date,
  ]);

  const listResults = useMemo(() => {
    const filtered = hasSearchText
      ? scopedOccurrences.filter(({ event }) =>
          eventMatchesSearch(
            event,
            searchQuery,
            categoriesById,
            getTasksForEvent(event.id),
          ),
        )
      : scopedOccurrences;

    return filtered.slice(0, SEARCH_RESULTS_LIMIT);
  }, [
    categoriesById,
    getTasksForEvent,
    hasSearchText,
    scopedOccurrences,
    searchQuery,
  ]);
  const selectedDetailEvent = selectedEventId
    ? visibleEvents.find((event) => event.id === selectedEventId) ?? null
    : null;
  const selectedDetailOccurrenceDate = selectedDetailEvent
    ? selectedEventOccurrenceDate ??
      getNextOccurrenceStart(selectedDetailEvent, currentTime) ??
      getEventStartDate(selectedDetailEvent)
    : null;
  const selectedDetailReminderInfo =
    selectedDetailEvent && selectedDetailOccurrenceDate
      ? getReminderVisualInfo(
          selectedDetailEvent,
          selectedDetailOccurrenceDate,
          currentTime,
        )
      : null;
  const selectedDetailTasks = selectedDetailEvent
    ? getTasksForEvent(selectedDetailEvent.id)
    : [];
  const selectedDetailTaskStats = getEventTaskStats(selectedDetailTasks);
  const selectedDetailTaskProgress =
    selectedDetailTaskStats.total > 0
      ? selectedDetailTaskStats.completed / selectedDetailTaskStats.total
      : 0;
  const selectedDetailCategory = selectedDetailEvent
    ? getCategoryForEvent(selectedDetailEvent)
    : getCategory(FALLBACK_CATEGORY_ID);
  const searchScopeLabel =
    SEARCH_SCOPES.find((scope) => scope.value === searchScope)?.label ??
    "Semana";

  const hasActiveFilters = useMemo(() => {
    return (
      hasSearchText ||
      activeStatusFilter !== "all" ||
      activeCategoryFilter !== "all" ||
      searchScope !== "week"
    );
  }, [
    hasSearchText,
    activeStatusFilter,
    activeCategoryFilter,
    searchScope,
  ]);

  const filtersTriggerSubtitle = useMemo(() => {
    const parts = [
      searchScopeLabel,
      activeStatusLabel,
      activeFilterLabel,
    ];
    if (hasSearchText) {
      parts.push("Búsqueda");
    }
    return parts.join(" · ");
  }, [
    searchScopeLabel,
    activeStatusLabel,
    activeFilterLabel,
    hasSearchText,
  ]);

  const measureQuickDropTargets = useCallback(() => {
    const measuredZones: DayDropZone[] = [];
    let pendingMeasurements = weekDays.length;

    if (pendingMeasurements === 0) {
      quickDropZonesRef.current = measuredZones;
      return;
    }

    weekDays.forEach((day, index) => {
      const targetRef = quickDropTargetRefs.current[day.dateKey];

      if (!targetRef) {
        pendingMeasurements -= 1;

        if (pendingMeasurements === 0) {
          quickDropZonesRef.current = measuredZones;
        }

        return;
      }

      targetRef.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          measuredZones.push({
            dateKey: day.dateKey,
            height,
            index,
            width,
            x,
            y,
          });
        }

        pendingMeasurements -= 1;

        if (pendingMeasurements === 0) {
          quickDropZonesRef.current = measuredZones;
        }
      });
    });
  }, [weekDays]);

  const measureTimelineDropTargets = useCallback(() => {
    const measuredZones: HourDropZone[] = [];
    let pendingMeasurements = selectedDayTimelineHours.length;

    if (pendingMeasurements === 0) {
      timelineDropZonesRef.current = measuredZones;
      return;
    }

    selectedDayTimelineHours.forEach((hour) => {
      const time = formatTimelineHour(hour);
      const targetRef = timelineDropTargetRefs.current[time];

      if (!targetRef) {
        pendingMeasurements -= 1;

        if (pendingMeasurements === 0) {
          timelineDropZonesRef.current = measuredZones;
        }

        return;
      }

      targetRef.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          measuredZones.push({
            height,
            hour,
            time,
            width,
            x,
            y,
          });
        }

        pendingMeasurements -= 1;

        if (pendingMeasurements === 0) {
          timelineDropZonesRef.current = measuredZones;
        }
      });
    });
  }, [selectedDayTimelineHours]);

  useEffect(() => {
    if (!activeQuickDragEventId) {
      quickDropZonesRef.current = [];
      timelineDropZonesRef.current = [];
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (quickDragRef.current?.mode === "hour") {
        measureTimelineDropTargets();
        return;
      }

      measureQuickDropTargets();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [
    activeQuickDragEventId,
    measureQuickDropTargets,
    measureTimelineDropTargets,
  ]);

  function goToToday() {
    const currentDay = today.getDay();
    setWeekOffset(0);
    setSelectedDayIndex(currentDay === 0 ? 6 : currentDay - 1);
    setCalendarMonthDate(startOfMonth(today));
  }

  function openCalendar() {
    setCalendarMonthDate(startOfMonth(selectedDay.date));
    setCalendarPreviewDateKey(selectedDay.dateKey);
    setIsCalendarVisible(true);
  }

  function openSearchPanel(nextScope: SearchScope = searchScope) {
    setSearchScope(nextScope);
    filtersFadeOpacity.stopAnimation();
    filtersFadeOpacity.setValue(0);
    setIsFiltersExpanded(true);
    Animated.timing(filtersFadeOpacity, {
      duration: 180,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }

  function finishCloseFiltersPanel() {
    filtersFadeOpacity.setValue(0);
    setIsFiltersExpanded(false);
  }

  function closeFiltersPanel(afterClose?: () => void) {
    if (!isFiltersExpanded) {
      finishCloseFiltersPanel();
      afterClose?.();
      return;
    }

    filtersFadeOpacity.stopAnimation();
    Animated.timing(filtersFadeOpacity, {
      duration: 180,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        finishCloseFiltersPanel();
        afterClose?.();
      }
    });
  }

  function changeCalendarMonth(months: number) {
    const nextMonthDate = addMonths(calendarMonthDate, months);

    setCalendarMonthDate(nextMonthDate);
    setCalendarPreviewDateKey(toDateKey(startOfMonth(nextMonthDate)));
  }

  function previewCalendarDate(date: Date) {
    setCalendarPreviewDateKey(toDateKey(date));
    if (
      date.getMonth() !== calendarMonthDate.getMonth() ||
      date.getFullYear() !== calendarMonthDate.getFullYear()
    ) {
      setCalendarMonthDate(startOfMonth(date));
    }
  }

  function goToCalendarDate(date: Date) {
    const targetWeekStart = startOfWeek(date);
    const currentWeek = startOfWeek(today);
    const daysDiff = Math.round(
      (targetWeekStart.getTime() - currentWeek.getTime()) /
        (24 * 60 * 60 * 1000),
    );
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;

    setWeekOffset(Math.round(daysDiff / 7));
    setSelectedDayIndex(dayIndex);
    setIsCalendarVisible(false);
  }

  function showEventModalWithFade() {
    eventModalFadeOpacity.stopAnimation();
    eventModalFadeOpacity.setValue(0);
    setIsEventModalVisible(true);
    Animated.timing(eventModalFadeOpacity, {
      duration: 180,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }

  function getEventFormSnapshot(
    snapshotForm: EventForm,
    snapshotTasks: AgendaEventTask[],
    snapshotTaskDraft: string,
    snapshotEditingEventId: string | null,
  ) {
    return JSON.stringify({
      editingEventId: snapshotEditingEventId,
      form: snapshotForm,
      taskDraft: snapshotTaskDraft,
      tasks: snapshotTasks.map((task) => ({
        completed: task.completed,
        title: task.title,
      })),
    });
  }

  function hasUnsavedEventModalChanges() {
    if (!isEventModalVisible || !eventFormSnapshotRef.current) {
      return false;
    }

    return (
      eventFormSnapshotRef.current !==
      getEventFormSnapshot(form, formTasks, taskDraft, editingEventId)
    );
  }

  function requestEventModalClose() {
    Keyboard.dismiss();

    if (!hasUnsavedEventModalChanges()) {
      return true;
    }

    setIsDiscardConfirmVisible(true);
    void playAgendaActionFeedback("warning");
    return false;
  }

  function openNewEventModal(date = selectedDay.date, startTime?: string) {
    const defaultCategory = getCategory(FALLBACK_CATEGORY_ID);
    const emptyForm = createEmptyForm(date);
    const nextForm = {
      ...emptyForm,
      category: defaultCategory.id,
      color: defaultCategory.color,
      startTime: startTime ?? emptyForm.startTime,
      tone: defaultCategory.tone,
    };

    setIsDayDetailVisible(false);
    setIsEventDetailVisible(false);
    setSelectedEventOccurrenceDate(null);
    setEditingEventId(null);
    setForm(nextForm);
    setFormErrors({});
    setFormTasks([]);
    setTaskDraft("");
    eventFormSnapshotRef.current = getEventFormSnapshot(
      nextForm,
      [],
      "",
      null,
    );
    showEventModalWithFade();
  }

  function openEventDetail(event: AgendaEvent, occurrenceDate?: Date) {
    eventDetailFadeOpacity.stopAnimation();
    eventDetailFadeOpacity.setValue(0);
    setSelectedEventId(event.id);
    setSelectedEventOccurrenceDate(
      occurrenceDate ??
        getNextOccurrenceStart(event, currentTime) ??
        getEventStartDate(event),
    );
    setIsEventDetailVisible(true);
    Animated.timing(eventDetailFadeOpacity, {
      duration: 180,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }

  function finishCloseEventDetail() {
    eventDetailFadeOpacity.setValue(0);
    setIsEventDetailVisible(false);
    setSelectedEventId(null);
    setSelectedEventOccurrenceDate(null);
  }

  function closeEventDetail() {
    if (!isEventDetailVisible) {
      finishCloseEventDetail();
      return;
    }

    eventDetailFadeOpacity.stopAnimation();
    Animated.timing(eventDetailFadeOpacity, {
      duration: 180,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        finishCloseEventDetail();
      }
    });
  }

  function editSelectedDetailEvent() {
    if (!selectedDetailEvent) {
      return;
    }

    eventDetailFadeOpacity.setValue(0);
    setIsEventDetailVisible(false);
    openEditEventModal(selectedDetailEvent);
  }

  async function toggleSelectedDetailEventCompleted() {
    if (!selectedDetailEvent) {
      return;
    }

    await toggleEventCompleted(selectedDetailEvent.id);
  }

  function deleteSelectedDetailEvent() {
    if (!selectedDetailEvent) {
      return;
    }

    requestDeleteEvent(selectedDetailEvent.id, "detail");
  }

  function duplicateSelectedDetailEvent() {
    if (!selectedDetailEvent) {
      return;
    }

    duplicateEvent(selectedDetailEvent);
    closeEventDetail();
  }

  function openEditEventModal(event: AgendaEvent) {
    const nextForm = {
      title: event.title,
      description:
        event.description === "Sin notas por ahora." ? "" : event.description,
      location: event.location,
      completed: event.completed,
      dateKey: event.dateKey,
      startTime: event.startTime,
      color: event.color,
      tone: event.tone,
      reminder: event.reminder,
      recurrence: event.recurrence,
      recurrenceInterval: event.recurrenceInterval,
      recurrenceWeekdays: event.recurrenceWeekdays,
      recurrenceEndDate: event.recurrenceEndDate,
      category: event.category,
    };
    const nextTasks = getTasksForEvent(event.id);

    setIsDayDetailVisible(false);
    setIsEventDetailVisible(false);
    setEditingEventId(event.id);
    setForm(nextForm);
    setFormErrors({});
    setFormTasks(nextTasks);
    setTaskDraft("");
    setActiveTimeField(null);
    eventFormSnapshotRef.current = getEventFormSnapshot(
      nextForm,
      nextTasks,
      "",
      event.id,
    );
    showEventModalWithFade();
  }

  function finishCloseEventModal() {
    eventModalFadeOpacity.setValue(0);
    eventFormSnapshotRef.current = null;
    setIsEventModalVisible(false);
    setActiveTimeField(null);
    setEditingEventId(null);
    setIsDeleteConfirmVisible(false);
    setIsDiscardConfirmVisible(false);
    setIsSignOutConfirmVisible(false);
    setFormErrors({});
    setFormTasks([]);
    setTaskDraft("");
  }

  function closeEventModalWithoutPrompt() {
    if (!isEventModalVisible) {
      finishCloseEventModal();
      return;
    }

    eventModalFadeOpacity.stopAnimation();
    Animated.timing(eventModalFadeOpacity, {
      duration: 180,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        finishCloseEventModal();
      }
    });
  }

  function closeEventModal() {
    if (!requestEventModalClose()) {
      return;
    }

    closeEventModalWithoutPrompt();
  }

  function cancelDiscardEventChanges() {
    setIsDiscardConfirmVisible(false);
  }

  function confirmDiscardEventChanges() {
    eventFormSnapshotRef.current = null;
    setIsDiscardConfirmVisible(false);
    closeEventModalWithoutPrompt();
  }

  function openDayDetail(index: number) {
    setSelectedDayIndex(index);
    setIsDayDetailVisible(true);
  }

  function closeDayDetail() {
    setIsDayDetailVisible(false);
  }

  function toggleDayOrganizeMode() {
    if (isDayOrganizeMode) {
      if (quickDragRef.current?.mode === "hour") {
        cancelQuickDrag();
      }

      setIsDayOrganizeMode(false);
      void playAgendaActionFeedback("selection");
      return;
    }

    setIsDayOrganizeMode(true);
    void playAgendaActionFeedback("selection");
    showAppToast({
      icon: "swap-vertical-outline",
      message: "Mantén pulsado un evento y suéltalo sobre otra hora.",
      title: "Modo mover activado",
      variant: "info",
    });
    requestAnimationFrame(measureTimelineDropTargets);
  }

  function getQuickDropTargetIndex(pageX: number, pageY: number) {
    return (
      quickDropZonesRef.current.find(
        (zone) =>
          pageX >= zone.x &&
          pageX <= zone.x + zone.width &&
          pageY >= zone.y &&
          pageY <= zone.y + zone.height,
      )?.index ?? null
    );
  }

  function getTimelineDropTargetHour(pageX: number, pageY: number) {
    return (
      timelineDropZonesRef.current.find(
        (zone) =>
          pageX >= zone.x &&
          pageX <= zone.x + zone.width &&
          pageY >= zone.y &&
          pageY <= zone.y + zone.height,
      )?.hour ?? null
    );
  }

  function startQuickDrag(
    event: AgendaEvent,
    pageX: number,
    pageY: number,
  ) {
    Keyboard.dismiss();

    const nextDrag = {
      eventId: event.id,
      mode: "day" as const,
      targetIndex: null,
      targetHour: null,
      x: pageX,
      y: pageY,
    };

    quickDragRef.current = nextDrag;
    setQuickDrag(nextDrag);
    setIsDayDetailVisible(false);

    requestAnimationFrame(measureQuickDropTargets);
  }

  function startTimelineHourDrag(
    event: AgendaEvent,
    pageX: number,
    pageY: number,
  ) {
    if (!isDayOrganizeMode) {
      return;
    }

    Keyboard.dismiss();

    const nextDrag = {
      eventId: event.id,
      mode: "hour" as const,
      targetHour: null,
      targetIndex: null,
      x: pageX,
      y: pageY,
    };

    quickDragRef.current = nextDrag;
    setQuickDrag(nextDrag);

    requestAnimationFrame(measureTimelineDropTargets);
  }

  function updateQuickDrag(pageX: number, pageY: number) {
    const currentDrag = quickDragRef.current;

    if (!currentDrag) {
      return;
    }

    const isHourDrag = currentDrag.mode === "hour";
    const nextDrag = {
      ...currentDrag,
      targetHour: isHourDrag
        ? getTimelineDropTargetHour(pageX, pageY)
        : null,
      targetIndex: isHourDrag ? null : getQuickDropTargetIndex(pageX, pageY),
      x: pageX,
      y: pageY,
    };

    quickDragRef.current = nextDrag;
    setQuickDrag(nextDrag);
  }

  function cancelQuickDrag() {
    quickDragRef.current = null;
    setQuickDrag(null);
  }

  async function finishQuickDrag(pageX: number, pageY: number) {
    const currentDrag = quickDragRef.current;

    if (!currentDrag) {
      return;
    }

    const targetIndex =
      getQuickDropTargetIndex(pageX, pageY) ?? currentDrag.targetIndex;
    const targetHour =
      getTimelineDropTargetHour(pageX, pageY) ?? currentDrag.targetHour;
    const eventId = currentDrag.eventId;

    quickDragRef.current = null;
    setQuickDrag(null);

    if (currentDrag.mode === "hour") {
      if (targetHour === null) {
        return;
      }

      await moveEventToTime(
        eventId,
        selectedDay.date,
        formatTimelineHour(targetHour),
      );
      return;
    }

    if (targetIndex === null) {
      return;
    }

    const targetDay = weekDays[targetIndex];

    if (!targetDay) {
      return;
    }

    await moveEventToDate(eventId, targetDay.date);
  }

  async function moveEventToTime(
    eventId: string,
    targetDate: Date,
    targetTime: string,
  ) {
    const currentEvent = events.find((event) => event.id === eventId);

    if (!currentEvent) {
      return;
    }

    const targetDateKey = toDateKey(targetDate);

    if (
      currentEvent.dateKey === targetDateKey &&
      currentEvent.startTime === targetTime
    ) {
      return;
    }

    await cancelEventNotification(currentEvent.notificationId);

    const movedEvent: AgendaEvent = {
      ...currentEvent,
      dateKey: targetDateKey,
      notificationId: undefined,
      startTime: targetTime,
    };
    const notificationId = movedEvent.completed
      ? undefined
      : await scheduleEventNotification(
          movedEvent,
          getCategoryForEvent(movedEvent),
        );
    const savedEvent = { ...movedEvent, notificationId };
    const userId = session?.user.id;

    setEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === eventId ? savedEvent : event)),
    );
    showAppToast({
      icon: "time-outline",
      message: `${savedEvent.title} · ${targetTime}`,
      title: "Hora actualizada",
      variant: "success",
    });
    setSyncStatus("Sincronizando...");

    try {
      if (!userId) {
        setSyncStatus("Modo local");
        return;
      }

      await saveSupabaseEvent(savedEvent, userId);
      setSyncStatus("Sincronizado");
    } catch (error) {
      console.warn("No se pudo mover el evento en Supabase", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "El cambio queda guardado en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  async function moveEventToDate(eventId: string, targetDate: Date) {
    const currentEvent = events.find((event) => event.id === eventId);

    if (!currentEvent) {
      return;
    }

    const targetDateKey = toDateKey(targetDate);

    if (currentEvent.dateKey === targetDateKey) {
      setSelectedDayIndex(targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1);
      return;
    }

    await cancelEventNotification(currentEvent.notificationId);

    const movedEvent: AgendaEvent = {
      ...currentEvent,
      dateKey: targetDateKey,
      notificationId: undefined,
    };
    const notificationId = movedEvent.completed
      ? undefined
      : await scheduleEventNotification(
          movedEvent,
          getCategoryForEvent(movedEvent),
        );
    const savedEvent = { ...movedEvent, notificationId };
    const targetDayIndex = targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1;
    const userId = session?.user.id;

    setEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === eventId ? savedEvent : event)),
    );
    setSelectedDayIndex(targetDayIndex);
    showAppToast({
      icon: "swap-horizontal-outline",
      message: `${savedEvent.title} · ${FULL_DATE_FORMATTER.format(targetDate)}`,
      title: "Evento movido",
      variant: "success",
    });
    setSyncStatus("Sincronizando...");

    try {
      if (!userId) {
        setSyncStatus("Modo local");
        return;
      }

      await saveSupabaseEvent(savedEvent, userId);
      setSyncStatus("Sincronizado");
    } catch (error) {
      console.warn("No se pudo mover el evento en Supabase", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "El cambio queda guardado en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  function resetFilters() {
    setSearchQuery("");
    setSearchScope("week");
    setActiveStatusFilter("all");
    setActiveCategoryFilter("all");
  }

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePassword(password: string): boolean {
    return password.length >= 6;
  }

  function getErrorMessage(error: { message: string }): string {
    const message = error.message.toLowerCase();
    if (message.includes("invalid login credentials")) {
      return "Email o contraseña incorrectos";
    }
    if (message.includes("user not found")) {
      return "No existe una cuenta con este email";
    }
    if (message.includes("email taken") || message.includes("user already registered")) {
      return "Ya existe una cuenta con este email. ¿Quieres iniciar sesión?";
    }
    if (message.includes("network")) {
      return "Error de conexión. Comprueba tu internet";
    }
    if (message.includes("rate limit")) {
      return "Demasiados intentos. Espera un momento";
    }
    return "Ha ocurrido un error. Inténtalo de nuevo";
  }

  function clearAuthErrors() {
    setAuthError("");
    setAuthFieldErrors({});
  }

  function switchAuthMode(mode: "login" | "register") {
    setAuthMode(mode);
    clearAuthErrors();
    setAuthEmail("");
    setAuthPassword("");
    setAuthConfirmPassword("");
  }

  async function signIn() {
    clearAuthErrors();
    const errors: {email?: string; password?: string} = {};
    const trimmedEmail = authEmail.trim();

    if (!trimmedEmail) {
      errors.email = "El email es obligatorio";
    } else if (!validateEmail(trimmedEmail)) {
      errors.email = "Introduce un email válido";
    }

    if (!authPassword) {
      errors.password = "La contraseña es obligatoria";
    }

    if (Object.keys(errors).length > 0) {
      setAuthFieldErrors(errors);
      setIsAuthLoading(false);
      return;
    }

    setIsAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: authPassword,
    });

    if (error) {
      setAuthError(getErrorMessage(error));
    }

    setIsAuthLoading(false);
  }

  async function signUp() {
    clearAuthErrors();
    const errors: {email?: string; password?: string; confirmPassword?: string} = {};
    const trimmedEmail = authEmail.trim();

    if (!trimmedEmail) {
      errors.email = "El email es obligatorio";
    } else if (!validateEmail(trimmedEmail)) {
      errors.email = "Introduce un email válido";
    }

    if (!authPassword) {
      errors.password = "La contraseña es obligatoria";
    } else if (!validatePassword(authPassword)) {
      errors.password = "Mínimo 6 caracteres";
    }

    if (authPassword !== authConfirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (Object.keys(errors).length > 0) {
      setAuthFieldErrors(errors);
      setIsAuthLoading(false);
      return;
    }

    setIsAuthLoading(true);

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: authPassword,
    });

    if (error) {
      setAuthError(getErrorMessage(error));
    } else {
      setAuthError("");
      setAuthFieldErrors({});
    }

    setIsAuthLoading(false);
  }

  function confirmSignOut() {
    showConfirmDialog({
      title: "Cerrar sesión",
      message: "¿Seguro que quieres cerrar sesión?",
      confirmText: "Cerrar sesión",
      onConfirm: () => {
        void signOut();
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setSyncStatus("Modo local");
  }

  function updateForm(field: keyof EventForm, value: string) {
    setForm((currentForm) => {
      if (field === "dateKey") {
        const previousWeekday = parseDateKey(currentForm.dateKey).getDay();
        const nextWeekday = parseDateKey(value).getDay();
        const shouldMoveSingleWeekday =
          currentForm.recurrence === "weekly" &&
          currentForm.recurrenceWeekdays.length === 1 &&
          currentForm.recurrenceWeekdays[0] === previousWeekday;

        return {
          ...currentForm,
          dateKey: value,
          recurrenceWeekdays: shouldMoveSingleWeekday
            ? [nextWeekday]
            : currentForm.recurrenceWeekdays,
        };
      }

      return { ...currentForm, [field]: value };
    });
    setFormErrors((currentErrors) => {
      if (field === "title") {
        return { ...currentErrors, title: undefined };
      }

      if (field === "startTime") {
        return currentErrors;
      }

      return currentErrors;
    });
  }

  function selectColor(color: string, tone: string) {
    setForm((currentForm) => ({ ...currentForm, color, tone }));
  }

  function selectCategory(category: AgendaCategory) {
    setForm((currentForm) => ({
      ...currentForm,
      category: category.id,
      color: category.color,
      tone: category.tone,
    }));
  }

  function isEventTemplateSelected(template: EventTemplate) {
    const templateCategory = getCategory(template.categoryId);

    return (
      form.title === template.title &&
      form.description === template.description &&
      form.location === template.location &&
      form.startTime === template.startTime &&
      form.reminder === template.reminder &&
      form.category === templateCategory.id &&
      formTasks.length === template.tasks.length &&
      formTasks.every((task, index) => task.title === template.tasks[index])
    );
  }

  function resetTemplateDraft() {
    const defaultCategory = getCategory(FALLBACK_CATEGORY_ID);

    setForm({
      ...createEmptyForm(parseDateKey(form.dateKey)),
      category: defaultCategory.id,
      color: defaultCategory.color,
      tone: defaultCategory.tone,
    });
    setFormTasks([]);
    setTaskDraft("");
    setFormErrors({});
  }

  function applyEventTemplate(template: EventTemplate) {
    if (isEventTemplateSelected(template)) {
      resetTemplateDraft();
      return;
    }

    const templateCategory = getCategory(template.categoryId);

    setForm((currentForm) => ({
      ...currentForm,
      title: template.title,
      description: template.description,
      location: template.location,
      startTime: template.startTime ?? currentForm.startTime,
      category: templateCategory.id,
      color: templateCategory.color,
      tone: templateCategory.tone,
      reminder: template.reminder,
    }));
    setFormTasks(
      template.tasks.map((title, index) => ({
        id: generateId(),
        eventId: editingEventId ?? "draft",
        title,
        completed: false,
        sortOrder: index,
      })),
    );
    setTaskDraft("");
    setFormErrors({});
  }

  function addFormTask() {
    const title = taskDraft.trim();

    if (!title) {
      return;
    }

    setFormTasks((currentTasks) => [
      ...currentTasks,
      {
        id: generateId(),
        eventId: editingEventId ?? "draft",
        title,
        completed: false,
        sortOrder: currentTasks.length,
      },
    ]);
    setTaskDraft("");
  }

  function updateFormTaskTitle(taskId: string, title: string) {
    setFormTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, title } : task,
      ),
    );
  }

  function toggleFormTask(taskId: string) {
    setFormTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, completed: !task.completed }
          : task,
      ),
    );
  }

  function deleteFormTask(taskId: string) {
    setFormTasks((currentTasks) =>
      currentTasks
        .filter((task) => task.id !== taskId)
        .map((task, index) => ({ ...task, sortOrder: index })),
    );
  }

  function openCategoryManager(_categoryId?: string) {
    router.push("/explore");
  }

  function closeCategoryManager() {
    setIsCategoryManagerVisible(false);
    setEditingCategoryId(null);
    setCategoryForm(createEmptyCategoryForm());
    setCategoryFormErrors({});
  }

  function selectCategoryPalette(color: string, tone: string) {
    setCategoryForm((currentForm) => ({ ...currentForm, color, tone }));
  }

  async function saveCategory() {
    const label = categoryForm.label.trim();

    if (!label) {
      setCategoryFormErrors({ label: "Ponle un nombre a la categoría." });
      return;
    }

    const existingCategory = editingCategoryId
      ? categories.find((category) => category.id === editingCategoryId)
      : undefined;
    const nextCategory: AgendaCategory = {
      id: existingCategory?.id ?? createCategoryId(label),
      label,
      icon: categoryForm.icon,
      color: categoryForm.color,
      tone: categoryForm.tone,
      sortOrder: existingCategory?.sortOrder ?? categories.length,
      isDefault: existingCategory?.isDefault ?? false,
    };
    const userId = session?.user.id;

    setCategories((currentCategories) => {
      if (existingCategory) {
        return sortCategories(
          currentCategories.map((category) =>
            category.id === existingCategory.id ? nextCategory : category,
          ),
        );
      }

      return sortCategories([...currentCategories, nextCategory]);
    });

    const nextEvents = existingCategory
      ? events.map((event) =>
          event.category === existingCategory.id
            ? { ...event, color: nextCategory.color, tone: nextCategory.tone }
            : event,
        )
      : events;

    if (existingCategory) {
      setEvents(nextEvents);
    }

    closeCategoryManager();
    showAppToast({
      icon: existingCategory ? "pricetag-outline" : "add-circle-outline",
      message: nextCategory.label,
      title: existingCategory ? "Categoría actualizada" : "Categoría creada",
      variant: "success",
    });
    setSyncStatus("Sincronizando...");

    try {
      if (!userId) {
        setSyncStatus("Modo local");
        return;
      }

      await saveSupabaseCategory(nextCategory, userId);
      if (existingCategory) {
        await saveSupabaseEvents(nextEvents, userId);
      }
      setSyncStatus("Sincronizado");
    } catch (error) {
      console.warn("No se pudo guardar la categoría en Supabase", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "Se ha guardado en este dispositivo.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  async function deleteCategory(categoryId: string) {
    if (categoryId === FALLBACK_CATEGORY_ID) {
      return;
    }

    const userId = session?.user.id;
    const fallback = getCategory(FALLBACK_CATEGORY_ID);
    const reassignedEvents = events.map((event) =>
      event.category === categoryId
        ? {
            ...event,
            category: fallback.id,
            color: fallback.color,
            tone: fallback.tone,
          }
        : event,
    );

    setCategories((currentCategories) =>
      currentCategories.filter((category) => category.id !== categoryId),
    );
    setEvents(reassignedEvents);

    if (activeCategoryFilter === categoryId) {
      setActiveCategoryFilter("all");
    }

    if (form.category === categoryId) {
      setForm((currentForm) => ({
        ...currentForm,
        category: fallback.id,
        color: fallback.color,
        tone: fallback.tone,
      }));
    }

    if (editingCategoryId === categoryId) {
      closeCategoryManager();
    }

    showAppToast({
      icon: "trash-outline",
      message: "Los eventos se han reasignado a Personal.",
      title: "Categoría eliminada",
      variant: "warning",
    });
    setSyncStatus("Sincronizando...");

    try {
      if (!userId) {
        setSyncStatus("Modo local");
        return;
      }

      await deleteSupabaseCategory(categoryId, userId);
      await saveSupabaseEvents(reassignedEvents, userId);
      setSyncStatus("Sincronizado");
    } catch (error) {
      console.warn("No se pudo borrar la categoría en Supabase", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "El cambio queda guardado en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  function selectRecurrence(recurrence: Recurrence) {
    setForm((currentForm) => ({
      ...currentForm,
      recurrence,
      recurrenceInterval: recurrence === "none" ? 1 : currentForm.recurrenceInterval,
      recurrenceWeekdays:
        recurrence === "weekly" && currentForm.recurrenceWeekdays.length === 0
          ? [parseDateKey(currentForm.dateKey).getDay()]
          : currentForm.recurrenceWeekdays,
      recurrenceEndDate:
        recurrence === "none" ? undefined : currentForm.recurrenceEndDate,
    }));
  }

  function changeRecurrenceInterval(delta: number) {
    setForm((currentForm) => ({
      ...currentForm,
      recurrenceInterval: normalizeRecurrenceInterval(
        currentForm.recurrenceInterval + delta,
      ),
    }));
  }

  function toggleRecurrenceWeekday(weekday: number) {
    setForm((currentForm) => {
      const hasWeekday = currentForm.recurrenceWeekdays.includes(weekday);
      const nextWeekdays = hasWeekday
        ? currentForm.recurrenceWeekdays.filter((day) => day !== weekday)
        : [...currentForm.recurrenceWeekdays, weekday];

      return {
        ...currentForm,
        recurrenceWeekdays:
          nextWeekdays.length > 0
            ? nextWeekdays
            : [parseDateKey(currentForm.dateKey).getDay()],
      };
    });
  }

  function setRecurrenceEnd(months: number | null) {
    setForm((currentForm) => ({
      ...currentForm,
      recurrenceEndDate:
        months === null
          ? undefined
          : toDateKey(addMonths(parseDateKey(currentForm.dateKey), months)),
    }));
  }

  function openTimePicker() {
    Keyboard.dismiss();
    const selectedTime = splitTime(form.startTime);
    setActiveTimeField("startTime");
    setTimePickerHour(selectedTime.hour);
    setTimePickerMinute(selectedTime.minute);
  }

  function closeTimePicker() {
    setActiveTimeField(null);
  }

  function nudgeModalScrollForNotes() {
    setTimeout(() => {
      modalScrollRef.current?.scrollTo({
        animated: true,
        y: modalScrollOffsetRef.current + 86,
      });
    }, 140);
  }

  function confirmTimePicker() {
    if (!activeTimeField) {
      return;
    }

    updateForm("startTime", `${timePickerHour}:${timePickerMinute}`);
    setActiveTimeField(null);
  }

  async function saveEvent() {
    const title = form.title.trim();
    const nextErrors: FormErrors = {};

    if (!title) {
      nextErrors.title = "Ponle un título al evento.";
    }

    if (nextErrors.title) {
      setFormErrors(nextErrors);
      showAppToast({
        icon: "alert-circle-outline",
        message: "Añade un título antes de guardar.",
        title: "Falta completar el evento",
        variant: "danger",
      });
      return;
    }

    const isEditingEvent = Boolean(editingEventId);

    let savedEvent: AgendaEvent = {
      id: editingEventId ?? `${Date.now()}`,
      title,
      description: form.description.trim() || "Sin notas por ahora.",
      location: form.location.trim(),
      completed: form.completed,
      dateKey: form.dateKey,
      startTime: form.startTime.trim() || "09:00",
      color: form.color,
      tone: form.tone,
      reminder: form.reminder,
      recurrence: form.recurrence,
      recurrenceInterval:
        form.recurrence === "none" ? 1 : form.recurrenceInterval,
      recurrenceWeekdays:
        form.recurrence === "weekly" ? form.recurrenceWeekdays : [],
      recurrenceEndDate:
        form.recurrence === "none" ? undefined : form.recurrenceEndDate,
      category: form.category,
    };

    const userId = session?.user.id;

    const previousEvent = editingEventId
      ? events.find((event) => event.id === editingEventId)
      : undefined;

    await cancelEventNotification(previousEvent?.notificationId);
    const notificationId = await scheduleEventNotification(
      savedEvent,
      getCategoryForEvent(savedEvent),
    );
    savedEvent = { ...savedEvent, notificationId };
    const savedTasks = formTasks
      .map((task, index) => ({
        ...task,
        eventId: savedEvent.id,
        title: task.title.trim(),
        sortOrder: index,
      }))
      .filter((task) => task.title.length > 0);

    setEvents((currentEvents) => {
      if (!editingEventId) {
        return [...currentEvents, savedEvent];
      }

      return currentEvents.map((event) =>
        event.id === editingEventId ? savedEvent : event,
      );
    });
    setEventTasks((currentTasks) => [
      ...currentTasks.filter((task) => task.eventId !== savedEvent.id),
      ...savedTasks,
    ]);
    eventFormSnapshotRef.current = null;
    closeEventModalWithoutPrompt();
    void playAgendaActionFeedback(isEditingEvent ? "light" : "success");
    showAppToast({
      icon: isEditingEvent ? "checkmark-done-outline" : "calendar-outline",
      message: savedEvent.title,
      title: isEditingEvent ? "Evento actualizado" : "Evento creado",
      variant: "success",
    });
    setSyncStatus("Sincronizando...");

    try {
      if (!userId) {
        setSyncStatus("Modo local");
        return;
      }

      await saveSupabaseEvent(savedEvent, userId);
      await replaceSupabaseEventTasks(savedEvent.id, savedTasks, userId);
      setSyncStatus("Sincronizado");
    } catch (error) {
      console.warn("No se pudo guardar el evento en Supabase", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "El evento se ha guardado en este dispositivo.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  function deleteEditingEvent() {
    if (!editingEventId) {
      return;
    }

    requestDeleteEvent(editingEventId, "modal");
  }

  function requestDeleteEvent(
    eventId: string,
    source: "detail" | "modal" | "list" = "list",
  ) {
    showConfirmDialog({
      title: "Borrar evento",
      message: "Este evento se eliminará de la agenda.",
      confirmText: "Borrar",
      onConfirm: () => {
        if (source === "detail") {
          closeEventDetail();
        }

        if (source === "modal") {
          closeEventDetail();
          closeEventModalWithoutPrompt();
        }

        void deleteEventById(eventId);
      },
    });
  }

  async function confirmDeleteEvent() {
    if (!pendingDeleteEventId) {
      return;
    }

    const deletedEventId = pendingDeleteEventId;
    setIsDeleteConfirmVisible(false);
    setPendingDeleteEventId(null);
    closeEventDetail();
    closeEventModalWithoutPrompt();
    await deleteEventById(deletedEventId);
  }

  function cancelDeleteEvent() {
    setIsDeleteConfirmVisible(false);
    setPendingDeleteEventId(null);
  }

  async function deleteEventById(eventId: string) {
    const deletedEvent = events.find((event) => event.id === eventId);
    const userId = session?.user.id;

    if (!deletedEvent) {
      return;
    }

    const deletedAt = new Date().toISOString();
    const deletedTasks = getTasksForEvent(eventId);
    const trashedEvent: AgendaEvent = {
      ...deletedEvent,
      deletedAt,
      notificationId: undefined,
    };

    await cancelEventNotification(deletedEvent?.notificationId);
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === eventId ? trashedEvent : event,
      ),
    );
    setLastDeletedEvent({ event: deletedEvent, tasks: deletedTasks });
    if (undoDeleteTimeoutRef.current) {
      clearTimeout(undoDeleteTimeoutRef.current);
    }
    undoDeleteTimeoutRef.current = setTimeout(() => {
      setLastDeletedEvent(null);
      undoDeleteTimeoutRef.current = null;
    }, 6000);
    void playAgendaActionFeedback("warning");
    showAppToast({
      action: "undo-delete",
      duration: 6000,
      icon: "trash-outline",
      message: deletedEvent.title,
      title: "Evento movido a papelera",
      variant: "warning",
    });
    setSyncStatus("Sincronizando...");

    try {
      if (!userId) {
        setSyncStatus("Modo local");
        return;
      }

      await saveSupabaseEvent(trashedEvent, userId);
      setSyncStatus("Sincronizado");
    } catch (error) {
      console.warn("No se pudo borrar el evento en Supabase", error);
      showAppToast({
        action: "undo-delete",
        duration: 6000,
        icon: "cloud-offline-outline",
        message: "Se ha borrado solo en este dispositivo.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  async function undoDeleteEvent() {
    if (!lastDeletedEvent) {
      return;
    }

    const restoredEvent: AgendaEvent = {
      ...lastDeletedEvent.event,
      deletedAt: undefined,
    };
    const restoredTasks = lastDeletedEvent.tasks;
    const userId = session?.user.id;

    if (undoDeleteTimeoutRef.current) {
      clearTimeout(undoDeleteTimeoutRef.current);
      undoDeleteTimeoutRef.current = null;
    }

    setLastDeletedEvent(null);
    setEvents((currentEvents) =>
      currentEvents.some((event) => event.id === restoredEvent.id)
        ? currentEvents.map((event) =>
            event.id === restoredEvent.id ? restoredEvent : event,
          )
        : [...currentEvents, restoredEvent],
    );
    setEventTasks((currentTasks) => {
      const currentTaskIds = new Set(currentTasks.map((task) => task.id));
      return [
        ...currentTasks,
        ...restoredTasks.filter((task) => !currentTaskIds.has(task.id)),
      ];
    });
    showAppToast({
      icon: "return-down-back-outline",
      message: restoredEvent.title,
      title: "Evento restaurado",
      variant: "success",
    });
    void playAgendaActionFeedback("success");
    setSyncStatus("Sincronizando...");

    try {
      if (!userId) {
        setSyncStatus("Modo local");
        return;
      }

      await saveSupabaseEvent(restoredEvent, userId);
      await saveSupabaseEventTasks(restoredTasks, userId);
      setSyncStatus("Sincronizado");
    } catch (error) {
      console.warn("No se pudo restaurar el evento en Supabase", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "La restauración queda guardada en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function duplicateEvent(event: AgendaEvent) {
    const newEvent: AgendaEvent = {
      ...event,
      id: generateId(),
      completed: false,
      deletedAt: undefined,
      notificationId: undefined,
    };
    const duplicatedTasks = getTasksForEvent(event.id).map((task, index) => ({
      ...task,
      id: generateId(),
      eventId: newEvent.id,
      completed: false,
      sortOrder: index,
    }));

    setEvents((currentEvents) => [...currentEvents, newEvent]);
    setEventTasks((currentTasks) => [...currentTasks, ...duplicatedTasks]);
    void playAgendaActionFeedback("light");
    showAppToast({
      icon: "copy-outline",
      message: newEvent.title,
      title: "Evento duplicado",
      variant: "success",
    });
    setSyncStatus("Sincronizando...");

    const userId = session?.user.id;
    if (!userId) {
      setSyncStatus("Modo local");
      return;
    }

    scheduleEventNotification(newEvent, getCategoryForEvent(newEvent)).then(
      async (notificationId) => {
        const eventWithNotification = { ...newEvent, notificationId };
        setEvents((current) =>
          current.map((eventItem) =>
            eventItem.id === newEvent.id ? eventWithNotification : eventItem,
          ),
        );

        try {
          await saveSupabaseEvent(eventWithNotification, userId);
          await saveSupabaseEventTasks(duplicatedTasks, userId);
          setSyncStatus("Sincronizado");
        } catch (error) {
          console.warn("No se pudo duplicar el evento en Supabase", error);
          showAppToast({
            icon: "cloud-offline-outline",
            message: "El duplicado queda guardado en local.",
            title: "Sin conexión con la nube",
            variant: "warning",
          });
          setSyncStatus("Modo local");
        }
      },
    ).catch(() => {
        showAppToast({
          icon: "cloud-offline-outline",
          message: "No se pudo programar el aviso, pero el evento se creó.",
          title: "Aviso no programado",
          variant: "warning",
        });
        setSyncStatus("Modo local");
    });
  }

  async function toggleEventTaskCompleted(taskId: string) {
    const currentTask = eventTasks.find((task) => task.id === taskId);

    if (!currentTask) {
      return;
    }

    const updatedTask = {
      ...currentTask,
      completed: !currentTask.completed,
    };
    const userId = session?.user.id;

    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => undefined);
    }

    setEventTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? updatedTask : task)),
    );
    setSyncStatus("Sincronizando...");

    try {
      if (!userId) {
        setSyncStatus("Modo local");
        return;
      }

      await saveSupabaseEventTasks([updatedTask], userId);
      setSyncStatus("Sincronizado");
    } catch (error) {
      console.warn("No se pudo guardar la tarea en Supabase", error);
      setSyncStatus("Modo local");
    }
  }

  async function toggleEventCompleted(eventId: string) {
    const current = events.find((event) => event.id === eventId);

    if (!current) {
      return;
    }

    const nextCompleted = !current.completed;
    void playCompletionFeedback(nextCompleted);

    const draft: AgendaEvent = { ...current, completed: nextCompleted };

    await cancelEventNotification(current.notificationId);

    let notificationId: string | undefined;
    if (!nextCompleted) {
      notificationId = await scheduleEventNotification(
        draft,
        getCategoryForEvent(draft),
      );
    }

    const updated: AgendaEvent = {
      ...draft,
      notificationId: nextCompleted ? undefined : notificationId,
    };

    const userId = session?.user.id;

    setEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === eventId ? updated : event)),
    );
    showAppToast({
      icon: nextCompleted ? "checkmark-circle-outline" : "refresh-outline",
      message: updated.title,
      title: nextCompleted ? "Evento completado" : "Evento reabierto",
      variant: nextCompleted ? "success" : "info",
    });
    setSyncStatus("Sincronizando...");

    try {
      if (!userId) {
        setSyncStatus("Modo local");
        return;
      }

      await saveSupabaseEvent(updated, userId);
      setSyncStatus("Sincronizado");
    } catch (error) {
      console.warn("No se pudo guardar el evento en Supabase", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "El cambio queda guardado en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  if (!hasLoadedSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authLoadingContainer}>
          <View style={styles.authLoadingIcon}>
            <Ionicons name="calendar" size={48} color={primaryIconColor} />
          </View>
          <Text style={styles.authLoadingText}>Agenda</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    const isLogin = authMode === "login";
    const primaryAction = isLogin ? signIn : signUp;
    const primaryButtonText = isAuthLoading
      ? (isLogin ? "Entrando..." : "Creando cuenta...")
      : (isLogin ? "Entrar" : "Crear cuenta");

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.authContainer}
        >
          <ScrollView
            contentContainerStyle={styles.authScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header con Logo */}
            <View style={styles.authHeader}>
              <View style={styles.authLogoContainer}>
                <Ionicons name="calendar" size={40} color={primaryIconColor} />
              </View>
              <Text style={styles.authBrand}>Agenda</Text>
              <Text style={styles.authTagline}>
                Tu planning semanal, siempre contigo
              </Text>
            </View>

            {/* Toggle entre Login/Register */}
            <View style={styles.authToggle}>
              <Pressable
                onPress={() => switchAuthMode("login")}
                style={[
                  styles.authToggleButton,
                  isLogin && styles.authToggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.authToggleText,
                    isLogin && styles.authToggleTextActive,
                  ]}
                >
                  Iniciar sesión
                </Text>
              </Pressable>
              <Pressable
                onPress={() => switchAuthMode("register")}
                style={[
                  styles.authToggleButton,
                  !isLogin && styles.authToggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.authToggleText,
                    !isLogin && styles.authToggleTextActive,
                  ]}
                >
                  Crear cuenta
                </Text>
              </Pressable>
            </View>

            {/* Formulario */}
            <View style={styles.authForm}>
              {/* Email */}
              <View style={styles.authInputGroup}>
                <Text style={styles.authInputLabel}>Email</Text>
                <View
                  style={[
                    styles.authInputContainer,
                    authFieldErrors.email && styles.authInputContainerError,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={authFieldErrors.email ? "#B42318" : "#9CA3AF"}
                    style={styles.authInputIcon}
                  />
                  <TextInput
                    autoCapitalize="none"
                    editable={!isAuthLoading}
                    keyboardType="email-address"
                    onChangeText={(text) => {
                      setAuthEmail(text);
                      if (authFieldErrors.email) {
                        setAuthFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="tu@email.com"
                    placeholderTextColor="#9CA3AF"
                    style={styles.authInput}
                    value={authEmail}
                  />
                </View>
                {authFieldErrors.email ? (
                  <Text style={styles.authInputError}>{authFieldErrors.email}</Text>
                ) : null}
              </View>

              {/* Contraseña */}
              <View style={styles.authInputGroup}>
                <Text style={styles.authInputLabel}>Contraseña</Text>
                <View
                  style={[
                    styles.authInputContainer,
                    authFieldErrors.password && styles.authInputContainerError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={authFieldErrors.password ? "#B42318" : "#9CA3AF"}
                    style={styles.authInputIcon}
                  />
                  <TextInput
                    editable={!isAuthLoading}
                    onChangeText={(text) => {
                      setAuthPassword(text);
                      if (authFieldErrors.password) {
                        setAuthFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    style={styles.authInput}
                    value={authPassword}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.authInputEye}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9CA3AF"
                    />
                  </Pressable>
                </View>
                {authFieldErrors.password ? (
                  <Text style={styles.authInputError}>{authFieldErrors.password}</Text>
                ) : null}
              </View>

              {/* Confirmar contraseña (solo registro) */}
              {!isLogin && (
                <View style={styles.authInputGroup}>
                  <Text style={styles.authInputLabel}>Confirmar contraseña</Text>
                  <View
                    style={[
                      styles.authInputContainer,
                      authFieldErrors.confirmPassword && styles.authInputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={authFieldErrors.confirmPassword ? "#B42318" : "#9CA3AF"}
                      style={styles.authInputIcon}
                    />
                    <TextInput
                      editable={!isAuthLoading}
                      onChangeText={(text) => {
                        setAuthConfirmPassword(text);
                        if (authFieldErrors.confirmPassword) {
                          setAuthFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showConfirmPassword}
                      style={styles.authInput}
                      value={authConfirmPassword}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.authInputEye}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#9CA3AF"
                      />
                    </Pressable>
                  </View>
                  {authFieldErrors.confirmPassword ? (
                    <Text style={styles.authInputError}>{authFieldErrors.confirmPassword}</Text>
                  ) : null}
                </View>
              )}

              {/* Error general */}
              {authError ? (
                <View style={styles.authErrorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#B42318" />
                  <Text style={styles.authErrorText}>{authError}</Text>
                </View>
              ) : null}

              {/* Botón principal */}
              <Pressable
                disabled={isAuthLoading}
                onPress={primaryAction}
                style={({ pressed }) => [
                  styles.authPrimaryButton,
                  pressed && styles.authPrimaryButtonPressed,
                  isAuthLoading && styles.authPrimaryButtonDisabled,
                ]}
              >
                <Text style={styles.authPrimaryButtonText}>{primaryButtonText}</Text>
              </Pressable>

              {/* Info adicional */}
              <Text style={styles.authInfoText}>
                {isLogin
                  ? "¿No tienes cuenta? Pulsa 'Crear cuenta' arriba"
                  : "¿Ya tienes cuenta? Pulsa 'Iniciar sesión' arriba"}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const quickDragTargetZone =
    quickDrag?.mode !== "day" ||
    quickDrag.targetIndex === null ||
    quickDrag.targetIndex === undefined
      ? null
      : quickDropZonesRef.current.find(
          (zone) => zone.index === quickDrag.targetIndex,
        ) ?? null;
  const quickDragHourTargetZone =
    quickDrag?.mode !== "hour" ||
    quickDrag.targetHour === null ||
    quickDrag.targetHour === undefined
      ? null
      : timelineDropZonesRef.current.find(
          (zone) => zone.hour === quickDrag.targetHour,
        ) ?? null;

  return (
    <AgendaStylesContext.Provider value={styles}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={!quickDrag}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.kicker}>Agenda semanal</Text>
            <Text style={styles.title}>
              {formatWeekRange(currentWeekStart)}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {weekOffset !== 0 && (
              <Pressable
                accessibilityLabel="Volver a hoy"
                style={styles.todayHeaderButton}
                onPress={goToToday}
              >
                <Ionicons name="today-outline" size={20} color="#E05D5D" />
              </Pressable>
            )}
            <View>
              <Pressable
                accessibilityLabel="Estado de sincronización"
                style={styles.syncIconButton}
                onPress={() => setIsSyncTooltipVisible(!isSyncTooltipVisible)}
              >
                <Ionicons
                  name={
                    syncStatus === "Sincronizado"
                      ? "cloud-done-outline"
                      : syncStatus === "Modo local"
                        ? "cloud-offline-outline"
                        : "sync-outline"
                  }
                  size={20}
                  color={
                    syncStatus === "Sincronizado"
                      ? "#3D8B7D"
                      : syncStatus === "Modo local"
                        ? "#D28A2E"
                        : "#4D74B8"
                  }
                />
              </Pressable>

              {isSyncTooltipVisible && (
                <Pressable
                  style={styles.syncTooltipOverlay}
                  onPress={closeSyncTooltip}
                >
                  <Animated.View
                    style={[
                      styles.syncTooltip,
                      {
                        opacity: syncTooltipOpacity,
                        transform: [{ scale: syncTooltipScale }],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.syncTooltipDot,
                        syncStatus === "Sincronizado" && { backgroundColor: "#3D8B7D" },
                        syncStatus === "Modo local" && { backgroundColor: "#D28A2E" },
                        syncStatus !== "Sincronizado" && syncStatus !== "Modo local" && { backgroundColor: "#4D74B8" },
                      ]}
                    />
                    <Text style={styles.syncTooltipText}>{syncStatus}</Text>
                  </Animated.View>
                </Pressable>
              )}
            </View>
            <Pressable
              accessibilityLabel="Cerrar sesión"
              style={styles.iconHeaderButton}
              onPress={confirmSignOut}
            >
              <Ionicons name="log-out-outline" size={20} color={primaryIconColor} />
            </Pressable>
          </View>
        </View>

        <View style={styles.todayHero}>
          <View style={styles.todayHeroHeader}>
            <View style={styles.todayHeroTitleBlock}>
              <Text style={styles.sectionLabel}>Hoy</Text>
              <Text style={styles.todayHeroTitle}>
                {FULL_DATE_FORMATTER.format(currentTime)}
              </Text>
              <Text style={styles.todayHeroSummary} numberOfLines={1}>
                {todaySummaryLabel}
              </Text>
            </View>
            <View style={styles.todayHeroBadges}>
              {overdueReminderCount > 0 ? (
                <View style={styles.todayOverdueBadge}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color="#B42318"
                  />
                  <Text style={styles.todayOverdueText}>
                    {overdueReminderCount}{" "}
                    {overdueReminderCount === 1 ? "atrasado" : "atrasados"}
                  </Text>
                </View>
              ) : null}
              <View style={styles.todayProgressBadge}>
                <Text style={styles.todayProgressValue}>
                  {todayCompletionPercent}%
                </Text>
                <Text style={styles.todayProgressLabel}>Hecho</Text>
              </View>
            </View>
          </View>

          <Pressable
            accessibilityLabel={
              nextTodayOccurrence
                ? "Abrir próximo evento de hoy"
                : "Crear evento para hoy"
            }
            style={styles.todayNextCard}
            onPress={() =>
              nextTodayOccurrence
                ? openEventDetail(
                    nextTodayOccurrence.event,
                    nextTodayOccurrence.occurrenceDate,
                  )
                : openNewEventModal(currentTime)
            }
          >
            <View
              style={[
                styles.todayNextIcon,
                {
                  backgroundColor:
                    nextTodayOccurrence?.event.color ?? "#3D8B7D",
                },
              ]}
            >
              <Ionicons
                name={
                  nextTodayOccurrence
                    ? getCategoryForEvent(nextTodayOccurrence.event).icon
                    : "sparkles-outline"
                }
                size={20}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.todayNextBody}>
              <Text style={styles.todayNextKicker}>
                {nextTodayOccurrence ? "Próximo evento" : "Agenda limpia"}
              </Text>
              <Text style={styles.todayNextTitle} numberOfLines={1}>
                {nextTodayOccurrence?.event.title ?? "No hay planes para hoy"}
              </Text>
              <Text style={styles.todayNextMeta} numberOfLines={1}>
                {nextTodayOccurrence
                  ? `${nextTodayOccurrence.event.startTime} · ${
                      getCategoryForEvent(nextTodayOccurrence.event).label
                    }${
                      nextTodayOccurrence.event.location
                        ? ` · ${nextTodayOccurrence.event.location}`
                        : ""
                    }`
                  : "Toca para crear uno en segundos"}
              </Text>
            </View>

            <View
              style={[
                styles.todayTimingBadge,
                todayReminderInfo && {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : todayReminderInfo.tone,
                  borderColor: todayReminderInfo.color,
                },
              ]}
            >
              <Ionicons
                name={todayReminderInfo?.icon ?? "add-circle-outline"}
                size={14}
                color={todayReminderInfo?.color ?? primaryIconColor}
              />
              <Text
                style={[
                  styles.todayTimingText,
                  todayReminderInfo && { color: todayReminderInfo.color },
                ]}
                numberOfLines={2}
              >
                {todayReminderInfo
                  ? getReminderBadgeLabel(todayReminderInfo)
                  : "Crear"}
              </Text>
            </View>
          </Pressable>

          <View style={styles.todayStatsRow}>
            <View style={styles.todayStatCard}>
              <Text style={styles.todayStatValue}>{todayPendingEvents}</Text>
              <Text style={styles.todayStatLabel}>Pendientes</Text>
            </View>
            <View style={styles.todayStatCard}>
              <Text style={styles.todayStatValue}>{todayCompletedEvents}</Text>
              <Text style={styles.todayStatLabel}>Completados</Text>
            </View>
            <View style={styles.todayStatCard}>
              <Text style={styles.todayStatValue}>
                {todayOccurrences.length}
              </Text>
              <Text style={styles.todayStatLabel}>Planes</Text>
            </View>
          </View>

          <View style={styles.todayProgressTrack}>
            <View
              style={[
                styles.todayProgressFill,
                { width: `${todayCompletionPercent}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.homeActionRow}>
          <Pressable
            accessibilityLabel="Crear evento"
            style={[styles.homeActionButton, styles.homeActionButtonPrimary]}
            onPress={() => openNewEventModal(selectedDay.date)}
          >
            <View style={styles.homeActionIcon}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.homeActionTextBlock}>
              <Text
                style={[
                  styles.homeActionButtonText,
                  styles.homeActionButtonTextPrimary,
                ]}
                numberOfLines={1}
              >
                Nuevo
              </Text>
              <Text
                style={[
                  styles.homeActionButtonMeta,
                  styles.homeActionButtonMetaPrimary,
                ]}
                numberOfLines={1}
              >
                {selectedDay.label} {selectedDay.date.getDate()}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityLabel="Buscar y filtrar eventos"
            style={styles.homeActionButton}
            onPress={() => openSearchPanel()}
          >
            <Ionicons
              name={hasActiveFilters ? "options-outline" : "search-outline"}
              size={19}
              color={primaryIconColor}
            />
            <View style={styles.homeActionTextBlock}>
              <Text style={styles.homeActionButtonText} numberOfLines={1}>
                {hasActiveFilters ? "Filtros" : "Buscar"}
              </Text>
              <Text style={styles.homeActionButtonMeta} numberOfLines={1}>
                {hasActiveFilters
                  ? filtersTriggerSubtitle
                  : `${upcomingEvents.length} próximos`}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityLabel="Abrir calendario mensual"
            style={styles.homeActionButton}
            onPress={openCalendar}
          >
            <Ionicons name="calendar-outline" size={19} color={primaryIconColor} />
            <View style={styles.homeActionTextBlock}>
              <Text style={styles.homeActionButtonText} numberOfLines={1}>
                Mes
              </Text>
              <Text style={styles.homeActionButtonMeta} numberOfLines={1}>
                Saltar
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.weekControls}>
          <Pressable
            accessibilityLabel="Semana anterior"
            style={styles.arrowButton}
            onPress={() => setWeekOffset((offset) => offset - 1)}
          >
            <Ionicons name="chevron-back" size={22} color={primaryIconColor} />
          </Pressable>

          <Pressable
            accessibilityHint="Abre un calendario para saltar a cualquier día"
            accessibilityLabel={`Resumen de la semana: ${totalEvents} planes. Abrir calendario`}
            style={styles.weekSummary}
            onPress={openCalendar}
          >
            <Text style={styles.weekSummaryValue}>
              {totalEvents} planes esta semana
            </Text>
            <Text style={styles.weekSummaryProgress}>
              {pendingWeekEvents} pendientes · {completedWeekEvents} completados
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Semana siguiente"
            style={styles.arrowButton}
            onPress={() => setWeekOffset((offset) => offset + 1)}
          >
            <Ionicons name="chevron-forward" size={22} color={primaryIconColor} />
          </Pressable>
        </View>

        <View style={styles.dayStrip}>
          {weekDays.map((day, index) => {
            const isSelected = selectedDayIndex === index;
            const isToday = isSameDay(day.date, today);

            return (
              <Pressable
                key={day.dateKey}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                ]}
                onPress={() => openDayDetail(index)}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {day.label}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
                <View
                  style={[
                    styles.eventDot,
                    day.events.length > 0 && styles.eventDotActive,
                    isToday && styles.todayDot,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.focusPanel}>
          <View style={styles.focusHeader}>
            <View style={styles.focusTitleBlock}>
              <Text style={styles.sectionLabel}>Día seleccionado</Text>
              <Text style={styles.focusTitle}>
                {selectedDay.label}, {selectedDay.date.getDate()} de{" "}
                {MONTH_FORMATTER.format(selectedDay.date)}
              </Text>
            </View>
            <View style={styles.focusActions}>
              {!isSameDay(selectedDay.date, today) ? (
                <Pressable style={styles.todaySmallButton} onPress={goToToday}>
                  <Ionicons name="locate-outline" size={15} color={primaryIconColor} />
                  <Text style={styles.todaySmallButtonText}>Hoy</Text>
                </Pressable>
              ) : null}
              {selectedDay.events.length > 0 ? (
                <Pressable
                  accessibilityLabel={
                    isDayOrganizeMode
                      ? "Terminar modo mover eventos"
                      : "Activar modo mover eventos"
                  }
                  style={[
                    styles.dayOrganizeButton,
                    isDayOrganizeMode && styles.dayOrganizeButtonActive,
                  ]}
                  onPress={toggleDayOrganizeMode}
                >
                  <Ionicons
                    name={
                      isDayOrganizeMode
                        ? "checkmark-outline"
                        : "swap-vertical-outline"
                    }
                    size={17}
                    color={isDayOrganizeMode ? "#FFFFFF" : primaryIconColor}
                  />
                  <Text
                    style={[
                      styles.dayOrganizeButtonText,
                      isDayOrganizeMode &&
                        styles.dayOrganizeButtonTextActive,
                    ]}
                  >
                    {isDayOrganizeMode ? "Listo" : "Mover"}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityLabel="Crear evento para el día seleccionado"
                style={styles.smallAddButton}
                onPress={() => openNewEventModal(selectedDay.date)}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {isDayOrganizeMode && selectedDay.events.length > 0 ? (
            <View style={styles.dayOrganizeHint}>
              <Ionicons name="move-outline" size={16} color="#3D8B7D" />
              <Text style={styles.dayOrganizeHintText}>
                Mantén pulsado un evento y suéltalo sobre otra hora.
              </Text>
            </View>
          ) : null}

          {selectedDay.events.length === 0 ? (
            <AgendaEmptyState
              actionLabel="Añadir plan"
              icon="sparkles-outline"
              onAction={() => openNewEventModal(selectedDay.date)}
              text="Perfecto para descansar o guardar un plan rápido cuando toque."
              title="Día libre"
            />
          ) : (
            <View style={styles.timeline}>
              {selectedDayTimelineHours.map((hour) => {
                const hourEvents = selectedDayEventsByHour[hour] ?? [];
                const isCurrentHour = selectedDayCurrentHour === hour;
                const slotTime = formatTimelineHour(hour);
                const openSlot = () =>
                  openNewEventModal(
                    getDateWithTime(selectedDay.date, slotTime),
                    slotTime,
                  );
                const nowLine = isCurrentHour ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.timelineNowLine,
                      { top: selectedDayNowLineTop },
                    ]}
                  >
                    <View style={styles.timelineNowDot} />
                    <View style={styles.timelineNowRule} />
                    <Text style={styles.timelineNowText}>Ahora</Text>
                  </View>
                ) : null;

                return (
                  <View key={slotTime} style={styles.timelineHourRow}>
                    <Pressable
                      accessibilityLabel={`Crear evento a las ${slotTime}`}
                      style={styles.timelineHourLabelBlock}
                      onPress={openSlot}
                    >
                      <Text
                        style={[
                          styles.timelineHourLabel,
                          isCurrentHour && styles.timelineHourLabelNow,
                        ]}
                      >
                        {slotTime}
                      </Text>
                    </Pressable>

                    <View style={styles.timelineRail}>
                      <View
                        style={[
                          styles.timelineDot,
                          hourEvents.length > 0 && styles.timelineDotActive,
                          isCurrentHour && styles.timelineDotNow,
                        ]}
                      />
                    </View>

                    {hourEvents.length === 0 ? (
                      <Pressable
                        accessibilityLabel={`Crear evento a las ${slotTime}`}
                        ref={(node) => {
                          timelineDropTargetRefs.current[slotTime] = node;
                        }}
                        style={styles.timelineHourSlot}
                        onPress={openSlot}
                      >
                        {nowLine}
                        <View style={styles.timelineEmptySlot}>
                          <Ionicons
                            name="add-circle-outline"
                            size={16}
                            color="#9CA3AF"
                          />
                          <Text style={styles.timelineEmptyText}>
                            Libre
                          </Text>
                        </View>
                      </Pressable>
                    ) : (
                      <View
                        ref={(node) => {
                          timelineDropTargetRefs.current[slotTime] = node;
                        }}
                        style={styles.timelineHourSlot}
                      >
                        {nowLine}
                        <View style={styles.timelineEventStack}>
                          {hourEvents.map((event) => {
                            const occurrenceDate = getOccurrenceStartForDate(
                              event,
                              selectedDay.date,
                            );
                            const category = getCategoryForEvent(event);
                            const eventTasksForItem = getTasksForEvent(
                              event.id,
                            );

                            return (
                              <SwipeableEventRow
                                key={event.id}
                                completed={event.completed}
                                enabled={!isDayOrganizeMode}
                                onComplete={() => {
                                  void toggleEventCompleted(event.id);
                                }}
                                onDelete={() => {
                                  requestDeleteEvent(event.id);
                                }}
                              >
                                <QuickDraggableEvent
                                  dragEnabled={isDayOrganizeMode}
                                  event={event}
                                  isDragging={
                                    quickDrag?.mode === "hour" &&
                                    quickDrag.eventId === event.id
                                  }
                                  onDragCancel={cancelQuickDrag}
                                  onDragEnd={finishQuickDrag}
                                  onDragMove={updateQuickDrag}
                                  onDragStart={startTimelineHourDrag}
                                  onOpen={() =>
                                    openEventDetail(event, occurrenceDate)
                                  }
                                  variant="plain"
                                >
                                  <View
                                    style={[
                                      styles.timelineEventCard,
                                      {
                                        borderLeftColor: event.completed
                                          ? "#9CA3AF"
                                          : event.color,
                                      },
                                      event.completed &&
                                        styles.timelineEventCardCompleted,
                                      isDayOrganizeMode &&
                                        styles.timelineEventCardOrganizing,
                                    ]}
                                  >
                                    <View style={styles.timelineEventPressable}>
                                    <View
                                      style={[
                                        styles.timelineEventIcon,
                                        {
                                          backgroundColor: event.completed
                                            ? "#9CA3AF"
                                            : event.color,
                                        },
                                      ]}
                                    >
                                      <Ionicons
                                        name={category.icon}
                                        size={16}
                                        color="#FFFFFF"
                                      />
                                    </View>
                                    <View style={styles.timelineEventBody}>
                                      <View style={styles.timelineEventTopRow}>
                                        <Text
                                          style={[
                                            styles.timelineEventTitle,
                                            event.completed &&
                                              styles.completedText,
                                          ]}
                                          numberOfLines={1}
                                        >
                                          {event.title}
                                        </Text>
                                        <Text style={styles.timelineEventTime}>
                                          {event.startTime}
                                        </Text>
                                      </View>
                                      <Text
                                        style={styles.timelineEventMeta}
                                        numberOfLines={1}
                                      >
                                        {category.label}
                                        {event.location
                                          ? ` · ${event.location}`
                                          : ""}
                                      </Text>
                                      <View style={styles.timelineEventBadges}>
                                        <ReminderBadge
                                          currentTime={currentTime}
                                          event={event}
                                          occurrenceDate={occurrenceDate}
                                          variant="inline"
                                        />
                                        <EventTaskPill
                                          color={event.color}
                                          tasks={eventTasksForItem}
                                          variant="inline"
                                        />
                                        {event.recurrence !== "none" ? (
                                          <View
                                            style={styles.timelineMiniBadge}
                                          >
                                            <Ionicons
                                              name="repeat-outline"
                                              size={12}
                                              color={event.color}
                                            />
                                            <Text
                                              style={[
                                                styles.timelineMiniBadgeText,
                                                { color: event.color },
                                              ]}
                                              numberOfLines={1}
                                            >
                                              {getRecurrenceSummaryLabel(event)}
                                            </Text>
                                          </View>
                                        ) : null}
                                      </View>
                                    </View>
                                    </View>
                                  </View>
                                </QuickDraggableEvent>
                              </SwipeableEventRow>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.activityPanel}>
          <View style={styles.activityHeader}>
            <View style={styles.activityHeaderText}>
              <Text style={styles.sectionLabel}>Resumen</Text>
              <Text style={styles.activityTitle}>Ritmo de la semana</Text>
              <Text style={styles.activitySubtitle} numberOfLines={1}>
                {formatWeekRange(currentWeekStart)} · {allWeekOccurrences.length}{" "}
                {allWeekOccurrences.length === 1 ? "plan" : "planes"}
              </Text>
            </View>
            <View style={styles.activityMonthBadge}>
              <Text style={styles.activityMonthValue}>
                {activityWeekCompletionPercent}%
              </Text>
              <Text style={styles.activityMonthLabel}>Semana</Text>
            </View>
          </View>

          <View style={styles.activityBarsRow}>
            {activityWeekBars.map((day) => {
              const hasEvents = day.events.length > 0;

              return (
                <View
                  key={`${day.label}-${toDateKey(day.date)}`}
                  style={styles.activityBarItem}
                >
                  <View style={styles.activityBarTrack}>
                    <View
                      style={[
                        styles.activityBarFill,
                        {
                          backgroundColor:
                            day.events.length > 0 &&
                            day.completedEvents === day.events.length
                              ? "#3D8B7D"
                              : hasEvents
                                ? "#E05D5D"
                                : "#D8CEC2",
                          height: day.barHeight,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.activityBarLabel}>{day.label}</Text>
                  <Text style={styles.activityBarCount}>
                    {day.events.length}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.activityInsightBox}>
            <Ionicons name="sparkles-outline" size={18} color="#D28A2E" />
            <Text style={styles.activityInsightText}>{activityInsight}</Text>
          </View>
        </View>

        <View style={styles.overview}>
          <Pressable
            accessibilityLabel={
              isQuickMoveExpanded
                ? "Ocultar herramienta para mover eventos"
                : "Mostrar herramienta para mover eventos"
            }
            style={styles.quickMoveHeader}
            onPress={() => setIsQuickMoveExpanded((expanded) => !expanded)}
          >
            <View style={styles.quickMoveHeaderTextBlock}>
              <Text style={styles.sectionLabel}>Mover eventos</Text>
              <Text style={styles.quickMoveTitle}>
                Reorganizar la semana
              </Text>
              <Text style={styles.quickMoveSubtitle} numberOfLines={1}>
                {completedWeekEvents} de {weekSummaryEvents.length} completados
              </Text>
            </View>
            <View style={styles.quickMoveHeaderAction}>
              <Ionicons
                name={isQuickMoveExpanded ? "chevron-up" : "chevron-down"}
                size={22}
                color={primaryIconColor}
              />
            </View>
          </Pressable>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${weekCompletionRatio * 100}%` },
              ]}
            />
          </View>

          {isQuickMoveExpanded ? (
            <>
              <Text style={styles.quickDragHelpText}>
                Toca para editar. Mantén pulsado solo si quieres moverlo de día.
              </Text>

              {weekDays.map((day, index) => {
                const isDropTarget = quickDrag?.targetIndex === index;
                const isCurrentDragDay = quickDragEvent?.dateKey === day.dateKey;

                return (
                  <View
                    key={day.dateKey}
                    ref={(node) => {
                      quickDropTargetRefs.current[day.dateKey] = node;
                    }}
                    style={[
                      styles.dayRow,
                      isCurrentDragDay && styles.dayRowDragOrigin,
                      isDropTarget && styles.dayRowDropZoneTarget,
                    ]}
                  >
                    {isDropTarget ? (
                      <View
                        pointerEvents="none"
                        style={styles.dayRowDropTopLine}
                      />
                    ) : null}
                    <View style={styles.dayRowDate}>
                      <Text style={styles.dayRowLabel}>{day.label}</Text>
                      <Text style={styles.dayRowNumber}>
                        {day.date.getDate()}
                      </Text>
                    </View>

                    <View style={styles.dayRowEvents}>
                      {day.events.length === 0 ? (
                        <Text style={styles.noEventsText}>Sin eventos</Text>
                      ) : (
                        day.events.map((event) => (
                          <QuickDraggableEvent
                            key={event.id}
                            event={event}
                            isDragging={quickDrag?.eventId === event.id}
                            onDragCancel={cancelQuickDrag}
                            onDragEnd={finishQuickDrag}
                            onDragMove={updateQuickDrag}
                            onDragStart={startQuickDrag}
                            onOpen={() =>
                              openEventDetail(
                                event,
                                getOccurrenceStartForDate(event, day.date),
                              )
                            }
                          >
                            <View style={styles.compactEventPressable}>
                              <View
                                style={[
                                  styles.compactIconDot,
                                  {
                                    backgroundColor: event.completed
                                      ? "#9CA3AF"
                                      : event.color,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={getCategoryForEvent(event).icon}
                                  size={11}
                                  color="#FFFFFF"
                                />
                              </View>
                              <Text
                                style={[
                                  styles.compactEventText,
                                  event.completed && styles.completedText,
                                ]}
                                numberOfLines={1}
                              >
                                {event.startTime} {event.title}
                              </Text>
                              {event.recurrence !== "none" ? (
                                <Ionicons
                                  name="repeat-outline"
                                  size={14}
                                  color="#6B7280"
                                />
                              ) : null}
                              {getTasksForEvent(event.id).length > 0 ? (
                                <Ionicons
                                  name="checkbox-outline"
                                  size={14}
                                  color="#6B7280"
                                />
                              ) : null}
                            </View>
                          </QuickDraggableEvent>
                        ))
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.quickMoveCollapsedRow}>
              <View style={styles.quickMoveMiniStat}>
                <Text style={styles.quickMoveMiniValue}>{totalEvents}</Text>
                <Text style={styles.quickMoveMiniLabel}>planes</Text>
              </View>
              <View style={styles.quickMoveMiniStat}>
                <Text style={styles.quickMoveMiniValue}>
                  {pendingWeekEvents}
                </Text>
                <Text style={styles.quickMoveMiniLabel}>pendientes</Text>
              </View>
              <View style={styles.quickMoveMiniStat}>
                <Text style={styles.quickMoveMiniValue}>
                  {activityWeekCompletionPercent}%
                </Text>
                <Text style={styles.quickMoveMiniLabel}>semana</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {quickDrag && quickDragEvent ? (
        <View pointerEvents="none" style={styles.quickDragLayer}>
          {quickDragTargetZone ? (
            <View
              style={[
                styles.quickDragTargetTopLine,
                {
                  left: quickDragTargetZone.x,
                  top: quickDragTargetZone.y,
                  width: quickDragTargetZone.width,
                },
              ]}
            />
          ) : null}
          {quickDragHourTargetZone ? (
            <View
              style={[
                styles.quickDragTargetTopLine,
                {
                  left: quickDragHourTargetZone.x,
                  top: quickDragHourTargetZone.y,
                  width: quickDragHourTargetZone.width,
                },
              ]}
            />
          ) : null}
          <View
            style={[
              styles.quickDragPreview,
              {
                borderColor: quickDragEvent.color,
                left: quickDrag.x,
                top: quickDrag.y,
              },
            ]}
          >
            <View
              style={[
                styles.compactIconDot,
                { backgroundColor: quickDragEvent.color },
              ]}
            >
              <Ionicons
                name={getCategoryForEvent(quickDragEvent).icon}
                size={11}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.quickDragPreviewTextBlock}>
              <Text style={styles.quickDragPreviewTitle} numberOfLines={1}>
                {quickDragEvent.title}
              </Text>
              <Text style={styles.quickDragPreviewMeta}>
                {quickDrag.mode === "hour" && quickDrag.targetHour !== null
                  ? formatTimelineHour(quickDrag.targetHour)
                  : quickDragEvent.startTime}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {appToast ? (() => {
        const toastPalette = TOAST_PALETTE[appToast.variant];

        return (
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              styles.appToast,
              {
                backgroundColor: toastPalette.backgroundColor,
                opacity: toastOpacity,
                transform: [{ translateY: toastTranslateY }],
              },
            ]}
          >
            <View
              style={[
                styles.appToastIconWrap,
                { backgroundColor: toastPalette.iconBackgroundColor },
              ]}
            >
              <Ionicons
                name={appToast.icon}
                size={18}
                color={toastPalette.iconColor}
              />
            </View>
            <View style={styles.appToastTextBlock}>
              <Text style={styles.appToastTitle} numberOfLines={1}>
                {appToast.title}
              </Text>
              {appToast.message ? (
                <Text style={styles.appToastText} numberOfLines={1}>
                  {appToast.message}
                </Text>
              ) : null}
            </View>
            {appToast.action === "undo-delete" && lastDeletedEvent ? (
              <Pressable
                accessibilityLabel="Deshacer borrado del evento"
                accessibilityRole="button"
                style={styles.appToastActionButton}
                onPress={() => {
                  void undoDeleteEvent();
                }}
              >
                <Text style={styles.appToastActionText}>Deshacer</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel="Cerrar aviso"
                accessibilityRole="button"
                hitSlop={8}
                style={styles.appToastCloseButton}
                onPress={hideAppToast}
              >
                <Ionicons name="close" size={17} color="#FFFFFF" />
              </Pressable>
            )}
          </Animated.View>
        );
      })() : null}


      <Modal
        animationType="fade"
        onRequestClose={() => setIsCalendarVisible(false)}
        transparent
        visible={isCalendarVisible}
      >
        <View style={styles.calendarOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsCalendarVisible(false)}
          />
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Pressable
                accessibilityLabel="Mes anterior"
                style={styles.calendarNavButton}
                onPress={() => changeCalendarMonth(-1)}
              >
                <Ionicons name="chevron-back" size={21} color={primaryIconColor} />
              </Pressable>

              <View style={styles.calendarTitleBlock}>
                <Text style={styles.sectionLabel}>Ir a fecha</Text>
                <Text style={styles.calendarMonthTitle}>
                  {MONTH_YEAR_FORMATTER.format(calendarMonthDate)}
                </Text>
              </View>

              <View style={styles.calendarHeaderActions}>
                <Pressable
                  accessibilityLabel="Mes siguiente"
                  style={styles.calendarNavButton}
                  onPress={() => changeCalendarMonth(1)}
                >
                  <Ionicons name="chevron-forward" size={21} color={primaryIconColor} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Cerrar calendario"
                  style={styles.calendarNavButton}
                  onPress={() => setIsCalendarVisible(false)}
                >
                  <Ionicons name="close" size={21} color={primaryIconColor} />
                </Pressable>
              </View>
            </View>

            <View style={styles.calendarWeekRow}>
              {WEEK_DAYS.map((day) => (
                <Text key={day} style={styles.calendarWeekday}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day) => {
                const isSelected = day.dateKey === calendarPreviewDateKey;
                const isToday = isSameDay(day.date, today);
                const hasOverdueEvents = day.overdueCount > 0;

                return (
                  <Pressable
                    accessibilityHint="Mantén pulsado para crear un evento en este día"
                    accessibilityLabel={`${day.date.getDate()}, ${
                      day.eventCount === 1
                        ? "1 evento"
                        : `${day.eventCount} eventos`
                    }${hasOverdueEvents ? `, ${day.overdueCount} atrasados` : ""}`}
                    delayLongPress={320}
                    key={day.dateKey}
                    style={[
                      styles.calendarDayCell,
                      !day.isCurrentMonth && styles.calendarDayCellMuted,
                      isToday && styles.calendarDayCellToday,
                      hasOverdueEvents && styles.calendarDayCellOverdue,
                      isSelected && styles.calendarDayCellSelected,
                    ]}
                    onLongPress={() => {
                      previewCalendarDate(day.date);
                      setIsCalendarVisible(false);
                      openNewEventModal(day.date);
                    }}
                    onPress={() => previewCalendarDate(day.date)}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        !day.isCurrentMonth && styles.calendarDayTextMuted,
                        isSelected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {day.date.getDate()}
                    </Text>
                    <View style={styles.calendarDotRow}>
                      {day.eventDots.length === 0 ? (
                        <View
                          style={[
                            styles.calendarEventDot,
                            styles.calendarEventDotEmpty,
                          ]}
                        />
                      ) : (
                        day.eventDots.map((dotColor, dotIndex) => (
                          <View
                            key={`${day.dateKey}-${dotColor}-${dotIndex}`}
                            style={[
                              styles.calendarEventDot,
                              {
                                backgroundColor: isSelected
                                  ? "#FFFFFF"
                                  : dotColor,
                              },
                            ]}
                          />
                        ))
                      )}
                    </View>
                    {day.eventCount > 3 ? (
                      <Text
                        style={[
                          styles.calendarMoreText,
                          isSelected && styles.calendarMoreTextSelected,
                        ]}
                      >
                        +{day.eventCount - 3}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.calendarPreviewPanel}>
              <View style={styles.calendarPreviewHeader}>
                <View style={styles.calendarPreviewTitleBlock}>
                  <Text style={styles.calendarPreviewTitle}>
                    {FULL_DATE_FORMATTER.format(calendarPreviewDate)}
                  </Text>
                </View>
                <View style={styles.calendarPreviewCountBadge}>
                  <Text style={styles.calendarPreviewCountText}>
                    {calendarPreviewDay?.eventCount ?? 0}
                  </Text>
                </View>
              </View>

              <View style={styles.calendarPreviewStatsRow}>
                <View style={styles.calendarPreviewStatPill}>
                  <Ionicons name="time-outline" size={13} color="#4D74B8" />
                  <Text style={styles.calendarPreviewStatText}>
                    {calendarPreviewPendingCount} pendientes
                  </Text>
                </View>
                <View style={styles.calendarPreviewStatPill}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={13}
                    color="#3D8B7D"
                  />
                  <Text style={styles.calendarPreviewStatText}>
                    {calendarPreviewCompletedCount} hechos
                  </Text>
                </View>
                {calendarPreviewOverdueCount > 0 ? (
                  <View
                    style={[
                      styles.calendarPreviewStatPill,
                      styles.calendarPreviewStatPillOverdue,
                    ]}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={13}
                      color="#B42318"
                    />
                    <Text
                      style={[
                        styles.calendarPreviewStatText,
                        styles.calendarPreviewStatTextOverdue,
                      ]}
                    >
                      {calendarPreviewOverdueCount} atrasados
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.calendarActionsRow}>
              <Pressable
                style={styles.calendarSecondaryButton}
                onPress={() => {
                  setCalendarPreviewDateKey(toDateKey(today));
                  setCalendarMonthDate(startOfMonth(today));
                }}
              >
                <Ionicons name="locate-outline" size={17} color={primaryIconColor} />
                <Text style={styles.todayButtonText}>Hoy</Text>
              </Pressable>
              <Pressable
                style={styles.calendarSecondaryButton}
                onPress={() => {
                  setIsCalendarVisible(false);
                  openNewEventModal(calendarPreviewDate);
                }}
              >
                <Ionicons name="add" size={18} color={primaryIconColor} />
                <Text style={styles.todayButtonText}>Añadir</Text>
              </Pressable>
              <Pressable
                style={styles.calendarPrimaryButton}
                onPress={() => goToCalendarDate(calendarPreviewDate)}
              >
                <Text style={styles.calendarPrimaryButtonText}>Ver día</Text>
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => closeFiltersPanel()}
        transparent
        visible={isFiltersExpanded}
      >
        <Animated.View
          style={[styles.dayDetailOverlay, { opacity: filtersFadeOpacity }]}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => closeFiltersPanel()}
          />
          <DraggableBottomSheet
            animationKey={isFiltersExpanded}
            onClose={finishCloseFiltersPanel}
            style={styles.filtersBottomSheet}
          >
            <View style={styles.filtersSheetHeader}>
              <View>
                <Text style={styles.sectionLabel}>Buscar</Text>
                <Text style={styles.filtersSheetTitle}>Encuentra tus planes</Text>
                <Text style={styles.filtersSheetSubtitle} numberOfLines={2}>
                  Usa texto, fecha, estado y categoría sin cargar la pantalla principal.
                </Text>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.filtersSheetScrollContent}
              showsVerticalScrollIndicator={false}
              style={styles.filtersSheetScroll}
            >
              <Text style={styles.filtersExpandedSectionLabel}>Texto</Text>
              <View style={styles.filtersExpandedSearch}>
                <Ionicons name="search-outline" size={19} color="#6B7280" />
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setSearchQuery}
                  placeholder="Título, notas, lugar, tarea..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.searchInput}
                  value={searchQuery}
                />
                {searchQuery ? (
                  <Pressable
                    accessibilityLabel="Limpiar búsqueda"
                    style={styles.clearSearchButton}
                    onPress={() => setSearchQuery("")}
                  >
                    <Ionicons name="close" size={17} color="#6B7280" />
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.filtersExpandedSectionLabel}>Fecha</Text>
              <View style={styles.filtersExpandedScopeRow}>
                {SEARCH_SCOPES.map((scope) => {
                  const isSelected = searchScope === scope.value;

                  return (
                    <Pressable
                      key={scope.value}
                      style={[
                        styles.searchScopeButton,
                        isSelected && styles.searchScopeButtonSelected,
                      ]}
                      onPress={() => setSearchScope(scope.value)}
                    >
                      <Text
                        style={[
                          styles.searchScopeText,
                          isSelected && styles.searchScopeTextSelected,
                        ]}
                      >
                        {scope.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filtersExpandedSectionLabel}>Estado</Text>
              <View style={styles.statusFilterRow}>
                {STATUS_FILTERS.map((filter) => {
                  const isSelected = activeStatusFilter === filter.value;

                  return (
                    <Pressable
                      key={filter.value}
                      style={[
                        styles.statusFilterButton,
                        isSelected && styles.statusFilterButtonSelected,
                      ]}
                      onPress={() => setActiveStatusFilter(filter.value)}
                    >
                      <Text
                        style={[
                          styles.statusFilterText,
                          isSelected && styles.statusFilterTextSelected,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filtersExpandedSectionLabel}>Categoría</Text>
              <View style={styles.filtersCategoryGrid}>
                <Pressable
                  style={[
                    styles.filtersCategoryOption,
                    activeCategoryFilter === "all" && styles.filtersCategoryOptionSelected,
                  ]}
                  onPress={() => setActiveCategoryFilter("all")}
                >
                  <Ionicons
                    name="albums-outline"
                    size={17}
                    color={activeCategoryFilter === "all" ? "#FFFFFF" : "#374151"}
                  />
                  <Text
                    style={[
                      styles.filtersCategoryOptionText,
                      activeCategoryFilter === "all" && styles.filtersCategoryOptionTextSelected,
                    ]}
                  >
                    Todas
                  </Text>
                </Pressable>

                {categories.map((category) => {
                  const isSelected = activeCategoryFilter === category.id;

                  return (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.filtersCategoryOption,
                        isSelected && styles.filtersCategoryOptionSelected,
                        isSelected && {
                          backgroundColor: category.color,
                          borderColor: category.color,
                        },
                      ]}
                      onPress={() => setActiveCategoryFilter(category.id)}
                    >
                      <Ionicons
                        name={category.icon}
                        size={17}
                        color={isSelected ? "#FFFFFF" : category.color}
                      />
                      <Text
                        style={[
                          styles.filtersCategoryOptionText,
                          isSelected && styles.filtersCategoryOptionTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {category.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.filtersResultsHeader}>
                <View style={styles.filtersResultsTitleBlock}>
                  <Text style={styles.filtersExpandedSectionLabel}>
                    Resultados
                  </Text>
                  <Text style={styles.filtersResultsSubtitle}>
                    {searchScopeLabel} · {activeViewFilterLabel}
                  </Text>
                </View>
                <Text style={styles.filtersResultsCount}>
                  {listResults.length}
                </Text>
              </View>

              {listResults.length === 0 ? (
                <View style={styles.filtersEmptyResults}>
                  <Ionicons
                    name={hasSearchText ? "search-outline" : "calendar-outline"}
                    size={22}
                    color="#6B7280"
                  />
                  <Text style={styles.filtersEmptyResultsText}>
                    {hasSearchText
                      ? "No hay planes que coincidan con esa búsqueda."
                      : "No hay planes en este alcance con los filtros activos."}
                  </Text>
                </View>
              ) : (
                <View style={styles.filtersResultsList}>
                  {listResults.map(({ event, occurrenceDate }) => (
                    <Pressable
                      key={`${event.id}-${toDateKey(occurrenceDate)}-filters`}
                      style={styles.filtersResultItem}
                      onPress={() => {
                        closeFiltersPanel(() => {
                          openEventDetail(event, occurrenceDate);
                        });
                      }}
                    >
                      <View
                        style={[
                          styles.compactIconDot,
                          {
                            backgroundColor: event.completed
                              ? "#9CA3AF"
                              : event.color,
                          },
                        ]}
                      >
                        <Ionicons
                          name={getCategoryForEvent(event).icon}
                          size={11}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.filtersResultBody}>
                        <Text
                          style={[
                            styles.filtersResultTitle,
                            event.completed && styles.completedText,
                          ]}
                          numberOfLines={1}
                        >
                          {event.title}
                        </Text>
                        <Text style={styles.filtersResultMeta} numberOfLines={1}>
                          {UPCOMING_DATE_FORMATTER.format(occurrenceDate)} ·{" "}
                          {event.startTime}
                          {event.location ? ` · ${event.location}` : ""}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={17} color="#9CA3AF" />
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.filtersSheetActions}>
              <Pressable
                style={styles.filtersSheetSecondaryButton}
                onPress={resetFilters}
              >
                <Text style={styles.filtersSheetSecondaryText}>Limpiar</Text>
              </Pressable>
              <Pressable
                style={styles.filtersSheetPrimaryButton}
                onPress={() => closeFiltersPanel()}
              >
                <Text style={styles.filtersSheetPrimaryText}>Aplicar</Text>
              </Pressable>
            </View>
          </DraggableBottomSheet>
        </Animated.View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={closeCategoryManager}
        transparent
        visible={isCategoryManagerVisible}
      >
        <View style={styles.dayDetailOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeCategoryManager}
          />
          <DraggableBottomSheet
            animationKey={isCategoryManagerVisible}
            onClose={closeCategoryManager}
            style={styles.categoryManagerSheet}
          >
            <View style={styles.categoryManagerHeader}>
              <View style={styles.categoryManagerTitleBlock}>
                <Text style={styles.sectionLabel}>Categorías</Text>
                <Text style={styles.categoryManagerTitle}>
                  Personaliza tus tipos de evento
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={closeCategoryManager}>
                <Ionicons name="close" size={22} color={primaryIconColor} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.categoryManagerContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.categoryManagerList}>
                {categories.map((category) => {
                  const isEditing = editingCategoryId === category.id;
                  const eventCount = visibleEvents.filter(
                    (event) => event.category === category.id,
                  ).length;

                  return (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.categoryManagerItem,
                        isEditing && { borderColor: category.color },
                      ]}
                      onPress={() => openCategoryManager(category.id)}
                    >
                      <View
                        style={[
                          styles.categoryManagerItemIcon,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : category.tone,
                          },
                        ]}
                      >
                        <Ionicons
                          name={category.icon}
                          size={19}
                          color={category.color}
                        />
                      </View>
                      <View style={styles.categoryManagerItemBody}>
                        <Text style={styles.categoryManagerItemTitle}>
                          {category.label}
                        </Text>
                        <Text style={styles.categoryManagerItemMeta}>
                          {eventCount} {eventCount === 1 ? "evento" : "eventos"}
                        </Text>
                      </View>
                      <Ionicons name="create-outline" size={18} color="#6B7280" />
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.categoryEditorCard}>
                <Text style={styles.inputLabel}>
                  {editingCategoryId ? "Editar categoría" : "Nueva categoría"}
                </Text>
                <TextInput
                  onChangeText={(value) => {
                    setCategoryForm((currentForm) => ({
                      ...currentForm,
                      label: value,
                    }));
                    setCategoryFormErrors({});
                  }}
                  placeholder="Ej. Viajes, salud, compras..."
                  placeholderTextColor="#9CA3AF"
                  style={[
                    styles.textInput,
                    categoryFormErrors.label && styles.textInputError,
                  ]}
                  value={categoryForm.label}
                />
                {categoryFormErrors.label ? (
                  <Text style={styles.fieldError}>
                    {categoryFormErrors.label}
                  </Text>
                ) : null}

                <Text style={[styles.inputLabel, styles.categoryEditorLabel]}>
                  Icono
                </Text>
                <View style={styles.categoryIconGrid}>
                  {CATEGORY_ICON_OPTIONS.map((icon) => {
                    const isSelected = categoryForm.icon === icon;

                    return (
                      <Pressable
                        key={icon}
                        style={[
                          styles.categoryIconOption,
                          isSelected && {
                            backgroundColor: categoryForm.color,
                            borderColor: categoryForm.color,
                          },
                        ]}
                        onPress={() =>
                          setCategoryForm((currentForm) => ({
                            ...currentForm,
                            icon,
                          }))
                        }
                      >
                        <Ionicons
                          name={icon}
                          size={18}
                          color={isSelected ? "#FFFFFF" : "#374151"}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.inputLabel, styles.categoryEditorLabel]}>
                  Color
                </Text>
                <ScrollView
                  contentContainerStyle={styles.colorScrollContent}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.colorScroll}
                >
                  {EVENT_COLORS.map((palette) => {
                    const isSelected = categoryForm.color === palette.color;

                    return (
                      <Pressable
                        key={palette.color}
                        style={[
                          styles.colorSwatchOuter,
                          isSelected && styles.colorSwatchOuterSelected,
                        ]}
                        onPress={() =>
                          selectCategoryPalette(palette.color, palette.tone)
                        }
                      >
                        <View
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: palette.color },
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={styles.categoryManagerActions}>
              {editingCategoryId && editingCategoryId !== FALLBACK_CATEGORY_ID ? (
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => {
                    void deleteCategory(editingCategoryId);
                  }}
                >
                  <Ionicons name="trash-outline" size={19} color="#B42318" />
                  <Text style={styles.deleteButtonText}>Borrar</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.categoryManagerSecondaryAction}
                onPress={() => {
                  setEditingCategoryId(null);
                  setCategoryForm(createEmptyCategoryForm());
                  setCategoryFormErrors({});
                }}
              >
                <Text style={styles.categoryManagerSecondaryText}>Nueva</Text>
              </Pressable>
              <Pressable
                style={styles.categoryManagerPrimaryAction}
                onPress={saveCategory}
              >
                <Text style={styles.categoryManagerPrimaryText}>
                  {editingCategoryId ? "Guardar" : "Crear"}
                </Text>
              </Pressable>
            </View>
          </DraggableBottomSheet>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={closeDayDetail}
        transparent
        visible={isDayDetailVisible}
      >
        <View style={styles.dayDetailOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeDayDetail} />
          <DraggableBottomSheet
            animationKey={isDayDetailVisible}
            onClose={closeDayDetail}
            style={styles.dayDetailCard}
          >
            <View style={styles.dayDetailHeader}>
              <View style={styles.dayDetailTitleBlock}>
                <Text style={styles.sectionLabel}>Vista diaria</Text>
                <Text style={styles.dayDetailTitle}>
                  {FULL_DATE_FORMATTER.format(selectedDay.date)}
                </Text>
                <Text style={styles.dayDetailMeta}>
                  {activeViewFilterLabel} · {selectedDay.events.length}{" "}
                  {selectedDay.events.length === 1 ? "evento" : "eventos"}
                </Text>
              </View>
              <View style={styles.dayDetailActions}>
                <Pressable
                  accessibilityLabel="Crear evento en este día"
                  style={styles.smallAddButton}
                  onPress={() => openNewEventModal(selectedDay.date)}
                >
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  accessibilityLabel="Cerrar vista diaria"
                  style={styles.closeButton}
                  onPress={closeDayDetail}
                >
                  <Ionicons name="close" size={22} color={primaryIconColor} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.dayDetailContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedDay.events.length === 0 ? (
                <AgendaEmptyState
                  actionLabel="Añadir evento"
                  icon="calendar-outline"
                  onAction={() => openNewEventModal(selectedDay.date)}
                  text="Puedes guardar una cita, una tarea o un recordatorio para este día."
                  title="Día sin planes"
                />
              ) : (
                <View style={styles.eventList}>
                  {selectedDay.events.map((event) => (
                    <SwipeableEventRow
                      key={event.id}
                      completed={event.completed}
                      onComplete={() => {
                        void toggleEventCompleted(event.id);
                      }}
                      onDelete={() => {
                        requestDeleteEvent(event.id);
                      }}
                    >
                      <View
                        style={[
                          styles.eventCard,
                          { backgroundColor: isDark ? "#1E293B" : event.tone },
                          event.completed && styles.eventCardCompleted,
                        ]}
                      >
                        <View
                          style={[
                            styles.eventAccent,
                            {
                              backgroundColor: event.completed
                                ? "#9CA3AF"
                                : event.color,
                            },
                          ]}
                        />
                        <View style={styles.eventCardMain}>
                          <Pressable
                            style={styles.eventCardPressable}
                            onPress={() =>
                              openEventDetail(
                                event,
                                getOccurrenceStartForDate(
                                  event,
                                  selectedDay.date,
                                ),
                              )
                            }
                          >
                            <View style={styles.eventBody}>
                              <View style={styles.eventTopRow}>
                                <Text style={styles.eventTime}>
                                  {event.startTime}
                                </Text>
                                <View style={styles.categoryPill}>
                                  <Ionicons
                                    name={getCategoryForEvent(event).icon}
                                    size={13}
                                    color={event.color}
                                  />
                                  <Text
                                    style={[
                                      styles.categoryText,
                                      { color: event.color },
                                    ]}
                                  >
                                    {getCategoryForEvent(event).label}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.eventTitleRow}>
                                <View
                                  style={[
                                    styles.eventIconBadge,
                                    { backgroundColor: event.color },
                                  ]}
                                >
                                  <Ionicons
                                    name={getCategoryForEvent(event).icon}
                                    size={17}
                                    color="#FFFFFF"
                                  />
                                </View>
                                <Text
                                  style={[
                                    styles.eventTitle,
                                    event.completed && styles.completedText,
                                  ]}
                                >
                                  {event.title}
                                </Text>
                                <Ionicons
                                  name="create-outline"
                                  size={18}
                                  color="#4B5563"
                                />
                              </View>
                              {event.location ? (
                                <View style={styles.eventLocationRow}>
                                  <Ionicons
                                    name="location-outline"
                                    size={14}
                                    color={event.color}
                                  />
                                  <Text
                                    style={[
                                      styles.eventLocationText,
                                      { color: event.color },
                                    ]}
                                  >
                                    {event.location}
                                  </Text>
                                </View>
                              ) : null}
                              <Text style={styles.eventDescription}>
                                {event.description}
                              </Text>
                              <View style={styles.dayDetailPills}>
                                <ReminderBadge
                                  currentTime={currentTime}
                                  event={event}
                                  occurrenceDate={getOccurrenceStartForDate(
                                    event,
                                    selectedDay.date,
                                  )}
                                  variant="inline"
                                />
                                <EventTaskPill
                                  color={event.color}
                                  tasks={getTasksForEvent(event.id)}
                                  variant="inline"
                                />
                                {event.recurrence !== "none" ? (
                                  <View style={styles.recurrencePill}>
                                    <Ionicons
                                      name="repeat-outline"
                                      size={13}
                                      color={event.color}
                                    />
                                    <Text
                                      style={[
                                        styles.recurrenceText,
                                        { color: event.color },
                                      ]}
                                    >
                                      {getRecurrenceSummaryLabel(event)}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </Pressable>
                        </View>
                      </View>
                    </SwipeableEventRow>
                  ))}
                </View>
              )}
            </ScrollView>
          </DraggableBottomSheet>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={closeEventDetail}
        transparent
        visible={isEventDetailVisible}
      >
        <Animated.View
          style={[styles.modalOverlay, { opacity: eventDetailFadeOpacity }]}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeEventDetail} />
          <DraggableBottomSheet
            animationKey={`${selectedEventId ?? "none"}-${isEventDetailVisible}`}
            onClose={closeEventDetail}
            style={[styles.modalCard, styles.eventDetailCard]}
          >
            {selectedDetailEvent ? (
              <>
                <View style={styles.eventDetailHero}>
                  <View
                    style={[
                      styles.eventDetailIcon,
                      { backgroundColor: selectedDetailEvent.color },
                    ]}
                  >
                    <Ionicons
                      name={selectedDetailCategory.icon}
                      size={28}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.eventDetailHeaderText}>
                    <Text style={styles.sectionLabel}>Detalle del evento</Text>
                    <Text style={styles.eventDetailTitle}>
                      {selectedDetailEvent.title}
                    </Text>
                    <Text style={styles.eventDetailSubtitle}>
                      {FULL_DATE_FORMATTER.format(
                        selectedDetailOccurrenceDate ??
                          parseDateKey(selectedDetailEvent.dateKey),
                      )}
                      {' · '}
                      {selectedDetailEvent.startTime}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Cerrar detalle del evento"
                    style={styles.closeButton}
                    onPress={closeEventDetail}
                  >
                    <Ionicons name="close" size={22} color={primaryIconColor} />
                  </Pressable>
                </View>

                <ScrollView
                  contentContainerStyle={styles.eventDetailContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.eventDetailStatusCard}>
                    <View
                      style={[
                        styles.eventDetailStatusDot,
                        {
                          backgroundColor: selectedDetailEvent.completed
                            ? "#3D8B7D"
                            : selectedDetailReminderInfo?.color ??
                              selectedDetailEvent.color,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          selectedDetailEvent.completed
                            ? "checkmark"
                            : selectedDetailReminderInfo?.icon ?? "time-outline"
                        }
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.eventDetailStatusTextBlock}>
                      <Text style={styles.eventDetailStatusTitle}>
                        {selectedDetailReminderInfo?.label ??
                          (selectedDetailEvent.completed
                            ? "Evento completado"
                            : "Evento pendiente")}
                      </Text>
                      <Text style={styles.eventDetailStatusText}>
                        {selectedDetailEvent.completed
                          ? "Este plan ya aparece como hecho."
                          : "Todavía queda por completar este plan."}
                      </Text>
                      {selectedDetailOccurrenceDate ? (
                        <ReminderBadge
                          currentTime={currentTime}
                          event={selectedDetailEvent}
                          occurrenceDate={selectedDetailOccurrenceDate}
                          variant="detail"
                        />
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.eventDetailInfoGrid}>
                    <View style={styles.eventDetailInfoCard}>
                      <Ionicons name="pricetag-outline" size={18} color={selectedDetailEvent.color} />
                      <Text style={styles.eventDetailInfoLabel}>Categoría</Text>
                      <Text style={styles.eventDetailInfoValue}>
                        {selectedDetailCategory.label}
                      </Text>
                    </View>
                    <View style={styles.eventDetailInfoCard}>
                      <Ionicons name="time-outline" size={18} color={selectedDetailEvent.color} />
                      <Text style={styles.eventDetailInfoLabel}>Hora</Text>
                      <Text style={styles.eventDetailInfoValue}>
                        {selectedDetailEvent.startTime}
                      </Text>
                    </View>
                    <View style={styles.eventDetailInfoCard}>
                      <Ionicons name="notifications-outline" size={18} color={selectedDetailEvent.color} />
                      <Text style={styles.eventDetailInfoLabel}>Recordatorio</Text>
                      <Text style={styles.eventDetailInfoValue}>
                        {selectedDetailEvent.reminder}
                      </Text>
                    </View>
                    <View style={styles.eventDetailInfoCard}>
                      <Ionicons name="repeat-outline" size={18} color={selectedDetailEvent.color} />
                      <Text style={styles.eventDetailInfoLabel}>Repetición</Text>
                      <Text style={styles.eventDetailInfoValue} numberOfLines={2}>
                        {selectedDetailEvent.recurrence === "none"
                          ? "No se repite"
                          : getRecurrenceSummaryLabel(selectedDetailEvent)}
                      </Text>
                    </View>
                  </View>

                  {selectedDetailTasks.length > 0 ? (
                    <View style={styles.eventDetailSection}>
                      <View style={styles.eventDetailSectionHeader}>
                        <Ionicons
                          name="checkbox-outline"
                          size={18}
                          color={selectedDetailEvent.color}
                        />
                        <Text style={styles.eventDetailSectionTitle}>
                          Checklist
                        </Text>
                      </View>
                      <EventTaskPill
                        color={selectedDetailEvent.color}
                        tasks={selectedDetailTasks}
                        variant="detail"
                      />
                      <View style={styles.eventDetailProgressCard}>
                        <View style={styles.eventDetailProgressHeader}>
                          <Text style={styles.eventDetailProgressTitle}>
                            Progreso
                          </Text>
                          <Text style={styles.eventDetailProgressValue}>
                            {selectedDetailTaskStats.completed}/
                            {selectedDetailTaskStats.total}
                          </Text>
                        </View>
                        <View style={styles.eventDetailProgressTrack}>
                          <View
                            style={[
                              styles.eventDetailProgressFill,
                              {
                                backgroundColor: selectedDetailEvent.color,
                                width: `${Math.round(
                                  selectedDetailTaskProgress * 100,
                                )}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.eventDetailProgressText}>
                          {selectedDetailTaskStats.pending === 0
                            ? "Checklist completada."
                            : `${selectedDetailTaskStats.pending} ${
                                selectedDetailTaskStats.pending === 1
                                  ? "tarea pendiente"
                                  : "tareas pendientes"
                              } antes de completar este plan.`}
                        </Text>
                      </View>
                      <View style={styles.detailTaskList}>
                        {selectedDetailTasks.map((task) => (
                          <Pressable
                            key={task.id}
                            style={styles.detailTaskRow}
                            onPress={() => {
                              void toggleEventTaskCompleted(task.id);
                            }}
                          >
                            <View
                              style={[
                                styles.detailTaskCheck,
                                task.completed && styles.detailTaskCheckDone,
                              ]}
                            >
                              <Ionicons
                                name={
                                  task.completed
                                    ? "checkmark"
                                    : "ellipse-outline"
                                }
                                size={16}
                                color={
                                  task.completed ? "#FFFFFF" : selectedDetailEvent.color
                                }
                              />
                            </View>
                            <Text
                              style={[
                                styles.detailTaskText,
                                task.completed && styles.detailTaskTextDone,
                              ]}
                            >
                              {task.title}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {selectedDetailEvent.location ? (
                    <View style={styles.eventDetailSection}>
                      <View style={styles.eventDetailSectionHeader}>
                        <Ionicons name="location-outline" size={18} color={selectedDetailEvent.color} />
                        <Text style={styles.eventDetailSectionTitle}>Ubicación</Text>
                      </View>
                      <Text style={styles.eventDetailSectionText}>
                        {selectedDetailEvent.location}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.eventDetailSection}>
                    <View style={styles.eventDetailSectionHeader}>
                      <Ionicons name="document-text-outline" size={18} color={selectedDetailEvent.color} />
                      <Text style={styles.eventDetailSectionTitle}>Notas</Text>
                    </View>
                    <Text style={styles.eventDetailSectionText}>
                      {selectedDetailEvent.description}
                    </Text>
                  </View>

                </ScrollView>

                <View style={styles.eventDetailActions}>
                  <Pressable
                    style={[
                      styles.eventDetailPrimaryAction,
                      selectedDetailEvent.completed && styles.eventDetailPrimaryActionDone,
                    ]}
                    onPress={() => {
                      void toggleSelectedDetailEventCompleted();
                    }}
                  >
                    <Ionicons
                      name={selectedDetailEvent.completed ? "refresh-outline" : "checkmark"}
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.eventDetailPrimaryActionText}>
                      {selectedDetailEvent.completed ? "Reabrir" : "Completar"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.eventDetailSecondaryAction}
                    onPress={editSelectedDetailEvent}
                  >
                    <Ionicons name="create-outline" size={20} color={primaryIconColor} />
                    <Text style={styles.eventDetailSecondaryActionText}>Editar</Text>
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Duplicar evento"
                    style={[
                      styles.eventDetailIconAction,
                      styles.eventDetailDuplicateAction,
                    ]}
                    onPress={duplicateSelectedDetailEvent}
                  >
                    <Ionicons name="copy-outline" size={20} color="#4D74B8" />
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Borrar evento"
                    style={[
                      styles.eventDetailIconAction,
                      styles.eventDetailDeleteAction,
                    ]}
                    onPress={deleteSelectedDetailEvent}
                  >
                    <Ionicons name="trash-outline" size={20} color="#B42318" />
                  </Pressable>
                </View>
              </>
            ) : null}
          </DraggableBottomSheet>
          {isDeleteConfirmVisible ? (
            <View style={styles.confirmOverlay}>
              <Pressable
                style={styles.timePickerBackdrop}
                onPress={cancelDeleteEvent}
              />
              <Animated.View
                style={[
                  styles.confirmCard,
                  {
                    opacity: deleteConfirmOpacity,
                    transform: [{ scale: deleteConfirmScale }],
                  },
                ]}
              >
                <View style={styles.confirmIcon}>
                  <Ionicons name="trash-outline" size={24} color="#B42318" />
                </View>
                <Text style={styles.confirmTitle}>Borrar evento</Text>
                <Text style={styles.confirmText}>
                  Este evento se eliminará de la agenda local.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={styles.cancelDeleteButton}
                    onPress={cancelDeleteEvent}
                  >
                    <Text style={styles.cancelDeleteButtonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmDeleteButton}
                    onPress={confirmDeleteEvent}
                  >
                    <Text style={styles.confirmDeleteButtonText}>Borrar</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </View>
          ) : null}
        </Animated.View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={closeEventModal}
        transparent
        visible={isEventModalVisible}
      >
        <Animated.View
          style={[styles.modalOverlay, { opacity: eventModalFadeOpacity }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <Pressable style={styles.modalBackdrop} onPress={closeEventModal} />
            <DraggableBottomSheet
              animationKey={`${editingEventId ?? "new"}-${isEventModalVisible}`}
              canClose={requestEventModalClose}
              onClose={finishCloseEventModal}
              style={styles.modalCard}
            >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBlock}>
                <Text style={styles.sectionLabel}>
                  {editingEventId ? "Editar evento" : "Nuevo evento"}
                </Text>
                <Text style={styles.modalTitle}>
                  {editingEventId ? "Ajustar plan" : "Guardar plan"}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar nuevo evento"
                style={styles.closeButton}
                onPress={closeEventModal}
              >
                <Ionicons name="close" size={22} color={primaryIconColor} />
              </Pressable>
            </View>

            <ScrollView
              ref={modalScrollRef}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              onScroll={(event) => {
                modalScrollOffsetRef.current =
                  event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formSummaryCard}>
                <View
                  style={[
                    styles.formSummaryIcon,
                    { backgroundColor: form.color },
                  ]}
                >
                  <Ionicons
                    name={getCategory(form.category).icon}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.formSummaryTextBlock}>
                  <Text style={styles.formSummaryTitle} numberOfLines={1}>
                    {form.title.trim() || "Nuevo plan"}
                  </Text>
                  <Text style={styles.formSummaryMeta} numberOfLines={1}>
                    {form.startTime} · {getCategory(form.category).label}
                    {form.location.trim() ? ` · ${form.location.trim()}` : ""}
                  </Text>
                </View>
              </View>

              {!editingEventId ? (
                <View style={styles.formSectionCard}>
                  <View style={styles.formSectionHeader}>
                    <Ionicons
                      name="albums-outline"
                      size={18}
                      color="#7C6250"
                    />
                    <Text style={styles.formSectionTitle}>Plantillas</Text>
                  </View>

                  <ScrollView
                    contentContainerStyle={styles.templateStripContent}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.templateStrip}
                  >
                    {eventTemplates.map((template) => {
                      const templateCategory = getCategory(template.categoryId);
                      const isSelected = isEventTemplateSelected(template);

                      return (
                        <Pressable
                          key={template.id}
                          style={[
                            styles.templateCard,
                            isSelected && {
                              borderColor: templateCategory.color,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.08)"
                                : templateCategory.tone,
                            },
                          ]}
                          onPress={() => applyEventTemplate(template)}
                        >
                          <View
                            style={[
                              styles.templateIcon,
                              { backgroundColor: templateCategory.color },
                            ]}
                          >
                            <Ionicons
                              name={template.icon}
                              size={19}
                              color="#FFFFFF"
                            />
                          </View>
                          <Text style={styles.templateTitle} numberOfLines={1}>
                            {template.label}
                          </Text>
                          <Text style={styles.templateMeta} numberOfLines={1}>
                            {template.tasks.length} tareas
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              <View style={styles.formSectionCard}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="create-outline" size={18} color="#7C6250" />
                  <Text style={styles.formSectionTitle}>Información básica</Text>
                </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Título</Text>
                <TextInput
                  onChangeText={(value) => updateForm("title", value)}
                  placeholder="Ej. Merienda, médico, cumple..."
                  placeholderTextColor="#9CA3AF"
                  style={[
                    styles.textInput,
                    formErrors.title && styles.textInputError,
                  ]}
                  value={form.title}
                />
                {formErrors.title ? (
                  <Text style={styles.fieldError}>{formErrors.title}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Ubicación</Text>
                <View style={styles.locationInputWrap}>
                  <Ionicons name="location-outline" size={18} color="#6B7280" />
                  <TextInput
                    onChangeText={(value) => updateForm("location", value)}
                    placeholder="Ej. casa, restaurante, consulta..."
                    placeholderTextColor="#9CA3AF"
                    style={styles.locationInput}
                    value={form.location}
                  />
                </View>
              </View>

              </View>

              <View style={styles.formSectionCard}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="calendar-outline" size={18} color="#7C6250" />
                  <Text style={styles.formSectionTitle}>Fecha y hora</Text>
                </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Día</Text>
                <View style={styles.modalDayStrip}>
                  {weekDays.map((day) => {
                    const isSelected = form.dateKey === day.dateKey;

                    return (
                      <Pressable
                        key={day.dateKey}
                        style={[
                          styles.modalDayButton,
                          isSelected && styles.modalDayButtonSelected,
                        ]}
                        onPress={() => updateForm("dateKey", day.dateKey)}
                      >
                        <Text
                          style={[
                            styles.modalDayLabel,
                            isSelected && styles.modalDayTextSelected,
                          ]}
                        >
                          {day.label}
                        </Text>
                        <Text
                          style={[
                            styles.modalDayNumber,
                            isSelected && styles.modalDayTextSelected,
                          ]}
                        >
                          {day.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Hora</Text>
                <Pressable
                  style={styles.timeSelectButton}
                  onPress={() => openTimePicker()}
                >
                  <Ionicons name="time-outline" size={18} color="#6B7280" />
                  <Text style={styles.timeSelectText}>{form.startTime}</Text>
                </Pressable>
              </View>

              </View>

              <View style={styles.formSectionCard}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="sparkles-outline" size={18} color="#7C6250" />
                  <Text style={styles.formSectionTitle}>Tipo de evento</Text>
                </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Categoría</Text>
                <View style={styles.categoryGrid}>
                  {categories.map((category) => {
                    const isSelected = form.category === category.id;

                    return (
                      <Pressable
                        key={category.id}
                        style={[
                          styles.categoryOption,
                          isSelected && styles.categoryOptionSelected,
                          isSelected && { borderColor: category.color },
                        ]}
                        onPress={() => selectCategory(category)}
                      >
                        <View
                          style={[
                            styles.categoryOptionIcon,
                            { backgroundColor: category.color },
                          ]}
                        >
                          <Ionicons
                            name={category.icon}
                            size={18}
                            color="#FFFFFF"
                          />
                        </View>
                        <Text style={styles.categoryOptionText}>
                          {category.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Recordatorio</Text>
                <View style={styles.optionWrap}>
                  {REMINDER_OPTIONS.map((option) => {
                    const isSelected = form.reminder === option;

                    return (
                      <Pressable
                        key={option}
                        style={[
                          styles.optionPill,
                          isSelected && styles.optionPillSelected,
                        ]}
                        onPress={() => updateForm("reminder", option)}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            isSelected && styles.optionPillTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Repetir</Text>
                <View style={styles.optionWrap}>
                  {RECURRENCE_OPTIONS.map((option) => {
                    const isSelected = form.recurrence === option.value;

                    return (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.optionPill,
                          isSelected && styles.optionPillSelected,
                        ]}
                        onPress={() => selectRecurrence(option.value)}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            isSelected && styles.optionPillTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {form.recurrence !== "none" ? (
                  <View style={styles.recurrenceAdvancedBox}>
                    <View style={styles.recurrenceAdvancedHeader}>
                      <View>
                        <Text style={styles.recurrenceAdvancedTitle}>
                          {getRecurrenceSummaryLabel({
                            dateKey: form.dateKey,
                            recurrence: form.recurrence,
                            recurrenceEndDate: form.recurrenceEndDate,
                            recurrenceInterval: form.recurrenceInterval,
                            recurrenceWeekdays: form.recurrenceWeekdays,
                          })}
                        </Text>
                        <Text style={styles.recurrenceAdvancedHint}>
                          Ajusta cada cuánto se repite y cuándo termina.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recurrenceControlRow}>
                      <Text style={styles.recurrenceControlLabel}>
                        Intervalo
                      </Text>
                      <View style={styles.recurrenceStepper}>
                        <Pressable
                          accessibilityLabel="Reducir intervalo"
                          style={styles.recurrenceStepperButton}
                          onPress={() => changeRecurrenceInterval(-1)}
                        >
                          <Ionicons name="remove" size={18} color={primaryIconColor} />
                        </Pressable>
                        <Text style={styles.recurrenceStepperValue}>
                          {form.recurrenceInterval}
                        </Text>
                        <Pressable
                          accessibilityLabel="Aumentar intervalo"
                          style={styles.recurrenceStepperButton}
                          onPress={() => changeRecurrenceInterval(1)}
                        >
                          <Ionicons name="add" size={18} color={primaryIconColor} />
                        </Pressable>
                      </View>
                    </View>

                    {form.recurrence === "weekly" ? (
                      <View style={styles.recurrenceWeekdaysRow}>
                        {RECURRENCE_WEEK_DAYS.map((weekday) => {
                          const isSelected = form.recurrenceWeekdays.includes(
                            weekday.value,
                          );

                          return (
                            <Pressable
                              key={weekday.value}
                              style={[
                                styles.recurrenceWeekdayButton,
                                isSelected &&
                                  styles.recurrenceWeekdayButtonSelected,
                              ]}
                              onPress={() =>
                                toggleRecurrenceWeekday(weekday.value)
                              }
                            >
                              <Text
                                style={[
                                  styles.recurrenceWeekdayText,
                                  isSelected &&
                                    styles.recurrenceWeekdayTextSelected,
                                ]}
                              >
                                {weekday.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}

                    <Text style={styles.recurrenceControlLabel}>Termina</Text>
                    <View style={styles.optionWrap}>
                      {RECURRENCE_END_OPTIONS.map((option) => {
                        const optionDateKey =
                          option.months === null
                            ? undefined
                            : toDateKey(
                                addMonths(
                                  parseDateKey(form.dateKey),
                                  option.months,
                                ),
                              );
                        const isSelected =
                          form.recurrenceEndDate === optionDateKey;

                        return (
                          <Pressable
                            key={option.label}
                            style={[
                              styles.optionPill,
                              isSelected && styles.optionPillSelected,
                            ]}
                            onPress={() => setRecurrenceEnd(option.months)}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                isSelected && styles.optionPillTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Color</Text>
                <ScrollView
                  contentContainerStyle={styles.colorScrollContent}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.colorScroll}
                >
                  {EVENT_COLORS.map((palette) => {
                    const isSelected = form.color === palette.color;

                    return (
                      <Pressable
                        accessibilityLabel={`Elegir color ${palette.color}`}
                        key={palette.color}
                        style={[
                          styles.colorSwatchOuter,
                          isSelected && styles.colorSwatchOuterSelected,
                        ]}
                        onPress={() => selectColor(palette.color, palette.tone)}
                      >
                        <View
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: palette.color },
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              </View>

              <View style={styles.formSectionCard}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="document-text-outline" size={18} color="#7C6250" />
                  <Text style={styles.formSectionTitle}>Notas</Text>
                </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Notas</Text>
                <TextInput
                  multiline
                  onChangeText={(value) => updateForm("description", value)}
                  onFocus={nudgeModalScrollForNotes}
                  placeholder="Detalles, sitio, cosas que llevar..."
                  placeholderTextColor="#9CA3AF"
                  style={[styles.textInput, styles.notesInput]}
                  textAlignVertical="top"
                  value={form.description}
                />
              </View>

              </View>

              <View style={styles.formSectionCard}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="checkbox-outline" size={18} color="#7C6250" />
                  <Text style={styles.formSectionTitle}>Checklist</Text>
                </View>

                <View style={styles.taskComposer}>
                  <TextInput
                    multiline
                    onChangeText={setTaskDraft}
                    onSubmitEditing={addFormTask}
                    placeholder="Añadir tarea dentro del evento"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                    scrollEnabled={false}
                    style={styles.taskComposerInput}
                    textAlignVertical="top"
                    value={taskDraft}
                  />
                  <Pressable
                    accessibilityLabel="Añadir tarea"
                    disabled={!taskDraft.trim()}
                    style={[
                      styles.taskComposerButton,
                      !taskDraft.trim() && styles.taskComposerButtonDisabled,
                    ]}
                    onPress={addFormTask}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>

                {formTasks.length === 0 ? (
                  <View style={styles.taskEmptyBox}>
                    <Ionicons
                      name="list-outline"
                      size={18}
                      color="#6B7280"
                    />
                    <Text style={styles.taskEmptyText}>
                      Puedes guardar pasos pequeños para este plan.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.taskListEditor}>
                    {formTasks.map((task) => (
                      <View key={task.id} style={styles.taskEditorRow}>
                        <Pressable
                          accessibilityLabel={
                            task.completed
                              ? "Marcar tarea como pendiente"
                              : "Marcar tarea como hecha"
                          }
                          style={[
                            styles.taskEditorCheck,
                            task.completed && styles.taskEditorCheckDone,
                          ]}
                          onPress={() => toggleFormTask(task.id)}
                        >
                          <Ionicons
                            name={
                              task.completed ? "checkmark" : "ellipse-outline"
                            }
                            size={17}
                            color={task.completed ? "#FFFFFF" : "#3D8B7D"}
                          />
                        </Pressable>
                        <TextInput
                          multiline
                          onChangeText={(value) =>
                            updateFormTaskTitle(task.id, value)
                          }
                          placeholder="Nombre de la tarea"
                          placeholderTextColor="#9CA3AF"
                          scrollEnabled={false}
                          style={[
                            styles.taskEditorInput,
                            task.completed && styles.taskEditorInputDone,
                          ]}
                          textAlignVertical="top"
                          value={task.title}
                        />
                        <Pressable
                          accessibilityLabel="Borrar tarea"
                          hitSlop={8}
                          style={styles.taskEditorDelete}
                          onPress={() => deleteFormTask(task.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#B42318"
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {editingEventId ? (
                <Pressable
                  style={[
                    styles.completedToggle,
                    form.completed && styles.completedToggleActive,
                  ]}
                  onPress={() =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      completed: !currentForm.completed,
                    }))
                  }
                >
                  <View
                    style={[
                      styles.completedToggleIcon,
                      form.completed && styles.completedToggleIconActive,
                    ]}
                  >
                    <Ionicons
                      name={form.completed ? "checkmark" : "ellipse-outline"}
                      size={18}
                      color={form.completed ? "#FFFFFF" : "#3D8B7D"}
                    />
                  </View>
                  <View style={styles.completedToggleTextBlock}>
                    <Text style={styles.completedToggleTitle}>
                      {form.completed
                        ? "Evento completado"
                        : "Marcar como completado"}
                    </Text>
                    <Text style={styles.completedToggleText}>
                      {form.completed
                        ? "Se verá más suave, pero seguirá en la agenda."
                        : "Úsalo cuando este plan ya esté hecho."}
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              <View style={styles.modalInlineActions}>
                {editingEventId ? (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={deleteEditingEvent}
                  >
                    <Ionicons name="trash-outline" size={20} color="#B42318" />
                    <Text style={styles.deleteButtonText}>Borrar</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.cancelButton}
                    onPress={closeEventModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.saveButton, styles.actionSaveButton]}
                  onPress={saveEvent}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {editingEventId ? "Guardar cambios" : "Guardar evento"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
            </DraggableBottomSheet>

            {activeTimeField ? (
            <View style={styles.timePickerOverlay}>
              <Pressable
                style={styles.timePickerBackdrop}
                onPress={closeTimePicker}
              />
              <View style={styles.timePickerCard}>
                <View style={styles.timePickerHeader}>
                  <View>
                    <Text style={styles.sectionLabel}>Hora del evento</Text>
                    <Text style={styles.timePickerTitle}>
                      {timePickerHour}:{timePickerMinute}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Cerrar selector de hora"
                    style={styles.closeButton}
                    onPress={closeTimePicker}
                  >
                    <Ionicons name="close" size={22} color={primaryIconColor} />
                  </Pressable>
                </View>

                <View style={styles.timePickerColumns}>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.inputLabel}>Hora</Text>
                    <ScrollView
                      style={styles.timePickerScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {HOURS.map((hour) => {
                        const isSelected = timePickerHour === hour;

                        return (
                          <Pressable
                            key={hour}
                            style={[
                              styles.timePickerOption,
                              isSelected && styles.timePickerOptionSelected,
                            ]}
                            onPress={() => setTimePickerHour(hour)}
                          >
                            <Text
                              style={[
                                styles.timePickerOptionText,
                                isSelected &&
                                  styles.timePickerOptionTextSelected,
                              ]}
                            >
                              {hour}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.timePickerColumn}>
                    <Text style={styles.inputLabel}>Minutos</Text>
                    <ScrollView
                      style={styles.timePickerScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {MINUTES.map((minute) => {
                        const isSelected = timePickerMinute === minute;

                        return (
                          <Pressable
                            key={minute}
                            style={[
                              styles.timePickerOption,
                              isSelected && styles.timePickerOptionSelected,
                            ]}
                            onPress={() => setTimePickerMinute(minute)}
                          >
                            <Text
                              style={[
                                styles.timePickerOptionText,
                                isSelected &&
                                  styles.timePickerOptionTextSelected,
                              ]}
                            >
                              {minute}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                <Pressable
                  style={styles.saveButton}
                  onPress={confirmTimePicker}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Usar esta hora</Text>
                </Pressable>
              </View>
            </View>
            ) : null}

            {isDiscardConfirmVisible ? (
              <View style={styles.confirmOverlay}>
                <Pressable
                  style={styles.timePickerBackdrop}
                  onPress={cancelDiscardEventChanges}
                />
                <Animated.View
                  style={[
                    styles.confirmCard,
                    {
                      opacity: discardConfirmOpacity,
                      transform: [{ scale: discardConfirmScale }],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.confirmIcon,
                      styles.discardConfirmIcon,
                    ]}
                  >
                    <Ionicons
                      name="create-outline"
                      size={24}
                      color="#D28A2E"
                    />
                  </View>
                  <Text style={styles.confirmTitle}>Descartar cambios</Text>
                  <Text style={styles.confirmText}>
                    Hay cambios sin guardar en este evento. Puedes seguir
                    editando o salir sin guardarlos.
                  </Text>
                  <View style={styles.confirmActions}>
                    <Pressable
                      style={styles.cancelDeleteButton}
                      onPress={cancelDiscardEventChanges}
                    >
                      <Text style={styles.cancelDeleteButtonText}>
                        Seguir editando
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.confirmDeleteButton,
                        styles.discardConfirmButton,
                      ]}
                      onPress={confirmDiscardEventChanges}
                    >
                      <Text style={styles.confirmDeleteButtonText}>
                        Descartar
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </View>
            ) : null}

          {isDeleteConfirmVisible ? (
            <View style={styles.confirmOverlay}>
              <Pressable
                style={styles.timePickerBackdrop}
                onPress={cancelDeleteEvent}
              />
              <Animated.View
                style={[
                  styles.confirmCard,
                  {
                    opacity: deleteConfirmOpacity,
                    transform: [{ scale: deleteConfirmScale }],
                  },
                ]}
              >
                <View style={styles.confirmIcon}>
                  <Ionicons name="trash-outline" size={24} color="#B42318" />
                </View>
                <Text style={styles.confirmTitle}>Borrar evento</Text>
                <Text style={styles.confirmText}>
                  Este evento se eliminará de la agenda local.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={styles.cancelDeleteButton}
                    onPress={cancelDeleteEvent}
                  >
                    <Text style={styles.cancelDeleteButtonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmDeleteButton}
                    onPress={confirmDeleteEvent}
                  >
                    <Text style={styles.confirmDeleteButtonText}>Borrar</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </View>
            ) : null}

          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>


      {isDeleteConfirmVisible && !isEventModalVisible && !isEventDetailVisible ? (
        <View style={styles.confirmOverlay}>
          <Pressable
            style={styles.timePickerBackdrop}
            onPress={cancelDeleteEvent}
          />
          <Animated.View
            style={[
              styles.confirmCard,
              {
                opacity: deleteConfirmOpacity,
                transform: [{ scale: deleteConfirmScale }],
              },
            ]}
          >
            <View style={styles.confirmIcon}>
              <Ionicons name="trash-outline" size={24} color="#B42318" />
            </View>
            <Text style={styles.confirmTitle}>Borrar evento</Text>
            <Text style={styles.confirmText}>
              Este evento se eliminará de la agenda local.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.cancelDeleteButton}
                onPress={cancelDeleteEvent}
              >
                <Text style={styles.cancelDeleteButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.confirmDeleteButton}
                onPress={confirmDeleteEvent}
              >
                <Text style={styles.confirmDeleteButtonText}>Borrar</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      ) : null}

      {isSignOutConfirmVisible ? (
        <View style={styles.confirmOverlay}>
          <Pressable
            style={styles.timePickerBackdrop}
            onPress={() => setIsSignOutConfirmVisible(false)}
          />
          <Animated.View
            style={[
              styles.confirmCard,
              {
                opacity: signOutConfirmOpacity,
                transform: [{ scale: signOutConfirmScale }],
              },
            ]}
          >
            <View style={styles.confirmIcon}>
              <Ionicons name="log-out-outline" size={24} color="#4D74B8" />
            </View>
            <Text style={styles.confirmTitle}>Cerrar sesión</Text>
            <Text style={styles.confirmText}>
              ¿Estás seguro de que quieres cerrar sesión?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.cancelDeleteButton}
                onPress={() => setIsSignOutConfirmVisible(false)}
              >
                <Text style={styles.cancelDeleteButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.confirmDeleteButton} onPress={signOut}>
                <Text style={styles.confirmDeleteButtonText}>Cerrar sesión</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      ) : null}
      </SafeAreaView>
    </AgendaStylesContext.Provider>
  );
}

const styles = StyleSheet.create({
  eventDetailCard: {
    backgroundColor: "#FFFDF9",
    maxHeight: "88%",
    paddingBottom: Platform.OS === "ios" ? 22 : 14,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  eventDetailHero: {
    alignItems: "flex-start",
    borderBottomColor: "#EFE4D8",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 22,
    paddingBottom: 18,
    paddingTop: 20,
  },
  eventDetailIcon: {
    alignItems: "center",
    borderRadius: 20,
    height: 58,
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    width: 58,
  },
  eventDetailHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  eventDetailTitle: {
    color: "#172033",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 30,
    marginTop: 4,
  },
  eventDetailSubtitle: {
    color: "#7C6B5C",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 7,
    textTransform: "capitalize",
  },
  eventDetailContent: {
    gap: 14,
    paddingHorizontal: 22,
    paddingBottom: 34,
    paddingTop: 18,
  },
  eventDetailStatusCard: {
    alignItems: "center",
    backgroundColor: "#F8F1E8",
    borderColor: "#EFE4D8",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  eventDetailStatusDot: {
    alignItems: "center",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  eventDetailStatusTextBlock: {
    flex: 1,
  },
  eventDetailStatusTitle: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "900",
  },
  eventDetailStatusText: {
    color: "#7C6B5C",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  eventDetailInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  eventDetailInfoCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE4D8",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 5,
    minHeight: 96,
    padding: 14,
  },
  eventDetailInfoLabel: {
    color: "#8A7565",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  eventDetailInfoValue: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "800",
  },
  eventDetailSection: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE4D8",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  eventDetailSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  eventDetailSectionTitle: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "900",
  },
  eventDetailSectionText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
  },
  detailTaskList: {
    gap: 8,
    marginTop: 12,
  },
  eventDetailProgressCard: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  eventDetailProgressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  eventDetailProgressTitle: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "900",
  },
  eventDetailProgressValue: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "900",
  },
  eventDetailProgressTrack: {
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    height: 8,
    marginTop: 9,
    overflow: "hidden",
  },
  eventDetailProgressFill: {
    borderRadius: 999,
    height: "100%",
  },
  eventDetailProgressText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 8,
  },
  detailTaskRow: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  detailTaskCheck: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D1E7DF",
    borderRadius: 10,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  detailTaskCheckDone: {
    backgroundColor: "#3D8B7D",
    borderColor: "#3D8B7D",
  },
  detailTaskText: {
    color: "#172033",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  detailTaskTextDone: {
    color: "#6B7280",
    textDecorationLine: "line-through",
  },
  eventDetailActions: {
    alignItems: "center",
    backgroundColor: "#FFFDF9",
    borderTopColor: "#EFE4D8",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === "ios" ? 26 : 20,
    paddingTop: 14,
  },
  eventDetailPrimaryAction: {
    alignItems: "center",
    backgroundColor: "#3D8B7D",
    borderRadius: 18,
    flex: 1.2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  eventDetailPrimaryActionDone: {
    backgroundColor: "#6B7280",
  },
  eventDetailPrimaryActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  eventDetailSecondaryAction: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE4D8",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  eventDetailSecondaryActionText: {
    color: "#1F2A37",
    fontSize: 14,
    fontWeight: "900",
  },
  eventDetailIconAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  eventDetailDuplicateAction: {
    backgroundColor: "#EAF0FB",
    borderColor: "#D8E3F7",
  },
  eventDetailDeleteAction: {
    backgroundColor: "#FFF4F2",
    borderColor: "#FFD9D4",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F1EA",
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 84,
    paddingTop: 18,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 2,
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
  },
  syncStatusBadge: {
    alignItems: "center",
    backgroundColor: "#EAF0FB",
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  syncStatusBadgeOnline: {
    backgroundColor: "#E7F4F1",
  },
  syncStatusBadgeOffline: {
    backgroundColor: "#FFF1DF",
  },
  syncStatusBadgeText: {
    color: "#4D74B8",
    fontSize: 12,
    fontWeight: "600",
  },
  syncStatusBadgeTextOnline: {
    color: "#3D8B7D",
  },
  syncStatusBadgeTextOffline: {
    color: "#D28A2E",
  },
  kicker: {
    color: "#8A7565",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  title: {
    color: "#172033",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.6,
    lineHeight: 37,
    textTransform: "capitalize",
  },
  iconHeaderButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E9DED1",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    width: 42,
  },
  todayHeaderButton: {
    alignItems: "center",
    backgroundColor: "#FFF7F4",
    borderColor: "#F7D1C8",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    width: 42,
  },
  syncIconButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E9DED1",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    width: 42,
  },
  syncTooltipOverlay: {
    left: -80,
    minWidth: 140,
    position: "absolute",
    top: 50,
    zIndex: 100,
  },
  syncTooltip: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  syncTooltipDot: {
    borderRadius: 4,
    height: 10,
    width: 10,
  },
  syncTooltipText: {
    color: "#1F2A37",
    fontSize: 14,
    fontWeight: "600",
  },
  todayButtonText: {
    color: "#1F2A37",
    fontSize: 13,
    fontWeight: "700",
  },
  weekControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  arrowButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7DED1",
    borderRadius: 15,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    width: 46,
  },
  todayButton: {
    alignItems: "center",
    backgroundColor: "#E05D5D",
    borderRadius: 20,
    height: 32,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  weekSummary: {
    backgroundColor: "#172033",
    borderRadius: 18,
    flex: 1,
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 4,
  },
  weekSummaryTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  weekSummaryTitleInline: {
    color: "#F8EFE2",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    minWidth: 0,
  },
  weekSummaryTapHint: {
    color: "#C5D4D6",
    fontSize: 11,
    fontWeight: "700",
  },
  weekSummaryCalendarBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  weekSummaryLabel: {
    color: "#F8EFE2",
    fontSize: 13,
    fontWeight: "700",
  },
  weekSummaryValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 1,
  },
  weekSummaryProgress: {
    color: "#F8EFE2",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  weekSummaryHint: {
    color: "#D7E3E4",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
    opacity: 0.8,
  },
  weekSummarySync: {
    color: "#D7E3E4",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  todayHero: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.055,
    shadowRadius: 18,
    elevation: 2,
  },
  todayHeroHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  todayHeroTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  todayHeroTitle: {
    color: "#1F2A37",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    marginTop: 3,
    textTransform: "capitalize",
  },
  todayHeroSummary: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  todayHeroBadges: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 6,
  },
  todayOverdueBadge: {
    alignItems: "center",
    backgroundColor: "#FFF1F0",
    borderColor: "#FECACA",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 9,
  },
  todayOverdueText: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "900",
  },
  todayProgressBadge: {
    alignItems: "center",
    backgroundColor: "#E7F4F1",
    borderColor: "#CFE8E1",
    borderRadius: 18,
    borderWidth: 1,
    flexShrink: 0,
    minWidth: 66,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  todayProgressValue: {
    color: "#1F2A37",
    fontSize: 18,
    fontWeight: "900",
  },
  todayProgressLabel: {
    color: "#3D8B7D",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 1,
    textTransform: "uppercase",
  },
  todayNextCard: {
    alignItems: "center",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    minHeight: 78,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  todayNextIcon: {
    alignItems: "center",
    borderRadius: 16,
    flexShrink: 0,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  todayNextBody: {
    flex: 1,
    minWidth: 0,
  },
  todayNextKicker: {
    color: "#8A6F5A",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  todayNextTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
  todayNextMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  todayTimingBadge: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    gap: 4,
    justifyContent: "center",
    maxWidth: 122,
    minHeight: 40,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  todayTimingBadgeWarning: {
    backgroundColor: "#FFF1DF",
    borderColor: "#F4C47F",
  },
  todayTimingText: {
    color: "#1F2A37",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    textAlign: "center",
  },
  todayTimingTextWarning: {
    color: "#9A5B12",
  },
  todayStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  todayStatCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  todayStatValue: {
    color: "#1F2A37",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  todayStatLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
  },
  todayProgressTrack: {
    backgroundColor: "#EEE8DF",
    borderRadius: 8,
    height: 8,
    marginTop: 12,
    overflow: "hidden",
  },
  todayProgressFill: {
    backgroundColor: "#3D8B7D",
    borderRadius: 8,
    height: "100%",
  },
  homeActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  homeActionButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 10,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  homeActionButtonPrimary: {
    backgroundColor: "#172033",
    borderColor: "#172033",
  },
  homeActionIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 13,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  homeActionTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  homeActionButtonText: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "900",
  },
  homeActionButtonTextPrimary: {
    color: "#FFFFFF",
  },
  homeActionButtonMeta: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  homeActionButtonMetaPrimary: {
    color: "#D7E3E4",
  },
  activityPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
  },
  activityHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  activityHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.2,
    marginTop: 3,
  },
  activitySubtitle: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  activityMonthBadge: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  activityMonthValue: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "900",
  },
  activityMonthLabel: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 1,
    textTransform: "uppercase",
  },
  activityStatsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  activityStatCard: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 90,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  activityStatValue: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  activityStatLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
  },
  activityBarsRow: {
    alignItems: "flex-end",
    backgroundColor: "#F9F7F3",
    borderColor: "#EFE7DC",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "space-between",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  activityBarItem: {
    alignItems: "center",
    flex: 1,
  },
  activityBarTrack: {
    alignItems: "center",
    backgroundColor: "#EEE8DF",
    borderRadius: 999,
    height: 58,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: 12,
  },
  activityBarFill: {
    borderRadius: 999,
    width: "100%",
  },
  activityBarLabel: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 6,
  },
  activityBarCount: {
    color: "#172033",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 1,
  },
  activityInsightBox: {
    alignItems: "flex-start",
    backgroundColor: "#FFF9ED",
    borderColor: "#F4DFB8",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activityInsightText: {
    color: "#624514",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  activityActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  activitySearchButton: {
    alignItems: "center",
    backgroundColor: "#1F2A37",
    borderRadius: 16,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 13,
  },
  activitySearchButtonText: {
    color: "#FFFFFF",
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  activityClearButton: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderColor: "#E8DFD3",
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  categoryStatsPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 16,
    elevation: 2,
  },
  categoryStatsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  categoryStatsTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  categoryManageButton: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 11,
  },
  categoryManageText: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "900",
  },
  categoryStatsStrip: {
    gap: 10,
    paddingTop: 12,
  },
  categoryStatsCard: {
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 108,
    padding: 12,
    width: 118,
  },
  categoryStatsIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  categoryStatsLabel: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
  },
  categoryStatsLabelSelected: {
    color: "#FFFFFF",
  },
  categoryStatsCount: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  categoryStatsCountSelected: {
    color: "#FFFFFF",
    opacity: 0.9,
  },
  filtersTrigger: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE1D5",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  filtersTriggerIconWrap: {
    alignItems: "center",
    backgroundColor: "#F6F1EA",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  filtersTriggerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  filtersTriggerTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  filtersTriggerTitle: {
    color: "#1F2A37",
    fontSize: 16,
    fontWeight: "800",
  },

  quickSearchCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  quickSearchInput: {
    color: "#111827",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    minHeight: 48,
  },
  filtersTriggerSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  filtersTriggerExpanded: {
    backgroundColor: "#FAFAF8",
    borderColor: "#D4C4B6",
  },
  filtersActiveDot: {
    backgroundColor: "#3D8B7D",
    borderRadius: 5,
    height: 8,
    width: 8,
  },
  filtersResetButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filtersResetButtonText: {
    color: "#4D74B8",
    fontSize: 14,
    fontWeight: "800",
  },
  filtersExpandedPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  filtersExpandedToolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  filtersExpandedToolbarTitle: {
    color: "#1F2A37",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    minWidth: 0,
  },
  filtersExpandedSectionLabel: {
    color: "#7C6250",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginBottom: 6,
    marginTop: 14,
    textTransform: "uppercase",
  },
  filtersExpandedSectionFirst: {
    marginTop: 0,
  },
  filtersExpandedSectionHint: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginBottom: 10,
  },
  filtersExpandedScopeRow: {
    flexDirection: "row",
    gap: 8,
  },
  filtersExpandedSearch: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  filtersExpandedCategoryBlock: {
    backgroundColor: "#F9F7F3",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    paddingBottom: 12,
    paddingTop: 10,
  },
  categoryFilterPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 12,
  },
  categoryFilterHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
  },
  categoryFilterHeaderSpaced: {
    marginTop: 14,
  },
  categoryFilterValue: {
    color: "#4B5563",
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  statusFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 14,
  },
  statusFilterButton: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  statusFilterButtonSelected: {
    backgroundColor: "#3D8B7D",
    borderColor: "#3D8B7D",
  },
  statusFilterText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "800",
  },
  statusFilterTextSelected: {
    color: "#FFFFFF",
  },
  filterStrip: {
    marginTop: 10,
  },
  filterStripContent: {
    gap: 8,
    paddingHorizontal: 14,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  filterChipSelected: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  filterChipText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "800",
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
  },
  searchPanel: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  searchInput: {
    color: "#111827",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    minHeight: 46,
  },
  clearSearchButton: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  searchScopeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  searchScopeButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: "center",
  },
  searchScopeButtonSelected: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  searchScopeText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "800",
  },
  searchScopeTextSelected: {
    color: "#FFFFFF",
  },
  upcomingPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 16,
    elevation: 2,
  },
  upcomingSubtitle: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 3,
  },
  upcomingHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  upcomingSeeAllButton: {
    alignItems: "center",
    backgroundColor: "#EAF0FB",
    borderColor: "#D8E3F7",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  upcomingSeeAllText: {
    color: "#4D74B8",
    fontSize: 12,
    fontWeight: "900",
  },
  todaySmallButton: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    gap: 5,
    minHeight: 36,
    paddingLeft: 10,
    paddingRight: 14,
  },
  todaySmallButtonText: {
    color: "#1F2A37",
    fontSize: 13,
    fontWeight: "800",
  },
  upcomingList: {
    gap: 8,
    marginTop: 12,
  },
  upcomingMoreButton: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderColor: "#E8DFD3",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  upcomingMoreText: {
    color: "#4D74B8",
    fontSize: 13,
    fontWeight: "900",
  },
  swipeRow: {
    borderRadius: 8,
    overflow: "hidden",
  },
  swipeActionPane: {
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
    width: 112,
  },
  swipeActionPaneLeft: {
    justifyContent: "flex-start",
  },
  swipeActionPaneRight: {
    justifyContent: "flex-end",
  },
  swipeActionButton: {
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    width: 112,
  },
  swipeCompleteButton: {
    backgroundColor: "#3D8B7D",
  },
  swipeDeleteButton: {
    backgroundColor: "#B42318",
  },
  swipeActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  completionAnimatedWrap: {
    position: "relative",
  },
  completionCheckBadge: {
    alignItems: "center",
    backgroundColor: "#3D8B7D",
    borderColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    top: 10,
    width: 34,
    zIndex: 5,
    elevation: 8,
  },
  upcomingItem: {
    alignItems: "center",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 12,
  },
  upcomingItemCompleted: {
    opacity: 0.64,
  },
  upcomingItemReminderSoon: {
    backgroundColor: "#FFF9ED",
    borderColor: "#D28A2E",
  },
  upcomingItemReminderCritical: {
    backgroundColor: "#FFF1F0",
    borderColor: "#B42318",
    borderWidth: 2,
  },
  upcomingItemMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    minWidth: 0,
    paddingVertical: 4,
  },
  upcomingItemBody: {
    flex: 1,
    minWidth: 0,
  },
  upcomingItemTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  upcomingItemMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
    textTransform: "capitalize",
  },
  visualReminderBadge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    gap: 4,
    maxWidth: 124,
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  visualReminderBadgeInline: {
    maxWidth: 150,
    minHeight: 27,
  },
  visualReminderBadgeDetail: {
    alignSelf: "flex-start",
    borderRadius: 14,
    gap: 6,
    marginTop: 10,
    maxWidth: "100%",
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  visualReminderText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "900",
  },
  visualReminderTextDetail: {
    fontSize: 13,
    lineHeight: 17,
  },
  eventTaskPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: 999,
    flexDirection: "row",
    flexShrink: 0,
    gap: 4,
    maxWidth: 124,
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  eventTaskPillInline: {
    maxWidth: 150,
    minHeight: 27,
  },
  eventTaskPillDetail: {
    alignSelf: "flex-start",
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginTop: 10,
    maxWidth: "100%",
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  eventTaskPillText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "900",
  },
  eventTaskPillTextDetail: {
    fontSize: 13,
    lineHeight: 17,
  },
  agendaEmptyState: {
    alignItems: "center",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  agendaEmptyStateCompact: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  agendaEmptyIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE7DC",
    borderRadius: 18,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    width: 48,
  },
  agendaEmptyTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  agendaEmptyText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 5,
    textAlign: "center",
  },
  agendaEmptyAction: {
    alignItems: "center",
    backgroundColor: "#172033",
    borderRadius: 15,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 13,
    minHeight: 40,
    paddingHorizontal: 13,
  },
  agendaEmptyActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  completedText: {
    color: "#6B7280",
    textDecorationLine: "line-through",
  },
  dayStrip: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  dayButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 78,
    paddingVertical: 10,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  dayButtonSelected: {
    backgroundColor: "#172033",
    borderColor: "#172033",
    shadowOpacity: 0.12,
    elevation: 3,
  },
  dayLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
  },
  dayNumber: {
    color: "#1F2A37",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  dayTextSelected: {
    color: "#FFFFFF",
  },
  eventDot: {
    backgroundColor: "#D8CEC2",
    borderRadius: 4,
    height: 6,
    marginTop: 8,
    width: 6,
  },
  eventDotActive: {
    backgroundColor: "#E05D5D",
    width: 18,
  },
  todayDot: {
    backgroundColor: "#3D8B7D",
  },
  focusPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  focusHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  focusTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  focusActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
  },
  sectionLabel: {
    color: "#8A6F5A",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  focusTitle: {
    color: "#1F2A37",
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 27,
    marginTop: 4,
    textTransform: "capitalize",
  },
  smallAddButton: {
    alignItems: "center",
    backgroundColor: "#172033",
    borderRadius: 15,
    flexShrink: 0,
    height: 44,
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
    width: 44,
  },
  dayOrganizeButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 11,
  },
  dayOrganizeButtonActive: {
    backgroundColor: "#3D8B7D",
    borderColor: "#3D8B7D",
  },
  dayOrganizeButtonText: {
    color: "#1F2A37",
    fontSize: 13,
    fontWeight: "900",
  },
  dayOrganizeButtonTextActive: {
    color: "#FFFFFF",
  },
  dayOrganizeHint: {
    alignItems: "center",
    backgroundColor: "#E7F4F1",
    borderColor: "#CFE8E2",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dayOrganizeHintText: {
    color: "#1F2A37",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  timeline: {
    gap: 0,
    marginTop: 16,
  },
  timelineHourRow: {
    flexDirection: "row",
    gap: 10,
    minHeight: 86,
  },
  timelineHourLabelBlock: {
    alignItems: "flex-end",
    paddingTop: 12,
    width: 48,
  },
  timelineHourLabel: {
    color: "#8A7565",
    fontSize: 12,
    fontWeight: "900",
  },
  timelineHourLabelNow: {
    color: "#E05D5D",
  },
  timelineRail: {
    alignItems: "center",
    paddingTop: 15,
    width: 16,
  },
  timelineDot: {
    backgroundColor: "#D8CEC2",
    borderColor: "#FFFFFF",
    borderRadius: 7,
    borderWidth: 2,
    height: 13,
    width: 13,
    zIndex: 2,
  },
  timelineDotActive: {
    backgroundColor: "#172033",
  },
  timelineDotNow: {
    backgroundColor: "#E05D5D",
  },
  timelineHourSlot: {
    borderLeftColor: "#ECE3D8",
    borderLeftWidth: 1,
    flex: 1,
    minHeight: TIMELINE_HOUR_SLOT_HEIGHT,
    paddingBottom: 12,
    paddingLeft: 12,
    position: "relative",
  },
  timelineEmptySlot: {
    alignItems: "center",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  timelineEmptyText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "800",
  },
  timelineNowLine: {
    alignItems: "center",
    flexDirection: "row",
    left: -18,
    position: "absolute",
    right: 0,
    zIndex: 4,
  },
  timelineNowDot: {
    backgroundColor: "#E05D5D",
    borderColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  timelineNowRule: {
    backgroundColor: "#E05D5D",
    flex: 1,
    height: 2,
    opacity: 0.7,
  },
  timelineNowText: {
    color: "#E05D5D",
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 6,
    textTransform: "uppercase",
  },
  timelineEventStack: {
    gap: 8,
  },
  timelineEventCard: {
    alignItems: "stretch",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderLeftWidth: 4,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 74,
    overflow: "hidden",
  },
  timelineEventCardCompleted: {
    opacity: 0.68,
  },
  timelineEventCardOrganizing: {
    borderColor: "#CFE8E2",
    borderWidth: 1,
  },
  timelineEventPressable: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  timelineEventIcon: {
    alignItems: "center",
    borderRadius: 13,
    flexShrink: 0,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  timelineEventBody: {
    flex: 1,
    minWidth: 0,
  },
  timelineEventTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  timelineEventTitle: {
    color: "#111827",
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  timelineEventTime: {
    color: "#4B5563",
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "900",
  },
  timelineEventMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  timelineEventBadges: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  timelineMiniBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    maxWidth: 150,
    minHeight: 27,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  timelineMiniBadgeText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "900",
  },
  timelineDuplicateButton: {
    alignItems: "center",
    borderLeftColor: "rgba(31, 42, 55, 0.08)",
    borderLeftWidth: 1,
    justifyContent: "center",
    width: 42,
  },
  eventList: {
    gap: 12,
    marginTop: 16,
  },
  eventCard: {
    borderColor: "rgba(31, 42, 55, 0.06)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  eventCardCompleted: {
    opacity: 0.68,
  },
  eventAccent: {
    width: 5,
  },
  eventCardMain: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  eventCardPressable: {
    flex: 1,
    minWidth: 0,
  },
  eventDuplicateButton: {
    alignItems: "center",
    borderLeftColor: "rgba(31, 42, 55, 0.08)",
    borderLeftWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
    width: 44,
  },
  eventBody: {
    flex: 1,
    padding: 16,
  },
  eventTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  eventTime: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "800",
  },
  reminderPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  topPills: {
    alignItems: "flex-end",
    gap: 6,
  },
  reminderText: {
    fontSize: 12,
    fontWeight: "800",
  },
  categoryPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "800",
  },
  eventTitle: {
    color: "#111827",
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
  },
  eventTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  eventIconBadge: {
    alignItems: "center",
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  eventDescription: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  eventLocationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 8,
  },
  eventLocationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  recurrencePill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  recurrenceText: {
    fontSize: 12,
    fontWeight: "800",
  },
  overview: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  overviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  overviewMeta: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  quickMoveHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  quickMoveHeaderTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  quickMoveTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  quickMoveSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  quickMoveHeaderAction: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  quickMoveCollapsedRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  quickMoveMiniStat: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 58,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  quickMoveMiniValue: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "900",
  },
  quickMoveMiniLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
  },
  progressTrack: {
    backgroundColor: "#EEE8DF",
    borderRadius: 8,
    height: 8,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#3D8B7D",
    borderRadius: 8,
    height: "100%",
  },
  quickDragHelpText: {
    color: "#8A7565",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 10,
  },
  dayRow: {
    borderTopColor: "#EFE7DC",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 14,
    overflow: "visible",
    paddingVertical: 13,
    position: "relative",
  },
  dayRowDragOrigin: {
    opacity: 0.72,
  },
  dayRowDropZoneTarget: {
    backgroundColor: "#F2FBF8",
  },
  dayRowDropTopLine: {
    backgroundColor: "#3D8B7D",
    borderRadius: 999,
    height: 3,
    left: 0,
    position: "absolute",
    right: 0,
    top: -2,
    zIndex: 5,
  },
  dayRowDate: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#EEE4D8",
    borderRadius: 16,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 50,
  },
  dayRowLabel: {
    color: "#7C6250",
    fontSize: 11,
    fontWeight: "800",
  },
  dayRowNumber: {
    color: "#1F2A37",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  dayRowEvents: {
    flex: 1,
    gap: 6,
    justifyContent: "center",
  },
  noEventsText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "700",
  },
  compactEventTouchArea: {
    borderRadius: 10,
  },
  compactEvent: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  compactEventPressable: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  compactEventCompleted: {
    opacity: 0.68,
  },
  compactEventDragging: {
    backgroundColor: "#FFFFFF",
    borderColor: "#172033",
    borderRadius: 14,
    borderWidth: 1,
    opacity: 0.48,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  draggablePlainEvent: {
    borderRadius: 18,
  },
  draggablePlainEventDragging: {
    opacity: 0.5,
  },
  compactDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  compactIconDot: {
    alignItems: "center",
    borderRadius: 8,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  compactEventText: {
    color: "#374151",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  quickDragLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 35,
  },
  quickDragTargetTopLine: {
    backgroundColor: "#3D8B7D",
    borderRadius: 999,
    height: 4,
    position: "absolute",
    zIndex: 40,
  },
  quickDragPreview: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 2,
    elevation: 16,
    flexDirection: "row",
    gap: 9,
    maxWidth: 240,
    minHeight: 52,
    minWidth: 190,
    paddingHorizontal: 12,
    position: "absolute",
    shadowColor: "#000000",
    zIndex: 36,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    transform: [{ translateX: -95 }, { translateY: -58 }],
  },
  quickDragPreviewTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  quickDragPreviewTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  quickDragPreviewMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  floatingAddButton: {
    alignItems: "center",
    backgroundColor: "#E05D5D",
    borderRadius: 8,
    bottom: 24,
    elevation: 8,
    height: 58,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    width: 58,
  },
  appToast: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    borderWidth: 1,
    bottom: 18,
    flexDirection: "row",
    gap: 12,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: "absolute",
    right: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 40,
  },
  appToastIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  appToastTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  appToastTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  appToastText: {
    color: "#D8DEE9",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  appToastActionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  appToastActionText: {
    color: "#1F2A37",
    fontSize: 13,
    fontWeight: "900",
  },
  appToastCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  modalOverlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  dayDetailOverlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.50)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  calendarOverlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    elevation: 12,
    maxHeight: "94%",
    maxWidth: 430,
    padding: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    width: "100%",
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  calendarHeaderActions: {
    flexDirection: "row",
    gap: 8,
  },
  calendarTitleBlock: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  calendarMonthTitle: {
    color: "#1F2A37",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "capitalize",
  },
  calendarPickerHint: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 6,
    textAlign: "center",
  },
  calendarNavButton: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  calendarWeekRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  calendarWeekday: {
    color: "#8A6F5A",
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  calendarDayCell: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#EFE7DC",
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: "14.285%",
  },
  calendarDayCellMuted: {
    backgroundColor: "#FFFFFF",
    opacity: 0.46,
  },
  calendarDayCellToday: {
    borderColor: "#3D8B7D",
    borderWidth: 2,
  },
  calendarDayCellOverdue: {
    backgroundColor: "#FEF3F2",
    borderColor: "#FECACA",
  },
  calendarDayCellSelected: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
    opacity: 1,
  },
  calendarDayText: {
    color: "#1F2A37",
    fontSize: 15,
    fontWeight: "800",
  },
  calendarDayTextMuted: {
    color: "#9CA3AF",
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
  },
  calendarDotRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 6,
  },
  calendarEventDot: {
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  calendarEventDotEmpty: {
    backgroundColor: "transparent",
  },
  calendarMoreText: {
    color: "#6B7280",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 10,
    marginTop: 1,
  },
  calendarMoreTextSelected: {
    color: "#FFFFFF",
  },
  calendarPreviewPanel: {
    backgroundColor: "#F9F7F3",
    borderColor: "#EFE7DC",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 10,
  },
  calendarPreviewHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  calendarPreviewTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  calendarPreviewTitle: {
    color: "#1F2A37",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
    textTransform: "capitalize",
  },
  calendarPreviewCountBadge: {
    alignItems: "center",
    backgroundColor: "#1F2A37",
    borderRadius: 10,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  calendarPreviewCountText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  calendarPreviewStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  calendarPreviewStatPill: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE7DC",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 8,
  },
  calendarPreviewStatPillOverdue: {
    backgroundColor: "#FEF3F2",
    borderColor: "#FECACA",
  },
  calendarPreviewStatText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "900",
  },
  calendarPreviewStatTextOverdue: {
    color: "#B42318",
  },
  calendarPreviewList: {
    gap: 8,
    marginTop: 10,
  },
  calendarPreviewItem: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE7DC",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  calendarPreviewItemBody: {
    flex: 1,
    minWidth: 0,
  },
  calendarPreviewItemTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  calendarPreviewItemMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  calendarPreviewMoreText: {
    color: "#8A6F5A",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 4,
  },
  calendarActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  calendarSecondaryButton: {
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 12,
  },
  calendarPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#1F2A37",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 40,
  },
  calendarPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  draggableSheet: {
    elevation: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
  sheetDragHandleArea: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    paddingTop: 10,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(229, 231, 235, 0.95)",
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: "91%",
    maxWidth: Platform.OS === "web" ? 430 : undefined,
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    paddingHorizontal: 22,
    paddingTop: 4,
    width: "100%",
  },
  dayDetailCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(229, 231, 235, 0.95)",
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: "88%",
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  dayDetailHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  dayDetailTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  dayDetailTitle: {
    color: "#1F2A37",
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 31,
    marginTop: 2,
    textTransform: "capitalize",
  },
  dayDetailMeta: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5,
  },
  dayDetailActions: {
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
  },
  dayDetailContent: {
    paddingBottom: 10,
    paddingTop: 18,
  },
  dayDetailPills: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  formSummaryCard: {
    alignItems: "center",
    backgroundColor: "#172033",
    borderRadius: 22,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    padding: 14,
  },
  formSummaryIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  formSummaryTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  formSummaryTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  formSummaryMeta: {
    color: "#D8DEE9",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  formSectionCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE7DC",
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 14,
    elevation: 1,
  },
  formSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  formSectionTitle: {
    color: "#7C6250",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  taskComposer: {
    alignItems: "flex-start",
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  taskComposerInput: {
    color: "#111827",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    maxHeight: 96,
    minHeight: 38,
    paddingVertical: 8,
  },
  taskComposerButton: {
    alignItems: "center",
    backgroundColor: "#172033",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    marginTop: 2,
    width: 36,
  },
  taskComposerButtonDisabled: {
    opacity: 0.45,
  },
  taskEmptyBox: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  taskEmptyText: {
    color: "#6B7280",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  taskListEditor: {
    gap: 8,
    marginBottom: 14,
  },
  taskEditorRow: {
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  taskEditorCheck: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D1E7DF",
    borderRadius: 11,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    marginTop: 2,
    width: 32,
  },
  taskEditorCheckDone: {
    backgroundColor: "#3D8B7D",
    borderColor: "#3D8B7D",
  },
  taskEditorInput: {
    color: "#172033",
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    minHeight: 44,
    paddingVertical: 6,
  },
  taskEditorInputDone: {
    color: "#6B7280",
    textDecorationLine: "line-through",
  },
  taskEditorDelete: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    marginTop: 1,
    width: 34,
  },
  templateStrip: {
    marginHorizontal: -2,
    marginBottom: 14,
  },
  templateStripContent: {
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  templateCard: {
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 96,
    padding: 11,
    width: 106,
  },
  templateIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  templateTitle: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 9,
  },
  templateMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  modalHandle: {
    alignSelf: "center",
    backgroundColor: "#C9BFB4",
    borderRadius: 999,
    height: 5,
    width: 54,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitleBlock: {
    flex: 1,
  },
  modalTitle: {
    color: "#1F2A37",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    marginTop: 2,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#ECE3D8",
    borderRadius: 15,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  modalContent: {
    paddingBottom: 10,
    paddingTop: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 16,
    borderWidth: 1,
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  textInputError: {
    borderColor: "#B42318",
  },
  locationInputWrap: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  locationInput: {
    color: "#111827",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    minHeight: 46,
  },
  notesInput: {
    minHeight: 92,
  },
  modalDayStrip: {
    flexDirection: "row",
    gap: 7,
  },
  modalDayButton: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 58,
    paddingVertical: 8,
  },
  modalDayButtonSelected: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  modalDayLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "800",
  },
  modalDayNumber: {
    color: "#1F2A37",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 3,
  },
  modalDayTextSelected: {
    color: "#FFFFFF",
  },
  timeSelectButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  timeSelectText: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionPill: {
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  optionPillSelected: {
    backgroundColor: "#263238",
    borderColor: "#263238",
  },
  optionPillText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "800",
  },
  optionPillTextSelected: {
    color: "#FFFFFF",
  },
  recurrenceAdvancedBox: {
    backgroundColor: "#F9F7F3",
    borderColor: "#EFE7DC",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  recurrenceAdvancedHeader: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  recurrenceAdvancedTitle: {
    color: "#1F2A37",
    fontSize: 14,
    fontWeight: "900",
  },
  recurrenceAdvancedHint: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
  recurrenceControlRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  recurrenceControlLabel: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 12,
  },
  recurrenceStepper: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 4,
  },
  recurrenceStepperButton: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderRadius: 9,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  recurrenceStepperValue: {
    color: "#1F2A37",
    fontSize: 16,
    fontWeight: "900",
    minWidth: 26,
    textAlign: "center",
  },
  recurrenceWeekdaysRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
  },
  recurrenceWeekdayButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    height: 38,
    justifyContent: "center",
  },
  recurrenceWeekdayButtonSelected: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  recurrenceWeekdayText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "900",
  },
  recurrenceWeekdayTextSelected: {
    color: "#FFFFFF",
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
  },
  colorScroll: {
    marginHorizontal: -2,
  },
  colorScrollContent: {
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  colorSwatchOuter: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 8,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  colorSwatchOuterSelected: {
    borderColor: "#1F2A37",
  },
  colorSwatch: {
    borderRadius: 8,
    height: 30,
    width: 30,
  },
  fieldError: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 7,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 10,
    width: "48%",
  },
  categoryOptionSelected: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
  },
  categoryOptionIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  categoryOptionText: {
    color: "#374151",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalInlineActions: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    paddingTop: 8,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#E8DFD3",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "900",
  },
  completedToggle: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    marginBottom: 16,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  completedToggleActive: {
    backgroundColor: "#E7F4F1",
    borderColor: "#3D8B7D",
  },
  completedToggleIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#3D8B7D",
    borderRadius: 14,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  completedToggleIconActive: {
    backgroundColor: "#3D8B7D",
  },
  completedToggleTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  completedToggleTitle: {
    color: "#1F2A37",
    fontSize: 15,
    fontWeight: "800",
  },
  completedToggleText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#172033",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  actionSaveButton: {
    flex: 1,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#FFF3F1",
    borderColor: "#FECACA",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: "#B42318",
    fontSize: 15,
    fontWeight: "800",
  },
  timePickerOverlay: {
    alignItems: "center",
    bottom: 0,
    flex: 1,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 20,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  timePickerBackdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.52)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  timePickerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    elevation: 12,
    maxWidth: 420,
    padding: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    width: "100%",
  },
  timePickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  timePickerTitle: {
    color: "#1F2A37",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    marginTop: 2,
  },
  timePickerColumns: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
    marginTop: 18,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerScroll: {
    maxHeight: 220,
  },
  timePickerOption: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    marginBottom: 8,
  },
  timePickerOptionSelected: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  timePickerOptionText: {
    color: "#374151",
    fontSize: 17,
    fontWeight: "800",
  },
  timePickerOptionTextSelected: {
    color: "#FFFFFF",
  },
  confirmOverlay: {
    alignItems: "center",
    bottom: 0,
    flex: 1,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 24,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 30,
  },
  confirmCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    elevation: 14,
    maxWidth: 380,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    width: "100%",
  },
  confirmIcon: {
    alignItems: "center",
    backgroundColor: "#FEF3F2",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  discardConfirmIcon: {
    backgroundColor: "#FFF1DF",
  },
  confirmTitle: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 12,
  },
  confirmText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },
  cancelDeleteButton: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderColor: "#E8DFD3",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelDeleteButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "800",
  },
  confirmDeleteButton: {
    alignItems: "center",
    backgroundColor: "#B42318",
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  discardConfirmButton: {
    backgroundColor: "#D28A2E",
  },
  confirmDeleteButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  authScreen: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  authCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  authIcon: {
    alignItems: "center",
    backgroundColor: "#1F2A37",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    marginBottom: 16,
    width: 52,
  },
  authTitle: {
    color: "#1F2A37",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    marginTop: 2,
  },
  authText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    marginBottom: 20,
    marginTop: 8,
  },
  authError: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  authActions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryAuthButton: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  // Estilos de autenticación modernizados
  authLoadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  authLoadingIcon: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderColor: "#ECE3D8",
    borderRadius: 20,
    borderWidth: 1,
    height: 100,
    justifyContent: "center",
    marginBottom: 16,
    width: 100,
  },
  authLoadingText: {
    color: "#1F2A37",
    fontSize: 28,
    fontWeight: "800",
  },
  authContainer: {
    flex: 1,
  },
  authScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  authHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  authLogoContainer: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderColor: "#ECE3D8",
    borderRadius: 16,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    marginBottom: 16,
    width: 72,
  },
  authBrand: {
    color: "#1F2A37",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  authTagline: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  authToggle: {
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    flexDirection: "row",
    marginBottom: 24,
    padding: 4,
  },
  authToggleButton: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    paddingVertical: 12,
  },
  authToggleButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  authToggleText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "600",
  },
  authToggleTextActive: {
    color: "#1F2A37",
    fontWeight: "700",
  },
  authForm: {
    gap: 20,
  },
  authInputGroup: {
    gap: 6,
  },
  authInputLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  authInputContainer: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  authInputContainerError: {
    borderColor: "#B42318",
    backgroundColor: "#FEF3F2",
  },
  authInputIcon: {
    marginRight: 12,
  },
  authInput: {
    color: "#1F2A37",
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 14,
  },
  authInputEye: {
    padding: 4,
  },
  authInputError: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 4,
  },
  authErrorContainer: {
    alignItems: "center",
    backgroundColor: "#FEF3F2",
    borderColor: "#FECACA",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authErrorText: {
    color: "#B42318",
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  authPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#1F2A37",
    borderRadius: 12,
    paddingVertical: 16,
  },
  authPrimaryButtonPressed: {
    backgroundColor: "#374151",
    transform: [{ scale: 0.98 }],
  },
  authPrimaryButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  authPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  authInfoText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  proSearchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  quickSearchCardClean: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 14,
    shadowColor: "#111827",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  filterIconButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 18,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    position: "relative",
    width: 48,
    shadowColor: "#111827",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  filterIconButtonActive: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  filterBadgeDot: {
    backgroundColor: "#3D8B7D",
    borderColor: "#FFFFFF",
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: "absolute",
    right: 10,
    top: 10,
    width: 10,
  },
  activeFiltersSummary: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  activeFiltersSummaryText: {
    color: "#4B5563",
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 10,
  },
  activeFiltersClearText: {
    color: "#1F2A37",
    fontSize: 12,
    fontWeight: "800",
  },
  filtersBottomSheet: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(229, 231, 235, 0.95)",
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: "82%",
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  filtersSheetHeader: {
    marginBottom: 18,
  },
  filtersSheetTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginTop: 3,
  },
  filtersSheetSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 5,
  },
  filtersSheetScroll: {
    flexShrink: 1,
    maxHeight: 520,
  },
  filtersSheetScrollContent: {
    paddingBottom: 4,
  },
  filtersCategoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 10,
  },
  filtersCategoryOption: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filtersCategoryOptionSelected: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  filtersCategoryOptionText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "800",
  },
  filtersCategoryOptionTextSelected: {
    color: "#FFFFFF",
  },
  filtersResultsHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  filtersResultsTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  filtersResultsSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginTop: -2,
  },
  filtersResultsCount: {
    color: "#1F2A37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 2,
  },
  filtersEmptyResults: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#EFE7DC",
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    marginTop: 10,
    padding: 14,
  },
  filtersEmptyResultsText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },
  filtersResultsList: {
    gap: 8,
    marginTop: 10,
  },
  filtersResultItem: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#EFE7DC",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
  },
  filtersResultBody: {
    flex: 1,
    minWidth: 0,
  },
  filtersResultTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  filtersResultMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "capitalize",
  },
  filtersSheetActions: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
    paddingTop: 4,
  },
  filtersSheetSecondaryButton: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  filtersSheetSecondaryText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "900",
  },
  filtersSheetPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#1F2A37",
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  filtersSheetPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  categoryManagerSheet: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(229, 231, 235, 0.95)",
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: "88%",
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  categoryManagerHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  categoryManagerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  categoryManagerTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
    lineHeight: 27,
    marginTop: 3,
  },
  categoryManagerContent: {
    paddingBottom: 18,
    paddingTop: 16,
  },
  categoryManagerList: {
    gap: 8,
  },
  categoryManagerItem: {
    alignItems: "center",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
  },
  categoryManagerItemIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  categoryManagerItemBody: {
    flex: 1,
    minWidth: 0,
  },
  categoryManagerItemTitle: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "900",
  },
  categoryManagerItemMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  categoryEditorCard: {
    backgroundColor: "#F9F7F3",
    borderColor: "#EFE7DC",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  categoryEditorLabel: {
    marginTop: 14,
  },
  categoryIconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryIconOption: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 13,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  categoryManagerActions: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
  },
  categoryManagerSecondaryAction: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  categoryManagerSecondaryText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "900",
  },
  categoryManagerPrimaryAction: {
    alignItems: "center",
    backgroundColor: "#172033",
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  categoryManagerPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

});

type AgendaStyles = typeof styles;

const webStyleOverrides = StyleSheet.create({
  safeArea: {
    minHeight: "100%",
  },
  content: {
    alignSelf: "center",
    maxWidth: 760,
    paddingBottom: 126,
    paddingHorizontal: 16,
    paddingTop: 14,
    width: "100%",
  },
  authScrollContent: {
    alignSelf: "center",
    maxWidth: 520,
    paddingBottom: 96,
    paddingHorizontal: 20,
    width: "100%",
  },
  floatingAddButton: {
    bottom: 94,
  },
  appToast: {
    alignSelf: "center",
    bottom: 86,
    left: "auto",
    maxWidth: 420,
    right: "auto",
    width: "94%",
  },
  modalOverlay: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  dayDetailOverlay: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  modalCard: {
    alignSelf: "center",
    maxWidth: 440,
    paddingBottom: 24,
    width: "94%",
  },
  dayDetailCard: {
    alignSelf: "center",
    maxWidth: 440,
    paddingBottom: 24,
    width: "94%",
  },
  eventDetailCard: {
    alignSelf: "center",
    maxWidth: 440,
    width: "94%",
  },
  filtersBottomSheet: {
    maxWidth: 560,
    paddingBottom: 24,
    width: "100%",
  },
  calendarOverlay: {
    paddingBottom: 86,
  },
});

function getDarkStyleColor(propertyName: string, color: string) {
  const normalizedColor = color.toUpperCase();
  const isTextColor = propertyName === "color";
  const isBorderColor = propertyName.toLowerCase().includes("border");
  const isBackgroundColor = propertyName.toLowerCase().includes("background");

  if (isTextColor) {
    if (
      [
        "#111827",
        "#172033",
        "#1F2A37",
        "#263238",
        "#374151",
      ].includes(normalizedColor)
    ) {
      return "#F8FAFC";
    }

    if (
      [
        "#4B5563",
        "#6B7280",
        "#624514",
        "#7C6250",
        "#8A6F5A",
        "#8A7565",
        "#9CA3AF",
      ].includes(normalizedColor)
    ) {
      return "#CBD5E1";
    }

    return color;
  }

  if (isBorderColor) {
    if (
      [
        "#D4C4B6",
        "#D8CEC2",
        "#E5E7EB",
        "#E7DED1",
        "#E8DFD3",
        "#ECE3D8",
        "#EFE4D8",
        "#EFE7DC",
        "#FECACA",
      ].includes(normalizedColor)
    ) {
      return "#273244";
    }

    if (normalizedColor === "#FFFFFF") {
      return "#334155";
    }

    if (["#111827", "#172033", "#1F2A37", "#263238"].includes(normalizedColor)) {
      return "#475569";
    }

    return color;
  }

  if (isBackgroundColor) {
    if (color.startsWith("rgba(255,255,255") || color.startsWith("rgba(255, 255, 255")) {
      return "rgba(255,255,255,0.08)";
    }

    if (
      [
        "#FFFDF9",
        "#F7F5F0",
        "#F8F1E8",
        "#FAF8F4",
        "#FAFAF8",
      ].includes(normalizedColor)
    ) {
      return "#0F172A";
    }

    if (
      [
        "#FFFFFF",
        "#F9FAFB",
        "#F8FAFC",
        "#F9F7F3",
        "#F7F3EC",
        "#F7F5F0",
        "#F6F1EA",
        "#F5F1EA",
        "#F3F4F6",
        "#F0EBE3",
        "#EEE8DF",
      ].includes(normalizedColor)
    ) {
      return "#111827";
    }

    if (["#111827", "#172033", "#1F2A37", "#263238"].includes(normalizedColor)) {
      return "#334155";
    }

    if (["#FEF3F2", "#FFF3F1", "#FFF4F2", "#FFF1F0"].includes(normalizedColor)) {
      return "#3B1717";
    }

    if (["#E7F4F1", "#F2FBF8"].includes(normalizedColor)) {
      return "#12362F";
    }

    if (["#FFF1DF", "#FFF9ED"].includes(normalizedColor)) {
      return "#3B2A12";
    }
  }

  return color;
}

function createDarkStyleOverrides<T extends Record<string, unknown>>(baseStyles: T) {
  return Object.entries(baseStyles).reduce(
    (overrides, [styleName, styleValue]) => {
      if (!styleValue || typeof styleValue !== "object" || Array.isArray(styleValue)) {
        return overrides;
      }

      const nextStyle = Object.entries(styleValue).reduce(
        (styleOverride, [propertyName, propertyValue]) => {
          if (typeof propertyValue !== "string") {
            return styleOverride;
          }

          const nextColor = getDarkStyleColor(propertyName, propertyValue);

          if (nextColor === propertyValue) {
            return styleOverride;
          }

          return {
            ...styleOverride,
            [propertyName]: nextColor,
          };
        },
        {} as Record<string, string>,
      );

      if (Object.keys(nextStyle).length === 0) {
        return overrides;
      }

      return {
        ...overrides,
        [styleName]: nextStyle,
      };
    },
    {} as Partial<Record<keyof T, object>>,
  );
}

const darkStyleOverrides = StyleSheet.create(createDarkStyleOverrides(styles));

function mergeAgendaStyles(isDark: boolean): AgendaStyles {
  let mergedStyles: AgendaStyles = styles;

  if (isDark) {
    mergedStyles = Object.keys(styles).reduce((nextStyles, styleName) => {
      const key = styleName as keyof AgendaStyles;

      return {
        ...nextStyles,
        [key]: darkStyleOverrides[key]
          ? [styles[key], darkStyleOverrides[key]]
          : styles[key],
      };
    }, {} as AgendaStyles);
  }

  if (Platform.OS !== "web") {
    return mergedStyles;
  }

  const agendaWebStyleOverrides = webStyleOverrides as Partial<
    Record<keyof AgendaStyles, object>
  >;

  return Object.keys(mergedStyles).reduce((nextStyles, styleName) => {
    const key = styleName as keyof AgendaStyles;
    const webOverride = agendaWebStyleOverrides[key];

    return {
      ...nextStyles,
      [key]: webOverride ? [mergedStyles[key], webOverride] : mergedStyles[key],
    };
  }, {} as AgendaStyles);
}

function getAgendaStyles(isDark: boolean) {
  return mergeAgendaStyles(isDark);
}

const AgendaStylesContext = createContext(styles);

function useAgendaStyles() {
  return useContext(AgendaStylesContext);
}
