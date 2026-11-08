import * as THREE from 'three';
import { ProceduralTextures } from './proceduralTextures';

export interface InteractiveTerminal {
  id: string;
  missionNumber: number;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  position: THREE.Vector3;
  interactionRadius: number;
  beaconColor: number;
  screenMesh?: THREE.Mesh;
}

export interface StationCollisionBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export class StationBuilder {
  public static buildStation(scene: THREE.Scene): {
    terminals: InteractiveTerminal[];
    colliders: StationCollisionBox[];
    animatedObjects: THREE.Object3D[];
  } {
    const floorTexture = ProceduralTextures.createFloorTexture();
    const wallTexture = ProceduralTextures.createWallTexture();
    const skyTexture = ProceduralTextures.createSpaceSkyTexture();

    const terminals: InteractiveTerminal[] = [];
    const colliders: StationCollisionBox[] = [];
    const animatedObjects: THREE.Object3D[] = [];

    // --- 0. LIGHTING RIG (Balanced, High-Visibility Studio Lighting) ---
    // Soft cool-white ambient base fill ensuring zero pure-black shadows
    const ambientLight = new THREE.AmbientLight(0xe2e8f0, 1.5);
    scene.add(ambientLight);

    // Sky cyan to floor graphite hemisphere illumination
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.2);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Key directional light: Celestial sunlight pouring in through the north panoramic window
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    sunLight.position.set(0, 16, -18);
    sunLight.target.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Fill light from south ceiling
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.2);
    fillLight.position.set(0, 14, 16);
    fillLight.target.position.set(0, 0, 0);
    scene.add(fillLight);
    scene.add(fillLight.target);

    // Hub center ceiling chandelier downlight
    const hubCenterLight = new THREE.PointLight(0xffffff, 2.6, 24);
    hubCenterLight.position.set(0, 5.5, 0);
    scene.add(hubCenterLight);

    // North window observation bay light
    const windowBayLight = new THREE.PointLight(0x38bdf8, 2.8, 20);
    windowBayLight.position.set(0, 4.5, -9);
    scene.add(windowBayLight);

    // South entrance bay light
    const southBayLight = new THREE.PointLight(0xfbbf24, 2.2, 18);
    southBayLight.position.set(0, 4.5, 9);
    scene.add(southBayLight);

    // East wing laboratory light
    const eastLabLight = new THREE.PointLight(0x10b981, 2.4, 20);
    eastLabLight.position.set(20, 4.5, 0);
    scene.add(eastLabLight);

    // West wing laboratory light
    const westLabLight = new THREE.PointLight(0xa855f7, 2.4, 20);
    westLabLight.position.set(-20, 4.5, 0);
    scene.add(westLabLight);

    // --- 0b. COSMIC SKYDOME ---
    const skyGeo = new THREE.SphereGeometry(180, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      fog: false,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);
    animatedObjects.push(skyMesh);

    // Standard materials with readable lightness
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.25,
      metalness: 0.35,
    });
    floorTexture.repeat.set(8, 8);

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.45,
      metalness: 0.25,
    });
    wallTexture.repeat.set(4, 2);

    const metalFrameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.25,
      metalness: 0.75,
    });

    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });

    const amberGlowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });

    // Glass material for space windows
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.9,
    });

    // --- 1. MAIN MISSION CONTROL HUB (Center: 0, 0, 0) ---
    // Floor (30m wide, 24m deep)
    const hubFloorGeo = new THREE.BoxGeometry(30, 0.4, 24);
    const hubFloor = new THREE.Mesh(hubFloorGeo, floorMat);
    hubFloor.position.set(0, -0.2, 0);
    hubFloor.receiveShadow = true;
    scene.add(hubFloor);

    // Ceiling with recessed lighting
    const hubCeilingGeo = new THREE.BoxGeometry(30, 0.4, 24);
    const hubCeiling = new THREE.Mesh(hubCeilingGeo, metalFrameMat);
    hubCeiling.position.set(0, 6.2, 0);
    scene.add(hubCeiling);

    // Ceiling cyan light rails
    [-8, 0, 8].forEach((xPos) => {
      const railGeo = new THREE.BoxGeometry(0.3, 0.1, 20);
      const railMesh = new THREE.Mesh(railGeo, cyanGlowMat);
      railMesh.position.set(xPos, 5.95, 0);
      scene.add(railMesh);
    });

    // Perimeter Walls:
    // South Wall (Back)
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 0.5), wallMat);
    southWall.position.set(0, 3, 12);
    southWall.receiveShadow = true;
    scene.add(southWall);
    colliders.push({ min: new THREE.Vector3(-15, 0, 11.5), max: new THREE.Vector3(15, 6, 12.5) });

    // North Wall: Giant Panoramic Space Observation Window
    // Lower sill
    const northSill = new THREE.Mesh(new THREE.BoxGeometry(30, 1.2, 0.6), metalFrameMat);
    northSill.position.set(0, 0.6, -12);
    scene.add(northSill);
    colliders.push({ min: new THREE.Vector3(-15, 0, -12.5), max: new THREE.Vector3(15, 6, -11.5) });

    // Glass pane
    const northGlass = new THREE.Mesh(new THREE.BoxGeometry(26, 4.2, 0.1), windowGlassMat);
    northGlass.position.set(0, 3.5, -12);
    scene.add(northGlass);

    // Window vertical divider mullions
    [-9, -3, 3, 9].forEach((mX) => {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 0.3), metalFrameMat);
      mullion.position.set(mX, 3.5, -12);
      scene.add(mullion);
    });

    // East Wall with doorway to Observation Chamber
    const eastWall1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 8), wallMat);
    eastWall1.position.set(15, 3, -8);
    scene.add(eastWall1);
    colliders.push({ min: new THREE.Vector3(14.5, 0, -12), max: new THREE.Vector3(15.5, 6, -4) });

    const eastWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 8), wallMat);
    eastWall2.position.set(15, 3, 8);
    scene.add(eastWall2);
    colliders.push({ min: new THREE.Vector3(14.5, 0, 4), max: new THREE.Vector3(15.5, 6, 12) });

    // West Wall with airlock doorway to Cosmic Field
    const westWall1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 8), wallMat);
    westWall1.position.set(-15, 3, -8);
    scene.add(westWall1);
    colliders.push({ min: new THREE.Vector3(-15.5, 0, -12), max: new THREE.Vector3(-14.5, 6, -4) });

    const westWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 8), wallMat);
    westWall2.position.set(-15, 3, 8);
    scene.add(westWall2);
    colliders.push({ min: new THREE.Vector3(-15.5, 0, 4), max: new THREE.Vector3(-14.5, 6, 12) });

    // --- 2. CENTRAL COMMAND DAIS & HOLOGRAPHIC CELESTIAL GLOBE ---
    const daisGeo = new THREE.CylinderGeometry(4.2, 4.4, 0.1, 24);
    const daisMesh = new THREE.Mesh(daisGeo, metalFrameMat);
    daisMesh.position.set(0, 0.05, 0);
    daisMesh.receiveShadow = true;
    scene.add(daisMesh);

    // Glowing dais outer ring
    const ringGeo = new THREE.TorusGeometry(4.35, 0.06, 8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, cyanGlowMat);
    ringMesh.position.set(0, 0.11, 0);
    scene.add(ringMesh);

    // Floating Holographic All-Sky Celestial Sphere
    const holoSphereGroup = new THREE.Group();
    holoSphereGroup.position.set(0, 2.5, 0);

    const wireSphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 18, 14),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      })
    );
    holoSphereGroup.add(wireSphere);

    // Orbital survey path rings
    const orbitRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.03, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85 })
    );
    orbitRing1.rotation.x = 0.5;
    orbitRing1.rotation.y = 0.3;
    holoSphereGroup.add(orbitRing1);

    const orbitRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.03, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85 })
    );
    orbitRing2.rotation.x = -0.6;
    orbitRing2.rotation.z = 0.4;
    holoSphereGroup.add(orbitRing2);

    scene.add(holoSphereGroup);
    animatedObjects.push(holoSphereGroup);

    // --- 3. EAST CORRIDOR & OBSERVATION CHAMBER (x: 15 to 38) ---
    // Corridor Floor
    const eastCorrFloor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 6), floorMat);
    eastCorrFloor.position.set(20, -0.2, 0);
    scene.add(eastCorrFloor);

    // Corridor Walls
    const corrWallN = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.5), wallMat);
    corrWallN.position.set(20, 3, -3.25);
    scene.add(corrWallN);
    colliders.push({ min: new THREE.Vector3(15, 0, -3.5), max: new THREE.Vector3(25, 6, -3) });

    const corrWallS = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.5), wallMat);
    corrWallS.position.set(20, 3, 3.25);
    scene.add(corrWallS);
    colliders.push({ min: new THREE.Vector3(15, 0, 3), max: new THREE.Vector3(25, 6, 3.5) });

    // Observation Chamber Floor (Circular / Octagonal Hall)
    const obsChamberFloor = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.4, 16), floorMat);
    obsChamberFloor.position.set(32, -0.2, 0);
    scene.add(obsChamberFloor);

    // Circular Wall segments around observation chamber
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      if (Math.abs(Math.cos(a) + 1) < 0.2) continue; // Skip entrance at x = 25
      const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 6.8), wallMat);
      wallSeg.position.set(32 + Math.cos(a) * 8.8, 3, Math.sin(a) * 8.8);
      wallSeg.rotation.y = -a + Math.PI / 2;
      scene.add(wallSeg);
      colliders.push({
        min: new THREE.Vector3(wallSeg.position.x - 2, 0, wallSeg.position.z - 2),
        max: new THREE.Vector3(wallSeg.position.x + 2, 6, wallSeg.position.z + 2),
      });
    }

    // Holographic SPHEREx Space Telescope model in Observation Chamber
    const telescopeGroup = new THREE.Group();
    telescopeGroup.position.set(32, 2.8, 0);

    // Telescope barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.4, 3.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.9 })
    );
    barrel.rotation.z = Math.PI / 3;
    telescopeGroup.add(barrel);

    // Solar panels
    const panelGeo = new THREE.BoxGeometry(0.08, 1.2, 2.8);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.3,
      metalness: 0.8,
    });
    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.set(0, 1.6, 0);
    telescopeGroup.add(leftPanel);

    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.set(0, -1.6, 0);
    telescopeGroup.add(rightPanel);

    // 102 Spectral Bands Holographic Analyzer Ring around telescope
    const bandsRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.08, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xec4899, wireframe: true, transparent: true, opacity: 0.7 })
    );
    bandsRing.rotation.x = Math.PI / 2;
    telescopeGroup.add(bandsRing);

    scene.add(telescopeGroup);
    animatedObjects.push(telescopeGroup);

    // --- 4. WEST CORRIDOR & COSMIC FIELD AIRLOCK (x: -15 to -36) ---
    // Corridor Floor
    const westCorrFloor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 6), floorMat);
    westCorrFloor.position.set(-20, -0.2, 0);
    scene.add(westCorrFloor);

    // West Corridor Walls
    const westCorrWallN = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.5), wallMat);
    westCorrWallN.position.set(-20, 3, -3.25);
    scene.add(westCorrWallN);
    colliders.push({ min: new THREE.Vector3(-25, 0, -3.5), max: new THREE.Vector3(-15, 6, -3) });

    const westCorrWallS = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.5), wallMat);
    westCorrWallS.position.set(-20, 3, 3.25);
    scene.add(westCorrWallS);
    colliders.push({ min: new THREE.Vector3(-25, 0, 3), max: new THREE.Vector3(-15, 6, 3.5) });

    // Exterior Observation Deck Floor (Transparent space platform!)
    const deckFloor = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.4, 16),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.65,
        roughness: 0.1,
        metalness: 0.8,
      })
    );
    deckFloor.position.set(-32, -0.2, 0);
    scene.add(deckFloor);

    // Perimeter Railings with glowing beacon posts
    const railMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.4 });
    const railingPositions = [
      { x: -32, z: -8, len: 16, rotY: 0 },
      { x: -32, z: 8, len: 16, rotY: 0 },
      { x: -40, z: 0, len: 16, rotY: Math.PI / 2 },
    ];

    railingPositions.forEach((r) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(r.len, 1.1, 0.2), railMat);
      rail.position.set(r.x, 0.55, r.z);
      rail.rotation.y = r.rotY;
      scene.add(rail);

      if (r.rotY === 0) {
        colliders.push({ min: new THREE.Vector3(r.x - r.len / 2, 0, r.z - 0.5), max: new THREE.Vector3(r.x + r.len / 2, 3, r.z + 0.5) });
      } else {
        colliders.push({ min: new THREE.Vector3(r.x - 0.5, 0, r.z - r.len / 2), max: new THREE.Vector3(r.x + 0.5, 3, r.z + r.len / 2) });
      }
    });

    // Floating simulated cosmic targets in view of the deck
    const cosmicTarget = new THREE.Group();
    cosmicTarget.position.set(-42, 4.5, 0);

    const protostarCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      })
    );
    cosmicTarget.add(protostarCore);

    // Accretion disk
    const diskGeo = new THREE.RingGeometry(1.8, 4.5, 32);
    diskGeo.rotateX(Math.PI / 2.3);
    const diskMesh = new THREE.Mesh(
      diskGeo,
      new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      })
    );
    cosmicTarget.add(diskMesh);
    scene.add(cosmicTarget);
    animatedObjects.push(cosmicTarget);

    // --- 5. INTERACTIVE MISSION TERMINALS ---
    const buildTerminal = (
      id: string,
      mNum: number,
      title: string,
      titleAr: string,
      subtitle: string,
      subtitleAr: string,
      x: number,
      z: number,
      rotY: number,
      colorHex: string,
      colorNum: number
    ) => {
      const termGroup = new THREE.Group();
      termGroup.position.set(x, 0, z);
      termGroup.rotation.y = rotY;

      // Base pedestal
      const pedMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.9, 1.0, 8),
        metalFrameMat
      );
      pedMesh.position.y = 0.5;
      pedMesh.castShadow = true;
      termGroup.add(pedMesh);

      // Angled Screen
      const screenTex = ProceduralTextures.createTerminalScreenTexture(title, subtitle, colorHex);
      const screenGeo = new THREE.BoxGeometry(1.6, 0.9, 0.1);
      const screenMesh = new THREE.Mesh(screenGeo, [
        metalFrameMat,
        metalFrameMat,
        metalFrameMat,
        metalFrameMat,
        new THREE.MeshBasicMaterial({ map: screenTex }),
        metalFrameMat,
      ]);
      screenMesh.position.set(0, 1.35, 0);
      screenMesh.rotation.x = -0.35;
      screenMesh.castShadow = true;
      termGroup.add(screenMesh);

      // Floating holographic beacon indicator atop terminal
      const beaconGeo = new THREE.OctahedronGeometry(0.2, 0);
      const beaconMat = new THREE.MeshBasicMaterial({ color: colorNum, wireframe: true });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 2.2, 0);
      termGroup.add(beacon);
      animatedObjects.push(beacon);

      // PointLight on screen
      const termLight = new THREE.PointLight(colorNum, 1.5, 5);
      termLight.position.set(0, 1.5, 0.4);
      termGroup.add(termLight);

      scene.add(termGroup);

      // Terminal collider box (snug around pedestal)
      colliders.push({
        min: new THREE.Vector3(x - 0.55, 0, z - 0.55),
        max: new THREE.Vector3(x + 0.55, 2.0, z + 0.55),
      });

      terminals.push({
        id,
        missionNumber: mNum,
        title,
        titleAr,
        subtitle,
        subtitleAr,
        position: new THREE.Vector3(x, 0, z),
        interactionRadius: 2.8,
        beaconColor: colorNum,
        screenMesh,
      });
    };

    // Terminal 1: Mission Briefing Console (Mission 1: A New Explorer Arrives)
    buildTerminal(
      'terminal_briefing_01',
      1,
      'Mission Briefing',
      'إحاطة المهمة الأولى: وصول المستكشف',
      'Telemetry & Station Systems Initialization',
      'تهيئة أنظمة المحطة وتوجيهات الحارس SPEX',
      0,
      7.5,
      Math.PI,
      '#06b6d4',
      0x06b6d4
    );

    // Terminal 2: Mission History Gallery (Mission 2: The Journey of SPHEREx)
    buildTerminal(
      'terminal_history_02',
      2,
      'Journey of SPHEREx',
      'رحلة وتاريخ مرصد SPHEREx',
      '2025 All-Sky Survey Timeline & 102 Spectral Bands',
      'الجدول الزمني لمسح السماء الكامل وأطياف الأشعة تحت الحمراء',
      -8.5,
      -4.5,
      0.35,
      '#a855f7',
      0xa855f7
    );

    // Terminal 3: Infrared Science Lab (Mission 3: The Invisible Universe)
    buildTerminal(
      'terminal_infrared_03',
      3,
      'The Invisible Universe',
      'مختبر الكون غير المرئي بالأشعة تحت الحمراء',
      'Visible vs Infrared Light & Thermal Penetration',
      'مقارنة الضوء المرئي بالأشعة تحت الحمراء واختراق الغبار',
      8.5,
      -4.5,
      -0.35,
      '#f59e0b',
      0xf59e0b
    );

    // Terminal 4: Observation Analysis Center (Mission 4: The Moving Sky Mystery)
    buildTerminal(
      'terminal_moving_04',
      4,
      'Moving Sky Mystery',
      'لغز السماء المتحركة ومقارنة الرصدات',
      'Proper Motion, Blink Comparison & Difference Imaging',
      'الحركة الخاصة، الوميض البصري، وطرح الصورتين D = I2 - I1',
      32,
      5.5,
      Math.PI,
      '#10b981',
      0x10b981
    );

    // Terminal 5: Spectral Analysis Lab (Mission 5: The 102-Band Secret)
    buildTerminal(
      'terminal_spectral_05',
      5,
      'The 102-Band Secret',
      'سر النطاقات الطيفية الـ 102',
      'Molecular Signatures: Water Ice & CO2 Fingerprints',
      'بصمات الجزيئات: جليد الماء وثاني أكسيد الكربون',
      -32,
      -4.5,
      0,
      '#ec4899',
      0xec4899
    );

    // Terminal 6: Main Mission Control Center (Mission 6: The Investigation Report)
    buildTerminal(
      'terminal_report_06',
      6,
      'The Investigation Report',
      'تقرير التحقيق النهائي والاعتماد العلمي',
      'Synthesis of Evidence, Artifact Rejection & NASA Report',
      'تجميع الأدلة، فرز العيوب، وإصدار تقرير الاكتشاف المعتمد',
      0,
      -9.5,
      0,
      '#3b82f6',
      0x3b82f6
    );

    return { terminals, colliders, animatedObjects };
  }
}
