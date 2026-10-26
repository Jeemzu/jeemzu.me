import { Box, Typography } from "@mui/material";
import { FONTS } from "../lib/globals";
import type { HudItem } from "./contract";

export function HudValue({ value, label, compact = false }: { value: HudItem["value"]; label: string; compact?: boolean }) {
  if (typeof value !== "object") {
    return (
      <Typography sx={{ display: "block", fontFamily: FONTS.MEDIEVAL_DISPLAY, color: "parchment.main", fontSize: compact ? "0.9rem" : "1.25rem" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </Typography>
    );
  }
  const size = compact ? 10 : 18;
  return (
    <Box
      role="img"
      aria-label={`${label} preview`}
      sx={{ display: "grid", gridTemplateColumns: `repeat(${value.columns}, ${size}px)`, gridTemplateRows: `repeat(${value.rows}, ${size}px)`, gap: "2px", my: 0.5 }}
    >
      {value.cells.map(({ row, col }) => (
        <Box
          key={`${row}-${col}`}
          sx={{
            gridRow: row + 1, gridColumn: col + 1, border: `1px solid ${value.color}`,
            bgcolor: `${value.color}33`, boxShadow: `inset 0 0 4px ${value.color}66`, borderRadius: "2px",
          }}
        />
      ))}
    </Box>
  );
}
