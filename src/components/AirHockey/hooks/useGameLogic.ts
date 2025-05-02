
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

// Вспомогательные функции для работы с векторами
const limitVectorMagnitude = (vector: Vector2D, maxMagnitude: number): Vector2D => {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  
  if (magnitude > maxMagnitude) {
    const scaleFactor = maxMagnitude / magnitude;
    return {
      x: vector.x * scaleFactor,
      y: vector.y * scaleFactor
    };
  }
  
  return vector;
};

export const useGameLogic = (config: GameConfig) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const previousTimeRef = useRef<number[]>([]);
  const { toast } = useToast();
  
  const startGame = () => {
    // Случайное начальное направление шайбы
    const angle = Math.random() * Math.PI * 2;
    const initialSpeed = config.INITIAL_PUCK_SPEED;
    
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      gamePaused: false,
      puckPosition: { x: 50, y: 50 },
      puckVelocity: { 
        x: Math.cos(angle) * initialSpeed, 
        y: Math.sin(angle) * initialSpeed 
      }
    }));
    
    toast({
      title: "Игра началась!",
      description: "Используйте мышь или палец, чтобы управлять ракеткой",
    });
  };

  const resetGame = () => {
    setGameState(initialState);
    previousTimeRef.current = [];
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
      
      // Сохраняем несколько последних временных точек для сглаживания
      previousTimeRef.current.push(deltaTime);
      if (previousTimeRef.current.length > 5) {
        previousTimeRef.current.shift();
      }
      
      // Используем сглаженное значение deltaTime
      const avgDeltaTime = previousTimeRef.current.reduce((a, b) => a + b, 0) / 
                           previousTimeRef.current.length;
      
      // Нормализуем deltaTime, чтобы игра работала стабильно на разных устройствах
      const normalizedDeltaTime = Math.min(avgDeltaTime, 30);

      setGameState(prev => {
        const { 
          PADDLE_SIZE, 
          PUCK_SIZE, 
          FRICTION, 
          PADDLE_SPEED, 
          COLLISION_DAMPING, 
          MAX_PUCK_SPEED,
          REBOUND_MULTIPLIER 
        } = config;
        
        let { puckPosition, puckVelocity, playerPaddlePos, opponentPaddlePos, playerScore, opponentScore } = prev;
        
        // Движение шайбы с учетом трения
        puckVelocity = {
          x: puckVelocity.x * FRICTION,
          y: puckVelocity.y * FRICTION
        };
        
        // Применяем ограничение максимальной скорости
        puckVelocity = limitVectorMagnitude(puckVelocity, MAX_PUCK_SPEED);
        
        // Обновление позиции шайбы с нормализованным deltaTime
        let newPuckPosition = {
          x: puckPosition.x + puckVelocity.x * normalizedDeltaTime,
          y: puckPosition.y + puckVelocity.y * normalizedDeltaTime
        };
        
        // Проверка столкновений с боковыми бортами
        if (newPuckPosition.x <= 0 + PUCK_SIZE/2) {
          puckVelocity.x = Math.abs(puckVelocity.x) * COLLISION_DAMPING;
          newPuckPosition.x = PUCK_SIZE/2;
        } else if (newPuckPosition.x >= 100 - PUCK_SIZE/2) {
          puckVelocity.x = -Math.abs(puckVelocity.x) * COLLISION_DAMPING;
          newPuckPosition.x = 100 - PUCK_SIZE/2;
        }
        
        // Проверка столкновений с верхним и нижним бортами (если не попали в ворота)
        const GOAL_WIDTH = 33; // Ширина ворот (33% от ширины поля)
        const goalLeftBoundary = (100 - GOAL_WIDTH) / 2;
        const goalRightBoundary = (100 + GOAL_WIDTH) / 2;
        
        const isInGoalArea = (x: number) => x >= goalLeftBoundary && x <= goalRightBoundary;
        
        // Проверка забития гола
        if (newPuckPosition.y <= 0 && isInGoalArea(newPuckPosition.x)) {
          // Гол в ворота противника
          playerScore += 1;
          toast({ title: "Гол!", description: "Вы забили гол!" });
          
          // Сброс позиции и скорости шайбы
          newPuckPosition = { x: 50, y: 50 };
          puckVelocity = { x: 0, y: 0 };
        } else if (newPuckPosition.y <= 0) {
          // Отскок от верхнего борта
          puckVelocity.y = Math.abs(puckVelocity.y) * COLLISION_DAMPING;
          newPuckPosition.y = PUCK_SIZE/2;
        }
        
        if (newPuckPosition.y >= 100 && isInGoalArea(newPuckPosition.x)) {
          // Гол в ворота игрока
          opponentScore += 1;
          toast({ title: "Гол!", description: "Противник забил гол!" });
          
          // Сброс позиции и скорости шайбы
          newPuckPosition = { x: 50, y: 50 };
          puckVelocity = { x: 0, y: 0 };
        } else if (newPuckPosition.y >= 100) {
          // Отскок от нижнего борта
          puckVelocity.y = -Math.abs(puckVelocity.y) * COLLISION_DAMPING;
          newPuckPosition.y = 100 - PUCK_SIZE/2;
        }
        
        // Искусственный интеллект для оппонента (движение к шайбе с предсказанием)
        let targetX = newPuckPosition.x;
        
        // Если шайба движется вверх, пытаемся предсказать, где она будет
        if (puckVelocity.y < 0) {
          const timeToReachOpponent = (opponentPaddlePos.y - newPuckPosition.y) / -puckVelocity.y;
          if (timeToReachOpponent > 0) {
            targetX = newPuckPosition.x + puckVelocity.x * timeToReachOpponent;
          }
        }
        
        // Добавляем небольшую случайную погрешность для более реалистичного поведения
        targetX += (Math.random() - 0.5) * 10;
        
        // Ограничиваем движение компьютера, чтобы игрок имел шанс победить
        const newOpponentX = opponentPaddlePos.x + (targetX - opponentPaddlePos.x) * 
                             PADDLE_SPEED * (normalizedDeltaTime / 150);
        
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
            // Вектор от ракетки к шайбе (нормализованный)
            const nx = -dx / distance;
            const ny = -dy / distance;
            
            // Скорость ракетки (для игрока это разница с предыдущей позицией)
            const paddleSpeed = paddlePos === playerPaddlePos ? 0.1 : 0.05;
            
            // Базовая скорость отскока (текущая скорость шайбы + бонус от скорости ракетки)
            let speed = Math.sqrt(puckVelocity.x * puckVelocity.x + puckVelocity.y * puckVelocity.y) + paddleSpeed;
            
            // Применяем множитель отскока и ограничиваем скорость
            speed = Math.min(speed * REBOUND_MULTIPLIER, MAX_PUCK_SPEED);
            
            // Новый вектор скорости
            puckVelocity = {
              x: nx * speed,
              y: ny * speed
            };
            
            // Отодвигаем шайбу от ракетки, чтобы избежать "прилипания"
            const safeDistance = (PADDLE_SIZE + PUCK_SIZE) / 2 + 1;
            newPuckPosition = {
              x: paddlePos.x + (-nx * safeDistance),
              y: paddlePos.y + (-ny * safeDistance)
            };
            
            return true;
          }
          return false;
        };
        
        // Сначала проверяем столкновение с игроком, затем с оппонентом
        const hitPlayer = checkCollisionWithPaddle(playerPaddlePos);
        const hitOpponent = !hitPlayer && checkCollisionWithPaddle(opponentPaddlePos);
        
        // Добавляем небольшую случайность в движение шайбы для более естественного поведения
        if (hitPlayer || hitOpponent) {
          puckVelocity.x += (Math.random() - 0.5) * 0.02;
          puckVelocity.y += (Math.random() - 0.5) * 0.02;
          
          // И снова ограничиваем максимальную скорость
          puckVelocity = limitVectorMagnitude(puckVelocity, MAX_PUCK_SPEED);
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
