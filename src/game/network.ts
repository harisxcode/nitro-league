import { PlayerCarState, BallState, GameMode, Team } from './types';

export interface RemotePlayerSync {
  playerId: string;
  transform: {
    x: number;
    y: number;
    z: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    vx: number;
    vy: number;
    vz: number;
  };
  boost: number;
  isBoosting: boolean;
  isSupersonic: boolean;
  isDodging: boolean;
}

export class NetworkClient {
  private ws: WebSocket | null = null;
  public isConnected: boolean = false;
  public pingMs: number = 0;
  private pingInterval: any = null;

  public onRoomJoined?: (data: { roomId: string; playerId: string; team: Team; mode: GameMode; players: any[] }) => void;
  public onPlayerJoined?: (player: any) => void;
  public onPlayerLeft?: (playerId: string) => void;
  public onPlayerUpdate?: (data: RemotePlayerSync) => void;
  public onBallUpdate?: (ball: any) => void;
  public onGoalEvent?: (data: any) => void;
  public onMatchCountdown?: (seconds: number) => void;
  public onChat?: (data: { sender: string; team: Team; text: string }) => void;

  public connect(
    roomId: string,
    playerName: string,
    mode: GameMode,
    carBody: string,
    boostColor: string
  ) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.send({
          type: 'join_room',
          roomId,
          playerName,
          mode,
          carBody,
          boostColor,
        });

        // Ping measurement
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.send({ type: 'ping', time: Date.now() });
          }
        }, 3000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'room_joined') {
            if (this.onRoomJoined) this.onRoomJoined(msg);
          } else if (msg.type === 'player_joined') {
            if (this.onPlayerJoined) this.onPlayerJoined(msg.player);
          } else if (msg.type === 'player_left') {
            if (this.onPlayerLeft) this.onPlayerLeft(msg.playerId);
          } else if (msg.type === 'player_update') {
            if (this.onPlayerUpdate) this.onPlayerUpdate(msg);
          } else if (msg.type === 'ball_update') {
            if (this.onBallUpdate) this.onBallUpdate(msg.ball);
          } else if (msg.type === 'goal_event') {
            if (this.onGoalEvent) this.onGoalEvent(msg);
          } else if (msg.type === 'match_start_countdown') {
            if (this.onMatchCountdown) this.onMatchCountdown(msg.seconds);
          } else if (msg.type === 'chat') {
            if (this.onChat) this.onChat(msg);
          } else if (msg.type === 'pong') {
            this.pingMs = Math.max(1, Date.now() - msg.time);
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (this.pingInterval) clearInterval(this.pingInterval);
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
      };
    } catch (e) {
      console.error('WebSocket creation error:', e);
    }
  }

  public send(msg: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public syncPlayerState(car: PlayerCarState) {
    this.send({
      type: 'player_sync',
      transform: {
        x: car.position.x,
        y: car.position.y,
        z: car.position.z,
        rotX: car.rotation.x,
        rotY: car.rotation.y,
        rotZ: car.rotation.z,
        vx: car.velocity.x,
        vy: car.velocity.y,
        vz: car.velocity.z,
      },
      boost: car.boostAmount,
      isBoosting: car.isBoosting,
      isSupersonic: car.isSupersonic,
      isDodging: car.dodgeTimer > 0,
    });
  }

  public syncBallState(ball: BallState) {
    this.send({
      type: 'ball_sync',
      ball: {
        x: ball.position.x,
        y: ball.position.y,
        z: ball.position.z,
        vx: ball.velocity.x,
        vy: ball.velocity.y,
        vz: ball.velocity.z,
      },
    });
  }

  public sendGoalScored(team: Team, scorer: string, speedKph: number) {
    this.send({
      type: 'goal_scored',
      team,
      scorer,
      speedKph,
    });
  }

  public sendQuickChat(sender: string, team: Team, text: string) {
    this.send({
      type: 'chat_message',
      sender,
      team,
      text,
    });
  }

  public disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
