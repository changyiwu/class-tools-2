// Global Application State
let appState = {
  classes: [],          // Array of { id, name, students: [] }
  activeClassId: '',    // Currently selected class ID
  soundEnabled: true,
  currentView: 'raffle'
};

const CLASS_SCOPED_VIEWS = new Set(['raffle', 'groups', 'seating']);

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
let modalPreviousFocus = null;

function showCustomModal(title, bodyContent, showCancelBtn = false) {
  return new Promise((resolve) => {
    const modal = document.getElementById('alert-modal');
    const modalBody = document.getElementById('alert-modal-body');
    const okBtn = document.getElementById('alert-modal-ok-btn');
    document.getElementById('alert-modal-header').textContent = title;
    modalBody.replaceChildren();

    if (bodyContent instanceof Node) {
      modalBody.appendChild(bodyContent);
    } else {
      modalBody.textContent = String(bodyContent);
    }
    
    const cancelBtn = document.getElementById('alert-modal-cancel-btn');
    if (showCancelBtn) {
      cancelBtn.style.display = 'inline-flex';
    } else {
      cancelBtn.style.display = 'none';
    }
    
    modalPreviousFocus = document.activeElement;
    modal.hidden = false;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    modalResolveFn = resolve;

    requestAnimationFrame(() => {
      const firstInput = modal.querySelector('input, select, textarea');
      (firstInput || okBtn).focus();
    });
  });
}

function closeAlertModal(confirmed) {
  const modal = document.getElementById('alert-modal');
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  modal.hidden = true;
  if (modalResolveFn) {
    modalResolveFn(confirmed);
    modalResolveFn = null;
  }
  if (modalPreviousFocus && typeof modalPreviousFocus.focus === 'function') {
    modalPreviousFocus.focus();
  }
  modalPreviousFocus = null;
}

function handleModalKeyboard(event) {
  const modal = document.getElementById('alert-modal');
  if (!modal.classList.contains('active')) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeAlertModal(false);
    return;
  }

  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.hidden && element.offsetParent !== null);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// Local Storage Handlers
const STORAGE_KEYS = {
  CLASSES: 'classhub_classes',
  ACTIVE_CLASS_ID: 'classhub_active_class_id',
  SOUND_ENABLED: 'classhub_sound_enabled'
};

function getClassScopedStorageKey(feature, classId = appState.activeClassId) {
  return `classhub_${feature}_${classId}`;
}

function readStoredJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`無法讀取本機資料：${key}`, error);
    return fallback;
  }
}

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`無法儲存本機資料：${key}`, error);
    return false;
  }
}

const DEFAULT_CLASSES = [
  {
    id: 'class_universal',
    name: '通用班級',
    students: Array.from({ length: 30 }, (_, i) => `${i + 1}號`)
  },
  {
    id: 'class_1',
    name: '晨光班（範例）',
    students: [
      '林若晴', '陳宇安', '王品妍', '李承恩', '張語彤',
      '黃柏勳', '吳欣怡', '劉冠廷', '蔡雨潔', '楊子謙',
      '許庭瑄', '鄭凱文', '謝宛庭', '洪睿哲', '郭心瑜',
      '曾彥廷', '邱雅涵', '何俊佑', '羅以柔', '蘇哲宇'
    ]
  },
  {
    id: 'class_2',
    name: '星河班（範例）',
    students: [
      '周映彤', '徐皓宇', '葉思妤', '潘昱辰', '朱芷晴',
      '江祐翔', '戴佳蓉', '彭奕凡', '范庭羽', '姚冠宇',
      '宋可欣', '杜柏翰', '廖語芯', '魏子翔', '梁心妍'
    ]
  }
];

const LEGACY_SAMPLE_NAMES = {
  class_1: ['王小明', '李小華', '張大同', '陳美麗', '黃春嬌', '趙鐵雄', '錢進步', '孫悟空', '周杰倫', '蔡依林', '吳克群', '楊丞琳', '羅志祥', '蕭敬騰', '林俊傑', '鄧紫棋', '周興哲', '田馥甄', '許光漢', '柯佳嬿'],
  class_2: ['陳大為', '林冠宇', '張雨軒', '李芷葳', '黃柏睿', '曾子晴', '徐哲維', '徐若瑄', '江宏傑', '福原愛', '王力宏', '陶喆', '周華健', '張惠妹', '五月天']
};

function migrateLegacySampleClasses() {
  let changed = false;
  ['class_1', 'class_2'].forEach(id => {
    const existing = appState.classes.find(classInfo => classInfo.id === id);
    const replacement = DEFAULT_CLASSES.find(classInfo => classInfo.id === id);
    if (!existing || !replacement) return;
    const legacyStudents = LEGACY_SAMPLE_NAMES[id];
    if (JSON.stringify(existing.students) === JSON.stringify(legacyStudents)) {
      existing.name = replacement.name;
      existing.students = [...replacement.students];
      changed = true;
    }
  });
  if (changed) saveClassesToStorage();
}

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
  } else {
    // Migration: 確保「通用班級」(1-30 號) 存在於現有的 LocalStorage 列表中
    const hasUniversal = appState.classes.some(c => c.id === 'class_universal' || c.name === '通用班級');
    if (!hasUniversal) {
      const universalClass = {
        id: 'class_universal',
        name: '通用班級',
        students: Array.from({ length: 30 }, (_, i) => `${i + 1}號`)
      };
      appState.classes.unshift(universalClass);
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(appState.classes));
    }
  }
  migrateLegacySampleClasses();
  
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
  select.replaceChildren();
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
  const icon = document.createElement('i');
  icon.setAttribute('aria-hidden', 'true');
  if (appState.soundEnabled) {
    icon.className = 'fa-solid fa-volume-high';
    btn.style.color = 'var(--accent-secondary)';
    btn.style.border = '1px solid var(--accent-secondary)';
    btn.style.boxShadow = 'var(--shadow-neon)';
    btn.setAttribute('aria-label', '關閉操作音效');
    btn.setAttribute('aria-pressed', 'true');
  } else {
    icon.className = 'fa-solid fa-volume-xmark';
    btn.style.color = 'var(--text-muted)';
    btn.style.border = '1px solid var(--border-color)';
    btn.style.boxShadow = 'none';
    btn.setAttribute('aria-label', '開啟操作音效');
    btn.setAttribute('aria-pressed', 'false');
  }
  btn.replaceChildren(icon);
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
    const button = li.querySelector('.nav-button');
    if (li.getAttribute('data-view') === viewName) {
      li.classList.add('active');
      button?.setAttribute('aria-current', 'page');
    } else {
      li.classList.remove('active');
      button?.removeAttribute('aria-current');
    }
  });
  
  // Update Title text
  document.getElementById('current-view-title').textContent = viewTitleMap[viewName] || '班級工具箱';
  
  // Switch Visible Container
  document.querySelectorAll('main .container').forEach(c => {
    if (c.id === `view-${viewName}`) {
      c.classList.add('active');
      c.setAttribute('aria-hidden', 'false');
    } else {
      c.classList.remove('active');
      c.setAttribute('aria-hidden', 'true');
    }
  });

  updateHeaderClassContext(viewName);

  // Mobile navigation close
  const sidebar = document.getElementById('sidebar');
  const ham = document.getElementById('hamburger-toggle');
  if (sidebar.classList.contains('active')) {
    sidebar.classList.remove('active');
    ham.classList.remove('active');
    ham.setAttribute('aria-expanded', 'false');
    ham.setAttribute('aria-label', '開啟功能選單');
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
  const isOpen = sidebar.classList.contains('active');
  ham.setAttribute('aria-expanded', String(isOpen));
  ham.setAttribute('aria-label', isOpen ? '關閉功能選單' : '開啟功能選單');
}

function updateHeaderClassContext(viewName) {
  const classContext = document.getElementById('header-class-context');
  const header = document.querySelector('header');
  const shouldShow = CLASS_SCOPED_VIEWS.has(viewName);
  classContext.hidden = !shouldShow;
  header.classList.toggle('no-class-context', !shouldShow);
}

let appToastTimeout = null;

function showAppToast(message, duration = 3000) {
  const toast = document.getElementById('app-toast');
  if (!toast) return;
  window.clearTimeout(appToastTimeout);
  toast.textContent = message;
  toast.hidden = false;
  appToastTimeout = window.setTimeout(() => {
    toast.hidden = true;
  }, duration);
}

async function downloadElementAsImage(element, fileName) {
  if (!element || typeof window.html2canvas !== 'function') {
    await showCustomModal('下載失敗', '圖片匯出元件尚未載入，請重新整理後再試一次。');
    return;
  }

  try {
    showAppToast('正在產生圖片…', 30000);
    const canvas = await window.html2canvas(element, {
      backgroundColor: '#0a081c',
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true
    });
    const imageBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('無法建立圖片檔案'));
      }, 'image/png');
    });
    const objectUrl = URL.createObjectURL(imageBlob);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = objectUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    showAppToast('圖片已開始下載');
  } catch (error) {
    console.error('圖片下載失敗', error);
    await showCustomModal('下載失敗', '無法產生圖片，請稍後再試。');
  }
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

// Helper to get CSS Custom Property color for Canvas
function getCssVariableColor(varName, fallbackColor) {
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val || fallbackColor;
  } catch (e) {
    return fallbackColor;
  }
}

// Initialize on document loaded
document.addEventListener('DOMContentLoaded', () => {
  initLocalStorageData();
  updateHeaderClassDropdown();
  updateSoundButtonUI();
  updateHeaderClassContext(appState.currentView);
  document.addEventListener('keydown', handleModalKeyboard);
  document.querySelectorAll('main .container').forEach(container => {
    container.setAttribute('aria-hidden', String(!container.classList.contains('active')));
  });
  document.querySelector('#sidebar .nav-item.active .nav-button')?.setAttribute('aria-current', 'page');
  
  // Allow sound initialization after user interaction
  document.body.addEventListener('click', () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, { once: true });
});
