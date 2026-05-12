import { File, Paths } from "expo-file-system";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform, useColorScheme } from "react-native";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

type BrowserLocalStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type AppThemeContextValue = {
  isDark: boolean;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const THEME_STORAGE_KEY = "agenda-app/theme-preference";
const THEME_STORAGE_FILE = "agenda-theme.json";

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function getThemeFile() {
  return new File(Paths.document, THEME_STORAGE_FILE);
}

async function loadStoredThemePreference() {
  try {
    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      const storedPreference = localStorage?.getItem(THEME_STORAGE_KEY);

      return isThemePreference(storedPreference) ? storedPreference : "system";
    }

    const themeFile = getThemeFile();

    if (!themeFile.exists) {
      return "system";
    }

    const parsedPreference: unknown = JSON.parse(await themeFile.text());
    return isThemePreference(parsedPreference) ? parsedPreference : "system";
  } catch (error) {
    console.warn("No se pudo cargar el tema guardado", error);
    return "system";
  }
}

function saveStoredThemePreference(preference: ThemePreference) {
  try {
    if (Platform.OS === "web") {
      const localStorage = (
        globalThis as { localStorage?: BrowserLocalStorage }
      ).localStorage;
      localStorage?.setItem(THEME_STORAGE_KEY, preference);
      return;
    }

    const themeFile = getThemeFile();

    if (!themeFile.exists) {
      themeFile.create({ intermediates: true, overwrite: true });
    }

    themeFile.write(JSON.stringify(preference));
  } catch (error) {
    console.warn("No se pudo guardar el tema", error);
  }
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] =
    useState<ThemePreference>("system");
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);
  const resolvedTheme: ResolvedTheme =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  useEffect(() => {
    let isMounted = true;

    async function hydrateThemePreference() {
      const storedPreference = await loadStoredThemePreference();

      if (!isMounted) {
        return;
      }

      setPreferenceState(storedPreference);
      setHasLoadedPreference(true);
    }

    hydrateThemePreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    saveStoredThemePreference(nextPreference);
  };

  const value = useMemo(
    () => ({
      isDark: resolvedTheme === "dark",
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme],
  );

  if (!hasLoadedPreference) {
    return null;
  }

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme debe usarse dentro de AppThemeProvider");
  }

  return context;
}
