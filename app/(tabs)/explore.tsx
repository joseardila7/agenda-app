import { Ionicons } from "@expo/vector-icons";
import type { Session } from "@supabase/supabase-js";
import { File, Paths } from "expo-file-system";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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

type CategoryForm = {
  label: string;
  icon: CategoryIcon;
  color: string;
  tone: string;
};

type StoredAgendaEvent = {
  id: string;
  category: string;
  color?: string;
  tone?: string;
  [key: string]: unknown;
};

type BrowserLocalStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const FALLBACK_CATEGORY_ID = "personal";
const CATEGORIES_STORAGE_KEY = "agenda-app/categories";
const CATEGORIES_STORAGE_FILE = "agenda-categories.json";
const EVENTS_STORAGE_KEY = "agenda-app/events";
const EVENTS_STORAGE_FILE = "agenda-events.json";

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
  "fitness-outline",
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

function createDefaultCategories() {
  return DEFAULT_EVENT_CATEGORIES.map((category) => ({ ...category }));
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

function normalizeStoredEvent(value: unknown): StoredAgendaEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.id !== "string") {
    return null;
  }

  return {
    ...candidate,
    id: candidate.id,
    category:
      typeof candidate.category === "string"
        ? candidate.category
        : FALLBACK_CATEGORY_ID,
    color: typeof candidate.color === "string" ? candidate.color : undefined,
    tone: typeof candidate.tone === "string" ? candidate.tone : undefined,
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

function createEmptyCategoryForm(): CategoryForm {
  return {
    label: "",
    icon: "pricetag-outline",
    color: EVENT_COLORS[0].color,
    tone: EVENT_COLORS[0].tone,
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

async function loadSupabaseEvents(userId: string) {
  const { data, error } = await supabase
    .from("agenda_events")
    .select("id,category,color,tone")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return normalizeStoredEventList(data ?? []) ?? [];
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

export default function SettingsScreen() {
  const { isDark, preference, resolvedTheme, setPreference } = useAppTheme();
  const styles = useMemo(() => getSettingsStyles(isDark), [isDark]);
  const primaryIconColor = isDark ? "#F8FAFC" : "#1F2A37";
  const [session, setSession] = useState<Session | null>(null);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);
  const [categories, setCategories] = useState(createDefaultCategories);
  const [events, setEvents] = useState<StoredAgendaEvent[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    FALLBACK_CATEGORY_ID,
  );
  const [categoryForm, setCategoryForm] = useState(createEmptyCategoryForm);
  const [categoryError, setCategoryError] = useState("");
  const [, setSyncStatus] = useState("Cargando...");
  const [isLoading, setIsLoading] = useState(true);

  const userId = session?.user.id;
  const selectedCategory = useMemo(
    () =>
      editingCategoryId
        ? categories.find((category) => category.id === editingCategoryId) ??
          null
        : null,
    [categories, editingCategoryId],
  );
  const categoryCounts = useMemo(() => {
    return events.reduce(
      (counts, event) => ({
        ...counts,
        [event.category]: (counts[event.category] ?? 0) + 1,
      }),
      {} as Record<string, number>,
    );
  }, [events]);
  const assignedEventCount = events.filter(
    (event) => event.category && event.category !== "all",
  ).length;

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
    if (!hasLoadedSession) {
      return;
    }

    void loadSettings(userId);
    // loadSettings intentionally reads the latest local form state after auth changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedSession, userId]);

  async function loadSettings(authenticatedUserId?: string) {
    setIsLoading(true);
    setSyncStatus(authenticatedUserId ? "Sincronizando..." : "Modo local");

    const storedCategories = await loadStoredCategories();
    const storedEvents = await loadStoredEvents();
    let nextCategories = await ensureDefaultCategories(
      storedCategories ?? createDefaultCategories(),
    );
    let nextEvents = storedEvents ?? [];

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

        setSyncStatus("Sincronizado");
      }
    } catch (error) {
      console.warn("No se pudieron sincronizar los ajustes", error);
      setSyncStatus("Modo local");
    }

    setCategories(nextCategories);
    setEvents(nextEvents);
    await saveStoredCategories(nextCategories);

    if (nextEvents.length > 0) {
      await saveStoredEvents(nextEvents);
    }

    if (
      editingCategoryId &&
      !nextCategories.some((category) => category.id === editingCategoryId)
    ) {
      selectCategory(getFallbackCategory(nextCategories));
    } else if (editingCategoryId === FALLBACK_CATEGORY_ID) {
      selectCategory(getFallbackCategory(nextCategories));
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

  if (!hasLoadedSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <Ionicons name="settings-outline" size={34} color={primaryIconColor} />
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

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.sectionLabel}>Apariencia</Text>
              <Text style={styles.panelTitle}>Tema de la app</Text>
            </View>
            <View style={styles.themeStatusBadge}>
              <Ionicons
                name={resolvedTheme === "dark" ? "moon-outline" : "sunny-outline"}
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

        {session ? (
          <>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{categories.length}</Text>
            <Text style={styles.summaryLabel}>Categorías</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{assignedEventCount}</Text>
            <Text style={styles.summaryLabel}>Eventos asignados</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.sectionLabel}>Tus categorías</Text>
              <Text style={styles.panelTitle}>Icono, color y contador</Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={startNewCategory}>
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
              style={[styles.textInput, categoryError && styles.textInputError]}
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
                    onPress={() => selectPalette(palette.color, palette.tone)}
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
              <Ionicons name="shield-checkmark-outline" size={18} color="#3D8B7D" />
              <Text style={styles.noticeText}>
                Personal es la categoría segura de la agenda. Puedes cambiar su
                aspecto, pero no borrarla.
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {selectedCategory && selectedCategory.id !== FALLBACK_CATEGORY_ID ? (
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
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
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
          <Ionicons name="information-circle-outline" size={21} color="#4D74B8" />
          <Text style={styles.infoText}>
            Al borrar una categoría con eventos, esos eventos pasan
            automáticamente a Personal para no perder nada.
          </Text>
        </View>
          </>
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
    </SafeAreaView>
  );
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
  syncBadge: {
    alignItems: "center",
    backgroundColor: "#EAF0FB",
    borderColor: "#D8E3F7",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  syncBadgeOnline: {
    backgroundColor: "#E7F4F1",
    borderColor: "#CFE7E1",
  },
  syncBadgeLocal: {
    backgroundColor: "#FFF1DF",
    borderColor: "#F4D7B2",
  },
  syncBadgeText: {
    color: "#1F2A37",
    fontSize: 12,
    fontWeight: "900",
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
    if (["#1F2A37", "#172033", "#111827", "#374151"].includes(normalizedColor)) {
      return "#F8FAFC";
    }

    if (["#5F6B7A", "#6B7280", "#7C6250", "#8A6F5A"].includes(normalizedColor)) {
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
      if (!styleValue || typeof styleValue !== "object" || Array.isArray(styleValue)) {
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
