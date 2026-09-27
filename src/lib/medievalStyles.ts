import { FONTS, MEDIEVAL_EFFECTS } from "./globals";

/**
 * Reusable `sx` fragments for the medieval/stained-glass look.
 * Spread these into a component's own sx so page-specific tweaks stay local.
 */

/** Carved stone panel used for cards, dialogs, and grouped surfaces. */
export const panelSx = {
  position: "relative",
  borderRadius: "6px",
  border: MEDIEVAL_EFFECTS.FRAME_BORDER,
  backgroundColor: "medievalStone.dark",
  backgroundImage: MEDIEVAL_EFFECTS.PANEL_BG,
  boxShadow: MEDIEVAL_EFFECTS.PANEL_SHADOW,
};

/** Panel that responds to pointer input (clickable cards). */
export const panelInteractiveSx = {
  ...panelSx,
  transition: MEDIEVAL_EFFECTS.TRANSITION,
  cursor: "pointer",
  ":hover": {
    transform: "translateY(-4px)",
    borderColor: "rgba(232, 207, 143, 0.62)",
    boxShadow: `${MEDIEVAL_EFFECTS.PANEL_SHADOW_HOVER}, 0 0 24px rgba(200, 162, 74, 0.28)`,
  },
};

/** Paper surface for Dialog/Modal content. */
export const dialogPaperSx = {
  ...panelSx,
  backgroundImage: MEDIEVAL_EFFECTS.PANEL_BG,
  borderColor: "rgba(200, 162, 74, 0.5)",
};

/** Gilded inscriptional heading. */
export const headingSx = {
  fontFamily: FONTS.MEDIEVAL_DISPLAY,
  color: "medievalGold.light",
  letterSpacing: "0.05em",
  textShadow: MEDIEVAL_EFFECTS.GOLD_TEXT_SHADOW,
};

/** Parchment body copy. */
export const bodySx = {
  fontFamily: FONTS.MEDIEVAL_SERIF,
  color: "parchment.dark",
  lineHeight: 1.7,
};

/** Primary action button, struck in gold. */
export const goldButtonSx = {
  fontFamily: FONTS.MEDIEVAL_DISPLAY,
  letterSpacing: "0.06em",
  borderRadius: "4px",
  color: "#12141a",
  backgroundImage:
    "linear-gradient(180deg, #e8cf8f 0%, #c8a24a 55%, #a07f2f 100%)",
  border: "1px solid rgba(232, 207, 143, 0.55)",
  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
  transition: MEDIEVAL_EFFECTS.TRANSITION,
  "&:hover": {
    backgroundImage:
      "linear-gradient(180deg, #f6e6b8 0%, #d9b45c 55%, #b08d36 100%)",
    boxShadow: "0 6px 20px rgba(200, 162, 74, 0.35)",
  },
};

/** Secondary action button, carved panel with a gold rim. */
export const outlineButtonSx = {
  fontFamily: FONTS.MEDIEVAL_DISPLAY,
  letterSpacing: "0.06em",
  borderRadius: "4px",
  color: "parchment.main",
  borderColor: "rgba(200, 162, 74, 0.45)",
  backgroundImage: MEDIEVAL_EFFECTS.PANEL_BG,
  transition: MEDIEVAL_EFFECTS.TRANSITION,
  "&:hover": {
    borderColor: "medievalGold.light",
    color: "medievalGold.light",
    boxShadow: "0 0 18px rgba(200, 162, 74, 0.28)",
  },
};

/** Text inputs with gold rules instead of the default grey. */
export const fieldSx = {
  "& .MuiInputBase-root": {
    fontFamily: FONTS.MEDIEVAL_SERIF,
    color: "parchment.main",
  },
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "rgba(200, 162, 74, 0.32)" },
    "&:hover fieldset": { borderColor: "rgba(200, 162, 74, 0.6)" },
    "&.Mui-focused fieldset": { borderColor: "#c8a24a" },
  },
  "& .MuiInputLabel-root": {
    fontFamily: FONTS.MEDIEVAL_SERIF,
    color: "rgba(230, 220, 196, 0.55)",
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#e8cf8f" },
};

/** Small jewel-toned label chip. */
export const chipSx = {
  fontFamily: FONTS.MEDIEVAL_SERIF,
  color: "parchment.main",
  bgcolor: "rgba(200, 162, 74, 0.14)",
  border: MEDIEVAL_EFFECTS.FRAME_BORDER,
};
