// Raffle Sub-module State
let raffleState = {
  currentMode: 'wheel', // 'wheel', 'slot', 'cards'
  pool: [],            // Current eligible students remaining
  history: [],         // Drawn students: { name, time }
  isDrawing: false,
  
  // Wheel specific variables
  wheelAngle: 0,
  wheelSpeed: 0,
  wheelColors: []
};

// Canvas drawing context for wheel
let wheelCanvas = null;
let wheelCtx = null;
let wheelAnimFrame = null;

// Initialize raffle module on load
document.addEventListener('DOMContentLoaded', () => {
  wheelCanvas = document.getElementById('wheel-canvas');
  if (wheelCanvas) wheelCtx = wheelCanvas.getContext('2d');
  
  // Register callbacks
  registerClassChangeCallback((classId) => {
    resetRafflePool();
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

  // Init local pool
  resetRafflePool();
});

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
}

function resetRafflePool() {
  const students = getActiveStudents();
  raffleState.pool = [...students];
  
  // Populate HSL colors for each student in the pool
  raffleState.wheelColors = [];
  for (let i = 0; i < students.length; i++) {
    const hue = (i * (360 / Math.max(1, students.length))) % 360;
    raffleState.wheelColors.push(`hsl(${hue}, 75%, 60%)`);
  }
  
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
    
    wheelCtx.fillStyle = 'var(--text-muted)';
    wheelCtx.font = '16px var(--font-primary)';
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
    wheelCtx.font = 'bold 15px var(--font-primary)';
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
  
  wheelCtx.strokeStyle = 'var(--accent-secondary)';
  wheelCtx.lineWidth = 3;
  wheelCtx.stroke();
  
  // Inner core decor
  wheelCtx.fillStyle = 'var(--text-main)';
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
  wrapper.innerHTML = '';
  wrapper.style.transform = 'translateY(0px)';
  
  if (raffleState.pool.length === 0) {
    wrapper.innerHTML = '<div class="slot-item">無名單</div>';
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
  wrapper.innerHTML = '';
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
  container.innerHTML = '';
  
  const pool = raffleState.pool;
  if (pool.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted)">請先在設定中輸入名單</p>';
    return;
  }
  
  pool.forEach((name, index) => {
    const card = document.createElement('div');
    card.className = 'flip-card';
    card.setAttribute('data-index', index);
    
    card.innerHTML = `
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <i class="fa-solid fa-question"></i>
        </div>
        <div class="flip-card-back">
          ${name}
        </div>
      </div>
    `;
    
    card.onclick = () => selectCard(card, index, name);
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
}

function closeWinnerOverlay() {
  document.getElementById('winner-display').style.display = 'none';
  document.getElementById('btn-spin').disabled = false;
  
  // Reload arena layout (updates wheel slices, or resets card flip)
  renderRaffleArena();
}

function updateHistoryUI() {
  const container = document.getElementById('raffle-history-list');
  container.innerHTML = '';
  
  if (raffleState.history.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px;">尚無抽籤紀錄</div>';
    return;
  }
  
  raffleState.history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <span class="history-item-name">${item.name}</span>
      <span class="history-item-time">${item.time}</span>
    `;
    container.appendChild(el);
  });
}

function clearRaffleHistory() {
  raffleState.history = [];
  updateHistoryUI();
}
