export type GameMode = 'soccer' | 'basketball';
export type MatchType = 'offline' | 'online' | 'freeplay';
export type BotDifficulty = 'rookie' | 'pro' | 'allstar';
export type CarBodyType = 'octane' | 'dominus' | 'fennec';
export type Team = 'blue' | 'orange';

export interface CarCustomization {
  body: CarBodyType;
  color: string;
  accentColor: string;
  boostColor: string;
  trailColor: string;
  wheelColor: string;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PlayerCarState {
  id: string;
  name: string;
  team: Team;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  customization: CarCustomization;

  // Physics state
  position: Vector3D;
  velocity: Vector3D;
  rotation: { x: number; y: number; z: number }; // Euler angles in radians (pitch, yaw, roll)
  angularVelocity: Vector3D;

  // Car specific properties
  steerAngle: number;
  boostAmount: number; // 0 to 100
  isGrounded: boolean;
  isOnWall: boolean;
  isBoosting: boolean;
  isDrifting: boolean;
  isSupersonic: boolean;
  isJumping: boolean;
  jumpCount: number; // 0 = ready, 1 = first jump made, 2 = flipped/dodged
  jumpTimer: number;
  dodgeTimer: number;
  dodgeDirection?: { x: number; z: number };

  // Gameplay stats
  score: number;
  goals: number;
  saves: number;
  shots: number;
  demolitions: number;
  isDemolished: boolean;
  respawnTimer: number;
}

export interface BallState {
  position: Vector3D;
  velocity: Vector3D;
  angularVelocity: Vector3D;
  radius: number;
  lastTouchPlayerId?: string;
  lastTouchTeam?: Team;
  lastTouchTime?: number;
}

export interface BoostPad {
  id: number;
  position: Vector3D;
  isBig: boolean;
  isActive: boolean;
  cooldownTimer: number;
  mesh?: any;
}

export interface JumpPad {
  id: number;
  position: Vector3D;
  direction: Vector3D;
  strength: number;
}

export interface GameEvent {
  id: string;
  type: 'goal' | 'save' | 'shot' | 'demolition' | 'epic_save' | 'kickoff' | 'overtime';
  playerName: string;
  team: Team;
  message: string;
  timestamp: number;
  speedKph?: number;
}

export interface MatchScore {
  blue: number;
  orange: number;
}

export interface MatchSettings {
  mode: GameMode;
  matchType: MatchType;
  roomId?: string;
  durationMinutes: number; // usually 5
  botCount: number; // 0, 1 (1v1), 3 (2v2)
  botDifficulty: BotDifficulty;
}
