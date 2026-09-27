import resumePdf from "../assets/james_friedenberg_resume.pdf";

// Fonts
export const FONTS = {
  NECTO_MONO: "NectoMono-Regular",
  POIRET_ONE: "PoiretOne-Regular",
  MEDIEVAL_DISPLAY: "'Cinzel', Georgia, 'Times New Roman', serif",
  MEDIEVAL_SERIF: "'Caudex', Georgia, 'Times New Roman', serif",
} as const;

// Personal Links
export const LINKS = {
  LINKEDIN: "https://www.linkedin.com/in/james-friedenberg-664643105",
  GITHUB: "https://github.com/Jeemzu",
  MINECRAFT_CREDITS: "https://www.minecraft.net/en-us/credits",
  RESUME: resumePdf,
} as const;

// Layout Constants
export const LAYOUT = {
  SECTION_SPACING: 8, // rem units for consistent spacing
  CONTENT_MAX_WIDTH: 1200,
  ICON_SIZE: 24,
  CARD_ROTATION_RANGE: 2, // Reduced for subtlety
} as const;

// Spacing Scale (in rem)
export const SPACING = {
  XS: 0.5,
  SM: 1,
  MD: 2,
  LG: 4,
  XL: 6,
  XXL: 8,
} as const;

// Animations & Effects
export const EFFECTS = {
  HOVER_SCALE: "scale(1.02)",
  HOVER_OPACITY: 0.9,
  TRANSITION: "all 0.2s ease-in-out",
  CARD_SHADOW: "0 4px 20px rgba(0, 0, 0, 0.3)",
  CARD_SHADOW_HOVER:
    "0 4px 20px rgba(168, 214, 126, 0.3), 0 2px 8px rgba(168, 214, 126, 0.2)",
} as const;

// Carved-stone / stained-glass surface treatment for the landing page and shared chrome.
export const MEDIEVAL_EFFECTS = {
  PANEL_BG: "linear-gradient(170deg, #232838 0%, #171b25 45%, #10131b 100%)",
  PANEL_SHADOW:
    "inset 0 1px 0 rgba(232, 207, 143, 0.14), inset 0 -2px 6px rgba(0, 0, 0, 0.65), 0 10px 26px rgba(0, 0, 0, 0.55)",
  PANEL_SHADOW_HOVER:
    "inset 0 1px 0 rgba(232, 207, 143, 0.28), inset 0 -2px 6px rgba(0, 0, 0, 0.6), 0 16px 34px rgba(0, 0, 0, 0.6)",
  FRAME_BORDER: "1px solid rgba(200, 162, 74, 0.34)",
  FRAME_BORDER_STRONG: "1px solid rgba(232, 207, 143, 0.62)",
  GOLD_TEXT_SHADOW: "0 1px 2px rgba(0, 0, 0, 0.85)",
  TRANSITION: "all 0.25s ease-in-out",
} as const;

// Animation Keyframes & Durations
export const ANIMATIONS = {
  FADE_IN: {
    opacity: 0,
    transform: "translateY(30px)",
    transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
  },
  FADE_IN_VISIBLE: {
    opacity: 1,
    transform: "translateY(0)",
  },
  SLIDE_IN_LEFT: {
    opacity: 0,
    transform: "translateX(-40px)",
    transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
  },
  SLIDE_IN_LEFT_VISIBLE: {
    opacity: 1,
    transform: "translateX(0)",
  },
  SLIDE_IN_RIGHT: {
    opacity: 0,
    transform: "translateX(40px)",
    transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
  },
  SLIDE_IN_RIGHT_VISIBLE: {
    opacity: 1,
    transform: "translateX(0)",
  },
  STAGGER_DELAY: 0.1, // seconds between each item in a staggered animation
} as const;
