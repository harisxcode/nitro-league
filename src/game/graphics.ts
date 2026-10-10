import * as THREE from 'three';
import { PlayerCarState, BallState, BoostPad, GameMode, CarBodyType } from './types';
import { ARENA, CAR_PHYSICS } from './constants';

export class GameRenderer {
  private container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  // Mode & stadium assets
  private mode: GameMode;
  private stadiumGroup: THREE.Group;
  private ballMesh!: THREE.Mesh;
  private ballIndicatorGroup!: THREE.Group;
  private carMeshes: Map<string, {
    group: THREE.Group;
    bodyMesh: THREE.Mesh;
    frontLeftWheel: THREE.Mesh;
    frontRightWheel: THREE.Mesh;
    rearLeftWheel: THREE.Mesh;
    rearRightWheel: THREE.Mesh;
    boostParticles: THREE.Points;
    headlightLeft: THREE.SpotLight;
    headlightRight: THREE.SpotLight;
  }> = new Map();
  private boostPadMeshes: Map<number, { group: THREE.Group; orb?: THREE.Mesh; ring: THREE.Mesh }> = new Map();

  // Effects & Shockwaves
  private shockwaveMeshes: THREE.Mesh[] = [];
  private explosionParticles: THREE.Points[] = [];
  private cameraShakeIntensity: number = 0;

  // Textures
  private pitchTexture!: THREE.CanvasTexture;
  private courtTexture!: THREE.CanvasTexture;
  private soccerBallTexture!: THREE.CanvasTexture;
  private basketballTexture!: THREE.CanvasTexture;
  private ledRibbonTexture!: THREE.CanvasTexture;
  private ledCanvasContext!: CanvasRenderingContext2D;

  // Camera settings
  public isBallCam: boolean = true;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  private cameraPos: THREE.Vector3 = new THREE.Vector3();

  constructor(container: HTMLElement, mode: GameMode = 'soccer') {
    this.container = container;
    this.mode = mode;

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060814);
    this.scene.fog = new THREE.FogExp2(0x0a0e24, 0.007);

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.5, 350);
    this.camera.position.set(0, 15, -65);

    // 3. Renderer with high-end settings
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.stadiumGroup = new THREE.Group();
    this.scene.add(this.stadiumGroup);

    // Generate dynamic procedural textures
    this.generateTextures();

    // Build lighting & stadium
    this.setupLighting();
    this.buildStadium();
    this.buildBall();
    this.buildBallIndicator();

    // Resize listener
    window.addEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private generateTextures() {
    // 1. Soccer Pitch Grass Texture
    const pitchCanvas = document.createElement('canvas');
    pitchCanvas.width = 1024;
    pitchCanvas.height = 1024;
    const pctx = pitchCanvas.getContext('2d')!;

    // Grass alternating stripes & hex mower pattern
    pctx.fillStyle = '#0f3818';
    pctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 16; i++) {
      pctx.fillStyle = i % 2 === 0 ? '#14461f' : '#0e3416';
      pctx.fillRect(0, i * 64, 1024, 64);
    }

    // High-tech white lines
    pctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    pctx.lineWidth = 10;
    // Outer border
    pctx.strokeRect(32, 32, 960, 960);
    // Center line
    pctx.beginPath();
    pctx.moveTo(32, 512);
    pctx.lineTo(992, 512);
    pctx.stroke();
    // Center circle
    pctx.beginPath();
    pctx.arc(512, 512, 140, 0, Math.PI * 2);
    pctx.stroke();
    // Penalty areas
    pctx.strokeRect(312, 32, 400, 180);
    pctx.strokeRect(312, 812, 400, 180);

    this.pitchTexture = new THREE.CanvasTexture(pitchCanvas);
    this.pitchTexture.wrapS = THREE.RepeatWrapping;
    this.pitchTexture.wrapT = THREE.RepeatWrapping;

    // 2. Basketball Hardwood Court Texture
    const courtCanvas = document.createElement('canvas');
    courtCanvas.width = 1024;
    courtCanvas.height = 1024;
    const cctx = courtCanvas.getContext('2d')!;

    // Polished maple wood finish
    cctx.fillStyle = '#b36d38';
    cctx.fillRect(0, 0, 1024, 1024);

    // Hardwood plank lines
    for (let y = 0; y < 1024; y += 16) {
      cctx.fillStyle = (y / 16) % 2 === 0 ? '#b8723c' : '#ad6734';
      cctx.fillRect(0, y, 1024, 15);
      cctx.fillStyle = 'rgba(60, 30, 10, 0.2)';
      cctx.fillRect(0, y + 15, 1024, 1);
    }

    // Court boundaries & Paint
    cctx.strokeStyle = '#ffffff';
    cctx.lineWidth = 8;
    cctx.strokeRect(40, 40, 944, 944);
    // Center court
    cctx.beginPath();
    cctx.moveTo(40, 512);
    cctx.lineTo(984, 512);
    cctx.stroke();
    cctx.beginPath();
    cctx.arc(512, 512, 120, 0, Math.PI * 2);
    cctx.stroke();
    // Center logo circle fill
    cctx.fillStyle = 'rgba(0, 180, 255, 0.25)';
    cctx.fill();

    // 3-Point arcs
    cctx.beginPath();
    cctx.arc(512, 140, 260, 0, Math.PI);
    cctx.stroke();
    cctx.beginPath();
    cctx.arc(512, 884, 260, Math.PI, Math.PI * 2);
    cctx.stroke();

    // The Paint keys
    cctx.fillStyle = 'rgba(235, 94, 40, 0.4)';
    cctx.fillRect(380, 40, 264, 220);
    cctx.strokeRect(380, 40, 264, 220);
    cctx.fillRect(380, 764, 264, 220);
    cctx.strokeRect(380, 764, 264, 220);

    this.courtTexture = new THREE.CanvasTexture(courtCanvas);

    // 3. Soccer Ball Texture (Hexagonal Tech Soccer)
    const sbCanvas = document.createElement('canvas');
    sbCanvas.width = 512;
    sbCanvas.height = 256;
    const sbCtx = sbCanvas.getContext('2d')!;
    sbCtx.fillStyle = '#e8ecf2';
    sbCtx.fillRect(0, 0, 512, 256);
    sbCtx.fillStyle = '#1e293b';
    for (let x = 32; x < 512; x += 96) {
      for (let y = 32; y < 256; y += 96) {
        sbCtx.beginPath();
        sbCtx.arc(x, y, 28, 0, Math.PI * 2);
        sbCtx.fill();
        sbCtx.strokeStyle = '#00e5ff';
        sbCtx.lineWidth = 4;
        sbCtx.stroke();
      }
    }
    this.soccerBallTexture = new THREE.CanvasTexture(sbCanvas);

    // 4. Basketball Texture (Orange with black seams)
    const bbCanvas = document.createElement('canvas');
    bbCanvas.width = 512;
    bbCanvas.height = 256;
    const bbCtx = bbCanvas.getContext('2d')!;
    bbCtx.fillStyle = '#ea580c';
    bbCtx.fillRect(0, 0, 512, 256);
    bbCtx.strokeStyle = '#18181b';
    bbCtx.lineWidth = 8;
    bbCtx.beginPath();
    bbCtx.moveTo(0, 128);
    bbCtx.lineTo(512, 128);
    bbCtx.stroke();
    bbCtx.beginPath();
    bbCtx.moveTo(256, 0);
    bbCtx.lineTo(256, 256);
    bbCtx.stroke();
    bbCtx.beginPath();
    bbCtx.arc(128, 128, 90, 0, Math.PI * 2);
    bbCtx.stroke();
    bbCtx.beginPath();
    bbCtx.arc(384, 128, 90, 0, Math.PI * 2);
    bbCtx.stroke();
    this.basketballTexture = new THREE.CanvasTexture(bbCanvas);

    // 5. LED Stadium Ribbon Texture
    const ledCanvas = document.createElement('canvas');
    ledCanvas.width = 1024;
    ledCanvas.height = 64;
    this.ledCanvasContext = ledCanvas.getContext('2d')!;
    this.ledRibbonTexture = new THREE.CanvasTexture(ledCanvas);
    this.ledRibbonTexture.wrapS = THREE.RepeatWrapping;
  }

  private setupLighting() {
    // Ambient stadium glow
    const ambientLight = new THREE.AmbientLight(0x223355, 0.7);
    this.scene.add(ambientLight);

    // Hemisphere light (sky blue / turf bounce)
    const hemiLight = new THREE.HemisphereLight(0x4466aa, 0x112211, 0.6);
    this.scene.add(hemiLight);

    // Main 4 Stadium Floodlight Towers
    const towerPositions = [
      { x: -45, y: 32, z: -55 },
      { x: 45, y: 32, z: -55 },
      { x: -45, y: 32, z: 55 },
      { x: 45, y: 32, z: 55 },
    ];

    towerPositions.forEach((pos, idx) => {
      const spot = new THREE.SpotLight(0xffffff, 2.8, 160, Math.PI / 4, 0.4, 1.2);
      spot.position.set(pos.x, pos.y, pos.z);
      spot.target.position.set(pos.x * 0.2, 0, pos.z * 0.2);
      spot.castShadow = idx === 0; // cast shadow from main light for crisp FPS
      if (spot.castShadow) {
        spot.shadow.mapSize.width = 2048;
        spot.shadow.mapSize.height = 2048;
        spot.shadow.camera.near = 10;
        spot.shadow.camera.far = 180;
        spot.shadow.bias = -0.0005;
      }
      this.scene.add(spot);
      this.scene.add(spot.target);

      // Light lens fixture mesh
      const fixtureGeo = new THREE.BoxGeometry(4, 2, 3);
      const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xddf0ff });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(pos.x, pos.y, pos.z);
      this.scene.add(fixture);
    });

    // Team Goal Accent Lights
    const blueGoalLight = new THREE.PointLight(0x0088ff, 4, 35);
    blueGoalLight.position.set(0, 8, -ARENA.LENGTH / 2 + 2);
    this.scene.add(blueGoalLight);

    const orangeGoalLight = new THREE.PointLight(0xff5500, 4, 35);
    orangeGoalLight.position.set(0, 8, ARENA.LENGTH / 2 - 2);
    this.scene.add(orangeGoalLight);
  }

  private buildStadium() {
    // 1. Floor Mesh
    const floorGeo = new THREE.PlaneGeometry(ARENA.WIDTH, ARENA.LENGTH);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.mode === 'basketball' ? this.courtTexture : this.pitchTexture,
      roughness: this.mode === 'basketball' ? 0.35 : 0.82,
      metalness: this.mode === 'basketball' ? 0.25 : 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.stadiumGroup.add(floorMesh);

    // 2. Arena Enclosure Walls (Transparent glass with hexagonal framework & neon edges)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1428,
      transparent: true,
      opacity: 0.38,
      roughness: 0.2,
      metalness: 0.8,
      transmission: 0.6,
      ior: 1.4,
      wireframe: false,
    });

    // Wall perimeter geometry
    const halfW = ARENA.WIDTH / 2;
    const halfL = ARENA.LENGTH / 2;
    const h = ARENA.HEIGHT;

    // Left & Right Side Walls
    const sideWallGeo = new THREE.PlaneGeometry(ARENA.LENGTH, h);
    const leftWall = new THREE.Mesh(sideWallGeo, glassMat);
    leftWall.position.set(-halfW, h / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.stadiumGroup.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, glassMat);
    rightWall.position.set(halfW, h / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.stadiumGroup.add(rightWall);

    // Ceiling Mesh
    const ceilingGeo = new THREE.PlaneGeometry(ARENA.WIDTH, ARENA.LENGTH);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, glassMat);
    ceilingMesh.position.set(0, h, 0);
    ceilingMesh.rotation.x = Math.PI / 2;
    this.stadiumGroup.add(ceilingMesh);

    // Glowing Neon Edge Trims around base and ceiling
    const neonMatBlue = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const neonMatOrange = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const trimGeo = new THREE.BoxGeometry(ARENA.WIDTH, 0.4, 0.6);

    const blueBaseTrim = new THREE.Mesh(trimGeo, neonMatBlue);
    blueBaseTrim.position.set(0, 0.2, -halfL);
    this.stadiumGroup.add(blueBaseTrim);

    const orangeBaseTrim = new THREE.Mesh(trimGeo, neonMatOrange);
    orangeBaseTrim.position.set(0, 0.2, halfL);
    this.stadiumGroup.add(orangeBaseTrim);

    // 3. LED Perimeter Ribbon Board
    const ribbonGeo = new THREE.BoxGeometry(ARENA.WIDTH - 2, 2.5, 0.8);
    const ribbonMat = new THREE.MeshBasicMaterial({ map: this.ledRibbonTexture });
    const blueRibbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    blueRibbon.position.set(0, 4.5, -halfL + 0.4);
    this.stadiumGroup.add(blueRibbon);

    const orangeRibbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    orangeRibbon.position.set(0, 4.5, halfL - 0.4);
    orangeRibbon.rotation.y = Math.PI;
    this.stadiumGroup.add(orangeRibbon);

    // 4. Soccer Goals or Basketball Hoops
    if (this.mode === 'soccer') {
      this.buildSoccerGoal(-halfL, 0x0088ff); // Blue Goal
      this.buildSoccerGoal(halfL, 0xff5500, true); // Orange Goal
    } else {
      this.buildBasketballHoop(-ARENA.HOOP_Z_OFFSET, 0x0088ff);
      this.buildBasketballHoop(ARENA.HOOP_Z_OFFSET, 0xff5500, true);
      this.buildHoopsLaunchRamps();
    }
  }

  private buildSoccerGoal(zPos: number, colorHex: number, isFlipped: boolean = false) {
    const goalGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.8,
      emissive: colorHex,
      emissiveIntensity: 0.35,
    });

    const postRadius = 0.5;
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, ARENA.GOAL_HEIGHT, 16);
    
    // Left & Right vertical posts
    const leftPost = new THREE.Mesh(postGeo, frameMat);
    leftPost.position.set(-ARENA.GOAL_WIDTH / 2, ARENA.GOAL_HEIGHT / 2, 0);
    goalGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, frameMat);
    rightPost.position.set(ARENA.GOAL_WIDTH / 2, ARENA.GOAL_HEIGHT / 2, 0);
    goalGroup.add(rightPost);

    // Crossbar
    const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, ARENA.GOAL_WIDTH, 16);
    const crossbar = new THREE.Mesh(crossbarGeo, frameMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, ARENA.GOAL_HEIGHT, 0);
    goalGroup.add(crossbar);

    // Goal Net Mesh (Glowing wireframe)
    const netGeo = new THREE.BoxGeometry(ARENA.GOAL_WIDTH, ARENA.GOAL_HEIGHT, ARENA.GOAL_DEPTH);
    const netMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(0, ARENA.GOAL_HEIGHT / 2, (isFlipped ? 1 : -1) * (ARENA.GOAL_DEPTH / 2));
    goalGroup.add(netMesh);

    goalGroup.position.set(0, 0, zPos);
    this.stadiumGroup.add(goalGroup);
  }

  private buildBasketballHoop(zPos: number, colorHex: number, isFlipped: boolean = false) {
    const hoopGroup = new THREE.Group();

    // Steel support mast
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const poleGeo = new THREE.CylinderGeometry(0.8, 0.8, ARENA.HOOP_HEIGHT + 4, 16);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, (ARENA.HOOP_HEIGHT + 4) / 2, (isFlipped ? 1 : -1) * 6);
    hoopGroup.add(pole);

    // Glass backboard
    const bbGeo = new THREE.BoxGeometry(ARENA.BACKBOARD_WIDTH, ARENA.BACKBOARD_HEIGHT, 0.4);
    const bbMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.85,
    });
    const backboard = new THREE.Mesh(bbGeo, bbMat);
    backboard.position.set(0, ARENA.HOOP_HEIGHT + 2, (isFlipped ? 1 : -1) * 4);
    hoopGroup.add(backboard);

    // Target square on backboard
    const targetGeo = new THREE.BoxGeometry(5.5, 4.2, 0.45);
    const targetMat = new THREE.MeshBasicMaterial({ color: colorHex, wireframe: true });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    targetMesh.position.copy(backboard.position);
    hoopGroup.add(targetMesh);

    // Glowing Orange Hoop Rim
    const rimGeo = new THREE.TorusGeometry(ARENA.HOOP_RADIUS, 0.35, 16, 48);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, ARENA.HOOP_HEIGHT, 0);
    hoopGroup.add(rim);

    // Net cylinder (semi-transparent white glowing cone)
    const netGeo = new THREE.CylinderGeometry(ARENA.HOOP_RADIUS, ARENA.HOOP_RADIUS * 0.7, 4.5, 16, 8, true);
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, ARENA.HOOP_HEIGHT - 2.25, 0);
    hoopGroup.add(net);

    hoopGroup.position.set(0, 0, zPos);
    this.stadiumGroup.add(hoopGroup);
  }

  private buildHoopsLaunchRamps() {
    // Glowing floor ramps that launch cars into the air for dunks!
    const rampZList = [-32, 32];
    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.6,
      metalness: 0.9,
    });

    rampZList.forEach(z => {
      const rampGeo = new THREE.BoxGeometry(16, 0.4, 4);
      const rampMesh = new THREE.Mesh(rampGeo, rampMat);
      rampMesh.position.set(0, 0.2, z);
      this.stadiumGroup.add(rampMesh);

      // Launch Chevron arrows on the ramp
      const chevronGeo = new THREE.PlaneGeometry(12, 3);
      const chevronMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
      const chevron = new THREE.Mesh(chevronGeo, chevronMat);
      chevron.rotation.x = -Math.PI / 2;
      chevron.position.set(0, 0.42, z);
      this.stadiumGroup.add(chevron);
    });
  }

  private buildBall() {
    const radius = this.mode === 'basketball' ? 2.6 : 2.4;
    const ballGeo = new THREE.SphereGeometry(radius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      map: this.mode === 'basketball' ? this.basketballTexture : this.soccerBallTexture,
      roughness: 0.35,
      metalness: 0.4,
    });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);

    // Emissive rim glow light inside the ball
    const ballLight = new THREE.PointLight(this.mode === 'basketball' ? 0xff7700 : 0x00f0ff, 2, 14);
    this.ballMesh.add(ballLight);
  }

  private buildBallIndicator() {
    this.ballIndicatorGroup = new THREE.Group();

    // Outer ground ring
    const ringGeo = new THREE.RingGeometry(2.4, 2.7, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    this.ballIndicatorGroup.add(ring);

    // Inner ground drop shadow / altitude indicator
    const shadowGeo = new THREE.CircleGeometry(2.3, 32);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    this.ballIndicatorGroup.add(shadow);

    // Vertical altitude laser line connecting ground ring to the ball
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 10, 0),
    ]);
    const altitudeLine = new THREE.Line(lineGeo, lineMat);
    this.ballIndicatorGroup.add(altitudeLine);

    this.scene.add(this.ballIndicatorGroup);
  }

  // 3D Car Model Generator (Octane, Dominus, Fennec)
  public createOrUpdateCarMesh(car: PlayerCarState) {
    let carObj = this.carMeshes.get(car.id);

    if (!carObj) {
      const group = new THREE.Group();

      // Car body chassis selection
      const bodyMesh = this.buildCarChassis(car.customization.body, car.customization.color, car.customization.accentColor);
      group.add(bodyMesh);

      // 4 Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 20);
      const wheelMat = new THREE.MeshStandardMaterial({
        color: 0x111116,
        roughness: 0.7,
        metalness: 0.3,
      });

      const rimMat = new THREE.MeshStandardMaterial({
        color: car.customization.wheelColor || 0xcccccc,
        roughness: 0.2,
        metalness: 0.9,
      });

      const makeWheel = () => {
        const wGroup = new THREE.Group();
        const tire = new THREE.Mesh(wheelGeo, wheelMat);
        tire.rotation.z = Math.PI / 2;
        wGroup.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.52, 12), rimMat);
        rim.rotation.z = Math.PI / 2;
        wGroup.add(rim);
        return wGroup as any as THREE.Mesh;
      };

      const flWheel = makeWheel();
      flWheel.position.set(-1.15, 0.55, 1.3);
      group.add(flWheel);

      const frWheel = makeWheel();
      frWheel.position.set(1.15, 0.55, 1.3);
      group.add(frWheel);

      const rlWheel = makeWheel();
      rlWheel.position.set(-1.18, 0.6, -1.3);
      group.add(rlWheel);

      const rrWheel = makeWheel();
      rrWheel.position.set(1.18, 0.6, -1.3);
      group.add(rrWheel);

      // Dynamic SpotLights for headlights
      const hlLeft = new THREE.SpotLight(0xffffff, 2.5, 35, Math.PI / 6, 0.3);
      hlLeft.position.set(-0.7, 0.7, 1.8);
      hlLeft.target.position.set(-0.7, 0, 10);
      group.add(hlLeft);
      group.add(hlLeft.target);

      const hlRight = new THREE.SpotLight(0xffffff, 2.5, 35, Math.PI / 6, 0.3);
      hlRight.position.set(0.7, 0.7, 1.8);
      hlRight.target.position.set(0.7, 0, 10);
      group.add(hlRight);
      group.add(hlRight.target);

      // Rocket Booster particle system
      const particleCount = 45;
      const particleGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);
      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particleMat = new THREE.PointsMaterial({
        color: new THREE.Color(car.customization.boostColor || 0x00f0ff),
        size: 0.8,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      const boostParticles = new THREE.Points(particleGeo, particleMat);
      boostParticles.position.set(0, 0.7, -1.9);
      boostParticles.visible = false;
      group.add(boostParticles);

      this.scene.add(group);

      carObj = {
        group,
        bodyMesh,
        frontLeftWheel: flWheel,
        frontRightWheel: frWheel,
        rearLeftWheel: rlWheel,
        rearRightWheel: rrWheel,
        boostParticles,
        headlightLeft: hlLeft,
        headlightRight: hlRight,
      };

      this.carMeshes.set(car.id, carObj);
    }

    // Sync car transform
    carObj.group.position.set(car.position.x, car.position.y, car.position.z);
    carObj.group.rotation.set(car.rotation.x, car.rotation.y, car.rotation.z);

    // Wheel steering
    carObj.frontLeftWheel.rotation.y = car.steerAngle;
    carObj.frontRightWheel.rotation.y = car.steerAngle;

    // Wheel rolling rotation
    const speed = Math.sqrt(car.velocity.x * car.velocity.x + car.velocity.z * car.velocity.z);
    carObj.frontLeftWheel.rotation.x += speed * 0.05;
    carObj.frontRightWheel.rotation.x += speed * 0.05;
    carObj.rearLeftWheel.rotation.x += speed * 0.05;
    carObj.rearRightWheel.rotation.x += speed * 0.05;

    // Boost trail visibility & particle jitter
    carObj.boostParticles.visible = car.isBoosting && !car.isDemolished;
    if (car.isBoosting) {
      const positions = carObj.boostParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = (Math.random() - 0.5) * 0.6;
        positions[i + 1] = (Math.random() - 0.5) * 0.6;
        positions[i + 2] = -Math.random() * 4.5;
      }
      carObj.boostParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Hide if demolished
    carObj.group.visible = !car.isDemolished;
  }

  private buildCarChassis(body: CarBodyType, colorHex: string, accentHex: string): THREE.Mesh {
    const carGroup = new THREE.Group();
    const primaryMat = new THREE.MeshStandardMaterial({
      color: colorHex || (body === 'dominus' ? 0xd97706 : 0x0284c7),
      metalness: 0.85,
      roughness: 0.25,
    });
    const secondaryMat = new THREE.MeshStandardMaterial({
      color: accentHex || 0x111827,
      metalness: 0.9,
      roughness: 0.2,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.95,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    if (body === 'dominus') {
      // Long, sleek muscle car
      const lowerChassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 4.4), primaryMat);
      lowerChassis.position.y = 0.5;
      lowerChassis.castShadow = true;
      carGroup.add(lowerChassis);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 2.0), glassMat);
      cabin.position.set(0, 0.9, -0.2);
      carGroup.add(cabin);

      // Ducktail spoiler
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.4), secondaryMat);
      spoiler.position.set(0, 0.9, -1.9);
      carGroup.add(spoiler);
    } else if (body === 'fennec') {
      // Rally hatchback
      const lowerChassis = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.65, 3.8), primaryMat);
      lowerChassis.position.y = 0.55;
      lowerChassis.castShadow = true;
      carGroup.add(lowerChassis);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2), glassMat);
      cabin.position.set(0, 1.05, -0.1);
      carGroup.add(cabin);

      // Roof scoop
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.8), secondaryMat);
      scoop.position.set(0, 1.45, 0.2);
      carGroup.add(scoop);
    } else {
      // Octane: Classic high-cabin buggy with rear spoiler & exposed engine
      const lowerChassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 3.8), primaryMat);
      lowerChassis.position.y = 0.55;
      lowerChassis.castShadow = true;
      carGroup.add(lowerChassis);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.65, 1.6), glassMat);
      cabin.position.set(0, 1.1, 0.1);
      carGroup.add(cabin);

      // Elevated curved spoiler
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.15, 0.6), secondaryMat);
      wing.position.set(0, 1.4, -1.6);
      carGroup.add(wing);

      const strutL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5), secondaryMat);
      strutL.position.set(-0.7, 1.15, -1.6);
      carGroup.add(strutL);

      const strutR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5), secondaryMat);
      strutR.position.set(0.7, 1.15, -1.6);
      carGroup.add(strutR);
    }

    // Dual Chrome Exhaust Pipes
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 });
    const exPipeL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12), exhaustMat);
    exPipeL.rotation.x = Math.PI / 2;
    exPipeL.position.set(-0.45, 0.55, -2.0);
    carGroup.add(exPipeL);

    const exPipeR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12), exhaustMat);
    exPipeR.rotation.x = Math.PI / 2;
    exPipeR.position.set(0.45, 0.55, -2.0);
    carGroup.add(exPipeR);

    return carGroup as any as THREE.Mesh;
  }

  // Boost Pad Visual Meshes
  public syncBoostPads(pads: BoostPad[]) {
    for (const pad of pads) {
      let padMesh = this.boostPadMeshes.get(pad.id);
      if (!padMesh) {
        const group = new THREE.Group();
        group.position.set(pad.position.x, 0.1, pad.position.z);

        // Ground Ring
        const ringGeo = new THREE.RingGeometry(pad.isBig ? 2.0 : 1.1, pad.isBig ? 2.4 : 1.3, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);

        let orb: THREE.Mesh | undefined;
        if (pad.isBig) {
          // Floating yellow boost orb
          const orbGeo = new THREE.OctahedronGeometry(1.2, 2);
          const orbMat = new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.8,
          });
          orb = new THREE.Mesh(orbGeo, orbMat);
          orb.position.y = 1.4;
          group.add(orb);
        }

        this.scene.add(group);
        padMesh = { group, ring, orb };
        this.boostPadMeshes.set(pad.id, padMesh);
      }

      // Visual active / cooldown toggle
      padMesh.group.visible = pad.isActive;
      if (padMesh.orb && pad.isActive) {
        padMesh.orb.rotation.y += 0.03;
        padMesh.orb.rotation.x += 0.015;
      }
    }
  }

  // Goal explosion shockwave effect
  public triggerGoalExplosion(position: { x: number; y: number; z: number }, colorHex: number) {
    this.cameraShakeIntensity = 1.8;

    // Expanding shockwave torus
    const shockGeo = new THREE.TorusGeometry(3, 0.8, 16, 32);
    const shockMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
    });
    const shockMesh = new THREE.Mesh(shockGeo, shockMat);
    shockMesh.position.set(position.x, position.y, position.z);
    shockMesh.rotation.x = Math.PI / 2;
    this.scene.add(shockMesh);
    this.shockwaveMeshes.push(shockMesh);

    // Sparks explosion
    const count = 120;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = position.x + (Math.random() - 0.5) * 6;
      pos[i + 1] = position.y + (Math.random() - 0.5) * 6;
      pos[i + 2] = position.z + (Math.random() - 0.5) * 6;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 1.5,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geom, mat);
    this.scene.add(pts);
    this.explosionParticles.push(pts);
  }

  // Camera tracking (Ball Cam vs Car Cam with smooth lerping)
  public updateCamera(playerCar: PlayerCarState, ball: BallState, dt: number) {
    if (this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity -= dt * 1.5;
      const shake = this.cameraShakeIntensity * 0.4;
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake;
    }

    const carPos = new THREE.Vector3(playerCar.position.x, playerCar.position.y, playerCar.position.z);
    const ballPos = new THREE.Vector3(ball.position.x, ball.position.y, ball.position.z);

    if (this.isBallCam) {
      // Ball Cam: Position camera behind car, aimed directly at the ball
      const dirFromBallToCar = new THREE.Vector3().subVectors(carPos, ballPos).normalize();
      dirFromBallToCar.y = 0; // keep horizontal
      if (dirFromBallToCar.lengthSq() < 0.001) dirFromBallToCar.set(0, 0, -1);

      const targetCamPos = carPos.clone().add(dirFromBallToCar.clone().multiplyScalar(10.5));
      targetCamPos.y = Math.max(3.8, carPos.y + 4.2);

      this.cameraPos.lerp(targetCamPos, 0.14);
      this.camera.position.copy(this.cameraPos);

      // Look slightly above ball
      const lookTarget = ballPos.clone();
      lookTarget.y += 0.8;
      this.cameraTarget.lerp(lookTarget, 0.18);
      this.camera.lookAt(this.cameraTarget);
    } else {
      // Car Cam: Follow behind vehicle forward axis
      const yaw = playerCar.rotation.y;
      const fwdX = Math.sin(yaw);
      const fwdZ = Math.cos(yaw);

      const targetCamPos = new THREE.Vector3(
        carPos.x - fwdX * 9.5,
        carPos.y + 3.8,
        carPos.z - fwdZ * 9.5
      );

      this.cameraPos.lerp(targetCamPos, 0.15);
      this.camera.position.copy(this.cameraPos);

      const lookTarget = carPos.clone().add(new THREE.Vector3(fwdX * 8, 1.2, fwdZ * 8));
      this.cameraTarget.lerp(lookTarget, 0.2);
      this.camera.lookAt(this.cameraTarget);
    }

    // Dynamic FOV widening at supersonic speed
    const targetFov = playerCar.isSupersonic ? 78 : (playerCar.isBoosting ? 72 : 65);
    this.camera.fov += (targetFov - this.camera.fov) * 0.1;
    this.camera.updateProjectionMatrix();
  }

  // Main Render Tick
  public render(
    playerCar: PlayerCarState,
    allCars: PlayerCarState[],
    ball: BallState,
    boostPads: BoostPad[],
    dt: number
  ) {
    // 1. Update Ball mesh
    this.ballMesh.position.set(ball.position.x, ball.position.y, ball.position.z);
    this.ballMesh.rotation.x += ball.angularVelocity.x * dt;
    this.ballMesh.rotation.z += ball.angularVelocity.z * dt;

    // 2. Update Ball ground indicator
    this.ballIndicatorGroup.position.set(ball.position.x, 0.05, ball.position.z);
    // Scale altitude line to reach ball
    const lineMesh = this.ballIndicatorGroup.children[2] as THREE.Line;
    if (lineMesh) {
      lineMesh.scale.y = Math.max(0.01, ball.position.y / 10);
    }

    // 3. Update all car meshes
    for (const car of allCars) {
      this.createOrUpdateCarMesh(car);
    }

    // 4. Boost pads sync
    this.syncBoostPads(boostPads);

    // 5. Update Shockwave and Explosion meshes
    for (let i = this.shockwaveMeshes.length - 1; i >= 0; i--) {
      const shock = this.shockwaveMeshes[i];
      shock.scale.multiplyScalar(1.08);
      (shock.material as THREE.Material).opacity *= 0.92;
      if ((shock.material as THREE.Material).opacity < 0.04) {
        this.scene.remove(shock);
        this.shockwaveMeshes.splice(i, 1);
      }
    }

    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const exp = this.explosionParticles[i];
      exp.scale.multiplyScalar(1.06);
      (exp.material as THREE.PointsMaterial).opacity *= 0.93;
      if ((exp.material as THREE.PointsMaterial).opacity < 0.04) {
        this.scene.remove(exp);
        this.explosionParticles.splice(i, 1);
      }
    }

    // 6. Camera update & Three.js render
    this.updateCamera(playerCar, ball, dt);
    this.renderer.render(this.scene, this.camera);
  }

  public cleanup() {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
