import * as THREE from 'three';

// Procedural 3-12 Part Composite Player Avatar (SPEX Cosmic Investigator)
// Assembled with zero external file dependencies using Three.js geometric hierarchy
export class PlayerAvatar {
  public group: THREE.Group;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = true;
  public isRunning: boolean = false;

  // Sub-part references for procedural kinematics
  private torsoGroup: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private head: THREE.Group;
  private backpack: THREE.Group;
  private jetThrusters: THREE.Mesh[];

  private animTime: number = 0;

  constructor() {
    this.group = new THREE.Group();

    // Palette: Visible Sleek Navy suit (#1e293b), Bright Graphite armor (#334155), Radiant Egyptian Gold (#f59e0b), Luminous Cyan visor (#22d3ee)
    const suitMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.3,
    });

    const armorMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.25,
      metalness: 0.65,
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.9,
    });

    const visorMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.6,
      roughness: 0.1,
      metalness: 0.9,
    });

    const thrusterGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    // --- 1. TORSO & CHESTPIECE ---
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.y = 1.0;

    const chestGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.65, 8);
    const chestMesh = new THREE.Mesh(chestGeo, suitMaterial);
    chestMesh.castShadow = true;
    this.torsoGroup.add(chestMesh);

    // Armor breastplate
    const plateGeo = new THREE.BoxGeometry(0.36, 0.4, 0.22);
    const plateMesh = new THREE.Mesh(plateGeo, armorMaterial);
    plateMesh.position.set(0, 0.05, 0.08);
    plateMesh.castShadow = true;
    this.torsoGroup.add(plateMesh);

    // Egyptian Mech Cat Golden Collar (Nemys/Aegis trim)
    const collarGeo = new THREE.TorusGeometry(0.24, 0.045, 6, 12);
    collarGeo.rotateX(Math.PI / 2);
    const collarMesh = new THREE.Mesh(collarGeo, goldMaterial);
    collarMesh.position.set(0, 0.32, 0);
    this.torsoGroup.add(collarMesh);

    // Belt and buckle
    const beltGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 8);
    const beltMesh = new THREE.Mesh(beltGeo, goldMaterial);
    beltMesh.position.set(0, -0.3, 0);
    this.torsoGroup.add(beltMesh);

    this.group.add(this.torsoGroup);

    // --- 2. HEAD & HELMET ---
    this.head = new THREE.Group();
    this.head.position.set(0, 1.55, 0);

    const helmetGeo = new THREE.SphereGeometry(0.24, 16, 14);
    helmetGeo.scale(1, 1.1, 1.05);
    const helmetMesh = new THREE.Mesh(helmetGeo, armorMaterial);
    helmetMesh.castShadow = true;
    this.head.add(helmetMesh);

    // Cyan glowing visor
    const visorGeo = new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI);
    visorGeo.scale(1.05, 0.65, 0.9);
    visorGeo.rotateY(Math.PI / 2);
    const visorMesh = new THREE.Mesh(visorGeo, visorMaterial);
    visorMesh.position.set(0, 0.02, 0.08);
    this.head.add(visorMesh);

    // Mech Cat Ear Sensors (paying homage to SPEX guardian)
    const earGeo = new THREE.ConeGeometry(0.06, 0.16, 4);
    earGeo.rotateY(Math.PI / 4);

    const leftEar = new THREE.Mesh(earGeo, goldMaterial);
    leftEar.position.set(-0.14, 0.26, -0.02);
    leftEar.rotation.z = 0.25;
    this.head.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, goldMaterial);
    rightEar.position.set(0.14, 0.26, -0.02);
    rightEar.rotation.z = -0.25;
    this.head.add(rightEar);

    this.group.add(this.head);

    // --- 3. MECHANICAL BACKPACK & THRUSTERS ---
    this.backpack = new THREE.Group();
    this.backpack.position.set(0, 1.05, -0.22);

    const packGeo = new THREE.BoxGeometry(0.3, 0.45, 0.14);
    const packMesh = new THREE.Mesh(packGeo, armorMaterial);
    packMesh.castShadow = true;
    this.backpack.add(packMesh);

    // Dual Thruster nozzles
    this.jetThrusters = [];
    const nozzleGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.14, 8);
    const glowGeo = new THREE.SphereGeometry(0.04, 8, 8);

    [-0.1, 0.1].forEach((xPos) => {
      const nozzle = new THREE.Mesh(nozzleGeo, goldMaterial);
      nozzle.position.set(xPos, -0.25, 0);
      this.backpack.add(nozzle);

      const glow = new THREE.Mesh(glowGeo, thrusterGlowMat);
      glow.position.set(xPos, -0.32, 0);
      this.backpack.add(glow);
      this.jetThrusters.push(glow);
    });

    this.group.add(this.backpack);

    // --- 4. ARMS ---
    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.35, 1.25, 0);
    const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.45, 8);
    const leftArmMesh = new THREE.Mesh(armGeo, suitMaterial);
    leftArmMesh.position.y = -0.22;
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);

    const leftGlove = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), goldMaterial);
    leftGlove.position.y = -0.45;
    this.leftArm.add(leftGlove);
    this.group.add(this.leftArm);

    // Right Arm
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.35, 1.25, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, suitMaterial);
    rightArmMesh.position.y = -0.22;
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);

    const rightGlove = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), goldMaterial);
    rightGlove.position.y = -0.45;
    this.rightArm.add(rightGlove);
    this.group.add(this.rightArm);

    // --- 5. LEGS & BOOTS ---
    const legGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.6, 8);
    const bootGeo = new THREE.BoxGeometry(0.14, 0.14, 0.24);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0.65, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, suitMaterial);
    leftLegMesh.position.y = -0.3;
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    const leftBoot = new THREE.Mesh(bootGeo, armorMaterial);
    leftBoot.position.set(0, -0.6, 0.04);
    leftBoot.castShadow = true;
    this.leftLeg.add(leftBoot);
    this.group.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0.65, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, suitMaterial);
    rightLegMesh.position.y = -0.3;
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    const rightBoot = new THREE.Mesh(bootGeo, armorMaterial);
    rightBoot.position.set(0, -0.6, 0.04);
    rightBoot.castShadow = true;
    this.rightLeg.add(rightBoot);
    this.group.add(this.rightLeg);

    // Bottom-center grounding: character sits flush on Y=0
    this.group.position.set(0, 0, 0);
  }

  // Update procedural kinematics (walking, running, idle breathing, jetpack)
  public update(delta: number, speed: number, isMoving: boolean, inAir: boolean) {
    this.animTime += delta * (this.isRunning ? 14 : 9);

    if (inAir) {
      // In air / jumping: legs bent back, arms slightly flared
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, -0.4, 8, delta);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, -0.5, 8, delta);
      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, 0.4, 8, delta);
      this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, 0.4, 8, delta);

      // Pulse jet thrusters
      const thrusterScale = 1.0 + Math.sin(this.animTime * 20) * 0.3;
      this.jetThrusters.forEach((t) => t.scale.set(thrusterScale, thrusterScale * 1.5, thrusterScale));
      this.torsoGroup.position.y = 1.0;
    } else if (isMoving && speed > 0.1) {
      // Walking / running stride
      const strideAmp = this.isRunning ? 0.75 : 0.5;
      const legAngle = Math.sin(this.animTime) * strideAmp;

      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      // Arm counter-swing
      this.leftArm.rotation.x = -legAngle * 0.8;
      this.rightArm.rotation.x = legAngle * 0.8;

      // Subtle torso bobbing (applied to torsoGroup, NOT this.group.position)
      this.torsoGroup.position.y = 1.0 + Math.abs(Math.sin(this.animTime * 2)) * 0.06;

      this.jetThrusters.forEach((t) => t.scale.set(1, 1, 1));
    } else {
      // Idle breathing
      const breath = Math.sin(this.animTime * 0.4) * 0.04;
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0, 6, delta);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0, 6, delta);
      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, breath, 6, delta);
      this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, -breath, 6, delta);
      this.head.rotation.y = Math.sin(this.animTime * 0.2) * 0.08;
      this.torsoGroup.position.y = 1.0 + breath * 0.5;

      this.jetThrusters.forEach((t) => t.scale.set(0.6, 0.6, 0.6));
    }
  }
}
