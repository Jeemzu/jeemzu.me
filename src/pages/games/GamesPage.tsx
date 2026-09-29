import { Container, Box } from "@mui/material";
import { createGameData, useGameLauncher } from "../../lib/data/GameData";
import GameCard from "./GameCard";
import PageHeading from "../../components/shared/PageHeading";
import AuthPromptToast from "../../components/shared/AuthPromptToast";

const GamesPage = () => {
  const {
    launchSnake,
    launchZAim,
    launchBrickBreak,
    launchTetris,
    launchPlatformer,
    showComingSoon,
    GameModal,
    ComingSoonGameModal,
    WasmModal,
    LevelSelectModal,
  } = useGameLauncher();
  const gameData = createGameData({
    launchSnake,
    launchZAim,
    launchBrickBreak,
    launchTetris,
    launchPlatformer,
    showComingSoon,
  });

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <PageHeading title="Games" subtitle="Take a quick break and play!" />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 4,
          maxWidth: "1500px",
          mx: "auto",
        }}
      >
        {gameData.map((game, idx) => (
          <GameCard key={game.id} {...game} index={idx} />
        ))}
      </Box>

      {GameModal}
      {ComingSoonGameModal}
      {LevelSelectModal}
      {WasmModal}
      <AuthPromptToast />
    </Container>
  );
};

export default GamesPage;
