import * as THREE from 'three';
import { PlayerAvatar } from './PlayerAvatar';
import { StationBuilder, InteractiveTerminal, StationCollisionBox } from './StationBuilder';
import { gameAudio } from '../utils/gameAudio';

export interface GameEngineCallbacks {
  onTerminalNear: (terminal: InteractiveTerminal | null) => void;
  onTerminalInteract: (terminal: InteractiveTerminal) => void;
  onPlayerPositionChange?: (pos: { x: number; y: number; z: number }) => void;
}

export class GameEngine3D {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: PlayerAvatar;
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 8);
  private playerRot: number = Math.PI; // Face north initially

  // Camera settings
  private cameraPitch: number = 0.35; // radians
  private cameraYaw: number = 0; // relative to player rotation
  private cameraDistance: number = 5.5;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  private isPointerDown: boolean = false;
  private prevPointerX: number = 0;
  private prevPointerY: number = 0;

  // Station elements
  private terminals: InteractiveTerminal[] = [];
  private colliders: StationCollisionBox[] = [];
  private animatedObjects: THREE.Object3D[] = [];
  private nearestTerminal: InteractiveTerminal | null = null;

  // Physics & Kinematics
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private isGrounded: boolean = true;
  private moveInput: { forward: number; strafe: number } = { forward: 0, strafe: 0 };
  private isSprinting: boolean = false;
  private jumpRequested: boolean = false;

  // Animation & Loop
  private clock: THREE.Clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private isPaused: boolean = false;
  private callbacks: GameEngineCallbacks;

  // Footstep audio timing
  private footstepTimer: number = 0;

  // Mobile virtual joystick overrides
  private mobileMoveVector: { x: number; y: number } | null = null;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a12);
    this.scene.fog = new THREE.FogExp2(0x070a12, 0.015);

    // 2. Camera setup
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 350);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: window.devicePixelRatio < 2,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Build Station Architecture & Colliders
    const stationData = StationBuilder.buildStation(this.scene);
    this.terminals = stationData.terminals;
    this.colliders = stationData.colliders;
    this.animatedObjects = stationData.animatedObjects;

    // 5. Build Procedural Player Avatar
    this.player = new PlayerAvatar();
    this.scene.add(this.player.group);
    this.player.group.position.copy(this.playerPos);

    // 6. Setup event listeners
    this.initEventListeners();

    // 7. Start render loop
    this.clock.start();
    this.render();
  }

  private initEventListeners() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // Avoid interfering if activeElement is an input/textarea
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveInput.forward = 1;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveInput.forward = -1;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveInput.strafe = -1;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveInput.strafe = 1;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isSprinting = true;
        this.player.isRunning = true;
        break;
      case 'Space':
        if (this.isGrounded) {
          this.jumpRequested = true;
        }
        e.preventDefault();
        break;
      case 'KeyE':
        if (this.nearestTerminal) {
          gameAudio.playTerminalInteract();
          this.callbacks.onTerminalInteract(this.nearestTerminal);
        }
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        if (this.moveInput.forward > 0) this.moveInput.forward = 0;
        break;
      case 'KeyS':
      case 'ArrowDown':
        if (this.moveInput.forward < 0) this.moveInput.forward = 0;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        if (this.moveInput.strafe < 0) this.moveInput.strafe = 0;
        break;
      case 'KeyD':
      case 'ArrowRight':
        if (this.moveInput.strafe > 0) this.moveInput.strafe = 0;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isSprinting = false;
        this.player.isRunning = false;
        break;
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    this.isPointerDown = true;
    this.prevPointerX = e.clientX;
    this.prevPointerY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isPointerDown) return;
    const dx = e.clientX - this.prevPointerX;
    const dy = e.clientY - this.prevPointerY;
    this.prevPointerX = e.clientX;
    this.prevPointerY = e.clientY;

    const rotSpeed = 0.005;
    this.cameraYaw -= dx * rotSpeed;
    this.cameraPitch = Math.max(0.05, Math.min(1.2, this.cameraPitch + dy * rotSpeed));
  };

  private onPointerUp = () => {
    this.isPointerDown = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.cameraDistance = Math.max(2.8, Math.min(12, this.cameraDistance + e.deltaY * 0.005));
  };

  // Mobile virtual joystick API
  public setMobileInput(moveX: number, moveY: number, sprint: boolean) {
    this.mobileMoveVector = { x: moveX, y: moveY };
    this.isSprinting = sprint;
    this.player.isRunning = sprint;
  }

  public triggerMobileJump() {
    if (this.isGrounded) {
      this.jumpRequested = true;
    }
  }

  public triggerMobileInteract() {
    if (this.nearestTerminal) {
      gameAudio.playTerminalInteract();
      this.callbacks.onTerminalInteract(this.nearestTerminal);
    }
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (!paused) {
      this.clock.getDelta(); // reset delta so no physics jump
    }
  }

  public teleportPlayer(x: number, y: number, z: number) {
    this.playerPos.set(x, y, z);
    this.player.group.position.copy(this.playerPos);
    this.velocity.set(0, 0, 0);
  }

  // --- PHYSICS & COLLISION RESOLUTION ---
  private updatePlayerPhysics(delta: number) {
    // 1. Determine input direction relative to camera angle
    let inputFwd = this.moveInput.forward;
    let inputStr = this.moveInput.strafe;

    if (this.mobileMoveVector && (this.mobileMoveVector.x !== 0 || this.mobileMoveVector.y !== 0)) {
      inputFwd = -this.mobileMoveVector.y;
      inputStr = this.mobileMoveVector.x;
    }

    const hasMoveInput = Math.hypot(inputFwd, inputStr) > 0.05;
    const baseSpeed = this.isSprinting ? 9.5 : 5.2;

    if (hasMoveInput) {
      // Input direction relative to camera view
      const camAngle = this.cameraYaw;
      const moveAngle = Math.atan2(inputStr, inputFwd);
      const worldMoveAngle = camAngle + moveAngle;

      const targetVx = Math.sin(worldMoveAngle) * baseSpeed;
      const targetVz = Math.cos(worldMoveAngle) * baseSpeed;

      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVx, 12, delta);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVz, 12, delta);

      // Rotate player smoothly towards movement direction
      this.playerRot = THREE.MathUtils.damp(this.playerRot, worldMoveAngle, 14, delta);
      this.player.group.rotation.y = this.playerRot;

      // Audio footstep cadence
      this.footstepTimer += delta * (this.isSprinting ? 1.6 : 1.0);
      if (this.isGrounded && this.footstepTimer > 0.45) {
        this.footstepTimer = 0;
        gameAudio.playFootstep();
      }
    } else {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, 16, delta);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, 16, delta);
      this.footstepTimer = 0;
    }

    // Jump / Jetpack physics
    if (this.jumpRequested) {
      this.jumpRequested = false;
      this.velocity.y = 8.5;
      this.isGrounded = false;
      gameAudio.playJetpack();
    }

    // Gravity
    const gravity = -20;
    this.velocity.y += gravity * delta;

    // Tentative new position
    const nextX = this.playerPos.x + this.velocity.x * delta;
    const nextY = this.playerPos.y + this.velocity.y * delta;
    const nextZ = this.playerPos.z + this.velocity.z * delta;

    // Collide with station bounding boxes (sliding physics)
    const playerRadius = 0.5;
    let resolvedX = nextX;
    let resolvedZ = nextZ;

    for (const box of this.colliders) {
      // Check X axis
      if (
        resolvedX + playerRadius > box.min.x &&
        resolvedX - playerRadius < box.max.x &&
        this.playerPos.z + playerRadius > box.min.z &&
        this.playerPos.z - playerRadius < box.max.z &&
        this.playerPos.y >= box.min.y - 0.5 &&
        this.playerPos.y <= box.max.y
      ) {
        resolvedX = this.playerPos.x;
        this.velocity.x = 0;
      }

      // Check Z axis
      if (
        resolvedX + playerRadius > box.min.x &&
        resolvedX - playerRadius < box.max.x &&
        resolvedZ + playerRadius > box.min.z &&
        resolvedZ - playerRadius < box.max.z &&
        this.playerPos.y >= box.min.y - 0.5 &&
        this.playerPos.y <= box.max.y
      ) {
        resolvedZ = this.playerPos.z;
        this.velocity.z = 0;
      }
    }

    this.playerPos.x = resolvedX;
    this.playerPos.z = resolvedZ;

    // Ground check (station floor is Y = 0)
    if (nextY <= 0) {
      this.playerPos.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.playerPos.y = nextY;
      this.isGrounded = false;
    }

    // Enforce world limits so player never falls into deep void
    this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -50, 50);
    this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -30, 45);

    this.player.group.position.copy(this.playerPos);

    // Procedural animation update on player avatar
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.player.update(delta, horizontalSpeed, hasMoveInput, !this.isGrounded);

    // Inform coordinate observer
    if (this.callbacks.onPlayerPositionChange) {
      this.callbacks.onPlayerPositionChange({
        x: this.playerPos.x,
        y: this.playerPos.y,
        z: this.playerPos.z,
      });
    }
  }

  // --- CAMERA FOLLOW & DAMPING ---
  private updateCamera(delta: number) {
    // Target look point (player chest/head)
    const targetLook = new THREE.Vector3(
      this.playerPos.x,
      this.playerPos.y + 1.25,
      this.playerPos.z
    );

    this.cameraTarget.lerp(targetLook, 1 - Math.exp(-12 * delta));

    // Spherical offset from cameraTarget
    const offsetX = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
    const offsetY = Math.sin(this.cameraPitch) * this.cameraDistance;
    const offsetZ = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

    const desiredCamPos = new THREE.Vector3(
      this.cameraTarget.x - offsetX,
      this.cameraTarget.y + offsetY,
      this.cameraTarget.z - offsetZ
    );

    // Keep camera above floor
    if (desiredCamPos.y < 0.6) {
      desiredCamPos.y = 0.6;
    }

    this.camera.position.lerp(desiredCamPos, 1 - Math.exp(-10 * delta));
    this.camera.lookAt(this.cameraTarget);
  }

  // --- TERMINAL PROXIMITY DETECTION ---
  private checkTerminalProximity() {
    let closest: InteractiveTerminal | null = null;
    let minDist = Infinity;

    for (const term of this.terminals) {
      const dist = this.playerPos.distanceTo(term.position);
      if (dist <= term.interactionRadius && dist < minDist) {
        minDist = dist;
        closest = term;
      }
    }

    if (closest !== this.nearestTerminal) {
      this.nearestTerminal = closest;
      this.callbacks.onTerminalNear(closest);
    }
  }

  // --- MAIN ANIMATION LOOP ---
  private render = () => {
    this.animationFrameId = requestAnimationFrame(this.render);

    if (this.isPaused) {
      return;
    }

    const delta = Math.min(this.clock.getDelta(), 0.08); // cap delta for stability

    // 1. Update animated scenery (holographic celestial sphere, SPHEREx telescope model, nebula)
    for (const obj of this.animatedObjects) {
      if (obj.userData.spinAxis) {
        obj.rotateOnAxis(obj.userData.spinAxis, (obj.userData.spinSpeed || 0.5) * delta);
      }
    }

    // 2. Physics & Player update
    this.updatePlayerPhysics(delta);

    // 3. Camera follow
    this.updateCamera(delta);

    // 4. Terminal interaction proximity check
    this.checkTerminalProximity();

    // 5. Render Three.js frame
    this.renderer.render(this.scene, this.camera);
  };

  // Cleanup for React unmount
  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    const el = this.renderer.domElement;
    if (el) {
      el.removeEventListener('pointerdown', this.onPointerDown);
      el.removeEventListener('wheel', this.onWheel);
    }
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);

    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
