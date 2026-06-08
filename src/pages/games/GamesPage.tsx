import { Container, Typography, Box, useTheme } from "@mui/material";
import { FONTS } from "../../lib/globals";
import { createGameData, useGameLauncher } from "../../lib/data/GameData";
import GameCard from "./GameCard";

const GamesPage = () => {
    const theme = useTheme();
    const { launchSnake, launchZAim, launchBreakout, launchTetris, launchPlatformer, showComingSoon, GameModal, ComingSoonGameModal, RPGModal, WasmModal, LevelSelectModal } = useGameLauncher();
    const gameData = createGameData({ launchSnake, launchZAim, launchBreakout, launchTetris, launchPlatformer, showComingSoon });

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
            <Typography
                fontFamily={FONTS.POIRET_ONE}
                variant="h1"
                sx={{
                    textAlign: 'center',
                    mb: { xs: 2, md: 3 },
                    color: theme.palette.primaryGreen.main,
                }}
            >
                Games
            </Typography>
            <Typography
                fontFamily={FONTS.NECTO_MONO}
                variant="h6"
                sx={{
                    textAlign: 'center',
                    mb: { xs: 4, md: 6 },
                    color: theme.palette.textSecondary.main,
                    maxWidth: '600px',
                    mx: 'auto',
                }}
            >
                Take a quick break and play!
            </Typography>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 4,
                    maxWidth: '900px',
                    mx: 'auto',
                }}
            >
                {gameData.map((game, idx) => (
                    <GameCard key={game.id} {...game} index={idx} />
                ))}
            </Box>

            {GameModal}
            {ComingSoonGameModal}
            {RPGModal}
            {LevelSelectModal}
            {WasmModal}
        </Container>
    );
};

export default GamesPage;
