import {
  Typography,
  Card,
  CardContent,
  CardMedia,
  useTheme,
  Box,
} from "@mui/material";
import { type GameDataProps } from "../../lib/GameTypes";
import { ANIMATIONS } from "../../lib/globals";
import {
  bodySx,
  headingSx,
  panelInteractiveSx,
} from "../../lib/medievalStyles";
import { useState, useEffect, useRef } from "react";
import { useScrollAnimation } from "../../utils/useScrollAnimation";

const GameCard = ({
  title,
  description,
  thumbnail,
  gameplayGif,
  onPlay,
  index = 0,
}: GameDataProps & { index?: number }) => {
  const theme = useTheme();
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });
  const [isHovering, setIsHovering] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (isHovering) {
      timeoutRef.current = window.setTimeout(() => {
        setShowGif(true);
      }, 500);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setShowGif(false);
    }

    return () => clearTimeout(timeoutRef.current);
  }, [isHovering]);

  return (
    <Box
      ref={ref}
      sx={{
        ...ANIMATIONS.FADE_IN,
        ...(isVisible && ANIMATIONS.FADE_IN_VISIBLE),
        transitionDelay: `${index * ANIMATIONS.STAGGER_DELAY}s`,
      }}
    >
      <Card
        onClick={onPlay}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        sx={{
          ...panelInteractiveSx,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "200px",
            overflow: "hidden",
            backgroundColor: theme.palette.medievalStone.dark,
            borderBottom: "1px solid rgba(200, 162, 74, 0.25)",
            position: "relative",
          }}
        >
          {/* Thumbnail image */}
          <CardMedia
            component="img"
            image={thumbnail}
            alt={title}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              top: 0,
              left: 0,
              opacity: showGif ? 0 : 1,
              transition: "opacity 0.2s ease-out",
            }}
            loading="lazy"
          />
          {/* Gameplay GIF */}
          <CardMedia
            component="img"
            image={gameplayGif}
            alt={`${title} gameplay`}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              top: 0,
              left: 0,
              opacity: showGif ? 1 : 0,
              transition: "opacity 0.2s ease-in",
            }}
            loading="lazy"
          />
        </Box>
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Typography variant="h4" gutterBottom sx={headingSx}>
            {title}
          </Typography>
          <Typography component="p" variant="body1" sx={{ ...bodySx, m: 0 }}>
            {description}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default GameCard;
