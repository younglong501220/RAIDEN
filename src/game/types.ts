export type WeaponType = 'VULCAN' | 'LASER';
export type SubWeaponType = 'HOMING' | 'MISSILE';

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  sfxVolume: number;
  musicVolume: number;
  scanlines: boolean;
  crtCurvature: boolean;
  autoFire: boolean;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  arcadeBezel: boolean;
}

export interface HighScoreEntry {
  name: string;
  score: number;
  stage: number;
  weapon: WeaponType;
  date: string;
}

export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';
