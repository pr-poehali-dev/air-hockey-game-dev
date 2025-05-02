
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useMobile } from "@/hooks/use-mobile";

interface GameState {
  puckPosition: { x: number; y: number };
  puckVelocity: { x: number; y: number };
  playerPaddlePos: { x: number; y: number };
  opponentPaddlePos: { x: number; y: number };
  playerScore: number;
  opponentScore: number;
  gameStarted: boolean;
  gamePaused: boolean;
}

const AirHockeyGame: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const isMobile = useMobile();
  const { toast } = useToast();

  const initialState: GameState = {
    puckPosition: { x: 50, y: 50 },
    puckVelocity: { x: 0, y: 0 },
    playerPaddlePos: { x: 50, y: 85 },
    opponentPaddlePos: { x: 50, y: 15 },
    playerScore: 0,
    opponentScore: 0,
    gameStarted: false,
    gamePaused: false,
  };

  const [gameState, setGameState] = useState<GameState>(initialState);
  const playerPaddleRef = useRef<HTMLDivElement>(null);
  const opponentPaddleRef = useRef<HTMLDivElement>(null);
  const puckRef = useRef<HTMLDivElement>(null);

  // Константы игры
  const PADDLE_SIZE = isMobile ? 30 : 40;
  const PUCK_SIZE = isMobile ? 20 : 25;
  const FRICTION = 0.98;
  const PADDLE_SPEED = 0.3;
  const COLLISION_DAMPING = 0.8;

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      gamePaused: false,
      puckPosition: { x: 50, y: 50 },
      puckVelocity: { 
        x: (Math.random() - 0.5) * 0.5, 
        y: (Math.random() - 0.5) * 0.5 
      }
    }));
    
    toast({
      title: "Игра началась!",
      description: "Используйте мышь или палец, чтобы управлять ракеткой",
    });
  };

  const resetGame = () => {
    setGameState(initialState);
  };

  const pauseGame = () => {
    setGameState(prev => ({ ...prev, gamePaused: !prev.gamePaused }));
  };

  // Обработчик движения мыши/тача для управления ракеткой игрока
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!gameRef.current || !gameState.gameStarted || gameState.gamePaused) return;
      
      const rect = gameRef.current.getBoundingClientRect();
      let clientX, clientY;
      
      if ('touches' in e) {
        // Touch event
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        // Mouse event
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      
      // Ограничиваем движение в нижней половине поля
      const limitedY = Math.max(50, Math.min(y, 90));
      
      setGameState(prev => ({
        ...prev,
        playerPaddlePos: { x, y: limitedY }
      }));
    };

    const gameElement = gameRef.current;
    
    if (gameElement) {
      gameElement.addEventListener('mousemove', handleMouseMove);
      gameElement.addEventListener('touchmove', handleMouseMove);
    }
    
    return () => {
      if (gameElement) {
        gameElement.removeEventListener('mousemove', handleMouseMove);
        gameElement.removeEventListener('touchmove', handleMouseMove);
      }
    };
  }, [gameState.gameStarted, gameState.gamePaused]);

  // Игровой цикл
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gamePaused) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      setGameState(prev => {
        let { puckPosition, puckVelocity, playerPaddlePos, opponentPaddlePos, playerScore, opponentScore } = prev;
        
        // Движение шайбы с учетом трения
        puckVelocity = {
          x: puckVelocity.x * FRICTION,
          y: puckVelocity.y * FRICTION
        };
        
        // Обновление позиции шайбы
        let newPuckPosition = {
          x: puckPosition.x + puckVelocity.x * deltaTime,
          y: puckPosition.y + puckVelocity.y * deltaTime
        };
        
        // Проверка столкновений с бортами
        if (newPuckPosition.x <= 0 || newPuckPosition.x >= 100) {
          puckVelocity.x = -puckVelocity.x * COLLISION_DAMPING;
          newPuckPosition.x = puckPosition.x;
        }
        
        // Проверка забития гола
        if (newPuckPosition.y <= 0) {
          playerScore += 1;
          newPuckPosition = { x: 50, y: 50 };
          puckVelocity = { x: 0, y: 0 };
        } else if (newPuckPosition.y >= 100) {
          opponentScore += 1;
          newPuckPosition = { x: 50, y: 50 };
          puckVelocity = { x: 0, y: 0 };
        }
        
        // Искусственный интеллект для оппонента (движение к шайбе)
        const newOpponentX = opponentPaddlePos.x + (puckPosition.x - opponentPaddlePos.x) * PADDLE_SPEED * (deltaTime / 100);
        opponentPaddlePos = {
          x: Math.max(10, Math.min(90, newOpponentX)),
          y: opponentPaddlePos.y
        };
        
        // Проверка столкновений с ракетками
        const checkCollisionWithPaddle = (paddlePos: {x: number, y: number}) => {
          const dx = paddlePos.x - newPuckPosition.x;
          const dy = paddlePos.y - newPuckPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < (PADDLE_SIZE + PUCK_SIZE) / 2) {
            // Рассчитываем новый вектор скорости на основе направления от центра ракетки
            const angle = Math.atan2(dy, dx);
            const strength = Math.sqrt(puckVelocity.x * puckVelocity.x + puckVelocity.y * puckVelocity.y);
            const newVelocity = {
              x: -Math.cos(angle) * strength * 1.5,
              y: -Math.sin(angle) * strength * 1.5
            };
            
            puckVelocity = newVelocity;
            
            // Отодвигаем шайбу от ракетки, чтобы избежать "прилипания"
            newPuckPosition.x = paddlePos.x - Math.cos(angle) * ((PADDLE_SIZE + PUCK_SIZE) / 2);
            newPuckPosition.y = paddlePos.y - Math.sin(angle) * ((PADDLE_SIZE + PUCK_SIZE) / 2);
            
            return true;
          }
          return false;
        };
        
        checkCollisionWithPaddle(playerPaddlePos) || checkCollisionWithPaddle(opponentPaddlePos);
        
        return {
          ...prev,
          puckPosition: newPuckPosition,
          puckVelocity,
          opponentPaddlePos,
          playerScore,
          opponentScore
        };
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [gameState.gameStarted, gameState.gamePaused, PADDLE_SIZE, PUCK_SIZE]);

  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="mb-4 flex gap-4">
        <Button 
          onClick={gameState.gameStarted ? pauseGame : startGame}
          variant="default"
        >
          {gameState.gameStarted ? (gameState.gamePaused ? "Продолжить" : "Пауза") : "Начать игру"}
        </Button>
        
        <Button 
          onClick={resetGame}
          variant="outline"
        >
          Сброс
        </Button>
      </div>
      
      <div className="mb-2 text-xl font-bold">
        Счёт: {gameState.playerScore} - {gameState.opponentScore}
      </div>
      
      <div 
        ref={gameRef}
        className="w-full max-w-md aspect-[1/1.5] bg-blue-100 border-4 border-blue-700 rounded-2xl overflow-hidden relative shadow-lg"
        style={{ touchAction: "none" }}
      >
        {/* Центральная линия */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-400"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-blue-400"></div>
        
        {/* Ворота */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-1 bg-red-500"></div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/3 h-1 bg-red-500"></div>
        
        {/* Шайба */}
        <div 
          ref={puckRef}
          className="absolute bg-black rounded-full shadow-md"
          style={{
            width: `${PUCK_SIZE}px`,
            height: `${PUCK_SIZE}px`,
            left: `calc(${gameState.puckPosition.x}% - ${PUCK_SIZE / 2}px)`,
            top: `calc(${gameState.puckPosition.y}% - ${PUCK_SIZE / 2}px)`,
            transition: 'transform 0.05s linear'
          }}
        ></div>
        
        {/* Ракетка игрока */}
        <div 
          ref={playerPaddleRef}
          className="absolute bg-red-600 rounded-full shadow-md cursor-none"
          style={{
            width: `${PADDLE_SIZE}px`,
            height: `${PADDLE_SIZE}px`,
            left: `calc(${gameState.playerPaddlePos.x}% - ${PADDLE_SIZE / 2}px)`,
            top: `calc(${gameState.playerPaddlePos.y}% - ${PADDLE_SIZE / 2}px)`,
          }}
        ></div>
        
        {/* Ракетка компьютера */}
        <div 
          ref={opponentPaddleRef}
          className="absolute bg-blue-600 rounded-full shadow-md"
          style={{
            width: `${PADDLE_SIZE}px`,
            height: `${PADDLE_SIZE}px`,
            left: `calc(${gameState.opponentPaddlePos.x}% - ${PADDLE_SIZE / 2}px)`,
            top: `calc(${gameState.opponentPaddlePos.y}% - ${PADDLE_SIZE / 2}px)`,
          }}
        ></div>
      </div>
      
      {!gameState.gameStarted && (
        <div className="mt-4 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Правила игры:</h2>
          <ul className="text-left list-disc pl-5">
            <li>Управляйте ракеткой с помощью мыши или пальца</li>
            <li>Забейте шайбу в ворота соперника</li>
            <li>Первый, кто наберет 7 очков, побеждает</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AirHockeyGame;
