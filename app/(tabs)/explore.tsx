import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { Session } from "@supabase/supabase-js";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { type ThemePreference, useAppTheme } from "@/lib/app-theme";
import { supabase } from "@/lib/supabase";

type CategoryIcon = keyof typeof Ionicons.glyphMap;
type AppToastVariant = "success" | "info" | "warning" | "danger";
type AppToast = {
  duration?: number;
  icon: CategoryIcon;
  id: string;
  message?: string;
  title: string;
  variant: AppToastVariant;
};
type SettingsScreenMode = "main" | "trash" | "categories" | "templates";

type AgendaCategory = {
  id: string;
  label: string;
  icon: CategoryIcon;
  color: string;
  tone: string;
  sortOrder: number;
  isDefault: boolean;
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

type StoredAgendaEvent = {
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
  category: string;
  notificationId?: string;
  deletedAt?: string;
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
  category: string | null;
  notification_id: string | null;
  deleted_at: string | null;
};

type AgendaEventTask = {
  id: string;
  eventId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
};

type AgendaEventTaskRow = {
  user_id: string;
  id: string;
  event_id: string;
  title: string;
  completed: boolean | null;
  sort_order: number | null;
};

type EventTemplate = {
  categoryId: string;
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

type TemplateForm = {
  categoryId: string;
  description: string;
  icon: CategoryIcon;
  label: string;
  location: string;
  reminder: string;
  startTime: string;
  taskDraft: string;
  tasks: string[];
  title: string;
};

type AgendaBackup = {
  app: "agenda-app";
  data: {
    categories: AgendaCategory[];
    eventTasks: AgendaEventTask[];
    events: StoredAgendaEvent[];
    templates: EventTemplate[];
  };
  exportedAt: string;
  version: 1;
};

type CategoryForm = {
  label: string;
  icon: CategoryIcon;
  color: string;
  tone: string;
};

type BrowserLocalStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const FALLBACK_CATEGORY_ID = "personal";
const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const CATEGORIES_STORAGE_KEY = "agenda-app/categories";
const CATEGORIES_STORAGE_FILE = "agenda-categories.json";
const EVENTS_STORAGE_KEY = "agenda-app/events";
const EVENTS_STORAGE_FILE = "agenda-events.json";
const EVENT_TASKS_STORAGE_KEY = "agenda-app/event-tasks";
const EVENT_TASKS_STORAGE_FILE = "agenda-event-tasks.json";
const EVENT_TEMPLATES_STORAGE_KEY = "agenda-app/event-templates";
const EVENT_TEMPLATES_STORAGE_FILE = "agenda-event-templates.json";

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

const THEME_OPTIONS: {
  description: string;
  icon: CategoryIcon;
  label: string;
  value: ThemePreference;
}[] = [
  {
    description: "Sigue el móvil",
    icon: "phone-portrait-outline",
    label: "Sistema",
    value: "system",
  },
  {
    description: "Fondo claro",
    icon: "sunny-outline",
    label: "Claro",
    value: "light",
  },
  {
    description: "Fondo oscuro",
    icon: "moon-outline",
    label: "Oscuro",
    value: "dark",
  },
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
  "medical-outline",
  "restaurant-outline",
  "book-outline",
  "sparkles-outline",
  "cart-outline",
  "airplane-outline",
];

const DEFAULT_EVENT_CATEGORIES: AgendaCategory[] = [
  {
    id: "personal",
    color: "#E05D5D",
    icon: "heart-outline",
    label: "Personal",
    tone: "#FDECEC",
    sortOrder: 0,
    isDefault: true,
  },
  {
    id: "cita",
    color: "#4D74B8",
    icon: "calendar-outline",
    label: "Cita",
    tone: "#EAF0FB",
    sortOrder: 1,
    isDefault: true,
  },
  {
    id: "trabajo",
    color: "#3D8B7D",
    icon: "briefcase-outline",
    label: "Trabajo/estudio",
    tone: "#E7F4F1",
    sortOrder: 2,
    isDefault: true,
  },
  {
    id: "casa",
    color: "#D28A2E",
    icon: "home-outline",
    label: "Casa",
    tone: "#FFF1DF",
    sortOrder: 3,
    isDefault: true,
  },
  {
    id: "cumpleanos",
    color: "#9B6AAB",
    icon: "gift-outline",
    label: "Cumpleaños",
    tone: "#F3EAF7",
    sortOrder: 4,
    isDefault: true,
  },
  {
    id: "recordatorio",
    color: "#6B7280",
    icon: "notifications-outline",
    label: "Recordatorio",
    tone: "#F1F3F5",
    sortOrder: 5,
    isDefault: true,
  },
];

const DEFAULT_EVENT_TEMPLATES: EventTemplate[] = [
  {
    categoryId: "cita",
    description: "Revisar hora, direccion y llevar lo necesario.",
    icon: "medical-outline",
    id: "medico",
    isDefault: true,
    label: "Medico",
    location: "",
    reminder: "1 hora antes",
    sortOrder: 0,
    startTime: "10:00",
    tasks: [
      "Confirmar hora de la cita",
      "Llevar tarjeta sanitaria o documentacion",
      "Anotar sintomas o preguntas",
      "Revisar direccion y tiempo de llegada",
    ],
    title: "Cita medica",
  },
  {
    categoryId: "casa",
    description: "Lista rapida para no olvidarse de nada importante.",
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
      "Apuntar productos basicos",
      "Anadir capricho o plan especial",
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
      "Revisar documentacion",
      "Preparar maleta",
      "Confirmar reservas",
      "Mirar horarios y transporte",
      "Cargar movil y bateria externa",
    ],
    title: "Viaje",
  },
  {
    categoryId: "cumpleanos",
    description: "Preparar cumpleanos con regalo, felicitacion y plan.",
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
      "Preparar felicitacion",
      "Confirmar plan o reserva",
      "Llevar velas o detalle",
    ],
    title: "Cumpleanos",
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

function normalizeAgendaCategoryList(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedCategories = value
    .map((category) => normalizeAgendaCategory(category))
    .filter((category): category is AgendaCategory => category !== null);

  return normalizedCategories.length > 0
    ? sortCategories(normalizedCategories)
    : null;
}

function isValidRecurrence(value: unknown): value is Recurrence {
  return (
    value === "none" ||
    value === "daily" ||
    value === "weekly" ||
    value === "monthly"
  );
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
        .filter(
          (weekday) =>
            Number.isInteger(weekday) && weekday >= 0 && weekday <= 6,
        ),
    ),
  );
}

function normalizeRecurrenceEndDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return value;
}

function normalizeStoredEvent(value: unknown): StoredAgendaEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredAgendaEvent>;

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
    recurrenceEndDate: normalizeRecurrenceEndDate(candidate.recurrenceEndDate),
    category:
      typeof candidate.category === "string" && candidate.category.trim()
        ? candidate.category
        : FALLBACK_CATEGORY_ID,
    notificationId:
      typeof candidate.notificationId === "string"
        ? candidate.notificationId
        : undefined,
    deletedAt:
      typeof candidate.deletedAt === "string" ? candidate.deletedAt : undefined,
  };
}

function normalizeStoredEventList(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((event) => normalizeStoredEvent(event))
    .filter((event): event is StoredAgendaEvent => event !== null);
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

function normalizeAgendaEventTaskList(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((task) => normalizeAgendaEventTask(task))
    .filter((task): task is AgendaEventTask => task !== null)
    .sort((firstTask, secondTask) => {
      if (firstTask.eventId !== secondTask.eventId) {
        return firstTask.eventId.localeCompare(secondTask.eventId);
      }

      return firstTask.sortOrder - secondTask.sortOrder;
    });
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
    tasks: candidate.tasks.filter(
      (task): task is string => typeof task === "string",
    ),
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

function normalizeAgendaBackup(value: unknown): AgendaBackup | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AgendaBackup>;
  const data = candidate.data as Partial<AgendaBackup["data"]> | undefined;

  if (candidate.app !== "agenda-app" || candidate.version !== 1 || !data) {
    return null;
  }

  const categories = normalizeAgendaCategoryList(data.categories);
  const events = normalizeStoredEventList(data.events);
  const eventTasks = normalizeAgendaEventTaskList(data.eventTasks);

  if (!categories || !events || !eventTasks) {
    return null;
  }

  return {
    app: "agenda-app",
    data: {
      categories,
      eventTasks,
      events,
      templates:
        normalizeEventTemplateList(data.templates) ??
        createDefaultEventTemplates(),
    },
    exportedAt:
      typeof candidate.exportedAt === "string"
        ? candidate.exportedAt
        : new Date().toISOString(),
    version: 1,
  };
}

function createEmptyCategoryForm(): CategoryForm {
  return {
    label: "",
    icon: "pricetag-outline",
    color: EVENT_COLORS[0].color,
    tone: EVENT_COLORS[0].tone,
  };
}

function splitTime(time: string) {
  const [hour = "09", minute = "00"] = time.split(":");

  return {
    hour: hour.padStart(2, "0"),
    minute: minute.padStart(2, "0"),
  };
}

function createEmptyTemplateForm(categoryId: string): TemplateForm {
  return {
    categoryId,
    description: "",
    icon: "albums-outline",
    label: "",
    location: "",
    reminder: "15 min antes",
    startTime: "09:00",
    taskDraft: "",
    tasks: [],
    title: "",
  };
}

function createCategoryId(label: string, existingIds: string[]) {
  const baseId =
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "categoria";

  let nextId = baseId;
  let suffix = 2;

  while (existingIds.includes(nextId)) {
    nextId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return nextId;
}

function createTemplateId(label: string, existingIds: string[]) {
  return createCategoryId(label, existingIds);
}

function getFallbackCategory(categories: AgendaCategory[]) {
  return (
    categories.find((category) => category.id === FALLBACK_CATEGORY_ID) ??
    DEFAULT_EVENT_CATEGORIES[0]
  );
}

function getCategoriesFile() {
  return new File(Paths.document, CATEGORIES_STORAGE_FILE);
}

function getEventsFile() {
  return new File(Paths.document, EVENTS_STORAGE_FILE);
}

function getEventTasksFile() {
  return new File(Paths.document, EVENT_TASKS_STORAGE_FILE);
}

function getEventTemplatesFile() {
  return new File(Paths.document, EVENT_TEMPLATES_STORAGE_FILE);
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

      return normalizeAgendaCategoryList(JSON.parse(storedCategories));
    }

    const categoriesFile = getCategoriesFile();

    if (!categoriesFile.exists) {
      return null;
    }

    return normalizeAgendaCategoryList(JSON.parse(await categoriesFile.text()));
  } catch (error) {
    console.warn("No se pudieron cargar las categorías locales", error);
    return null;
  }
}

async function saveStoredCategories(categories: AgendaCategory[]) {
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

      return normalizeStoredEventList(JSON.parse(storedEvents));
    }

    const eventsFile = getEventsFile();

    if (!eventsFile.exists) {
      return null;
    }

    return normalizeStoredEventList(JSON.parse(await eventsFile.text()));
  } catch (error) {
    console.warn("No se pudieron cargar los eventos locales", error);
    return null;
  }
}

async function saveStoredEvents(events: StoredAgendaEvent[]) {
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

      return normalizeAgendaEventTaskList(JSON.parse(storedTasks));
    }

    const tasksFile = getEventTasksFile();

    if (!tasksFile.exists) {
      return null;
    }

    return normalizeAgendaEventTaskList(JSON.parse(await tasksFile.text()));
  } catch (error) {
    console.warn("No se pudieron cargar las tareas locales", error);
    return null;
  }
}

async function saveStoredEventTasks(tasks: AgendaEventTask[]) {
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

async function loadStoredEventTemplates() {
  try {
    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      const storedTemplates = localStorage?.getItem(
        EVENT_TEMPLATES_STORAGE_KEY,
      );

      if (!storedTemplates) {
        return null;
      }

      return normalizeEventTemplateList(JSON.parse(storedTemplates));
    }

    const templatesFile = getEventTemplatesFile();

    if (!templatesFile.exists) {
      return null;
    }

    return normalizeEventTemplateList(JSON.parse(await templatesFile.text()));
  } catch (error) {
    console.warn("No se pudieron cargar las plantillas locales", error);
    return null;
  }
}

async function saveStoredEventTemplates(templates: EventTemplate[]) {
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

function eventToRow(event: StoredAgendaEvent, userId: string): AgendaEventRow {
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

function rowToEvent(row: AgendaEventRow): StoredAgendaEvent {
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
    category:
      typeof row.category === "string" && row.category.trim()
        ? row.category
        : FALLBACK_CATEGORY_ID,
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

  return sortCategories(
    ((data ?? []) as AgendaCategoryRow[]).map(rowToCategory),
  );
}

async function saveSupabaseCategory(category: AgendaCategory, userId: string) {
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

async function deleteSupabaseEventTemplate(templateId: string, userId: string) {
  const { error } = await supabase
    .from("agenda_event_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function saveSupabaseEvents(events: StoredAgendaEvent[], userId: string) {
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

async function replaceSupabaseBackupData(
  categories: AgendaCategory[],
  events: StoredAgendaEvent[],
  tasks: AgendaEventTask[],
  templates: EventTemplate[],
  userId: string,
) {
  const { error: deleteTasksError } = await supabase
    .from("agenda_event_tasks")
    .delete()
    .eq("user_id", userId);

  if (deleteTasksError) {
    throw deleteTasksError;
  }

  const { error: deleteEventsError } = await supabase
    .from("agenda_events")
    .delete()
    .eq("user_id", userId);

  if (deleteEventsError) {
    throw deleteEventsError;
  }

  const { error: deleteCategoriesError } = await supabase
    .from("agenda_categories")
    .delete()
    .eq("user_id", userId);

  if (deleteCategoriesError) {
    throw deleteCategoriesError;
  }

  const { error: deleteTemplatesError } = await supabase
    .from("agenda_event_templates")
    .delete()
    .eq("user_id", userId);

  if (deleteTemplatesError) {
    throw deleteTemplatesError;
  }

  await saveSupabaseCategories(categories, userId);
  await saveSupabaseEventTemplates(templates, userId);
  await saveSupabaseEvents(events, userId);
  await saveSupabaseEventTasks(tasks, userId);
}

async function ensureDefaultCategories(
  categories: AgendaCategory[],
  userId?: string,
) {
  const existingIds = new Set(categories.map((category) => category.id));
  const missingCategories = createDefaultCategories().filter(
    (category) => !existingIds.has(category.id),
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

function createBackupFileName(date = new Date()) {
  return `agenda-backup-${date.toISOString().slice(0, 10)}.json`;
}

async function playSettingsFeedback(
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
    console.warn("No se pudo reproducir la vibración de ajustes", error);
  }
}

function downloadTextFileOnWeb(fileName: string, contents: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return true;
}

async function readBackupAssetText(asset: DocumentPicker.DocumentPickerAsset) {
  if (Platform.OS === "web" && asset.file) {
    return asset.file.text();
  }

  return new File(asset.uri).text();
}

type SettingsScreenContentProps = {
  mode?: SettingsScreenMode;
};

export function SettingsScreenContent({
  mode = "main",
}: SettingsScreenContentProps) {
  const { isDark, preference, resolvedTheme, setPreference } = useAppTheme();
  const styles = useMemo(() => getSettingsStyles(isDark), [isDark]);
  const primaryIconColor = isDark ? "#F8FAFC" : "#1F2A37";
  const mutedIconColor = isDark ? "#CBD5E1" : "#6B7280";
  const [session, setSession] = useState<Session | null>(null);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);
  const [categories, setCategories] = useState(createDefaultCategories);
  const [events, setEvents] = useState<StoredAgendaEvent[]>([]);
  const [eventTasks, setEventTasks] = useState<AgendaEventTask[]>([]);
  const [eventTemplates, setEventTemplates] = useState(() =>
    createDefaultEventTemplates(),
  );
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    FALLBACK_CATEGORY_ID,
  );
  const [categoryForm, setCategoryForm] = useState(createEmptyCategoryForm);
  const [categoryError, setCategoryError] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [templateForm, setTemplateForm] = useState(() =>
    createEmptyTemplateForm(FALLBACK_CATEGORY_ID),
  );
  const [templateError, setTemplateError] = useState("");
  const [isTemplateTimePickerOpen, setIsTemplateTimePickerOpen] =
    useState(false);
  const [timePickerHour, setTimePickerHour] = useState("09");
  const [timePickerMinute, setTimePickerMinute] = useState("00");
  const [syncStatus, setSyncStatus] = useState("Cargando...");
  const [backupStatus, setBackupStatus] = useState("");
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appToast, setAppToast] = useState<AppToast | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(18)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = session?.user.id;
  const userEmail = session?.user.email ?? "Sin sesión";
  const syncState =
    syncStatus === "Sincronizado"
      ? "online"
      : syncStatus === "Modo local"
        ? "local"
        : "syncing";
  const syncIcon: CategoryIcon =
    syncState === "online"
      ? "cloud-done-outline"
      : syncState === "local"
        ? "cloud-offline-outline"
        : "sync-outline";
  const syncColor =
    syncState === "online"
      ? "#3D8B7D"
      : syncState === "local"
        ? "#D28A2E"
        : "#4D74B8";
  const selectedCategory = useMemo(
    () =>
      editingCategoryId
        ? (categories.find((category) => category.id === editingCategoryId) ??
          null)
        : null,
    [categories, editingCategoryId],
  );
  const activeEvents = useMemo(
    () => events.filter((event) => !event.deletedAt),
    [events],
  );
  const deletedEvents = useMemo(
    () =>
      events
        .filter((event) => event.deletedAt)
        .sort((firstEvent, secondEvent) =>
          (secondEvent.deletedAt ?? "").localeCompare(
            firstEvent.deletedAt ?? "",
          ),
        ),
    [events],
  );
  const selectedTemplate = useMemo(
    () =>
      editingTemplateId
        ? (eventTemplates.find(
            (template) => template.id === editingTemplateId,
          ) ?? null)
        : null,
    [editingTemplateId, eventTemplates],
  );
  const categoryCounts = useMemo(() => {
    return activeEvents.reduce(
      (counts, event) => ({
        ...counts,
        [event.category]: (counts[event.category] ?? 0) + 1,
      }),
      {} as Record<string, number>,
    );
  }, [activeEvents]);
  const localDataSummary = `${activeEvents.length} ${
    activeEvents.length === 1 ? "evento" : "eventos"
  } · ${categories.length} ${
    categories.length === 1 ? "categoría" : "categorías"
  } · ${eventTasks.length} ${eventTasks.length === 1 ? "tarea" : "tareas"}`;

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

  function openSettingsRoute(screen: Exclude<SettingsScreenMode, "main">) {
    void playSettingsFeedback("selection");
    router.push(`/settings/${screen}`);
  }

  function closeSettingsScreen() {
    void playSettingsFeedback("selection");
    router.back();
  }

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
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSession) {
      return;
    }

    void loadSettings(userId);
    // loadSettings intentionally reads the latest local form state after auth changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedSession, userId]);
  useFocusEffect(
    useCallback(() => {
      if (hasLoadedSession) {
        void loadSettings(userId);
      }
      // loadSettings intentionally reads the latest local form state when Settings regains focus.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasLoadedSession, userId]),
  );

  async function loadSettings(authenticatedUserId?: string) {
    setIsLoading(true);
    setSyncStatus(authenticatedUserId ? "Sincronizando..." : "Modo local");

    const storedCategories = await loadStoredCategories();
    const storedEvents = await loadStoredEvents();
    const storedTasks = await loadStoredEventTasks();
    const storedTemplates = await loadStoredEventTemplates();
    let nextCategories = await ensureDefaultCategories(
      storedCategories ?? createDefaultCategories(),
    );
    let nextEvents = storedEvents ?? [];
    let nextTasks = storedTasks ?? [];
    let nextTemplates = await ensureDefaultEventTemplates(
      storedTemplates ?? createDefaultEventTemplates(),
    );

    try {
      if (authenticatedUserId) {
        const remoteCategories =
          await loadSupabaseCategories(authenticatedUserId);

        nextCategories = await ensureDefaultCategories(
          remoteCategories.length > 0 ? remoteCategories : nextCategories,
          authenticatedUserId,
        );

        if (remoteCategories.length === 0) {
          await saveSupabaseCategories(nextCategories, authenticatedUserId);
        }

        const remoteEvents = await loadSupabaseEvents(authenticatedUserId);

        if (remoteEvents.length > 0) {
          nextEvents = remoteEvents;
        }

        const remoteTasks = await loadSupabaseEventTasks(authenticatedUserId);

        if (remoteTasks.length > 0) {
          nextTasks = remoteTasks;
        }

        const remoteTemplates =
          await loadSupabaseEventTemplates(authenticatedUserId);

        nextTemplates = await ensureDefaultEventTemplates(
          remoteTemplates.length > 0 ? remoteTemplates : nextTemplates,
          authenticatedUserId,
        );

        setSyncStatus("Sincronizado");
      }
    } catch (error) {
      console.warn("No se pudieron sincronizar los ajustes", error);
      setSyncStatus("Modo local");
    }

    setCategories(nextCategories);
    setEvents(nextEvents);
    setEventTasks(nextTasks);
    setEventTemplates(nextTemplates);
    await saveStoredCategories(nextCategories);
    await saveStoredEvents(nextEvents);
    await saveStoredEventTasks(nextTasks);
    await saveStoredEventTemplates(nextTemplates);

    if (
      editingCategoryId &&
      !nextCategories.some((category) => category.id === editingCategoryId)
    ) {
      selectCategory(getFallbackCategory(nextCategories));
    } else if (editingCategoryId === FALLBACK_CATEGORY_ID) {
      selectCategory(getFallbackCategory(nextCategories));
    }

    if (
      editingTemplateId &&
      !nextTemplates.some((template) => template.id === editingTemplateId)
    ) {
      startNewTemplate(nextCategories[0]?.id ?? FALLBACK_CATEGORY_ID);
    }

    setIsLoading(false);
  }

  function selectCategory(category: AgendaCategory) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      label: category.label,
      icon: category.icon,
      color: category.color,
      tone: category.tone,
    });
    setCategoryError("");
  }

  function startNewCategory() {
    setEditingCategoryId(null);
    setCategoryForm(createEmptyCategoryForm());
    setCategoryError("");
  }

  function selectTemplate(template: EventTemplate) {
    setEditingTemplateId(template.id);
    setTemplateForm({
      categoryId: template.categoryId,
      description: template.description,
      icon: template.icon,
      label: template.label,
      location: template.location,
      reminder: template.reminder,
      startTime: template.startTime ?? "09:00",
      taskDraft: "",
      tasks: [...template.tasks],
      title: template.title,
    });
    setTemplateError("");
  }

  function startNewTemplate(categoryId = FALLBACK_CATEGORY_ID) {
    setEditingTemplateId(null);
    setTemplateForm(createEmptyTemplateForm(categoryId));
    setTemplateError("");
  }

  function selectPalette(color: string, tone: string) {
    setCategoryForm((currentForm) => ({ ...currentForm, color, tone }));
  }

  async function updateEventsForCategory(
    categoryId: string,
    nextCategory: AgendaCategory,
  ) {
    const nextEvents = events.map((event) =>
      event.category === categoryId
        ? {
            ...event,
            category: nextCategory.id,
            color: nextCategory.color,
            tone: nextCategory.tone,
          }
        : event,
    );

    setEvents(nextEvents);
    await saveStoredEvents(nextEvents);

    if (!userId) {
      return;
    }

    const { error } = await supabase
      .from("agenda_events")
      .update({
        category: nextCategory.id,
        color: nextCategory.color,
        tone: nextCategory.tone,
      })
      .eq("user_id", userId)
      .eq("category", categoryId);

    if (error) {
      throw error;
    }
  }

  async function saveCategory() {
    const label = categoryForm.label.trim();

    if (!label) {
      setCategoryError("Ponle un nombre a la categoría.");
      showAppToast({
        icon: "alert-circle-outline",
        message: "Añade un nombre antes de guardar.",
        title: "Falta completar la categoría",
        variant: "danger",
      });
      return;
    }

    const existingCategory = editingCategoryId
      ? categories.find((category) => category.id === editingCategoryId)
      : undefined;
    const nextCategory: AgendaCategory = {
      id:
        existingCategory?.id ??
        createCategoryId(
          label,
          categories.map((category) => category.id),
        ),
      label,
      icon: categoryForm.icon,
      color: categoryForm.color,
      tone: categoryForm.tone,
      sortOrder: existingCategory?.sortOrder ?? categories.length,
      isDefault: existingCategory?.isDefault ?? false,
    };
    const nextCategories = sortCategories(
      existingCategory
        ? categories.map((category) =>
            category.id === existingCategory.id ? nextCategory : category,
          )
        : [...categories, nextCategory],
    );

    setCategories(nextCategories);
    await saveStoredCategories(nextCategories);
    setEditingCategoryId(nextCategory.id);
    setCategoryForm({
      label: nextCategory.label,
      icon: nextCategory.icon,
      color: nextCategory.color,
      tone: nextCategory.tone,
    });
    setCategoryError("");
    void playSettingsFeedback(existingCategory ? "light" : "success");
    showAppToast({
      icon: existingCategory ? "pricetag-outline" : "add-circle-outline",
      message: nextCategory.label,
      title: existingCategory ? "Categoría actualizada" : "Categoría creada",
      variant: "success",
    });
    setSyncStatus(userId ? "Sincronizando..." : "Modo local");

    try {
      if (existingCategory) {
        await updateEventsForCategory(existingCategory.id, nextCategory);
      }

      if (userId) {
        await saveSupabaseCategory(nextCategory, userId);
        setSyncStatus("Sincronizado");
      }
    } catch (error) {
      console.warn("No se pudo guardar la categoría", error);
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

    const nextCategories = categories.filter(
      (category) => category.id !== categoryId,
    );
    const safeFallback = getFallbackCategory(nextCategories);
    const nextEvents = events.map((event) =>
      event.category === categoryId
        ? {
            ...event,
            category: safeFallback.id,
            color: safeFallback.color,
            tone: safeFallback.tone,
          }
        : event,
    );

    setCategories(nextCategories);
    setEvents(nextEvents);
    startNewCategory();
    await saveStoredCategories(nextCategories);
    await saveStoredEvents(nextEvents);
    void playSettingsFeedback("warning");
    showAppToast({
      icon: "trash-outline",
      message: "Los eventos se han reasignado a Personal.",
      title: "Categoría eliminada",
      variant: "warning",
    });
    setSyncStatus(userId ? "Sincronizando..." : "Modo local");

    try {
      if (userId) {
        await supabase
          .from("agenda_events")
          .update({
            category: safeFallback.id,
            color: safeFallback.color,
            tone: safeFallback.tone,
          })
          .eq("user_id", userId)
          .eq("category", categoryId);
        await deleteSupabaseCategory(categoryId, userId);
        setSyncStatus("Sincronizado");
      }
    } catch (error) {
      console.warn("No se pudo borrar la categoría", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "El cambio queda guardado en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  function confirmDeleteCategory(categoryId: string) {
    const eventCount = categoryCounts[categoryId] ?? 0;
    const message =
      eventCount > 0
        ? `Sus ${eventCount} eventos pasarán a Personal.`
        : "La categoría desaparecerá de tus ajustes.";

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`¿Borrar categoría? ${message}`)) {
        void deleteCategory(categoryId);
      }
      return;
    }

    Alert.alert("Borrar categoría", message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: () => {
          void deleteCategory(categoryId);
        },
      },
    ]);
  }

  function openTemplateTimePicker() {
    Keyboard.dismiss();
    const selectedTime = splitTime(templateForm.startTime);
    setTimePickerHour(selectedTime.hour);
    setTimePickerMinute(selectedTime.minute);
    setIsTemplateTimePickerOpen(true);
  }

  function closeTemplateTimePicker() {
    setIsTemplateTimePickerOpen(false);
  }

  function confirmTemplateTimePicker() {
    setTemplateForm((currentForm) => ({
      ...currentForm,
      startTime: `${timePickerHour}:${timePickerMinute}`,
    }));
    setIsTemplateTimePickerOpen(false);
  }

  function addTemplateTask() {
    const title = templateForm.taskDraft.trim();

    if (!title) {
      return;
    }

    setTemplateForm((currentForm) => ({
      ...currentForm,
      taskDraft: "",
      tasks: [...currentForm.tasks, title],
    }));
  }

  function updateTemplateTask(index: number, title: string) {
    setTemplateForm((currentForm) => ({
      ...currentForm,
      tasks: currentForm.tasks.map((task, taskIndex) =>
        taskIndex === index ? title : task,
      ),
    }));
  }

  function deleteTemplateTask(index: number) {
    setTemplateForm((currentForm) => ({
      ...currentForm,
      tasks: currentForm.tasks.filter(
        (_task, taskIndex) => taskIndex !== index,
      ),
    }));
  }

  async function saveTemplate() {
    const label = templateForm.label.trim();
    const title = templateForm.title.trim();

    if (!label || !title) {
      setTemplateError("Pon nombre y titulo a la plantilla.");
      showAppToast({
        icon: "alert-circle-outline",
        message: "Añade nombre y título antes de guardar.",
        title: "Falta completar la plantilla",
        variant: "danger",
      });
      return;
    }

    const existingTemplate = editingTemplateId
      ? eventTemplates.find((template) => template.id === editingTemplateId)
      : undefined;
    const tasks = templateForm.tasks.map((task) => task.trim()).filter(Boolean);
    const nextTemplate: EventTemplate = {
      id:
        existingTemplate?.id ??
        createTemplateId(
          label,
          eventTemplates.map((template) => template.id),
        ),
      label,
      title,
      description: templateForm.description.trim(),
      location: templateForm.location.trim(),
      reminder: templateForm.reminder,
      startTime: templateForm.startTime.trim() || "09:00",
      categoryId: templateForm.categoryId || FALLBACK_CATEGORY_ID,
      icon: templateForm.icon,
      tasks,
      sortOrder: existingTemplate?.sortOrder ?? eventTemplates.length,
      isDefault: existingTemplate?.isDefault ?? false,
    };
    const nextTemplates = sortEventTemplates(
      existingTemplate
        ? eventTemplates.map((template) =>
            template.id === existingTemplate.id ? nextTemplate : template,
          )
        : [...eventTemplates, nextTemplate],
    );

    setEventTemplates(nextTemplates);
    setEditingTemplateId(nextTemplate.id);
    setTemplateError("");
    await saveStoredEventTemplates(nextTemplates);
    void playSettingsFeedback(existingTemplate ? "light" : "success");
    showAppToast({
      icon: existingTemplate ? "create-outline" : "sparkles-outline",
      message: nextTemplate.label,
      title: existingTemplate ? "Plantilla actualizada" : "Plantilla creada",
      variant: "success",
    });
    setSyncStatus(userId ? "Sincronizando..." : "Modo local");

    try {
      if (userId) {
        await saveSupabaseEventTemplates([nextTemplate], userId);
        setSyncStatus("Sincronizado");
      }
    } catch (error) {
      console.warn("No se pudo guardar la plantilla", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "Se ha guardado en este dispositivo.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  async function deleteTemplate(templateId: string) {
    const nextTemplates = eventTemplates.filter(
      (template) => template.id !== templateId,
    );

    setEventTemplates(nextTemplates);
    startNewTemplate(categories[0]?.id ?? FALLBACK_CATEGORY_ID);
    await saveStoredEventTemplates(nextTemplates);
    void playSettingsFeedback("warning");
    showAppToast({
      icon: "trash-outline",
      title: "Plantilla eliminada",
      variant: "warning",
    });
    setSyncStatus(userId ? "Sincronizando..." : "Modo local");

    try {
      if (userId) {
        await deleteSupabaseEventTemplate(templateId, userId);
        setSyncStatus("Sincronizado");
      }
    } catch (error) {
      console.warn("No se pudo borrar la plantilla", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "El cambio queda guardado en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  function confirmDeleteTemplate(templateId: string) {
    const template = eventTemplates.find((item) => item.id === templateId);
    const message = `La plantilla ${template?.label ?? ""} desaparecera del selector de nuevos eventos.`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`Borrar plantilla\n\n${message}`)) {
        void deleteTemplate(templateId);
      }
      return;
    }

    Alert.alert("Borrar plantilla", message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: () => {
          void deleteTemplate(templateId);
        },
      },
    ]);
  }

  async function restoreEventFromTrash(eventId: string) {
    const restoredEvent = events.find((event) => event.id === eventId);

    if (!restoredEvent) {
      return;
    }

    const nextEvent = { ...restoredEvent, deletedAt: undefined };
    const nextEvents = events.map((event) =>
      event.id === eventId ? nextEvent : event,
    );

    setEvents(nextEvents);
    await saveStoredEvents(nextEvents);
    void playSettingsFeedback("success");
    showAppToast({
      icon: "return-down-back-outline",
      message: nextEvent.title,
      title: "Evento restaurado",
      variant: "success",
    });
    setSyncStatus(userId ? "Sincronizando..." : "Modo local");

    try {
      if (userId) {
        await saveSupabaseEvents([nextEvent], userId);
        setSyncStatus("Sincronizado");
      }
    } catch (error) {
      console.warn("No se pudo restaurar el evento", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "La restauración queda guardada en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  async function permanentlyDeleteEvent(eventId: string) {
    const deletedEventTitle =
      events.find((event) => event.id === eventId)?.title ?? "Evento";
    const nextEvents = events.filter((event) => event.id !== eventId);
    const nextTasks = eventTasks.filter((task) => task.eventId !== eventId);

    setEvents(nextEvents);
    setEventTasks(nextTasks);
    await saveStoredEvents(nextEvents);
    await saveStoredEventTasks(nextTasks);
    void playSettingsFeedback("warning");
    showAppToast({
      icon: "trash-outline",
      message: deletedEventTitle,
      title: "Evento eliminado definitivamente",
      variant: "danger",
    });
    setSyncStatus(userId ? "Sincronizando..." : "Modo local");

    try {
      if (userId) {
        const { error: deleteTasksError } = await supabase
          .from("agenda_event_tasks")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId);

        if (deleteTasksError) {
          throw deleteTasksError;
        }

        const { error: deleteEventError } = await supabase
          .from("agenda_events")
          .delete()
          .eq("id", eventId)
          .eq("user_id", userId);

        if (deleteEventError) {
          throw deleteEventError;
        }

        setSyncStatus("Sincronizado");
      }
    } catch (error) {
      console.warn("No se pudo eliminar definitivamente el evento", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "El cambio queda guardado en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  async function restoreAllEventsFromTrash() {
    if (deletedEvents.length === 0) {
      return;
    }

    const restoredEvents = deletedEvents.map((event) => ({
      ...event,
      deletedAt: undefined,
    }));
    const restoredById = new Map(
      restoredEvents.map((event) => [event.id, event]),
    );
    const nextEvents = events.map((event) =>
      restoredById.get(event.id) ?? event,
    );

    setEvents(nextEvents);
    await saveStoredEvents(nextEvents);
    void playSettingsFeedback("success");
    showAppToast({
      icon: "return-down-back-outline",
      message: `${restoredEvents.length} eventos`,
      title: "Papelera restaurada",
      variant: "success",
    });
    setSyncStatus(userId ? "Sincronizando..." : "Modo local");

    try {
      if (userId) {
        await saveSupabaseEvents(restoredEvents, userId);
        setSyncStatus("Sincronizado");
      }
    } catch (error) {
      console.warn("No se pudo restaurar la papelera", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "La restauración queda guardada en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  async function permanentlyDeleteAllTrashEvents() {
    if (deletedEvents.length === 0) {
      return;
    }

    const deletedEventIds = deletedEvents.map((event) => event.id);
    const deletedEventIdSet = new Set(deletedEventIds);
    const nextEvents = events.filter((event) => !deletedEventIdSet.has(event.id));
    const nextTasks = eventTasks.filter(
      (task) => !deletedEventIdSet.has(task.eventId),
    );

    setEvents(nextEvents);
    setEventTasks(nextTasks);
    await saveStoredEvents(nextEvents);
    await saveStoredEventTasks(nextTasks);
    void playSettingsFeedback("warning");
    showAppToast({
      icon: "trash-outline",
      message: `${deletedEventIds.length} eventos`,
      title: "Papelera vaciada",
      variant: "danger",
    });
    setSyncStatus(userId ? "Sincronizando..." : "Modo local");

    try {
      if (userId) {
        const { error: deleteTasksError } = await supabase
          .from("agenda_event_tasks")
          .delete()
          .in("event_id", deletedEventIds)
          .eq("user_id", userId);

        if (deleteTasksError) {
          throw deleteTasksError;
        }

        const { error: deleteEventsError } = await supabase
          .from("agenda_events")
          .delete()
          .in("id", deletedEventIds)
          .eq("user_id", userId);

        if (deleteEventsError) {
          throw deleteEventsError;
        }

        setSyncStatus("Sincronizado");
      }
    } catch (error) {
      console.warn("No se pudo vaciar la papelera", error);
      showAppToast({
        icon: "cloud-offline-outline",
        message: "El cambio queda guardado en local.",
        title: "Sin conexión con la nube",
        variant: "warning",
      });
      setSyncStatus("Modo local");
    }
  }

  function confirmPermanentlyDeleteEvent(eventId: string) {
    const event = events.find((item) => item.id === eventId);
    const message = `Esta acción eliminará ${event?.title ?? "este evento"} para siempre. No se podrá deshacer.`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`Eliminar definitivamente\n\n${message}`)) {
        void permanentlyDeleteEvent(eventId);
      }
      return;
    }

    Alert.alert("Eliminar definitivamente", message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void permanentlyDeleteEvent(eventId);
        },
      },
    ]);
  }

  function confirmEmptyTrash() {
    if (deletedEvents.length === 0) {
      return;
    }

    const message = `Se eliminarán definitivamente ${deletedEvents.length} eventos y sus tareas. No se podrá deshacer.`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`Vaciar papelera\n\n${message}`)) {
        void permanentlyDeleteAllTrashEvents();
      }
      return;
    }

    Alert.alert("Vaciar papelera", message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Vaciar",
        style: "destructive",
        onPress: () => {
          void permanentlyDeleteAllTrashEvents();
        },
      },
    ]);
  }

  async function createBackupPayload(): Promise<AgendaBackup> {
    let backupCategories = categories;
    let backupEvents = events;
    let backupTasks = eventTasks;
    let backupTemplates = eventTemplates;

    try {
      if (userId) {
        const [remoteCategories, remoteEvents, remoteTasks, remoteTemplates] =
          await Promise.all([
            loadSupabaseCategories(userId),
            loadSupabaseEvents(userId),
            loadSupabaseEventTasks(userId),
            loadSupabaseEventTemplates(userId),
          ]);

        backupCategories = await ensureDefaultCategories(
          remoteCategories.length > 0 ? remoteCategories : backupCategories,
        );
        backupEvents = remoteEvents.length > 0 ? remoteEvents : backupEvents;
        backupTasks = remoteTasks.length > 0 ? remoteTasks : backupTasks;
        backupTemplates =
          remoteTemplates.length > 0 ? remoteTemplates : backupTemplates;
      }
    } catch (error) {
      console.warn("No se pudo refrescar Supabase para la copia", error);
      setBackupStatus("Exportando la copia local disponible.");
    }

    return {
      app: "agenda-app",
      data: {
        categories: await ensureDefaultCategories(backupCategories),
        eventTasks: backupTasks,
        events: backupEvents,
        templates: await ensureDefaultEventTemplates(backupTemplates),
      },
      exportedAt: new Date().toISOString(),
      version: 1,
    };
  }

  async function exportBackup() {
    if (isBackupBusy) {
      return;
    }

    setIsBackupBusy(true);
    setBackupStatus("Preparando copia...");

    try {
      const backup = await createBackupPayload();
      const fileName = createBackupFileName();
      const serializedBackup = JSON.stringify(backup, null, 2);

      if (Platform.OS === "web") {
        const didDownload = downloadTextFileOnWeb(fileName, serializedBackup);

        if (!didDownload) {
          throw new Error("No se pudo iniciar la descarga web.");
        }
      } else {
        const backupFile = new File(Paths.cache, fileName);
        backupFile.create({ intermediates: true, overwrite: true });
        backupFile.write(serializedBackup);

        const canShare = await Sharing.isAvailableAsync();

        if (!canShare) {
          throw new Error("El sistema no permite compartir archivos.");
        }

        await Sharing.shareAsync(backupFile.uri, {
          dialogTitle: "Exportar copia de agenda",
          mimeType: "application/json",
          UTI: "public.json",
        });
      }

      setBackupStatus(
        `Copia lista: ${backup.data.events.length} eventos, ${backup.data.eventTasks.length} tareas y ${backup.data.categories.length} categorias.`,
      );
      showAppToast({
        icon: "download-outline",
        message: `${backup.data.events.length} eventos · ${backup.data.eventTasks.length} tareas`,
        title: "Copia exportada",
        variant: "success",
      });
    } catch (error) {
      console.warn("No se pudo exportar la copia de seguridad", error);
      setBackupStatus("No se pudo exportar la copia.");
      showAppToast({
        icon: "alert-circle-outline",
        message: "Revisa el archivo o los permisos del dispositivo.",
        title: "No se pudo exportar",
        variant: "danger",
      });
    } finally {
      setIsBackupBusy(false);
    }
  }

  function confirmApplyBackup(backup: AgendaBackup) {
    const message = `Se reemplazaran los datos actuales por ${backup.data.events.length} eventos, ${backup.data.eventTasks.length} tareas y ${backup.data.categories.length} categorias.`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`Importar copia de seguridad\n\n${message}`)) {
        void applyBackup(backup);
      }
      return;
    }

    Alert.alert("Importar copia", message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Importar",
        style: "destructive",
        onPress: () => {
          void applyBackup(backup);
        },
      },
    ]);
  }

  async function importBackup() {
    if (isBackupBusy) {
      return;
    }

    setIsBackupBusy(true);
    setBackupStatus("Leyendo archivo...");

    try {
      const result = await DocumentPicker.getDocumentAsync({
        base64: false,
        copyToCacheDirectory: true,
        multiple: false,
        type: ["application/json", "text/plain"],
      });

      if (result.canceled || result.assets.length === 0) {
        setBackupStatus("");
        setIsBackupBusy(false);
        return;
      }

      const backupText = await readBackupAssetText(result.assets[0]);
      const backup = normalizeAgendaBackup(JSON.parse(backupText));

      if (!backup) {
        throw new Error("El archivo no tiene el formato de la agenda.");
      }

      setIsBackupBusy(false);
      confirmApplyBackup(backup);
    } catch (error) {
      console.warn("No se pudo leer la copia de seguridad", error);
      setBackupStatus("No se pudo leer ese archivo.");
      showAppToast({
        icon: "alert-circle-outline",
        message: "El archivo no parece una copia válida de Agenda.",
        title: "No se pudo importar",
        variant: "danger",
      });
      setIsBackupBusy(false);
    }
  }

  async function applyBackup(backup: AgendaBackup) {
    setIsBackupBusy(true);
    setBackupStatus("Importando copia...");
    setSyncStatus(userId ? "Sincronizando..." : "Modo local");

    const nextCategories = await ensureDefaultCategories(
      backup.data.categories,
    );
    const nextTemplates = await ensureDefaultEventTemplates(
      backup.data.templates,
    );
    const categoriesById = nextCategories.reduce(
      (categoryMap, category) => ({
        ...categoryMap,
        [category.id]: category,
      }),
      {} as Record<string, AgendaCategory>,
    );
    const fallbackCategory = getFallbackCategory(nextCategories);
    const nextEvents = backup.data.events.map((event) => {
      const eventCategory = categoriesById[event.category] ?? fallbackCategory;

      return {
        ...event,
        category: eventCategory.id,
        color: eventCategory.color,
        tone: eventCategory.tone,
      };
    });
    const eventIds = new Set(nextEvents.map((event) => event.id));
    const nextTasks = backup.data.eventTasks.filter((task) =>
      eventIds.has(task.eventId),
    );

    try {
      if (userId) {
        await replaceSupabaseBackupData(
          nextCategories,
          nextEvents,
          nextTasks,
          nextTemplates,
          userId,
        );
      }

      await saveStoredCategories(nextCategories);
      await saveStoredEvents(nextEvents);
      await saveStoredEventTasks(nextTasks);
      await saveStoredEventTemplates(nextTemplates);
      setCategories(nextCategories);
      setEvents(nextEvents);
      setEventTasks(nextTasks);
      setEventTemplates(nextTemplates);
      selectCategory(getFallbackCategory(nextCategories));
      startNewTemplate(getFallbackCategory(nextCategories).id);
      setSyncStatus(userId ? "Sincronizado" : "Modo local");
      setBackupStatus(
        `Copia importada: ${nextEvents.length} eventos y ${nextTasks.length} tareas.`,
      );
      showAppToast({
        icon: "cloud-upload-outline",
        message: `${nextEvents.length} eventos · ${nextTasks.length} tareas`,
        title: "Copia importada",
        variant: "success",
      });
    } catch (error) {
      console.warn("No se pudo importar la copia de seguridad", error);
      setSyncStatus("Modo local");
      setBackupStatus("No se pudo importar la copia.");
      showAppToast({
        icon: "alert-circle-outline",
        message: "No se han reemplazado los datos actuales.",
        title: "Importación cancelada",
        variant: "danger",
      });
    } finally {
      setIsBackupBusy(false);
    }
  }

  async function refreshSettings() {
    await loadSettings(userId);
  }

  async function signOut() {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setSyncStatus("Modo local");
    setEvents([]);
    setEventTasks([]);
    setCategories(createDefaultCategories());
    setEventTemplates(createDefaultEventTemplates());
    showAppToast({
      icon: "log-out-outline",
      title: "Sesión cerrada",
      variant: "info",
    });
    setIsLoading(false);
  }

  function confirmSignOut() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("¿Cerrar sesión en esta agenda?")) {
        void signOut();
      }
      return;
    }

    Alert.alert("Cerrar sesión", "¿Quieres cerrar sesión en esta agenda?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  if (!hasLoadedSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <Ionicons
            name="settings-outline"
            size={34}
            color={primaryIconColor}
          />
          <Text style={styles.loadingText}>Cargando ajustes</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {mode === "main" ? (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.kicker}>Configuración</Text>
                <Text style={styles.title}>Ajustes de la app</Text>
              </View>
            </View>

            <Text style={styles.subtitle}>
              {session
                ? "Gestiona la apariencia, las categorías y las opciones que hacen que la agenda se adapte a tu forma de usarla."
                : "Gestiona la apariencia de la app. Las categorías se desbloquean al iniciar sesión."}
            </Text>

            <View style={styles.accountPanel}>
              <View style={styles.accountHeader}>
                <View style={styles.accountIcon}>
                  <Ionicons
                    name={
                      session ? "person-circle-outline" : "lock-closed-outline"
                    }
                    size={28}
                    color={primaryIconColor}
                  />
                </View>
                <View style={styles.accountTitleBlock}>
                  <Text style={styles.sectionLabel}>Cuenta</Text>
                  <Text style={styles.accountTitle} numberOfLines={1}>
                    {session ? userEmail : "Sesión no iniciada"}
                  </Text>
                  <Text style={styles.accountText} numberOfLines={2}>
                    {session
                      ? "Tus categorías y eventos se sincronizan con Supabase."
                      : "Inicia sesión desde Inicio para activar categorías privadas y sincronización."}
                  </Text>
                </View>
              </View>

              <View style={styles.accountMetaGrid}>
                <View style={styles.accountMetaItem}>
                  <Ionicons name={syncIcon} size={18} color={syncColor} />
                  <Text style={styles.accountMetaLabel}>Sincronización</Text>
                  <Text style={styles.accountMetaValue} numberOfLines={1}>
                    {syncStatus}
                  </Text>
                </View>
                <View style={styles.accountMetaItem}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={18}
                    color="#4D74B8"
                  />
                  <Text style={styles.accountMetaLabel}>Copia local</Text>
                  <Text style={styles.accountMetaValue} numberOfLines={1}>
                    {session ? localDataSummary : "Bloqueada"}
                  </Text>
                </View>
              </View>

              <View style={styles.accountActions}>
                <Pressable
                  disabled={isLoading}
                  style={[
                    styles.ghostButton,
                    isLoading && styles.disabledButton,
                  ]}
                  onPress={() => {
                    void refreshSettings();
                  }}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={17}
                    color={primaryIconColor}
                  />
                  <Text style={styles.ghostButtonText}>Recargar</Text>
                </Pressable>

                {session ? (
                  <Pressable
                    disabled={isLoading}
                    style={[
                      styles.signOutButton,
                      isLoading && styles.disabledButton,
                    ]}
                    onPress={confirmSignOut}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={17}
                      color="#B42318"
                    />
                    <Text style={styles.signOutButtonText}>Cerrar sesión</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.sectionLabel}>Apariencia</Text>
                  <Text style={styles.panelTitle}>Tema de la app</Text>
                </View>
                <View style={styles.themeStatusBadge}>
                  <Ionicons
                    name={
                      resolvedTheme === "dark"
                        ? "moon-outline"
                        : "sunny-outline"
                    }
                    size={16}
                    color={resolvedTheme === "dark" ? "#A7C7FF" : "#D28A2E"}
                  />
                  <Text style={styles.themeStatusText}>
                    {resolvedTheme === "dark" ? "Oscuro" : "Claro"}
                  </Text>
                </View>
              </View>

              <View style={styles.themeOptionsRow}>
                {THEME_OPTIONS.map((option) => {
                  const isSelected = preference === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.themeOption,
                        isSelected && styles.themeOptionSelected,
                      ]}
                      onPress={() => setPreference(option.value)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={isSelected ? "#FFFFFF" : primaryIconColor}
                      />
                      <Text
                        style={[
                          styles.themeOptionTitle,
                          isSelected && styles.themeOptionTitleSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.themeOptionText,
                          isSelected && styles.themeOptionTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}

        {session ? (
          mode === "trash" ? (
            <View style={styles.panel}>
              <View style={styles.trashViewHeader}>
                <Pressable
                  accessibilityLabel="Volver a ajustes"
                  style={styles.secondaryButton}
                  onPress={closeSettingsScreen}
                >
                  <Ionicons name="chevron-back" size={18} color={primaryIconColor} />
                  <Text style={styles.secondaryButtonText}>Ajustes</Text>
                </Pressable>
                <View style={styles.trashCountBadge}>
                  <Text style={styles.trashCountText}>
                    {deletedEvents.length}
                  </Text>
                </View>
              </View>

              <View style={styles.trashViewTitleBlock}>
                <Text style={styles.sectionLabel}>Papelera</Text>
                <Text style={styles.panelTitle}>Eventos eliminados</Text>
                <Text style={styles.trashViewText}>
                  Revisa eventos borrados, restáuralos o elimínalos para
                  siempre.
                </Text>
              </View>

              {deletedEvents.length > 0 ? (
                <View style={styles.trashBulkActions}>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => {
                      void restoreAllEventsFromTrash();
                    }}
                  >
                    <Ionicons
                      name="return-down-back-outline"
                      size={18}
                      color={primaryIconColor}
                    />
                    <Text style={styles.secondaryButtonText}>
                      Restaurar todo
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={confirmEmptyTrash}
                  >
                    <Ionicons name="trash-outline" size={18} color="#B42318" />
                    <Text style={styles.deleteButtonText}>Vaciar</Text>
                  </Pressable>
                </View>
              ) : null}

              {deletedEvents.length === 0 ? (
                <View style={styles.emptySettingsBox}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color="#3D8B7D"
                  />
                  <Text style={styles.emptySettingsText}>
                    No hay eventos en papelera.
                  </Text>
                </View>
              ) : (
                <View style={styles.trashList}>
                  {deletedEvents.map((event) => (
                    <View key={event.id} style={styles.trashItem}>
                      <View style={styles.trashItemBody}>
                        <Text style={styles.trashItemTitle} numberOfLines={1}>
                          {event.title}
                        </Text>
                        <Text style={styles.trashItemMeta} numberOfLines={1}>
                          {event.dateKey} · {event.startTime}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.trashRestoreButton}
                        onPress={() => {
                          void restoreEventFromTrash(event.id);
                        }}
                      >
                        <Text style={styles.trashRestoreButtonText}>
                          Restaurar
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.trashDeleteButton}
                        onPress={() => {
                          confirmPermanentlyDeleteEvent(event.id);
                        }}
                      >
                        <Ionicons name="close" size={17} color="#B42318" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
            {mode === "main" ? (
              <>
            <View style={styles.dataPanel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.sectionLabel}>Datos</Text>
                  <Text style={styles.panelTitle}>Estado de la agenda</Text>
                </View>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{activeEvents.length}</Text>
                  <Text style={styles.summaryLabel}>Eventos</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{eventTasks.length}</Text>
                  <Text style={styles.summaryLabel}>Tareas</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{categories.length}</Text>
                  <Text style={styles.summaryLabel}>Categorías</Text>
                </View>
              </View>

              <View style={styles.backupBox}>
                <View style={styles.backupHeader}>
                  <View style={styles.backupIcon}>
                    <Ionicons
                      name="archive-outline"
                      size={21}
                      color={primaryIconColor}
                    />
                  </View>
                  <View style={styles.backupTextBlock}>
                    <Text style={styles.backupTitle}>Copia de seguridad</Text>
                    <Text style={styles.backupText}>
                      Exporta o restaura eventos, tareas, categorías y
                      plantillas.
                    </Text>
                  </View>
                </View>

                <View style={styles.backupActions}>
                  <Pressable
                    disabled={isBackupBusy || isLoading}
                    style={[
                      styles.backupButton,
                      (isBackupBusy || isLoading) && styles.disabledButton,
                    ]}
                    onPress={() => {
                      void exportBackup();
                    }}
                  >
                    <Ionicons
                      name="download-outline"
                      size={18}
                      color={primaryIconColor}
                    />
                    <Text style={styles.backupButtonText}>Exportar JSON</Text>
                  </Pressable>
                  <Pressable
                    disabled={isBackupBusy || isLoading}
                    style={[
                      styles.backupButton,
                      styles.backupImportButton,
                      (isBackupBusy || isLoading) && styles.disabledButton,
                    ]}
                    onPress={() => {
                      void importBackup();
                    }}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.backupImportButtonText}>
                      Importar copia
                    </Text>
                  </Pressable>
                </View>

                {backupStatus ? (
                  <Text style={styles.backupStatus}>{backupStatus}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.sectionLabel}>Papelera</Text>
                  <Text style={styles.panelTitle}>Eventos eliminados</Text>
                </View>
                <View style={styles.trashCountBadge}>
                  <Text style={styles.trashCountText}>
                    {deletedEvents.length}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                style={styles.trashEntry}
                onPress={() => openSettingsRoute("trash")}
              >
                <View style={styles.trashEntryIcon}>
                  <Ionicons
                    name={
                      deletedEvents.length === 0
                        ? "checkmark-circle-outline"
                        : "trash-outline"
                    }
                    size={22}
                    color={deletedEvents.length === 0 ? "#3D8B7D" : "#B42318"}
                  />
                </View>
                <View style={styles.trashItemBody}>
                  <Text style={styles.trashItemTitle} numberOfLines={1}>
                    {deletedEvents.length === 0
                      ? "Papelera vacía"
                      : `${deletedEvents.length} eventos en papelera`}
                  </Text>
                  <Text style={styles.trashItemMeta} numberOfLines={1}>
                    Restaurar o eliminar definitivamente
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={mutedIconColor}
                />
              </Pressable>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.sectionLabel}>Organización</Text>
                  <Text style={styles.panelTitle}>Pantallas de ajustes</Text>
                </View>
              </View>

              <View style={styles.settingsLinkList}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.settingsLinkItem}
                  onPress={() => openSettingsRoute("templates")}
                >
                  <View style={styles.settingsLinkIcon}>
                    <Ionicons
                      name="albums-outline"
                      size={22}
                      color={primaryIconColor}
                    />
                  </View>
                  <View style={styles.trashItemBody}>
                    <Text style={styles.trashItemTitle} numberOfLines={1}>
                      Plantillas
                    </Text>
                    <Text style={styles.trashItemMeta} numberOfLines={1}>
                      {eventTemplates.length} atajos para nuevos eventos
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={mutedIconColor}
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  style={styles.settingsLinkItem}
                  onPress={() => openSettingsRoute("categories")}
                >
                  <View style={styles.settingsLinkIcon}>
                    <Ionicons
                      name="pricetags-outline"
                      size={22}
                      color={primaryIconColor}
                    />
                  </View>
                  <View style={styles.trashItemBody}>
                    <Text style={styles.trashItemTitle} numberOfLines={1}>
                      Categorías
                    </Text>
                    <Text style={styles.trashItemMeta} numberOfLines={1}>
                      {categories.length} categorías con icono y color
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={mutedIconColor}
                  />
                </Pressable>
              </View>
            </View>
              </>
            ) : null}

            {mode === "templates" ? (
              <>
            <View style={styles.subscreenHeader}>
              <Pressable
                accessibilityLabel="Volver a ajustes"
                style={styles.secondaryButton}
                onPress={closeSettingsScreen}
              >
                <Ionicons name="chevron-back" size={18} color={primaryIconColor} />
                <Text style={styles.secondaryButtonText}>Ajustes</Text>
              </Pressable>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.sectionLabel}>Plantillas</Text>
                  <Text style={styles.panelTitle}>
                    Atajos para nuevos eventos
                  </Text>
                </View>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() =>
                    startNewTemplate(categories[0]?.id ?? FALLBACK_CATEGORY_ID)
                  }
                >
                  <Ionicons name="add" size={18} color={primaryIconColor} />
                  <Text style={styles.secondaryButtonText}>Nueva</Text>
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.templateSettingsStrip}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {eventTemplates.map((template) => {
                  const templateCategory =
                    categories.find(
                      (category) => category.id === template.categoryId,
                    ) ?? getFallbackCategory(categories);
                  const isSelected = editingTemplateId === template.id;

                  return (
                    <Pressable
                      key={template.id}
                      style={[
                        styles.templateSettingsCard,
                        isSelected && {
                          borderColor: templateCategory.color,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : templateCategory.tone,
                        },
                      ]}
                      onPress={() => selectTemplate(template)}
                    >
                      <View
                        style={[
                          styles.templateSettingsIcon,
                          { backgroundColor: templateCategory.color },
                        ]}
                      >
                        <Ionicons
                          name={template.icon}
                          size={19}
                          color="#FFFFFF"
                        />
                      </View>
                      <Text
                        style={styles.templateSettingsTitle}
                        numberOfLines={1}
                      >
                        {template.label}
                      </Text>
                      <Text
                        style={styles.templateSettingsMeta}
                        numberOfLines={1}
                      >
                        {template.tasks.length} tareas
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.templateEditor}>
                <Text style={styles.inputLabel}>
                  {selectedTemplate ? "Editar plantilla" : "Nueva plantilla"}
                </Text>
                <TextInput
                  onChangeText={(value) =>
                    setTemplateForm((currentForm) => ({
                      ...currentForm,
                      label: value,
                    }))
                  }
                  placeholder="Ej. Merienda, médico, cumple..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                  value={templateForm.label}
                />
                <TextInput
                  onChangeText={(value) =>
                    setTemplateForm((currentForm) => ({
                      ...currentForm,
                      title: value,
                    }))
                  }
                  placeholder="Ej. Merienda, médico, cumple..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                  value={templateForm.title}
                />
                <TextInput
                  onChangeText={(value) =>
                    setTemplateForm((currentForm) => ({
                      ...currentForm,
                      location: value,
                    }))
                  }
                  placeholder="Ej. casa, restaurante, consulta..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                  value={templateForm.location}
                />
                <TextInput
                  multiline
                  onChangeText={(value) =>
                    setTemplateForm((currentForm) => ({
                      ...currentForm,
                      description: value,
                    }))
                  }
                  placeholder="Detalles, sitio, cosas que llevar..."
                  placeholderTextColor="#9CA3AF"
                  style={[styles.textInput, styles.templateDescriptionInput]}
                  textAlignVertical="top"
                  value={templateForm.description}
                />

                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Hora</Text>
                  <Pressable
                    accessibilityLabel="Seleccionar hora de la plantilla"
                    style={styles.timeSelectButton}
                    onPress={openTemplateTimePicker}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={mutedIconColor}
                    />
                    <Text style={styles.timeSelectText}>
                      {templateForm.startTime}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.templateTaskComposer}>
                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setTemplateForm((currentForm) => ({
                        ...currentForm,
                        taskDraft: value,
                      }))
                    }
                    onSubmitEditing={addTemplateTask}
                    placeholder="Añadir tarea dentro del evento"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                    scrollEnabled={false}
                    style={styles.templateTaskInput}
                    textAlignVertical="top"
                    value={templateForm.taskDraft}
                  />
                  <Pressable
                    accessibilityLabel="Añadir tarea"
                    disabled={!templateForm.taskDraft.trim()}
                    style={[
                      styles.templateTaskAddButton,
                      !templateForm.taskDraft.trim() &&
                        styles.templateTaskAddButtonDisabled,
                    ]}
                    onPress={addTemplateTask}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
                {templateForm.tasks.length === 0 ? (
                  <View style={styles.templateTaskEmptyBox}>
                    <Ionicons name="list-outline" size={18} color="#6B7280" />
                    <Text style={styles.templateTaskEmptyText}>
                      Puedes añadir tareas para que se creen con la plantilla.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.templateTaskList}>
                    {templateForm.tasks.map((task, index) => (
                      <View
                        key={`${task}-${index}`}
                        style={styles.templateTaskItem}
                      >
                        <TextInput
                          multiline
                          onChangeText={(value) =>
                            updateTemplateTask(index, value)
                          }
                          placeholder="Nombre de la tarea"
                          placeholderTextColor="#9CA3AF"
                          scrollEnabled={false}
                          style={styles.templateTaskItemInput}
                          value={task}
                        />
                        <Pressable
                          accessibilityLabel="Borrar tarea"
                          style={styles.templateTaskDeleteButton}
                          onPress={() => deleteTemplateTask(index)}
                        >
                          <Ionicons name="close" size={17} color="#B42318" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
                {templateError ? (
                  <Text style={styles.fieldError}>{templateError}</Text>
                ) : null}

                <View style={styles.templateQuickRows}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.templateOptionRow}>
                      {[
                        "15 min antes",
                        "30 min antes",
                        "1 hora antes",
                        "Sin aviso",
                      ].map((reminder) => {
                        const isSelected = templateForm.reminder === reminder;

                        return (
                          <Pressable
                            key={reminder}
                            style={[
                              styles.templateOptionChip,
                              isSelected && styles.templateOptionChipSelected,
                            ]}
                            onPress={() =>
                              setTemplateForm((currentForm) => ({
                                ...currentForm,
                                reminder,
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.templateOptionChipText,
                                isSelected &&
                                  styles.templateOptionChipTextSelected,
                              ]}
                            >
                              {reminder}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.templateOptionRow}>
                      {categories.map((category) => {
                        const isSelected =
                          templateForm.categoryId === category.id;

                        return (
                          <Pressable
                            key={category.id}
                            style={[
                              styles.templateOptionChip,
                              isSelected && {
                                backgroundColor: category.color,
                                borderColor: category.color,
                              },
                            ]}
                            onPress={() =>
                              setTemplateForm((currentForm) => ({
                                ...currentForm,
                                categoryId: category.id,
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.templateOptionChipText,
                                isSelected &&
                                  styles.templateOptionChipTextSelected,
                              ]}
                            >
                              {category.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.templateOptionRow}>
                      {CATEGORY_ICON_OPTIONS.map((icon) => {
                        const isSelected = templateForm.icon === icon;

                        return (
                          <Pressable
                            key={icon}
                            style={[
                              styles.iconOption,
                              isSelected && styles.iconOptionSelected,
                            ]}
                            onPress={() =>
                              setTemplateForm((currentForm) => ({
                                ...currentForm,
                                icon,
                              }))
                            }
                          >
                            <Ionicons
                              name={icon}
                              size={18}
                              color={isSelected ? "#FFFFFF" : primaryIconColor}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.actions}>
                  {selectedTemplate ? (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => confirmDeleteTemplate(selectedTemplate.id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={19}
                        color="#B42318"
                      />
                      <Text style={styles.deleteButtonText}>Borrar</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    disabled={isLoading}
                    style={[
                      styles.saveButton,
                      isLoading && styles.saveButtonDisabled,
                    ]}
                    onPress={() => {
                      void saveTemplate();
                    }}
                  >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      {selectedTemplate
                        ? "Guardar plantilla"
                        : "Crear plantilla"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

              </>
            ) : null}

            {mode === "categories" ? (
              <>
            <View style={styles.subscreenHeader}>
              <Pressable
                accessibilityLabel="Volver a ajustes"
                style={styles.secondaryButton}
                onPress={closeSettingsScreen}
              >
                <Ionicons name="chevron-back" size={18} color={primaryIconColor} />
                <Text style={styles.secondaryButtonText}>Ajustes</Text>
              </Pressable>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.sectionLabel}>Tus categorías</Text>
                  <Text style={styles.panelTitle}>Icono, color y contador</Text>
                </View>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={startNewCategory}
                >
                  <Ionicons name="add" size={18} color={primaryIconColor} />
                  <Text style={styles.secondaryButtonText}>Nueva</Text>
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.categoryStrip}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {categories.map((category) => {
                  const isSelected = editingCategoryId === category.id;
                  const eventCount = categoryCounts[category.id] ?? 0;

                  return (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        isSelected && {
                          backgroundColor: category.color,
                          borderColor: category.color,
                        },
                      ]}
                      onPress={() => selectCategory(category)}
                    >
                      <View
                        style={[
                          styles.categoryIcon,
                          {
                            backgroundColor: isSelected
                              ? "#FFFFFF"
                              : isDark
                                ? "rgba(255,255,255,0.08)"
                                : category.tone,
                          },
                        ]}
                      >
                        <Ionicons
                          name={category.icon}
                          size={24}
                          color={category.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryName,
                          isSelected && styles.categoryNameSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {category.label}
                      </Text>
                      <Text
                        style={[
                          styles.categoryCount,
                          isSelected && styles.categoryCountSelected,
                        ]}
                      >
                        {eventCount} {eventCount === 1 ? "evento" : "eventos"}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.panel}>
              <View style={styles.editorHeader}>
                <View
                  style={[
                    styles.editorPreviewIcon,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : categoryForm.tone,
                    },
                  ]}
                >
                  <Ionicons
                    name={categoryForm.icon}
                    size={24}
                    color={categoryForm.color}
                  />
                </View>
                <View style={styles.editorTitleBlock}>
                  <Text style={styles.sectionLabel}>
                    {selectedCategory ? "Editar categoría" : "Nueva categoría"}
                  </Text>
                  <Text style={styles.panelTitle} numberOfLines={1}>
                    {categoryForm.label.trim() || "Sin nombre"}
                  </Text>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <TextInput
                  onChangeText={(value) => {
                    setCategoryForm((currentForm) => ({
                      ...currentForm,
                      label: value,
                    }));
                    setCategoryError("");
                  }}
                  placeholder="Ej. Viajes, salud, compras..."
                  placeholderTextColor="#9CA3AF"
                  style={[
                    styles.textInput,
                    categoryError && styles.textInputError,
                  ]}
                  value={categoryForm.label}
                />
                {categoryError ? (
                  <Text style={styles.fieldError}>{categoryError}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Icono</Text>
                <View style={styles.iconGrid}>
                  {CATEGORY_ICON_OPTIONS.map((icon) => {
                    const isSelected = categoryForm.icon === icon;

                    return (
                      <Pressable
                        key={icon}
                        style={[
                          styles.iconOption,
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
                          size={19}
                          color={isSelected ? "#FFFFFF" : primaryIconColor}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.colorRow}>
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
                          selectPalette(palette.color, palette.tone)
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
                </View>
              </View>

              {selectedCategory?.id === FALLBACK_CATEGORY_ID ? (
                <View style={styles.noticeBox}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color="#3D8B7D"
                  />
                  <Text style={styles.noticeText}>
                    Personal es la categoría segura de la agenda. Puedes cambiar
                    su aspecto, pero no borrarla.
                  </Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                {selectedCategory &&
                selectedCategory.id !== FALLBACK_CATEGORY_ID ? (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => confirmDeleteCategory(selectedCategory.id)}
                  >
                    <Ionicons name="trash-outline" size={19} color="#B42318" />
                    <Text style={styles.deleteButtonText}>Borrar</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  disabled={isLoading}
                  style={[
                    styles.saveButton,
                    isLoading && styles.saveButtonDisabled,
                  ]}
                  onPress={() => {
                    void saveCategory();
                  }}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {selectedCategory ? "Guardar cambios" : "Crear categoría"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.infoPanel}>
              <Ionicons
                name="information-circle-outline"
                size={21}
                color="#4D74B8"
              />
              <Text style={styles.infoText}>
                Al borrar una categoría con eventos, esos eventos pasan
                automáticamente a Personal para no perder nada.
              </Text>
            </View>
              </>
            ) : null}
            </>
          )
        ) : (
          <View style={styles.lockedPanel}>
            <View style={styles.lockedIcon}>
              <Ionicons
                name="lock-closed-outline"
                size={25}
                color={primaryIconColor}
              />
            </View>
            <Text style={styles.lockedTitle}>Categorías privadas</Text>
            <Text style={styles.lockedText}>
              Inicia sesión desde Inicio para gestionar tus categorías, colores
              e iconos. Así evitamos mostrar datos locales de otra sesión.
            </Text>
          </View>
        )}
      </ScrollView>
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
            <Pressable
              accessibilityLabel="Cerrar aviso"
              accessibilityRole="button"
              hitSlop={8}
              style={styles.appToastCloseButton}
              onPress={hideAppToast}
            >
              <Ionicons name="close" size={17} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        );
      })() : null}
      {isTemplateTimePickerOpen ? (
        <View style={styles.timePickerOverlay}>
          <Pressable
            style={styles.timePickerBackdrop}
            onPress={closeTemplateTimePicker}
          />
          <View style={styles.timePickerCard}>
            <View style={styles.timePickerHeader}>
              <View>
                <Text style={styles.timePickerSectionLabel}>
                  Hora del evento
                </Text>
                <Text style={styles.timePickerTitle}>
                  {timePickerHour}:{timePickerMinute}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar selector de hora"
                style={styles.timePickerCloseButton}
                onPress={closeTemplateTimePicker}
              >
                <Ionicons name="close" size={22} color={primaryIconColor} />
              </Pressable>
            </View>

            <View style={styles.timePickerColumns}>
              <View style={styles.timePickerColumn}>
                <Text style={styles.timePickerInputLabel}>Hora</Text>
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
                            isSelected && styles.timePickerOptionTextSelected,
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
                <Text style={styles.timePickerInputLabel}>Minutos</Text>
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
                            isSelected && styles.timePickerOptionTextSelected,
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
              style={styles.timePickerSaveButton}
              onPress={confirmTemplateTimePicker}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.timePickerSaveButtonText}>
                Usar esta hora
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function SettingsScreen() {
  return <SettingsScreenContent mode="main" />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F5F0",
  },
  loadingScreen: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
  },
  loadingText: {
    color: "#1F2A37",
    fontSize: 17,
    fontWeight: "800",
  },
  content: {
    paddingBottom: 36,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  kicker: {
    color: "#7C6250",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    color: "#1F2A37",
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
  },
  subtitle: {
    color: "#5F6B7A",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 12,
  },
  accountPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  accountHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  accountIcon: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  accountTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  accountTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  accountText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 4,
  },
  accountMetaGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  accountMetaItem: {
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 82,
    padding: 12,
  },
  accountMetaLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 8,
    textTransform: "uppercase",
  },
  accountMetaValue: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },
  accountActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  ghostButton: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
  },
  ghostButtonText: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "900",
  },
  signOutButton: {
    alignItems: "center",
    backgroundColor: "#FEF3F2",
    borderColor: "#FECACA",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
  },
  signOutButtonText: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.62,
  },
  themeStatusBadge: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  themeStatusText: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "900",
  },
  themeOptionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  themeOption: {
    alignItems: "flex-start",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 92,
    padding: 11,
  },
  themeOptionSelected: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  themeOptionTitle: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "900",
  },
  themeOptionTitleSelected: {
    color: "#FFFFFF",
  },
  themeOptionText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "800",
  },
  themeOptionTextSelected: {
    color: "#D8DEE9",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 76,
    padding: 13,
  },
  summaryValue: {
    color: "#1F2A37",
    fontSize: 24,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  dataPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  backupBox: {
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 13,
  },
  backupHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  backupIcon: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  backupTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  backupTitle: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "900",
  },
  backupText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 3,
  },
  backupActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  backupButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10,
  },
  backupImportButton: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  backupButtonText: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "900",
  },
  backupImportButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  backupStatus: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 10,
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
  appToastCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  trashCountBadge: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    minWidth: 34,
    paddingHorizontal: 10,
  },
  trashCountText: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "900",
  },
  trashViewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  trashViewTitleBlock: {
    marginTop: 18,
  },
  trashViewText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 6,
  },
  trashBulkActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  subscreenHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  settingsLinkList: {
    gap: 10,
    marginTop: 14,
  },
  settingsLinkItem: {
    alignItems: "center",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 12,
  },
  settingsLinkIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  trashEntry: {
    alignItems: "center",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    minHeight: 62,
    paddingHorizontal: 12,
  },
  trashEntryIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  emptySettingsBox: {
    alignItems: "center",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    padding: 13,
  },
  emptySettingsText: {
    color: "#6B7280",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  trashList: {
    gap: 8,
    marginTop: 14,
  },
  trashItem: {
    alignItems: "center",
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 10,
  },
  trashItemBody: {
    flex: 1,
    minWidth: 0,
  },
  trashItemTitle: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "900",
  },
  trashItemMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  trashRestoreButton: {
    backgroundColor: "#E7F4F1",
    borderColor: "#CFE7E1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  trashRestoreButtonText: {
    color: "#27675C",
    fontSize: 12,
    fontWeight: "900",
  },
  trashDeleteButton: {
    alignItems: "center",
    backgroundColor: "#FEF3F2",
    borderColor: "#FECACA",
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  templateSettingsStrip: {
    gap: 10,
    paddingTop: 14,
  },
  templateSettingsCard: {
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 104,
    padding: 12,
    width: 124,
  },
  templateSettingsIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  templateSettingsTitle: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 9,
  },
  templateSettingsMeta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  templateEditor: {
    gap: 10,
    marginTop: 16,
  },
  templateTasksInput: {
    minHeight: 92,
  },
  templateDescriptionInput: {
    minHeight: 76,
  },
  templateQuickRows: {
    gap: 10,
  },
  templateOptionRow: {
    flexDirection: "row",
    gap: 8,
  },
  templateOptionChip: {
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  templateOptionChipSelected: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  templateOptionChipText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "900",
  },
  templateOptionChipTextSelected: {
    color: "#FFFFFF",
  },
  iconOptionSelected: {
    backgroundColor: "#1F2A37",
    borderColor: "#1F2A37",
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#ECE3D8",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionLabel: {
    color: "#8A6F5A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  panelTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  secondaryButtonText: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "900",
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  categoryStrip: {
    gap: 10,
    paddingTop: 14,
  },
  categoryCard: {
    backgroundColor: "#FAF8F4",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 116,
    padding: 12,
    width: 124,
  },
  categoryIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  categoryName: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 10,
  },
  categoryNameSelected: {
    color: "#FFFFFF",
  },
  categoryCount: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  categoryCountSelected: {
    color: "#FFFFFF",
    opacity: 0.9,
  },
  editorHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  editorPreviewIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  editorTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
    minHeight: 50,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  textInputError: {
    borderColor: "#B42318",
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
  timePickerCloseButton: {
    alignItems: "center",
    backgroundColor: "#F7F3EC",
    borderColor: "#ECE3D8",
    borderRadius: 15,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  fieldError: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 7,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconOption: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  noticeBox: {
    alignItems: "center",
    backgroundColor: "#E7F4F1",
    borderColor: "#CFE7E1",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginBottom: 16,
    padding: 12,
  },
  noticeText: {
    color: "#1F2A37",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },

  templateTaskComposer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
  },
  templateTaskInput: {
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    minHeight: 50,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  templateTaskAddButton: {
    alignItems: "center",
    backgroundColor: "#1F2A37",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  templateTaskAddButtonDisabled: {
    opacity: 0.45,
  },
  templateTaskEmptyBox: {
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    padding: 12,
  },
  templateTaskEmptyText: {
    color: "#6B7280",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  templateTaskList: {
    gap: 8,
    marginTop: 10,
  },
  templateTaskItem: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  templateTaskItemInput: {
    color: "#111827",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    minHeight: 36,
  },
  templateTaskDeleteButton: {
    alignItems: "center",
    backgroundColor: "#FEF3F2",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
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
  timePickerSectionLabel: {
    color: "#8A6F5A",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
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
  timePickerInputLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
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
  timePickerSaveButton: {
    alignItems: "center",
    backgroundColor: "#172033",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  timePickerSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#FEF3F2",
    borderColor: "#FECACA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "900",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#1F2A37",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  infoPanel: {
    alignItems: "flex-start",
    backgroundColor: "#EAF0FB",
    borderColor: "#D8E3F7",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginTop: 16,
    padding: 14,
  },
  infoText: {
    color: "#1F2A37",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  lockedPanel: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE7DC",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  lockedIcon: {
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderColor: "#E8DFD3",
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  lockedTitle: {
    color: "#1F2A37",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
  },
  lockedText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
});

type SettingsStyles = typeof styles;

function getDarkSettingsStyleColor(propertyName: string, color: string) {
  const normalizedColor = color.toUpperCase();
  const isTextColor = propertyName === "color";
  const isBorderColor = propertyName.toLowerCase().includes("border");
  const isBackgroundColor = propertyName.toLowerCase().includes("background");

  if (isTextColor) {
    if (
      ["#1F2A37", "#172033", "#111827", "#374151"].includes(normalizedColor)
    ) {
      return "#F8FAFC";
    }

    if (
      ["#5F6B7A", "#6B7280", "#7C6250", "#8A6F5A"].includes(normalizedColor)
    ) {
      return "#CBD5E1";
    }

    return color;
  }

  if (isBorderColor) {
    if (
      [
        "#CFE7E1",
        "#D8E3F7",
        "#E8DFD3",
        "#ECE3D8",
        "#EFE7DC",
        "#F4D7B2",
        "#FECACA",
      ].includes(normalizedColor)
    ) {
      return "#273244";
    }

    if (["#1F2A37", "#172033"].includes(normalizedColor)) {
      return "#475569";
    }

    return color;
  }

  if (isBackgroundColor) {
    if (
      ["#F7F5F0", "#FAF8F4", "#F9F7F3", "#F7F3EC", "#F0EBE3"].includes(
        normalizedColor,
      )
    ) {
      return "#0F172A";
    }

    if (["#FFFFFF", "#F3F4F6"].includes(normalizedColor)) {
      return "#111827";
    }

    if (["#1F2A37", "#172033"].includes(normalizedColor)) {
      return "#334155";
    }

    if (["#FEF3F2"].includes(normalizedColor)) {
      return "#3B1717";
    }

    if (["#E7F4F1"].includes(normalizedColor)) {
      return "#12362F";
    }

    if (["#EAF0FB"].includes(normalizedColor)) {
      return "#12233F";
    }

    if (["#FFF1DF"].includes(normalizedColor)) {
      return "#3B2A12";
    }
  }

  return color;
}

function createDarkSettingsStyleOverrides<T extends Record<string, unknown>>(
  baseStyles: T,
) {
  return Object.entries(baseStyles).reduce(
    (overrides, [styleName, styleValue]) => {
      if (
        !styleValue ||
        typeof styleValue !== "object" ||
        Array.isArray(styleValue)
      ) {
        return overrides;
      }

      const nextStyle = Object.entries(styleValue).reduce(
        (styleOverride, [propertyName, propertyValue]) => {
          if (typeof propertyValue !== "string") {
            return styleOverride;
          }

          const nextColor = getDarkSettingsStyleColor(
            propertyName,
            propertyValue,
          );

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

const darkStyleOverrides = StyleSheet.create(
  createDarkSettingsStyleOverrides(styles),
);

function getSettingsStyles(isDark: boolean): SettingsStyles {
  if (!isDark) {
    return styles;
  }

  return Object.keys(styles).reduce((mergedStyles, styleName) => {
    const key = styleName as keyof SettingsStyles;

    return {
      ...mergedStyles,
      [key]: darkStyleOverrides[key]
        ? [styles[key], darkStyleOverrides[key]]
        : styles[key],
    };
  }, {} as SettingsStyles);
}
