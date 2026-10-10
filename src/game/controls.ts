import { CarInput } from './physics';

export class InputManager {
  private keys: Set<string> = new Set();
  private touchInputs: {
    throttle: number;
    steer: number;
    boost: boolean;
    jump: boolean;
    drift: boolean;
    ballCamToggle: boolean;
  } = {
    throttle: 0,
    steer: 0,
    boost: false,
    jump: false,
    drift: false,
    ballCamToggle: false,
  };

  public onBallCamToggle?: () => void;
  public onResetBall?: () => void;
  public onPauseToggle?: () => void;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);

    if (e.code === 'KeyC') {
      if (this.onBallCamToggle) this.onBallCamToggle();
    }
    if (e.code === 'KeyR') {
      if (this.onResetBall) this.onResetBall();
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (this.onPauseToggle) this.onPauseToggle();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.keys.add('MouseLeft'); // Boost
    } else if (e.button === 2) {
      this.keys.add('MouseRight'); // Jump
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.keys.delete('MouseLeft');
    } else if (e.button === 2) {
      this.keys.delete('MouseRight');
    }
  };

  // Touch control hooks
  public setTouchThrottle(val: number) { this.touchInputs.throttle = val; }
  public setTouchSteer(val: number) { this.touchInputs.steer = val; }
  public setTouchBoost(val: boolean) { this.touchInputs.boost = val; }
  public setTouchJump(val: boolean) { this.touchInputs.jump = val; }
  public setTouchDrift(val: boolean) { this.touchInputs.drift = val; }

  // Gamepad polling
  private pollGamepad(): Partial<CarInput> | null {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) return null;

    const stickX = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : 0;
    const stickY = Math.abs(gp.axes[1]) > 0.15 ? gp.axes[1] : 0;

    // Triggers (axes or buttons 6 and 7)
    const rt = gp.buttons[7] ? gp.buttons[7].value : 0;
    const lt = gp.buttons[6] ? gp.buttons[6].value : 0;
    const throttle = rt - lt;

    const jump = gp.buttons[0]?.pressed || false; // A button
    const boost = gp.buttons[1]?.pressed || false; // B button
    const drift = gp.buttons[2]?.pressed || false; // X button

    if (gp.buttons[3]?.pressed && this.onBallCamToggle) {
      // Y button toggles ball cam
      this.onBallCamToggle();
    }

    return {
      throttle,
      steer: stickX,
      pitch: -stickY,
      yaw: stickX,
      jump,
      boost,
      drift,
    };
  }

  public getInput(): CarInput {
    // 1. Check Keyboard
    const isW = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const isS = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    const isA = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const isD = this.keys.has('KeyD') || this.keys.has('ArrowRight');

    const jump = this.keys.has('Space') || this.keys.has('MouseRight') || this.touchInputs.jump;
    const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('MouseLeft') || this.touchInputs.boost;
    const drift = this.keys.has('KeyE') || this.keys.has('KeyX') || this.touchInputs.drift;
    const airRollLeft = this.keys.has('KeyQ');
    const airRollRight = this.keys.has('KeyE');

    let throttle = (isW ? 1 : 0) - (isS ? 1 : 0);
    let steer = (isD ? 1 : 0) - (isA ? 1 : 0);

    // Apply touch if non-zero
    if (this.touchInputs.throttle !== 0) throttle = this.touchInputs.throttle;
    if (this.touchInputs.steer !== 0) steer = this.touchInputs.steer;

    // Gamepad overrides
    const gp = this.pollGamepad();
    if (gp) {
      if (Math.abs(gp.throttle || 0) > 0.05) throttle = gp.throttle || 0;
      if (Math.abs(gp.steer || 0) > 0.05) steer = gp.steer || 0;
    }

    return {
      throttle,
      steer,
      boost: boost || (gp?.boost ?? false),
      jump: jump || (gp?.jump ?? false),
      drift: drift || (gp?.drift ?? false),
      airRollLeft,
      airRollRight,
      pitch: (isS ? 1 : 0) - (isW ? 1 : 0) + (gp?.pitch || 0),
      yaw: steer,
    };
  }

  public cleanup() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }
}
