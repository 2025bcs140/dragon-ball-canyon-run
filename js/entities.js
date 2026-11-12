/* =========================================================
   ENTITIES — Dragon Balls, obstacles, and Shenron
   ========================================================= */

class Entities {
  constructor(scene, fx, audio) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;

    this.ballGeometry = new THREE.SphereGeometry(0.55, 26, 18);
    this.balls = [];
    this.ballsCollected = 0;
    this.obstacles = [];
    this.nextObstacleS = 0;
    this.lastObstacleS = 0;
    this.time = 0;

    this._buildBallMaterials();
    this._buildObstacleAssets();
    this._buildShenron();

    this.ballWorldPos = new THREE.Vector3();
    this.playerCenter = new THREE.Vector3();
  }

  /* ---------------------------------------------------------
     DRAGON BALLS
     --------------------------------------------------------- */

  _buildBallMaterials() {
    this.ballMats = [];
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.MeshStandardMaterial({
        map: GameTextures.dragonBall(i + 1),
        color: 0xffffff,
        emissive: 0xff7a00,
        emissiveIntensity: 0.22,
        roughness: 0.28,
        metalness: 0.05,
      });
      this.ballMats.push(mat);
    }
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd15c,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glowMat = new THREE.SpriteMaterial({
      map: GameTextures.glow(),
      color: 0xffb52e,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  _buildBalls() {
    for (let i = 0; i < 7; i++) {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(this.ballGeometry, this.ballMats[i]);
      mesh.castShadow = true;
      group.add(mesh);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.022, 5, 24), this.ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const glow = new THREE.Sprite(this.glowMat.clone());
      glow.scale.set(2.5, 2.5, 1);
      group.add(glow);

      group.visible = false;
      this.scene.add(group);

      this.balls.push({
        index: i,
        stars: i + 1,
        group,
        mesh,
        ring,
        glow,
        s: 0,
        lateral: 0,
        baseY: 1.15,
        phase: Math.random() * Math.PI * 2,
        collected: false,
        sparkle: 0,
        world: new THREE.Vector3(),
      });
    }
  }

  _placeBall(ball, playerS, first = false) {
    ball.collected = false;
    ball.group.visible = true;
    ball.s = playerS + 135 + ball.index * 150 + Math.random() * 45;
    if (first && ball.index === 0) ball.s = playerS + 120;

    // Keep some balls in the air for jump / pole-vault moments.
    ball.baseY = (ball.index === 3 || ball.index === 5) ? 2.35 : 1.12;
    ball.lateral = -3.1 + Math.random() * 6.2;
    ball.phase = Math.random() * Math.PI * 2;
    ball.sparkle = 0;
  }

  reset(playerS) {
    this.ballsCollected = 0;
    if (!this.balls.length) this._buildBalls();
    for (const ball of this.balls) {
      this._placeBall(ball, playerS, true);
      ball.group.scale.setScalar(1);
      ball.group.rotation.y = 0;
      GamePath.point(ball.s, ball.lateral, ball.baseY, ball.world);
      ball.group.position.copy(ball.world);
    }

    for (const obs of this.obstacles) this.scene.remove(obs.group);
    this.obstacles.length = 0;
    this.nextObstacleS = playerS + 115;
    this.lastObstacleS = 0;
    this._ensureObstacles(playerS, 1, true);

    this.shenron.active = false;
    this.shenron.group.visible = false;
    this.shenron.beam.visible = false;
    if (this.shenron.light) this.shenron.light.visible = false;
  }

  _updateBalls(dt, time, player, callbacks) {
    const playerCenterY = player.y + 1.0;

    for (const ball of this.balls) {
      if (ball.collected) continue;

      const bob = Math.sin(time * 2.1 + ball.phase) * 0.16;
      GamePath.point(ball.s, ball.lateral, ball.baseY + bob, ball.world);
      ball.group.position.copy(ball.world);
      ball.group.rotation.y += dt * 1.35;
      ball.ring.rotation.z += dt * 0.8;
      ball.glow.material.opacity = 0.45 + Math.sin(time * 3 + ball.phase) * 0.12;

      ball.sparkle -= dt;
      if (ball.sparkle <= 0) {
        ball.sparkle = 0.24 + Math.random() * 0.2;
        this.fx.sparks.spawn({
          pos: ball.world.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 1.2,
            (Math.random() - 0.5) * 1.2,
            (Math.random() - 0.5) * 1.2
          )),
          vel: new THREE.Vector3(0, 0.4 + Math.random() * 0.5, 0),
          life: 0.5 + Math.random() * 0.5,
          size: 0.13 + Math.random() * 0.18,
          endSize: 0.02,
          color: 0xffd15c,
          gravity: -0.2,
          drag: 0.97,
          wobble: 0.2,
        });
      }

      const ds = player.s - ball.s;
      const dl = player.lateral - ball.lateral;
      const dy = playerCenterY - (ball.baseY + bob);

      if (Math.abs(ds) < 1.35 && Math.abs(dl) < 1.28 && Math.abs(dy) < 1.22) {
        this._collectBall(ball, callbacks);
      } else if (ds > 9) {
        // Missed it — the radar pings a new location farther down the canyon.
        this._respawnBall(ball, player.s, callbacks);
      }
    }
  }

  _collectBall(ball, callbacks) {
    ball.collected = true;
    ball.group.visible = false;
    this.ballsCollected++;

    this.fx.collectBurst(ball.world.clone(), 0xffd15c);
    this.audio.collect(this.ballsCollected - 1);

    if (callbacks.onCollect) callbacks.onCollect(ball, this.ballsCollected);
  }

  _respawnBall(ball, playerS, callbacks) {
    let s = playerS + 150 + Math.random() * 130;

    // Avoid dropping a ball directly inside an obstacle.
    for (let attempt = 0; attempt < 6; attempt++) {
      let conflict = false;
      for (const obs of this.obstacles) {
        if (Math.abs(obs.s - s) < 24) {
          conflict = true;
          break;
        }
      }
      if (!conflict) break;
      s += 32;
    }

    ball.s = s;
    ball.lateral = -3.1 + Math.random() * 6.2;
    ball.baseY = Math.random() < 0.3 ? 2.35 : 1.12;
    ball.phase = Math.random() * Math.PI * 2;
    ball.sparkle = 0;

    if (callbacks.onMiss) callbacks.onMiss(ball);
  }

  /* ---------------------------------------------------------
     OBSTACLES
     --------------------------------------------------------- */

  _buildObstacleAssets() {
    this.rockMat = new THREE.MeshStandardMaterial({
      color: 0x9a6b45,
      roughness: 1,
      flatShading: true,
    });
    this.rockMat2 = new THREE.MeshStandardMaterial({
      color: 0x855a3a,
      roughness: 1,
      flatShading: true,
    });
    this.barkMat = new THREE.MeshStandardMaterial({
      map: GameTextures.wood(),
      color: 0x9a6a38,
      roughness: 1,
      flatShading: true,
    });
    this.endMat = new THREE.MeshStandardMaterial({
      color: 0xd3a262,
      roughness: 1,
      flatShading: true,
    });
    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x8a5a2c,
      roughness: 0.95,
      flatShading: true,
    });
    this.darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x5f3a18,
      roughness: 0.95,
      flatShading: true,
    });

    this.logGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 1, false);
    this.boulderGeo = new THREE.DodecahedronGeometry(1, 0);
    this.postGeo = new THREE.BoxGeometry(0.18, 1.5, 0.18);
    this.plankGeo = new THREE.BoxGeometry(1, 0.16, 0.3);
  }

  _spawnObstacle(playerS, level) {
    let s = this.nextObstacleS;
    if (s < playerS + 70) s = playerS + 90;

    // Don't plant an obstacle right on top of a Dragon Ball.
    for (let attempt = 0; attempt < 8; attempt++) {
      let conflict = false;
      for (const ball of this.balls) {
        if (!ball.collected && Math.abs(ball.s - s) < 30) {
          conflict = true;
          break;
        }
      }
      if (!conflict) break;
      s += 34;
    }

    if (s - this.lastObstacleS < 30) s = this.lastObstacleS + 30;

    const roll = Math.random();
    let type;
    if (level < 2) type = roll < 0.6 ? "log" : "boulder";
    else if (roll < 0.38) type = "log";
    else if (roll < 0.72) type = "boulder";
    else if (roll < 0.94) type = "barrier";
    else type = "spire";

    const group = new THREE.Group();
    let lateral = 0;
    let halfWidth = 1;
    let height = 1;
    let typeLabel = type;

    if (type === "log") {
      const length = 4.3 + Math.random() * 2.1;
      const log = new THREE.Mesh(this.logGeo, [this.barkMat, this.endMat, this.endMat]);
      log.rotation.z = Math.PI / 2;
      log.scale.y = length;
      log.position.y = 0.52;
      log.castShadow = true;
      log.receiveShadow = true;
      group.add(log);

      // little branch nubs
      for (let i = 0; i < 2; i++) {
        const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.55, 5), this.darkWoodMat);
        nub.position.set((Math.random() - 0.5) * length * 0.6, 0.8, 0.15);
        nub.rotation.z = (Math.random() - 0.5) * 1.1;
        nub.castShadow = true;
        group.add(nub);
      }

      lateral = -2.4 + Math.random() * 4.8;
      halfWidth = length * 0.5;
      height = 1.05;
    } else if (type === "boulder") {
      const boulder = new THREE.Mesh(this.boulderGeo, Math.random() > 0.5 ? this.rockMat : this.rockMat2);
      const sc = 0.9 + Math.random() * 0.55;
      boulder.scale.set(sc * 1.15, sc * 0.9, sc * 1.1);
      boulder.position.y = sc * 0.72;
      boulder.rotation.set(Math.random(), Math.random() * 6, Math.random() * 0.4);
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      group.add(boulder);
      lateral = -3.5 + Math.random() * 7;
      halfWidth = sc * 1.0;
      height = sc * 1.45;
    } else if (type === "barrier") {
      const width = 3.1;
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(this.postGeo, this.darkWoodMat);
        post.position.set(side * width * 0.5, 0.75, 0);
        post.castShadow = true;
        group.add(post);
      }
      for (let i = 0; i < 2; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.22, 0.2), this.woodMat);
        plank.position.y = 0.6 + i * 0.55;
        plank.castShadow = true;
        group.add(plank);
      }
      lateral = -2.5 + Math.random() * 5;
      halfWidth = width * 0.5;
      height = 1.25;
    } else {
      // tall spire — steer around it
      const spire = new THREE.Mesh(this.boulderGeo, this.rockMat2);
      spire.scale.set(1.05, 2.0, 1.05);
      spire.position.y = 1.55;
      spire.rotation.set(0.05, Math.random() * 6, 0.04);
      spire.castShadow = true;
      spire.receiveShadow = true;
      group.add(spire);
      lateral = -3 + Math.random() * 6;
      halfWidth = 1.1;
      height = 2.8;
      typeLabel = "spire";
    }

    GamePath.point(s, lateral, 0, group.position);
    group.rotation.y = GamePath.heading(s);
    this.scene.add(group);

    this.obstacles.push({
      group,
      type: typeLabel,
      s,
      lateral,
      halfWidth,
      height,
      resolved: false,
      dodged: false,
    });

    this.lastObstacleS = s;
    const interval = Math.max(56, 108 - level * 7) + Math.random() * 26;
    this.nextObstacleS = s + interval;
  }

  _ensureObstacles(playerS, level, initial = false) {
    if (initial) {
      this.nextObstacleS = Math.max(this.nextObstacleS, playerS + 110);
    }
    let guard = 0;
    while (this.nextObstacleS < playerS + 340 && guard < 12) {
      this._spawnObstacle(playerS, level);
      guard++;
    }
  }

  _updateObstacles(dt, player, level, callbacks) {
    this._ensureObstacles(player.s, level);

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      if (obs.s < player.s - 32) {
        this.scene.remove(obs.group);
        this.obstacles.splice(i, 1);
        continue;
      }

      if (!obs.resolved && player.s > obs.s - 1.35 && player.s < obs.s + 1.35) {
        const lateralHit = Math.abs(player.lateral - obs.lateral) < obs.halfWidth + 0.42;
        const heightHit = player.y < obs.height + 0.15;

        if (lateralHit && heightHit) {
          obs.resolved = true;
          this.fx.hitBurst(new THREE.Vector3(
            player.worldPos.x,
            player.y + 0.85,
            player.worldPos.z
          ));
          this.audio.hit();
          if (callbacks.onHit) callbacks.onHit(obs);
        }
      }

      if (!obs.resolved && player.s > obs.s + 1.6) {
        obs.resolved = true;
        obs.dodged = true;
        if (callbacks.onDodge) callbacks.onDodge(obs);
      }
    }
  }

  /* ---------------------------------------------------------
     SHENRON
     --------------------------------------------------------- */

  _buildShenron() {
    const group = new THREE.Group();
    group.visible = false;
    this.scene.add(group);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2f9a4a,
      emissive: 0x1cff77,
      emissiveIntensity: 0.4,
      roughness: 0.65,
      flatShading: true,
    });
    const darkGreen = new THREE.MeshStandardMaterial({
      color: 0x1f6b34,
      emissive: 0x0f8a42,
      emissiveIntensity: 0.3,
      roughness: 0.8,
      flatShading: true,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd9b54a,
      emissive: 0x8a6a12,
      emissiveIntensity: 0.4,
      roughness: 0.55,
      metalness: 0.35,
      flatShading: true,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff2a1a,
      emissive: 0xff2200,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    });
    const mouthMat = new THREE.MeshStandardMaterial({
      color: 0x3a0808,
      emissive: 0x7a0f0a,
      emissiveIntensity: 0.6,
      roughness: 0.9,
    });

    this.shenronSegments = [];
    for (let i = 0; i < 20; i++) {
      const seg = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), i < 2 ? bodyMat : darkGreen);
      const taper = 1 - i * 0.03;
      body.scale.set(2.5 * taper, 2.3 * taper, 3.6 * taper);
      seg.add(body);

      // dorsal fin
      if (i > 1 && i % 2 === 0) {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.55 * taper, 1.6 * taper, 4), bodyMat);
        fin.position.set(0, 1.8 * taper, 0);
        fin.rotation.y = Math.PI / 4;
        seg.add(fin);
      }

      group.add(seg);
      this.shenronSegments.push(seg);
    }

    // head on segment 0
    const head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), bodyMat);
    skull.scale.set(2.4, 2.1, 3.1);
    head.add(skull);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), bodyMat);
    snout.scale.set(1.7, 1.3, 2.0);
    snout.position.set(0, -0.35, -2.2);
    head.add(snout);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.5), mouthMat);
    mouth.position.set(0, -0.8, -3.5);
    head.add(mouth);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), eyeMat);
      eye.position.set(side * 1.15, 0.7, -2.55);
      eye.scale.set(1, 1.2, 0.8);
      head.add(eye);

      const brow = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 4), goldMat);
      brow.position.set(side * 1.15, 1.15, -2.45);
      brow.rotation.z = side * 0.7;
      head.add(brow);

      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.2, 5), goldMat);
      horn.position.set(side * 1.2, 1.9, 0.5);
      horn.rotation.set(0.5, 0, side * 0.55);
      head.add(horn);

      const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.025, 4.2, 4), goldMat);
      whisker.position.set(side * 1.3, -0.5, -2.9);
      whisker.rotation.set(1.2, 0, side * 0.5);
      head.add(whisker);
    }

    // a little crest
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 4), goldMat);
    crest.position.set(0, 2.3, 0.6);
    crest.rotation.x = 0.2;
    head.add(crest);

    this.shenronSegments[0].add(head);
    this.shenronHead = head;
    head.scale.setScalar(1.22);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x55ff9a,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 9, 130, 12, 1, true), beamMat);
    beam.position.y = 55;
    beam.visible = false;
    this.scene.add(beam);

    const light = new THREE.PointLight(0x55ff99, 2.2, 160, 2);
    light.visible = false;
    this.scene.add(light);

    this.shenron = {
      group,
      beam,
      light,
      active: false,
      t: 0,
      center: new THREE.Vector3(),
      headWorld: new THREE.Vector3(),
      headPositions: this.shenronSegments.map(() => new THREE.Vector3()),
    };
  }

  summonShenron(center) {
    this.shenron.center.copy(center);
    this.shenron.t = 0;
    this.shenron.active = true;
    this.shenron.group.visible = true;
    this.shenron.beam.visible = true;
    this.shenron.light.visible = true;
    this.shenron.beam.position.set(center.x, 55, center.z);
    this.fx.shenronBurst(center.clone().add(new THREE.Vector3(0, 15, 0)));
    this.audio.shenron();
  }

  updateShenron(dt, time) {
    if (!this.shenron.active) return;
    const sh = this.shenron;
    sh.t += dt;
    const t = sh.t;
    const center = sh.center;
    const baseAngle = t * 0.42 + 0.4;

    for (let i = 0; i < this.shenronSegments.length; i++) {
      const seg = this.shenronSegments[i];
      const a = baseAngle - i * 0.128;
      const radius = 32 - i * 0.22 + Math.sin(t * 0.7 + i * 0.28) * 4;
      const x = center.x + Math.cos(a) * radius;
      const z = center.z + Math.sin(a) * radius;
      const y = center.y + 23 + Math.sin(a * 1.7 + i * 0.32) * 5 + Math.sin(t * 1.1 + i * 0.2) * 1.3;
      seg.position.set(x, y, z);
      seg.rotation.set(
        Math.sin(t * 0.9 + i * 0.3) * 0.08,
        Math.PI - a,
        Math.sin(t * 1.2 + i * 0.4) * 0.12
      );
      sh.headPositions[i].set(x, y, z);
    }

    sh.headWorld.copy(this.shenronSegments[0].position);
    sh.light.position.copy(sh.headWorld);
    sh.beam.material.opacity = 0.12 + Math.sin(time * 2.2) * 0.05;
    sh.beam.position.x = center.x;
    sh.beam.position.z = center.z;

    if (Math.random() < dt * 2.2) {
      this.fx.sparks.spawn({
        pos: sh.headWorld.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 14
        )),
        vel: new THREE.Vector3((Math.random() - 0.5) * 2, 0.5 + Math.random(), (Math.random() - 0.5) * 2),
        life: 0.8 + Math.random() * 1.2,
        size: 0.25 + Math.random() * 0.4,
        endSize: 0.02,
        color: 0x66ffaa,
        gravity: -0.3,
        drag: 0.99,
        wobble: 0.5,
      });
    }
  }

  getShenronHeadPosition() {
    return this.shenron.headWorld;
  }

  /* ---------------------------------------------------------
     MAIN UPDATE
     --------------------------------------------------------- */

  update(dt, time, player, callbacks = {}) {
    this.time = time;
    this._updateBalls(dt, time, player, callbacks);
    this._updateObstacles(dt, player, callbacks.level || 1, callbacks);
    this.updateShenron(dt, time);
  }
}
