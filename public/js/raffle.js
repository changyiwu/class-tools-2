// Raffle Sub-module State
let raffleState = {
  currentMode: 'wheel', // 'wheel', 'slot', 'cards'
  pool: [],            // Current eligible students remaining
  history: [],         // Drawn students: { name, time }
  isDrawing: false,
  lastWinner: null,
  
  // Wheel specific variables
  wheelAngle: 0,
  wheelSpeed: 0,
  wheelColors: []
};

let raffleActiveClassId = '';

// Canvas drawing context for wheel
let wheelCanvas = null;
let wheelCtx = null;
let wheelAnimFrame = null;

// Initialize raffle module on load
document.addEventListener('DOMContentLoaded', () => {
  wheelCanvas = document.getElementById('wheel-canvas');
  if (wheelCanvas) wheelCtx = wheelCanvas.getContext('2d');
  
  raffleActiveClassId = appState.activeClassId;
  loadRaffleState(raffleActiveClassId);

  document.getElementById('raffle-exclude-checkbox').addEventListener('change', saveRaffleState);

  registerClassChangeCallback((classId) => {
    if (classId === raffleActiveClassId) {
      resetRafflePool();
      return;
    }
    saveRaffleState(raffleActiveClassId);
    raffleActiveClassId = classId;
    loadRaffleState(classId);
  });
  
  registerViewSwitchCallback((viewName) => {
    if (viewName === 'raffle') {
      // Re-adjust layouts if canvas is visible
      if (raffleState.pool.length === 0) {
        resetRafflePool();
      } else {
        renderRaffleArena();
      }
    }
  });

});

function getRaffleStorageKey(classId = raffleActiveClassId) {
  return getClassScopedStorageKey('raffle', classId);
}

function loadRaffleState(classId) {
  const saved = readStoredJson(getRaffleStorageKey(classId), null);
  const students = getActiveStudents();
  const validStudents = new Set(students);

  if (saved) {
    raffleState.currentMode = ['wheel', 'slot', 'cards'].includes(saved.currentMode) ? saved.currentMode : 'wheel';
    raffleState.pool = Array.isArray(saved.pool)
      ? saved.pool.filter(name => typeof name === 'string' && validStudents.has(name))
      : [...students];
    raffleState.history = Array.isArray(saved.history)
      ? saved.history
        .filter(item => item && typeof item.name === 'string' && typeof item.time === 'string')
        .slice(0, 100)
      : [];
  } else {
    raffleState.currentMode = 'wheel';
    raffleState.pool = [...students];
    raffleState.history = [];
  }

  raffleState.isDrawing = false;
  raffleState.lastWinner = null;
  document.getElementById('raffle-exclude-checkbox').checked = Boolean(saved?.exclude);
  document.querySelectorAll('.raffle-mode-btn[data-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.mode === raffleState.currentMode);
  });
  document.getElementById('arena-wheel').style.display = raffleState.currentMode === 'wheel' ? 'block' : 'none';
  document.getElementById('arena-slot').style.display = raffleState.currentMode === 'slot' ? 'flex' : 'none';
  document.getElementById('arena-cards').style.display = raffleState.currentMode === 'cards' ? 'flex' : 'none';
  rebuildWheelColors();
  updateHistoryUI();
  renderRaffleArena();
}

function saveRaffleState(classId = raffleActiveClassId) {
  if (!classId) return;
  writeStoredJson(getRaffleStorageKey(classId), {
    currentMode: raffleState.currentMode,
    pool: raffleState.pool,
    history: raffleState.history,
    exclude: document.getElementById('raffle-exclude-checkbox')?.checked || false
  });
}

function rebuildWheelColors() {
  raffleState.wheelColors = raffleState.pool.map((_, index) => {
    const hue = (index * (360 / Math.max(1, raffleState.pool.length))) % 360;
    return `hsl(${hue}, 75%, 60%)`;
  });
}

function setRaffleMode(mode) {
  if (raffleState.isDrawing) return;
  raffleState.currentMode = mode;
  
  // Update UI active tab
  document.querySelectorAll('.raffle-mode-btn').forEach(btn => {
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Show active arena
  document.getElementById('arena-wheel').style.display = mode === 'wheel' ? 'block' : 'none';
  document.getElementById('arena-slot').style.display = mode === 'slot' ? 'flex' : 'none';
  document.getElementById('arena-cards').style.display = mode === 'cards' ? 'flex' : 'none';
  
  renderRaffleArena();
  saveRaffleState();
}

function resetRafflePool() {
  const students = getActiveStudents();
  raffleState.pool = [...students];
  rebuildWheelColors();
  saveRaffleState();
  renderRaffleArena();
}

function renderRaffleArena() {
  if (raffleState.currentMode === 'wheel') {
    drawWheel();
  } else if (raffleState.currentMode === 'slot') {
    setupSlotItems();
  } else if (raffleState.currentMode === 'cards') {
    setupCards();
  }
}

// ==========================================
// 1. WHEEL OF FORTUNE DRAWING
// ==========================================
function drawWheel() {
  if (!wheelCtx || !wheelCanvas) return;
  
  const width = wheelCanvas.width;
  const height = wheelCanvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 15;
  
  wheelCtx.clearRect(0, 0, width, height);
  
  const colorTextMuted = getCssVariableColor('--text-muted', '#8b9bb4');
  const colorTextMain = getCssVariableColor('--text-main', '#f8fafc');
  const colorAccentSecondary = getCssVariableColor('--accent-secondary', '#06b6d4');

  const len = raffleState.pool.length;
  if (len === 0) {
    // Empty state
    wheelCtx.fillStyle = 'rgba(255,255,255,0.08)';
    wheelCtx.beginPath();
    wheelCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    wheelCtx.fill();
    wheelCtx.strokeStyle = 'rgba(255,255,255,0.2)';
    wheelCtx.lineWidth = 2;
    wheelCtx.stroke();
    
    wheelCtx.fillStyle = colorTextMuted;
    wheelCtx.font = '16px Outfit, sans-serif';
    wheelCtx.textAlign = 'center';
    wheelCtx.textBaseline = 'middle';
    wheelCtx.fillText('請先在設定中輸入名單', cx, cy);
    return;
  }
  
  const arcSize = (Math.PI * 2) / len;
  
  // Draw slices
  for (let i = 0; i < len; i++) {
    const angle = raffleState.wheelAngle + i * arcSize;
    wheelCtx.fillStyle = raffleState.wheelColors[i % raffleState.wheelColors.length];
    
    wheelCtx.beginPath();
    wheelCtx.moveTo(cx, cy);
    wheelCtx.arc(cx, cy, radius, angle, angle + arcSize);
    wheelCtx.closePath();
    wheelCtx.fill();
    
    // Draw divider lines
    wheelCtx.strokeStyle = 'rgba(18, 22, 33, 0.4)';
    wheelCtx.lineWidth = 1.5;
    wheelCtx.stroke();
    
    // Draw text labels
    wheelCtx.save();
    wheelCtx.fillStyle = '#121621'; // Dark text on bright slices
    wheelCtx.font = 'bold 15px Outfit, sans-serif';
    wheelCtx.textAlign = 'right';
    wheelCtx.textBaseline = 'middle';
    
    // Position text in the middle of slice
    wheelCtx.translate(cx, cy);
    wheelCtx.rotate(angle + arcSize / 2);
    wheelCtx.fillText(raffleState.pool[i], radius - 25, 0);
    wheelCtx.restore();
  }
  
  // Draw center hub
  wheelCtx.fillStyle = '#1a1f2c';
  wheelCtx.beginPath();
  wheelCtx.arc(cx, cy, 35, 0, Math.PI * 2);
  wheelCtx.fill();
  
  wheelCtx.strokeStyle = colorAccentSecondary;
  wheelCtx.lineWidth = 3;
  wheelCtx.stroke();
  
  // Inner core decor
  wheelCtx.fillStyle = colorTextMain;
  wheelCtx.beginPath();
  wheelCtx.arc(cx, cy, 10, 0, Math.PI * 2);
  wheelCtx.fill();
}

function spinWheel() {
  if (raffleState.pool.length === 0) return;
  
  // Start config
  raffleState.isDrawing = true;
  document.getElementById('btn-spin').disabled = true;
  
  // Spin physics
  let rotationSpeed = Math.random() * 0.3 + 0.4; // Initial velocity rad/frame
  let friction = 0.985; // Deceleration rate
  
  let lastTickAngle = raffleState.wheelAngle;
  const sliceAngle = (Math.PI * 2) / raffleState.pool.length;
  
  function anim() {
    raffleState.wheelAngle += rotationSpeed;
    rotationSpeed *= friction;
    
    // Play sound click when boundary crossed
    const totalSlicesCrossed = Math.floor(raffleState.wheelAngle / sliceAngle);
    const lastSlicesCrossed = Math.floor(lastTickAngle / sliceAngle);
    if (totalSlicesCrossed !== lastSlicesCrossed) {
      playSynthSound('tick');
    }
    lastTickAngle = raffleState.wheelAngle;
    
    drawWheel();
    
    if (rotationSpeed > 0.0015) {
      wheelAnimFrame = requestAnimationFrame(anim);
    } else {
      // Finished Spin
      cancelAnimationFrame(wheelAnimFrame);
      finishDraw();
    }
  }
  
  anim();
}

function getWheelWinner() {
  const len = raffleState.pool.length;
  if (len === 0) return null;
  
  const arcSize = (Math.PI * 2) / len;
  
  // Wheel rotates clockwise. Pointer is at the top (angle = -Math.PI / 2).
  // Find which slice overlaps with -Math.PI / 2
  let normalizedAngle = (-raffleState.wheelAngle - Math.PI / 2) % (Math.PI * 2);
  if (normalizedAngle < 0) {
    normalizedAngle += Math.PI * 2;
  }
  
  const winnerIndex = Math.floor(normalizedAngle / arcSize) % len;
  return {
    index: winnerIndex,
    name: raffleState.pool[winnerIndex]
  };
}

// ==========================================
// 2. SLOT MACHINE DRAWING
// ==========================================
function setupSlotItems() {
  const wrapper = document.getElementById('slot-wrapper');
  wrapper.replaceChildren();
  wrapper.style.transform = 'translateY(0px)';
  
  if (raffleState.pool.length === 0) {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'slot-item';
    emptyItem.textContent = '無名單';
    wrapper.appendChild(emptyItem);
    return;
  }
  
  // Fill in default display
  const item = document.createElement('div');
  item.className = 'slot-item';
  item.innerText = '❓';
  wrapper.appendChild(item);
}

function spinSlot() {
  const wrapper = document.getElementById('slot-wrapper');
  const pool = raffleState.pool;
  const len = pool.length;
  if (len === 0) return;
  
  raffleState.isDrawing = true;
  document.getElementById('btn-spin').disabled = true;
  
  // Generate random rolling path (around 30-40 elements scroll)
  const spins = 30 + Math.floor(Math.random() * 20);
  const scrollItems = [];
  
  for (let i = 0; i < spins; i++) {
    scrollItems.push(pool[i % len]);
  }
  
  // Insert elements to DOM
  wrapper.replaceChildren();
  scrollItems.forEach(name => {
    const el = document.createElement('div');
    el.className = 'slot-item';
    el.innerText = name;
    wrapper.appendChild(el);
  });
  
  // Animate scrolling with custom easing in JS
  let currentY = 0;
  const targetY = -(spins - 1) * 120; // 120px height per item
  let progress = 0;
  const duration = 4000; // 4s
  const start = performance.now();
  
  let lastItemIndex = 0;
  
  function step(timestamp) {
    progress = timestamp - start;
    let t = Math.min(progress / duration, 1);
    
    // Easing Out Cubic: t => 1 - (1 - t)^3
    const easing = 1 - Math.pow(1 - t, 3.5);
    currentY = targetY * easing;
    wrapper.style.transform = `translateY(${currentY}px)`;
    
    // Tick sound based on item index passed
    const currentItemIndex = Math.floor(-currentY / 120);
    if (currentItemIndex !== lastItemIndex) {
      playSynthSound('tick');
      lastItemIndex = currentItemIndex;
    }
    
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      // Find final item
      const winnerName = scrollItems[spins - 1];
      const winnerIndex = pool.indexOf(winnerName);
      
      raffleState.lastWinner = {
        index: winnerIndex,
        name: winnerName
      };
      
      finishDraw();
    }
  }
  
  requestAnimationFrame(step);
}

// ==========================================
// 3. MYSTERY CARDS DRAWING
// ==========================================
function setupCards() {
  const container = document.getElementById('arena-cards');
  container.replaceChildren();
  
  const pool = raffleState.pool;
  if (pool.length === 0) {
    const emptyState = document.createElement('p');
    emptyState.className = 'raffle-empty-state';
    emptyState.textContent = '請先在設定中輸入名單';
    container.appendChild(emptyState);
    return;
  }
  
  pool.forEach((name, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'flip-card';
    card.setAttribute('data-index', index);
    card.setAttribute('aria-label', `翻開第 ${index + 1} 張神秘卡牌`);

    const inner = document.createElement('span');
    inner.className = 'flip-card-inner';
    const front = document.createElement('span');
    front.className = 'flip-card-front';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-question';
    icon.setAttribute('aria-hidden', 'true');
    front.appendChild(icon);
    const back = document.createElement('span');
    back.className = 'flip-card-back';
    back.textContent = name;
    inner.append(front, back);
    card.appendChild(inner);
    
    card.addEventListener('click', () => selectCard(card, index, name));
    container.appendChild(card);
  });
}

function selectCard(cardElement, index, name) {
  if (raffleState.isDrawing || cardElement.classList.contains('flipped')) return;
  
  // Set drawing locks
  raffleState.isDrawing = true;
  document.getElementById('btn-spin').disabled = true;
  
  cardElement.classList.add('flipped');
  
  // Set winner details
  raffleState.lastWinner = {
    index: index,
    name: name
  };
  
  setTimeout(() => {
    finishDraw();
  }, 700);
}

// ==========================================
// MAIN CONTROLLER FUNCTIONS
// ==========================================
function startRaffleDraw() {
  if (raffleState.isDrawing) return;
  
  const len = raffleState.pool.length;
  if (len === 0) {
    showCustomModal('中籤通知', '目前的抽籤名單已經沒有學生了。是否重置名單並繼續抽籤？', true).then(confirmed => {
      if (confirmed) {
        resetRafflePool();
      }
    });
    return;
  }
  
  // Trigger animations based on mode
  if (raffleState.currentMode === 'wheel') {
    spinWheel();
  } else if (raffleState.currentMode === 'slot') {
    spinSlot();
  } else if (raffleState.currentMode === 'cards') {
    // In cards mode, the user has to click a card to draw.
    // So "Start Draw" button acts as card shuffling visual cue.
    animateCardShuffle();
  }
}

function animateCardShuffle() {
  const cards = document.querySelectorAll('.flip-card');
  if (cards.length === 0) return;
  
  raffleState.isDrawing = true;
  document.getElementById('btn-spin').disabled = true;
  
  // Add a shake animation to cards
  playSynthSound('tick');
  
  cards.forEach(card => {
    card.style.transform = `scale(0.9) translate(${Math.random()*20-10}px, ${Math.random()*20-10}px)`;
    card.style.transition = 'transform 0.15s ease';
  });
  
  setTimeout(() => {
    cards.forEach(card => {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
    });
    
    raffleState.isDrawing = false;
    showCustomModal('卡牌洗牌完成', '請點擊畫面上任意一張問號卡牌來翻開中籤學生！');
  }, 400);
}

function finishDraw() {
  let winner = null;
  if (raffleState.currentMode === 'wheel') {
    winner = getWheelWinner();
  } else {
    winner = raffleState.lastWinner;
  }
  
  if (!winner) {
    raffleState.isDrawing = false;
    document.getElementById('btn-spin').disabled = false;
    return;
  }
  
  // Play major winning synthesis chord
  playSynthSound('win');
  raffleState.lastWinner = { index: winner.index, name: winner.name };
  
  // Add Confetti explosion!
  if (window.confetti) {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
  
  // Show Winner Overlay
  document.getElementById('winner-name-lbl').innerText = winner.name;
  document.querySelector('.winner-title').textContent = '🎉 恭喜中籤者 🎉';
  populateWinnerScoreControls();
  document.getElementById('winner-display').style.display = 'flex';
  
  // Add to history list
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  raffleState.history.unshift({
    name: winner.name,
    time: timeStr
  });
  updateHistoryUI();
  
  // Exclude option check
  const excludeChecked = document.getElementById('raffle-exclude-checkbox').checked;
  if (excludeChecked) {
    raffleState.pool.splice(winner.index, 1);
    // Remove matching index from HSL colors list to maintain alignment
    if (raffleState.wheelColors.length > 0) {
      raffleState.wheelColors.splice(winner.index, 1);
    }
  }
  
  raffleState.isDrawing = false;
  saveRaffleState();
}

function populateWinnerScoreControls() {
  const actions = document.getElementById('winner-score-actions');
  const teamSelect = document.getElementById('winner-score-team-select');
  const teams = typeof getScoreboardTeams === 'function' ? getScoreboardTeams() : [];
  teamSelect.replaceChildren();
  actions.hidden = teams.length === 0;
  teams.forEach(team => {
    const option = document.createElement('option');
    option.value = team.id;
    option.textContent = team.name;
    teamSelect.appendChild(option);
  });
}

function awardWinnerScore() {
  const teamId = document.getElementById('winner-score-team-select').value;
  const amount = Number.parseInt(document.getElementById('winner-score-amount-select').value, 10);
  if (!teamId || !Number.isFinite(amount) || !raffleState.lastWinner) return;
  const team = getScoreboardTeams().find(item => item.id === teamId);
  adjustTeamScore(teamId, amount, `抽中 ${raffleState.lastWinner.name}`);
  document.querySelector('.winner-title').textContent = `已替${team?.name || '小組'}加 ${amount} 分`;
}

function closeWinnerOverlay() {
  document.getElementById('winner-display').style.display = 'none';
  document.getElementById('btn-spin').disabled = false;
  
  // Reload arena layout (updates wheel slices, or resets card flip)
  renderRaffleArena();
}

function updateHistoryUI() {
  const container = document.getElementById('raffle-history-list');
  container.replaceChildren();
  
  if (raffleState.history.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'history-empty-state';
    emptyState.textContent = '尚無抽籤紀錄';
    container.appendChild(emptyState);
    return;
  }
  
  raffleState.history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    const name = document.createElement('span');
    name.className = 'history-item-name';
    name.textContent = item.name;
    const time = document.createElement('span');
    time.className = 'history-item-time';
    time.textContent = item.time;
    el.append(name, time);
    container.appendChild(el);
  });
}

function clearRaffleHistory() {
  raffleState.history = [];
  saveRaffleState();
  updateHistoryUI();
}
