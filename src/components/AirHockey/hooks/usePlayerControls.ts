
import { useEffect } from "react";
import { Vector2D } from "../types";

interface UsePlayerControlsProps {
  gameRef: React.RefObject<HTMLDivElement>;
  gameStarted: boolean;
  gamePaused: boolean;
  onPositionUpdate: (position: Vector2D) => void;
}

export const usePlayerControls = ({
  gameRef,
  gameStarted,
  gamePaused,
  onPositionUpdate
}: UsePlayerControlsProps) => {
  
  // Обработчик движения мыши/тача для управления ракеткой игрока
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!gameRef.current || !gameStarted || gamePaused) return;
      
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
      
      onPositionUpdate({ x, y: limitedY });
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
  }, [gameRef, gameStarted, gamePaused, onPositionUpdate]);
};
