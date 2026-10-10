import React from 'react';
import { Camera, Zap, ShieldAlert, Wifi, Pause } from 'lucide-react';
import { MatchScore, GameMode, MatchType, GameEvent } from '../game/types';

interface HUDProps {
  score: MatchScore;
  timeRemaining: number;
  isOvertime: boolean;
  mode: GameMode;
  matchType: MatchType;
  roomId?: string;
  pingMs?: number;
  boostAmount: number;
  speedKph: number;
  isSupersonic: boolean;
  isBallCam: boolean;
  events: GameEvent[];
  chatFeed: { sender: string; text: string; team: string }[];
  onToggleBallCam: () => void;
  onPause: () => void;
  onResetBall?: () => void;
  // Touch event callbacks
  onTouchSteer?: (val: number) => void;
  onTouchThrottle?: (val: number) => void;
  onTouchBoost?: (active: boolean) => void;
  onTouchJump?: (active: boolean) => void;
  onTouchDrift?: (active: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  timeRemaining,
  isOvertime,
  mode,
  matchType,
  roomId,
  pingMs,
  boostAmount,
  speedKph,
  isSupersonic,
  isBallCam,
  events,
  chatFeed,
  onToggleBallCam,
  onPause,
  onResetBall,
  onTouchSteer,
  onTouchThrottle,
  onTouchBoost,
  onTouchJump,
  onTouchDrift,
}) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const boostPct = Math.round(boostAmount);
  // Circular gauge calculations
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (boostPct / 100) * circumference;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 font-sans">
      {/* 1. TOP CENTER SCOREBOARD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
        <div className="flex items-center bg-slate-950/85 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden px-1 py-1">
          {/* Blue Team Score */}
          <div className="flex items-center gap-3 px-4 py-1 bg-gradient-to-r from-cyan-950/90 to-blue-950/40 rounded-lg">
            <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-400">BLUE</span>
            <span className="text-3xl font-black font-display text-white tabular-nums min-w-[28px] text-center">
              {score.blue}
            </span>
          </div>

          {/* Match Clock */}
          <div className="px-5 py-1 text-center min-w-[100px]">
            {isOvertime ? (
              <span className="text-sm font-black text-amber-400 uppercase tracking-widest animate-pulse font-display">
                + OVERTIME
              </span>
            ) : (
              <span
                className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                  timeRemaining <= 30 ? 'text-red-400 animate-pulse' : 'text-slate-100'
                }`}
              >
                {timeFormatted}
              </span>
            )}
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              {mode === 'basketball' ? 'HOOPS' : 'SOCCAR'}
            </div>
          </div>

          {/* Orange Team Score */}
          <div className="flex items-center gap-3 px-4 py-1 bg-gradient-to-l from-orange-950/90 to-amber-950/40 rounded-lg">
            <span className="text-3xl font-black font-display text-white tabular-nums min-w-[28px] text-center">
              {score.orange}
            </span>
            <span className="text-xs uppercase font-extrabold tracking-wider text-orange-400">ORANGE</span>
          </div>
        </div>

        {/* Room / Status Ticker */}
        <div className="mt-1.5 flex items-center gap-3 text-[11px] font-mono text-slate-300 bg-slate-950/60 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/10">
          <span>{matchType === 'online' ? `ROOM: ${roomId}` : (matchType === 'freeplay' ? 'FREEPLAY TRAINING' : 'OFFLINE MATCH')}</span>
          {matchType === 'online' && pingMs !== undefined && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3 h-3" />
              <span>{pingMs}ms</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. TOP RIGHT PAUSE / RESET BUTTONS */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
        {matchType === 'freeplay' && onResetBall && (
          <button
            onClick={onResetBall}
            className="px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 backdrop-blur-md text-xs font-mono transition-colors shadow-lg cursor-pointer"
          >
            [R] Reset Ball
          </button>
        )}
        <button
          onClick={onPause}
          className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 backdrop-blur-md transition-colors shadow-lg cursor-pointer"
          title="Pause Game [ESC]"
        >
          <Pause className="w-4 h-4" />
        </button>
      </div>

      {/* 3. CHAT FEED & NOTIFICATIONS (LEFT) */}
      <div className="absolute top-24 left-6 max-w-sm flex flex-col gap-1.5 pointer-events-none">
        {chatFeed.slice(-5).map((chat, idx) => (
          <div
            key={idx}
            className="px-2.5 py-1 rounded bg-slate-950/75 backdrop-blur-md border border-white/10 text-xs shadow-md animate-in fade-in slide-in-from-left duration-150"
          >
            <span className={chat.team === 'blue' ? 'text-cyan-400 font-bold' : 'text-orange-400 font-bold'}>
              {chat.sender}:{' '}
            </span>
            <span className="text-white">{chat.text}</span>
          </div>
        ))}
      </div>

      {/* 4. EVENT FEED (RIGHT) */}
      <div className="absolute top-20 right-6 flex flex-col gap-2 pointer-events-none items-end">
        {events.slice(-3).map((ev) => (
          <div
            key={ev.id}
            className="px-3.5 py-1.5 rounded-lg bg-slate-950/80 border border-cyan-500/40 backdrop-blur-md flex items-center gap-2 shadow-xl animate-in fade-in zoom-in-95 duration-200"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current" />
            <div className="text-xs">
              <span className="font-bold text-white uppercase">{ev.message}</span>
              <span className="text-[10px] text-slate-400 ml-1.5">({ev.playerName})</span>
            </div>
          </div>
        ))}
      </div>

      {/* 5. BOTTOM LEFT: BALL CAM TOGGLE */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <button
          onClick={onToggleBallCam}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl backdrop-blur-xl border transition-all shadow-xl cursor-pointer ${
            isBallCam
              ? 'bg-emerald-950/80 border-emerald-400/80 text-emerald-300 shadow-emerald-950/50'
              : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">CAMERA [C]</span>
            <span className="text-xs font-black tracking-wide font-display">
              {isBallCam ? 'BALL CAM' : 'CAR CAM'}
            </span>
          </div>
        </button>
      </div>

      {/* 6. BOTTOM RIGHT: ROCKET BOOST GAUGE & SPEEDOMETER */}
      <div className="absolute bottom-6 right-6 flex flex-col items-center pointer-events-none">
        {/* Supersonic Shockwave Tag */}
        {isSupersonic && (
          <div className="mb-2 px-3 py-0.5 rounded-md bg-purple-600/90 text-white text-[11px] font-black uppercase tracking-widest font-display shadow-lg animate-pulse flex items-center gap-1 border border-purple-300">
            <Zap className="w-3 h-3 fill-current" />
            <span>SUPERSONIC</span>
          </div>
        )}

        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Radial Boost Meter SVG */}
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-slate-800"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Active Boost Progress */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="url(#boostGradient)"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-[stroke-dashoffset] duration-75"
            />
            <defs>
              <linearGradient id="boostGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="60%" stopColor="#ff6600" />
                <stop offset="100%" stopColor="#00f0ff" />
              </linearGradient>
            </defs>
          </svg>

          {/* Centered Boost Number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-4xl font-black font-display tabular-nums tracking-tighter ${
                boostPct > 20 ? 'text-white' : 'text-orange-400'
              }`}
            >
              {boostPct}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 -mt-1">
              BOOST
            </span>
          </div>
        </div>

        {/* Speedometer readout */}
        <div className="mt-1 flex items-baseline gap-1 font-mono text-slate-300">
          <span className="text-sm font-bold tabular-nums">{Math.round(speedKph)}</span>
          <span className="text-[10px] uppercase text-slate-500 font-sans">KPH</span>
        </div>
      </div>

      {/* 7. TOUCH SCREEN VIRTUAL CONTROLS (for mobile / tablet or touch devices) */}
      <div className="md:hidden absolute bottom-24 left-4 right-4 flex justify-between pointer-events-auto">
        {/* Left Thumb: Steering */}
        <div className="flex gap-2">
          <button
            onTouchStart={() => onTouchSteer && onTouchSteer(-1)}
            onTouchEnd={() => onTouchSteer && onTouchSteer(0)}
            className="w-14 h-14 rounded-2xl bg-slate-900/80 active:bg-cyan-500/80 border border-white/20 flex items-center justify-center font-bold text-lg text-white"
          >
            ←
          </button>
          <button
            onTouchStart={() => onTouchSteer && onTouchSteer(1)}
            onTouchEnd={() => onTouchSteer && onTouchSteer(0)}
            className="w-14 h-14 rounded-2xl bg-slate-900/80 active:bg-cyan-500/80 border border-white/20 flex items-center justify-center font-bold text-lg text-white"
          >
            →
          </button>
        </div>

        {/* Right Thumb: Gas, Jump, Boost */}
        <div className="flex items-center gap-2">
          <button
            onTouchStart={() => onTouchJump && onTouchJump(true)}
            onTouchEnd={() => onTouchJump && onTouchJump(false)}
            className="w-13 h-13 rounded-full bg-slate-900/80 active:bg-emerald-500 border border-white/20 flex items-center justify-center text-xs font-bold text-white uppercase"
          >
            JUMP
          </button>
          <button
            onTouchStart={() => onTouchBoost && onTouchBoost(true)}
            onTouchEnd={() => onTouchBoost && onTouchBoost(false)}
            className="w-14 h-14 rounded-full bg-orange-600/80 active:bg-orange-500 border border-orange-300 flex items-center justify-center text-xs font-bold text-white uppercase shadow-lg"
          >
            BOOST
          </button>
          <div className="flex flex-col gap-1">
            <button
              onTouchStart={() => onTouchThrottle && onTouchThrottle(1)}
              onTouchEnd={() => onTouchThrottle && onTouchThrottle(0)}
              className="w-12 h-10 rounded-lg bg-slate-900/80 active:bg-cyan-500 border border-white/20 flex items-center justify-center text-xs font-bold text-white uppercase"
            >
              GAS
            </button>
            <button
              onTouchStart={() => onTouchThrottle && onTouchThrottle(-1)}
              onTouchEnd={() => onTouchThrottle && onTouchThrottle(0)}
              className="w-12 h-10 rounded-lg bg-slate-900/80 active:bg-red-500 border border-white/20 flex items-center justify-center text-xs font-bold text-white uppercase"
            >
              REV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
