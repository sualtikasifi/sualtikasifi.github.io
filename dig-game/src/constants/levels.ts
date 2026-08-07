export type ObstacleType = 'circle' | 'capsule';

export interface Obstacle {
  type: ObstacleType;
  x: number; // 0-1 normalized (fraction of board width)
  y: number; // 0-1 normalized (fraction of board height)
  w?: number; // width fraction (capsule)
  h?: number; // height fraction (capsule)
  r?: number; // radius fraction (circle), relative to min(boardW, boardH)
}

export interface LevelData {
  id: number;
  obstacles: Obstacle[];
  ball: { x: number; y: number };
  goal: { x: number; y: number };
}

export const LEVELS: LevelData[] = [
  {
    id: 1,
    obstacles: [
      { type: 'capsule', x: 0.25, y: 0.30, w: 0.09, h: 0.22 },
      { type: 'circle',  x: 0.47, y: 0.26, r: 0.074 },
      { type: 'circle',  x: 0.44, y: 0.52, r: 0.064 },
      { type: 'capsule', x: 0.32, y: 0.67, w: 0.22, h: 0.08 },
      { type: 'circle',  x: 0.78, y: 0.44, r: 0.074 },
    ],
    ball: { x: 0.5, y: 0.07 },
    goal: { x: 0.5, y: 0.93 },
  },
  {
    id: 2,
    obstacles: [
      { type: 'circle',  x: 0.27, y: 0.20, r: 0.08 },
      { type: 'capsule', x: 0.63, y: 0.27, w: 0.08, h: 0.18 },
      { type: 'circle',  x: 0.73, y: 0.55, r: 0.07 },
      { type: 'capsule', x: 0.36, y: 0.55, w: 0.18, h: 0.08 },
      { type: 'circle',  x: 0.50, y: 0.75, r: 0.065 },
    ],
    ball: { x: 0.5, y: 0.07 },
    goal: { x: 0.5, y: 0.93 },
  },
  {
    id: 3,
    obstacles: [
      { type: 'capsule', x: 0.22, y: 0.21, w: 0.08, h: 0.22 },
      { type: 'capsule', x: 0.51, y: 0.17, w: 0.20, h: 0.08 },
      { type: 'circle',  x: 0.79, y: 0.27, r: 0.085 },
      { type: 'circle',  x: 0.33, y: 0.50, r: 0.075 },
      { type: 'capsule', x: 0.69, y: 0.52, w: 0.08, h: 0.18 },
      { type: 'circle',  x: 0.50, y: 0.72, r: 0.065 },
    ],
    ball: { x: 0.5, y: 0.07 },
    goal: { x: 0.5, y: 0.93 },
  },
  {
    id: 4,
    obstacles: [
      { type: 'circle',  x: 0.20, y: 0.17, r: 0.07 },
      { type: 'circle',  x: 0.80, y: 0.17, r: 0.07 },
      { type: 'capsule', x: 0.50, y: 0.30, w: 0.26, h: 0.08 },
      { type: 'circle',  x: 0.25, y: 0.50, r: 0.08 },
      { type: 'circle',  x: 0.75, y: 0.50, r: 0.08 },
      { type: 'capsule', x: 0.50, y: 0.66, w: 0.08, h: 0.20 },
    ],
    ball: { x: 0.5, y: 0.07 },
    goal: { x: 0.5, y: 0.93 },
  },
  {
    id: 5,
    obstacles: [
      { type: 'capsule', x: 0.30, y: 0.14, w: 0.08, h: 0.20 },
      { type: 'capsule', x: 0.70, y: 0.14, w: 0.08, h: 0.20 },
      { type: 'circle',  x: 0.50, y: 0.35, r: 0.09 },
      { type: 'capsule', x: 0.26, y: 0.56, w: 0.20, h: 0.08 },
      { type: 'capsule', x: 0.74, y: 0.56, w: 0.20, h: 0.08 },
      { type: 'circle',  x: 0.50, y: 0.73, r: 0.07 },
    ],
    ball: { x: 0.5, y: 0.07 },
    goal: { x: 0.5, y: 0.93 },
  },
];
