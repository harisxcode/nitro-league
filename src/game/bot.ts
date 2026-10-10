import { PlayerCarState, BallState, GameMode } from './types';
import { CarInput, getCarForwardVector, dist3D } from './physics';
import { ARENA, CAR_PHYSICS } from './constants';

export class BotController {
  private lastDodgeTime: number = 0;
  private isAttemptingAerial: boolean = false;
  private aerialTimer: number = 0;

  public computeInput(
    bot: PlayerCarState,
    ball: BallState,
    mode: GameMode,
    allCars: PlayerCarState[]
  ): CarInput {
    const input: CarInput = {
      throttle: 0,
      steer: 0,
      boost: false,
      jump: false,
      drift: false,
      airRollLeft: false,
      airRollRight: false,
      pitch: 0,
      yaw: 0,
    };

    if (bot.isDemolished) return input;

    const difficulty = bot.botDifficulty || 'pro';
    const now = Date.now();

    // Determine target goal: Blue attacks Orange goal (+Z), Orange attacks Blue goal (-Z)
    const targetGoalZ = bot.team === 'blue' ? (ARENA.LENGTH / 2) : -(ARENA.LENGTH / 2);
    const ownGoalZ = -targetGoalZ;

    // Ball prediction position (lead the target slightly based on ball velocity)
    const leadTime = difficulty === 'allstar' ? 0.35 : (difficulty === 'pro' ? 0.2 : 0.05);
    const predictedBall = {
      x: ball.position.x + ball.velocity.x * leadTime,
      y: ball.position.y + ball.velocity.y * leadTime,
      z: ball.position.z + ball.velocity.z * leadTime,
    };

    // Calculate vector from bot to predicted ball
    const dx = predictedBall.x - bot.position.x;
    const dz = predictedBall.z - bot.position.z;
    const distToBall = Math.sqrt(dx * dx + dz * dz);

    // Desired heading angle
    const targetAngle = Math.atan2(dx, dz);
    let angleDiff = targetAngle - bot.rotation.y;
    // Normalize to -PI to +PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const forward = getCarForwardVector(bot.rotation);

    // Defense logic: If ball is behind bot towards own goal, rotate back to goal first
    const isBallBehind = bot.team === 'blue' ? (ball.position.z < bot.position.z - 6) : (ball.position.z > bot.position.z + 6);
    const isDefending = (bot.team === 'blue' && ball.position.z < -10) || (bot.team === 'orange' && ball.position.z > 10);

    if (isBallBehind && difficulty !== 'rookie' && isDefending) {
      // Rotate back towards own goal post
      const defenseGoalX = 0;
      const defAngle = Math.atan2(defenseGoalX - bot.position.x, ownGoalZ - bot.position.z);
      let defDiff = defAngle - bot.rotation.y;
      while (defDiff > Math.PI) defDiff -= Math.PI * 2;
      while (defDiff < -Math.PI) defDiff += Math.PI * 2;

      input.steer = Math.max(-1, Math.min(1, defDiff * 2.5));
      input.throttle = 1;
      if (Math.abs(defDiff) < 0.3 && bot.boostAmount > 30) {
        input.boost = true;
      }
      return input;
    }

    // Steering towards ball
    input.steer = Math.max(-1, Math.min(1, angleDiff * (difficulty === 'allstar' ? 3.0 : 2.0)));

    // Sharp turn drift
    if (Math.abs(angleDiff) > 1.2 && bot.isGrounded && difficulty !== 'rookie') {
      input.drift = true;
    }

    // Throttle control
    if (Math.abs(angleDiff) < 1.4) {
      input.throttle = 1;
    } else {
      input.throttle = 0.5; // slow down for very sharp turns
    }

    // Boost usage: use boost if well-aligned with target or racing on kickoff
    const isAligned = Math.abs(angleDiff) < 0.35;
    const isKickoff = Math.abs(ball.position.x) < 2 && Math.abs(ball.position.z) < 2 && Math.abs(ball.velocity.x) < 0.5;

    if (isAligned && (distToBall > 12 || isKickoff)) {
      if (difficulty === 'allstar' || (difficulty === 'pro' && bot.boostAmount > 20)) {
        input.boost = true;
      }
    }

    // Flip / Dodge mechanic for powerful strike when close to the ball
    if (distToBall < 7 && Math.abs(angleDiff) < 0.4 && bot.isGrounded && now - this.lastDodgeTime > 2200) {
      if (difficulty !== 'rookie') {
        input.jump = true;
        this.lastDodgeTime = now;
      }
    }

    // Double jump flip continuation
    if (bot.jumpCount === 1 && bot.jumpTimer > 0.15) {
      input.jump = true;
      input.throttle = 1; // forward flip
    }

    // Aerial contest (All-Star difficulty or Basketball Hoops)
    if (difficulty === 'allstar' && ball.position.y > 6 && distToBall < 18) {
      if (bot.isGrounded && bot.boostAmount > 40) {
        input.jump = true;
        this.isAttemptingAerial = true;
        this.aerialTimer = 1.5;
      }
    }

    if (this.isAttemptingAerial) {
      this.aerialTimer -= 0.016;
      if (this.aerialTimer <= 0 || bot.isGrounded) {
        this.isAttemptingAerial = false;
      } else {
        // Pitch nose up to fly towards aerial ball
        input.pitch = 0.8;
        if (bot.rotation.x > 0.4 && bot.boostAmount > 5) {
          input.boost = true;
        }
      }
    }

    return input;
  }
}
