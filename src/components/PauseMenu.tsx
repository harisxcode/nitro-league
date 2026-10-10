import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Home, Keyboard } from 'lucide-react';
import { GameMode, MatchType } from '../game/types';

interface PauseMenuProps {
  mode: GameMode;
  matchType: MatchType;
  isMuted: boolean;
  onToggleMute: () => void;
  onResume: () => void;
  onRestart: () => void;
  onQuitToMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  mode,
  matchType,
  isMuted,
  onToggleMute,
  onResume,
  onRestart,
  onQuitToMenu,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-cyan-400 font-bold mb-1">
            {matchType.toUpperCase()} {mode.toUpperCase()}
          </div>
          <h2 className="text-2xl font-black font-display tracking-tight text-white">MATCH PAUSED</h2>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide uppercase bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Match</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-orange-400" />
            <span>{matchType === 'freeplay' ? 'Reset Field' : 'Restart Match'}</span>
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-red-400" />
                <span>Unmute Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Mute Audio</span>
              </>
            )}
          </button>

          <button
            onClick={onQuitToMenu}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-slate-800/60 hover:bg-red-950/60 text-slate-300 hover:text-red-300 transition-colors flex items-center justify-center gap-2 border border-slate-700/60 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Quit to Main Menu</span>
          </button>
        </div>

        {/* Quick Controls Cheat Sheet */}
        <div className="pt-4 border-t border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Controls Guide</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300 font-mono">
            <div>W/S: Throttle / Pitch</div>
            <div>Shift: Rocket Boost</div>
            <div>A/D: Steer / Yaw</div>
            <div>Space: Jump / Flip</div>
            <div>E: Handbrake Drift</div>
            <div>C: Toggle Ball Cam</div>
            <div>R: Instant Ball Reset</div>
            <div>1-4: Quick Chat</div>
          </div>
        </div>
      </div>
    </div>
  );
};
