
import React from "react";

interface ScoreboardProps {
  playerScore: number;
  opponentScore: number;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  playerScore,
  opponentScore
}) => {
  return (
    <div className="mb-2 text-xl font-bold">
      Счёт: {playerScore} - {opponentScore}
    </div>
  );
};
