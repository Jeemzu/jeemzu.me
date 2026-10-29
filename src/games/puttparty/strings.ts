/** Player-facing text. Keys are stable; add locales by providing another table with the same keys. */
const en = {
  "menu.howToPlay": "How to Play",
  "howTo.title": "How to Play",
  "howTo.aim": "Click and drag back from anywhere to aim. Release to putt.",
  "howTo.power": "Pull farther for more power. Stronger shots wobble more.",
  "howTo.camera": "Right-drag to orbit. Scroll to zoom.",
  "howTo.turns": "Everyone putts at the same time. Balls pass through each other.",
  "howTo.score": "Lowest total strokes after 6 holes wins. Hitting the stroke limit scores 12.",
  "howTo.close": "Got it",

  "lobby.name": "Name",
  "lobby.icon": "Icon",
  "lobby.create": "Create Room",
  "lobby.code": "Room Code",
  "lobby.join": "Join",
  "room.title": "Room {code}",
  "room.copy": "Copy code",
  "room.course": "Course",
  "room.start": "Start",
  "room.waiting": "Waiting for host",
  "room.host": "Host",
  "room.leave": "Leave",
  "room.players": "{count}/6",

  "hud.hole": "Hole {n}",
  "hud.par": "Par {n}",
  "hud.strokes": "Strokes {n}/{limit}",
  "hud.total": "Total",
  "hud.sunk": "Sunk!",
  "hud.limit": "Stroke limit",
  "hud.waiting": "Waiting for others",
  "hud.offline": "Offline",
  "hud.out": "Out",
  "hud.next": "Next hole",
  "hud.final": "Final results",

  "results.winner": "Winner",
  "results.winners": "Winners",
  "results.lobby": "Back to Lobby",

  "net.connecting": "Connecting…",
  "net.reconnecting": "Reconnecting…",
  "net.ping": "{ms} ms",
  "net.pingDetail": "Ping {rtt} ms · Min {min} · Avg {avg} · Jitter {jitter}",
  "net.shotDetail": "Last shot confirmed in {ms} ms",

  "error.sessionNotFound": "Room not found",
  "error.sessionFull": "Room is full",
  "error.gameInProgress": "Game already started",
  "error.invalidName": "Enter a name",
  "error.invalidIcon": "Pick an icon",
  "error.notHost": "Only the host can do that",
  "error.notPlaying": "Not in a game",
  "error.ballMoving": "Ball is still moving",
  "error.holeDone": "Hole finished",
  "error.invalidShot": "Shot too weak",
  "error.unknownCourse": "Course unavailable",
  "error.resumeFailed": "Your seat expired",
  "error.invalidMessage": "Something went wrong",
  "error.serverBusy": "Server is busy, try again",
} as const;

export type StringKey = keyof typeof en;

export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let text: string = en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v));
  return text;
}

export function errorText(code: string): string {
  const key = `error.${code}` as StringKey;
  return key in en ? t(key) : t("error.invalidMessage");
}
