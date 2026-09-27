import type { Variants } from "motion/react";

/** Signature ease for page/panel entrances — fast start, gilded settle. */
export const GILDED_EASE = [0.22, 0.61, 0.36, 1] as const;

/** Ease for elements receding into darkness. */
export const RECEDE_EASE = [0.4, 0, 1, 1] as const;

/** Outgoing page: defocuses into darkness. */
export const pageExit = {
  opacity: 0,
  scale: 0.99,
  filter: "blur(8px)",
  transition: { duration: 0.2, ease: RECEDE_EASE },
};

/** Incoming page content: pulls into focus once its chunk is ready. */
export const pageEnterVariants: Variants = {
  initial: { opacity: 0, scale: 1.005, filter: "blur(10px)" },
  enter: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: GILDED_EASE },
    // Drop the filter after settling so it can't trap fixed descendants.
    transitionEnd: { filter: "none" },
  },
};

/** Diagonal gold band that sweeps the viewport once as a page enters. */
export const gleamVariants: Variants = {
  initial: { x: "-110%", opacity: 0 },
  enter: {
    x: "290%",
    opacity: [0, 1, 1, 0],
    transition: {
      duration: 0.85,
      delay: 0.08,
      ease: [0.3, 0, 0.3, 1],
      times: [0, 0.2, 0.75, 1],
    },
  },
};
