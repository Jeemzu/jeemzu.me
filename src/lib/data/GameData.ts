import { type GameDataProps } from "../GameTypes";

// Import game assets
import websiteThumbnail from '../../assets/images/website.png';
import snake1Gif from '../../assets/images/1.gif';
import pong2Gif from '../../assets/images/2.gif';
import tetris3Gif from '../../assets/images/3.gif';
import breakout4Gif from '../../assets/images/4.gif';

export const gameData: GameDataProps[] = [
    {
        id: 'snake',
        title: 'Snake',
        description: 'Classic snake game - eat the food and grow longer without hitting yourself!',
        thumbnail: websiteThumbnail,
        gameplayGif: snake1Gif,
        genre: 'Arcade',
        featured: true,
        onPlay: () => {
            console.log('Launching Snake game...');
            // TODO: Implement game launch logic
        }
    },
    {
        id: 'pong',
        title: 'Pong',
        description: 'Retro arcade classic - bounce the ball and beat the AI opponent!',
        thumbnail: websiteThumbnail,
        gameplayGif: pong2Gif,
        genre: 'Arcade',
        onPlay: () => {
            console.log('Launching Pong game...');
            // TODO: Implement game launch logic
        }
    },
    {
        id: 'tetris',
        title: 'Tetris',
        description: 'Stack falling blocks to clear lines. How high can you score?',
        thumbnail: websiteThumbnail,
        gameplayGif: tetris3Gif,
        genre: 'Puzzle',
        onPlay: () => {
            console.log('Launching Tetris game...');
            // TODO: Implement game launch logic
        }
    },
    {
        id: 'breakout',
        title: 'Breakout',
        description: 'Break all the bricks with your paddle and ball!',
        thumbnail: websiteThumbnail,
        gameplayGif: breakout4Gif,
        genre: 'Arcade',
        onPlay: () => {
            console.log('Launching Breakout game...');
            // TODO: Implement game launch logic
        }
    },
];
