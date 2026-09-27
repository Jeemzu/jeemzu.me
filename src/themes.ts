import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    primaryGreen: Palette["primary"];
    softGreen: Palette["primary"];
    darkBackground: Palette["primary"];
    cardBackground: Palette["primary"];
    textSecondary: Palette["primary"];
    medievalGold: Palette["primary"];
    medievalStone: Palette["primary"];
    parchment: Palette["primary"];
    glassRuby: Palette["primary"];
    glassSapphire: Palette["primary"];
    glassEmerald: Palette["primary"];
    glassAmber: Palette["primary"];
    glassAmethyst: Palette["primary"];
  }

  interface PaletteOptions {
    primaryGreen?: PaletteOptions["primary"];
    softGreen?: PaletteOptions["primary"];
    darkBackground?: PaletteOptions["primary"];
    cardBackground?: PaletteOptions["primary"];
    textSecondary?: PaletteOptions["primary"];
    medievalGold?: PaletteOptions["primary"];
    medievalStone?: PaletteOptions["primary"];
    parchment?: PaletteOptions["primary"];
    glassRuby?: PaletteOptions["primary"];
    glassSapphire?: PaletteOptions["primary"];
    glassEmerald?: PaletteOptions["primary"];
    glassAmber?: PaletteOptions["primary"];
    glassAmethyst?: PaletteOptions["primary"];
  }
}

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#121212",
      paper: "#1a1a1a",
    },
    primaryGreen: {
      main: "#a8d67e", // Softer, less harsh green
      contrastText: "#0a0a0a",
    },
    softGreen: {
      main: "#c5e8a4", // Even softer for accents
      contrastText: "#0a0a0a",
    },
    darkBackground: {
      main: "#1a1a1a",
      contrastText: "#e0e0e0",
    },
    cardBackground: {
      main: "#1f1f1f", // Slightly lighter than background for depth
      contrastText: "#e0e0e0",
    },
    textSecondary: {
      main: "#b0b0b0", // Softer text color for secondary content
      contrastText: "#121212",
    },
    // Medieval shell palette — used by the landing page and shared chrome only.
    medievalGold: {
      main: "#c8a24a",
      light: "#e8cf8f",
      dark: "#8a6a24",
      contrastText: "#0d0f14",
    },
    medievalStone: {
      main: "#1b1f28",
      light: "#262c38",
      dark: "#0f1219",
      contrastText: "#e6dcc4",
    },
    parchment: {
      main: "#e6dcc4",
      light: "#f2ead8",
      dark: "#a79c85",
      contrastText: "#12141a",
    },
    glassRuby: {
      main: "#b23a48",
      light: "#d96070",
      dark: "#7a2531",
      contrastText: "#f7ece6",
    },
    glassSapphire: {
      main: "#3f6fa8",
      light: "#6f9fd4",
      dark: "#27486f",
      contrastText: "#eef4fb",
    },
    glassEmerald: {
      main: "#3f8f6a",
      light: "#6fbf94",
      dark: "#265c44",
      contrastText: "#ecf7f1",
    },
    glassAmber: {
      main: "#d99b2b",
      light: "#f0c164",
      dark: "#96681a",
      contrastText: "#1a1408",
    },
    glassAmethyst: {
      main: "#7d5ba6",
      light: "#a98bcd",
      dark: "#543a73",
      contrastText: "#f2ecf8",
    },
    text: {
      primary: "#e8e8e8",
      secondary: "#b0b0b0",
    },
  },
  typography: {
    fontFamily: "NectoMono-Regular, monospace",
    h1: {
      fontSize: "3.5rem",
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: "2.5rem",
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontSize: "2rem",
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: "1.125rem",
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.7,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 500,
          padding: "10px 24px",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
        },
      },
    },
    MuiTypography: {
      defaultProps: {
        variantMapping: {
          h1: "h1",
          h2: "h2",
          h3: "h3",
          h4: "h4",
          h5: "h5",
          h6: "h6",
          subtitle1: "h6",
          subtitle2: "h6",
          body1: "span",
          body2: "span",
        },
      },
    },
  },
});

// CSS Custom Properties for use in non-MUI contexts
export const CSS_VARS = {
  "--primary-green": "#a8d67e",
  "--soft-green": "#c5e8a4",
  "--dark-background": "#1a1a1a",
  "--card-background": "#1f1f1f",
  "--text-secondary": "#b0b0b0",
} as const;

export default theme;
