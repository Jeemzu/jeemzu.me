# Games Implementation Guide

## Overview
This directory will contain the individual game implementations for the portfolio website.

## Current Status
✅ Games page structure created with card grid layout
✅ Navigation integration complete
✅ Hover effects for gameplay GIFs implemented
✅ Type definitions for game data and user scores

## Game Architecture

Each game should:
1. Be implemented as a separate component in this directory
2. Use HTML5 Canvas or a game library like Phaser
3. Include a modal/dialog wrapper for full-screen gameplay
4. Track user scores and trigger save callbacks
5. Include pause/resume functionality
6. Have responsive sizing for different screen sizes

## Planned Games
- **Snake**: Classic snake game with growing mechanics
- **Pong**: Single-player vs AI paddle game
- **Tetris**: Block-stacking puzzle game
- **Breakout**: Brick-breaking paddle game

## Next Steps

### 1. Create Game Components
Create individual game files in this directory:
- `Snake.tsx` - Snake game implementation
- `Pong.tsx` - Pong game implementation
- `Tetris.tsx` - Tetris game implementation
- `Breakout.tsx` - Breakout game implementation

### 2. Create Game Modal Wrapper
Create `GameModal.tsx` - A reusable modal component that:
- Displays the game in a centered modal/dialog
- Includes close button and controls
- Shows current score
- Handles pause/resume states
- Prompts for username if user wants to save score

### 3. Implement User Data Management
Create API service in `src/utils/gameApi.ts`:
```typescript
// Functions to:
- saveHighScore(gameId, username, score)
- getHighScores(gameId, limit)
- getUserData(username)
- createUserSession()
```

### 4. Database Setup
Set up a simple backend (suggestions):
- **Supabase**: Free PostgreSQL database with REST API
- **Firebase**: Real-time database with authentication
- **MongoDB Atlas**: Free-tier NoSQL database
- **Vercel KV**: Key-value store for simple data

Database schema needed:
```sql
users (
  id: uuid,
  username: string,
  created_at: timestamp
)

high_scores (
  id: uuid,
  user_id: uuid,
  game_id: string,
  score: number,
  timestamp: timestamp
)
```

### 5. Add Game Assets
For each game, create/add:
- Static thumbnail image (shown by default)
- Animated gameplay GIF (shown on hover)
- Sound effects (optional)
- Background music (optional)

Place assets in `src/assets/games/[game-name]/`

### 6. Update GameData.ts
Once games are implemented, update:
- `thumbnail` paths to actual game thumbnails
- `gameplayGif` paths to actual gameplay recordings
- `onPlay` handlers to launch the game modal

Example:
```typescript
{
  id: 'snake',
  title: 'Snake',
  description: '...',
  thumbnail: snakeThumbnail,
  gameplayGif: snakeGameplayGif,
  onPlay: () => setActiveGame('snake')
}
```

### 7. Leaderboard Component (Optional)
Create `Leaderboard.tsx` to display top scores:
- Show top 10 scores per game
- Update in real-time
- Highlight current user's best score

### 8. User Opt-in Dialog
Create a consent dialog component:
- Show on first game play
- Explain data collection
- Allow opt-in/opt-out
- Store preference in localStorage

## Game Implementation Tips

### Canvas Setup
```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);

useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  // Game loop here
}, []);
```

### Game Loop Pattern
```typescript
let animationId: number;

const gameLoop = () => {
  update(); // Update game state
  render(); // Draw to canvas
  animationId = requestAnimationFrame(gameLoop);
};

// Start
gameLoop();

// Cleanup
return () => cancelAnimationFrame(animationId);
```

### Score Management
```typescript
const [score, setScore] = useState(0);
const [highScore, setHighScore] = useState(0);

const handleGameOver = async () => {
  if (score > highScore) {
    setHighScore(score);
    // Prompt to save if opted in
    if (userOptedIn) {
      await saveHighScore(gameId, username, score);
    }
  }
};
```

## Libraries to Consider

- **Phaser 3**: Full-featured game framework
- **PixiJS**: 2D rendering engine
- **Howler.js**: Audio library for sound effects
- **react-konva**: React wrapper for canvas

## Testing Checklist

- [ ] Games load without errors
- [ ] Hover shows gameplay GIFs
- [ ] Play button launches game modal
- [ ] Games are responsive on mobile
- [ ] Score tracking works correctly
- [ ] High scores save to database
- [ ] Leaderboard updates properly
- [ ] User opt-in flow works
- [ ] Games pause when modal is closed
- [ ] Multiple games can be played in sequence
