import React, { useState } from 'react';
import { Play, Users, Wrench, Shield, CircleDot, Dna, Volume2, VolumeX, Sparkles, Trophy } from 'lucide-react';
import { GameMode, MatchType, BotDifficulty, CarCustomization } from '../game/types';

interface MainMenuProps {
  onStartMatch: (settings: {
    mode: GameMode;
    matchType: MatchType;
    roomId?: string;
    botCount: number;
    botDifficulty: BotDifficulty;
    playerName: string;
  }) => void;
  onOpenGarage: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  customization: CarCustomization;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartMatch,
  onOpenGarage,
  isMuted,
  onToggleMute,
  customization,
}) => {
  const [mode, setMode] = useState<GameMode>('soccer');
  const [matchType, setMatchType] = useState<MatchType>('offline');
  const [botCount, setBotCount] = useState<number>(1); // 1 = 1v1, 3 = 2v2
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('pro');
  const [roomCode, setRoomCode] = useState<string>('NITRO-1');
  const [playerName, setPlayerName] = useState<string>('NitroStriker');

  const handleLaunch = () => {
    onStartMatch({
      mode,
      matchType,
      roomId: matchType === 'online' ? (roomCode.trim() || 'NITRO-1').toUpperCase() : undefined,
      botCount: matchType === 'freeplay' ? 0 : botCount,
      botDifficulty,
      playerName: playerName.trim() || 'Player',
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 md:p-10 z-30 select-none overflow-y-auto">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between gap-8 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
              <span>NITRO</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300">
                LEAGUE
              </span>
            </h1>
            <div className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
              3D Rocket Car Sports Arena
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenGarage}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700/80 transition-colors shadow-sm cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
            <span>The Garage</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-lg transition-colors border border-slate-700/80 cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Central Content Split */}
      <main className="my-auto py-8 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Game Mode & Match Type Selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Mode Tabs */}
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
              Select Sport Mode
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('soccer')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'soccer'
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/40 text-white'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-base font-display">SOCCAR MODE</span>
                  <CircleDot className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Classic high-octane stadium, net goals, wall rides, and supersonic power shots.
                </p>
              </button>

              <button
                onClick={() => setMode('basketball')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'basketball'
                    ? 'border-orange-400 bg-orange-950/40 shadow-lg shadow-orange-950/40 text-white'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-base font-display">HOOPS MODE</span>
                  <Sparkles className="w-4 h-4 text-orange-400" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Elevated hoop rims, glass backboards, and aerial launch pads for slam dunks.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Match Format Tabs */}
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
              Play Category
            </div>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
              <button
                onClick={() => setMatchType('offline')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  matchType === 'offline'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Offline vs Bots
              </button>
              <button
                onClick={() => setMatchType('online')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  matchType === 'online'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Online Match
              </button>
              <button
                onClick={() => setMatchType('freeplay')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  matchType === 'freeplay'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Freeplay Training
              </button>
            </div>
          </div>

          {/* 3. Detailed Match Settings */}
          {matchType === 'offline' && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Match Format
                  </label>
                  <select
                    value={botCount}
                    onChange={(e) => setBotCount(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value={1}>1v1 Duel (You vs 1 Bot)</option>
                    <option value={3}>2v2 Doubles (You + Bot vs 2 Bots)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Bot Skill Tier
                  </label>
                  <select
                    value={botDifficulty}
                    onChange={(e) => setBotDifficulty(e.target.value as BotDifficulty)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="rookie">Rookie (Casual)</option>
                    <option value="pro">Pro (Fast Positioning & Flips)</option>
                    <option value="allstar">All-Star (Aerial Contests & Defense)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {matchType === 'online' && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Room Code
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="e.g. ARENA-1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase tracking-wider focus:outline-none focus:border-cyan-500"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Share this code with friends to join the match.</div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Pilot Tag
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {matchType === 'freeplay' && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
              Solo training arena with infinite rocket boost. Press <span className="font-mono text-cyan-400">[R]</span> anytime to reset the ball to center and practice aerials, dribbles, and wall shots.
            </div>
          )}
        </div>

        {/* Right Column: Launch Action & Car Card */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Current Car Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
              Active Battle-Car
            </div>
            <div className="text-xl font-black font-display text-white uppercase flex items-center justify-between">
              <span>{customization.body}</span>
              <button
                onClick={onOpenGarage}
                className="text-xs text-cyan-400 hover:underline font-mono normal-case cursor-pointer"
              >
                Customize →
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg border border-white/20 shadow-inner"
                style={{ backgroundColor: customization.color }}
                title="Paint"
              />
              <div
                className="w-8 h-8 rounded-lg border border-white/20 shadow-inner flex items-center justify-center"
                style={{ backgroundColor: customization.boostColor }}
                title="Boost Flame"
              >
                <Sparkles className="w-3.5 h-3.5 text-white drop-shadow" />
              </div>
              <div className="text-xs text-slate-400">
                Metallic Finish · Nitro Thrusters Ready
              </div>
            </div>
          </div>

          {/* BIG LAUNCH BUTTON */}
          <button
            onClick={handleLaunch}
            className="w-full py-4 px-6 rounded-2xl font-black font-display text-lg tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 transition-all transform hover:scale-[1.02] active:scale-[0.99] shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>ENTER ARENA</span>
          </button>
        </div>
      </main>

      {/* Footer Controls Tip */}
      <footer className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-6 font-mono">
          <span>Drive: [W/S] or [Arrows]</span>
          <span>Steer: [A/D]</span>
          <span>Jump/Flip: [Space]</span>
          <span>Boost: [Shift / Left Click]</span>
          <span>Ball Cam: [C]</span>
        </div>
        <div>Standard RL Gamepad Controllers Supported</div>
      </footer>
    </div>
  );
};
