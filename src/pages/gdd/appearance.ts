import { createTheme, type Theme } from "@mui/material/styles";

export interface GddAppearance {
  darkMode: boolean;
  accent: "green" | "blue" | "rose";
  rounded: boolean;
  compact: boolean;
}

export const DEFAULT_GDD_APPEARANCE: GddAppearance = {
  darkMode: false,
  accent: "green",
  rounded: true,
  compact: false,
};

const STORAGE_KEY = "gdd-appearance";

export function readGddAppearance(): GddAppearance {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    );
    if (!value || typeof value !== "object") return DEFAULT_GDD_APPEARANCE;
    const stored = value as Record<string, unknown>;
    return {
      darkMode: typeof stored.darkMode === "boolean" ? stored.darkMode : false,
      accent:
        stored.accent === "blue" || stored.accent === "rose"
          ? stored.accent
          : "green",
      rounded: typeof stored.rounded === "boolean" ? stored.rounded : true,
      compact: typeof stored.compact === "boolean" ? stored.compact : false,
    };
  } catch (cause) {
    console.warn("Could not read GDD appearance preferences.", cause);
    return DEFAULT_GDD_APPEARANCE;
  }
}

export function saveGddAppearance(value: GddAppearance) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function createGddTheme(outer: Theme, appearance: GddAppearance) {
  const dark = appearance.darkMode;
  const text = dark ? "#F3EEE3" : "#1E1E1E";
  const secondary = dark ? "#BDB8AC" : "#595650";
  const paper = dark ? "#282D30" : "#F5F1E8";
  const background = dark ? "#1B2023" : "#FBF9F3";
  const accent = {
    green: dark ? "#B4D7A7" : "#365B35",
    blue: dark ? "#A7CFF0" : "#275D85",
    rose: dark ? "#EDB5BD" : "#963D54",
  }[appearance.accent];
  return createTheme({
    ...outer,
    palette: {
      ...outer.palette,
      ...createTheme({ palette: { mode: dark ? "dark" : "light" } }).palette,
      mode: dark ? "dark" : "light",
      primary: { main: accent },
      background: { default: background, paper },
      text: { primary: text, secondary },
      divider: dark ? "#535B5F" : "#C7C2B8",
      medievalStone: { main: paper, dark: paper, light: background },
      parchment: { main: text, dark: secondary, light: text },
      medievalGold: { main: accent, light: accent, dark: accent },
    },
    components: {
      ...outer.components,
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none", borderRadius: 8, padding: "6px 12px" },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: { "&::placeholder": { color: secondary, opacity: 1 } },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: { notchedOutline: { borderColor: secondary } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { backgroundImage: "none !important", color: text },
        },
      },
    },
  });
}
