// Global Application State
let appState = {
  classes: [],          // Array of { id, name, students: [] }
  activeClassId: '',    // Currently selected class ID
  soundEnabled: true,
  currentView: 'raffle'
};

// Web Audio API Sound Generator
let audioCtx = null;
function playSynthSound(type) {
  if (!appState.soundEnabled) return;
  
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'tick') {
      // Short high pitch click for wheel spins
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'win') {
      // Arpeggio / Cheer sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(261.63, now); // C4
      osc.frequency.setValueAtTime(329.63, now + 0.1); // E4
      osc.frequency.setValueAtTime(392.00, now + 0.2); // G4
      osc.frequency.setValueAtTime(523.25, now + 0.3); // C5
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      
      osc.start(now);
      osc.stop(now + 0.8);
      
      // Add a second harmony osc for richer sound
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now); // C5
      osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc2.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc2.frequency.setValueAtTime(1046.50, now + 0.3); // C6
      gain2.gain.setValueAtTime(0.1, now);
      gain2.gain.linearRampToValueAtTime(0.1, now + 0.4);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc2.start(now);
      osc2.stop(now + 0.8);
    } else if (type === 'alarm') {
      // Buzzer warning sound
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.3);
      osc.frequency.linearRampToValueAtTime(180, now + 0.6);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'beep') {
      // High pitch warning beep (for timer end)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (err) {
    console.error("Audio generation failed: ", err);
  }
}

// Custom Promise-based Alert/Confirm Modal System
let modalResolveFn = null;
function showCustomModal(title, bodyText, showCancelBtn = false) {
  return new Promise((resolve) => {
    document.getElementById('alert-modal-header').innerText = title;
    document.getElementById('alert-modal-body').innerHTML = bodyText;
    
    const cancelBtn = document.getElementById('alert-modal-cancel-btn');
    if (showCancelBtn) {
      cancelBtn.style.display = 'inline-flex';
    } else {
      cancelBtn.style.display = 'none';
    }
    
    document.getElementById('alert-modal').classList.add('active');
    modalResolveFn = resolve;
  });
}

function closeAlertModal(confirmed) {
  document.getElementById('alert-modal').classList.remove('active');
  if (modalResolveFn) {
    modalResolveFn(confirmed);
    modalResolveFn = null;
  }
}

// Local Storage Handlers
const STORAGE_KEYS = {
  CLASSES: 'classhub_classes',
  ACTIVE_CLASS_ID: 'classhub_active_class_id',
  SOUND_ENABLED: 'classhub_sound_enabled'
};

const DEFAULT_CLASSES = [
  {
    id: 'class_1',
    name: '三年一班 (範例)',
    students: [
      '王小明', '李小華', '張大同', '陳美麗', '黃春嬌', 
      '趙鐵雄', '錢進步', '孫悟空', '周杰倫', '蔡依林', 
      '吳克群', '楊丞琳', '羅志祥', '蕭敬騰', '林俊傑', 
      '鄧紫棋', '周興哲', '田馥甄', '許光漢', '柯佳嬿'
    ]
  },
  {
    id: 'class_2',
    name: '三年二班 (範例)',
    students: [
      '陳大為', '林冠宇', '張雨軒', '李芷葳', '黃柏睿',
      '曾子晴', '許哲維', '徐若瑄', '江宏傑', '福原愛',
      '王力宏', '陶喆', '周華健', '張惠妹', '五月天'
    ]
  }
];

function initLocalStorageData() {
  // 1. Classes List
  try {
    const storedClasses = localStorage.getItem(STORAGE_KEYS.CLASSES);
    if (storedClasses) {
      appState.classes = JSON.parse(storedClasses);
    }
  } catch (e) {
    console.error("Failed to parse stored classes", e);
  }
  
  if (!Array.isArray(appState.classes) || appState.classes.length === 0) {
    appState.classes = DEFAULT_CLASSES;
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(DEFAULT_CLASSES));
  }
  
  // 2. Active Class ID
  try {
    const storedActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLASS_ID);
    if (storedActiveId && appState.classes.find(c => c.id === storedActiveId)) {
      appState.activeClassId = storedActiveId;
    } else {
      appState.activeClassId = appState.classes[0].id;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLASS_ID, appState.activeClassId);
    }
  } catch (e) {
    console.error("Failed to set active class ID", e);
    appState.activeClassId = appState.classes[0].id;
  }
  
  // 3. Sound Enabled
  const storedSound = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
  if (storedSound !== null) {
    appState.soundEnabled = storedSound === 'true';
  } else {
    appState.soundEnabled = true;
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, 'true');
  }
}

function saveClassesToStorage() {
  localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(appState.classes));
}

// UI State Updates
function updateHeaderClassDropdown() {
  const select = document.getElementById('header-class-select');
  select.innerHTML = '';
  appState.classes.forEach(cls => {
    const opt = document.createElement('option');
    opt.value = cls.id;
    opt.innerText = cls.name;
    opt.selected = cls.id === appState.activeClassId;
    select.appendChild(opt);
  });
}

function changeActiveGlobalClass(classId) {
  appState.activeClassId = classId;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_CLASS_ID, classId);
  
  // Trigger lifecycle functions for individual sub-modules
  // These will be defined in their respective files.
  if (window.onClassChanged) {
    window.onClassChanged(classId);
  }
}

function toggleGlobalSound() {
  appState.soundEnabled = !appState.soundEnabled;
  localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, appState.soundEnabled.toString());
  updateSoundButtonUI();
}

function updateSoundButtonUI() {
  const btn = document.getElementById('sound-toggle-btn');
  if (appState.soundEnabled) {
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    btn.style.color = 'var(--accent-secondary)';
    btn.style.border = '1px solid var(--accent-secondary)';
    btn.style.boxShadow = 'var(--shadow-neon)';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    btn.style.color = 'var(--text-muted)';
    btn.style.border = '1px solid var(--border-color)';
    btn.style.boxShadow = 'none';
  }
}

// Router & View Switcher
const viewTitleMap = {
  'raffle': '幸運大抽籤',
  'noise': '班級噪音計',
  'groups': '隨機分組',
  'seating': '隨機座位表',
  'timer': '計時器與碼表',
  'scoreboard': '團隊計分板',
  'manager': '名單管理與設定'
};

function switchView(viewName) {
  appState.currentView = viewName;
  
  // Update UI Sidebar Active state
  document.querySelectorAll('#sidebar .nav-links li').forEach(li => {
    if (li.getAttribute('data-view') === viewName) {
      li.classList.add('active');
    } else {
      li.classList.remove('active');
    }
  });
  
  // Update Title text
  document.getElementById('current-view-title').innerText = viewTitleMap[viewName] || 'ClassHub';
  
  // Switch Visible Container
  document.querySelectorAll('main .container').forEach(c => {
    if (c.id === `view-${viewName}`) {
      c.classList.add('active');
    } else {
      c.classList.remove('active');
    }
  });

  // Mobile navigation close
  const sidebar = document.getElementById('sidebar');
  const ham = document.getElementById('hamburger-toggle');
  if (sidebar.classList.contains('active')) {
    sidebar.classList.remove('active');
    ham.classList.remove('active');
  }
  
  // Trigger sub-module specific initialization when navigated to
  if (window.onViewSwitched) {
    window.onViewSwitched(viewName);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const ham = document.getElementById('hamburger-toggle');
  sidebar.classList.toggle('active');
  ham.classList.toggle('active');
}

// Get students of the currently active class
function getActiveStudents() {
  const activeClass = appState.classes.find(c => c.id === appState.activeClassId);
  return activeClass ? [...activeClass.students] : [];
}

// Global Class Change hook registry
let classChangeCallbacks = [];
window.onClassChanged = function(classId) {
  classChangeCallbacks.forEach(cb => {
    try { cb(classId); } catch (e) { console.error(e); }
  });
};

function registerClassChangeCallback(cb) {
  classChangeCallbacks.push(cb);
}

// Global View Switch hook registry
let viewSwitchCallbacks = [];
window.onViewSwitched = function(viewName) {
  viewSwitchCallbacks.forEach(cb => {
    try { cb(viewName); } catch (e) { console.error(e); }
  });
};

function registerViewSwitchCallback(cb) {
  viewSwitchCallbacks.push(cb);
}

// Initialize on document loaded
document.addEventListener('DOMContentLoaded', () => {
  initLocalStorageData();
  updateHeaderClassDropdown();
  updateSoundButtonUI();
  
  // Allow sound initialization after user interaction
  document.body.addEventListener('click', () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, { once: true });
});
