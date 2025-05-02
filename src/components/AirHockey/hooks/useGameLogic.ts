
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

// Проверка, если скорость близка к нулю, делаем точный нуль
// чтобы избежать вечного микродвижения
const applyThreshold = (vector: Vector2D, threshold: number = 0.001): Vector2D => {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  
  if (magnitude < threshold) {
    return { x: 0, y: 0 };
  }
  
  return vector;
};

export const useGameLogic = (config: GameConfig) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const previousTimeRef = useRef<number[]>([]);
  const lastPaddlePosRef = useRef<Vector2D | null>(null);
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
    lastPaddlePosRef.current = null;
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
      
      // Нормализуем deltaTime, чтобы игра работала стабильно
      // Ограничиваем диапазон 10-20 мс для более предсказуемой физики
      const normalizedDeltaTime = Math.min(Math.max(avgDeltaTime, 10), 20);

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
        
        // Вычисляем скорость движения ракетки игрока
        const paddleVelocity = lastPaddlePosRef.current 
          ? {
              x: (playerPaddlePos.x - lastPaddlePosRef.current.x) / normalizedDeltaTime * 0.01,
              y: (playerPaddlePos.y - lastPaddlePosRef.current.y) / normalizedDeltaTime * 0.01
            } 
          : { x: 0, y: 0 };
        
        // Сохраняем текущую позицию ракетки для следующего кадра
        lastPaddlePosRef.current = { ...playerPaddlePos };
        
        // Применяем трение - сильнее чем раньше, чтобы шайба быстрее останавливалась
        puckVelocity = {
          x: puckVelocity.x * FRICTION,
          y: puckVelocity.y * FRICTION
        };
        
        // Если скорость очень маленькая, устанавливаем её в 0
        puckVelocity = applyThreshold(puckVelocity);
        
        // Применяем ограничение максимальной скорости
        puckVelocity = limitVectorMagnitude(puckVelocity, MAX_PUCK_SPEED);
        
        // Обновление позиции шайбы на основе её скорости
        // Используем меньший коэффициент, чтобы замедлить движение
        let newPuckPosition = {
          x: puckPosition.x + puckVelocity.x * normalizedDeltaTime * 0.5,
          y: puckPosition.y + puckVelocity.y * normalizedDeltaTime * 0.5
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
        // Упрощенная версия, чтобы сделать ИИ менее идеальным
        let targetX = newPuckPosition.x;
        
        // Если шайба стоит или движется очень медленно, возвращаемся в центр
        if (Math.abs(puckVelocity.x) < 0.005 && Math.abs(puckVelocity.y) < 0.005) {
          targetX = 50;
        }
        // Если шайба движется вверх, пытаемся предсказать положение
        else if (puckVelocity.y < 0) {
          targetX = newPuckPosition.x;
        }
        
        // Добавляем небольшую случайную погрешность для более реалистичного поведения
        targetX += (Math.random() - 0.5) * 5;
        
        // Плавное движение оппонента к цели
        const newOpponentX = opponentPaddlePos.x + (targetX - opponentPaddlePos.x) * 
                             PADDLE_SPEED * (normalizedDeltaTime / 200);
        
        opponentPaddlePos = {
          x: Math.max(10, Math.min(90, newOpponentX)),
          y: opponentPaddlePos.y
        };
        
        // Проверка столкновений с ракетками
        const checkCollisionWithPaddle = (paddlePos: Vector2D, isPlayer: boolean) => {
          const dx = paddlePos.x - newPuckPosition.x;
          const dy = paddlePos.y - newPuckPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < (PADDLE_SIZE + PUCK_SIZE) / 2) {
            // Вектор от ракетки к шайбе (нормализованный)
            const nx = -dx / distance;
            const ny = -dy / distance;
            
            // Скорость ракетки 
            const paddleVelocityFactor = isPlayer 
              ? Math.sqrt(paddleVelocity.x * paddleVelocity.x + paddleVelocity.y * paddleVelocity.y)
              : 0.03; // Константная скорость для компьютера
              
            // Базовая скорость отскока (текущая скорость шайбы + влияние скорости ракетки)
            let speed = Math.sqrt(puckVelocity.x * puckVelocity.x + puckVelocity.y * puckVelocity.y);
            
            // Если шайба почти остановилась, даем ей минимальный импульс
            if (speed < 0.01) {
              speed = 0.01;
            }
            
            // Добавляем скорость от движения ракетки
            speed += paddleVelocityFactor;
            
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
        const hitPlayer = checkCollisionWithPaddle(playerPaddlePos, true);
        const hitOpponent = !hitPlayer && checkCollisionWithPaddle(opponentPaddlePos, false);
        
        // Добавляем очень маленькую случайность в движение шайбы 
        // для избежания повторяющихся паттернов
        if (hitPlayer || hitOpponent) {
          puckVelocity.x += (Math.random() - 0.5) * 0.005;
          puckVelocity.y += (Math.random() - 0.5) * 0.005;
          
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
