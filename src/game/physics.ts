import { PlayerCarState, BallState, BoostPad, GameMode, Vector3D } from './types';
import { ARENA, CAR_PHYSICS, BALL_PHYSICS, BOOST_PAD_LOCATIONS } from './constants';
import { sound } from './audio';

export interface CarInput {
  throttle: number;      // -1 to 1 (W/S or Up/Down)
  steer: number;         // -1 to 1 (A/D or Left/Right)
  boost: boolean;        // Shift / Left Click / B button
  jump: boolean;         // Space / Right Click / A button
  drift: boolean;        // E / Shift / X button
  airRollLeft: boolean;  // Q / L1
  airRollRight: boolean; // E / R1
  pitch: number;         // -1 to 1 (W/S in air)
  yaw: number;           // -1 to 1 (A/D in air)
}

export function createInitialBall(mode: GameMode): BallState {
  return {
    position: {
      x: 0,
      y: mode === 'basketball' ? 5.5 : 2.5,
      z: 0,
    },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    radius: mode === 'basketball' ? BALL_PHYSICS.RADIUS_BASKETBALL : BALL_PHYSICS.RADIUS_SOCCER,
  };
}

export function createInitialBoostPads(): BoostPad[] {
  return BOOST_PAD_LOCATIONS.map((loc, idx) => ({
    id: idx,
    position: { x: loc.x, y: 0.5, z: loc.z },
    isBig: loc.isBig,
    isActive: true,
    cooldownTimer: 0,
  }));
}

// Distance helper
export function dist3D(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Forward vector calculation from Euler angles
export function getCarForwardVector(rot: { x: number; y: number; z: number }): Vector3D {
  const cy = Math.cos(rot.y);
  const sy = Math.sin(rot.y);
  const cp = Math.cos(rot.x);
  const sp = Math.sin(rot.x);
  return {
    x: sy * cp,
    y: -sp,
    z: cy * cp,
  };
}

export function getCarRightVector(rot: { x: number; y: number; z: number }): Vector3D {
  const cy = Math.cos(rot.y);
  const sy = Math.sin(rot.y);
  return {
    x: cy,
    y: 0,
    z: -sy,
  };
}

export function getCarUpVector(rot: { x: number; y: number; z: number }): Vector3D {
  const forward = getCarForwardVector(rot);
  const right = getCarRightVector(rot);
  // Cross product right x forward
  return {
    x: right.y * forward.z - right.z * forward.y,
    y: right.z * forward.x - right.x * forward.z,
    z: right.x * forward.y - right.y * forward.x,
  };
}

// Update single car physics
export function updateCar(
  car: PlayerCarState,
  input: CarInput,
  dt: number,
  mode: GameMode,
  jumpPadsActive: boolean = false
) {
  if (car.isDemolished) {
    car.respawnTimer -= dt;
    if (car.respawnTimer <= 0) {
      car.isDemolished = false;
      car.boostAmount = 33;
      car.velocity = { x: 0, y: 0, z: 0 };
      car.angularVelocity = { x: 0, y: 0, z: 0 };
    }
    return;
  }

  // Cap time step to avoid tunneling
  dt = Math.min(dt, 0.05);

  const forward = getCarForwardVector(car.rotation);
  const right = getCarRightVector(car.rotation);
  const speed = Math.sqrt(
    car.velocity.x * car.velocity.x +
    car.velocity.y * car.velocity.y +
    car.velocity.z * car.velocity.z
  );

  // Ground check (car is on floor if Y <= 1.0)
  car.isGrounded = car.position.y <= 1.05;
  if (car.isGrounded) {
    car.jumpTimer = 0;
    if (car.jumpCount !== 0 && !input.jump) {
      car.jumpCount = 0;
    }
  }

  // Boost usage
  const requestingBoost = input.boost && car.boostAmount > 0;
  if (requestingBoost) {
    car.isBoosting = true;
    car.boostAmount = Math.max(0, car.boostAmount - CAR_PHYSICS.BOOST_CONSUMPTION_RATE * dt);
    
    // Boost accelerates in direction of car nose
    const boostForce = CAR_PHYSICS.BOOST_ACCELERATION * dt;
    car.velocity.x += forward.x * boostForce;
    car.velocity.y += forward.y * boostForce;
    car.velocity.z += forward.z * boostForce;
  } else {
    car.isBoosting = false;
  }

  // Supersonic state check
  const currentSpeed = Math.sqrt(car.velocity.x * car.velocity.x + car.velocity.z * car.velocity.z);
  if (currentSpeed >= CAR_PHYSICS.SUPERSONIC_SPEED - 2) {
    if (!car.isSupersonic && !car.isBot) sound.playSupersonic();
    car.isSupersonic = true;
  } else if (currentSpeed < CAR_PHYSICS.SUPERSONIC_SPEED - 6) {
    car.isSupersonic = false;
  }

  // --- Ground Controls ---
  if (car.isGrounded) {
    // Pitch & Roll snap back to 0 on ground
    car.rotation.x *= 0.8;
    car.rotation.z *= 0.8;

    // Acceleration & Braking
    if (input.throttle > 0.05) {
      const topSpeed = car.isBoosting ? CAR_PHYSICS.SUPERSONIC_SPEED : CAR_PHYSICS.MAX_SPEED;
      if (speed < topSpeed) {
        car.velocity.x += forward.x * CAR_PHYSICS.ACCELERATION * input.throttle * dt;
        car.velocity.z += forward.z * CAR_PHYSICS.ACCELERATION * input.throttle * dt;
      }
    } else if (input.throttle < -0.05) {
      if (speed > 1) {
        // Braking
        car.velocity.x -= forward.x * CAR_PHYSICS.BRAKE_DECELERATION * dt;
        car.velocity.z -= forward.z * CAR_PHYSICS.BRAKE_DECELERATION * dt;
      } else {
        // Reverse
        if (speed < CAR_PHYSICS.REVERSE_MAX_SPEED) {
          car.velocity.x += forward.x * CAR_PHYSICS.ACCELERATION * input.throttle * dt;
          car.velocity.z += forward.z * CAR_PHYSICS.ACCELERATION * input.throttle * dt;
        }
      }
    } else {
      // Coasting drag
      car.velocity.x *= (1 - CAR_PHYSICS.COAST_DECELERATION * dt);
      car.velocity.z *= (1 - CAR_PHYSICS.COAST_DECELERATION * dt);
    }

    // Steering
    const speedRatio = Math.min(1, speed / CAR_PHYSICS.MAX_SPEED);
    const turnRate = (CAR_PHYSICS.TURN_SPEED_LOW * (1 - speedRatio * 0.45)) * (input.drift ? CAR_PHYSICS.DRIFT_TURN_MULTIPLIER : 1);
    
    if (Math.abs(input.steer) > 0.05 && speed > 0.5) {
      // Steer direction aligns with forward/backward motion
      const forwardDot = forward.x * car.velocity.x + forward.z * car.velocity.z;
      const dirSign = forwardDot >= -0.1 ? 1 : -1;
      car.rotation.y += input.steer * turnRate * dt * dirSign;
      car.steerAngle = input.steer * 0.5;
    } else {
      car.steerAngle = 0;
    }

    // Drifting / Powerslide
    car.isDrifting = input.drift && speed > 5;
    if (car.isDrifting) {
      // Lateral slip
      car.velocity.x *= CAR_PHYSICS.DRIFT_SLIP_FACTOR;
      car.velocity.z *= CAR_PHYSICS.DRIFT_SLIP_FACTOR;
      if (!car.isBot && Math.random() < 0.25) sound.playDrift();
    } else {
      // High lateral traction: align velocity closely with forward heading
      const forwardVel = forward.x * car.velocity.x + forward.z * car.velocity.z;
      const tractionFactor = 0.88;
      car.velocity.x = car.velocity.x * (1 - tractionFactor) + forward.x * forwardVel * tractionFactor;
      car.velocity.z = car.velocity.z * (1 - tractionFactor) + forward.z * forwardVel * tractionFactor;
    }

    // First Jump
    if (input.jump && car.jumpCount === 0) {
      car.velocity.y = CAR_PHYSICS.JUMP_IMPULSE;
      car.jumpCount = 1;
      car.jumpTimer = 0.01;
      car.isGrounded = false;
      if (!car.isBot) sound.playJump();
    }
  } else {
    // --- In Air Controls ---
    // Holding jump for extra height on first jump
    if (input.jump && car.jumpCount === 1 && car.jumpTimer < CAR_PHYSICS.JUMP_HOLD_MAX_TIME) {
      car.jumpTimer += dt;
      car.velocity.y += CAR_PHYSICS.JUMP_HOLD_ACCEL * dt;
    }

    // Double Jump or Directional Flip / Dodge
    if (input.jump && car.jumpCount === 1 && car.jumpTimer > 0.12 && car.dodgeTimer <= 0) {
      car.jumpCount = 2;
      const hasDirection = Math.abs(input.throttle) > 0.2 || Math.abs(input.steer) > 0.2;

      if (hasDirection) {
        // Directional dodge flip!
        car.dodgeTimer = CAR_PHYSICS.DODGE_DURATION;
        const dodgeDirX = forward.x * input.throttle + right.x * input.steer;
        const dodgeDirZ = forward.z * input.throttle + right.z * input.steer;
        const len = Math.sqrt(dodgeDirX * dodgeDirX + dodgeDirZ * dodgeDirZ) || 1;

        car.dodgeDirection = { x: dodgeDirX / len, z: dodgeDirZ / len };
        // Dodge imparts sudden linear impulse
        car.velocity.x += car.dodgeDirection.x * CAR_PHYSICS.DODGE_IMPULSE;
        car.velocity.z += car.dodgeDirection.z * CAR_PHYSICS.DODGE_IMPULSE;
        car.velocity.y = Math.max(-2, car.velocity.y * 0.2); // Arrest vertical drop during flip

        // Angular flip torque
        if (Math.abs(input.throttle) >= Math.abs(input.steer)) {
          car.angularVelocity.x = -Math.sign(input.throttle) * CAR_PHYSICS.DODGE_TORQUE;
        } else {
          car.angularVelocity.z = Math.sign(input.steer) * CAR_PHYSICS.DODGE_TORQUE;
        }

        if (!car.isBot) sound.playDodge();
      } else {
        // Pure double jump
        car.velocity.y += CAR_PHYSICS.DOUBLE_JUMP_IMPULSE;
        if (!car.isBot) sound.playJump();
      }
    }

    // Dodge animation / timer
    if (car.dodgeTimer > 0) {
      car.dodgeTimer -= dt;
      car.rotation.x += car.angularVelocity.x * dt;
      car.rotation.z += car.angularVelocity.z * dt;
      if (car.dodgeTimer <= 0) {
        car.angularVelocity.x = 0;
        car.angularVelocity.z = 0;
      }
    } else {
      // Normal aerial rotation (pitch, yaw, roll)
      if (Math.abs(input.pitch) > 0.1) {
        car.rotation.x += input.pitch * CAR_PHYSICS.PITCH_SPEED * dt;
      }
      if (Math.abs(input.yaw) > 0.1) {
        car.rotation.y += input.yaw * CAR_PHYSICS.YAW_SPEED * dt;
      }
      if (input.airRollLeft) {
        car.rotation.z += CAR_PHYSICS.ROLL_SPEED * dt;
      }
      if (input.airRollRight) {
        car.rotation.z -= CAR_PHYSICS.ROLL_SPEED * dt;
      }
    }

    // Air resistance & gravity
    car.velocity.y += BALL_PHYSICS.GRAVITY * dt;
    car.velocity.x *= CAR_PHYSICS.AIR_DRAG;
    car.velocity.z *= CAR_PHYSICS.AIR_DRAG;
  }

  // Basketball Hoops Launch Ramp Check
  if (mode === 'basketball' && jumpPadsActive && car.isGrounded) {
    const launchPadDistZ = Math.abs(car.position.z) - 32;
    if (Math.abs(launchPadDistZ) < 3.5 && Math.abs(car.position.x) < 16) {
      // Launched into the air!
      car.velocity.y = 19;
      car.velocity.z += (car.position.z > 0 ? -12 : 12);
      car.isGrounded = false;
      car.jumpCount = 1;
      if (!car.isBot) sound.playJump();
    }
  }

  // Integrate position
  car.position.x += car.velocity.x * dt;
  car.position.y += car.velocity.y * dt;
  car.position.z += car.velocity.z * dt;

  // Arena floor boundary
  if (car.position.y < 1.0) {
    car.position.y = 1.0;
    if (car.velocity.y < 0) car.velocity.y = 0;
  }

  // Arena ceiling boundary
  if (car.position.y > ARENA.HEIGHT - 2) {
    car.position.y = ARENA.HEIGHT - 2;
    if (car.velocity.y > 0) car.velocity.y = -car.velocity.y * 0.4;
  }

  // Side walls (X bounds)
  const maxAbsX = ARENA.WIDTH / 2 - 2;
  if (Math.abs(car.position.x) > maxAbsX) {
    car.position.x = Math.sign(car.position.x) * maxAbsX;
    car.velocity.x = -car.velocity.x * 0.4;
  }

  // End walls (Z bounds) with soccer goal cutout
  const maxAbsZ = ARENA.LENGTH / 2 - 2;
  const inGoalMouth = mode === 'soccer' && Math.abs(car.position.x) < ARENA.GOAL_WIDTH / 2 - 1 && car.position.y < ARENA.GOAL_HEIGHT;
  
  if (Math.abs(car.position.z) > maxAbsZ) {
    if (!inGoalMouth) {
      car.position.z = Math.sign(car.position.z) * maxAbsZ;
      car.velocity.z = -car.velocity.z * 0.4;
    } else {
      // In goal net: back of goal limit
      const goalBackLimit = (ARENA.LENGTH / 2) + ARENA.GOAL_DEPTH - 1;
      if (Math.abs(car.position.z) > goalBackLimit) {
        car.position.z = Math.sign(car.position.z) * goalBackLimit;
        car.velocity.z = 0;
      }
    }
  }
}

// Update ball physics with restitution, wall bounces, and goal checking
export function updateBall(
  ball: BallState,
  dt: number,
  mode: GameMode
): { isGoal: boolean; scoringTeam?: 'blue' | 'orange' } {
  dt = Math.min(dt, 0.05);

  // Apply gravity
  ball.velocity.y += BALL_PHYSICS.GRAVITY * dt;

  // Apply air drag
  ball.velocity.x *= BALL_PHYSICS.AIR_RESISTANCE;
  ball.velocity.y *= BALL_PHYSICS.AIR_RESISTANCE;
  ball.velocity.z *= BALL_PHYSICS.AIR_RESISTANCE;

  // Cap max speed
  const speed = Math.sqrt(
    ball.velocity.x * ball.velocity.x +
    ball.velocity.y * ball.velocity.y +
    ball.velocity.z * ball.velocity.z
  );
  if (speed > BALL_PHYSICS.MAX_SPEED) {
    const scale = BALL_PHYSICS.MAX_SPEED / speed;
    ball.velocity.x *= scale;
    ball.velocity.y *= scale;
    ball.velocity.z *= scale;
  }

  // Integrate ball position
  ball.position.x += ball.velocity.x * dt;
  ball.position.y += ball.velocity.y * dt;
  ball.position.z += ball.velocity.z * dt;

  // Ball spin rotation
  ball.angularVelocity.x = ball.velocity.z * 0.3;
  ball.angularVelocity.z = -ball.velocity.x * 0.3;

  // Floor bounce
  if (ball.position.y <= ball.radius) {
    ball.position.y = ball.radius;
    if (ball.velocity.y < 0) {
      ball.velocity.y = -ball.velocity.y * BALL_PHYSICS.RESTITUTION;
      ball.velocity.x *= BALL_PHYSICS.SURFACE_FRICTION;
      ball.velocity.z *= BALL_PHYSICS.SURFACE_FRICTION;
      if (Math.abs(ball.velocity.y) > 4) sound.playBallHit(Math.abs(ball.velocity.y) * 4);
    }
  }

  // Ceiling bounce
  if (ball.position.y >= ARENA.HEIGHT - ball.radius) {
    ball.position.y = ARENA.HEIGHT - ball.radius;
    if (ball.velocity.y > 0) {
      ball.velocity.y = -ball.velocity.y * BALL_PHYSICS.RESTITUTION;
    }
  }

  // Side wall bounce
  const maxAbsX = ARENA.WIDTH / 2 - ball.radius;
  if (Math.abs(ball.position.x) >= maxAbsX) {
    ball.position.x = Math.sign(ball.position.x) * maxAbsX;
    ball.velocity.x = -ball.velocity.x * BALL_PHYSICS.RESTITUTION;
    if (Math.abs(ball.velocity.x) > 3) sound.playBallHit(Math.abs(ball.velocity.x) * 4);
  }

  // Goal & End Wall Logic
  if (mode === 'soccer') {
    const maxAbsZ = ARENA.LENGTH / 2 - ball.radius;
    const inGoalOpening = Math.abs(ball.position.x) < ARENA.GOAL_WIDTH / 2 - ball.radius &&
                          ball.position.y < ARENA.GOAL_HEIGHT - ball.radius;

    if (Math.abs(ball.position.z) >= maxAbsZ) {
      if (inGoalOpening) {
        // Check if ball fully crossed goal line
        const goalThreshold = ARENA.LENGTH / 2 + 1.5;
        if (ball.position.z > goalThreshold) {
          return { isGoal: true, scoringTeam: 'blue' }; // Blue scored in Orange goal (+Z)
        } else if (ball.position.z < -goalThreshold) {
          return { isGoal: true, scoringTeam: 'orange' }; // Orange scored in Blue goal (-Z)
        }
      } else {
        // End wall bounce
        ball.position.z = Math.sign(ball.position.z) * maxAbsZ;
        ball.velocity.z = -ball.velocity.z * BALL_PHYSICS.RESTITUTION;
        if (Math.abs(ball.velocity.z) > 3) sound.playBallHit(Math.abs(ball.velocity.z) * 4);
      }
    }
  } else if (mode === 'basketball') {
    // Basketball Mode (Hoops)
    const maxAbsZ = ARENA.LENGTH / 2 - ball.radius;
    if (Math.abs(ball.position.z) >= maxAbsZ) {
      ball.position.z = Math.sign(ball.position.z) * maxAbsZ;
      ball.velocity.z = -ball.velocity.z * BALL_PHYSICS.RESTITUTION;
    }

    // Check elevated hoops
    const hoops = [
      { teamScoring: 'blue' as const, z: ARENA.HOOP_Z_OFFSET, backboardZ: ARENA.BACKBOARD_Z_OFFSET },
      { teamScoring: 'orange' as const, z: -ARENA.HOOP_Z_OFFSET, backboardZ: -ARENA.BACKBOARD_Z_OFFSET },
    ];

    for (const hoop of hoops) {
      // Distance to hoop rim center in XZ plane
      const dx = ball.position.x;
      const dz = ball.position.z - hoop.z;
      const distToRimCenter = Math.sqrt(dx * dx + dz * dz);
      const dy = ball.position.y - ARENA.HOOP_HEIGHT;

      // Check if ball is near rim level and falling through cylinder
      if (distToRimCenter < ARENA.HOOP_RADIUS - 0.3 && Math.abs(dy) < 1.8 && ball.velocity.y < -1) {
        // Swish! Scored a basket!
        return { isGoal: true, scoringTeam: hoop.teamScoring };
      }

      // Rim rim lip collision (bounce off metal hoop ring)
      if (Math.abs(distToRimCenter - ARENA.HOOP_RADIUS) < ball.radius && Math.abs(dy) < ball.radius) {
        const angle = Math.atan2(dz, dx);
        ball.velocity.x += Math.cos(angle) * 12;
        ball.velocity.z += Math.sin(angle) * 12;
        ball.velocity.y = Math.abs(ball.velocity.y) * 0.6 + 4;
        sound.playBallHit(25);
      }

      // Backboard bounce
      const distToBackboard = Math.abs(ball.position.z - hoop.backboardZ);
      if (distToBackboard < ball.radius + 0.5 && Math.abs(ball.position.x) < ARENA.BACKBOARD_WIDTH / 2) {
        if (ball.position.y > ARENA.HOOP_HEIGHT - 3 && ball.position.y < ARENA.HOOP_HEIGHT + ARENA.BACKBOARD_HEIGHT / 2) {
          ball.velocity.z = -ball.velocity.z * 0.85;
          ball.position.z = hoop.backboardZ - Math.sign(hoop.backboardZ) * (ball.radius + 0.6);
          sound.playBallHit(20);
        }
      }
    }
  }

  return { isGoal: false };
}

// Car vs Ball collision detection & explosive hit impulse
export function checkCarBallCollision(car: PlayerCarState, ball: BallState): boolean {
  if (car.isDemolished) return false;

  const dx = ball.position.x - car.position.x;
  const dy = ball.position.y - car.position.y;
  const dz = ball.position.z - car.position.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const hitRadius = ball.radius + 1.8;
  if (dist < hitRadius && dist > 0.001) {
    // Collision occurred!
    const normal = { x: dx / dist, y: dy / dist, z: dz / dist };
    const forward = getCarForwardVector(car.rotation);

    // Front bumper angle check: hitting with front nose gives extra "power shot" impulse!
    const frontDot = normal.x * forward.x + normal.z * forward.z;
    const isPowerShot = frontDot > 0.45;
    const powerMultiplier = isPowerShot ? 1.6 : 1.0;

    const carSpeed = Math.sqrt(car.velocity.x * car.velocity.x + car.velocity.y * car.velocity.y + car.velocity.z * car.velocity.z);
    const impulse = (BALL_PHYSICS.CAR_HIT_IMPULSE_BASE + carSpeed * BALL_PHYSICS.CAR_HIT_IMPULSE_VELOCITY_RATIO) * powerMultiplier;

    // Apply explosive hit impulse to ball
    ball.velocity.x = normal.x * impulse + car.velocity.x * 0.75;
    ball.velocity.y = Math.max(3, normal.y * impulse * 0.85 + (isPowerShot ? 6 : 2));
    ball.velocity.z = normal.z * impulse + car.velocity.z * 0.75;

    // Separate ball from car to prevent sticking
    ball.position.x = car.position.x + normal.x * (hitRadius + 0.1);
    ball.position.y = car.position.y + normal.y * (hitRadius + 0.1);
    ball.position.z = car.position.z + normal.z * (hitRadius + 0.1);

    // Update touch stats
    ball.lastTouchPlayerId = car.id;
    ball.lastTouchTeam = car.team;
    ball.lastTouchTime = Date.now();
    car.shots++;

    // Audio hit feedback
    sound.playBallHit(impulse);
    return true;
  }

  return false;
}

// Car vs Car collision & Demolition mechanic
export function checkCarCarCollision(car1: PlayerCarState, car2: PlayerCarState): boolean {
  if (car1.isDemolished || car2.isDemolished || car1.id === car2.id) return false;

  const dx = car2.position.x - car1.position.x;
  const dy = car2.position.y - car1.position.y;
  const dz = car2.position.z - car1.position.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (dist < 2.6 && dist > 0.001) {
    const normal = { x: dx / dist, y: dy / dist, z: dz / dist };

    // Demolition check: supersonic car ramming opposing team
    if (car1.isSupersonic && car1.team !== car2.team) {
      const f1 = getCarForwardVector(car1.rotation);
      const dot = f1.x * normal.x + f1.z * normal.z;
      if (dot > 0.5) {
        // Boom! Car 2 demolished!
        car2.isDemolished = true;
        car2.respawnTimer = 3.0; // 3 seconds respawn
        car1.demolitions++;
        sound.playGoalExplosion();
        return true;
      }
    }

    if (car2.isSupersonic && car2.team !== car1.team) {
      const f2 = getCarForwardVector(car2.rotation);
      const dot = f2.x * (-normal.x) + f2.z * (-normal.z);
      if (dot > 0.5) {
        car1.isDemolished = true;
        car1.respawnTimer = 3.0;
        car2.demolitions++;
        sound.playGoalExplosion();
        return true;
      }
    }

    // Elastic bounce apart
    const bounceForce = 12;
    car1.velocity.x -= normal.x * bounceForce;
    car1.velocity.z -= normal.z * bounceForce;
    car2.velocity.x += normal.x * bounceForce;
    car2.velocity.z += normal.z * bounceForce;
    return true;
  }

  return false;
}

// Boost pad collection & cooldown ticks
export function updateBoostPads(pads: BoostPad[], cars: PlayerCarState[], dt: number) {
  for (const pad of pads) {
    if (!pad.isActive) {
      pad.cooldownTimer -= dt;
      if (pad.cooldownTimer <= 0) {
        pad.isActive = true;
      }
      continue;
    }

    // Check all active cars
    for (const car of cars) {
      if (car.isDemolished) continue;
      const d = dist3D(car.position, pad.position);
      if (d < 3.2 && car.boostAmount < 100) {
        // Collect boost pad!
        const boostAward = pad.isBig ? CAR_PHYSICS.BIG_PAD_BOOST : CAR_PHYSICS.SMALL_PAD_BOOST;
        car.boostAmount = Math.min(100, car.boostAmount + boostAward);
        pad.isActive = false;
        pad.cooldownTimer = pad.isBig ? CAR_PHYSICS.BIG_PAD_RESPAWN : CAR_PHYSICS.SMALL_PAD_RESPAWN;
        if (!car.isBot) sound.playBoostPickup(pad.isBig);
        break;
      }
    }
  }
}
