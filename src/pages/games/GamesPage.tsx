import { Container } from "@mui/material";
import GameHeroBanner from "./GameHeroBanner";
import GameRow from "./GameRow";
import { createGameData, useGameLauncher } from "../../lib/data/GameData";

const GamesPage = () => {
    // Set up game launcher
    const { launchSnake, launchZAim, launchPong, launchBreakout, launchTetris, launchRPG, launchPlatformer, showComingSoon, GameModal, ComingSoonGameModal, RPGModal, WasmModal } = useGameLauncher();

    // Create game data with launcher functions
    const gameData = createGameData({ launchSnake, launchZAim, launchPong, launchBreakout, launchTetris, launchRPG, launchPlatformer, showComingSoon });

    // Get featured game
    const featuredGame = gameData.find(game => game.featured) || gameData[0];

    return (
        <>
            {/* Hero Banner - full width outside container */}
            <GameHeroBanner game={featuredGame} />

            <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
                {/* All Games Row */}
                <GameRow title="All Games" games={gameData} />
            </Container>

            {/* Game Modals */}
            {GameModal}
            {ComingSoonGameModal}
            {RPGModal}
            {WasmModal}
        </>
    );
};

export default GamesPage;
