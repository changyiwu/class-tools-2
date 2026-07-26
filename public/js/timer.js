// Timer & Stopwatch Module State
let timerState = {
  activeTab: 'countdown', // 'countdown' or 'stopwatch'
  
  // Countdown vars
  duration: 600,         // Total duration seconds (Default 10 mins = 600)
  remaining: 600,        // Remaining seconds
  timerInterval: null,
  isTimerRunning: false,
  
  // Stopwatch vars
  stopwatchStart: 0,
  stopwatchElapsed: 0,   // Milliseconds
  stopwatchInterval: null,
  isStopwatchRunning: false,
  laps: []
};

const CIRCUMFERENCE = 753.6; // 2 * PI * 120 (radius of progress ring is 120)

document.addEventListener('DOMContentLoaded', () => {
  // Initialize timer progress circle
  updateProgressRing(1);
  updateTimerDigits();
  
  // Register view switch hook to pause/stop background processes if navigating away
  registerViewSwitchCallback((viewName) => {
    if (viewName !== 'timer') {
      // We keep timers running in the background as a convenience,
      // but if they end, we want to warn the user.
      // So we do NOT stop the intervals. This is very friendly!
    }
  });
});

function setTimerTab(tab) {
  timerState.activeTab = tab;
  
  document.getElementById('timer-tab-countdown').classList.toggle('active', tab === 'countdown');
  document.getElementById('timer-tab-stopwatch').classList.toggle('active', tab === 'stopwatch');
  
  document.getElementById('countdown-card').style.display = tab === 'countdown' ? 'flex' : 'none';
  document.getElementById('stopwatch-card').style.display = tab === 'stopwatch' ? 'flex' : 'none';
}

// ==========================================
// 1. COUNTDOWN TIMER LOGIC
// ==========================================
function updateProgressRing(ratio) {
  const ring = document.getElementById('timer-progress-ring');
  if (!ring) return;
  const offset = CIRCUMFERENCE * (1 - ratio);
  ring.style.strokeDashoffset = offset;
}

function updateTimerDigits() {
  const mins = Math.floor(timerState.remaining / 60);
  const secs = timerState.remaining % 60;
  
  const displayStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  document.getElementById('timer-digits-lbl').innerText = displayStr;
}

function setPresetTimer(seconds) {
  if (timerState.isTimerRunning) pauseTimer();
  
  timerState.duration = seconds;
  timerState.remaining = seconds;
  
  updateProgressRing(1);
  updateTimerDigits();
  playSynthSound('tick');
}

function promptCustomTimer() {
  const fields = document.createElement('div');
  fields.className = 'custom-time-fields';
  const minuteLabel = document.createElement('label');
  minuteLabel.htmlFor = 'custom-min';
  minuteLabel.textContent = '分鐘';
  const minuteInput = document.createElement('input');
  minuteInput.type = 'number';
  minuteInput.id = 'custom-min';
  minuteInput.className = 'input-field';
  minuteInput.min = '0';
  minuteInput.max = '180';
  minuteInput.value = '5';
  const secondLabel = document.createElement('label');
  secondLabel.htmlFor = 'custom-sec';
  secondLabel.textContent = '秒數';
  const secondInput = document.createElement('input');
  secondInput.type = 'number';
  secondInput.id = 'custom-sec';
  secondInput.className = 'input-field';
  secondInput.min = '0';
  secondInput.max = '59';
  secondInput.value = '0';
  fields.append(minuteLabel, minuteInput, secondLabel, secondInput);

  showCustomModal('自訂計時器', fields, true).then(confirmed => {
    if (confirmed) {
      let mins = parseInt(minuteInput.value) || 0;
      let secs = parseInt(secondInput.value) || 0;
      
      mins = Math.max(0, Math.min(180, mins));
      secs = Math.max(0, Math.min(59, secs));
      
      const totalSeconds = mins * 60 + secs;
      if (totalSeconds > 0) {
        setPresetTimer(totalSeconds);
      }
    }
  });
}

function startTimer() {
  if (timerState.isTimerRunning) return;
  if (timerState.remaining <= 0) return;
  
  timerState.isTimerRunning = true;
  document.getElementById('btn-timer-play').style.display = 'none';
  document.getElementById('btn-timer-pause').style.display = 'inline-flex';
  
  // Web Audio Context initialization hook
  playSynthSound('tick');
  
  timerState.timerInterval = setInterval(() => {
    timerState.remaining--;
    
    // Updates UI
    updateTimerDigits();
    const ratio = timerState.remaining / timerState.duration;
    updateProgressRing(ratio);
    
    if (timerState.remaining <= 0) {
      // Countdown finished!
      clearInterval(timerState.timerInterval);
      timerState.isTimerRunning = false;
      document.getElementById('btn-timer-play').style.display = 'inline-flex';
      document.getElementById('btn-timer-pause').style.display = 'none';
      
      // Sound alarm chime sequence
      playTimerEndChime();
    }
  }, 1000);
}

function playTimerEndChime() {
  // Beep alarm sequence
  let count = 0;
  function alarmChime() {
    if (count < 3) {
      playSynthSound('alarm');
      count++;
      setTimeout(alarmChime, 800);
    }
  }
  alarmChime();
  
  // Show notification popup
  showCustomModal('⏰ 時間到！', '計時器已經歸零囉！');
}

function pauseTimer() {
  if (!timerState.isTimerRunning) return;
  
  clearInterval(timerState.timerInterval);
  timerState.isTimerRunning = false;
  
  document.getElementById('btn-timer-play').style.display = 'inline-flex';
  document.getElementById('btn-timer-pause').style.display = 'none';
  
  playSynthSound('tick');
}

function resetTimer() {
  pauseTimer();
  timerState.remaining = timerState.duration;
  
  updateProgressRing(1);
  updateTimerDigits();
}

// ==========================================
// 2. STOPWATCH RUNNING LOGIC
// ==========================================
function updateStopwatchUI() {
  const totalMs = timerState.stopwatchElapsed;
  const mins = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const centis = Math.floor((totalMs % 1000) / 10);
  
  const displayStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  document.getElementById('stopwatch-digits-lbl').innerText = displayStr;
}

function startStopwatch() {
  if (timerState.isStopwatchRunning) return;
  
  timerState.isStopwatchRunning = true;
  document.getElementById('btn-stopwatch-play').style.display = 'none';
  document.getElementById('btn-stopwatch-pause').style.display = 'inline-flex';
  
  playSynthSound('tick');
  
  timerState.stopwatchStart = Date.now() - timerState.stopwatchElapsed;
  
  timerState.stopwatchInterval = setInterval(() => {
    timerState.stopwatchElapsed = Date.now() - timerState.stopwatchStart;
    updateStopwatchUI();
  }, 10);
}

function pauseStopwatch() {
  if (!timerState.isStopwatchRunning) return;
  
  clearInterval(timerState.stopwatchInterval);
  timerState.isStopwatchRunning = false;
  
  document.getElementById('btn-stopwatch-play').style.display = 'inline-flex';
  document.getElementById('btn-stopwatch-pause').style.display = 'none';
  
  playSynthSound('tick');
}

function resetStopwatch() {
  pauseStopwatch();
  timerState.stopwatchElapsed = 0;
  timerState.laps = [];
  
  updateStopwatchUI();
  document.getElementById('stopwatch-lap-list').replaceChildren();
}

function recordStopwatchLap() {
  if (timerState.stopwatchElapsed === 0) return;
  
  const totalMs = timerState.stopwatchElapsed;
  const mins = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const centis = Math.floor((totalMs % 1000) / 10);
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  
  timerState.laps.unshift(timeStr);
  
  playSynthSound('tick');
  
  // Render lap rows
  const container = document.getElementById('stopwatch-lap-list');
  container.replaceChildren();
  
  timerState.laps.forEach((lap, idx) => {
    const el = document.createElement('div');
    el.className = 'lap-item';
    const label = document.createElement('span');
    label.className = 'lap-label';
    label.textContent = `單圈 ${timerState.laps.length - idx}`;
    const time = document.createElement('span');
    time.textContent = lap;
    el.append(label, time);
    container.appendChild(el);
  });
}
