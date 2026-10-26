export const STYLE = {
  background: 0x0c081c, horizon: 0x6c247e, paddle: 0x4af3ff, ball: 0xf8f1ff,
  bloom: { strength: 0.38, radius: 0.2, threshold: 0.8 },
  bricks: {
    "1": 0x36daeb, "2": 0x659eff, "3": 0xa577ff, "4": 0xe66bff,
    "5": 0xff4bad, "6": 0xffab71, a: 0xb1f3ef, b: 0xaca5db, "#": 0x535064,
  } as Record<string, number>,
  powers: { expand: 0x65e698, multi: 0x4de5ed, slow: 0x668dff, life: 0xff78b6, sticky: 0xffd66d, shrink: 0xff5e70, fast: 0xff9e4e },
};
