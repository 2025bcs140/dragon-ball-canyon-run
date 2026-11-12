/* =========================================================
   UI — HUD, overlays, comic popups, portrait
   ========================================================= */

// Older canvas implementations don't have roundRect; the portrait uses it.
if (
  typeof CanvasRenderingContext2D !== "undefined" &&
  !CanvasRenderingContext2D.prototype.roundRect
) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const radius = Math.max(0, Math.min(typeof r === "number" ? r : 0, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
    return this;
  };
}

class UI {
  constructor(sound) {
    this.sound = sound;

    this.$ = (id) => document.getElementById(id);
    this.hud = this.$("hud");
    this.heartsEl = this.$("hearts");
    this.heartEls = Array.from(this.heartsEl.querySelectorAll(".heart"));
    this.pipsEl = this.$("ball-pips");
    this.ballCountEl = this.$("ball-count");
    this.scoreEl = this.$("score");
    this.levelLabelEl = this.$("level-label");
    this.levelFillEl = this.$("level-fill");
    this.staminaFillEl = this.$("stamina-fill");
    this.toastEl = this.$("toast");
    this.comicLayer = this.$("comic-layer");
    this.portraitEl = this.$("portrait");
    this.portraitCanvas = this.$("portrait-canvas");
    this.portraitTag = this.portraitEl.querySelector(".portrait-tag");
    this.damageEl = this.$("damage-flash");
    this.whiteEl = this.$("white-flash");
    this.shenronSkyEl = this.$("shenron-sky");
    this.bestEl = this.$("best-score");
    this.winBestEl = this.$("win-best");
    this.overScoreEl = this.$("over-score");
    this.overBallsEl = this.$("over-balls");
    this.winScoreEl = this.$("win-score");
    this.winBallsEl = this.$("win-balls");
    this.soundBtn = this.$("sound-btn");
    this.startScreen = this.$("start-screen");
    this.pauseScreen = this.$("pause-screen");
    this.overScreen = this.$("over-screen");
    this.winScreen = this.$("win-screen");
    this.fadeEl = this.$("fade");

    this.screens = {
      start: this.startScreen,
      pause: this.pauseScreen,
      over: this.overScreen,
      win: this.winScreen,
    };

    this.lastHearts = 3;
    this.lastBalls = 0;
    this.toastTimer = null;
    this.portraitTimer = null;
    this.flashTimer = null;

    this._buildPips();
    this._buildWinBalls();
    this._drawPortrait();
    this.updateHearts(3, false);
    this.updateBalls(0, false);
  }

  /* ---------------------------------------------------------
     BUILD
     --------------------------------------------------------- */

  _buildPips() {
    this.pips = [];
    for (let i = 0; i < 7; i++) {
      const pip = document.createElement("span");
      pip.className = "pip";
      pip.dataset.index = String(i);
      this.pipsEl.appendChild(pip);
      this.pips.push(pip);
    }
  }

  _buildWinBalls() {
    for (let i = 0; i < 7; i++) {
      const ball = document.createElement("div");
      ball.className = "win-ball";
      ball.textContent = "★";
      ball.style.animationDelay = `${i * 0.07}s`;
      this.winBallsEl.appendChild(ball);
    }
  }

  /* ---------------------------------------------------------
     HUD
     --------------------------------------------------------- */

  setHUDVisible(visible) {
    this.hud.classList.toggle("hidden", !visible);
  }

  resetHUD() {
    this.updateHearts(3, false);
    this.updateBalls(0, false);
    this.updateScore(0);
    this.updateStamina(100);
    this.updateLevel(1, 0);
    this.hidePortrait();
    this.hideToast();
    this.comicLayer.innerHTML = "";
    this.setShenronSky(false);
  }

  updateHearts(hearts, animate = true) {
    const n = Math.max(0, Math.min(3, hearts));
    if (animate && n < this.lastHearts) {
      const lost = this.heartEls[n];
      if (lost) {
        lost.classList.add("lost");
        setTimeout(() => lost.classList.remove("lost"), 460);
      }
    }
    this.heartEls.forEach((heart, i) => {
      heart.classList.toggle("empty", i >= n);
    });
    this.lastHearts = n;
  }

  updateBalls(count, animate = true) {
    const n = Math.max(0, Math.min(7, count));
    this.pips.forEach((pip, i) => {
      const filled = i < n;
      pip.classList.toggle("filled", filled);
    });
    if (animate && n > this.lastBalls) {
      const pip = this.pips[n - 1];
      if (pip) {
        pip.classList.add("pop");
        setTimeout(() => pip.classList.remove("pop"), 520);
      }
    }
    this.ballCountEl.textContent = `${n}/7`;
    this.lastBalls = n;
  }

  updateScore(score) {
    this.scoreEl.textContent = Math.floor(score).toLocaleString("en-US");
  }

  updateStamina(value) {
    const v = Math.max(0, Math.min(100, value));
    this.staminaFillEl.style.width = `${v}%`;
    this.staminaFillEl.classList.toggle("low", v < 30);
  }

  updateLevel(level, progress) {
    this.levelLabelEl.textContent = `LV. ${level}`;
    this.levelFillEl.style.width = `${GamePath.clamp(progress, 0, 1) * 100}%`;
  }

  levelUp(level) {
    const banner = document.createElement("div");
    banner.className = "level-up-banner";
    banner.innerHTML = `<span class="level-up-kicker">LEVEL UP!</span><span class="level-up-number">LV. ${level}</span>`;
    document.getElementById("game-shell").appendChild(banner);
    setTimeout(() => {
      banner.classList.add("out");
      setTimeout(() => banner.remove(), 450);
    }, 1500);
    this.flashWhite(140);
  }

  /* ---------------------------------------------------------
     TOAST / COMIC / PORTRAIT
     --------------------------------------------------------- */

  showToast(text, duration = 2200) {
    if (!text) {
      this.hideToast();
      return;
    }
    this.toastEl.textContent = text;
    this.toastEl.classList.add("show");
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.hideToast(), duration);
  }

  hideToast() {
    this.toastEl.classList.remove("show");
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  comic(text, sub = "", alt = false) {
    const el = document.createElement("div");
    el.className = "comic-pop" + (alt ? " alt" : "");
    el.style.top = `${31 + Math.random() * 12}%`;
    el.style.transform = `translate(-50%, -50%) rotate(${(Math.random() - 0.5) * 8}deg) scale(0.6)`;
    el.innerHTML = `${text}${sub ? `<span class="comic-sub">${sub}</span>` : ""}`;
    this.comicLayer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  showPortrait(tag = "GOKU!") {
    this.portraitTag.textContent = tag;
    this.portraitEl.classList.add("show");
    if (this.portraitTimer) clearTimeout(this.portraitTimer);
    this.portraitTimer = setTimeout(() => this.hidePortrait(), 1500);
  }

  hidePortrait() {
    this.portraitEl.classList.remove("show");
    if (this.portraitTimer) {
      clearTimeout(this.portraitTimer);
      this.portraitTimer = null;
    }
  }

  /* ---------------------------------------------------------
     FLASHES / SKY
     --------------------------------------------------------- */

  flashDamage() {
    this.damageEl.style.opacity = "1";
    setTimeout(() => {
      this.damageEl.style.opacity = "0";
    }, 110);
  }

  flashWhite(duration = 160) {
    this.whiteEl.style.transition = "none";
    this.whiteEl.style.opacity = "0.85";
    requestAnimationFrame(() => {
      this.whiteEl.style.transition = `opacity ${duration}ms ease`;
      this.whiteEl.style.opacity = "0";
    });
  }

  setShenronSky(active) {
    this.shenronSkyEl.classList.toggle("active", active);
  }

  /* ---------------------------------------------------------
     SCREENS
     --------------------------------------------------------- */

  showScreen(name) {
    for (const key of Object.keys(this.screens)) {
      this.screens[key].classList.toggle("hidden", key !== name);
    }
  }

  setStartBest(best) {
    this.bestEl.textContent = Math.floor(best).toLocaleString("en-US");
  }

  setGameOver(score, balls) {
    this.overScoreEl.textContent = Math.floor(score).toLocaleString("en-US");
    this.overBallsEl.textContent = `${balls}/7`;
  }

  setVictory(score, best) {
    this.winScoreEl.textContent = Math.floor(score).toLocaleString("en-US");
    this.winBestEl.textContent = Math.floor(best).toLocaleString("en-US");
  }

  setSoundLabel(muted) {
    this.soundBtn.textContent = `SOUND: ${muted ? "OFF" : "ON"}`;
  }

  fadeIn(duration = 320) {
    this.fadeEl.style.transition = `opacity ${duration}ms ease`;
    this.fadeEl.classList.add("show");
  }

  fadeOut(duration = 320) {
    this.fadeEl.style.transition = `opacity ${duration}ms ease`;
    this.fadeEl.classList.remove("show");
  }

  /* ---------------------------------------------------------
     PORTRAIT ART — drawn once on a canvas
     --------------------------------------------------------- */

  _drawPortrait() {
    const c = this.portraitCanvas;
    const ctx = c.getContext("2d");
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);

    // --- background ---
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.42, 10, W * 0.5, H * 0.5, W * 0.72);
    bg.addColorStop(0, "#fff0b0");
    bg.addColorStop(0.42, "#ffc13f");
    bg.addColorStop(0.78, "#f08a12");
    bg.addColorStop(1, "#b95708");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // speed lines
    ctx.save();
    ctx.translate(W / 2, H / 2);
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * W * 0.42, Math.sin(a) * H * 0.42);
      ctx.lineTo(Math.cos(a + 0.045) * W * 0.82, Math.sin(a + 0.045) * H * 0.82);
      ctx.lineTo(Math.cos(a - 0.02) * W * 0.8, Math.sin(a - 0.02) * H * 0.8);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.10)" : "rgba(120,45,0,0.08)";
      ctx.fill();
    }
    ctx.restore();

    // --- power pole behind him ---
    ctx.save();
    ctx.translate(W * 0.79, H * 0.5);
    ctx.rotate(0.22);
    ctx.fillStyle = "#c9342a";
    ctx.strokeStyle = "#4d0e09";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-13, -180, 26, 360, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8e1e18";
    ctx.beginPath();
    ctx.roundRect(-17, -184, 34, 22, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // --- tail behind shoulder ---
    ctx.save();
    ctx.strokeStyle = "#4a2a10";
    ctx.lineWidth = 30;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W * 0.78, H * 0.95);
    ctx.bezierCurveTo(W * 0.98, H * 0.82, W * 0.97, H * 0.62, W * 0.86, H * 0.55);
    ctx.stroke();
    ctx.strokeStyle = "#8a5a2b";
    ctx.lineWidth = 22;
    ctx.stroke();
    ctx.strokeStyle = "#a56b35";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();

    // --- shoulders / blue gi ---
    ctx.save();
    ctx.fillStyle = "#2e4fa8";
    ctx.strokeStyle = "#101a3a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(W * 0.10, H);
    ctx.quadraticCurveTo(W * 0.12, H * 0.78, W * 0.31, H * 0.73);
    ctx.lineTo(W * 0.69, H * 0.73);
    ctx.quadraticCurveTo(W * 0.88, H * 0.78, W * 0.90, H);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // red belt / collar trim
    ctx.fillStyle = "#c9342a";
    ctx.beginPath();
    ctx.moveTo(W * 0.26, H * 0.78);
    ctx.quadraticCurveTo(W * 0.5, H * 0.86, W * 0.74, H * 0.78);
    ctx.lineTo(W * 0.70, H * 0.86);
    ctx.quadraticCurveTo(W * 0.5, H * 0.93, W * 0.30, H * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // collar V
    ctx.fillStyle = "#1f3a85";
    ctx.beginPath();
    ctx.moveTo(W * 0.36, H * 0.73);
    ctx.lineTo(W * 0.5, H * 0.9);
    ctx.lineTo(W * 0.64, H * 0.73);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // --- neck ---
    ctx.save();
    ctx.fillStyle = "#e7b183";
    ctx.strokeStyle = "#3a1b00";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(W * 0.43, H * 0.66, W * 0.14, H * 0.13, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // --- hair silhouette ---
    const hairPoints = [
      [0.5, 0.11], [0.59, 0.17], [0.65, 0.12], [0.69, 0.21],
      [0.78, 0.19], [0.77, 0.3], [0.87, 0.34], [0.81, 0.43],
      [0.87, 0.5], [0.77, 0.53], [0.78, 0.63], [0.69, 0.6],
      [0.66, 0.7], [0.58, 0.65], [0.5, 0.72], [0.42, 0.65],
      [0.34, 0.7], [0.31, 0.6], [0.22, 0.63], [0.23, 0.53],
      [0.13, 0.5], [0.19, 0.43], [0.13, 0.34], [0.23, 0.3],
      [0.22, 0.19], [0.31, 0.21], [0.35, 0.12], [0.41, 0.17],
    ];
    ctx.save();
    ctx.beginPath();
    hairPoints.forEach((p, i) => {
      const x = p[0] * W;
      const y = p[1] * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "#15151d";
    ctx.fill();
    ctx.strokeStyle = "#050508";
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();

    // hair highlights
    ctx.save();
    ctx.strokeStyle = "rgba(74, 84, 130, 0.55)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    const highlights = [
      [[0.38, 0.2], [0.44, 0.28], [0.42, 0.36]],
      [[0.56, 0.17], [0.58, 0.26], [0.55, 0.33]],
      [[0.7, 0.27], [0.72, 0.35]],
      [[0.25, 0.34], [0.29, 0.42]],
    ];
    for (const line of highlights) {
      ctx.beginPath();
      line.forEach((p, i) => {
        const x = p[0] * W;
        const y = p[1] * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.restore();

    // --- face ---
    ctx.save();
    const faceGrad = ctx.createRadialGradient(W * 0.46, H * 0.48, 10, W * 0.5, H * 0.52, W * 0.3);
    faceGrad.addColorStop(0, "#ffe0b5");
    faceGrad.addColorStop(0.7, "#f2c79c");
    faceGrad.addColorStop(1, "#dda475");
    ctx.fillStyle = faceGrad;
    ctx.strokeStyle = "#3a1b00";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.49, W * 0.245, H * 0.255, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ears
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(W * (0.5 + side * 0.255), H * 0.51, W * 0.045, H * 0.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#e7b183";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(W * (0.5 + side * 0.255), H * 0.51, W * 0.018, H * 0.03, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#c98d61";
      ctx.fill();
    }
    ctx.restore();

    // --- bangs ---
    ctx.save();
    ctx.fillStyle = "#15151d";
    ctx.strokeStyle = "#050508";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    const bangs = [
      [[0.31, 0.36], [0.42, 0.48], [0.35, 0.29]],
      [[0.4, 0.29], [0.49, 0.46], [0.51, 0.27]],
      [[0.53, 0.27], [0.6, 0.46], [0.66, 0.31]],
      [[0.64, 0.3], [0.7, 0.42], [0.73, 0.36]],
    ];
    for (const b of bangs) {
      ctx.beginPath();
      b.forEach((p, i) => {
        const x = p[0] * W;
        const y = p[1] * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // --- eyebrows ---
    ctx.save();
    ctx.strokeStyle = "#15151d";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W * 0.31, H * 0.43);
    ctx.lineTo(W * 0.42, H * 0.405);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.69, H * 0.43);
    ctx.lineTo(W * 0.58, H * 0.405);
    ctx.stroke();
    ctx.restore();

    // --- eyes ---
    ctx.save();
    ctx.strokeStyle = "#3a1b00";
    ctx.lineWidth = 4;
    for (const side of [-1, 1]) {
      const ex = W * (0.5 + side * 0.095);
      const ey = H * 0.475;
      ctx.beginPath();
      ctx.ellipse(ex, ey, W * 0.052, H * 0.042, side * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = "#fffdf2";
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(ex + side * 2, ey + 2, W * 0.021, H * 0.028, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#14141a";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ex + side * 2 - 2, ey - 4, W * 0.007, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    ctx.restore();

    // --- nose ---
    ctx.save();
    ctx.strokeStyle = "#a76a3d";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.5);
    ctx.quadraticCurveTo(W * 0.47, H * 0.55, W * 0.515, H * 0.555);
    ctx.stroke();
    ctx.restore();

    // --- shouting mouth ---
    ctx.save();
    ctx.fillStyle = "#4a0c0c";
    ctx.strokeStyle = "#3a1b00";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(W * 0.4, H * 0.62);
    ctx.quadraticCurveTo(W * 0.5, H * 0.58, W * 0.6, H * 0.62);
    ctx.quadraticCurveTo(W * 0.62, H * 0.72, W * 0.5, H * 0.745);
    ctx.quadraticCurveTo(W * 0.38, H * 0.72, W * 0.4, H * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // teeth
    ctx.beginPath();
    ctx.moveTo(W * 0.415, H * 0.625);
    ctx.quadraticCurveTo(W * 0.5, H * 0.6, W * 0.585, H * 0.625);
    ctx.lineTo(W * 0.57, H * 0.655);
    ctx.quadraticCurveTo(W * 0.5, H * 0.635, W * 0.43, H * 0.655);
    ctx.closePath();
    ctx.fillStyle = "#fffdf2";
    ctx.fill();

    // tongue
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.715, W * 0.055, H * 0.024, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#d94a3a";
    ctx.fill();
    ctx.restore();

    // cheek action marks
    ctx.save();
    ctx.strokeStyle = "rgba(160, 65, 25, 0.65)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const x = W * (0.5 + side * (0.19 + i * 0.03));
        const y = H * (0.56 + i * 0.025);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + side * W * 0.03, y + H * 0.012);
        ctx.stroke();
      }
    }
    ctx.restore();

    // little comic sparkle
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (const p of [[0.14, 0.16], [0.88, 0.72], [0.2, 0.84]]) {
      GameTextures.starPath(ctx, p[0] * W, p[1] * H, 7, 4);
      ctx.fill();
    }
    ctx.restore();

    // vignette border
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.72);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(70,20,0,0.35)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }
}
