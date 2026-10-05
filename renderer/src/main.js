// ===== OVERFIT — Punto de entrada principal =====
// Conecta escena 3D, UI, estado y minijuegos.
import { RoomScene } from './scenes/room.js';
import { gameState } from './core/state.js';
import { SKILLS, PROGRESSION, DIFFICULTY } from './config/skills.js';
import { createMinigame } from './minigames/index.js';
import { sfx, setMasterVolume, setSfxVolume, getMasterVolume, getSfxVolume } from './utils/audio.js';

// ===== Referencias DOM =====
const $ = (sel) => document.querySelector(sel);
const canvas = $('#game-canvas');
const hud = $('#hud');
const mainMenu = $('#main-menu');
const btnNew = $('#btn-new-game');
const btnContinue = $('#btn-continue');
const btnOptions = $('#btn-options');
const btnCredits = $('#btn-credits');
const optionsPanel = $('#options-panel');
const creditsPanel = $('#credits-panel');
const pauseMenu = $('#pause-menu');
const trainingPanel = $('#training-panel');
const minigameOverlay = $('#minigame-overlay');
const minigameContainer = $('#minigame-container');
const introOverlay = $('#intro-overlay');
const introText = $('#intro-text');
const aiPointsEl = $('#aipoints-value');
const gpuNameEl = $('#gpu-name');
const skillsBarEl = $('#skills-bar');
const skillsGridEl = $('#skills-grid');
const interactionHint = $('#interaction-hint');
const rewardPopup = $('#reward-popup');
const rewardTitle = $('#reward-title');
const rewardValue = $('#reward-value');
const rewardSkill = $('#reward-skill');
const pointsFloater = $('#points-floater');
const btnMenu = $('#btn-menu');

// Estado de UI
let selectedDifficulty = 'easy';
let room = null;
let paused = false;
let inMinigame = false;

// ===== Inicialización =====

async function init() {
  // Chequear si hay guardado
  const hasSave = await gameState.load();
  btnContinue.disabled = !hasSave;

  // Configurar volúmenes iniciales
  const vol = parseInt($('#volume-master').value,10)/100;
  const sfxVol = parseInt($('#volume-sfx').value,10)/100;
  setMasterVolume(vol); setSfxVolume(sfxVol);

  bindUI();

  // Mostrar menú principal
  showMainMenu();
}

// ===== Menús =====
function showMainMenu() {
  mainMenu.classList.remove('hidden');
  hud.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  trainingPanel.classList.add('hidden');
  minigameOverlay.classList.add('hidden');
  optionsPanel.classList.add('hidden');
  creditsPanel.classList.add('hidden');
  introOverlay.classList.add('hidden');
  if (room) { room.dispose(); room = null; }
  canvas.style.display = 'none';
}

function startNewGame() {
  sfx.select();
  gameState.reset();
  mainMenu.classList.add('hidden');
  playIntro();
}

function continueGame() {
  sfx.select();
  mainMenu.classList.add('hidden');
  enterGame(false);
}

function enterGame(showIntro) {
  canvas.style.display = 'block';
  if (!room) {
    room = new RoomScene(canvas);
    room.onInteract = openTrainingPanel;
    room.onNearPCChange = (near) => {
      const panelsOpen = !trainingPanel.classList.contains('hidden') || !minigameOverlay.classList.contains('hidden') || !pauseMenu.classList.contains('hidden') || !optionsPanel.classList.contains('hidden');
      interactionHint.classList.toggle('hidden', !near || panelsOpen || inMinigame || paused);
    };
    room.setInteractChecker(() => !paused && !inMinigame);
    room.start();
  }
  hud.classList.remove('hidden');
  renderHUD();
  if (showIntro && !gameState.get().introSeen) {
    playIntro();
  }
  startAutosave();
}

// ===== Intro con diálogos =====
const INTRO_LINES = [
  { text: 'Es 2026. Tu cuarto es un desastre y tu PC pide a gritos un cambio.', pause: 2500 },
  { text: 'Vos querés jugar videojuegos, pero la realidad es otra...', pause: 2500 },
  { text: '', pause: 800 },
  { speaker: 'Tío:', text: 'Toma mijo, para que juegues.', pause: 2500 },
  { speaker: null, text: '(Te entrega una GTX 1050. Una GTX 1050. En 2026.)', pause: 3500 },
  { text: '', pause: 600 },
  { speaker: 'Vos:', text: 'Gracias tío... la voy a usar bien.', pause: 2500 },
  { text: 'Mientes. Sabés perfectamente que esa cosa no corre ni el solitario.', pause: 2500 },
  { text: 'Pero entonces se te ocurre una idea terrible...', pause: 2500 },
  { text: '✨ Vas a entrenar TU PROPIA INTELIGENCIA ARTIFICIAL. ✨', pause: 3500 },
  { text: 'Comienza el entrenamiento.', pause: 2000 }
];

function playIntro() {
  introOverlay.classList.remove('hidden');
  let idx = 0;
  let cancelled = false;

  const skip = () => {
    cancelled = true;
    introOverlay.classList.add('hidden');
    const s = gameState.get();
    if (!s.introSeen) gameState.set({ introSeen: true });
    enterGame(false);
  };

  $('#intro-skip').onclick = skip;
  const keyHandler = (e) => { if (e.code === 'Space') { e.preventDefault(); skip(); } };
  window.addEventListener('keydown', keyHandler);

  const next = () => {
    if (cancelled) {
      window.removeEventListener('keydown', keyHandler);
      return;
    }
    if (idx >= INTRO_LINES.length) {
      introOverlay.classList.add('hidden');
      window.removeEventListener('keydown', keyHandler);
      gameState.set({ introSeen: true });
      enterGame(false);
      return;
    }
    const line = INTRO_LINES[idx];
    introText.innerHTML = '';
    if (line.speaker) {
      const sp = document.createElement('div');
      sp.className = 'speaker';
      sp.textContent = line.speaker;
      introText.appendChild(sp);
    }
    const textNode = document.createElement('div');
    textNode.textContent = line.text;
    introText.appendChild(textNode);
    idx++;
    setTimeout(next, line.pause);
  };
  next();
}

// ===== HUD =====
function renderHUD() {
  const s = gameState.get();
  const hw = gameState.getHardware();
  aiPointsEl.textContent = s.aiPoints.toFixed(2);
  gpuNameEl.textContent = hw.name;

  // Skills bar (abajo)
  skillsBarEl.innerHTML = '';
  SKILLS.forEach(skill => {
    const data = s.skills[skill.id];
    const chip = document.createElement('div');
    chip.className = 'skill-chip';
    chip.style.borderColor = skill.color;
    chip.innerHTML = `
      <div class="skill-chip-name">${skill.name}</div>
      <div class="skill-chip-level">Lv.${data.level}</div>
    `;
    skillsBarEl.appendChild(chip);
  });
}

// Animación de sumar puntos
function animatePoints(delta, targetSkillId) {
  aiPointsEl.classList.remove('pop');
  void aiPointsEl.offsetWidth; // reflow
  aiPointsEl.classList.add('pop');

  pointsFloater.textContent = `+${delta.toFixed(2)}${targetSkillId ? ' ' + (SKILLS.find(s=>s.id===targetSkillId)?.name || '') : ''}`;
  pointsFloater.classList.remove('hidden');
  // Posicionar relativo al aipoints
  const rect = aiPointsEl.getBoundingClientRect();
  pointsFloater.style.left = (rect.right + 20) + 'px';
  pointsFloater.style.top = rect.top + 'px';
  setTimeout(() => pointsFloater.classList.add('hidden'), 1200);
}

// ===== Panel de entrenamiento =====
function refreshHint() {
  if (!room) return;
  const near = room.isNearPC;
  const panelsOpen = !trainingPanel.classList.contains('hidden') || !minigameOverlay.classList.contains('hidden') || !pauseMenu.classList.contains('hidden') || !optionsPanel.classList.contains('hidden');
  interactionHint.classList.toggle('hidden', !near || panelsOpen || inMinigame || paused);
}

function openTrainingPanel() {
  sfx.interact();
  if (paused || inMinigame) return;
  if (document.pointerLockElement) document.exitPointerLock();
  renderSkillsGrid();
  trainingPanel.classList.remove('hidden');
  refreshHint();
}
function closeTrainingPanel() {
  sfx.click();
  trainingPanel.classList.add('hidden');
  refreshHint();
}

function renderSkillsGrid() {
  skillsGridEl.innerHTML = '';
  const s = gameState.get();
  SKILLS.forEach(skill => {
    const data = s.skills[skill.id];
    const card = document.createElement('button');
    card.className = 'skill-card';
    card.style.borderColor = skill.color;
    const progressPct = (data.exp / PROGRESSION.levelsForUp) * 100;
    card.innerHTML = `
      <div class="skill-card-icon">${skill.icon}</div>
      <div class="skill-card-name" style="color:${skill.color}">${skill.name}</div>
      <div class="skill-card-level">Nv.${data.level} · ${data.exp.toFixed(1)}/${PROGRESSION.levelsForUp}</div>
      <div class="skill-card-bar"><div class="skill-card-bar-fill" style="width:${progressPct}%; background:${skill.color}"></div></div>
    `;
    card.addEventListener('click', () => startMinigame(skill.id));
    card.addEventListener('mouseenter', () => sfx.hover());
    skillsGridEl.appendChild(card);
  });
}

// ===== Minijuegos =====
function startMinigame(skillId) {
  sfx.select();
  trainingPanel.classList.add('hidden');
  minigameOverlay.classList.remove('hidden');
  minigameContainer.innerHTML = '';
  inMinigame = true;
  refreshHint();

  const opts = {
    skillId,
    difficulty: selectedDifficulty
  };
  const mg = createMinigame(skillId, minigameContainer, opts);
  mg.start();
  mg.onComplete = (performance, reason) => {
    finishMinigame(skillId, performance, selectedDifficulty);
  };
}

function finishMinigame(skillId, performance, difficulty) {
  // Calcular puntos
  const hw = gameState.getHardware();
  let points;
  let success;

  if (difficulty === 'easy') {
    const base = skillId === 'general' ? PROGRESSION.basePointsGeneral : PROGRESSION.basePointsEasy;
    points = base * DIFFICULTY.easy.mult * performance * hw.multiplier;
    success = performance >= 0.25;
  } else {
    // Extremo: si performance es baja, se considera "fallo"
    const failThreshold = 0.3;
    if (performance < failThreshold) {
      const base = skillId === 'general' ? PROGRESSION.basePointsGeneral : PROGRESSION.basePointsEasy;
      const mult = DIFFICULTY.extreme.multRange[0];
      points = base * mult * PROGRESSION.failMult * hw.multiplier;
      success = false;
      sfx.fail();
    } else {
      const base = skillId === 'general' ? PROGRESSION.basePointsGeneral : PROGRESSION.basePointsEasy;
      const mult = DIFFICULTY.extreme.multRange[0] + Math.random() * (DIFFICULTY.extreme.multRange[1] - DIFFICULTY.extreme.multRange[0]);
      points = base * mult * performance * hw.multiplier;
      success = true;
      sfx.success();
    }
  }

  points = Math.round(points * 1000) / 1000;

  // Distribuir: si es general, repartir en todas; si no, a la skill específica
  const targetSkill = skillId === 'general' ? null : skillId;
  const gained = gameState.addAIPoints(points, targetSkill);
  if (skillId === 'general') {
    // Repartir un poquito en cada skill
    const perSkill = gained / SKILLS.length;
    SKILLS.forEach(sk => {
      gameState.get().skills[sk.id].exp += perSkill * 0.5;
      // (addAIPoints ya sumó aiPoints totales; aquí añadimos exp manual)
    });
  }

  animatePoints(gained, targetSkill);
  renderHUD();

  // Mostrar popup de recompensa
  setTimeout(() => {
    showRewardPopup(gained, targetSkill, success, performance);
  }, 300);
}

function showRewardPopup(gained, skillId, success, performance) {
  rewardTitle.textContent = success ? '¡Entrenamiento completado!' : 'La cagaste... pero algo aprendió';
  rewardValue.textContent = gained.toFixed(3);
  const skillName = skillId ? (SKILLS.find(s=>s.id===skillId)?.name || '') : 'Todas las áreas';
  rewardSkill.textContent = skillId ? `Habilidad: ${skillName}` : 'Habilidad: todas (entrenamiento general)';
  rewardPopup.classList.remove('hidden');
  setTimeout(() => {
    rewardPopup.classList.add('hidden');
    closeMinigame();
  }, 2200);
}

function closeMinigame() {
  inMinigame = false;
  minigameContainer.innerHTML = '';
  minigameOverlay.classList.add('hidden');
  // Volver a abrir el panel de entrenamiento (para que el usuario pueda seguir entrenando o salir)
  trainingPanel.classList.remove('hidden');
  renderSkillsGrid();
  refreshHint();
}

// ===== Pausa =====
function togglePause(force) {
  const shouldPause = force !== undefined ? force : !paused;
  if (inMinigame && shouldPause) return; // no pausar dentro de minijuegos
  paused = shouldPause;
  if (paused && document.pointerLockElement) document.exitPointerLock();
  pauseMenu.classList.toggle('hidden', !paused);
  refreshHint();
}

// ===== Opciones / Guardado =====
let autosaveTimer = null;
function startAutosave() {
  if (autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = setInterval(() => {
    gameState.save();
  }, PROGRESSION.autoSaveIntervalMs);
}

// ===== Bindings de UI =====
function bindUI() {
  btnNew.addEventListener('click', startNewGame);
  btnContinue.addEventListener('click', continueGame);
  btnOptions.addEventListener('click', () => { sfx.click(); optionsPanel.classList.remove('hidden'); creditsPanel.classList.add('hidden'); });
  btnCredits.addEventListener('click', () => { sfx.click(); creditsPanel.classList.remove('hidden'); optionsPanel.classList.add('hidden'); });
  $('#close-options').addEventListener('click', () => { sfx.click(); optionsPanel.classList.add('hidden'); });
  $('#close-credits').addEventListener('click', () => { sfx.click(); creditsPanel.classList.add('hidden'); });

  // Volúmenes
  const volMaster = $('#volume-master'), volSfx = $('#volume-sfx');
  volMaster.addEventListener('input', () => {
    setMasterVolume(parseInt(volMaster.value,10)/100);
    $('#volume-master-val').textContent = volMaster.value + '%';
  });
  volSfx.addEventListener('input', () => {
    setSfxVolume(parseInt(volSfx.value,10)/100);
    $('#volume-sfx-val').textContent = volSfx.value + '%';
    sfx.click();
  });

  // Borrar partida
  $('#btn-delete-save').addEventListener('click', async () => {
    if (confirm('¿Seguro que querés borrar la partida guardada? Esta acción no se puede deshacer.')) {
      await gameState.deleteSave();
      btnContinue.disabled = true;
      alert('Partida borrada. Volviendo al menú principal.');
      showMainMenu();
    }
  });

  // Entrenamiento
  $('#close-training').addEventListener('click', closeTrainingPanel);
  $('#btn-general-train').addEventListener('click', () => startMinigame('general'));
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDifficulty = btn.dataset.diff;
      sfx.click();
    });
  });

  // Pausa
  btnMenu.addEventListener('click', () => { sfx.click(); togglePause(); });
  $('#btn-resume').addEventListener('click', () => { sfx.click(); togglePause(false); });
  $('#btn-pause-options').addEventListener('click', () => { sfx.click(); optionsPanel.classList.remove('hidden'); pauseMenu.classList.add('hidden'); paused=false; });
  $('#btn-quit').addEventListener('click', () => {
    sfx.click();
    gameState.save();
    if (autosaveTimer) clearInterval(autosaveTimer);
    togglePause(false);
    showMainMenu();
  });

  // ESC para pausar
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (!mainMenu.classList.contains('hidden')) return;
      if (!trainingPanel.classList.contains('hidden')) { closeTrainingPanel(); return; }
      if (!optionsPanel.classList.contains('hidden')) { optionsPanel.classList.add('hidden'); return; }
      if (!creditsPanel.classList.contains('hidden')) { creditsPanel.classList.add('hidden'); return; }
      if (!inMinigame) togglePause();
    }
  });

  // Feedback de clic en botones
  document.addEventListener('click', (e) => {
    if (e.target.matches('button')) sfx.click();
  });

  gameState.subscribe(() => renderHUD());
}

init();
