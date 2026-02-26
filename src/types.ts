// Types for the game

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy?: number;
  isEnemy?: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  type: number;
  width: number;
  height: number;
}

export interface Powerup {
  x: number;
  y: number;
  type: 'spread' | 'multishot';
  angle: number;
}

export interface Boss {
  name: string;
  health: number;
  speed: number;
  color: string;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export interface Player {
  _x: number;
  _y: number;
  width: number;
  height: number;
  color: string;
  bullets: Bullet[];
  shootCooldown: number;
  powerup: string | null;
  powerupTimer: number;
  lastLauncher: 'left' | 'right' | undefined;
}

export const BASE_WIDTH = 600;
export const BASE_HEIGHT = 700;
