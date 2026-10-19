(() => {
  'use strict';

  const tracks = [
    { id: 'desert', name: 'الصحراء الذهبية', icon: '🏜️', subtitle: 'رمال، شمس، وسرعة', difficulty: 'سهل', color: '#c67b36', sky: '#f6b566', ground: '#c9874c', road: '#45434a', stripe: '#f9e2a9', edge: '#efbb52' },
    { id: 'city', name: 'مدينة النيون', icon: '🌃', subtitle: 'أضواء لا تنام', difficulty: 'متوسط', color: '#313c8c', sky: '#151b48', ground: '#252858', road: '#2f3443', stripe: '#9bb8ff', edge: '#ff5ea6' },
    { id: 'mountain', name: 'طريق الجبال', icon: '🏔️', subtitle: 'منحنيات وتحديات', difficulty: 'صعب', color: '#357469', sky: '#73c5be', ground: '#387a6c', road: '#3c4449', stripe: '#d9efe0', edge: '#ffd06b' }
  ];
  const drivers = [
    { id: 'noor', name: 'نور', emoji: '👩🏻‍🚀', title: 'ملكة المنحنيات', color: '#e75a48', speed: 82, control: 94, boost: 71 },
    { id: 'fares', name: 'فارس', emoji: '🧑🏻‍✈️', title: 'ملك السرعة', color: '#3f66e8', speed: 96, control: 73, boost: 87 },
    { id: 'layan', name: 'ليان', emoji: '👩🏽‍🎤', title: 'عين الصقر', color: '#a34bd5', speed: 78, control: 90, boost: 83 },
    { id: 'ziad', name: 'زياد', emoji: '🧑🏽‍🔧', title: 'المخضرم', color: '#dd9a36', speed: 86, control: 84, boost: 78 }
  ];
  const cars = [
    { id: 'bolt', name: 'الصاعقة', icon: '🏎️', subtitle: 'خفيفة وسريعة', color: '#ef493f', accent: '#ff9d67', speed: 91, control: 82, boost: 88 },
    { id: 'tiger', name: 'النمر', icon: '🚘', subtitle: 'ثبات على الطريق', color: '#efb12c', accent: '#fff0a8', speed: 79, control: 94, boost: 77 },
    { id: 'arrow', name: 'السهم', icon: '🏁', subtitle: 'تسارع خاطف', color: '#3569ee', accent: '#9fb8ff', speed: 97, control: 72, boost: 91 },
    { id: 'crusher', name: 'الكاسر', icon: '🚙', subtitle: 'قوة بلا حدود', color: '#6e53c9', accent: '#c0b1ff', speed: 85, control: 86, boost: 96 }
  ];

  const state = {
    mode: 'offline',
    localMode: 'bot',
    selections: { track: 'desert', driver: 'noor', car: 'bolt' },
    soundOn: true,
    socket: null,
    socketReady: false,
    online: { code: '', playerId: '', isHost: false, ready: false, players: [] },
    race: null,
    result: null,
    toastTimer: null
  };

  const $ = (id) => document.getElementById(id);
  const canvas = $('race-canvas');
  const ctx = canvas.getContext('2d');
  const screens = { home: $('screen-home'), setup: $('screen-setup'), lobby: $('screen-lobby'), game: $('screen-game'), result: $('screen-result') };

  const getTrack = () => tracks.find((item) => item.id === state.selections.track) || tracks[0];
  const getDriver = () => drivers.find((item) => item.id === state.selections.driver) || drivers[0];
  const getCar = () => cars.find((item) => item.id === state.selections.car) || cars[0];
  const currentSelection = () => ({ track: state.selections.track, driver: state.selections.driver, car: state.selections.car });

  function showScreen(name) {
    Object.entries(screens).forEach(([key, screen]) => screen.classList.toggle('active', key === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setConnection(online, label) {
    const pill = $('connection-pill');
    pill.querySelector('i').style.background = online ? '#19b76a' : '#ff9a3d';
    pill.querySelector('span').textContent = label || (online ? 'متصل أونلاين' : 'وضع فردي');
  }

  function renderSelectionCards() {
    $('track-cards').innerHTML = tracks.map((track) => `
      <button class="select-card track-card ${track.id === state.selections.track ? 'selected' : ''}" data-selection="track" data-id="${track.id}" style="--track-color:${track.color}">
        <span class="card-kicker">${track.difficulty}</span><span class="card-icon">${track.icon}</span><h4>${track.name}</h4><p>${track.subtitle}</p><span class="track-art"></span>
      </button>`).join('');
    $('driver-cards').innerHTML = drivers.map((driver) => `
      <button class="select-card driver-card ${driver.id === state.selections.driver ? 'selected' : ''}" data-selection="driver" data-id="${driver.id}" style="--avatar:${driver.color}">
        <span class="card-kicker">سائق محترف</span><span class="card-icon">${driver.emoji}</span><h4>${driver.name}</h4><p>${driver.title}</p><span class="mini-stat"><i style="--level:${driver.speed}%"></i></span>
      </button>`).join('');
    $('car-cards').innerHTML = cars.map((car) => `
      <button class="select-card car-card ${car.id === state.selections.car ? 'selected' : ''}" data-selection="car" data-id="${car.id}" style="--avatar:${car.color}">
        <span class="card-kicker">عربية سباق</span><span class="card-icon">${car.icon}</span><h4>${car.name}</h4><p>${car.subtitle}</p><span class="mini-stat"><i style="--level:${car.speed}%"></i></span>
      </button>`).join('');
  }

  function renderSummary() {
    const track = getTrack(); const driver = getDriver(); const car = getCar();
    $('summary-car').textContent = car.name;
    $('summary-driver').textContent = `مع ${driver.name}`;
    $('summary-track').textContent = track.name;
    $('summary-track-icon').textContent = track.icon;
    const preview = $('preview-car');
    preview.style.background = `linear-gradient(90deg, ${car.color}, ${car.accent} 50%, ${car.color})`;
    $('summary-stats').innerHTML = [
      ['السرعة', car.speed], ['التحكم', car.control], ['النيترو', car.boost]
    ].map(([label, value]) => `<div class="stat-row"><span>${label}</span><i style="--level:${value}%"></i><b>${value}</b></div>`).join('');
  }

  function configureSetup() {
    const online = state.mode === 'online';
    $('offline-options').classList.toggle('hidden', online);
    $('online-options').classList.toggle('hidden', !online);
    setConnection(false, online ? 'تجهيز أونلاين' : 'وضع فردي');
    renderSelectionCards(); renderSummary();
  }

  function chooseMode(mode) {
    state.mode = mode;
    configureSetup();
    showScreen('setup');
  }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function showRaceToast(message) {
    const toast = $('race-toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state.raceToastTimer);
    state.raceToastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function setLocalMode(mode) {
    state.localMode = mode;
    document.querySelectorAll('[data-local-mode]').forEach((button) => button.classList.toggle('selected', button.dataset.localMode === mode));
    $('control-hint').innerHTML = mode === 'local' ? '<span>التحكم</span><b>P1 الأسهم · P2 WASD</b><small>مين هيعدي خط النهاية الأول؟</small>' : '<span>التحكم</span><b>↑ ↓ ← →</b><small>حرّك العربية وتفادى العوائق</small>';
  }

  function wsUrl() {
    if (location.protocol === 'http:' || location.protocol === 'https:') return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    return 'ws://localhost:3000';
  }

  function connectSocket(callback) {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) return callback(state.socket);
    if (state.socket && state.socket.readyState === WebSocket.CONNECTING) {
      state.socket.addEventListener('open', () => callback(state.socket), { once: true });
      return;
    }
    try { state.socket = new WebSocket(wsUrl()); } catch { showToast('شغّل السيرفر أولًا علشان تستخدم الأونلاين.'); return; }
    state.socket.addEventListener('open', () => { state.socketReady = true; callback(state.socket); });
    state.socket.addEventListener('message', (event) => {
      try { handleServerMessage(JSON.parse(event.data)); } catch { showToast('حصل خطأ في بيانات الغرفة.'); }
    });
    state.socket.addEventListener('error', () => { state.socketReady = false; showToast('تعذر الاتصال بالسيرفر.'); });
    state.socket.addEventListener('close', () => { state.socketReady = false; setConnection(false, 'غير متصل'); });
  }

  function sendServer(message) {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) state.socket.send(JSON.stringify(message));
    else showToast('الاتصال غير جاهز. حاول مرة أخرى.');
  }

  function createRoom() {
    const name = ($('player-name').value || 'سائق البرق').trim().slice(0, 18);
    connectSocket((socket) => socket.send(JSON.stringify({ type: 'create-room', name, selection: currentSelection(), settings: { track: state.selections.track } })));
  }

  function joinRoom() {
    const code = ($('room-code').value || '').trim().toUpperCase();
    const name = ($('player-name').value || 'سائق البرق').trim().slice(0, 18);
    if (code.length < 4) return showToast('اكتب كود الغرفة الأول.');
    connectSocket((socket) => socket.send(JSON.stringify({ type: 'join-room', code, name, selection: currentSelection() })));
  }

  function handleServerMessage(message) {
    if (message.type === 'error') return showToast(message.message || 'حصل خطأ.');
    if (message.type === 'room-created') {
      state.online = { ...state.online, code: message.code, playerId: message.playerId, isHost: true, ready: false, players: [{ id: message.playerId, name: ($('player-name').value || 'سائق البرق').trim(), selection: currentSelection(), ready: false }] };
      setConnection(true, 'غرفة أونلاين'); renderLobby(); showScreen('lobby'); return;
    }
    if (message.type === 'room-joined') {
      state.online = { ...state.online, code: message.code, playerId: message.playerId, isHost: false, ready: false, players: [{ id: 'host', name: 'المضيف', selection: message.opponent, ready: false }, { id: message.playerId, name: ($('player-name').value || 'سائق البرق').trim(), selection: currentSelection(), ready: false }] };
      setConnection(true, 'غرفة أونلاين'); renderLobby(); showScreen('lobby'); return;
    }
    if (message.type === 'room-update') {
      state.online.players = message.players || [];
      renderLobby();
      return;
    }
    if (message.type === 'race-start') {
      state.online.players = message.players || state.online.players;
      startRace('online', message.seed, message.players || []);
      return;
    }
    if (message.type === 'race-state' && state.race && state.race.mode === 'online') {
      state.race.remote = { ...(state.race.remote || {}), ...(message.state || {}) };
      return;
    }
    if (message.type === 'race-finished' && state.race && state.race.mode === 'online' && !state.race.finished) {
      state.race.remoteFinished = true;
      if (!state.race.localFinished) finishRace('remote');
      return;
    }
    if (message.type === 'opponent-left') {
      showToast('صاحبك خرج من الغرفة.');
      if (state.race && state.race.mode === 'online') { stopRaceLoop(); showScreen('lobby'); }
      return;
    }
  }

  function renderLobby() {
    $('room-code-display').textContent = state.online.code || '------';
    const players = state.online.players || [];
    $('players-list').innerHTML = players.map((player, index) => {
      const selection = player.selection || {};
      const driver = drivers.find((item) => item.id === selection.driver) || drivers[index % drivers.length];
      const car = cars.find((item) => item.id === selection.car) || cars[index % cars.length];
      return `<div class="player-row"><span class="player-avatar" style="--avatar:${driver.color}">${driver.emoji}</span><div class="player-meta"><strong>${player.name || (index === 0 ? 'المضيف' : 'سائق')}</strong><small>${car.name} · ${driver.name}</small></div><span class="player-status ${player.ready ? 'ready' : ''}">${player.ready ? 'جاهز ✓' : (index === 0 ? 'ينتظر لاعبًا' : 'لم يجهز')}</span></div>`;
    }).join('') || '<div class="player-row"><div class="player-meta"><strong>جاري تجهيز الغرفة…</strong><small>لحظة واحدة</small></div></div>';
    const readyButton = $('ready-button');
    readyButton.innerHTML = state.online.ready ? 'إلغاء الجاهزية <span>↩</span>' : 'أنا جاهز <span>✓</span>';
    readyButton.classList.toggle('btn-dark', state.online.ready);
    const hint = $('lobby-hint');
    hint.textContent = players.length < 2 ? 'محتاجين سائقين عشان يبدأ السباق.' : (players.every((player) => player.ready) ? 'جاهزين! السباق يبدأ الآن…' : 'لما السائقين يدوسوا جاهز، السباق هيبدأ.');
  }

  function toggleReady() {
    if ((state.online.players || []).length < 2) return showToast('استنى صاحبك يدخل بالكود.');
    state.online.ready = !state.online.ready;
    sendServer({ type: 'ready', value: state.online.ready });
    renderLobby();
  }

  function leaveRoom() {
    if (state.socket) { state.socket.close(); state.socket = null; }
    state.online = { code: '', playerId: '', isHost: false, ready: false, players: [] };
    state.mode = 'offline'; configureSetup(); showScreen('home');
  }

  function copyRoomCode() {
    const code = state.online.code;
    if (!code) return;
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => showToast('اتنسخ الكود، ابعته لصاحبك.')).catch(() => showToast(`كود الغرفة: ${code}`));
    else showToast(`كود الغرفة: ${code}`);
  }

  function makeRng(seed) {
    let value = seed >>> 0;
    return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  function startOffline() {
    startRace(state.localMode === 'local' ? 'local' : 'bot', Math.floor(Math.random() * 1000000), []);
  }

  function startRace(mode, seed, onlinePlayers) {
    const track = getTrack(); const driver = getDriver(); const car = getCar();
    const remotePlayer = onlinePlayers.find((player) => player.id !== state.online.playerId);
    const botDriver = drivers.find((item) => item.id === 'ziad'); const botCar = cars.find((item) => item.id === 'crusher');
    const rng = makeRng(seed || 1337);
    const obstacles = Array.from({ length: 25 }, (_, index) => ({ progress: 85 + index * 39 + rng() * 24, lane: [0.24, 0.5, 0.76][Math.floor(rng() * 3)], kind: rng() > .72 ? 'cone' : 'car', color: ['#ffd65d', '#ff715e', '#70d5df', '#be91ff'][Math.floor(rng() * 4)] }));
    state.race = {
      mode, track, driver, car, totalDistance: 1000, playerProgress: 0, playerX: 550, playerSpeed: 0, player2Progress: 0, player2X: 690, opponentProgress: 0, opponentX: 480, remote: { progress: 0, x: 480 }, obstacles, rng, started: false, countdown: 3.6, elapsed: 0, lastTime: performance.now(), sendTimer: 0, paused: false, finished: false, localFinished: false, remoteFinished: false, botDriver, botCar
    };
    $('race-track-icon').textContent = track.icon; $('race-track-name').textContent = track.name; $('hud-avatar').textContent = driver.emoji; $('hud-driver').textContent = driver.name; $('hud-car').textContent = car.name; $('progress-bar').style.width = '0%'; $('progress-text').textContent = '0%'; $('race-time').textContent = '00:00'; $('speed-value').textContent = '0'; $('countdown').textContent = '3'; $('countdown').classList.remove('go'); $('pause-overlay').classList.add('hidden');
    if (mode === 'online') {
      const remoteSelection = remotePlayer?.selection || { driver: 'ziad', car: 'crusher' };
      state.race.remoteDriver = drivers.find((item) => item.id === remoteSelection.driver) || botDriver;
      state.race.remoteCar = cars.find((item) => item.id === remoteSelection.car) || botCar;
      $('control-hint').innerHTML = '<span>التحكم</span><b>↑ ↓ ← →</b><small>أول سائق يعدي يكسب</small>';
    } else if (mode === 'local') {
      $('control-hint').innerHTML = '<span>التحكم</span><b>P1 الأسهم · P2 WASD</b><small>مين هيعدي خط النهاية الأول؟</small>';
    } else {
      $('control-hint').innerHTML = '<span>التحكم</span><b>↑ ↓ ← →</b><small>حرّك العربية وتفادى العوائق</small>';
    }
    showScreen('game');
    stopRaceLoop();
    state.race.frame = requestAnimationFrame(gameLoop);
  }

  function stopRaceLoop() {
    if (state.race?.frame) cancelAnimationFrame(state.race.frame);
    if (state.race) state.race.frame = null;
  }

  function isDown(...keys) { return keys.some((key) => state.keys?.has(key)); }

  function gameLoop(now) {
    const race = state.race;
    if (!race || race.finished) return;
    const dt = Math.min(0.035, Math.max(0.001, (now - race.lastTime) / 1000));
    race.lastTime = now;
    if (race.countdown > 0) {
      race.countdown -= dt;
      const cd = $('countdown');
      if (race.countdown > 0) cd.textContent = Math.ceil(race.countdown);
      else { race.started = true; race.startedAt = now; cd.textContent = 'انطلق!'; cd.classList.add('go'); setTimeout(() => { if (state.race === race) cd.textContent = ''; }, 500); }
    } else if (race.started && !race.paused) {
      updateRace(race, dt);
    }
    drawRace(race);
    race.frame = requestAnimationFrame(gameLoop);
  }

  function updateRace(race, dt) {
    const keys = state.keys || new Set();
    const car = race.car;
    const acceleration = isDown('ArrowUp') ? 28 : 0;
    const braking = isDown('ArrowDown') ? 42 : 0;
    const baseSpeed = 88 + car.speed * .33;
    race.playerSpeed += ((baseSpeed + acceleration - braking) - race.playerSpeed) * Math.min(1, dt * 4);
    race.playerProgress += race.playerSpeed * dt;
    const steer = (isDown('ArrowLeft') ? -1 : 0) + (isDown('ArrowRight') ? 1 : 0);
    race.playerX = Math.max(200, Math.min(900, race.playerX + steer * (240 + car.control) * dt));
    if (race.mode === 'local') {
      const p2Steer = (isDown('a', 'A') ? -1 : 0) + (isDown('d', 'D') ? 1 : 0);
      const p2Base = 86 + cars[1].speed * .33;
      race.player2Progress += p2Base * dt;
      race.player2X = Math.max(200, Math.min(900, race.player2X + p2Steer * 310 * dt));
    } else if (race.mode === 'bot') {
      const botBase = 84 + race.botCar.speed * .33;
      race.opponentProgress += botBase * dt;
      race.opponentX += Math.sin(race.elapsed * 1.8) * 27 * dt;
      race.opponentX = Math.max(220, Math.min(880, race.opponentX));
    }
    if (race.mode === 'online') {
      race.remote.progress = Math.max(0, race.remote.progress || 0);
      race.remote.x = Math.max(200, Math.min(900, race.remote.x || 480));
    }
    race.elapsed += dt;
    checkCollisions(race);
    const localPercent = Math.min(100, Math.floor(race.playerProgress / race.totalDistance * 100));
    $('progress-bar').style.width = `${localPercent}%`; $('progress-text').textContent = `${localPercent}%`; $('race-time').textContent = formatTime(race.elapsed); $('speed-value').textContent = Math.max(0, Math.round(race.playerSpeed * .95));
    race.sendTimer += dt;
    if (race.mode === 'online' && race.sendTimer > .1) { race.sendTimer = 0; sendServer({ type: 'race-state', state: { progress: race.playerProgress, x: race.playerX, elapsed: race.elapsed } }); }
    if (race.playerProgress >= race.totalDistance) return finishRace('local');
    if (race.mode === 'bot' && race.opponentProgress >= race.totalDistance) return finishRace('bot');
    if (race.mode === 'local' && race.player2Progress >= race.totalDistance) return finishRace('local2');
  }

  function checkCollisions(race) {
    race.obstacles.forEach((obstacle) => {
      if (obstacle.hit) return;
      if (Math.abs(obstacle.progress - race.playerProgress) < 17 && Math.abs(obstacle.lane * 1000 - race.playerX) < 84) {
        obstacle.hit = true; race.playerProgress = Math.max(0, race.playerProgress - 23); race.playerSpeed *= .52; showRaceToast('خد بالك من العوائق!');
      }
    });
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function roadBounds(y) {
    const ratio = Math.max(0, Math.min(1, y / canvas.height));
    return { left: 360 + (120 - 360) * ratio, right: 740 + (980 - 740) * ratio };
  }

  function roadX(worldX, y) {
    const bounds = roadBounds(y);
    return bounds.left + (worldX / 1000) * (bounds.right - bounds.left);
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath(); context.moveTo(x + r, y); context.arcTo(x + width, y, x + width, y + height, r); context.arcTo(x + width, y + height, x, y + height, r); context.arcTo(x, y + height, x, y, r); context.arcTo(x, y, x + width, y, r); context.closePath();
  }

  function drawRace(race) {
    const W = canvas.width, H = canvas.height, track = race.track, scroll = race.playerProgress * 3.4;
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, track.sky); sky.addColorStop(.6, track.ground); sky.addColorStop(1, track.ground); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    drawScenery(track, scroll);
    ctx.fillStyle = track.road; ctx.beginPath(); ctx.moveTo(360, 0); ctx.lineTo(740, 0); ctx.lineTo(980, H); ctx.lineTo(120, H); ctx.closePath(); ctx.fill();
    drawRoadEdges(track, scroll); drawLaneMarks(track, scroll);
    race.obstacles.forEach((obstacle) => {
      const y = 510 - (obstacle.progress - race.playerProgress) * 3.15;
      if (y > -90 && y < H + 80 && obstacle.progress >= race.playerProgress - 45) drawTraffic(obstacle, roadX(obstacle.lane * 1000, y), y, Math.max(.42, Math.min(1.15, .46 + y / H * .63)));
    });
    if (race.mode === 'bot') {
      const y = 515 - (race.opponentProgress - race.playerProgress) * 3.15;
      if (y > -90 && y < H + 90) drawCar(race.opponentX, y, race.botCar, race.botDriver, Math.max(.47, Math.min(1.15, .5 + y / H * .58)));
    } else if (race.mode === 'online') {
      const y = 515 - (race.remote.progress - race.playerProgress) * 3.15;
      if (y > -90 && y < H + 90) drawCar(race.remote.x || 480, y, race.remoteCar || race.botCar, race.remoteDriver || race.botDriver, Math.max(.47, Math.min(1.15, .5 + y / H * .58)));
    } else if (race.mode === 'local') {
      drawCar(race.player2X, 565, cars[1], drivers[1], .78);
    }
    drawCar(race.playerX, 520, race.car, race.driver, 1);
    drawFinishHint(race);
  }

  function drawScenery(track, scroll) {
    const W = canvas.width, H = canvas.height;
    ctx.save();
    if (track.id === 'desert') {
      ctx.fillStyle = 'rgba(255,220,140,.7)'; ctx.beginPath(); ctx.arc(870, 96, 42, 0, Math.PI * 2); ctx.fill();
      for (let i = -1; i < 9; i++) { const x = i * 155 + ((scroll * .18) % 155); ctx.fillStyle = i % 2 ? 'rgba(129,74,47,.42)' : 'rgba(239,173,91,.5)'; ctx.beginPath(); ctx.moveTo(x, 250); ctx.lineTo(x + 100, 126); ctx.lineTo(x + 205, 250); ctx.closePath(); ctx.fill(); }
      for (let i = 0; i < 10; i++) { const x = (i * 173 + scroll * .6) % 1140 - 70; drawCactus(ctx, x, 505 - (i % 3) * 18, .65 + (i % 2) * .17); }
    } else if (track.id === 'city') {
      ctx.fillStyle = 'rgba(7,9,26,.68)'; ctx.fillRect(0, 115, W, 160);
      for (let i = -1; i < 16; i++) { const x = i * 92 + ((scroll * .25) % 92); const h = 75 + (i % 4) * 28; ctx.fillStyle = i % 2 ? '#252657' : '#202247'; ctx.fillRect(x, 275 - h, 69, h); for (let row = 0; row < 4; row++) { ctx.fillStyle = row % 2 ? 'rgba(255,218,99,.72)' : 'rgba(84,191,255,.6)'; ctx.fillRect(x + 12, 290 - h + row * 22, 8, 9); ctx.fillRect(x + 34, 290 - h + row * 22, 8, 9); } }
      for (let i = 0; i < 9; i++) { const x = (i * 190 + scroll * .7) % 1200 - 80; ctx.fillStyle = i % 2 ? '#ff6fa8' : '#64d5ff'; ctx.fillRect(x, 292, 4, 69); ctx.shadowBlur = 12; ctx.shadowColor = ctx.fillStyle; ctx.fillRect(x - 3, 292, 10, 3); ctx.shadowBlur = 0; }
    } else {
      for (let i = -1; i < 8; i++) { const x = i * 220 + ((scroll * .16) % 220); ctx.fillStyle = i % 2 ? 'rgba(34,97,83,.65)' : 'rgba(55,123,99,.55)'; ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x + 110, 78); ctx.lineTo(x + 250, 300); ctx.closePath(); ctx.fill(); }
      for (let i = 0; i < 12; i++) { const x = (i * 160 + scroll * .45) % 1200 - 60; drawPine(ctx, x, 470 - (i % 3) * 12, .62 + (i % 2) * .16); }
    }
    ctx.restore();
  }

  function drawRoadEdges(track, scroll) {
    const H = canvas.height;
    ctx.save(); ctx.lineWidth = 9; ctx.strokeStyle = track.edge; ctx.beginPath(); ctx.moveTo(360, 0); ctx.lineTo(120, H); ctx.moveTo(740, 0); ctx.lineTo(980, H); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.setLineDash([12, 24]); ctx.lineDashOffset = -scroll; ctx.beginPath(); ctx.moveTo(379, 0); ctx.lineTo(160, H); ctx.moveTo(721, 0); ctx.lineTo(940, H); ctx.stroke(); ctx.restore();
  }

  function drawLaneMarks(track, scroll) {
    const H = canvas.height; ctx.save(); ctx.strokeStyle = track.stripe; ctx.lineCap = 'round';
    for (const center of [0.333, 0.666]) {
      for (let i = -1; i < 15; i++) { const y = ((i * 76 + scroll) % (H + 90)) - 50; const bounds = roadBounds(y); const x = bounds.left + center * (bounds.right - bounds.left); const len = 24 + y / H * 33; ctx.globalAlpha = .25 + y / H * .58; ctx.lineWidth = 3 + y / H * 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke(); }
    } ctx.restore();
  }

  function drawCactus(context, x, y, scale) { context.save(); context.translate(x, y); context.scale(scale, scale); context.fillStyle = '#4e8d58'; context.fillRect(0, -36, 11, 36); context.fillRect(-12, -24, 11, 8); context.fillRect(-12, -31, 7, 15); context.fillRect(11, -17, 12, 8); context.fillRect(17, -28, 7, 19); context.restore(); }
  function drawPine(context, x, y, scale) { context.save(); context.translate(x, y); context.scale(scale, scale); context.fillStyle = '#20584f'; context.fillRect(-3, -43, 6, 43); context.beginPath(); context.moveTo(0, -87); context.lineTo(-32, -38); context.lineTo(32, -38); context.closePath(); context.fill(); context.beginPath(); context.moveTo(0, -64); context.lineTo(-40, -17); context.lineTo(40, -17); context.closePath(); context.fill(); context.restore(); }

  function drawTraffic(obstacle, x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 29, 27, 9, 0, 0, Math.PI * 2); ctx.fill();
    if (obstacle.kind === 'cone') { ctx.fillStyle = obstacle.color; ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(13, 20); ctx.lineTo(-13, 20); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-8, -8, 16, 6); } else { roundedRect(ctx, -20, -32, 40, 62, 10); ctx.fillStyle = obstacle.color; ctx.fill(); ctx.fillStyle = '#172236'; roundedRect(ctx, -13, -19, 26, 18, 5); ctx.fill(); ctx.fillStyle = '#ffe9a9'; ctx.fillRect(-14, 19, 8, 4); ctx.fillRect(6, 19, 8, 4); } ctx.restore();
  }

  function drawCar(worldX, y, car, driver, scale) {
    const x = roadX(worldX, y); ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 35, 36, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#11131a'; roundedRect(ctx, -31, -31, 9, 25, 5); ctx.fill(); roundedRect(ctx, 22, -31, 9, 25, 5); ctx.fill(); roundedRect(ctx, -31, 14, 9, 25, 5); ctx.fill(); roundedRect(ctx, 22, 14, 9, 25, 5); ctx.fill();
    const body = ctx.createLinearGradient(-28, 0, 28, 0); body.addColorStop(0, car.color); body.addColorStop(.5, car.accent); body.addColorStop(1, car.color); ctx.fillStyle = body; roundedRect(ctx, -27, -52, 54, 94, 16); ctx.fill();
    ctx.fillStyle = '#172236'; roundedRect(ctx, -20, -39, 40, 29, 10); ctx.fill(); ctx.fillStyle = 'rgba(197,239,243,.34)'; ctx.fillRect(-15, -34, 30, 3); ctx.fillStyle = '#ffe6a7'; roundedRect(ctx, -18, 28, 12, 5, 2); ctx.fill(); roundedRect(ctx, 6, 28, 12, 5, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; roundedRect(ctx, -3, -48, 6, 83, 3); ctx.fill();
    if (driver?.emoji) { ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillText(driver.emoji, 0, -19); }
    ctx.restore();
  }

  function drawFinishHint(race) {
    if (race.playerProgress < race.totalDistance - 95) return;
    const y = 505 - (race.totalDistance - race.playerProgress) * 3.15;
    if (y > -40 && y < 680) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.setLineDash([15, 15]); ctx.beginPath(); ctx.moveTo(roadBounds(y).left, y); ctx.lineTo(roadBounds(y).right, y); ctx.stroke(); ctx.restore(); }
  }

  function finishRace(winner) {
    const race = state.race; if (!race || race.finished) return; race.finished = true; race.localFinished = winner === 'local';
    if (race.mode === 'online') sendServer({ type: 'race-finished', result: { winner } });
    stopRaceLoop();
    const won = winner === 'local' || (winner === 'local2' && race.mode === 'local');
    state.result = { won, winner, time: formatTime(race.elapsed), track: race.track.name };
    $('result-kicker').textContent = race.mode === 'online' ? 'نتيجة السباق الأونلاين' : 'نهاية السباق'; $('result-trophy').textContent = won ? '🏆' : '🏁'; $('result-title').textContent = won ? 'أنت البطل!' : (winner === 'local2' ? 'اللاعب الثاني كسب!' : 'المرة الجاية أسرع!'); $('result-subtitle').textContent = won ? 'قيادة ممتازة. الطريق كله كان تحت سيطرتك.' : 'حصلت منافسة قوية — جرّب عربية أو طريق مختلف.'; $('result-rank').textContent = won ? '01' : '02'; $('result-time').textContent = formatTime(race.elapsed); $('result-track').textContent = race.track.name;
    showScreen('result');
  }

  function togglePause() { if (!state.race || state.race.finished) return; state.race.paused = !state.race.paused; $('pause-overlay').classList.toggle('hidden', !state.race.paused); }

  function restartRace() { if (state.mode === 'online') { showScreen('lobby'); state.online.ready = false; sendServer({ type: 'ready', value: false }); renderLobby(); } else startRace(state.localMode === 'local' ? 'local' : 'bot', Math.floor(Math.random() * 1000000), []); }

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'home') { stopRaceLoop(); if (state.socket) { state.socket.close(); state.socket = null; } state.mode = 'offline'; state.race = null; configureSetup(); showScreen('home'); setConnection(false, 'وضع فردي'); return; }
    if (action === 'choose-mode') return chooseMode(event.target.closest('[data-action]').dataset.mode);
    if (action === 'start-offline') return startOffline();
    if (action === 'create-room') return createRoom();
    if (action === 'show-join') { $('join-box').classList.toggle('hidden'); $('room-code').focus(); return; }
    if (action === 'join-room') return joinRoom();
    if (action === 'toggle-ready') return toggleReady();
    if (action === 'copy-code') return copyRoomCode();
    if (action === 'leave-room') return leaveRoom();
    if (action === 'toggle-sound') { state.soundOn = !state.soundOn; event.target.closest('[data-action]').textContent = state.soundOn ? '🔊' : '🔇'; showToast(state.soundOn ? 'الصوت شغال' : 'الصوت مقفول'); return; }
    if (action === 'pause-race') return togglePause();
    if (action === 'resume-race') return togglePause();
    if (action === 'restart-race') return restartRace();
    const selection = event.target.closest('[data-selection]');
    if (selection) { state.selections[selection.dataset.selection] = selection.dataset.id; renderSelectionCards(); renderSummary(); if (state.mode === 'online' && state.online.code) sendServer({ type: 'update-selection', selection: currentSelection() }); return; }
    const localMode = event.target.closest('[data-local-mode]')?.dataset.localMode;
    if (localMode) return setLocalMode(localMode);
    const touchKey = event.target.closest('[data-key]')?.dataset.key;
    if (touchKey) { state.keys = state.keys || new Set(); state.keys.add(touchKey); setTimeout(() => state.keys.delete(touchKey), 170); }
  });

  window.addEventListener('keydown', (event) => { state.keys = state.keys || new Set(); state.keys.add(event.key); if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault(); if (event.key === 'Escape' && screens.game.classList.contains('active')) togglePause(); });
  window.addEventListener('keyup', (event) => { if (state.keys) state.keys.delete(event.key); });
  window.addEventListener('blur', () => { if (state.race?.started && !state.race.finished) state.race.paused = true; });

  renderSelectionCards(); renderSummary(); setConnection(false, 'وضع فردي');
})();
