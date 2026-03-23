import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useState, useCallback } from "react";
import { useColorScheme } from "react-native";

import { LightTheme, DarkTheme, ThemeColors } from "@/constants/colors";

const THEME_STORAGE_KEY = "app_theme_preference";

export type ThemeMode = "light" | "dark" | "system";

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && (stored === "light" || stored === "dark" || stored === "system")) {
          setThemeMode(stored as ThemeMode);
        }
      } catch (error) {
        console.log("Error loading theme preference:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  const setTheme = useCallback(async (mode: ThemeMode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.log("Error saving theme preference:", error);
    }
  }, []);

  const isDark = themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");
  const colors: ThemeColors = isDark ? DarkTheme : LightTheme;

  return {
    themeMode,
    setTheme,
    isDark,
    colors,
    isLoading,
  };
});
