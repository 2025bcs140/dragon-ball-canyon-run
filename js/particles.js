/* =========================================================
   TEXTURES + PARTICLES
   Everything is generated procedurally — no image assets.
   ========================================================= */

const GameTextures = (() => {
  const cache = {};

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function makeTexture(c) {
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  function softCircle(size = 64) {
    if (cache.softCircle) return cache.softCircle;
    const c = canvas(size, size);
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.85)");
    g.addColorStop(0.7, "rgba(255,255,255,0.25)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    cache.softCircle = makeTexture(c);
    return cache.softCircle;
  }

  function glow(size = 128) {
    if (cache.glow) return cache.glow;
    const c = canvas(size, size);
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,244,190,0.85)");
    g.addColorStop(0.55, "rgba(255,190,70,0.3)");
    g.addColorStop(1, "rgba(255,160,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    cache.glow = makeTexture(c);
    return cache.glow;
  }

  function shadow(size = 128) {
    if (cache.shadow) return cache.shadow;
    const c = canvas(size, size);
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(0,0,0,0.62)");
    g.addColorStop(0.45, "rgba(0,0,0,0.36)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    cache.shadow = makeTexture(c);
    return cache.shadow;
  }

  function sand(size = 512) {
    if (cache.sand) return cache.sand;
    const c = canvas(size, size);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#d8a35d";
    ctx.fillRect(0, 0, size, size);

    // Warm, sandy mottling.
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 0.5 + Math.random() * 2.2;
      const shades = ["#c98f4a", "#e1b171", "#d09a55", "#e8bd82", "#bf803e"];
      ctx.fillStyle = shades[(Math.random() * shades.length) | 0];
      ctx.globalAlpha = 0.16 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Soft tire/footpath streaks along the road.
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * size;
      ctx.strokeStyle = "rgba(150, 95, 40, 0.1)";
      ctx.lineWidth = 3 + Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(x, -20);
      ctx.bezierCurveTo(x + 30, size * 0.35, x - 25, size * 0.7, x + 10, size + 20);
      ctx.stroke();
    }

    // Tiny pebbles.
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = Math.random() > 0.5 ? "#a97743" : "#eccb98";
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 1.5 + Math.random() * 2.5, 1 + Math.random() * 1.6, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const tex = makeTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    cache.sand = tex;
    return tex;
  }

  function grass(size = 512) {
    if (cache.grass) return cache.grass;
    const c = canvas(size, size);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#6aa842";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 5200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const shades = ["#588f35", "#7ab94d", "#4c8230", "#8ac75b", "#65a03c"];
      ctx.fillStyle = shades[(Math.random() * shades.length) | 0];
      ctx.globalAlpha = 0.2 + Math.random() * 0.35;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 2 + Math.random() * 5);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 250; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.strokeStyle = "rgba(40, 80, 25, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 5, y - 3 - Math.random() * 6);
      ctx.stroke();
    }
    const tex = makeTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    cache.grass = tex;
    return tex;
  }

  function wood(size = 256) {
    if (cache.wood) return cache.wood;
    const c = canvas(size, size);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#8a5a2c";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 42; i++) {
      const y = Math.random() * size;
      ctx.strokeStyle = Math.random() > 0.5 ? "rgba(60,32,10,0.35)" : "rgba(190,130,65,0.25)";
      ctx.lineWidth = 1 + Math.random() * 4;
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 14, size * 0.7, y + (Math.random() - 0.5) * 14, size + 10, y);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = "rgba(55,28,8,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(Math.random() * size, Math.random() * size, 6 + Math.random() * 12, 3 + Math.random() * 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const tex = makeTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    cache.wood = tex;
    return tex;
  }

  function starPath(ctx, cx, cy, r, points = 5) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? r : r * 0.45;
      const a = (Math.PI / points) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function dragonBall(stars = 1) {
    const key = "ball" + stars;
    if (cache[key]) return cache[key];

    const w = 512;
    const h = 256;
    const c = canvas(w, h);
    const ctx = c.getContext("2d");

    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, "#f7a21c");
    base.addColorStop(0.35, "#ffbd3d");
    base.addColorStop(0.62, "#ffc84f");
    base.addColorStop(1, "#e8860e");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    // Mottled glassy surface.
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 2 + Math.random() * 14;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,235,150,0.14)");
      g.addColorStop(1, "rgba(200,90,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Seven-star pattern. Each ball gets a slightly different constellation.
    const layout = [
      [0.5, 0.48],
      [0.35, 0.38], [0.65, 0.38],
      [0.5, 0.62],
      [0.27, 0.55], [0.73, 0.55],
      [0.5, 0.78],
    ];
    const rotate = stars * 0.7;
    for (let i = 0; i < stars; i++) {
      let [px, py] = layout[i];
      // rotate the pattern slightly around the center
      const dx = px - 0.5;
      const dy = py - 0.5;
      px = 0.5 + dx * Math.cos(rotate) - dy * Math.sin(rotate);
      py = 0.5 + dx * Math.sin(rotate) + dy * Math.cos(rotate);
      const x = px * w;
      const y = py * h;
      const r = 16 + Math.random() * 2;

      starPath(ctx, x + 2, y + 3, r * 1.12);
      ctx.fillStyle = "rgba(90, 15, 5, 0.35)";
      ctx.fill();

      starPath(ctx, x, y, r);
      const sg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      sg.addColorStop(0, "#ff6a4a");
      sg.addColorStop(0.45, "#d92a1d");
      sg.addColorStop(1, "#a8150e");
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 12, 5, 0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // little highlight
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fill();
    }

    // A soft sheen band.
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, "rgba(255,255,255,0.0)");
    sheen.addColorStop(0.48, "rgba(255,255,255,0.12)");
    sheen.addColorStop(0.55, "rgba(255,255,255,0.02)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    cache[key] = makeTexture(c);
    return cache[key];
  }

  function kanji(size = 128) {
    if (cache.kanji) return cache.kanji;
    const c = canvas(size, size);
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = "#f7f1df";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#c5291d";
    ctx.stroke();
    ctx.fillStyle = "#c5291d";
    ctx.font = `900 ${size * 0.56}px "Yu Gothic", "MS Gothic", "Malgun Gothic", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("亀", size / 2, size / 2 + size * 0.03);
    cache.kanji = makeTexture(c);
    return cache.kanji;
  }

  return { softCircle, glow, shadow, sand, grass, wood, dragonBall, kanji, starPath };
})();

/* =========================================================
   PARTICLE POOL
   ========================================================= */

class ParticlePool {
  constructor(scene, max, blending, texture, options = {}) {
    this.max = max;
    this.items = [];
    this.cursor = 0;
    this.gravity = options.gravity ?? 0;
    this.drag = options.drag ?? 0.98;
    this.texture = texture;

    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);

    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uScale: { value: 500 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uScale;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (uScale / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor, tex.a * vAlpha);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);

    for (let i = 0; i < max; i++) {
      this.items.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size0: 1,
        size1: 1,
        color: new THREE.Color(1, 1, 1),
        gravity: this.gravity,
        drag: this.drag,
        wobble: 0,
        phase: Math.random() * Math.PI * 2,
      });
      this.positions[i * 3 + 1] = -9999;
    }
  }

  setScale(value) {
    this.material.uniforms.uScale.value = value;
  }

  spawn(config) {
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;

    p.pos.copy(config.pos);
    p.vel.copy(config.vel || new THREE.Vector3());
    p.life = config.life ?? 0.8;
    p.maxLife = p.life;
    p.size0 = config.size ?? 0.3;
    p.size1 = config.endSize ?? p.size0;
    p.color.set(config.color ?? 0xffffff);
    p.gravity = config.gravity ?? this.gravity;
    p.drag = config.drag ?? this.drag;
    p.wobble = config.wobble ?? 0;
    p.phase = Math.random() * Math.PI * 2;
    return p;
  }

  update(dt) {
    const pos = this.positions;
    const col = this.colors;
    const size = this.sizes;
    const alpha = this.alphas;

    for (let i = 0; i < this.max; i++) {
      const p = this.items[i];
      if (p.life <= 0) {
        alpha[i] = 0;
        size[i] = 0;
        pos[i * 3 + 1] = -9999;
        continue;
      }

      p.life -= dt;
      if (p.life <= 0) {
        alpha[i] = 0;
        size[i] = 0;
        continue;
      }

      p.vel.y -= p.gravity * dt;
      const drag = Math.pow(p.drag, dt * 60);
      p.vel.multiplyScalar(drag);
      p.pos.addScaledVector(p.vel, dt);
      if (p.wobble > 0) {
        p.pos.x += Math.sin(p.phase + (1 - p.life / p.maxLife) * 12) * p.wobble * dt;
        p.pos.z += Math.cos(p.phase + (1 - p.life / p.maxLife) * 12) * p.wobble * dt;
      }

      const t = 1 - p.life / p.maxLife;
      const s = p.size0 + (p.size1 - p.size0) * t;
      pos[i * 3] = p.pos.x;
      pos[i * 3 + 1] = p.pos.y;
      pos[i * 3 + 2] = p.pos.z;
      col[i * 3] = p.color.r;
      col[i * 3 + 1] = p.color.g;
      col[i * 3 + 2] = p.color.b;
      size[i] = s;
      alpha[i] = Math.min(1, (1 - t) * 1.6);
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aColor.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
  }
}

/* =========================================================
   FX — dust, sparks, rings
   ========================================================= */

class FX {
  constructor(scene) {
    this.scene = scene;
    this.dust = new ParticlePool(scene, 320, THREE.NormalBlending, GameTextures.softCircle(), {
      gravity: -1.4,
      drag: 0.94,
    });
    this.sparks = new ParticlePool(scene, 420, THREE.AdditiveBlending, GameTextures.softCircle(), {
      gravity: 4.5,
      drag: 0.975,
    });
    this.rings = [];
    this.ringPool = [];
    this.tmp = new THREE.Vector3();
    this._buildRings();
  }

  _buildRings() {
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd15c,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.9, 32), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.ringPool.push({ mesh, life: 0, maxLife: 0.5, size: 1 });
    }
  }

  setScale(heightPx) {
    const scale = heightPx * 0.9;
    this.dust.setScale(scale);
    this.sparks.setScale(scale);
  }

  dustPuff(pos, count = 5, power = 1) {
    for (let i = 0; i < count; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2.6 * power,
        0.6 + Math.random() * 1.6 * power,
        (Math.random() - 0.2) * 2.2 * power
      );
      this.dust.spawn({
        pos: this.tmp.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.2, (Math.random() - 0.5) * 0.5)),
        vel,
        life: 0.5 + Math.random() * 0.4,
        size: 0.22 + Math.random() * 0.3,
        endSize: 0.6 + Math.random() * 0.6,
        color: Math.random() > 0.5 ? 0xd9b078 : 0xc99b62,
        drag: 0.93,
        gravity: -0.8,
        wobble: 0.25,
      });
    }
  }

  runTrail(pos, speed = 1) {
    if (Math.random() > 0.5) return;
    this.dust.spawn({
      pos: this.tmp.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.7, 0.08, (Math.random() - 0.5) * 0.7)),
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.7, 0.35 + Math.random() * 0.5, 1.2 + Math.random() * 1.6 * speed),
      life: 0.35 + Math.random() * 0.3,
      size: 0.16 + Math.random() * 0.2,
      endSize: 0.5 + Math.random() * 0.4,
      color: 0xd8ac72,
      drag: 0.94,
      gravity: -0.4,
    });
  }

  collectBurst(pos, color = 0xffd15c) {
    for (let i = 0; i < 34; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 0.4,
        Math.random() * 2 - 1
      ).normalize();
      const speed = 2.5 + Math.random() * 6.5;
      this.sparks.spawn({
        pos: pos.clone(),
        vel: dir.multiplyScalar(speed),
        life: 0.5 + Math.random() * 0.55,
        size: 0.18 + Math.random() * 0.35,
        endSize: 0.03,
        color: Math.random() > 0.4 ? color : 0xfff6cf,
        gravity: 4.2,
        drag: 0.97,
        wobble: 0.4,
      });
    }
    for (let i = 0; i < 12; i++) {
      this.dust.spawn({
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.6, (Math.random() - 0.5) * 2),
        life: 0.45 + Math.random() * 0.3,
        size: 0.35,
        endSize: 1.1,
        color: 0xffc23a,
        drag: 0.94,
        gravity: -0.2,
      });
    }
    this.ring(pos, color);
  }

  hitBurst(pos) {
    for (let i = 0; i < 22; i++) {
      const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 1.6, Math.random() * 2 - 1).normalize();
      this.sparks.spawn({
        pos: pos.clone(),
        vel: dir.multiplyScalar(2 + Math.random() * 5),
        life: 0.3 + Math.random() * 0.3,
        size: 0.2 + Math.random() * 0.3,
        endSize: 0.02,
        color: Math.random() > 0.5 ? 0xff6a3a : 0xffd15c,
        gravity: 7,
        drag: 0.96,
      });
    }
  }

  vaultBurst(pos) {
    for (let i = 0; i < 18; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 1.8 - 0.2,
        Math.random() * 2 - 1
      ).normalize();
      this.sparks.spawn({
        pos: pos.clone().add(new THREE.Vector3(0, 0.7 + Math.random() * 0.7, 0)),
        vel: dir.multiplyScalar(2.5 + Math.random() * 5),
        life: 0.35 + Math.random() * 0.35,
        size: 0.18 + Math.random() * 0.28,
        endSize: 0.02,
        color: Math.random() > 0.4 ? 0xffc94a : 0xfff2b0,
        gravity: 3.4,
        drag: 0.97,
        wobble: 0.3,
      });
    }
    this.ring(pos, 0xffc94a);
  }

  shenronBurst(pos) {
    for (let i = 0; i < 60; i++) {
      const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 0.5, Math.random() * 2 - 1).normalize();
      this.sparks.spawn({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5)),
        vel: dir.multiplyScalar(2 + Math.random() * 8),
        life: 0.9 + Math.random() * 1.4,
        size: 0.3 + Math.random() * 0.5,
        endSize: 0.03,
        color: Math.random() > 0.4 ? 0x55ffa0 : 0xd6ffe8,
        gravity: -0.4,
        drag: 0.985,
        wobble: 0.6,
      });
    }
  }

  ring(pos, color = 0xffd15c) {
    const item = this.ringPool.find((r) => r.life <= 0);
    if (!item) return;
    item.mesh.visible = true;
    item.mesh.position.copy(pos);
    item.mesh.position.y = Math.max(0.15, pos.y);
    item.mesh.material.color.set(color);
    item.mesh.material.opacity = 0.9;
    item.mesh.scale.set(0.5, 0.5, 0.5);
    item.life = 0.55;
    item.maxLife = 0.55;
  }

  update(dt) {
    this.dust.update(dt);
    this.sparks.update(dt);
    for (const r of this.ringPool) {
      if (r.life <= 0) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.mesh.visible = false;
        continue;
      }
      const t = 1 - r.life / r.maxLife;
      const scale = 0.5 + t * 5.5;
      r.mesh.scale.set(scale, scale, scale);
      r.mesh.material.opacity = (1 - t) * 0.9;
    }
  }
}
