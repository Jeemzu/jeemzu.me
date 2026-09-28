import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useLocation } from "wouter";
import {
  gleamVariants,
  pageEnterVariants,
  pageExit,
} from "../../lib/motionPresets";

interface PageTransitionProps {
  /** Render prop receives the frozen location so exiting pages keep their route. */
  children: (location: string) => React.ReactNode;
}

/** Blurs content into focus; mounts with the content itself, so lazy chunks never show a loader. */
export const PageEnter = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    variants={pageEnterVariants}
    initial="initial"
    animate="enter"
    style={{ position: "relative" }}
  >
    {/* Candlelight gleam that sweeps across the incoming page. */}
    <motion.div
      aria-hidden
      variants={gleamVariants}
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: "38%",
        zIndex: 5,
        pointerEvents: "none",
        skewX: -14,
        background:
          "linear-gradient(90deg, transparent, rgba(232, 207, 143, 0.06) 32%, rgba(232, 207, 143, 0.15) 50%, rgba(232, 207, 143, 0.06) 68%, transparent)",
        mixBlendMode: "screen",
      }}
    />
    {children}
  </motion.div>
);

const PageTransition = ({ children }: PageTransitionProps) => {
  const [location] = useLocation();

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => window.scrollTo(0, 0)}
      >
        <motion.div key={location} exit={pageExit}>
          {children(location)}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
};

export default PageTransition;
