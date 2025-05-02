
import React from "react";
import { Button } from "@/components/ui/button";

interface GameControlsProps {
  gameStarted: boolean;
  gamePaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameStarted,
  gamePaused,
  onStart,
  onPause,
  onReset
}) => {
  const handleMainButtonClick = () => {
    if (gameStarted) {
      onPause();
    } else {
      onStart();
    }
  };

  return (
    <div className="mb-4 flex gap-4">
      <Button 
        onClick={handleMainButtonClick}
        variant="default"
      >
        {gameStarted ? (gamePaused ? "Продолжить" : "Пауза") : "Начать игру"}
      </Button>
      
      <Button 
        onClick={onReset}
        variant="outline"
      >
        Сброс
      </Button>
    </div>
  );
};
