
import React from "react";

export const GameRules: React.FC = () => {
  return (
    <div className="mt-4 text-center max-w-md">
      <h2 className="text-xl font-bold mb-2">Правила игры:</h2>
      <ul className="text-left list-disc pl-5">
        <li>Управляйте ракеткой с помощью мыши или пальца</li>
        <li>Забейте шайбу в ворота соперника</li>
        <li>Первый, кто наберет 7 очков, побеждает</li>
      </ul>
    </div>
  );
};
