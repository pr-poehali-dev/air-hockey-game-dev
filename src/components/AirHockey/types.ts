
export interface Vector2D {
  x: number;
  y: number;
}

export interface GameState {
  puckPosition: Vector2D;
  puckVelocity: Vector2D;
  playerPaddlePos: Vector2D;
  opponentPaddlePos: Vector2D;
  playerScore: number;
  opponentScore: number;
  gameStarted: boolean;
  gamePaused: boolean;
}

export interface GameConfig {
  PADDLE_SIZE: number;
  PUCK_SIZE: number;
  FRICTION: number;
  PADDLE_SPEED: number;
  COLLISION_DAMPING: number;
}
