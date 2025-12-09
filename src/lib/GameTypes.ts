export type GameGenre = 'Arcade' | 'Puzzle' | 'Action' | 'Strategy';

export type GameDataProps = {
    id: string;
    title: string;
    description: string;
    thumbnail: string; // Static image shown when not hovering
    gameplayGif: string; // Animated gif shown on hover
    genre: GameGenre;
    featured?: boolean; // Mark as featured game for hero banner
    onPlay: () => void; // Function to launch the game
}

export type GameHighScore = {
    gameId: string;
    username: string;
    score: number;
    timestamp: number;
}

export type UserGameData = {
    userId?: string;
    username: string;
    optedIn: boolean;
    highScores: Record<string, number>; // gameId -> high score
}
