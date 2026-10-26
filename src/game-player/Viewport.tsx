import { useEffect, useRef, type ReactNode } from "react";
import { Box } from "@mui/material";
import type { LogicalSize, ViewportSize } from "./contract";
import { currentDpr, fitStage } from "./fit";

interface ViewportProps {
  logicalSize: LogicalSize;
  /** Receives the element games mount their canvas into. */
  hostRef: React.RefObject<HTMLDivElement | null>;
  onResize(size: ViewportSize): void;
  padding?: number;
  /** Overlays positioned over the whole viewport area (menus, pause, game over). */
  children?: ReactNode;
}

export function Viewport({ logicalSize, hostRef, onResize, padding = 16, children }: ViewportProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const area = areaRef.current;
    const host = hostRef.current;
    if (!area || !host) return;

    const update = () => {
      const { width, height } = fitStage(area.clientWidth, area.clientHeight, logicalSize, padding);
      host.style.width = `${width}px`;
      host.style.height = `${height}px`;
      onResizeRef.current({ cssWidth: width, cssHeight: height, dpr: currentDpr() });
    };

    const ro = new ResizeObserver(update);
    ro.observe(area);

    // Browser zoom and moving between monitors change DPR without always resizing the element.
    let mq: MediaQueryList | null = null;
    const watchDpr = () => {
      mq?.removeEventListener("change", onDprChange);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onDprChange);
    };
    const onDprChange = () => {
      watchDpr();
      update();
    };
    watchDpr();
    update();

    return () => {
      ro.disconnect();
      mq?.removeEventListener("change", onDprChange);
    };
  }, [logicalSize, padding, hostRef]);

  return (
    <Box
      ref={areaRef}
      sx={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        ref={hostRef}
        sx={{
          position: "relative",
          flexShrink: 0,
          boxShadow: "0 0 0 1px rgba(200, 162, 74, 0.18), 0 18px 48px rgba(0, 0, 0, 0.55)",
          "& > canvas": { outline: "none" },
        }}
      />
      {children}
    </Box>
  );
}
