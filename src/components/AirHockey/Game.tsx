
import React, { useRef } from "react";
import { useMobile } from "@/hooks/use-mobile";
import { GameConfig } from "./types";
import { useGameLogic } from "./hooks/useGameLogic";
import { usePlayerControls } from "./hooks/usePlayerControls";
import { GameControls } from "./components/GameControls";
import { Scoreboard } from "./components/Scoreboard";
import { GameField } from "./components/GameField";
import { GameRules } from "./components/GameRules";

const AirHockeyGame: React.FC = () => {
  // Ссылки на DOM-элементы
  const gameRef = useRef<HTMLDivElement>(null);
  const playerPaddleRef = useRef<HTMLDivElement>(null);
  const opponentPaddleRef = useRef<HTMLDivElement>(null);
  const puckRef = useRef<HTMLDivElement>(null);
  
  // Определение размеров элементов в зависимости от устройства
  const isMobile = useMobile();
  
  // Конфигурация игры - настроена для более стабильной физики
  const gameConfig: GameConfig = {
    PADDLE_SIZE: isMobile ? 30 : 40,
    PUCK_SIZE: isMobile ? 20 : 25,
    FRICTION: 0.96,  // Усилил трение, чтобы шайба быстрее останавливалась
    PADDLE_SPEED: 0.3, // Немного снизил скорость компьютерного противника
    COLLISION_DAMPING: 0.8, // Уменьшил отскок от бортов
    MAX_PUCK_SPEED: 0.1, // Значительно уменьшил максимальную скорость шайбы
    INITIAL_PUCK_SPEED: 0.05, // Уменьшил начальную скорость шайбы
    REBOUND_MULTIPLIER: 1.0 // Убрал множитель отскока от ракетки
  };

  // Игровая логика
  const {
    gameState,
    startGame,
    resetGame,
    pauseGame,
    updatePlayerPaddlePosition
  } = useGameLogic(gameConfig);

  // Управление игроком
  usePlayerControls({
    gameRef,
    gameStarted: gameState.gameStarted,
    gamePaused: gameState.gamePaused,
    onPositionUpdate: updatePlayerPaddlePosition
  });

  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* Игровые кнопки */}
      <GameControls 
        gameStarted={gameState.gameStarted}
        gamePaused={gameState.gamePaused}
        onStart={startGame}
        onPause={pauseGame}
        onReset={resetGame}
      />
      
      {/* Счет игры */}
      <Scoreboard 
        playerScore={gameState.playerScore}
        opponentScore={gameState.opponentScore}
      />
      
      {/* Игровое поле */}
      <GameField 
        gameRef={gameRef}
        puckRef={puckRef}
        playerPaddleRef={playerPaddleRef}
        opponentPaddleRef={opponentPaddleRef}
        gameState={gameState}
        config={gameConfig}
      />
      
      {/* Правила игры (отображаются только когда игра не запущена) */}
      {!gameState.gameStarted && <GameRules />}
    </div>
  );
};

export default AirHockeyGame;
