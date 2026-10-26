import { useId, useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FaBars, FaChevronDown, FaChevronLeft } from "react-icons/fa6";
import { bodySx, headingSx } from "../../lib/medievalStyles";

interface Section {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

export default function ActionSidebar({
  title,
  sections,
}: {
  title: string;
  sections: Section[];
}) {
  const sidebarId = useId();
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false);
  const [closedSections, setClosedSections] = useState<string[]>([]);
  const allSectionsClosed =
    sections.length > 0 &&
    sections.every((section) => closedSections.includes(section.id));
  const collapsed = manuallyCollapsed || allSectionsClosed;

  return (
    <Box
      component="aside"
      aria-label={title}
      sx={{
        width: { xs: "100%", md: collapsed ? 64 : 288 },
        flexShrink: 0,
        alignSelf: { xs: "flex-start", md: "stretch" },
        minHeight: { md: "100dvh" },
        backgroundColor: "medievalStone.dark",
        borderRight: "1px solid rgba(200,162,74,0.2)",
        p: 1,
        "& .MuiIconButton-root": { color: "medievalGold.light" },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={collapsed ? "center" : "space-between"}
      >
        {!collapsed && (
          <Typography sx={{ ...headingSx, pl: 1 }}>{title}</Typography>
        )}
        <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <IconButton
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls={`${sidebarId}-sections`}
            onClick={() => {
              if (collapsed && allSectionsClosed) setClosedSections([]);
              setManuallyCollapsed(!collapsed);
            }}
            sx={{ width: 44, height: 44 }}
          >
            {collapsed ? <FaBars size={18} /> : <FaChevronLeft size={18} />}
          </IconButton>
        </Tooltip>
      </Stack>
      <Stack
        id={`${sidebarId}-sections`}
        direction={collapsed ? { xs: "row", md: "column" } : "column"}
        sx={{ justifyContent: "center" }}
      >
        {sections.map((section) =>
          collapsed ? (
            <Tooltip key={section.id} title={section.label} placement="right">
              <IconButton
                aria-label={`Expand ${section.label}`}
                onClick={() => {
                  setClosedSections((closed) =>
                    closed.filter((id) => id !== section.id),
                  );
                  setManuallyCollapsed(false);
                }}
                sx={{ width: 44, height: 44 }}
              >
                {section.icon}
              </IconButton>
            </Tooltip>
          ) : (
            <Accordion
              key={section.id}
              disableGutters
              elevation={0}
              expanded={!closedSections.includes(section.id)}
              onChange={(_, expanded) =>
                setClosedSections((closed) =>
                  expanded
                    ? closed.filter((id) => id !== section.id)
                    : [...closed, section.id],
                )
              }
              sx={{
                background: "transparent",
                color: "parchment.main",
                "&::before": { display: "none" },
              }}
            >
              <AccordionSummary
                id={`${sidebarId}-${section.id}-heading`}
                aria-controls={`${sidebarId}-${section.id}-content`}
                expandIcon={<FaChevronDown size={12} />}
                sx={{
                  px: 1,
                  minHeight: 48,
                  "& .MuiAccordionSummary-expandIconWrapper": {
                    color: "medievalGold.light",
                  },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ display: "flex", color: "medievalGold.light" }}>
                    {section.icon}
                  </Box>
                  <Typography sx={{ ...bodySx, fontSize: "0.95rem" }}>
                    {section.label}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails
                id={`${sidebarId}-${section.id}-content`}
                sx={{
                  ml: 2.25,
                  mr: 0.5,
                  pl: 2,
                  pr: 0,
                  py: 0,
                  mb: 2,
                  borderLeft: "1px solid rgba(200,162,74,0.35)",
                }}
              >
                <Stack
                  spacing={0.5}
                  sx={{
                    "& .MuiButton-root": {
                      ...bodySx,
                      width: "100%",
                      minHeight: 44,
                      justifyContent: "flex-start",
                      textAlign: "left",
                      textTransform: "none",
                      letterSpacing: "normal",
                      px: 1,
                      py: 0.75,
                      borderRadius: 1,
                      "&:hover": {
                        color: "medievalGold.light",
                        backgroundColor: "rgba(200,162,74,0.08)",
                      },
                      "&[aria-current='page']": {
                        color: "medievalGold.light",
                        backgroundColor: "rgba(200,162,74,0.12)",
                      },
                      "&.Mui-disabled": {
                        color: "rgba(230,220,196,0.35)",
                      },
                    },
                  }}
                >
                  {section.content}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ),
        )}
      </Stack>
    </Box>
  );
}
