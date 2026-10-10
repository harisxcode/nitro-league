/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameRenderer } from './game/graphics';
import { InputManager } from './game/controls';
import { BotController } from './game/bot';
import { NetworkClient } from './game/network';
import { sound } from './game/audio';
import {
  PlayerCarState,
  BallState,
  BoostPad,
  GameMode,
  MatchType,
  BotDifficulty,
  CarCustomization,
  MatchScore,
  GameEvent,
  Team,
} from './game/types';
import {
  createInitialBall,
  createInitialBoostPads,
  updateCar,
  updateBall,
  checkCarBallCollision,
  checkCarCarCollision,
  updateBoostPads,
  dist3D,
} from './game/physics';
import { KICKOFF_SPAWNS } from './game/constants';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { GarageModal } from './components/GarageModal';
import { PauseMenu } from './components/PauseMenu';
import { GoalCelebration } from './components/GoalCelebration';
import { QuickChat } from './components/QuickChat';

const DEFAULT_CUSTOMIZATION: CarCustomization = {
  body: 'octane',
  color: '#0284c7', // Sapphire Blue
  accentColor: '#18181b',
  boostColor: '#00f0ff', // Plasma Cyan
  trailColor: '#00f0ff',
  wheelColor: '#cbd5e1',
};

export default function App() {
  // Screen state
  const [screen, setScreen] = useState<'menu' | 'playing'>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Vehicle customization
  const [customization, setCustomization] = useState<CarCustomization>(() => {
    try {
      const saved = localStorage.getItem('nitro_customization');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOMIZATION;
    } catch {
      return DEFAULT_CUSTOMIZATION;
    }
  });

  // Match Configuration
  const [mode, setMode] = useState<GameMode>('soccer');
  const [matchType, setMatchType] = useState<MatchType>('offline');
  const [roomId, setRoomId] = useState<string>('NITRO-1');
  const [playerName, setPlayerName] = useState<string>('NitroAce');
  const [botCount, setBotCount] = useState<number>(1);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('pro');

  // Live In-Game State
  const [score, setScore] = useState<MatchScore>({ blue: 0, orange: 0 });
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 mins
  const [isOvertime, setIsOvertime] = useState<boolean>(false);
  const [playerBoost, setPlayerBoost] = useState<number>(33);
  const [playerSpeedKph, setPlayerSpeedKph] = useState<number>(0);
  const [isSupersonic, setIsSupersonic] = useState<boolean>(false);
  const [isBallCam, setIsBallCam] = useState<boolean>(true);
  const [pingMs, setPingMs] = useState<number>(0);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [chatFeed, setChatFeed] = useState<{ sender: string; text: string; team: string }[]>([]);

  // Goal celebration modal state
  const [goalCelebration, setGoalCelebration] = useState<{
    active: boolean;
    team: Team;
    scorer: string;
    speedKph: number;
    countdown: number;
  } | null>(null);

  // References to game canvas and sub-systems
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const networkClientRef = useRef<NetworkClient | null>(null);
  const botControllersRef = useRef<Map<string, BotController>>(new Map());

  // Mutable Physics Game State in Ref for 60FPS loop
  const gameStateRef = useRef<{
    playerCar: PlayerCarState | null;
    allCars: Map<string, PlayerCarState>;
    ball: BallState;
    boostPads: BoostPad[];
    matchState: 'countdown' | 'playing' | 'goal' | 'gameover';
    countdownSeconds: number;
    goalResetTimer: number;
    timeRemaining: number;
    score: MatchScore;
    isOvertime: boolean;
    lastTick: number;
  }>({
    playerCar: null,
    allCars: new Map(),
    ball: createInitialBall('soccer'),
    boostPads: createInitialBoostPads(),
    matchState: 'countdown',
    countdownSeconds: 3,
    goalResetTimer: 0,
    timeRemaining: 300,
    score: { blue: 0, orange: 0 },
    isOvertime: false,
    lastTick: performance.now(),
  });

  // Save customization changes
  const handleCustomizationChange = (newCustom: CarCustomization) => {
    setCustomization(newCustom);
    try {
      localStorage.setItem('nitro_customization', JSON.stringify(newCustom));
    } catch {}
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Add event notification helper
  const addGameEvent = useCallback((type: GameEvent['type'], team: Team, pName: string, msg: string, speedKph?: number) => {
    const newEvent: GameEvent = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      team,
      playerName: pName,
      message: msg,
      timestamp: Date.now(),
      speedKph,
    };
    setEvents((prev) => [...prev.slice(-4), newEvent]);
  }, []);

  // Reset cars and ball to kickoff positions
  const resetToKickoff = useCallback((matchMode: GameMode) => {
    const state = gameStateRef.current;
    state.ball = createInitialBall(matchMode);
    state.matchState = 'countdown';
    state.countdownSeconds = 3;

    // Reposition cars based on kickoff slots
    let blueIdx = 0;
    let orangeIdx = 0;

    for (const car of state.allCars.values()) {
      car.velocity = { x: 0, y: 0, z: 0 };
      car.angularVelocity = { x: 0, y: 0, z: 0 };
      car.boostAmount = 33;
      car.isDemolished = false;
      car.isBoosting = false;
      car.isSupersonic = false;
      car.jumpCount = 0;
      car.dodgeTimer = 0;

      if (car.team === 'blue') {
        const spawn = KICKOFF_SPAWNS.BLUE[blueIdx % KICKOFF_SPAWNS.BLUE.length];
        car.position = { x: spawn.x, y: 1.0, z: spawn.z };
        car.rotation = { x: 0, y: spawn.rotY, z: 0 };
        blueIdx++;
      } else {
        const spawn = KICKOFF_SPAWNS.ORANGE[orangeIdx % KICKOFF_SPAWNS.ORANGE.length];
        car.position = { x: spawn.x, y: 1.0, z: spawn.z };
        car.rotation = { x: 0, y: spawn.rotY, z: 0 };
        orangeIdx++;
      }
    }

    sound.playCountdownBeep(false);
  }, []);

  // Start match initialization
  const startMatch = (settings: {
    mode: GameMode;
    matchType: MatchType;
    roomId?: string;
    botCount: number;
    botDifficulty: BotDifficulty;
    playerName: string;
  }) => {
    setMode(settings.mode);
    setMatchType(settings.matchType);
    if (settings.roomId) setRoomId(settings.roomId);
    setPlayerName(settings.playerName);
    setBotCount(settings.botCount);
    setBotDifficulty(settings.botDifficulty);
    setScore({ blue: 0, orange: 0 });
    setTimeRemaining(settings.matchType === 'freeplay' ? 9999 : 300);
    setIsOvertime(false);
    setEvents([]);
    setChatFeed([]);
    setGoalCelebration(null);
    setIsPaused(false);
    setScreen('playing');
  };

  // Launch 3D Scene when screen === 'playing'
  useEffect(() => {
    if (screen !== 'playing' || !canvasContainerRef.current) return;

    // 1. Initialize Renderer
    const renderer = new GameRenderer(canvasContainerRef.current, mode);
    rendererRef.current = renderer;
    renderer.isBallCam = isBallCam;

    // 2. Initialize Input Manager
    const inputManager = new InputManager();
    inputManagerRef.current = inputManager;

    inputManager.onBallCamToggle = () => {
      setIsBallCam((prev) => {
        const next = !prev;
        if (rendererRef.current) rendererRef.current.isBallCam = next;
        return next;
      });
    };

    inputManager.onResetBall = () => {
      resetToKickoff(mode);
    };

    inputManager.onPauseToggle = () => {
      setIsPaused((prev) => !prev);
    };

    // 3. Setup Players & Cars
    const allCars = new Map<string, PlayerCarState>();
    const state = gameStateRef.current;
    state.allCars = allCars;
    state.boostPads = createInitialBoostPads();
    state.score = { blue: 0, orange: 0 };
    state.timeRemaining = matchType === 'freeplay' ? 9999 : 300;
    state.isOvertime = false;
    state.matchState = matchType === 'freeplay' ? 'playing' : 'countdown';
    state.countdownSeconds = matchType === 'freeplay' ? 0 : 3;

    // Create Local Player Car (Always on Blue team for local offline)
    const localPlayerId = 'player_local';
    const playerCar: PlayerCarState = {
      id: localPlayerId,
      name: playerName || 'Player',
      team: 'blue',
      isBot: false,
      customization,
      position: { x: 0, y: 1.0, z: -45 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      steerAngle: 0,
      boostAmount: matchType === 'freeplay' ? 100 : 33,
      isGrounded: true,
      isOnWall: false,
      isBoosting: false,
      isDrifting: false,
      isSupersonic: false,
      isJumping: false,
      jumpCount: 0,
      jumpTimer: 0,
      dodgeTimer: 0,
      score: 0,
      goals: 0,
      saves: 0,
      shots: 0,
      demolitions: 0,
      isDemolished: false,
      respawnTimer: 0,
    };

    allCars.set(localPlayerId, playerCar);
    state.playerCar = playerCar;

    // Create Bots (if offline and botCount > 0)
    botControllersRef.current.clear();
    if (matchType === 'offline' && botCount > 0) {
      // Opponent Bot 1 (Orange)
      const bot1Id = 'bot_orange_1';
      const bot1: PlayerCarState = {
        id: bot1Id,
        name: 'Orange Ace (Bot)',
        team: 'orange',
        isBot: true,
        botDifficulty,
        customization: {
          body: 'dominus',
          color: '#f97316',
          accentColor: '#18181b',
          boostColor: '#ff6600',
          trailColor: '#ff6600',
          wheelColor: '#d97706',
        },
        position: { x: 0, y: 1.0, z: 45 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: Math.PI, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        steerAngle: 0,
        boostAmount: 33,
        isGrounded: true,
        isOnWall: false,
        isBoosting: false,
        isDrifting: false,
        isSupersonic: false,
        isJumping: false,
        jumpCount: 0,
        jumpTimer: 0,
        dodgeTimer: 0,
        score: 0,
        goals: 0,
        saves: 0,
        shots: 0,
        demolitions: 0,
        isDemolished: false,
        respawnTimer: 0,
      };
      allCars.set(bot1Id, bot1);
      botControllersRef.current.set(bot1Id, new BotController());

      // If 2v2 (botCount === 3): Add 1 Blue teammate bot + 1 Orange opponent bot
      if (botCount >= 3) {
        const botBlueTeammate: PlayerCarState = {
          id: 'bot_blue_2',
          name: 'Blue Wingman (Bot)',
          team: 'blue',
          isBot: true,
          botDifficulty,
          customization: {
            body: 'fennec',
            color: '#06b6d4',
            accentColor: '#18181b',
            boostColor: '#00f0ff',
            trailColor: '#00f0ff',
            wheelColor: '#38bdf8',
          },
          position: { x: -18, y: 1.0, z: -30 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0.4, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 },
          steerAngle: 0,
          boostAmount: 33,
          isGrounded: true,
          isOnWall: false,
          isBoosting: false,
          isDrifting: false,
          isSupersonic: false,
          isJumping: false,
          jumpCount: 0,
          jumpTimer: 0,
          dodgeTimer: 0,
          score: 0,
          goals: 0,
          saves: 0,
          shots: 0,
          demolitions: 0,
          isDemolished: false,
          respawnTimer: 0,
        };
        allCars.set('bot_blue_2', botBlueTeammate);
        botControllersRef.current.set('bot_blue_2', new BotController());

        const botOrange2: PlayerCarState = {
          id: 'bot_orange_2',
          name: 'Orange Defender (Bot)',
          team: 'orange',
          isBot: true,
          botDifficulty,
          customization: {
            body: 'octane',
            color: '#ef4444',
            accentColor: '#18181b',
            boostColor: '#f97316',
            trailColor: '#f97316',
            wheelColor: '#fb923c',
          },
          position: { x: 18, y: 1.0, z: 30 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: Math.PI - 0.4, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 },
          steerAngle: 0,
          boostAmount: 33,
          isGrounded: true,
          isOnWall: false,
          isBoosting: false,
          isDrifting: false,
          isSupersonic: false,
          isJumping: false,
          jumpCount: 0,
          jumpTimer: 0,
          dodgeTimer: 0,
          score: 0,
          goals: 0,
          saves: 0,
          shots: 0,
          demolitions: 0,
          isDemolished: false,
          respawnTimer: 0,
        };
        allCars.set('bot_orange_2', botOrange2);
        botControllersRef.current.set('bot_orange_2', new BotController());
      }
    }

    // 4. Online Networking (if online mode)
    if (matchType === 'online') {
      const netClient = new NetworkClient();
      networkClientRef.current = netClient;

      netClient.onRoomJoined = (data) => {
        playerCar.team = data.team;
        resetToKickoff(data.mode);
        // Add existing remote players
        for (const p of data.players) {
          if (p.id !== data.playerId && !allCars.has(p.id)) {
            allCars.set(p.id, {
              id: p.id,
              name: p.name,
              team: p.team,
              isBot: false,
              customization: {
                body: p.carBody || 'octane',
                color: p.team === 'blue' ? '#0284c7' : '#f97316',
                accentColor: '#18181b',
                boostColor: p.boostColor || (p.team === 'blue' ? '#00f0ff' : '#ff6600'),
                trailColor: p.boostColor || '#00f0ff',
                wheelColor: '#cbd5e1',
              },
              position: { x: 0, y: 1.0, z: p.team === 'blue' ? -45 : 45 },
              velocity: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: p.team === 'blue' ? 0 : Math.PI, z: 0 },
              angularVelocity: { x: 0, y: 0, z: 0 },
              steerAngle: 0,
              boostAmount: 33,
              isGrounded: true,
              isOnWall: false,
              isBoosting: false,
              isDrifting: false,
              isSupersonic: false,
              isJumping: false,
              jumpCount: 0,
              jumpTimer: 0,
              dodgeTimer: 0,
              score: 0,
              goals: 0,
              saves: 0,
              shots: 0,
              demolitions: 0,
              isDemolished: false,
              respawnTimer: 0,
            });
          }
        }
      };

      netClient.onPlayerJoined = (p) => {
        if (!allCars.has(p.id)) {
          allCars.set(p.id, {
            id: p.id,
            name: p.name,
            team: p.team,
            isBot: false,
            customization: {
              body: p.carBody || 'octane',
              color: p.team === 'blue' ? '#0284c7' : '#f97316',
              accentColor: '#18181b',
              boostColor: p.boostColor || '#00f0ff',
              trailColor: p.boostColor || '#00f0ff',
              wheelColor: '#cbd5e1',
            },
            position: { x: 0, y: 1.0, z: p.team === 'blue' ? -45 : 45 },
            velocity: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: p.team === 'blue' ? 0 : Math.PI, z: 0 },
            angularVelocity: { x: 0, y: 0, z: 0 },
            steerAngle: 0,
            boostAmount: 33,
            isGrounded: true,
            isOnWall: false,
            isBoosting: false,
            isDrifting: false,
            isSupersonic: false,
            isJumping: false,
            jumpCount: 0,
            jumpTimer: 0,
            dodgeTimer: 0,
            score: 0,
            goals: 0,
            saves: 0,
            shots: 0,
            demolitions: 0,
            isDemolished: false,
            respawnTimer: 0,
          });
          setChatFeed((prev) => [...prev, { sender: 'System', text: `${p.name} joined the arena!`, team: 'neutral' }]);
        }
      };

      netClient.onPlayerLeft = (pid) => {
        allCars.delete(pid);
      };

      netClient.onPlayerUpdate = (update) => {
        const remoteCar = allCars.get(update.playerId);
        if (remoteCar) {
          remoteCar.position.x = update.transform.x;
          remoteCar.position.y = update.transform.y;
          remoteCar.position.z = update.transform.z;
          remoteCar.rotation.x = update.transform.rotX;
          remoteCar.rotation.y = update.transform.rotY;
          remoteCar.rotation.z = update.transform.rotZ;
          remoteCar.velocity.x = update.transform.vx;
          remoteCar.velocity.y = update.transform.vy;
          remoteCar.velocity.z = update.transform.vz;
          remoteCar.boostAmount = update.boost;
          remoteCar.isBoosting = update.isBoosting;
          remoteCar.isSupersonic = update.isSupersonic;
        }
      };

      netClient.onBallUpdate = (b) => {
        // Only accept if not kickoff
        if (state.matchState === 'playing') {
          state.ball.position.x = b.x;
          state.ball.position.y = b.y;
          state.ball.position.z = b.z;
          state.ball.velocity.x = b.vx;
          state.ball.velocity.y = b.vy;
          state.ball.velocity.z = b.vz;
        }
      };

      netClient.onGoalEvent = (ev) => {
        setScore({ blue: ev.scoreBlue, orange: ev.scoreOrange });
        state.score = { blue: ev.scoreBlue, orange: ev.scoreOrange };
        state.matchState = 'goal';
        state.goalResetTimer = 4.0;
        setGoalCelebration({
          active: true,
          team: ev.team,
          scorer: ev.scorer,
          speedKph: ev.speedKph,
          countdown: 4.0,
        });
        sound.playGoalExplosion(mode === 'basketball');
        if (rendererRef.current) {
          rendererRef.current.triggerGoalExplosion(state.ball.position, ev.team === 'blue' ? 0x00f0ff : 0xff7700);
        }
      };

      netClient.onChat = (c) => {
        setChatFeed((prev) => [...prev.slice(-6), c]);
      };

      netClient.onError = (msg) => {
        setChatFeed((prev) => [...prev.slice(-6), { sender: 'Server', text: msg, team: 'neutral' }]);
      };

      netClient.connect(roomId, playerName, mode, customization.body, customization.boostColor);
    }

    // Initial kickoff
    resetToKickoff(mode);

    // 5. High-Frequency Animation / Physics Tick
    let animationFrameId: number;
    let netSyncTimer = 0;
    let clockTimer = 0;

    const gameLoop = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(gameLoop);

      const dt = Math.min((timestamp - state.lastTick) / 1000, 0.05);
      state.lastTick = timestamp;

      // Handle pause
      if (isPaused) {
        if (rendererRef.current && state.playerCar) {
          rendererRef.current.render(
            state.playerCar,
            Array.from(state.allCars.values()),
            state.ball,
            state.boostPads,
            0
          );
        }
        return;
      }

      // Countdown tick
      if (state.matchState === 'countdown') {
        state.countdownSeconds -= dt;
        if (state.countdownSeconds <= 0) {
          state.matchState = 'playing';
          sound.playCountdownBeep(true); // Final whistle "GO!"
        }
      }

      // Goal reset tick
      if (state.matchState === 'goal') {
        state.goalResetTimer -= dt;
        setGoalCelebration((prev) => (prev ? { ...prev, countdown: Math.max(0, state.goalResetTimer) } : null));

        if (state.goalResetTimer <= 0) {
          setGoalCelebration(null);
          resetToKickoff(mode);
        }
      }

      // Match clock countdown
      if (state.matchState === 'playing' && matchType !== 'freeplay') {
        clockTimer += dt;
        if (clockTimer >= 1.0) {
          clockTimer -= 1.0;
          if (state.timeRemaining > 0) {
            state.timeRemaining -= 1;
            setTimeRemaining(state.timeRemaining);
          } else {
            // Clock expired: Overtime or match end
            if (state.score.blue === state.score.orange && !state.isOvertime) {
              state.isOvertime = true;
              setIsOvertime(true);
              addGameEvent('overtime', 'blue', 'Arena', 'OVERTIME! Next goal wins!');
            }
          }
        }
      }

      // --- Physical Simulation ---
      if (state.playerCar && inputManagerRef.current) {
        const input = state.matchState === 'countdown'
          ? { throttle: 0, steer: 0, boost: false, jump: false, drift: false, airRollLeft: false, airRollRight: false, pitch: 0, yaw: 0 }
          : inputManagerRef.current.getInput();

        // Infinite boost in freeplay
        if (matchType === 'freeplay') {
          state.playerCar.boostAmount = 100;
        }

        // Update player vehicle
        updateCar(state.playerCar, input, dt, mode, true);

        // Sound modulation
        const playerSpeed = Math.sqrt(
          state.playerCar.velocity.x * state.playerCar.velocity.x +
          state.playerCar.velocity.z * state.playerCar.velocity.z
        );
        sound.updateEngine(playerSpeed / 30, Math.abs(input.throttle) > 0.1);
        sound.updateBoost(state.playerCar.isBoosting);

        // Update React HUD state (throttled)
        setPlayerBoost(state.playerCar.boostAmount);
        setPlayerSpeedKph(playerSpeed * 2.8); // convert to KPH approximation
        setIsSupersonic(state.playerCar.isSupersonic);
      }

      // Update Bot Cars
      const carList = Array.from(state.allCars.values());
      for (const car of carList) {
        if (car.isBot && state.matchState === 'playing') {
          const botBrain = botControllersRef.current.get(car.id);
          if (botBrain) {
            const botInput = botBrain.computeInput(car, state.ball, mode, carList);
            updateCar(car, botInput, dt, mode, true);
          }
        }
      }

      // Update Ball & Detect Goals
      if (state.matchState === 'playing') {
        const goalResult = updateBall(state.ball, dt, mode);

        if (goalResult.isGoal && goalResult.scoringTeam) {
          const scoringTeam = goalResult.scoringTeam;
          if (scoringTeam === 'blue') state.score.blue++;
          else state.score.orange++;

          setScore({ ...state.score });
          state.matchState = 'goal';
          state.goalResetTimer = 4.0;

          const scorerCar = state.allCars.get(state.ball.lastTouchPlayerId || '') || state.playerCar;
          const scorerName = scorerCar ? scorerCar.name : (scoringTeam === 'blue' ? 'Blue Team' : 'Orange Team');
          const ballSpeed = Math.sqrt(
            state.ball.velocity.x * state.ball.velocity.x +
            state.ball.velocity.y * state.ball.velocity.y +
            state.ball.velocity.z * state.ball.velocity.z
          );
          const speedKph = Math.round(ballSpeed * 3.2);

          setGoalCelebration({
            active: true,
            team: scoringTeam,
            scorer: scorerName,
            speedKph,
            countdown: 4.0,
          });

          addGameEvent('goal', scoringTeam, scorerName, mode === 'basketball' ? 'SLAM DUNK!' : 'GOAL!', speedKph);
          sound.playGoalExplosion(mode === 'basketball');

          if (rendererRef.current) {
            rendererRef.current.triggerGoalExplosion(state.ball.position, scoringTeam === 'blue' ? 0x00f0ff : 0xff7700);
          }

          // Online relay
          if (networkClientRef.current) {
            networkClientRef.current.sendGoalScored(scoringTeam, scorerName, speedKph);
          }
        }

        // Car vs Ball Collisions
        for (const car of carList) {
          const hit = checkCarBallCollision(car, state.ball);
          if (hit) {
            // Shot / Save notification check
            const isAttackingGoal = (car.team === 'blue' && state.ball.position.z > 25) || (car.team === 'orange' && state.ball.position.z < -25);
            if (isAttackingGoal && Math.random() < 0.2) {
              addGameEvent('shot', car.team, car.name, 'SHOT ON GOAL!');
            }
          }
        }

        // Car vs Car Collisions & Demolitions
        for (let i = 0; i < carList.length; i++) {
          for (let j = i + 1; j < carList.length; j++) {
            checkCarCarCollision(carList[i], carList[j]);
          }
        }

        // Boost Pads
        updateBoostPads(state.boostPads, carList, dt);
      }

      // Online Client Sync (at ~30Hz)
      if (networkClientRef.current && state.playerCar) {
        netSyncTimer += dt;
        if (netSyncTimer >= 0.033) {
          netSyncTimer = 0;
          networkClientRef.current.syncPlayerState(state.playerCar);
          if (state.matchState === 'playing') {
            networkClientRef.current.syncBallState(state.ball);
          }
          setPingMs(networkClientRef.current.pingMs);
        }
      }

      // Render 3D Frame
      if (rendererRef.current && state.playerCar) {
        rendererRef.current.render(
          state.playerCar,
          carList,
          state.ball,
          state.boostPads,
          dt
        );
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      sound.cleanup();
      if (rendererRef.current) {
        rendererRef.current.cleanup();
        rendererRef.current = null;
      }
      if (inputManagerRef.current) {
        inputManagerRef.current.cleanup();
        inputManagerRef.current = null;
      }
      if (networkClientRef.current) {
        networkClientRef.current.disconnect();
        networkClientRef.current = null;
      }
    };
  }, [screen, mode, matchType, roomId, playerName, botCount, botDifficulty, customization, isBallCam, isPaused, addGameEvent, resetToKickoff]);

  // Quick chat handler
  const handleSendChat = (text: string) => {
    const pCar = gameStateRef.current.playerCar;
    const team = pCar ? pCar.team : 'blue';
    const sender = playerName || 'You';

    setChatFeed((prev) => [...prev.slice(-6), { sender, text, team }]);

    if (networkClientRef.current) {
      networkClientRef.current.sendQuickChat(sender, team, text);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D Game Canvas Viewport */}
      {screen === 'playing' && (
        <div
          ref={canvasContainerRef}
          className={`w-full h-full absolute inset-0 ${isSupersonic ? 'supersonic-vignette' : ''}`}
        />
      )}

      {/* Main Menu */}
      {screen === 'menu' && (
        <MainMenu
          onStartMatch={startMatch}
          onOpenGarage={() => setIsGarageOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          customization={customization}
        />
      )}

      {/* In-Game HUD */}
      {screen === 'playing' && (
        <>
          <HUD
            score={score}
            timeRemaining={timeRemaining}
            isOvertime={isOvertime}
            mode={mode}
            matchType={matchType}
            roomId={roomId}
            pingMs={pingMs}
            boostAmount={playerBoost}
            speedKph={playerSpeedKph}
            isSupersonic={isSupersonic}
            isBallCam={isBallCam}
            events={events}
            chatFeed={chatFeed}
            onToggleBallCam={() => {
              setIsBallCam((prev) => {
                const next = !prev;
                if (rendererRef.current) rendererRef.current.isBallCam = next;
                return next;
              });
            }}
            onPause={() => setIsPaused(true)}
            onResetBall={matchType === 'freeplay' ? () => resetToKickoff(mode) : undefined}
            onTouchSteer={(val) => inputManagerRef.current?.setTouchSteer(val)}
            onTouchThrottle={(val) => inputManagerRef.current?.setTouchThrottle(val)}
            onTouchBoost={(active) => inputManagerRef.current?.setTouchBoost(active)}
            onTouchJump={(active) => inputManagerRef.current?.setTouchJump(active)}
            onTouchDrift={(active) => inputManagerRef.current?.setTouchDrift(active)}
          />

          <QuickChat
            onSendChat={handleSendChat}
            team={gameStateRef.current.playerCar?.team || 'blue'}
          />

          {/* Goal celebration explosion banner */}
          {goalCelebration?.active && (
            <GoalCelebration
              team={goalCelebration.team}
              scorer={goalCelebration.scorer}
              speedKph={goalCelebration.speedKph}
              countdown={goalCelebration.countdown}
              mode={mode}
            />
          )}

          {/* Pause Menu */}
          {isPaused && (
            <PauseMenu
              mode={mode}
              matchType={matchType}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onResume={() => setIsPaused(false)}
              onRestart={() => {
                setIsPaused(false);
                setScore({ blue: 0, orange: 0 });
                setTimeRemaining(matchType === 'freeplay' ? 9999 : 300);
                setIsOvertime(false);
                resetToKickoff(mode);
              }}
              onQuitToMenu={() => {
                setIsPaused(false);
                setScreen('menu');
              }}
            />
          )}
        </>
      )}

      {/* The Garage 3D Showroom Modal */}
      {isGarageOpen && (
        <GarageModal
          customization={customization}
          onChange={handleCustomizationChange}
          onClose={() => setIsGarageOpen(false)}
        />
      )}
    </div>
  );
}
