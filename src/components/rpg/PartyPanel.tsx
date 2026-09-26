import { Box, Typography } from "@mui/material";
import { FONTS } from "../../lib/globals";
import { useRpgStore } from "../../stores/rpgStore";

const CLASS_COLORS: Record<string, string> = {
  warrior: "#ff8a65",
  mage: "#4fc3f7",
  rogue: "#ba68c8",
};

const hpBarColor = (pct: number) =>
  pct > 50
    ? "linear-gradient(90deg, #7cb85c, #a8d67e)"
    : pct > 25
      ? "linear-gradient(90deg, #f57c00, #ffb74d)"
      : "linear-gradient(90deg, #d32f2f, #f44336)";

/** Compact party HUD with unit tiles and HP/MP bars, sourced from the latest uiState.players. */
const PartyPanel = () => {
  const party = useRpgStore((s) => s.party);
  const uiState = useRpgStore((s) => s.uiState);

  if (!party) return null;

  return (
    <Box
      sx={{
        flexShrink: 0,
        p: 1.5,
        pb: 1.25,
        borderBottom: "1px solid rgba(168, 214, 126, 0.2)",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Typography
        fontFamily={FONTS.NECTO_MONO}
        sx={{
          fontSize: "0.65rem",
          letterSpacing: 2,
          color: "rgba(168, 214, 126, 0.7)",
        }}
      >
        PARTY
      </Typography>
      {party.members.map((member) => {
        const stats = uiState?.players[member.username];
        const classColor = CLASS_COLORS[member.characterClass] ?? "#a8d67e";
        const hpPct = stats
          ? Math.max(0, Math.min(100, (stats.hp / stats.max_hp) * 100))
          : 0;
        const mpPct = stats
          ? Math.max(0, Math.min(100, (stats.mp / stats.max_mp) * 100))
          : 0;

        return (
          <Box
            key={member.username}
            sx={{ display: "flex", gap: 1, alignItems: "center" }}
          >
            {/* Unit tile — class initial stands in for a portrait until sprites exist */}
            <Box
              sx={{
                width: 32,
                height: 32,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                border: `1px solid ${classColor}`,
                borderRadius: 0.5,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                color: classColor,
                fontFamily: FONTS.NECTO_MONO,
                fontSize: "0.85rem",
                textTransform: "uppercase",
              }}
            >
              {member.characterClass.charAt(0)}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  mb: 0.25,
                }}
              >
                <Typography
                  noWrap
                  fontFamily={FONTS.NECTO_MONO}
                  sx={{ fontSize: "0.8rem", color: "#e0e0e0" }}
                >
                  {member.characterName}
                </Typography>
                <Typography
                  fontFamily={FONTS.NECTO_MONO}
                  sx={{
                    fontSize: "0.65rem",
                    color: "#909090",
                    flexShrink: 0,
                    ml: 1,
                  }}
                >
                  Lv.{stats?.level ?? 1}
                </Typography>
              </Box>
              {/* HP bar with value overlaid game-style */}
              <Box
                sx={{
                  position: "relative",
                  height: 11,
                  borderRadius: 0.5,
                  overflow: "hidden",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: `${hpPct}%`,
                    background: hpBarColor(hpPct),
                    transition: "width 0.5s ease",
                  }}
                />
                <Typography
                  sx={{
                    position: "relative",
                    textAlign: "center",
                    fontSize: "0.55rem",
                    lineHeight: "11px",
                    fontFamily: FONTS.NECTO_MONO,
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0, 0, 0, 0.9)",
                  }}
                >
                  {stats ? `${stats.hp}/${stats.max_hp}` : "—"}
                </Typography>
              </Box>
              {/* MP bar */}
              <Box
                sx={{
                  position: "relative",
                  height: 5,
                  mt: 0.5,
                  borderRadius: 0.5,
                  overflow: "hidden",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: `${mpPct}%`,
                    backgroundColor: "#4fc3f7",
                    transition: "width 0.5s ease",
                  }}
                />
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default PartyPanel;
