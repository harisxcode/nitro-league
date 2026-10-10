import React from 'react';
import { Team, GameMode } from '../game/types';

interface GoalCelebrationProps {
  team: Team;
  scorer: string;
  speedKph: number;
  countdown: number;
  mode: GameMode;
}

export const GoalCelebration: React.FC<GoalCelebrationProps> = ({
  team,
  scorer,
  speedKph,
  countdown,
  mode,
}) => {
  const isBlue = team === 'blue';
  const term = mode === 'basketball' ? 'SLAM DUNK!' : 'GOAL!';

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none select-none bg-black/40 backdrop-blur-[2px] animate-in fade-in zoom-in-95 duration-200">
      {/* Radiant explosion glow */}
      <div
        className={`absolute w-[600px] h-[300px] rounded-full blur-[120px] opacity-40 pointer-events-none ${
          isBlue ? 'bg-cyan-500' : 'bg-orange-500'
        }`}
      />

      {/* Main Scoring Banner */}
      <div className="relative flex flex-col items-center">
        <div
          className={`text-6xl md:text-8xl font-black italic tracking-widest drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] font-display uppercase animate-bounce ${
            isBlue
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500'
              : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-500 to-red-500'
          }`}
        >
          {term}
        </div>

        {/* Scorer Info */}
        <div className="mt-4 px-6 py-2.5 rounded-lg bg-slate-950/85 border border-white/20 backdrop-blur-md flex items-center gap-4 shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Scored By</span>
            <span className={`text-base font-bold ${isBlue ? 'text-cyan-300' : 'text-orange-400'}`}>
              {scorer}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Shot Speed</span>
            <span className="text-base font-mono font-bold text-white tabular-nums">
              {Math.round(speedKph)} KPH
            </span>
          </div>
        </div>

        {/* Kickoff countdown */}
        <div className="mt-6 text-sm font-semibold tracking-widest uppercase text-slate-300/90 font-mono">
          Resetting kickoff in {Math.ceil(countdown)}...
        </div>
      </div>
    </div>
  );
};
