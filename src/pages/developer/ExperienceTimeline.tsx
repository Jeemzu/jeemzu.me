import {
  Typography,
  Grid,
  Card,
  Modal,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListSubheader,
  CardContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { FaCaretRight } from "react-icons/fa6";
import type {
  JourneyCardModal,
  JourneyCardProps,
} from "../../lib/MyJourneyTypes";
import { cardData, modalStyle } from "../../lib/data/JourneyData";
import { ANIMATIONS, FONTS } from "../../lib/globals";
import {
  bodySx,
  headingSx,
  panelInteractiveSx,
} from "../../lib/medievalStyles";
import { useScrollAnimation } from "../../utils/useScrollAnimation";

const JourneyCard = ({
  onClick,
  milestoneLocation,
  milestoneTitle,
  milestoneTimeline,
  milestoneDescription,
  index = 0,
  isLeftSide = true,
}: JourneyCardProps & { index?: number; isLeftSide?: boolean }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:600px)");
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  const animationStyle = isMobile
    ? ANIMATIONS.FADE_IN
    : isLeftSide
      ? ANIMATIONS.SLIDE_IN_LEFT
      : ANIMATIONS.SLIDE_IN_RIGHT;

  const visibleStyle = isMobile
    ? ANIMATIONS.FADE_IN_VISIBLE
    : isLeftSide
      ? ANIMATIONS.SLIDE_IN_LEFT_VISIBLE
      : ANIMATIONS.SLIDE_IN_RIGHT_VISIBLE;

  return (
    <Box
      ref={ref}
      sx={{
        ...animationStyle,
        ...(isVisible && visibleStyle),
        transitionDelay: `${index * ANIMATIONS.STAGGER_DELAY}s`,
      }}
    >
      <Card
        onClick={onClick}
        sx={{
          ...panelInteractiveSx,
          textAlign: "start",
          p: { xs: 3, md: 3.5 },
          width: "100%",
          height: "auto",
        }}
      >
        <CardContent>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            gutterBottom
            sx={headingSx}
          >
            {milestoneLocation}
          </Typography>
          <Typography
            fontFamily={FONTS.MEDIEVAL_SERIF}
            variant={isMobile ? "body1" : "h6"}
            sx={{ color: theme.palette.parchment.main, fontWeight: 500 }}
          >
            {milestoneTitle}
          </Typography>
          <Typography
            fontFamily={FONTS.MEDIEVAL_SERIF}
            variant="body2"
            sx={{
              color: theme.palette.parchment.dark,
              fontStyle: "italic",
              mb: 2,
            }}
          >
            {milestoneTimeline}
          </Typography>
          <br />
          <br />
          <Typography component="p" variant="body1" sx={{ ...bodySx, m: 0 }}>
            {milestoneDescription}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

const JourneyModal = (props: JourneyCardModal) => {
  const theme = useTheme();
  const {
    open,
    handleClose,
    milestoneLocation,
    milestoneTitle,
    milestoneTimeline,
    milestoneBullets,
  } = props;
  return (
    <Modal open={open || false} onClose={handleClose}>
      <Box sx={modalStyle}>
        <Typography variant="h3" gutterBottom sx={headingSx}>
          {milestoneLocation}
        </Typography>
        <Typography
          fontFamily={FONTS.MEDIEVAL_SERIF}
          variant="h6"
          gutterBottom
          sx={{ color: theme.palette.parchment.main, fontWeight: 500 }}
        >
          {milestoneTitle}
        </Typography>
        <Typography
          fontFamily={FONTS.MEDIEVAL_SERIF}
          variant="body2"
          gutterBottom
          sx={{
            color: theme.palette.parchment.dark,
            fontStyle: "italic",
            mb: 3,
          }}
        >
          {milestoneTimeline}
        </Typography>
        <JourneyDescriptionList bullets={milestoneBullets} />
      </Box>
    </Modal>
  );
};

const JourneyDescriptionList = ({
  bullets,
}: {
  bullets: Record<string, string[]>;
}) => {
  const theme = useTheme();

  return (
    <Grid size={12}>
      {Object.entries(bullets).map(([key, values], groupIdx) => (
        <List key={key || `group-${groupIdx}`} sx={{ paddingLeft: 2 }}>
          <ListSubheader
            disableSticky
            sx={{
              ...headingSx,
              fontSize: "1.25rem",
              paddingLeft: 2,
              background: "none",
              mb: 1,
            }}
          >
            {key}
          </ListSubheader>
          {values.map((value, valueIdx) => (
            <ListItem key={`${key}-${valueIdx}`}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <FaCaretRight
                  size={16}
                  color={theme.palette.medievalGold.main}
                />
              </ListItemIcon>
              <ListItemText
                primary={value}
                slotProps={{
                  primary: {
                    sx: bodySx,
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      ))}
    </Grid>
  );
};

const ExperienceTimeline = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:900px)");
  const [open, setOpen] = useState(false);
  const [currentModalProps, setCurrentModalProps] =
    useState<JourneyCardModal | null>(null);
  const handleOpen = (props: JourneyCardModal) => {
    setCurrentModalProps(props);
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ position: "relative", maxWidth: "1000px", mx: "auto" }}>
      {/* Center line for desktop */}
      {!isMobile && (
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: "2px",
            backgroundColor: theme.palette.primaryGreen.main,
            opacity: 0.3,
            transform: "translateX(-50%)",
          }}
        />
      )}

      {/* Mobile side line */}
      {isMobile && (
        <Box
          sx={{
            position: "absolute",
            left: "20px",
            top: 0,
            bottom: 0,
            width: "2px",
            backgroundColor: theme.palette.primaryGreen.main,
            opacity: 0.3,
          }}
        />
      )}

      <Grid container spacing={4}>
        {cardData.map((milestone, idx) => {
          const isLeft = idx % 2 === 0;

          return (
            <Grid size={12} key={idx}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: isMobile
                    ? "flex-start"
                    : isLeft
                      ? "flex-end"
                      : "flex-start",
                  position: "relative",
                  pl: isMobile ? 6 : 0,
                }}
              >
                {/* Connector dot */}
                <Box
                  sx={{
                    position: "absolute",
                    left: isMobile ? "20px" : "50%",
                    top: "50%",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: theme.palette.cardBackground.main,
                    border: `3px solid ${theme.palette.primaryGreen.main}`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 2,
                  }}
                />

                {/* Horizontal connector line */}
                {!isMobile && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: isLeft ? "calc(50% - 10px)" : "50%",
                      right: isLeft ? "52%" : "calc(50% - 10px)",
                      top: "50%",
                      height: "2px",
                      backgroundColor: theme.palette.primaryGreen.main,
                      opacity: 0.3,
                      transform: "translateY(-50%)",
                    }}
                  />
                )}

                {/* Card */}
                <Box sx={{ width: isMobile ? "100%" : "48%", mb: 4 }}>
                  <JourneyCard
                    onClick={() =>
                      handleOpen({
                        ...milestone,
                        open: open,
                        handleClose: handleClose,
                        milestoneBullets: milestone.milestoneBullets,
                      })
                    }
                    milestoneLocation={milestone.milestoneLocation}
                    milestoneTitle={milestone.milestoneTitle}
                    milestoneTimeline={milestone.milestoneTimeline}
                    milestoneDescription={milestone.milestoneDescription}
                    degrees={0}
                    index={idx}
                    isLeftSide={isLeft}
                  />
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <JourneyModal
        open={open}
        handleClose={handleClose}
        milestoneLocation={currentModalProps?.milestoneLocation ?? ""}
        milestoneTitle={currentModalProps?.milestoneTitle ?? ""}
        milestoneTimeline={currentModalProps?.milestoneTimeline ?? ""}
        milestoneDescription={currentModalProps?.milestoneDescription ?? ""}
        milestoneBullets={currentModalProps?.milestoneBullets ?? { "": [] }}
        degrees={0}
        onClick={undefined}
      />
    </Box>
  );
};

export default ExperienceTimeline;
