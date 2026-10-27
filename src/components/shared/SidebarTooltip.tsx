import type { ReactElement } from "react";
import { Tooltip } from "@mui/material";

const TOOLTIP_BG = "#1f3a5f";
const TOOLTIP_BORDER = "#c8a24a";

export default function SidebarTooltip({
  title,
  children,
}: {
  title: string;
  children: ReactElement;
}) {
  return (
    <Tooltip
      title={title}
      placement="right"
      arrow
      disableFocusListener
      disableTouchListener
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: TOOLTIP_BG,
            color: "#f3e7c4",
            border: `1px solid ${TOOLTIP_BORDER}`,
            borderRadius: "6px",
            fontSize: "0.8rem",
            px: 1.5,
            py: 1,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
          },
        },
        arrow: {
          sx: {
            color: TOOLTIP_BG,
            "&::before": {
              backgroundColor: TOOLTIP_BG,
              borderLeft: `1px solid ${TOOLTIP_BORDER}`,
              borderBottom: `1px solid ${TOOLTIP_BORDER}`,
              boxSizing: "border-box",
            },
          },
        },
      }}
    >
      {children}
    </Tooltip>
  );
}
