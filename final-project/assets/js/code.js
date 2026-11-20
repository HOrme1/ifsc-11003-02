function startCountdown(targetTime, titleText, isCountdown = true) {
  const timerDisplay = document.getElementById('timer-display');
  const titleDisplay = document.getElementById('timer-title');

  if (!timerDisplay) {
    return;
  }

  if (titleDisplay && titleText) {
    titleDisplay.textContent = titleText;
  }

  const updateTimer = () => {
    const now = new Date();
    const diff = isCountdown ? targetTime - now : now - targetTime;

    if (diff <= 0 && isCountdown) {
      timerDisplay.textContent = 'Liftoff or in window!';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    timerDisplay.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  updateTimer();
  setInterval(updateTimer, 1000);
}

function startSampleCountdown() {
  const sampleTarget = new Date(Date.now() + (17 * 24 * 60 * 60 * 1000) + (7 * 60 * 60 * 1000) + (57 * 60 * 1000) + (37 * 1000));
  startCountdown(sampleTarget, 'Next Launch: Sample Starship Mission', true);
}

async function initStarshipTimer() {
  const timerDisplay = document.getElementById('timer-display');

  if (!timerDisplay) {
    return;
  }

  if (location.protocol === 'file:') {
    startSampleCountdown();
    return;
  }

  try {
    const upcomingRes = await fetch('https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?search=Starship');

    if (!upcomingRes.ok) {
      throw new Error(`Upcoming launch request failed with status ${upcomingRes.status}`);
    }

    const upcomingData = await upcomingRes.json();
    const nextLaunch = upcomingData.results?.[0];

    if (nextLaunch && new Date(nextLaunch.net) > new Date()) {
      startCountdown(new Date(nextLaunch.net), `Next Launch: ${nextLaunch.name}`, true);
      return;
    }

    const prevRes = await fetch('https://lldev.thespacedevs.com/2.3.0/launches/previous/?search=Starship');

    if (!prevRes.ok) {
      throw new Error(`Previous launch request failed with status ${prevRes.status}`);
    }

    const prevData = await prevRes.json();
    const lastLaunch = prevData.results?.[0];

    if (!lastLaunch) {
      timerDisplay.textContent = 'Launch data unavailable.';
      return;
    }

    startCountdown(new Date(lastLaunch.net), `Time Since Last Launch (${lastLaunch.name})`, false);
  } catch (error) {
    console.warn('Falling back to sample launch data because the live API could not be reached:', error);
    startSampleCountdown();
  }
}

initStarshipTimer();

const launchToTop = document.querySelector('.launch-to-top');

if (launchToTop) {
  const scene = launchToTop.querySelector('.launch-scene');
  const padEffects = launchToTop.querySelector('.pad-effects');
  const arms = launchToTop.querySelector('.mechazilla-arms');
  const starship = launchToTop.querySelector('.launch-starship');
  const booster = launchToTop.querySelector('.landing-booster');
  const ship = launchToTop.querySelector('.landing-ship');
  const starshipFlame = starship.querySelector('.engine-flame');
  const boosterFlame = booster.querySelector('.engine-flame');
  const shipFlame = ship.querySelector('.engine-flame');
  const reentryGlow = ship.querySelector('.reentry-glow');
  const launchSky = document.querySelector('.launch-sky');
  const cloudBack = launchSky.querySelector('.cloud-deck-back');
  const cloudFront = launchSky.querySelector('.cloud-deck-front');
  const cloudGlow = launchSky.querySelector('.cloud-glow');

  const SPRITE_PX = 126 / 128;
  const TOWER_PX = 164 / 128;
  const TOWER_CANVAS_BOTTOM = -59 + 20.5;
  const TOWER_LIFT = 12 * TOWER_PX;
  const GROUND_Y = TOWER_CANVAS_BOTTOM + (42 * TOWER_PX);
  const PAD_TOP_Y = GROUND_Y + (6 * TOWER_PX);
  const VEHICLE_TOP = PAD_TOP_Y + (101 * SPRITE_PX);
  const ARMS_TOP_Y = TOWER_CANVAS_BOTTOM + TOWER_LIFT + (86 * TOWER_PX);
  const ENGINE_X = ((180 - 126) / 2) + (59.5 * SPRITE_PX);
  const STACK_NOSE_Y = VEHICLE_TOP - (25 * SPRITE_PX);
  const BOOSTER_ENGINE_Y = PAD_TOP_Y;
  const SHIP_ENGINE_Y = VEHICLE_TOP - (59 * SPRITE_PX);
  const SHIP_CENTER_Y = VEHICLE_TOP - (42 * SPRITE_PX);
  const FLAME_LENGTH = 60;
  const PLUME_CLEARANCE = 160;
  const DELUGE_LEAD = 450;
  const LIFTOFF_DELAY = 160;
  const BOOSTER_CATCH_HEIGHT = ARMS_TOP_Y - (VEHICLE_TOP - (61 * SPRITE_PX));
  const SHIP_CATCH_HEIGHT = 20;
  const SHOW_AFTER_SCROLL = 300;

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const randomBetween = (min, max) => min + (Math.random() * (max - min));

  const linear = (t) => t;
  const easeOut = (t) => 1 - ((1 - t) ** 2);
  const easeOutCubic = (t) => 1 - ((1 - t) ** 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * (t ** 3) : 1 - (((2 - (2 * t)) ** 3) / 2));

  const sampleTrack = (track, time) => {
    if (time <= track[0][0]) {
      return track[0][1];
    }

    for (let index = 1; index < track.length; index += 1) {
      const [endTime, endValue, easing = easeInOut] = track[index];

      if (time < endTime) {
        const [startTime, startValue] = track[index - 1];
        const progress = (time - startTime) / (endTime - startTime);
        return startValue + ((endValue - startValue) * easing(progress));
      }
    }

    return track[track.length - 1][1];
  };

  const setFlame = (flame, width, length) => {
    flame.style.transform = `scale(${width}, ${length})`;
    flame.style.opacity = Math.min(1, length * 5);
  };

  const resetFlame = (flame) => {
    flame.style.removeProperty('transform');
    flame.style.removeProperty('opacity');
  };

  const spawnPuff = ({ x, y, size, stretch = 1, driftX, driftY, duration, grow = [0.35, 1.15], tone = '' }) => {
    const puff = document.createElement('span');
    const width = size * stretch;
    puff.className = `exhaust-puff ${tone}`.trim();
    puff.style.left = `${x - (width / 2)}px`;
    puff.style.bottom = `${y - (size / 2)}px`;
    puff.style.width = `${width}px`;
    puff.style.height = `${size}px`;
    padEffects.append(puff);

    const animation = puff.animate([
      { transform: `scale(${grow[0]})`, opacity: 1 },
      { transform: `translate(${driftX}px, ${-driftY}px) scale(${grow[1]})`, opacity: 0 },
    ], { duration, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });

    animation.onfinish = () => puff.remove();
  };

  const spawnGroundCloud = (x, scale) => {
    const side = Math.random() < 0.5 ? -1 : 1;

    spawnPuff({
      x: x + (side * randomBetween(0, 5)),
      y: GROUND_Y + randomBetween(-3, 4),
      size: randomBetween(12, 24) * scale,
      driftX: side * randomBetween(24, 66) * scale,
      driftY: randomBetween(2, 16),
      duration: randomBetween(1100, 1800),
      tone: Math.random() < 0.3 ? 'is-hot' : '',
    });
  };

  const spawnSmokeBurst = (x, y, count) => {
    for (let index = 0; index < count; index += 1) {
      spawnPuff({
        x: x + randomBetween(-5, 5),
        y: y + randomBetween(-4, 3),
        size: randomBetween(9, 18),
        driftX: randomBetween(-16, 16),
        driftY: randomBetween(8, 24),
        duration: randomBetween(900, 1500),
        tone: index < count / 3 ? 'is-hot' : '',
      });
    }
  };

  const spawnWaterDrop = (side) => {
    const drop = document.createElement('span');
    const reach = side * randomBetween(6, 34);
    const peak = randomBetween(8, 30);
    drop.className = 'water-drop';
    drop.style.left = `${ENGINE_X + (side * randomBetween(1, 7))}px`;
    drop.style.bottom = `${PAD_TOP_Y + randomBetween(-2, 1)}px`;
    padEffects.append(drop);

    const animation = drop.animate([
      { transform: 'translate(0, 0)', opacity: 1, easing: 'cubic-bezier(0.3, 0.7, 0.6, 1)' },
      { transform: `translate(${reach * 0.55}px, ${-peak}px)`, opacity: 0.9, offset: 0.45, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
      { transform: `translate(${reach}px, ${PAD_TOP_Y - GROUND_Y}px)`, opacity: 0 },
    ], { duration: randomBetween(550, 900) });

    animation.onfinish = () => drop.remove();
  };

  const spawnWaterJet = (side) => {
    spawnPuff({
      x: ENGINE_X + (side * randomBetween(3, 8)),
      y: PAD_TOP_Y + randomBetween(-1, 2),
      size: randomBetween(8, 16),
      stretch: randomBetween(0.25, 0.4),
      driftX: side * randomBetween(2, 10),
      driftY: randomBetween(10, 26),
      duration: randomBetween(380, 650),
      grow: [0.4, 1.4],
      tone: 'is-water',
    });
  };

  const spawnWaterMist = (side) => {
    spawnPuff({
      x: ENGINE_X + (side * randomBetween(2, 16)),
      y: GROUND_Y + randomBetween(0, 9),
      size: randomBetween(12, 24),
      driftX: side * randomBetween(8, 30),
      driftY: randomBetween(4, 16),
      duration: randomBetween(900, 1500),
      tone: 'is-water',
    });
  };

  const spawnIgnitionBurst = () => {
    for (let index = 0; index < 16; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;

      spawnPuff({
        x: ENGINE_X + (side * randomBetween(0, 6)),
        y: GROUND_Y + randomBetween(0, 8),
        size: randomBetween(14, 30),
        driftX: side * randomBetween(20, 70),
        driftY: randomBetween(4, 24),
        duration: randomBetween(700, 1200),
        grow: [0.3, 1.6],
        tone: index < 8 ? 'is-hot' : '',
      });
    }
  };

  const spawnSteamJet = (side, heat, strength) => {
    spawnPuff({
      x: ENGINE_X + (side * randomBetween(3, 8)),
      y: GROUND_Y + randomBetween(1, 5),
      size: randomBetween(7, 12) * (0.6 + (0.4 * strength)),
      stretch: randomBetween(2, 3),
      driftX: side * randomBetween(80, 170) * (0.5 + (0.5 * strength)),
      driftY: randomBetween(0, 14),
      duration: randomBetween(500, 850),
      grow: [0.5, 2.6],
      tone: Math.random() < heat ? 'is-hot' : '',
    });
  };

  const spawnSteamBillow = (side, age) => {
    const spread = 1 + (age / 1600);

    spawnPuff({
      x: ENGINE_X + (side * randomBetween(18, 110) * spread),
      y: GROUND_Y + randomBetween(0, 14),
      size: randomBetween(26, 56) * spread,
      driftX: side * randomBetween(10, 45),
      driftY: randomBetween(14, 46),
      duration: randomBetween(2000, 3200),
      grow: [0.4, 1.5],
    });
  };

  const placeVehicle = (vehicle, x, altitude, rotation) => {
    vehicle.style.transform = `translate(calc(-50% + ${x}px), ${-altitude}px) rotate(${rotation}deg)`;
  };

  let cloudPuffs = [];
  let cloudSplits = [];
  let cloudFrame = null;
  let cloudsFadeUntil = 0;
  let deckWidth = 0;
  let deckHeight = 0;
  let glowLevel = 0;
  let glowTarget = { x: 0, y: 0, level: 0, plasma: false };

  const buildClouds = () => {
    deckWidth = window.innerWidth;
    deckHeight = Math.min(190, window.innerHeight * 0.26);
    cloudPuffs = [];

    [
      { layer: cloudBack, depth: 0.9, rows: [[-0.3, 90, 170, 290, 0.12, 'is-mid'], [0.3, 120, 130, 230, 0.2, 'is-dark']] },
      {
        layer: cloudFront,
        depth: 1.2,
        rows: [[-0.05, 80, 120, 210, 0.12, 'is-light'], [0.45, 110, 85, 175, 0.22, 'is-mid'], [0.78, 160, 45, 100, 0.18, 'is-mid']],
      },
    ].forEach(({ layer, depth, rows }) => {
      layer.replaceChildren();

      rows.forEach(([row, spacing, minSize, maxSize, jitter, tone]) => {
        for (let x = -220; x < deckWidth + 220; x += spacing * randomBetween(0.6, 1.4)) {
          const height = randomBetween(minSize, maxSize);
          const width = height * randomBetween(1.15, 1.9);
          const y = deckHeight * (row + randomBetween(-jitter, jitter));
          const element = document.createElement('span');
          element.className = `cloud-puff ${tone}`;
          element.style.left = `${x - (width / 2)}px`;
          element.style.top = `${y - (height / 2)}px`;
          element.style.width = `${width}px`;
          element.style.height = `${height}px`;
          layer.append(element);
          cloudPuffs.push({ element, x, depth, density: randomBetween(0.8, 1), phase: randomBetween(0, Math.PI * 2) });
        }
      });
    });
  };

  const cloudProximity = (y) => Math.max(0, Math.min(1, 1 - ((y - deckHeight) / 260)));

  const renderClouds = (now) => {
    cloudPuffs.forEach((puff) => {
      let dx = Math.sin((now / 2600) + puff.phase) * 6 * puff.depth;
      let dy = Math.cos((now / 2100) + puff.phase) * 3;
      let scale = 1;
      let opacity = puff.density;

      cloudSplits.forEach((split) => {
        const spread = sampleTrack(split.amount, now);
        const bulge = sampleTrack(split.amount, now + 180);
        const distance = puff.x - split.x;
        const reach = Math.exp(-((distance / split.reach) ** 2));
        dx += (distance < 0 ? -1 : 1) * spread * split.spread * reach * puff.depth;
        dy += bulge * split.push * reach * puff.depth;
        scale += spread * 0.35 * reach;
        opacity -= spread * 0.85 * Math.exp(-((distance / (split.reach * 0.5)) ** 2));
      });

      puff.element.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      puff.element.style.opacity = Math.max(0, opacity);
    });

    glowLevel += (glowTarget.level - glowLevel) * 0.18;
    const glowY = Math.max(deckHeight * 0.3, Math.min(glowTarget.y, deckHeight));
    cloudGlow.style.opacity = glowLevel;
    cloudGlow.style.transform = `translate(${glowTarget.x - 180}px, ${glowY - 130}px)`;
    cloudGlow.classList.toggle('is-plasma', glowTarget.plasma);
  };

  const animateClouds = (now) => {
    renderClouds(now);
    cloudSplits = cloudSplits.filter((split) => now < split.amount[split.amount.length - 1][0]);

    if (launchSky.classList.contains('is-active') || now < cloudsFadeUntil) {
      cloudFrame = window.requestAnimationFrame(animateClouds);
    } else {
      cloudFrame = null;
    }
  };

  const runClouds = () => {
    if (cloudFrame === null) {
      cloudFrame = window.requestAnimationFrame(animateClouds);
    }
  };

  const showClouds = () => {
    if (!launchSky.classList.contains('is-active') && performance.now() >= cloudsFadeUntil) {
      cloudSplits = [];
      glowLevel = 0;
      glowTarget = { x: 0, y: 0, level: 0, plasma: false };

      if (cloudPuffs.length === 0 || deckWidth !== window.innerWidth) {
        buildClouds();
      }
    }

    launchSky.classList.add('is-active');
    runClouds();
  };

  const hideClouds = () => {
    if (!launchSky.classList.contains('is-active')) {
      return;
    }

    launchSky.classList.remove('is-active');
    glowTarget.level = 0;
    cloudsFadeUntil = performance.now() + 1000;
    runClouds();
  };

  const lightClouds = (x, y, level, plasma = false) => {
    if (launchSky.classList.contains('is-active')) {
      glowTarget = { x, y, level, plasma };
    }
  };

  const spawnWisps = (x, push) => {
    for (let index = 0; index < 14; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const height = randomBetween(26, 56);
      const wisp = document.createElement('span');
      wisp.className = 'cloud-wisp';
      wisp.style.left = `${x - height}px`;
      wisp.style.top = `${(deckHeight * randomBetween(0.2, 0.75)) - (height / 2)}px`;
      wisp.style.width = `${height * 2}px`;
      wisp.style.height = `${height}px`;
      cloudFront.append(wisp);

      const animation = wisp.animate([
        { transform: 'translate(0, 0) scale(0.5)', opacity: 0 },
        { transform: `translate(${side * randomBetween(15, 40)}px, ${push * 0.4}px) scale(0.9)`, opacity: 0.9, offset: 0.2 },
        { transform: `translate(${side * randomBetween(90, 220)}px, ${push * randomBetween(1.2, 2.6)}px) scale(1.7)`, opacity: 0 },
      ], {
        duration: randomBetween(1300, 2300),
        delay: randomBetween(0, 350),
        easing: 'cubic-bezier(0.25, 0.6, 0.3, 1)',
        fill: 'backwards',
      });

      animation.onfinish = () => wisp.remove();
    }
  };

  const splitClouds = ({ x, push, spread, reach, open, hold, close }) => {
    const start = performance.now();
    cloudSplits.push({
      x,
      push,
      spread,
      reach,
      amount: [[start, 0], [start + open, 1, easeOutCubic], [start + open + hold, 1], [start + open + hold + close, 0]],
    });
    spawnWisps(x, push);
    runClouds();
  };

  const createLandingScript = (viewportHeight) => {
    const sky = viewportHeight + 60;
    const boosterStart = 500;
    const boosterIgnition = boosterStart + 640;
    const boosterCatch = boosterStart + 2900;
    const boosterSetDown = boosterCatch + 2100;
    const shipEnter = boosterStart + 3100;
    const shipFlip = boosterStart + 4700;
    const shipCatch = boosterStart + 6400;

    return {
      boosterCatch,
      boosterSetDown,
      shipCatch,
      boosterClouds: { at: boosterStart - 300, pass: boosterStart + 450 },
      shipClouds: { at: shipEnter + 100, pass: shipEnter + 750 },
      cloudsClear: shipFlip + 400,
      end: shipCatch + 2000,
      padDrop: [[0, viewportHeight + 205], [900, 0, easeOutCubic]],
      arms: [
        [boosterCatch, 0],
        [boosterCatch + 110, -2.5, easeOut],
        [boosterCatch + 450, 0],
        [boosterCatch + 750, 0],
        [boosterCatch + 1850, -BOOSTER_CATCH_HEIGHT],
        [boosterSetDown, -BOOSTER_CATCH_HEIGHT],
        [shipCatch - 700, SHIP_CATCH_HEIGHT],
        [shipCatch, SHIP_CATCH_HEIGHT],
        [shipCatch + 110, SHIP_CATCH_HEIGHT - 2, easeOut],
        [shipCatch + 450, SHIP_CATCH_HEIGHT],
        [shipCatch + 700, SHIP_CATCH_HEIGHT],
        [shipCatch + 1850, 0],
      ],
      booster: {
        altitude: [
          [boosterStart, sky + 80],
          [boosterStart + 700, viewportHeight * 0.62, linear],
          [boosterCatch, BOOSTER_CATCH_HEIGHT, easeOutCubic],
        ],
        x: [[boosterStart, 46], [boosterStart + 900, 42, linear], [boosterCatch - 450, 0]],
        tilt: [
          [boosterStart, 3],
          [boosterStart + 700, 1],
          [boosterStart + 1150, -6],
          [boosterStart + 1650, 0],
          [boosterStart + 2100, 5],
          [boosterCatch - 250, 0],
        ],
        engines: [[boosterStart + 1650, 0.72], [boosterStart + 1800, 0.42]],
        thrust: [
          [boosterIgnition, 0],
          [boosterIgnition + 80, 1.05, easeOut],
          [boosterStart + 900, 0.85],
          [boosterStart + 1650, 0.85],
          [boosterStart + 1800, 0.52],
          [boosterCatch, 0.42],
          [boosterCatch + 120, 0, linear],
          [boosterCatch + 260, 0.16],
          [boosterCatch + 1100, 0, linear],
        ],
      },
      ship: {
        altitude: [
          [shipEnter, sky + 40],
          [shipFlip, viewportHeight * 0.36, linear],
          [shipCatch, SHIP_CATCH_HEIGHT, easeOutCubic],
        ],
        x: [[shipEnter, 64], [shipFlip, 34, linear], [shipCatch - 450, 0]],
        rotation: [[shipFlip, -90], [shipFlip + 650, 14], [shipFlip + 1000, -4], [shipFlip + 1300, 0]],
        wobble: [[shipFlip, 2.5], [shipFlip + 300, 0]],
        thrust: [
          [shipFlip - 60, 0],
          [shipFlip + 40, 0.8, easeOut],
          [shipFlip + 300, 0.6],
          [shipCatch - 300, 0.42],
          [shipCatch, 0.36],
          [shipCatch + 120, 0, linear],
        ],
        plasma: [[shipEnter, 0], [shipEnter + 200, 1, linear], [shipEnter + 500, 1], [shipEnter + 1300, 0]],
      },
    };
  };

  let landing = null;

  const runOnce = (name, effect) => {
    if (!landing.done.has(name)) {
      landing.done.add(name);
      effect();
    }
  };

  const renderLanding = (time) => {
    const { script } = landing;

    scene.style.setProperty('--pad-drop', `${sampleTrack(script.padDrop, time)}px`);

    const armsHeight = sampleTrack(script.arms, time);
    arms.style.transform = `translate(-50%, ${-armsHeight}px)`;

    let boosterAltitude = sampleTrack(script.booster.altitude, time);

    if (time >= script.boosterSetDown) {
      boosterAltitude = 0;
    } else if (time >= script.boosterCatch) {
      boosterAltitude = armsHeight + BOOSTER_CATCH_HEIGHT;
    }

    const boosterX = sampleTrack(script.booster.x, time);
    const boosterThrust = sampleTrack(script.booster.thrust, time);
    placeVehicle(booster, boosterX, boosterAltitude, sampleTrack(script.booster.tilt, time));
    setFlame(boosterFlame, sampleTrack(script.booster.engines, time), boosterThrust);

    const shipX = sampleTrack(script.ship.x, time);
    const shipAltitude = time >= script.shipCatch ? armsHeight : sampleTrack(script.ship.altitude, time);
    const shipRotation = sampleTrack(script.ship.rotation, time)
      + (sampleTrack(script.ship.wobble, time) * Math.sin(time / 170));
    const plasma = sampleTrack(script.ship.plasma, time);
    placeVehicle(ship, shipX, shipAltitude, shipRotation);
    setFlame(shipFlame, 0.42, sampleTrack(script.ship.thrust, time));
    reentryGlow.style.opacity = plasma;

    const boosterEngineY = window.innerHeight - (BOOSTER_ENGINE_Y + boosterAltitude);
    const shipCenterY = window.innerHeight - (SHIP_CENTER_Y + shipAltitude);
    const boosterLight = boosterThrust * cloudProximity(boosterEngineY);
    const plasmaLight = plasma * cloudProximity(shipCenterY);

    if (plasmaLight > boosterLight) {
      lightClouds(landing.sceneLeft + ENGINE_X + shipX, shipCenterY, plasmaLight, true);
    } else {
      lightClouds(landing.sceneLeft + ENGINE_X + boosterX, boosterEngineY, boosterLight);
    }

    if (time >= script.boosterClouds.at) {
      runOnce('booster-clouds', () => splitClouds({
        x: landing.sceneLeft + ENGINE_X + sampleTrack(script.booster.x, script.boosterClouds.pass),
        push: 60,
        spread: 230,
        reach: 170,
        open: 900,
        hold: 1100,
        close: 2200,
      }));
    }

    if (time >= script.shipClouds.at) {
      runOnce('ship-clouds', () => splitClouds({
        x: landing.sceneLeft + ENGINE_X + sampleTrack(script.ship.x, script.shipClouds.pass),
        push: 52,
        spread: 270,
        reach: 200,
        open: 1100,
        hold: 1200,
        close: 2400,
      }));
    }

    if (time >= script.cloudsClear) {
      runOnce('clear-clouds', hideClouds);
    }

    const flameTip = BOOSTER_ENGINE_Y + boosterAltitude - (FLAME_LENGTH * boosterThrust);

    if (boosterThrust > 0.2 && flameTip < PAD_TOP_Y + 4 && time - landing.lastPuffTime > 40) {
      spawnGroundCloud(ENGINE_X + boosterX, 0.7);
      landing.lastPuffTime = time;
    }

    if (time >= script.boosterCatch) {
      runOnce('booster-smoke', () => spawnSmokeBurst(ENGINE_X, BOOSTER_ENGINE_Y + boosterAltitude, 9));
    }

    if (time >= script.shipCatch) {
      runOnce('ship-smoke', () => spawnSmokeBurst(ENGINE_X, SHIP_ENGINE_Y + shipAltitude, 5));
    }
  };

  const resetScene = () => {
    if (landing) {
      window.cancelAnimationFrame(landing.frame);
      landing = null;
    }

    launchToTop.classList.remove('is-landing', 'is-launched');
    scene.style.removeProperty('--pad-drop');
    [arms, starship, booster, ship].forEach((element) => element.style.removeProperty('transform'));
    [starshipFlame, boosterFlame, shipFlame].forEach(resetFlame);
    reentryGlow.style.removeProperty('opacity');
  };

  const startLanding = () => {
    if (prefersReducedMotion()) {
      resetScene();
      return;
    }

    launchToTop.classList.remove('is-launched');
    showClouds();
    landing = {
      script: createLandingScript(window.innerHeight),
      startTime: performance.now(),
      sceneLeft: scene.getBoundingClientRect().left,
      lastPuffTime: 0,
      done: new Set(),
      frame: null,
    };

    renderLanding(0);
    launchToTop.classList.add('is-landing');

    const animateLanding = (currentTime) => {
      const time = currentTime - landing.startTime;

      if (time >= landing.script.end) {
        resetScene();
        updateLaunchButton();
        return;
      }

      renderLanding(time);
      landing.frame = window.requestAnimationFrame(animateLanding);
    };

    landing.frame = window.requestAnimationFrame(animateLanding);
  };

  const updateLaunchButton = () => {
    const scrollY = window.scrollY;

    if (launchToTop.classList.contains('is-launched') && scrollY > SHOW_AFTER_SCROLL) {
      startLanding();
    }

    const isAnimating = launchToTop.classList.contains('is-departing')
      || launchToTop.classList.contains('is-landing');
    launchToTop.classList.toggle('is-visible', scrollY > SHOW_AFTER_SCROLL || isAnimating);
  };

  window.addEventListener('scroll', updateLaunchButton, { passive: true });
  updateLaunchButton();

  launchToTop.addEventListener('click', () => {
    if (launchToTop.classList.contains('is-departing')) {
      return;
    }

    resetScene();

    if (prefersReducedMotion()) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const launchStartY = window.scrollY;
    const departureDistance = window.innerHeight + PLUME_CLEARANCE;
    const departureDuration = Math.max(launchStartY, departureDistance) / 1.2;
    const mechazillaClearProgress = Math.min(1, 205 / departureDistance);
    const mechazillaDropDistance = window.innerHeight + 205;
    const mechazillaDropDuration = 2200;
    let mechazillaClearTime = null;
    let mechazillaProgress = 0;
    let pageScrollFinished = false;
    let lastSprayTime = 0;
    let lastJetTime = 0;
    let lastBillowTime = 0;
    let ignited = false;
    let cloudPunchTime = null;
    const rocketX = scene.getBoundingClientRect().left + ENGINE_X;

    const getFlightProgress = (progress) => {
      if (progress <= 0) {
        return 0;
      }

      if (progress >= 1) {
        return 1;
      }

      let parameterLow = 0;
      let parameterHigh = 1;

      for (let iteration = 0; iteration < 12; iteration += 1) {
        const parameter = (parameterLow + parameterHigh) / 2;
        const inverse = 1 - parameter;
        const curveX = (3 * inverse * inverse * parameter * 0.8)
          + (3 * inverse * parameter * parameter)
          + (parameter * parameter * parameter);

        if (curveX < progress) {
          parameterLow = parameter;
        } else {
          parameterHigh = parameter;
        }
      }

      const parameter = (parameterLow + parameterHigh) / 2;
      const inverse = 1 - parameter;
      return (3 * inverse * parameter * parameter) + (parameter * parameter * parameter);
    };

    const ignitionTime = performance.now() + DELUGE_LEAD;
    const departureStartTime = ignitionTime + LIFTOFF_DELAY;
    setFlame(starshipFlame, 0, 0);
    showClouds();
    launchToTop.classList.add('is-departing');

    const animateFlight = (currentTime) => {
      const elapsed = currentTime - departureStartTime;
      const sinceIgnition = currentTime - ignitionTime;
      const progress = Math.max(0, Math.min(elapsed / departureDuration, 1));
      const flightProgress = getFlightProgress(progress);
      const climb = departureDistance * flightProgress;
      starship.style.transform = `translate(-50%, ${-climb}px)`;

      if (progress < 1) {
        const ignition = Math.max(0, Math.min(sinceIgnition / 180, 1));
        setFlame(starshipFlame, ignition * (1 + (0.35 * flightProgress)), ignition * (1 + (1.2 * flightProgress)));
      } else {
        resetFlame(starshipFlame);
      }

      if (sinceIgnition < 1500 && currentTime - lastSprayTime > 24) {
        lastSprayTime = currentTime;
        [-1, 1].forEach((side) => {
          spawnWaterDrop(side);
          spawnWaterJet(side);

          if (Math.random() < 0.5) {
            spawnWaterMist(side);
          }
        });
      }

      if (sinceIgnition >= 0 && !ignited) {
        ignited = true;
        spawnIgnitionBurst();
      }

      const plume = sinceIgnition < 0 ? 0 : Math.max(0, 1 - (climb / 150)) * Math.max(0, 1 - (sinceIgnition / 1800));
      const steam = sinceIgnition < 0 ? 0 : Math.max(0, 1 - (sinceIgnition / 2400));

      if (plume > 0 && currentTime - lastJetTime > 18 / plume) {
        lastJetTime = currentTime;
        const heat = Math.max(0.12, 0.75 - (sinceIgnition / 600));
        spawnSteamJet(-1, heat, plume);
        spawnSteamJet(1, heat, plume);
      }

      if (steam > 0 && currentTime - lastBillowTime > 70 / steam) {
        lastBillowTime = currentTime;
        spawnSteamBillow(-1, sinceIgnition);
        spawnSteamBillow(1, sinceIgnition);
      }

      const engineY = window.innerHeight - (BOOSTER_ENGINE_Y + climb);
      lightClouds(rocketX, engineY, progress < 1 ? cloudProximity(engineY) : 0);

      if (cloudPunchTime === null && window.innerHeight - (STACK_NOSE_Y + climb) < deckHeight + 60) {
        cloudPunchTime = currentTime;
        splitClouds({ x: rocketX, push: -40, spread: 180, reach: 150, open: 320, hold: 450, close: 1700 });
      }

      if (cloudPunchTime !== null && currentTime - cloudPunchTime > 900) {
        hideClouds();
      }

      if (!pageScrollFinished) {
        window.scrollTo(0, launchStartY * (1 - flightProgress));
        pageScrollFinished = progress >= 1;
      }

      if (flightProgress >= mechazillaClearProgress && mechazillaClearTime === null) {
        mechazillaClearTime = currentTime;
      }

      if (mechazillaClearTime !== null) {
        mechazillaProgress = Math.min((currentTime - mechazillaClearTime) / mechazillaDropDuration, 1);
        scene.style.setProperty('--pad-drop', `${mechazillaDropDistance * mechazillaProgress}px`);
      }

      if (progress < 1 || mechazillaProgress < 1) {
        window.requestAnimationFrame(animateFlight);
        return;
      }

      hideClouds();
      launchToTop.classList.remove('is-departing');
      launchToTop.classList.add('is-launched');
      starship.style.removeProperty('transform');
      updateLaunchButton();
    };

    window.requestAnimationFrame(animateFlight);
  });
}
