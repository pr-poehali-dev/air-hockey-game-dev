
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
        x: (Math.random() - 0.5) * 0.02, 
        y: (Math.random() - 0.5) * 0.02 
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

      // Фиксированный шаг времени для стабильной физики
      const fixedDeltaTime = 16; // ~60fps

      setGameState(prev => {
        const { PADDLE_SIZE, PUCK_SIZE, FRICTION, PADDLE_SPEED } = config;
        let { puckPosition, puckVelocity, playerPaddlePos, opponentPaddlePos, playerScore, opponentScore } = prev;
        
        // Применяем трение очень осторожно
        puckVelocity = {
          x: puckVelocity.x * FRICTION,
          y: puckVelocity.y * FRICTION
        };
        
        // Если скорость очень маленькая, полностью останавливаем шайбу
        if (Math.abs(puckVelocity.x) < 0.001 && Math.abs(puckVelocity.y) < 0.001) {
          puckVelocity = { x: 0, y: 0 };
        }
        
        // Ограничиваем максимальную скорость до очень низкого значения
        const maxSpeed = 0.05;
        const currentSpeed = Math.sqrt(puckVelocity.x * puckVelocity.x + puckVelocity.y * puckVelocity.y);
        if (currentSpeed > maxSpeed) {
          puckVelocity = {
            x: (puckVelocity.x / currentSpeed) * maxSpeed,
            y: (puckVelocity.y / currentSpeed) * maxSpeed
          };
        }
        
        // Обновление позиции шайбы с очень маленьким коэффициентом
        const newPuckPosition = {
          x: puckPosition.x + puckVelocity.x,
          y: puckPosition.y + puckVelocity.y
        };
        
        // Проверка столкновений с бортами
        if (newPuckPosition.x - PUCK_SIZE/2 <= 0) {
          puckVelocity.x = Math.abs(puckVelocity.x) * 0.8;
          newPuckPosition.x = PUCK_SIZE/2;
        } else if (newPuckPosition.x + PUCK_SIZE/2 >= 100) {
          puckVelocity.x = -Math.abs(puckVelocity.x) * 0.8;
          newPuckPosition.x = 100 - PUCK_SIZE/2;
        }
        
        // Проверка забития гола
        const GOAL_WIDTH = 33;
        const goalLeftBoundary = (100 - GOAL_WIDTH) / 2;
        const goalRightBoundary = (100 + GOAL_WIDTH) / 2;
        const isInGoalArea = (x: number) => x >= goalLeftBoundary && x <= goalRightBoundary;
        
        if (newPuckPosition.y - PUCK_SIZE/2 <= 0) {
          if (isInGoalArea(newPuckPosition.x)) {
            // Гол в ворота противника
            playerScore += 1;
            toast({ title: "Гол!", description: "Вы забили гол!" });
            
            // Сброс позиции и скорости шайбы
            newPuckPosition.x = 50;
            newPuckPosition.y = 50;
            puckVelocity = { x: 0, y: 0 };
          } else {
            // Отскок от верхнего борта
            puckVelocity.y = Math.abs(puckVelocity.y) * 0.8;
            newPuckPosition.y = PUCK_SIZE/2;
          }
        } else if (newPuckPosition.y + PUCK_SIZE/2 >= 100) {
          if (isInGoalArea(newPuckPosition.x)) {
            // Гол в ворота игрока
            opponentScore += 1;
            toast({ title: "Гол!", description: "Противник забил гол!" });
            
            // Сброс позиции и скорости шайбы
            newPuckPosition.x = 50;
            newPuckPosition.y = 50;
            puckVelocity = { x: 0, y: 0 };
          } else {
            // Отскок от нижнего борта
            puckVelocity.y = -Math.abs(puckVelocity.y) * 0.8;
            newPuckPosition.y = 100 - PUCK_SIZE/2;
          }
        }
        
        // Движение компьютерного противника - очень простая логика
        let targetX = puckPosition.x;
        // Если шайба неподвижна или движется очень медленно - возвращаемся в центр
        if (Math.abs(puckVelocity.x) < 0.002 && Math.abs(puckVelocity.y) < 0.002) {
          targetX = 50;
        }
        
        // Очень плавное перемещение
        const newOpponentX = opponentPaddlePos.x + (targetX - opponentPaddlePos.x) * PADDLE_SPEED * 0.05;
        opponentPaddlePos = {
          x: Math.max(10, Math.min(90, newOpponentX)),
          y: opponentPaddlePos.y
        };
        
        // Проверка столкновений с ракетками - упрощенная версия
        const checkPaddleCollision = (paddlePos: Vector2D) => {
          const dx = newPuckPosition.x - paddlePos.x;
          const dy = newPuckPosition.y - paddlePos.y;
          const distance = Math.sqrt(dx*dx + dy*dy);
          
          if (distance < (PADDLE_SIZE/2 + PUCK_SIZE/2)) {
            // Вычисляем вектор отталкивания (от центра ракетки)
            const angle = Math.atan2(dy, dx);
            const impactForce = 0.03; // Очень небольшая сила удара
            
            // Устанавливаем скорость шайбы
            puckVelocity = {
              x: Math.cos(angle) * impactForce,
              y: Math.sin(angle) * impactForce
            };
            
            // Отодвигаем шайбу от ракетки
            const pushDistance = (PADDLE_SIZE/2 + PUCK_SIZE/2) - distance + 1;
            newPuckPosition.x += Math.cos(angle) * pushDistance;
            newPuckPosition.y += Math.sin(angle) * pushDistance;
            
            return true;
          }
          return false;
        };
        
        // Сначала проверяем столкновение с игроком, затем с оппонентом
        const hitPlayer = checkPaddleCollision(playerPaddlePos);
        if (!hitPlayer) {
          checkPaddleCollision(opponentPaddlePos);
        }
        
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
