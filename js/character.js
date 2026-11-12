/* =========================================================
   GOKU — a tiny procedural low-poly hero
   Built entirely from primitives so there are no assets.
   ========================================================= */

class Goku {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.tilt = new THREE.Group();
    this.root.add(this.tilt);
    scene.add(this.root);

    this.phase = Math.random() * Math.PI * 2;
    this.time = 0;
    this.spinTime = 0;
    this.spinDuration = 0.55;
    this.pogoTimer = 0;
    this.dead = false;
    this.celebrate = false;
    this.invuln = 0;
    this.deathAmount = 0;
    this.lastGround = true;

    this.mats = {
      blue: new THREE.MeshStandardMaterial({ color: 0x2e4fa8, roughness: 0.86, flatShading: true }),
      blueDark: new THREE.MeshStandardMaterial({ color: 0x20377a, roughness: 0.9, flatShading: true }),
      blueLight: new THREE.MeshStandardMaterial({ color: 0x3c62c4, roughness: 0.84, flatShading: true }),
      skin: new THREE.MeshStandardMaterial({ color: 0xf2c79c, roughness: 0.82, flatShading: true }),
      skinDark: new THREE.MeshStandardMaterial({ color: 0xdfae7f, roughness: 0.85, flatShading: true }),
      hair: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.72, flatShading: true }),
      red: new THREE.MeshStandardMaterial({ color: 0xc9342a, roughness: 0.8, flatShading: true }),
      redDark: new THREE.MeshStandardMaterial({ color: 0x8e1e18, roughness: 0.85, flatShading: true }),
      tail: new THREE.MeshStandardMaterial({ color: 0x7d4b26, roughness: 0.9, flatShading: true }),
      tailLight: new THREE.MeshStandardMaterial({ color: 0x96602f, roughness: 0.9, flatShading: true }),
      boot: new THREE.MeshStandardMaterial({ color: 0x243f8d, roughness: 0.84, flatShading: true }),
      white: new THREE.MeshStandardMaterial({ color: 0xfff6e2, roughness: 0.7, flatShading: true }),
      black: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, flatShading: true }),
      gold: new THREE.MeshStandardMaterial({ color: 0xe5b84b, roughness: 0.6, metalness: 0.2, flatShading: true }),
    };

    this._build();
    this._buildPogo();
    this._buildShadow();
  }

  _mesh(geo, mat, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = false;
    (parent || this.tilt).add(m);
    return m;
  }

  _box(w, h, d, mat, parent) {
    return this._mesh(new THREE.BoxGeometry(w, h, d), mat, parent);
  }

  _sphere(r, mat, parent, seg = 10, rings = 8) {
    return this._mesh(new THREE.SphereGeometry(r, seg, rings), mat, parent);
  }

  _cyl(rTop, rBot, h, mat, parent, seg = 7) {
    return this._mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat, parent);
  }

  _build() {
    const t = this.tilt;

    // ---------- torso ----------
    this.torso = this._cyl(0.33, 0.275, 0.72, this.mats.blue, t, 7);
    this.torso.position.y = 1.02;

    // collar / undershirt
    const collar = this._cyl(0.2, 0.17, 0.1, this.mats.blueDark, t, 7);
    collar.position.set(0, 1.37, -0.02);

    // red belt + knot + hanging ends
    const belt = this._box(0.6, 0.11, 0.42, this.mats.red, t);
    belt.position.set(0, 0.7, 0);
    const knot = this._box(0.14, 0.14, 0.1, this.mats.redDark, t);
    knot.position.set(0, 0.7, 0.23);
    for (let i = 0; i < 2; i++) {
      const strip = this._box(0.065, 0.3, 0.035, this.mats.red, t);
      strip.position.set(-0.07 + i * 0.14, 0.53, 0.24);
      strip.rotation.z = (i === 0 ? 1 : -1) * 0.16;
    }

    // kanji patch on the back
    const patchMat = new THREE.MeshBasicMaterial({
      map: GameTextures.kanji(),
      transparent: true,
      depthWrite: false,
    });
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), patchMat);
    patch.position.set(0, 1.08, 0.31);
    patch.rotation.y = 0;
    t.add(patch);

    // shoulders
    for (const side of [-1, 1]) {
      const shoulder = this._sphere(0.13, this.mats.blueDark, t, 8, 6);
      shoulder.position.set(side * 0.33, 1.3, 0);
    }

    // ---------- head ----------
    this.head = new THREE.Group();
    this.head.position.y = 1.66;
    t.add(this.head);

    const neck = this._cyl(0.115, 0.13, 0.12, this.mats.skinDark, this.head, 7);
    neck.position.y = -0.33;

    const skull = this._sphere(0.3, this.mats.skin, this.head, 12, 10);
    skull.scale.set(1, 1.04, 0.98);

    // ears
    for (const side of [-1, 1]) {
      const ear = this._sphere(0.065, this.mats.skinDark, this.head, 7, 6);
      ear.position.set(side * 0.29, 0.0, -0.01);
      ear.scale.set(0.8, 1, 0.7);
    }

    // eyes (white + dark pupils) on the -Z face
    for (const side of [-1, 1]) {
      const white = this._sphere(0.052, this.mats.white, this.head, 8, 6);
      white.position.set(side * 0.1, 0.03, -0.272);
      white.scale.set(1.15, 1.25, 0.42);
      const pupil = this._sphere(0.032, this.mats.black, this.head, 7, 5);
      pupil.position.set(side * 0.1, 0.025, -0.295);
      pupil.scale.set(1, 1.15, 0.45);
      const brow = this._box(0.1, 0.026, 0.03, this.mats.hair, this.head);
      brow.position.set(side * 0.1, 0.115, -0.285);
      brow.rotation.z = side * 0.16;
    }

    // nose + mouth
    const nose = this._sphere(0.036, this.mats.skinDark, this.head, 6, 5);
    nose.position.set(0, -0.03, -0.3);
    const mouth = this._box(0.11, 0.028, 0.02, this.mats.redDark, this.head);
    mouth.position.set(0, -0.13, -0.285);

    // hair volume
    const hairBase = this._sphere(0.315, this.mats.hair, this.head, 10, 8);
    hairBase.position.set(0, 0.09, 0.025);
    hairBase.scale.set(1.02, 0.92, 1.03);

    // spiky hair — each cone is rotated outward from the head
    const spikes = [
      { p: [0, 0.35, 0.02], r: [0.06, 0, 0], s: 1.25 },
      { p: [-0.16, 0.33, 0.0], r: [0.05, 0, 0.42], s: 1.05 },
      { p: [0.16, 0.33, 0.0], r: [0.05, 0, -0.42], s: 1.05 },
      { p: [-0.26, 0.23, 0.02], r: [0.0, 0, 0.9], s: 0.92 },
      { p: [0.26, 0.23, 0.02], r: [0.0, 0, -0.9], s: 0.92 },
      { p: [-0.1, 0.3, -0.16], r: [-0.4, 0, 0.25], s: 0.95 },
      { p: [0.1, 0.3, -0.16], r: [-0.4, 0, -0.25], s: 0.95 },
      { p: [0, 0.24, 0.26], r: [0.9, 0, 0], s: 1.0 },
      { p: [-0.2, 0.18, 0.22], r: [0.7, 0, 0.6], s: 0.85 },
      { p: [0.2, 0.18, 0.22], r: [0.7, 0, -0.6], s: 0.85 },
    ];
    for (const sp of spikes) {
      const cone = this._mesh(new THREE.ConeGeometry(0.105, 0.5, 4), this.mats.hair, this.head);
      cone.position.set(sp.p[0], sp.p[1], sp.p[2]);
      cone.rotation.set(sp.r[0], sp.r[1], sp.r[2]);
      cone.scale.setScalar(sp.s);
    }

    // ---------- arms ----------
    this.arms = {};
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.37, 1.28, 0);
      t.add(arm);

      const sleeve = this._box(0.17, 0.3, 0.19, this.mats.blue, arm);
      sleeve.position.y = -0.15;
      const forearm = this._cyl(0.068, 0.062, 0.25, this.mats.skin, arm, 6);
      forearm.position.y = -0.4;
      const band = this._cyl(0.082, 0.082, 0.065, this.mats.red, arm, 6);
      band.position.y = -0.51;
      const hand = this._sphere(0.085, this.mats.skin, arm, 7, 6);
      hand.position.y = -0.58;

      this.arms[side === -1 ? "left" : "right"] = arm;
    }

    // ---------- legs ----------
    this.legs = {};
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.17, 0.68, 0);
      t.add(leg);

      const pant = this._box(0.22, 0.48, 0.24, this.mats.blueDark, leg);
      pant.position.y = -0.24;

      const boot = this._box(0.235, 0.18, 0.33, this.mats.boot, leg);
      boot.position.set(0, -0.55, -0.055);

      const trim = this._box(0.24, 0.05, 0.35, this.mats.red, leg);
      trim.position.set(0, -0.47, -0.055);

      const toe = this._box(0.235, 0.09, 0.12, this.mats.blueDark, leg);
      toe.position.set(0, -0.61, -0.2);

      this.legs[side === -1 ? "left" : "right"] = leg;
    }

    // ---------- tail ----------
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.74, 0.24);
    t.add(this.tail);
    const tailPoints = [
      [0, 0, 0.02, 0.075],
      [0.07, 0.09, 0.09, 0.07],
      [0.06, 0.2, 0.14, 0.062],
      [-0.01, 0.3, 0.17, 0.055],
      [-0.1, 0.38, 0.16, 0.048],
      [-0.16, 0.43, 0.1, 0.04],
    ];
    for (let i = 0; i < tailPoints.length; i++) {
      const p = tailPoints[i];
      const seg = this._sphere(p[3], i > 3 ? this.mats.tailLight : this.mats.tail, this.tail, 7, 6);
      seg.position.set(p[0], p[1], p[2]);
      if (i === tailPoints.length - 1) {
        const tuft = this._mesh(new THREE.ConeGeometry(0.06, 0.18, 4), this.mats.tailLight, this.tail);
        tuft.position.set(p[0] - 0.04, p[1] + 0.05, p[2] - 0.02);
        tuft.rotation.z = 0.8;
        tuft.rotation.x = -0.4;
      }
    }

    // ---------- power pole across the back ----------
    this.pole = new THREE.Group();
    this.pole.position.set(0.02, 1.12, 0.3);
    this.pole.rotation.set(0.08, 0, 0.6);
    t.add(this.pole);
    const shaft = this._cyl(0.035, 0.035, 2.15, this.mats.red, this.pole, 6);
    shaft.castShadow = true;
    for (const end of [-1, 1]) {
      const cap = this._cyl(0.048, 0.048, 0.09, this.mats.redDark, this.pole, 6);
      cap.position.y = end * 1.08;
    }

    this.tilt.rotation.order = "YXZ";
  }

  _buildPogo() {
    this.pogo = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1, 6),
      this.mats.red
    );
    shaft.castShadow = true;
    this.pogo.add(shaft);
    for (const end of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.08, 6), this.mats.redDark);
      cap.position.y = end * 0.5;
      this.pogo.add(cap);
    }
    this.pogo.visible = false;
    this.scene.add(this.pogo);
  }

  _buildShadow() {
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: GameTextures.shadow(),
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), this.shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 2;
    this.scene.add(this.shadow);
  }

  setPosition(pos) {
    this.root.position.copy(pos);
  }

  setHeading(yaw) {
    this.root.rotation.y = yaw;
  }

  triggerSpin() {
    this.spinTime = this.spinDuration;
  }

  triggerPogo() {
    this.pogoTimer = 0.5;
  }

  setInvulnerable(t) {
    this.invuln = t;
  }

  die() {
    this.dead = true;
    this.deathAmount = 0;
  }

  revive() {
    this.dead = false;
    this.celebrate = false;
    this.deathAmount = 0;
    this.tilt.rotation.set(0, 0, 0);
    this.tilt.position.set(0, 0, 0);
    this.modelVisible(true);
  }

  modelVisible(v) {
    this.tilt.visible = v;
    this.shadow.visible = v;
  }

  update(dt, time, opts = {}) {
    this.time = time;
    const mode = opts.mode || "run";
    const speed = opts.speed || 0;
    const grounded = opts.grounded !== false;
    const strafe = opts.strafe || 0;
    const vy = opts.vy || 0;

    this.invuln = Math.max(0, this.invuln - dt);

    if (this.dead) {
      this.deathAmount = Math.min(1, this.deathAmount + dt * 2.2);
      const e = this.deathAmount;
      this.tilt.rotation.z = -e * 1.35;
      this.tilt.rotation.x = e * 0.35;
      this.tilt.position.y = -e * 0.32;
      this.pogo.visible = false;
      this._updateShadow();
      return;
    }

    if (this.celebrate) {
      this._animateCelebrate(dt);
      this._updateShadow();
      return;
    }

    const isRunning = mode === "run" && speed > 0.1;
    const cycle = 6.5 + speed * 0.36;
    if (isRunning) this.phase += dt * cycle;

    // spin (Power Pole flourish / double jump)
    if (this.spinTime > 0) {
      this.spinTime = Math.max(0, this.spinTime - dt);
      const p = 1 - this.spinTime / this.spinDuration;
      const eased = 1 - Math.pow(1 - p, 3);
      this.tilt.rotation.y = -Math.PI * 2 * eased;
    } else {
      this.tilt.rotation.y = 0;
    }

    // body lean + bank
    const targetLean = grounded ? (isRunning ? 0.1 : 0.02) : 0.03;
    this.tilt.rotation.x += (targetLean - this.tilt.rotation.x) * Math.min(1, dt * 8);
    const targetBank = -strafe * 0.09;
    this.tilt.rotation.z += (targetBank - this.tilt.rotation.z) * Math.min(1, dt * 7);

    // vertical bob
    const bob = isRunning && grounded ? Math.abs(Math.sin(this.phase)) * 0.045 : 0;
    this.tilt.position.y += (bob - this.tilt.position.y) * Math.min(1, dt * 16);

    if (!grounded) {
      // airborne pose: tuck and reach
      const rising = vy > 1;
      const legL = rising ? -0.85 : -0.55;
      const legR = rising ? 0.55 : 0.75;
      this.legs.left.rotation.x += (legL - this.legs.left.rotation.x) * Math.min(1, dt * 10);
      this.legs.right.rotation.x += (legR - this.legs.right.rotation.x) * Math.min(1, dt * 10);
      const armL = rising ? -2.25 : -1.75;
      const armR = rising ? -2.0 : -1.55;
      this.arms.left.rotation.x += (armL - this.arms.left.rotation.x) * Math.min(1, dt * 10);
      this.arms.right.rotation.x += (armR - this.arms.right.rotation.x) * Math.min(1, dt * 10);
      this.arms.left.rotation.z += (-0.2 - this.arms.left.rotation.z) * Math.min(1, dt * 8);
      this.arms.right.rotation.z += (0.2 - this.arms.right.rotation.z) * Math.min(1, dt * 8);
    } else if (isRunning) {
      const swing = Math.sin(this.phase);
      const legSwing = swing * 0.92;
      this.legs.left.rotation.x = legSwing;
      this.legs.right.rotation.x = -legSwing;
      this.arms.left.rotation.x = -swing * 0.8;
      this.arms.right.rotation.x = swing * 0.8;
      this.arms.left.rotation.z = -0.07;
      this.arms.right.rotation.z = 0.07;
      this.head.rotation.x = 0.02;
      this.head.rotation.y = Math.sin(time * 0.8) * 0.04;
    } else {
      // idle
      const idle = Math.sin(time * 2.1);
      this.legs.left.rotation.x += (0 - this.legs.left.rotation.x) * Math.min(1, dt * 6);
      this.legs.right.rotation.x += (0 - this.legs.right.rotation.x) * Math.min(1, dt * 6);
      this.arms.left.rotation.x += (idle * 0.05 - this.arms.left.rotation.x) * Math.min(1, dt * 5);
      this.arms.right.rotation.x += (-idle * 0.05 - this.arms.right.rotation.x) * Math.min(1, dt * 5);
      this.arms.left.rotation.z += (-0.08 - this.arms.left.rotation.z) * Math.min(1, dt * 5);
      this.arms.right.rotation.z += (0.08 - this.arms.right.rotation.z) * Math.min(1, dt * 5);
      this.head.rotation.y = Math.sin(time * 0.55) * 0.16;
      this.head.rotation.x = Math.sin(time * 0.8) * 0.03;
      this.tilt.position.y += (idle * 0.012 - this.tilt.position.y) * Math.min(1, dt * 4);
    }

    // tail sway
    this.tail.rotation.y = Math.sin(time * 2.6 + 0.4) * 0.28;
    this.tail.rotation.x = Math.sin(time * 1.7) * 0.1;
    this.tail.rotation.z = Math.sin(time * 2.2 + 1.1) * 0.14;

    // pogo pole
    if (this.pogoTimer > 0) {
      this.pogoTimer -= dt;
      const height = Math.max(0.55, this.root.position.y + 0.9);
      this.pogo.visible = true;
      this.pogo.position.set(this.root.position.x, height * 0.5, this.root.position.z);
      this.pogo.scale.set(1, height, 1);
    } else {
      this.pogo.visible = false;
    }

    // blink during invulnerability
    if (this.invuln > 0) {
      this.tilt.visible = Math.floor(this.invuln * 16) % 2 === 0;
    } else {
      this.tilt.visible = true;
    }

    this._updateShadow();
  }

  _animateCelebrate(dt) {
    const time = this.time;
    this.phase += dt * 9;
    this.legs.left.rotation.x += (-0.1 - this.legs.left.rotation.x) * Math.min(1, dt * 8);
    this.legs.right.rotation.x += (0.1 - this.legs.right.rotation.x) * Math.min(1, dt * 8);
    this.arms.left.rotation.x += (-2.9 - this.arms.left.rotation.x) * Math.min(1, dt * 8);
    this.arms.right.rotation.x += (-2.9 - this.arms.right.rotation.x) * Math.min(1, dt * 8);
    this.arms.left.rotation.z += (-0.35 - this.arms.left.rotation.z) * Math.min(1, dt * 8);
    this.arms.right.rotation.z += (0.35 - this.arms.right.rotation.z) * Math.min(1, dt * 8);
    this.tilt.position.y = Math.abs(Math.sin(time * 5)) * 0.16;
    this.tilt.rotation.x = 0.04;
    this.tilt.rotation.z = Math.sin(time * 5) * 0.04;
    this.tail.rotation.y = Math.sin(time * 5) * 0.4;
    this.pogo.visible = false;
    this._updateShadow();
  }

  _updateShadow() {
    const p = this.root.position;
    const h = Math.max(0, p.y);
    this.shadow.position.set(p.x, 0.035, p.z);
    const s = 1 + h * 0.1;
    this.shadow.scale.set(s, s, s);
    this.shadowMat.opacity = 0.6 * GamePath.clamp(1 - h / 7, 0.12, 1);
  }

  celebratePose() {
    this.celebrate = true;
  }

  hide() {
    this.root.visible = false;
    this.shadow.visible = false;
    this.pogo.visible = false;
  }

  show() {
    this.root.visible = true;
    this.shadow.visible = true;
  }
}
