
import React from "react";
import { GameState, GameConfig } from "../types";

interface GameFieldProps {
  gameRef: React.RefObject<HTMLDivElement>;
  puckRef: React.RefObject<HTMLDivElement>;
  playerPaddleRef: React.RefObject<HTMLDivElement>;
  opponentPaddleRef: React.RefObject<HTMLDivElement>;
  gameState: GameState;
  config: GameConfig;
}

export const GameField: React.FC<GameFieldProps> = ({
  gameRef,
  puckRef,
  playerPaddleRef,
  opponentPaddleRef,
  gameState,
  config
}) => {
  const { PADDLE_SIZE, PUCK_SIZE } = config;
  const { puckPosition, playerPaddlePos, opponentPaddlePos } = gameState;

  return (
    <div 
      ref={gameRef}
      className="w-full max-w-md aspect-[1/1.5] bg-blue-100 border-4 border-blue-700 rounded-2xl overflow-hidden relative shadow-lg"
      style={{ touchAction: "none" }}
    >
      {/* Центральная линия */}
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-400"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-blue-400"></div>
      
      {/* Ворота */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-2 bg-red-500 rounded-b-lg"></div>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/3 h-2 bg-red-500 rounded-t-lg"></div>
      
      {/* Угловые закругления */}
      <div className="absolute top-0 left-0 w-12 h-12 border-b-4 border-r-4 rounded-br-full border-blue-400"></div>
      <div className="absolute top-0 right-0 w-12 h-12 border-b-4 border-l-4 rounded-bl-full border-blue-400"></div>
      <div className="absolute bottom-0 left-0 w-12 h-12 border-t-4 border-r-4 rounded-tr-full border-blue-400"></div>
      <div className="absolute bottom-0 right-0 w-12 h-12 border-t-4 border-l-4 rounded-tl-full border-blue-400"></div>
      
      {/* Шайба */}
      <div 
        ref={puckRef}
        className="absolute bg-black rounded-full shadow-md"
        style={{
          width: `${PUCK_SIZE}px`,
          height: `${PUCK_SIZE}px`,
          left: `calc(${puckPosition.x}% - ${PUCK_SIZE / 2}px)`,
          top: `calc(${puckPosition.y}% - ${PUCK_SIZE / 2}px)`,
          // Отключаем все анимации и трансформации для предотвращения мерцания
          transition: 'none',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}
      >
        {/* Внутренняя маркировка шайбы */}
        <div className="absolute inset-2 rounded-full bg-gray-800"></div>
      </div>
      
      {/* Ракетка игрока */}
      <div 
        ref={playerPaddleRef}
        className="absolute bg-red-600 rounded-full shadow-md cursor-none"
        style={{
          width: `${PADDLE_SIZE}px`,
          height: `${PADDLE_SIZE}px`,
          left: `calc(${playerPaddlePos.x}% - ${PADDLE_SIZE / 2}px)`,
          top: `calc(${playerPaddlePos.y}% - ${PADDLE_SIZE / 2}px)`,
          boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
          background: 'radial-gradient(circle at 40% 40%, #f87171, #dc2626 60%)',
          transition: 'none'
        }}
      >
        {/* Внутренняя маркировка ракетки */}
        <div className="absolute inset-3 rounded-full border-2 border-red-300 opacity-60"></div>
      </div>
      
      {/* Ракетка компьютера */}
      <div 
        ref={opponentPaddleRef}
        className="absolute rounded-full shadow-md"
        style={{
          width: `${PADDLE_SIZE}px`,
          height: `${PADDLE_SIZE}px`,
          left: `calc(${opponentPaddlePos.x}% - ${PADDLE_SIZE / 2}px)`,
          top: `calc(${opponentPaddlePos.y}% - ${PADDLE_SIZE / 2}px)`,
          boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
          background: 'radial-gradient(circle at 40% 40%, #93c5fd, #2563eb 60%)',
          transition: 'none'
        }}
      >
        {/* Внутренняя маркировка ракетки */}
        <div className="absolute inset-3 rounded-full border-2 border-blue-300 opacity-60"></div>
      </div>
    </div>
  );
};
