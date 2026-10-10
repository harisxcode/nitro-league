import { Vector3D } from './types';

export const ARENA = {
  // Dimensions
  LENGTH: 120, // Z from -60 to +60
  WIDTH: 80,   // X from -40 to +40
  HEIGHT: 36,  // Y from 0 to 36
  CORNER_RADIUS: 14,
  WALL_CURVE_HEIGHT: 4, // ramp up from floor to wall

  // Soccer Goal Dimensions
  GOAL_WIDTH: 24,
  GOAL_HEIGHT: 10,
  GOAL_DEPTH: 12,

  // Basketball Hoops Dimensions
  HOOP_RADIUS: 4.8,
  HOOP_HEIGHT: 13.5, // Center Y of the elevated rim
  HOOP_Z_OFFSET: 46, // Z position of rim center (team blue at -46, orange at +46)
  BACKBOARD_WIDTH: 14,
  BACKBOARD_HEIGHT: 9,
  BACKBOARD_Z_OFFSET: 51,
};

export const CAR_PHYSICS = {
  // Movement
  MAX_SPEED: 26,             // Units per sec (~80 km/h)
  SUPERSONIC_SPEED: 36,      // Units per sec (~110 km/h)
  ACCELERATION: 38,
  BOOST_ACCELERATION: 65,
  BRAKE_DECELERATION: 45,
  COAST_DECELERATION: 8,
  REVERSE_MAX_SPEED: 14,
  
  // Turning
  TURN_SPEED_LOW: 3.4,
  TURN_SPEED_HIGH: 1.8,
  DRIFT_TURN_MULTIPLIER: 2.4,
  DRIFT_SLIP_FACTOR: 0.94,

  // Jumping & Aerial
  JUMP_IMPULSE: 14,
  JUMP_HOLD_ACCEL: 22,
  JUMP_HOLD_MAX_TIME: 0.22,
  DOUBLE_JUMP_IMPULSE: 15,
  DODGE_IMPULSE: 18,
  DODGE_TORQUE: 18,
  DODGE_DURATION: 0.55,
  
  // Aerial rotation controls
  PITCH_SPEED: 4.2,
  YAW_SPEED: 4.2,
  ROLL_SPEED: 5.5,
  AIR_DRAG: 0.995,

  // Boost
  BOOST_CONSUMPTION_RATE: 33, // 100% lasts ~3 seconds
  BIG_PAD_BOOST: 100,
  SMALL_PAD_BOOST: 12,
  BIG_PAD_RESPAWN: 10,
  SMALL_PAD_RESPAWN: 4,

  // Dimensions
  WIDTH: 2.2,
  LENGTH: 4.2,
  HEIGHT: 1.6,
  WEIGHT: 1200,
};

export const BALL_PHYSICS = {
  RADIUS_SOCCER: 2.4,
  RADIUS_BASKETBALL: 2.6,
  RESTITUTION: 0.74, // Bounciness
  SURFACE_FRICTION: 0.985,
  AIR_RESISTANCE: 0.998,
  GRAVITY: -22,
  MAX_SPEED: 48,
  CAR_HIT_IMPULSE_BASE: 14,
  CAR_HIT_IMPULSE_VELOCITY_RATIO: 1.45,
};

export const KICKOFF_SPAWNS = {
  // Standard 1v1 positions (X, Z, Yaw)
  BLUE: [
    { x: 0, z: -45, rotY: 0 },         // Straight back
    { x: -18, z: -30, rotY: 0.4 },     // Diagonal left
    { x: 18, z: -30, rotY: -0.4 },     // Diagonal right
  ],
  ORANGE: [
    { x: 0, z: 45, rotY: Math.PI },    // Straight back
    { x: 18, z: 30, rotY: Math.PI - 0.4 }, // Diagonal right
    { x: -18, z: 30, rotY: Math.PI + 0.4 }, // Diagonal left
  ],
};

export const BOOST_PAD_LOCATIONS: { x: number; z: number; isBig: boolean }[] = [
  // 6 Big Corner & Midfield Orbs
  { x: -35, z: -52, isBig: true }, // Blue Left Corner
  { x: 35, z: -52, isBig: true },  // Blue Right Corner
  { x: -35, z: 52, isBig: true },  // Orange Left Corner
  { x: 35, z: 52, isBig: true },   // Orange Right Corner
  { x: -37, z: 0, isBig: true },   // Midfield Left
  { x: 37, z: 0, isBig: true },    // Midfield Right

  // Small Pads along center & defense
  { x: 0, z: -54, isBig: false },  // Blue Goal Line
  { x: 0, z: 54, isBig: false },   // Orange Goal Line
  { x: -14, z: -40, isBig: false },
  { x: 14, z: -40, isBig: false },
  { x: -14, z: 40, isBig: false },
  { x: 14, z: 40, isBig: false },
  { x: 0, z: -25, isBig: false },
  { x: 0, z: 25, isBig: false },
  { x: -18, z: -15, isBig: false },
  { x: 18, z: -15, isBig: false },
  { x: -18, z: 15, isBig: false },
  { x: 18, z: 15, isBig: false },
  { x: -10, z: 0, isBig: false },
  { x: 10, z: 0, isBig: false },
  { x: 0, z: -8, isBig: false },
  { x: 0, z: 8, isBig: false },
];

export const HOOPS_JUMP_PADS: { x: number; z: number; targetY: number }[] = [
  // Launch ramps placed in front of hoops for epic dunks!
  { x: 0, z: -32, targetY: 18 },
  { x: -14, z: -36, targetY: 18 },
  { x: 14, z: -36, targetY: 18 },
  { x: 0, z: 32, targetY: 18 },
  { x: -14, z: 36, targetY: 18 },
  { x: 14, z: 36, targetY: 18 },
];
