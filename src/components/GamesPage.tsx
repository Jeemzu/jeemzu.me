import { Container } from "@mui/material";
import GameHeroBanner from "./GameHeroBanner";
import GameRow from "./GameRow";
import { gameData } from "../lib/data/GameData";
import { type GameGenre } from "../lib/GameTypes";

const GamesPage = () => {
    // Get featured game
    const featuredGame = gameData.find(game => game.featured) || gameData[0];

    // Group games by genre
    const gamesByGenre = gameData.reduce((acc, game) => {
        if (!acc[game.genre]) {
            acc[game.genre] = [];
        }
        acc[game.genre].push(game);
        return acc;
    }, {} as Record<GameGenre, typeof gameData>);

    // Get recently added games (for demo, just reverse the order)
    const recentlyAdded = [...gameData].reverse();

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
            {/* Hero Banner */}
            <GameHeroBanner game={featuredGame} />

            {/* Game Rows by Genre */}
            {Object.entries(gamesByGenre).map(([genre, games]) => (
                <GameRow key={genre} title={`${genre} Games`} games={games} />
            ))}

            {/* Recently Added Row */}
            <GameRow title="Recently Added" games={recentlyAdded} />

            {/* All Games Row */}
            <GameRow title="All Games" games={gameData} />
        </Container>
    );
};

export default GamesPage;
