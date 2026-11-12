/* =========================================================
   WORLD — the low-poly canyon
   ========================================================= */

function hash(n, salt = 0) {
  const x = Math.sin(n * 127.1 + salt * 311.7 + 13.37) * 43758.5453123;
  return x - Math.floor(x);
}

class World {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.trackLength = 60000;
    this.roadStep = 8;

    this.slotLen = 5;
    this.slotCount = 120;
    this.slotBase = 0;
    this.playerS = 0;

    this.tmpPos = new THREE.Vector3();
    this.tmpScale = new THREE.Vector3();
    this.tmpQuat = new THREE.Quaternion();
    this.tmpEuler = new THREE.Euler();
    this.tmpMatrix = new THREE.Matrix4();
    this.tmpColor = new THREE.Color();

    this.rockPalette = [0xc98a4b, 0xb87842, 0xd39a5b, 0xa96838, 0xc07d47, 0xb9834b];
    this.greenPalette = [0x6fae45, 0x5c9a39, 0x7fbd50, 0x4e8a35];
    this.leafPalette = [0x4e8a35, 0x5d9c3e, 0x3f762c, 0x6fae49, 0x528f37];

    this._buildSky();
    this._buildLights();
    this._buildValley();
    this._buildRoadAndGrass();
    this._buildInstances();
    this._buildGates();
    this._buildBridges();
    this._buildClouds();
    this._buildDistant();
    this._buildSun();

    this.reset(0);
  }

  /* ---------------------------------------------------------
     SKY / LIGHTS
     --------------------------------------------------------- */

  _buildSky() {
    const uniforms = {
      uTop: { value: new THREE.Color(0x2f8fdd) },
      uMid: { value: new THREE.Color(0x8fcdf0) },
      uHorizon: { value: new THREE.Color(0xe4f4fb) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        varying vec3 vDir;
        void main() {
          float h = normalize(vDir).y;
          vec3 col = mix(uHorizon, uMid, smoothstep(-0.03, 0.22, h));
          col = mix(col, uTop, smoothstep(0.22, 0.8, h));
          float haze = 1.0 - smoothstep(-0.05, 0.12, abs(h - 0.02));
          col = mix(col, uHorizon, haze * 0.18);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16), material);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    this.scene.fog = new THREE.Fog(0xcfe8f7, 170, 820);
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(0xd8f0ff, 0x8f6b3e, 0.85);
    this.scene.add(hemi);

    const fill = new THREE.DirectionalLight(0xa9d4ff, 0.22);
    fill.position.set(-40, 50, 40);
    this.scene.add(fill);

    this.sun = new THREE.DirectionalLight(0xfff1cf, 1.25);
    this.sun.position.set(48, 80, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const d = 52;
    this.sun.shadow.camera.left = -d;
    this.sun.shadow.camera.right = d;
    this.sun.shadow.camera.top = d;
    this.sun.shadow.camera.bottom = -d;
    this.sun.shadow.camera.near = 20;
    this.sun.shadow.camera.far = 220;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
  }

  _buildSun() {
    const mat = new THREE.SpriteMaterial({
      map: GameTextures.glow(),
      color: 0xfff3c4,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.sunSprite = new THREE.Sprite(mat);
    this.sunSprite.scale.set(280, 280, 1);
    this.sunSprite.position.set(480, 520, -760);
    this.scene.add(this.sunSprite);

    const coreMat = new THREE.SpriteMaterial({
      map: GameTextures.glow(),
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.sunCore = new THREE.Sprite(coreMat);
    this.sunCore.scale.set(90, 90, 1);
    this.sunCore.position.copy(this.sunSprite.position);
    this.scene.add(this.sunCore);
  }

  /* ---------------------------------------------------------
     GROUND RIBBONS
     --------------------------------------------------------- */

  _buildValley() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6f9f46,
      roughness: 1,
      flatShading: true,
    });
    this.valley = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200, 1, 1), mat);
    this.valley.rotation.x = -Math.PI / 2;
    this.valley.position.y = -5.2;
    this.valley.receiveShadow = false;
    this.scene.add(this.valley);
  }

  _buildRoadAndGrass() {
    const roadStops = [
      { lat: -5.7, y: 0.0, u: 0 },
      { lat: -2.9, y: 0.01, u: 0.25 },
      { lat: 0, y: 0.015, u: 0.5 },
      { lat: 2.9, y: 0.01, u: 0.75 },
      { lat: 5.7, y: 0.0, u: 1 },
    ];

    const roadMat = new THREE.MeshStandardMaterial({
      map: GameTextures.sand(),
      vertexColors: true,
      roughness: 1,
      metalness: 0,
    });
    this.road = this._ribbon(roadStops, roadMat, 9, (row, col) => {
      const v = 0.92 + hash(row * 3.1 + col, 4) * 0.13;
      return this.tmpColor.setRGB(v, v, v);
    });
    this.road.receiveShadow = true;
    this.scene.add(this.road);

    const leftStops = [
      { lat: -5.7, y: 0.01, u: 0 },
      { lat: -9.5, y: 0.18, u: 1.2 },
      { lat: -13, y: 0.5, u: 2.2 },
      { lat: -17.5, y: 1.1, u: 3.3 },
      { lat: -23, y: 2.1, u: 4.5 },
    ];
    const rightStops = [
      { lat: 5.7, y: 0.01, u: 0 },
      { lat: 10, y: 0.22, u: 1.2 },
      { lat: 16, y: 0.06, u: 2.4 },
      { lat: 24, y: -0.9, u: 3.7 },
      { lat: 37, y: -4.6, u: 5.2 },
    ];

    const grassMat = new THREE.MeshStandardMaterial({
      map: GameTextures.grass(),
      vertexColors: true,
      roughness: 1,
      metalness: 0,
    });

    this.leftGrass = this._ribbon(leftStops, grassMat, 13, (row, col) => {
      const v = 0.86 + hash(row * 1.7 + col * 2.3, 8) * 0.2;
      return this.tmpColor.setRGB(v * 0.98, v, v * 0.92);
    });
    this.leftGrass.receiveShadow = true;
    this.scene.add(this.leftGrass);

    this.rightGrass = this._ribbon(rightStops, grassMat, 13, (row, col) => {
      const v = 0.86 + hash(row * 2.1 + col * 1.9, 9) * 0.2;
      return this.tmpColor.setRGB(v * 0.98, v, v * 0.92);
    });
    this.rightGrass.receiveShadow = true;
    this.scene.add(this.rightGrass);
  }

  _ribbon(stops, material, vScale, colorFn) {
    const count = Math.floor(this.trackLength / this.roadStep);
    const n = stops.length;
    const positions = [];
    const uvs = [];
    const colors = [];
    const indices = [];
    const p = new THREE.Vector3();

    for (let i = 0; i <= count; i++) {
      const s = i * this.roadStep;
      for (let j = 0; j < n; j++) {
        const stop = stops[j];
        GamePath.point(s, stop.lat, stop.y, p);
        positions.push(p.x, p.y, p.z);
        uvs.push(stop.u, s / vScale);
        const c = colorFn(i, j);
        colors.push(c.r, c.g, c.b);
      }
    }

    for (let i = 0; i < count; i++) {
      for (let j = 0; j < n - 1; j++) {
        const a = i * n + j;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    return mesh;
  }

  groundY(lateral) {
    const lat = Math.abs(lateral);
    if (lateral < 0) {
      if (lat <= 5.7) return 0.01;
      if (lat <= 9.5) return GamePath.lerp(0.01, 0.18, (lat - 5.7) / 3.8);
      if (lat <= 13) return GamePath.lerp(0.18, 0.5, (lat - 9.5) / 3.5);
      if (lat <= 17.5) return GamePath.lerp(0.5, 1.1, (lat - 13) / 4.5);
      if (lat <= 23) return GamePath.lerp(1.1, 2.1, (lat - 17.5) / 5.5);
      return 2.1;
    }
    if (lat <= 5.7) return 0.01;
    if (lat <= 10) return GamePath.lerp(0.01, 0.22, (lat - 5.7) / 4.3);
    if (lat <= 16) return GamePath.lerp(0.22, 0.06, (lat - 10) / 6);
    if (lat <= 24) return GamePath.lerp(0.06, -0.9, (lat - 16) / 8);
    if (lat <= 37) return GamePath.lerp(-0.9, -4.6, (lat - 24) / 13);
    return -4.6;
  }

  /* ---------------------------------------------------------
     INSTANCED CLIFFS / PLANTS / PEBBLES
     --------------------------------------------------------- */

  _instanced(geo, mat, count, shadows = true) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    return mesh;
  }

  _buildInstances() {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x7a4f28,
      roughness: 1,
      flatShading: true,
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      flatShading: true,
    });
    const pebbleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      flatShading: true,
    });

    this.cliffs = this._instanced(new THREE.DodecahedronGeometry(1, 0), rockMat, this.slotCount * 4);
    this.caps = this._instanced(new THREE.DodecahedronGeometry(1, 0), greenMat, this.slotCount * 2);
    this.trunks = this._instanced(new THREE.CylinderGeometry(0.14, 0.21, 1.8, 5), trunkMat, this.slotCount);
    this.leaves = this._instanced(new THREE.IcosahedronGeometry(1, 0), leafMat, this.slotCount * 2);
    this.bushes = this._instanced(new THREE.IcosahedronGeometry(0.72, 0), leafMat, this.slotCount * 2);
    this.pebbles = this._instanced(new THREE.DodecahedronGeometry(1, 0), pebbleMat, this.slotCount * 2, false);
    this.tufts = this._instanced(new THREE.ConeGeometry(0.22, 0.7, 4), greenMat, this.slotCount * 2, false);

    // initialize every instance colour (required before setColorAt is rendered)
    const white = new THREE.Color(0xffffff);
    for (const mesh of [this.cliffs, this.caps, this.trunks, this.leaves, this.bushes, this.pebbles, this.tufts]) {
      for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, white);
    }
  }

  _setInstance(mesh, index, pos, sx, sy, sz, rx, ry, rz, color) {
    this.tmpEuler.set(rx, ry, rz);
    this.tmpQuat.setFromEuler(this.tmpEuler);
    this.tmpScale.set(sx, sy, sz);
    this.tmpMatrix.compose(pos, this.tmpQuat, this.tmpScale);
    mesh.setMatrixAt(index, this.tmpMatrix);
    if (color !== undefined) mesh.setColorAt(index, color);
  }

  _updateSlot(slot, ring) {
    const s = slot * this.slotLen;
    const p = this.tmpPos;

    // ---- left cliff: two overlapping rock columns ----
    const l1 = -(15 + hash(slot, 1) * 7);
    const s1 = s + hash(slot, 2) * this.slotLen;
    const sx1 = 4.8 + hash(slot, 3) * 4.2;
    const sy1 = 11 + hash(slot, 4) * 15;
    const sz1 = 4.8 + hash(slot, 5) * 4.2;
    const y1 = this.groundY(l1) + sy1 * 0.42 - 2.4;
    GamePath.point(s1, l1, y1, p);
    this._setInstance(
      this.cliffs,
      ring * 4,
      p,
      sx1,
      sy1,
      sz1,
      (hash(slot, 6) - 0.5) * 0.12,
      GamePath.heading(s1) + (hash(slot, 7) - 0.5) * 0.7,
      (hash(slot, 8) - 0.5) * 0.12,
      this.tmpColor.setHex(this.rockPalette[(hash(slot, 9) * this.rockPalette.length) | 0])
    );

    const l2 = -(23 + hash(slot, 10) * 10);
    const s2 = s + hash(slot, 11) * this.slotLen;
    const sx2 = 6 + hash(slot, 12) * 5;
    const sy2 = 17 + hash(slot, 13) * 18;
    const sz2 = 6 + hash(slot, 14) * 5;
    const y2 = this.groundY(l2) + sy2 * 0.42 - 3;
    GamePath.point(s2, l2, y2, p);
    this._setInstance(
      this.cliffs,
      ring * 4 + 1,
      p,
      sx2,
      sy2,
      sz2,
      (hash(slot, 15) - 0.5) * 0.1,
      GamePath.heading(s2) + (hash(slot, 16) - 0.5) * 0.8,
      (hash(slot, 17) - 0.5) * 0.1,
      this.tmpColor.setHex(this.rockPalette[(hash(slot, 18) * this.rockPalette.length) | 0])
    );

    // green cap on the first left rock, sometimes
    if (hash(slot, 19) > 0.38) {
      const capY = y1 + sy1 * 0.76 + 0.35;
      GamePath.point(s1, l1, capY, p);
      this._setInstance(
        this.caps,
        ring * 2,
        p,
        sx1 * (0.82 + hash(slot, 20) * 0.25),
        1.1 + hash(slot, 21) * 1.1,
        sz1 * (0.82 + hash(slot, 22) * 0.25),
        0,
        GamePath.heading(s1) + hash(slot, 23) * 0.5,
        0,
        this.tmpColor.setHex(this.greenPalette[(hash(slot, 24) * this.greenPalette.length) | 0])
      );
    } else {
      this._setInstance(this.caps, ring * 2, p.set(0, -999, 0), 0.001, 0.001, 0.001, 0, 0, 0);
    }

    // ---- right low cliff edge ----
    const rLat = 24 + hash(slot, 25) * 11;
    const rs = s + hash(slot, 26) * this.slotLen;
    const rsx = 3.5 + hash(slot, 27) * 4;
    const rsy = 2.6 + hash(slot, 28) * 6.5;
    const rsz = 3.5 + hash(slot, 29) * 4;
    const ry = this.groundY(rLat) + rsy * 0.42 - 1.2;
    GamePath.point(rs, rLat, ry, p);
    this._setInstance(
      this.cliffs,
      ring * 4 + 2,
      p,
      rsx,
      rsy,
      rsz,
      (hash(slot, 30) - 0.5) * 0.12,
      GamePath.heading(rs) + (hash(slot, 31) - 0.5) * 0.8,
      (hash(slot, 32) - 0.5) * 0.12,
      this.tmpColor.setHex(this.rockPalette[(hash(slot, 33) * this.rockPalette.length) | 0])
    );

    // ---- rare giant mesa on the right horizon ----
    if (hash(slot, 34) > 0.8) {
      const mLat = 58 + hash(slot, 35) * 90;
      const ms = s + hash(slot, 36) * this.slotLen;
      const msx = 7 + hash(slot, 37) * 7;
      const msy = 28 + hash(slot, 38) * 38;
      const msz = 7 + hash(slot, 39) * 7;
      const my = -4 + msy * 0.42;
      GamePath.point(ms, mLat, my, p);
      this._setInstance(
        this.cliffs,
        ring * 4 + 3,
        p,
        msx,
        msy,
        msz,
        0,
        GamePath.heading(ms) + hash(slot, 40) * 0.5,
        0,
        this.tmpColor.setHex(this.rockPalette[(hash(slot, 41) * this.rockPalette.length) | 0])
      );

      const capY = my + msy * 0.76 + 0.5;
      GamePath.point(ms, mLat, capY, p);
      this._setInstance(
        this.caps,
        ring * 2 + 1,
        p,
        msx * 1.02,
        1.6 + hash(slot, 42) * 1.8,
        msz * 1.02,
        0,
        GamePath.heading(ms),
        0,
        this.tmpColor.setHex(this.greenPalette[(hash(slot, 43) * this.greenPalette.length) | 0])
      );
    } else {
      this._setInstance(this.cliffs, ring * 4 + 3, p.set(0, -999, 0), 0.001, 0.001, 0.001, 0, 0, 0);
      this._setInstance(this.caps, ring * 2 + 1, p.set(0, -999, 0), 0.001, 0.001, 0.001, 0, 0, 0);
    }

    // ---- trees ----
    const treeShow = hash(slot, 44) > 0.38;
    if (treeShow) {
      const onRight = hash(slot, 45) > 0.42;
      const lat = onRight ? 9 + hash(slot, 46) * 15 : 8 + hash(slot, 46) * 6;
      const signedLat = onRight ? lat : -lat;
      const ts = s + hash(slot, 47) * this.slotLen;
      const gy = this.groundY(signedLat);
      const scale = 0.8 + hash(slot, 48) * 0.95;
      const trunkY = gy + 0.9 * scale;
      GamePath.point(ts, signedLat, trunkY, p);
      this._setInstance(this.trunks, ring, p, scale, scale, scale, 0, hash(slot, 49) * 6.28, 0);

      const leafColor = this.leafPalette[(hash(slot, 50) * this.leafPalette.length) | 0];
      GamePath.point(ts, signedLat, gy + 2.05 * scale, p);
      this._setInstance(
        this.leaves,
        ring * 2,
        p,
        0.95 * scale,
        1.15 * scale,
        0.95 * scale,
        hash(slot, 51) * 0.4,
        hash(slot, 52) * 6.28,
        0,
        this.tmpColor.setHex(leafColor)
      );
      GamePath.point(ts + 0.5, signedLat + 0.45, gy + 2.65 * scale, p);
      this._setInstance(
        this.leaves,
        ring * 2 + 1,
        p,
        0.62 * scale,
        0.72 * scale,
        0.62 * scale,
        0,
        hash(slot, 53) * 6.28,
        0,
        this.tmpColor.setHex(this.leafPalette[(hash(slot, 54) * this.leafPalette.length) | 0])
      );
    } else {
      this._setInstance(this.trunks, ring, p.set(0, -999, 0), 0.001, 0.001, 0.001, 0, 0, 0);
      this._setInstance(this.leaves, ring * 2, p.set(0, -999, 0), 0.001, 0.001, 0.001, 0, 0, 0);
      this._setInstance(this.leaves, ring * 2 + 1, p.set(0, -999, 0), 0.001, 0.001, 0.001, 0, 0, 0);
    }

    // ---- bushes ----
    for (let i = 0; i < 2; i++) {
      if (hash(slot, 60 + i) > 0.32) {
        const side = i === 0 ? -1 : 1;
        const lat = side * (6.4 + hash(slot, 62 + i) * 4.2);
        const bs = s + hash(slot, 64 + i) * this.slotLen;
        const gy = this.groundY(lat);
        const sc = 0.45 + hash(slot, 66 + i) * 0.6;
        GamePath.point(bs, lat, gy + 0.32 * sc, p);
        this._setInstance(
          this.bushes,
          ring * 2 + i,
          p,
          sc * (0.9 + hash(slot, 68 + i) * 0.5),
          sc * 0.85,
          sc * (0.9 + hash(slot, 69 + i) * 0.5),
          0,
          hash(slot, 70 + i) * 6.28,
          0,
          this.tmpColor.setHex(this.greenPalette[(hash(slot, 72 + i) * this.greenPalette.length) | 0])
        );
      } else {
        this._setInstance(this.bushes, ring * 2 + i, p.set(0, -999, 0), 0.001, 0.001, 0.001, 0, 0, 0);
      }
    }

    // ---- pebbles at the road edges ----
    for (let i = 0; i < 2; i++) {
      if (hash(slot, 80 + i) > 0.2) {
        const side = i === 0 ? -1 : 1;
        const lat = side * (4.7 + hash(slot, 82 + i) * 0.9);
        const ps = s + hash(slot, 84 + i) * this.slotLen;
        const sc = 0.07 + hash(slot, 86 + i) * 0.16;
        GamePath.point(ps, lat, 0.06, p);
        this._setInstance(
          this.pebbles,
          ring * 2 + i,
          p,
          sc,
          sc * 0.7,
          sc,
          0,
          hash(slot, 88 + i) * 6.28,
          0,
          this.tmpColor.setHex(this.rockPalette[(hash(slot, 90 + i) * this.rockPalette.length) | 0])
        );
      } else {
        this._setInstance(this.pebbles, ring * 2 + i, p.set(0, -999, 0), 0.001, 0.001, 0.001, 0, 0, 0);
      }
    }

    // ---- grass tufts ----
    for (let i = 0; i < 2; i++) {
      if (hash(slot, 100 + i) > 0.3) {
        const side = i === 0 ? -1 : 1;
        const lat = side * (6.2 + hash(slot, 102 + i) * 6);
        const ts = s + hash(slot, 104 + i) * this.slotLen;
        const gy = this.groundY(lat);
        const sc = 0.55 + hash(slot, 106 + i) * 0.8;
        GamePath.point(ts, lat, gy + 0.28 * sc, p);
        this._setInstance(
          this.tufts,
          ring * 2 + i,
          p,
          sc,
          sc,
          sc,
          0,
          hash(slot, 108 + i) * 6.28,
          0,
          this.tmpColor.setHex(this.greenPalette[(hash(slot, 110 + i) * this.greenPalette.length) | 0])
        );
      } else {
        this._setInstance(this.tufts, ring * 2 + i, p.set(0, -999, 0), 0.001, 0.001, 0.001, 0, 0, 0);
      }
    }
  }

  _refreshInstances() {
    for (const mesh of [this.cliffs, this.caps, this.trunks, this.leaves, this.bushes, this.pebbles, this.tufts]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  /* ---------------------------------------------------------
     GATES
     --------------------------------------------------------- */

  _signTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#7a4b24";
    ctx.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = "rgba(50,25,8,0.25)";
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, 8 + i * 5);
      ctx.bezierCurveTo(150, 8 + i * 5 + (Math.random() - 0.5) * 8, 350, 8 + i * 5 + (Math.random() - 0.5) * 8, 512, 8 + i * 5);
      ctx.stroke();
    }
    ctx.strokeStyle = "#e5b84b";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 108);
    ctx.fillStyle = "#ffe6a0";
    ctx.font = '900 54px "Arial Black", "Malgun Gothic", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DRAGON ROAD", 256, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  _buildGates() {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x8a5a2c,
      roughness: 0.95,
      flatShading: true,
    });
    const darkWood = new THREE.MeshStandardMaterial({
      color: 0x5f3a18,
      roughness: 0.95,
      flatShading: true,
    });
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xc9342a,
      roughness: 0.85,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    const ropeMat = new THREE.MeshStandardMaterial({
      color: 0x4b2e14,
      roughness: 1,
    });
    const signMat = new THREE.MeshStandardMaterial({
      map: this._signTexture(),
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    this.gates = [];
    for (let i = 0; i < 4; i++) {
      const group = new THREE.Group();
      const flags = [];

      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.6, 0.32), woodMat);
        post.position.set(side * 6.45, 2.3, 0);
        post.castShadow = true;
        group.add(post);

        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.46, 4), redMat);
        cap.position.set(side * 6.45, 4.78, 0);
        cap.rotation.y = Math.PI / 4;
        cap.castShadow = true;
        group.add(cap);

        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.4), darkWood);
        brace.position.set(side * 6.45, 3.8, 0.6);
        brace.rotation.x = 0.5;
        group.add(brace);
      }

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-6.45, 4.25, 0),
        new THREE.Vector3(-2.2, 3.86, 0),
        new THREE.Vector3(0, 3.78, 0),
        new THREE.Vector3(2.2, 3.86, 0),
        new THREE.Vector3(6.45, 4.25, 0),
      ]);
      const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.045, 5, false), ropeMat);
      group.add(rope);

      const sign = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.72, 0.12), woodMat);
      sign.position.set(0, 3.1, 0.02);
      sign.castShadow = true;
      group.add(sign);
      const signFace = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 0.64), signMat);
      signFace.position.set(0, 3.1, 0.09);
      group.add(signFace);

      // hanging red flags along the rope
      const flagXs = [-5.1, -3.4, -1.7, 1.7, 3.4, 5.1];
      for (let f = 0; f < flagXs.length; f++) {
        const x = flagXs[f];
        const y = 3.84 + Math.pow(Math.abs(x) / 6.45, 2) * 0.4;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute([
          x - 0.24, y, 0,
          x + 0.24, y, 0,
          x, y - 0.52, 0,
        ], 3));
        geo.computeVertexNormals();
        const flag = new THREE.Mesh(geo, redMat);
        flag.userData.baseX = 0;
        group.add(flag);
        flags.push(flag);
      }

      group.visible = true;
      this.scene.add(group);
      this.gates.push({
        group,
        flags,
        s: 260 + i * 720,
        baseS: 260 + i * 720,
        offset: 2880,
      });
    }
  }

  _updateGates(playerS) {
    for (const gate of this.gates) {
      if (gate.s < playerS - 80) gate.s += gate.offset;
      GamePath.point(gate.s, 0, 0, this.tmpPos);
      gate.group.position.copy(this.tmpPos);
      gate.group.rotation.y = GamePath.heading(gate.s);
      for (let i = 0; i < gate.flags.length; i++) {
        gate.flags[i].rotation.y = Math.sin(this.time * 2.2 + i * 0.7 + gate.s * 0.01) * 0.18;
      }
    }
  }

  /* ---------------------------------------------------------
     BRIDGES
     --------------------------------------------------------- */

  _buildBridges() {
    const woodMat = new THREE.MeshStandardMaterial({
      map: GameTextures.wood(),
      color: 0xffffff,
      roughness: 0.95,
      flatShading: true,
    });
    const darkWood = new THREE.MeshStandardMaterial({
      color: 0x5b3817,
      roughness: 1,
      flatShading: true,
    });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x4b2e14, roughness: 1 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xc9342a, roughness: 0.9, side: THREE.DoubleSide });

    this.bridges = [];
    for (let b = 0; b < 2; b++) {
      const group = new THREE.Group();
      const length = 26;
      const planks = 13;
      for (let i = 0; i < planks; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.14, 1.9), woodMat);
        plank.position.set(0, 0.07, -i * 2.0 - 0.5);
        plank.rotation.y = (hash(i + b * 13, 1) - 0.5) * 0.02;
        plank.castShadow = true;
        plank.receiveShadow = true;
        group.add(plank);
      }

      for (const side of [-1, 1]) {
        for (let i = 0; i <= 4; i++) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), darkWood);
          post.position.set(side * 6.15, 0.72, -i * 6.5);
          post.castShadow = true;
          group.add(post);
        }

        const pts = [];
        for (let i = 0; i <= 8; i++) {
          const z = -i * 3.25;
          const sag = Math.sin((i / 8) * Math.PI) * 0.16;
          pts.push(new THREE.Vector3(side * 6.15, 1.38 - sag, z));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.035, 5, false), ropeMat);
        group.add(rope);

        for (let i = 1; i < 4; i++) {
          const flagGeo = new THREE.BufferGeometry();
          const x = side * 6.15;
          const z = -i * 6.5;
          flagGeo.setAttribute("position", new THREE.Float32BufferAttribute([
            x - 0.02, 1.34, z,
            x + 0.02, 1.34, z,
            x + 0.42 * side, 0.92, z + 0.02,
          ], 3));
          flagGeo.computeVertexNormals();
          group.add(new THREE.Mesh(flagGeo, redMat));
        }
      }

      group.visible = true;
      this.scene.add(group);
      this.bridges.push({
        group,
        s: 900 + b * 3400,
        baseS: 900 + b * 3400,
        offset: 6800,
      });
    }
  }

  _updateBridges(playerS) {
    for (const bridge of this.bridges) {
      if (bridge.s < playerS - 60) bridge.s += bridge.offset;
      GamePath.point(bridge.s, 0, 0, this.tmpPos);
      bridge.group.position.copy(this.tmpPos);
      bridge.group.rotation.y = GamePath.heading(bridge.s);
    }
  }

  /* ---------------------------------------------------------
     CLOUDS / DISTANT SCENERY
     --------------------------------------------------------- */

  _buildClouds() {
    this.clouds = new THREE.Group();
    this.scene.add(this.clouds);

    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      flatShading: true,
    });
    const puffGeo = new THREE.IcosahedronGeometry(1, 1);

    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + ((hash(i, 1) * 3) | 0);
      for (let p = 0; p < puffs; p++) {
        const mesh = new THREE.Mesh(puffGeo, cloudMat);
        const sc = 8 + hash(i * 7 + p, 2) * 13;
        mesh.scale.set(sc, sc * (0.55 + hash(i + p, 3) * 0.2), sc);
        mesh.position.set(
          (p - puffs / 2) * 12 + (hash(i + p, 4) - 0.5) * 10,
          (hash(i + p, 5) - 0.5) * 7,
          (hash(i + p, 6) - 0.5) * 9
        );
        cloud.add(mesh);
      }
      cloud.position.set(
        (hash(i, 7) - 0.5) * 900,
        65 + hash(i, 8) * 75,
        -80 - hash(i, 9) * 650
      );
      cloud.userData.drift = 0.4 + hash(i, 10) * 1.2;
      cloud.userData.baseX = cloud.position.x;
      this.clouds.add(cloud);
    }
  }

  _buildDistant() {
    this.distant = new THREE.Group();
    this.scene.add(this.distant);

    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x8fb2c6,
      roughness: 1,
      flatShading: true,
    });
    const mountainMat2 = new THREE.MeshStandardMaterial({
      color: 0x7b9fb4,
      roughness: 1,
      flatShading: true,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x9fc8d8,
      roughness: 1,
      flatShading: true,
    });

    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + hash(i, 1) * 0.2;
      const radius = 520 + hash(i, 2) * 320;
      const h = 90 + hash(i, 3) * 170;
      const r = 55 + hash(i, 4) * 80;
      const geo = new THREE.ConeGeometry(r, h, 5 + ((hash(i, 5) * 3) | 0));
      const mesh = new THREE.Mesh(geo, i % 3 === 0 ? mountainMat2 : mountainMat);
      mesh.position.set(
        Math.cos(angle) * radius,
        -10 + h / 2,
        Math.sin(angle) * radius
      );
      mesh.rotation.y = hash(i, 6) * Math.PI;
      this.distant.add(mesh);

      if (h > 180) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.45, h * 0.22, 5), capMat);
        cap.position.copy(mesh.position);
        cap.position.y += h * 0.4;
        cap.rotation.y = mesh.rotation.y;
        this.distant.add(cap);
      }
    }

    // A few near mesas with green tops, like the video's stone pillars.
    const mesaRock = new THREE.MeshStandardMaterial({ color: 0xb37a44, roughness: 1, flatShading: true });
    const mesaTop = new THREE.MeshStandardMaterial({ color: 0x619d3c, roughness: 1, flatShading: true });
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + 0.4 + hash(i, 11) * 0.25;
      const radius = 250 + hash(i, 12) * 230;
      const h = 45 + hash(i, 13) * 90;
      const r = 12 + hash(i, 14) * 18;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 6), mesaRock);
      body.position.set(Math.cos(angle) * radius, -5 + h / 2, Math.sin(angle) * radius);
      body.rotation.y = hash(i, 15) * Math.PI;
      this.distant.add(body);

      const top = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.9, 0), mesaTop);
      top.scale.set(1, 0.24, 1);
      top.position.set(body.position.x, -5 + h + 1.5, body.position.z);
      this.distant.add(top);
    }
  }

  /* ---------------------------------------------------------
     UPDATE / RESET
     --------------------------------------------------------- */

  reset(playerS) {
    this.playerS = playerS;
    this.slotBase = Math.floor(playerS / this.slotLen) - 4;

    for (let i = 0; i < this.slotCount; i++) {
      const slot = this.slotBase + i;
      const ring = ((slot % this.slotCount) + this.slotCount) % this.slotCount;
      this._updateSlot(slot, ring);
    }
    this._refreshInstances();

    for (let i = 0; i < this.gates.length; i++) {
      this.gates[i].s = this.gates[i].baseS;
    }
    for (let i = 0; i < this.bridges.length; i++) {
      this.bridges[i].s = this.bridges[i].baseS;
    }
    this._updateGates(playerS);
    this._updateBridges(playerS);
  }

  update(dt, time, playerS, playerPos, camera) {
    this.time = time;
    this.playerS = playerS;

    const desiredBase = Math.floor(playerS / this.slotLen) - 4;
    if (desiredBase > this.slotBase) {
      const steps = Math.min(desiredBase - this.slotBase, this.slotCount);
      for (let i = 0; i < steps; i++) {
        this.slotBase++;
        const newSlot = this.slotBase + this.slotCount - 1;
        const ring = ((newSlot % this.slotCount) + this.slotCount) % this.slotCount;
        this._updateSlot(newSlot, ring);
      }
      this._refreshInstances();
    } else if (desiredBase < this.slotBase - 2) {
      this.reset(playerS);
    }

    this._updateGates(playerS);
    this._updateBridges(playerS);

    // Sky + sun follow the camera; distant scenery follows the player.
    this.sky.position.copy(camera.position);
    this.sunSprite.position.set(camera.position.x + 480, camera.position.y + 520, camera.position.z - 760);
    this.sunCore.position.copy(this.sunSprite.position);

    this.distant.position.set(playerPos.x, 0, playerPos.z);
    this.valley.position.set(playerPos.x, -5.2, playerPos.z);

    this.clouds.position.set(playerPos.x, 0, playerPos.z);
    for (let i = 0; i < this.clouds.children.length; i++) {
      const cloud = this.clouds.children[i];
      cloud.position.x += cloud.userData.drift * dt;
      if (cloud.position.x - cloud.userData.baseX > 140) {
        cloud.position.x = cloud.userData.baseX - 140;
      }
    }

    this.sun.position.set(playerPos.x + 48, playerPos.y + 80, playerPos.z + 30);
    this.sun.target.position.set(playerPos.x, playerPos.y, playerPos.z);
    this.sun.target.updateMatrixWorld();
  }
}
