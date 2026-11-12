/* =========================================================
   MAIN — game loop, input, player physics, camera, flow
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     CONSTANTS
     --------------------------------------------------------- */

  const MENU_S = 85;
  const MAX_LATERAL = 4.55;
  const BASE_SPEED = 17.5;
  const SPEED_PER_LEVEL = 1.15;
  const MAX_SPEED = 30;
  const LEVEL_LENGTH = 520;
  const JUMP_IMPULSE = 9.2;
  const VAULT_IMPULSE = 10.2;
  const GRAVITY = 26;
  const VAULT_COST = 34;
  const BEST_KEY = "dbCanyonBest";

  const STATE = {
    MENU: "menu",
    PLAYING: "playing",
    PAUSED: "paused",
    OVER: "over",
    WIN: "win",
  };

  /* ---------------------------------------------------------
     GLOBALS
     --------------------------------------------------------- */

  let renderer;
  let scene;
  let camera;
  let sound;
  let ui;
  let fx;
  let world;
  let entities;
  let goku;

  let state = STATE.MENU;
  let gameTime = 0;
  let winTimer = 0;
  let winOverlayShown = false;
  let shenronSummoned = false;
  let overTimer = 0;
  let bestScore = 0;
  let lastScore = -1;
  let lastFrame = 0;
  let rafId = 0;

  const input = {
    left: false,
    right: false,
    jumpQueued: false,
  };

  const player = {
    s: 0,
    lateral: 0,
    lateralVel: 0,
    y: 0,
    vy: 0,
    grounded: true,
    jumps: 0,
    stamina: 100,
    staminaDelay: 0,
    baseSpeed: BASE_SPEED,
    speed: BASE_SPEED,
    speedPenalty: 0,
    hearts: 3,
    invuln: 0,
    dying: false,
    deathTimer: 0,
    level: 1,
    levelProgress: 0,
    score: 0,
    dodgeBonus: 0,
    win: false,
    noStaminaMsg: 0,
    dustTimer: 0,
    worldPos: new THREE.Vector3(),
    heading: 0,
  };

  const camState = {
    pos: new THREE.Vector3(0, 3, 10),
    look: new THREE.Vector3(0, 1, 0),
    fov: 62,
    shake: 0,
    fovPunch: 0,
    snap: true,
  };

  const entityCallbacks = {
    level: 1,
    onCollect: null,
    onMiss: null,
    onHit: null,
    onDodge: null,
  };

  const tmpVec = new THREE.Vector3();
  const tmpVec2 = new THREE.Vector3();
  const tmpVec3 = new THREE.Vector3();

  /* ---------------------------------------------------------
     BOOT
     --------------------------------------------------------- */

  function boot() {
    const canvas = document.getElementById("game-canvas");
    const loading = document.getElementById("loading");

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch (err) {
      showFatal(err);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.setClearColor(0x9ed8f5);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    );

    sound = new SoundFX();
    ui = new UI(sound);
    fx = new FX(scene);
    world = new World(scene);
    entities = new Entities(scene, fx, sound);
    goku = new Goku(scene);

    bestScore = loadBest();
    ui.setStartBest(bestScore);
    ui.setSoundLabel(sound.muted);
    ui.setHUDVisible(false);
    ui.showScreen("start");

    entityCallbacks.onCollect = handleCollect;
    entityCallbacks.onMiss = handleMiss;
    entityCallbacks.onHit = handleHit;
    entityCallbacks.onDodge = handleDodge;

    bindEvents();

    // Put the menu hero on the road and frame a scenic shot.
    resetMenuScene();
    updateCamera(0.016, true);
    world.update(0, 0, MENU_S, player.worldPos, camera);
    renderer.render(scene, camera);

    window.addEventListener("resize", onResize);
    onResize();

    requestAnimationFrame(() => {
      loading.classList.add("gone");
      lastFrame = performance.now();
      rafId = requestAnimationFrame(loop);
    });
  }

  function showFatal(err) {
    const loading = document.getElementById("loading");
    const fatal = document.getElementById("fatal");
    const msg = document.getElementById("fatal-message");
    if (loading) loading.classList.add("gone");
    if (fatal) fatal.classList.remove("hidden");
    if (msg) {
      msg.textContent =
        "This game needs a browser with WebGL enabled. " +
        (err && err.message ? `(${err.message})` : "");
    }
    console.error(err);
  }

  /* ---------------------------------------------------------
     MENU / RUN SETUP
     --------------------------------------------------------- */

  function resetMenuScene() {
    state = STATE.MENU;
    player.s = MENU_S;
    player.lateral = 0;
    player.lateralVel = 0;
    player.y = 0;
    player.vy = 0;
    player.grounded = true;
    player.jumps = 0;
    player.heading = GamePath.heading(MENU_S);
    GamePath.point(MENU_S, 0, 0, player.worldPos);

    world.reset(MENU_S);
    entities.reset(MENU_S);

    goku.revive();
    goku.show();
    goku.setPosition(player.worldPos);
    goku.setHeading(player.heading);
    goku.setInvulnerable(0);
    goku.update(0.016, 0, { mode: "idle", speed: 0, grounded: true });

    camState.snap = true;
    camState.shake = 0;
  }

  function resetPlayerRun() {
    player.s = 0;
    player.lateral = 0;
    player.lateralVel = 0;
    player.y = 0;
    player.vy = 0;
    player.grounded = true;
    player.jumps = 0;
    player.stamina = 100;
    player.staminaDelay = 0;
    player.baseSpeed = BASE_SPEED;
    player.speed = BASE_SPEED;
    player.speedPenalty = 0;
    player.hearts = 3;
    player.invuln = 0;
    player.dying = false;
    player.deathTimer = 0;
    player.level = 1;
    player.levelProgress = 0;
    player.score = 0;
    player.dodgeBonus = 0;
    player.win = false;
    player.noStaminaMsg = 0;
    player.dustTimer = 0;
    player.heading = GamePath.heading(0);
    GamePath.point(0, 0, 0, player.worldPos);
  }

  function startRun() {
    if (state === STATE.PLAYING || state === STATE.PAUSED) return;
    if (state === STATE.WIN && !winOverlayShown) return;

    sound.init();
    sound.resume();
    sound.click();

    resetPlayerRun();
    world.reset(0);
    entities.reset(0);

    goku.revive();
    goku.show();
    goku.setPosition(player.worldPos);
    goku.setHeading(player.heading);
    goku.setInvulnerable(0);

    gameTime = 0;
    winTimer = 0;
    winOverlayShown = false;
    shenronSummoned = false;
    overTimer = 0;
    lastScore = -1;
    lastFrame = performance.now();

    state = STATE.PLAYING;
    clearInput();

    ui.resetHUD();
    ui.showScreen(null);
    ui.setHUDVisible(true);
    ui.setShenronSky(false);
    ui.showToast("COLLECT ALL 7 DRAGON BALLS!", 2100);
    ui.flashWhite(260);

    camState.snap = true;
    camState.shake = 0;
    camState.fovPunch = 0;

    updateCamera(0.016, true);
    world.update(0, gameTime, player.s, player.worldPos, camera);
  }

  function restartRun() {
    if (state === STATE.PLAYING || state === STATE.PAUSED) {
      state = STATE.OVER;
    }
    startRun();
  }

  /* ---------------------------------------------------------
     MAIN LOOP
     --------------------------------------------------------- */

  function loop(now) {
    rafId = requestAnimationFrame(loop);

    let dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 0.05);

    if (state !== STATE.PAUSED) {
      gameTime += dt;
    }

    if (state === STATE.PLAYING) {
      updatePlaying(dt);
    } else if (state === STATE.MENU) {
      updateMenu(dt);
    } else if (state === STATE.WIN) {
      updateWin(dt);
    } else if (state === STATE.OVER) {
      updateOver(dt);
    }

    if (state !== STATE.PAUSED) {
      updateCamera(dt);
      world.update(dt, gameTime, player.s, player.worldPos, camera);
      fx.update(dt);
    }

    renderer.render(scene, camera);
  }

  /* ---------------------------------------------------------
     UPDATE — MENU
     --------------------------------------------------------- */

  function updateMenu(dt) {
    player.s = MENU_S;
    player.lateral = 0;
    player.lateralVel = 0;
    player.y = 0;
    GamePath.point(MENU_S, 0, 0, player.worldPos);
    player.heading = GamePath.heading(MENU_S);

    goku.setPosition(player.worldPos);
    goku.setHeading(player.heading);
    goku.update(dt, gameTime, { mode: "idle", speed: 0, grounded: true });
  }

  /* ---------------------------------------------------------
     UPDATE — PLAYING
     --------------------------------------------------------- */

  function updatePlaying(dt) {
    if (player.dying) {
      updateDying(dt);
      return;
    }

    updatePlayer(dt);

    entityCallbacks.level = player.level;
    entities.update(dt, gameTime, player, entityCallbacks);

    updateHUD();
  }

  function updatePlayer(dt) {
    // --- forward speed ---
    const targetBase = Math.min(
      MAX_SPEED,
      BASE_SPEED + (player.level - 1) * SPEED_PER_LEVEL
    );
    player.baseSpeed = targetBase;
    player.speed = targetBase * (player.speedPenalty > 0 ? 0.56 : 1);
    player.speedPenalty = Math.max(0, player.speedPenalty - dt);
    player.s += player.speed * dt;

    // --- lateral steering ---
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const targetVel = steer * 7.4;
    const lateralEase = 1 - Math.exp(-dt * 11);
    player.lateralVel += (targetVel - player.lateralVel) * lateralEase;

    player.lateral += player.lateralVel * dt;
    if (player.lateral > MAX_LATERAL) {
      player.lateral = MAX_LATERAL;
      player.lateralVel = Math.min(0, player.lateralVel);
    } else if (player.lateral < -MAX_LATERAL) {
      player.lateral = -MAX_LATERAL;
      player.lateralVel = Math.max(0, player.lateralVel);
    }

    // --- jump / Power Pole vault ---
    if (input.jumpQueued) {
      input.jumpQueued = false;
      if (player.grounded) {
        player.vy = JUMP_IMPULSE;
        player.grounded = false;
        player.jumps = 1;
        sound.jump();
        fx.dustPuff(player.worldPos, 6, 0.8);
      } else if (player.jumps < 2 && player.stamina >= VAULT_COST) {
        player.vy = VAULT_IMPULSE;
        player.jumps = 2;
        player.stamina -= VAULT_COST;
        player.staminaDelay = 0.55;
        goku.triggerSpin();
        goku.triggerPogo();
        sound.vault();
        fx.vaultBurst(player.worldPos);
        camState.fovPunch = Math.max(camState.fovPunch, 1.8);
        if (Math.random() < 0.45) {
          ui.comic("파워!", "POWER POLE!", true);
        }
      } else if (player.stamina < VAULT_COST && player.noStaminaMsg <= 0) {
        player.noStaminaMsg = 1.8;
        ui.showToast("Power Pole needs more energy!", 1200);
      }
    }

    // --- gravity / landing ---
    if (!player.grounded) {
      player.vy -= GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        player.grounded = true;
        player.jumps = 0;
        sound.land();
        fx.dustPuff(player.worldPos, 8, 1);
        camState.shake = Math.max(camState.shake, 0.1);
      }
    }

    // --- stamina regen ---
    player.staminaDelay = Math.max(0, player.staminaDelay - dt);
    if (player.staminaDelay <= 0) {
      const regen = player.grounded ? 22 : 10;
      player.stamina = Math.min(100, player.stamina + regen * dt);
    }
    player.noStaminaMsg = Math.max(0, player.noStaminaMsg - dt);

    // --- invulnerability ---
    player.invuln = Math.max(0, player.invuln - dt);
    goku.setInvulnerable(player.invuln);

    // --- world position / facing ---
    GamePath.point(player.s, player.lateral, player.y, player.worldPos);
    const strafeYaw =
      -Math.atan2(player.lateralVel, Math.max(8, player.speed)) * 0.62;
    player.heading = GamePath.heading(player.s) + strafeYaw;

    goku.setPosition(player.worldPos);
    goku.setHeading(player.heading);
    goku.update(dt, gameTime, {
      mode: "run",
      speed: player.speed,
      grounded: player.grounded,
      strafe: player.lateralVel / 7.4,
      vy: player.vy,
    });

    // --- running dust ---
    if (player.grounded) {
      if (player.dustTimer <= 0) {
        fx.runTrail(player.worldPos, player.speed / 20);
        player.dustTimer = 0.075;
      } else {
        player.dustTimer -= dt;
      }
    }

    // --- levels ---
    const levelFloat = player.s / LEVEL_LENGTH;
    const newLevel = Math.floor(levelFloat) + 1;
    if (newLevel > player.level) {
      player.level = newLevel;
      player.stamina = 100;
      player.staminaDelay = 0;
      player.speedPenalty = 0;
      ui.levelUp(newLevel);
      ui.showToast(`LEVEL ${newLevel}! The canyon speeds up.`, 1900);
      sound.levelUp();
      camState.fovPunch = 3;
    }
    player.levelProgress = levelFloat - Math.floor(levelFloat);

    updateHUD();
  }

  function updateDying(dt) {
    player.deathTimer -= dt;
    player.s += player.speed * dt;
    player.speed *= Math.pow(0.04, dt);
    player.lateralVel *= Math.pow(0.02, dt);
    player.lateral += player.lateralVel * dt;
    if (player.y > 0) {
      player.vy -= GRAVITY * dt;
      player.y = Math.max(0, player.y + player.vy * dt);
    }

    GamePath.point(player.s, player.lateral, player.y, player.worldPos);
    player.heading = GamePath.heading(player.s);
    goku.setPosition(player.worldPos);
    goku.setHeading(player.heading);
    goku.update(dt, gameTime, {
      mode: "run",
      speed: 0,
      grounded: true,
      strafe: 0,
      vy: 0,
    });

    updateHUD();

    if (player.deathTimer <= 0) {
      finalizeGameOver();
    }
  }

  function updateHUD() {
    player.score = Math.floor(
      player.s * 10 + entities.ballsCollected * 1000 + player.dodgeBonus
    );
    if (player.score !== lastScore) {
      lastScore = player.score;
      ui.updateScore(player.score);
    }
    ui.updateStamina(player.stamina);
    ui.updateLevel(player.level, player.levelProgress);
  }

  /* ---------------------------------------------------------
     UPDATE — WIN / OVER
     --------------------------------------------------------- */

  function updateWin(dt) {
    winTimer += dt;

    if (!shenronSummoned && winTimer >= 0.9) {
      shenronSummoned = true;
      const center = GamePath.point(player.s + 62, 0, 0);
      entities.summonShenron(center);
      ui.setShenronSky(true);
      ui.comic("신룡!", "SHENRON AWAKENS!", true);
      camState.shake = Math.max(camState.shake, 0.35);
    }

    if (!winOverlayShown && winTimer >= 3.5) {
      winOverlayShown = true;
      bestScore = Math.max(bestScore, player.score);
      saveBest(bestScore);
      ui.setStartBest(bestScore);
      ui.setVictory(player.score, bestScore);
      ui.showScreen("win");
      ui.setHUDVisible(false);
      ui.hideToast();
    }

    GamePath.point(player.s, player.lateral, player.y, player.worldPos);
    goku.setPosition(player.worldPos);
    goku.setHeading(player.heading);
    goku.update(dt, gameTime, { mode: "idle", speed: 0, grounded: true });

    entities.updateShenron(dt, gameTime);
  }

  function updateOver(dt) {
    overTimer += dt;
    GamePath.point(player.s, player.lateral, player.y, player.worldPos);
    goku.setPosition(player.worldPos);
    goku.setHeading(player.heading);
    goku.update(dt, gameTime, { mode: "run", speed: 0, grounded: true });
  }

  function triggerWin() {
    if (state !== STATE.PLAYING || player.win || player.dying) return;

    state = STATE.WIN;
    player.win = true;
    player.invuln = 999;
    player.speed = 0;
    player.lateralVel = 0;
    player.score = Math.floor(
      player.s * 10 + entities.ballsCollected * 1000 + player.dodgeBonus
    );
    lastScore = player.score;

    winTimer = 0;
    winOverlayShown = false;
    shenronSummoned = false;
    clearInput();

    ui.updateScore(player.score);
    ui.updateBalls(7, true);
    ui.showPortrait("YOSH!");
    ui.showToast("ALL 7 DRAGON BALLS!", 2400);
    ui.flashWhite(480);
    document.querySelectorAll(".level-up-banner").forEach((el) => el.remove());

    goku.celebratePose();
    sound.victory();
    camState.shake = Math.max(camState.shake, 0.4);

    GamePath.point(player.s, player.lateral, player.y, player.worldPos);
    goku.setPosition(player.worldPos);
    goku.setHeading(player.heading);
  }

  function triggerDying() {
    if (player.dying || state !== STATE.PLAYING) return;

    player.dying = true;
    player.deathTimer = 1.55;
    player.invuln = 0;
    player.speed = 0;
    player.lateralVel = 0;
    player.win = false;

    clearInput();
    goku.setInvulnerable(0);
    goku.die();
    sound.gameOver();
    ui.flashDamage();
    ui.showToast("GOKU IS DOWN!", 1500);
    camState.shake = 1.4;
  }

  function finalizeGameOver() {
    if (state !== STATE.PLAYING) return;

    state = STATE.OVER;
    overTimer = 0;
    player.dying = false;
    player.speed = 0;
    player.score = Math.floor(
      player.s * 10 + entities.ballsCollected * 1000 + player.dodgeBonus
    );

    bestScore = Math.max(bestScore, player.score);
    saveBest(bestScore);
    ui.setStartBest(bestScore);
    ui.setGameOver(player.score, entities.ballsCollected);
    ui.showScreen("over");
    ui.setHUDVisible(false);
    ui.hideToast();
    ui.hidePortrait();
  }

  /* ---------------------------------------------------------
     ENTITY CALLBACKS
     --------------------------------------------------------- */

  function handleCollect(ball, count) {
    if (state !== STATE.PLAYING) return;

    const tags = ["GOKU!", "NICE!", "YOSH!", "BAM!", "GOT IT!", "ALRIGHT!"];
    const korean = ["빠밤!", "좋아!", "받아라!", "하나 더!", "굿!"];
    ui.showPortrait(tags[(count - 1) % tags.length]);
    ui.comic(
      korean[Math.floor(Math.random() * korean.length)],
      `DRAGON BALL ${count}/7`,
      count % 3 === 0
    );
    ui.updateBalls(count, true);
    ui.showToast(`Dragon Ball ${count}/7 secured!`, 1600);
    player.stamina = Math.min(100, player.stamina + 15);
    player.score = Math.floor(
      player.s * 10 + count * 1000 + player.dodgeBonus
    );
    lastScore = player.score;
    ui.updateScore(player.score);
    camState.fovPunch = Math.max(camState.fovPunch, 2.2);

    if (count >= 7) {
      triggerWin();
    }
  }

  function handleMiss(ball) {
    if (state !== STATE.PLAYING) return;
    sound.miss();
    ui.comic("앗!", "MISSED! THE RADAR FOUND IT AHEAD", true);
    ui.showToast("Missed! The radar found it farther down the canyon.", 2200);
  }

  function handleHit(obstacle) {
    if (state !== STATE.PLAYING || player.dying || player.win) return;
    if (player.invuln > 0) return;

    player.hearts = Math.max(0, player.hearts - 1);
    player.invuln = 1.55;
    player.speedPenalty = 0.8;
    ui.updateHearts(player.hearts, true);
    ui.flashDamage();
    ui.comic("엥!", "OUCH!", true);
    camState.shake = Math.max(camState.shake, 0.85);

    if (player.hearts <= 0) {
      triggerDying();
    }
  }

  function handleDodge(obstacle) {
    if (state !== STATE.PLAYING) return;
    player.dodgeBonus += 25;
  }

  /* ---------------------------------------------------------
     CAMERA
     --------------------------------------------------------- */

  function updateCamera(dt, forceSnap = false) {
    if (state === STATE.PAUSED) return;

    let desiredPos;
    let desiredLook;
    let followSpeed = 6;
    let fovTarget = 62;

    if (state === STATE.MENU) {
      const sway = Math.sin(gameTime * 0.14) * 0.55;
      desiredPos = GamePath.point(MENU_S - 9.6, -6 + sway, 4.3, tmpVec);
      desiredLook = GamePath.point(MENU_S + 20, 0, 1.5, tmpVec2);
      followSpeed = 2.2;
      fovTarget = 62;
    } else if (state === STATE.WIN) {
      const head = entities.getShenronHeadPosition();
      const orbit = winTimer * 0.18;
      desiredPos = tmpVec.set(
        player.worldPos.x + Math.sin(orbit) * 11.5,
        7.4,
        player.worldPos.z + Math.cos(orbit) * 11.5
      );
      desiredLook = tmpVec2.copy(head);
      if (head.lengthSq() < 1) {
        desiredLook.copy(player.worldPos).add(tmpVec3.set(0, 8, -30));
      }
      desiredLook.y = Math.max(desiredLook.y, 8);
      followSpeed = 1.8;
      fovTarget = 64;
    } else {
      // gameplay follow / game-over camera
      const back = state === STATE.OVER ? 8.4 : 7.1;
      const height = state === STATE.OVER ? 3.8 : 3.05 + player.y * 0.18;
      const camLat = player.lateral * 0.52;
      desiredPos = GamePath.point(player.s - back, camLat, height, tmpVec);
      desiredLook = GamePath.point(
        player.s + (state === STATE.OVER ? 4 : 9.5),
        player.lateral * 0.84,
        1.2 + player.y * 0.32,
        tmpVec2
      );
      followSpeed = state === STATE.OVER ? 2.6 : 7.5;
      const speedT = GamePath.clamp(
        (player.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED),
        0,
        1
      );
      fovTarget = 62 + speedT * 3.2;
    }

    if (forceSnap || camState.snap) {
      camState.pos.copy(desiredPos);
      camState.look.copy(desiredLook);
      camState.fov = fovTarget;
      camState.snap = false;
    } else {
      const posEase = 1 - Math.exp(-dt * followSpeed);
      const lookEase = 1 - Math.exp(-dt * (followSpeed + 2));
      camState.pos.lerp(desiredPos, posEase);
      camState.look.lerp(desiredLook, lookEase);
      camState.fov += (fovTarget - camState.fov) * Math.min(1, dt * 4);
    }

    camState.fovPunch *= Math.exp(-dt * 3.2);
    const punch = camState.fovPunch;
    camera.fov = camState.fov + punch;
    camera.updateProjectionMatrix();

    camera.position.copy(camState.pos);
    camera.lookAt(camState.look);

    camState.shake *= Math.exp(-dt * 6.5);
    if (camState.shake > 0.001) {
      const s = camState.shake;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s * 0.6;
      camera.position.z += (Math.random() - 0.5) * s;
    }
  }

  /* ---------------------------------------------------------
     PAUSE / MUTE / RESTART
     --------------------------------------------------------- */

  function togglePause() {
    if (state === STATE.PLAYING && !player.dying) {
      state = STATE.PAUSED;
      clearInput();
      ui.setSoundLabel(sound.muted);
      ui.showScreen("pause");
      return;
    }

    if (state === STATE.PAUSED) {
      state = STATE.PLAYING;
      clearInput();
      lastFrame = performance.now();
      ui.showScreen(null);
      sound.resume();
    }
  }

  function toggleMute() {
    sound.init();
    sound.resume();
    const muted = sound.toggleMute();
    ui.setSoundLabel(muted);
    if (state === STATE.PAUSED) {
      ui.showToast(muted ? "Sound muted" : "Sound on", 1200);
    }
  }

  function clearInput() {
    input.left = false;
    input.right = false;
    input.jumpQueued = false;
    document.querySelectorAll(".touch-btn.held").forEach((b) => {
      b.classList.remove("held");
    });
  }

  /* ---------------------------------------------------------
     INPUT / EVENTS
     --------------------------------------------------------- */

  function bindEvents() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibility);

    document.getElementById("start-btn").addEventListener("click", () => {
      startRun();
    });
    document.getElementById("pause-btn").addEventListener("click", () => {
      sound.init();
      sound.resume();
      togglePause();
    });
    document.getElementById("resume-btn").addEventListener("click", () => {
      sound.init();
      sound.resume();
      sound.click();
      togglePause();
    });
    document.getElementById("restart-btn").addEventListener("click", () => {
      sound.init();
      sound.resume();
      sound.click();
      restartRun();
    });
    document.getElementById("retry-btn").addEventListener("click", () => {
      sound.init();
      sound.resume();
      sound.click();
      restartRun();
    });
    document.getElementById("again-btn").addEventListener("click", () => {
      sound.init();
      sound.resume();
      sound.click();
      restartRun();
    });
    document.getElementById("sound-btn").addEventListener("click", () => {
      toggleMute();
    });

    bindTouchControls();
  }

  function onKeyDown(e) {
    const code = e.code;

    if (
      code === "Space" ||
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "ArrowLeft" ||
      code === "ArrowRight" ||
      code === "KeyW" ||
      code === "KeyA" ||
      code === "KeyS" ||
      code === "KeyD"
    ) {
      e.preventDefault();
    }

    if (code === "KeyM") {
      toggleMute();
      return;
    }

    if (code === "KeyP" || code === "Escape") {
      if (state === STATE.PLAYING || state === STATE.PAUSED) {
        e.preventDefault();
        togglePause();
      }
      return;
    }

    if (state === STATE.MENU) {
      if (code === "Space" || code === "Enter" || code === "NumpadEnter") {
        e.preventDefault();
        startRun();
      }
      return;
    }

    if (state === STATE.PLAYING) {
      if (code === "ArrowLeft" || code === "KeyA") input.left = true;
      if (code === "ArrowRight" || code === "KeyD") input.right = true;
      if (
        (code === "Space" || code === "ArrowUp" || code === "KeyW") &&
        !e.repeat
      ) {
        input.jumpQueued = true;
      }
      return;
    }

    if (state === STATE.OVER) {
      if (code === "Space" || code === "Enter" || code === "NumpadEnter") {
        e.preventDefault();
        startRun();
      }
      return;
    }

    if (state === STATE.WIN && winOverlayShown) {
      if (code === "Space" || code === "Enter" || code === "NumpadEnter") {
        e.preventDefault();
        startRun();
      }
    }
  }

  function onKeyUp(e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
  }

  function onVisibility() {
    if (document.hidden && state === STATE.PLAYING && !player.dying) {
      togglePause();
    }
  }

  function bindTouchControls() {
    document.querySelectorAll("[data-touch]").forEach((btn) => {
      const key = btn.dataset.touch;
      if (key !== "left" && key !== "right") return;

      const down = (e) => {
        e.preventDefault();
        if (state !== STATE.PLAYING) return;
        input[key] = true;
        btn.classList.add("held");
        if (btn.setPointerCapture && e.pointerId !== undefined) {
          try {
            btn.setPointerCapture(e.pointerId);
          } catch (_) {
            /* ignore */
          }
        }
      };
      const up = (e) => {
        if (e) e.preventDefault();
        input[key] = false;
        btn.classList.remove("held");
      };

      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
      btn.addEventListener("pointerleave", up);
      btn.addEventListener("contextmenu", (e) => e.preventDefault());
    });

    const jump = document.getElementById("touch-jump");
    if (jump) {
      jump.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (state === STATE.MENU) {
          startRun();
        } else if (state === STATE.PLAYING) {
          input.jumpQueued = true;
        } else if (state === STATE.OVER) {
          startRun();
        } else if (state === STATE.WIN && winOverlayShown) {
          startRun();
        }
      });
      jump.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  }

  /* ---------------------------------------------------------
     RESIZE / STORAGE
     --------------------------------------------------------- */

  function onResize() {
    if (!renderer || !camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    if (fx) fx.setScale(renderer.domElement.height);
  }

  function loadBest() {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      const n = parseInt(raw || "0", 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (_) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(BEST_KEY, String(Math.floor(value)));
    } catch (_) {
      /* private mode / file restrictions — score still shows this session */
    }
  }

  /* ---------------------------------------------------------
     GO
     --------------------------------------------------------- */

  // Optional debug handle for manual testing and tuning: ?debug=1
  if (new URLSearchParams(window.location.search).has("debug")) {
    window.__DBR__ = {
      get state() {
        return state;
      },
      get player() {
        return player;
      },
      get entities() {
        return entities;
      },
      get world() {
        return world;
      },
      get goku() {
        return goku;
      },
      get camera() {
        return camera;
      },
      get scene() {
        return scene;
      },
      startRun,
      restartRun,
      triggerWin,
      triggerDying,
      finalizeGameOver,
      togglePause,
      setPlayerS(s) {
        player.s = s;
        GamePath.point(player.s, player.lateral, player.y, player.worldPos);
        goku.setPosition(player.worldPos);
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
