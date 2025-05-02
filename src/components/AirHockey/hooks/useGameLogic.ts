
import { useEffect, useRef, useState } from "react";
import { GameState, GameConfig, Vector2D } from "../types";
import { useToast } from "@/components/ui/use-toast";

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

export const useGameLogic = (config: GameConfig) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const { toast } = useToast();
  
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

  const updatePlayerPaddlePosition = (position: Vector2D) => {
    setGameState(prev => ({
      ...prev,
      playerPaddlePos: position
    }));
  };

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
        const { PADDLE_SIZE, PUCK_SIZE, FRICTION, PADDLE_SPEED, COLLISION_DAMPING } = config;
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
        const checkCollisionWithPaddle = (paddlePos: Vector2D) => {
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
  }, [gameState.gameStarted, gameState.gamePaused, config]);

  return {
    gameState,
    startGame,
    resetGame,
    pauseGame,
    updatePlayerPaddlePosition
  };
};
