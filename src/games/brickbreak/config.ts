import { BRICK_COLS } from "./levels";

export const WIDTH = 960;
export const HEIGHT = 720;
export const PADDLE_WIDTH = 110;
export const PADDLE_HEIGHT = 14;
export const PADDLE_Y = HEIGHT - 48;
export const PADDLE_SPEED = 760;
export const BALL_RADIUS = 7;
export const BASE_SPEED = 450;
export const MAX_BALLS = 6;
export const BRICK_GAP = 6;
export const BRICK_HEIGHT = 24;
export const BRICK_TOP = 72;
export const BRICK_MARGIN = 54;
export const BRICK_WIDTH = (WIDTH - BRICK_MARGIN * 2 - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;
export const DROP_RADIUS = 15;
export const DROP_SPEED = 200;
export const DROP_CHANCE = 0.16;
