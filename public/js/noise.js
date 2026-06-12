// Noise Monitor Module State
let noiseState = {
  stream: null,
  audioContext: null,
  analyser: null,
  dataArray: null,
  source: null,
  isRunning: false,
  animationId: null,
  
  threshold: 65,      // dB threshold
  delaySeconds: 3,    // Delay before alarm triggers
  exceedStartTime: null, // Timestamp when noise started exceeding threshold
  alarmActive: false,
  lastAlarmPlayTime: 0
};

let gaugeCanvas = null;
let gaugeCtx = null;

document.addEventListener('DOMContentLoaded', () => {
  gaugeCanvas = document.getElementById('noise-gauge-canvas');
  if (gaugeCanvas) gaugeCtx = gaugeCanvas.getContext('2d');
  
  // Register view switch hook to stop mic if navigating away (nice battery saver!)
  registerViewSwitchCallback((viewName) => {
    if (viewName !== 'noise' && noiseState.isRunning) {
      stopNoiseMonitor();
      showCustomModal('噪音計已停用', '已為您自動關閉麥克風以節省電量。');
    } else if (viewName === 'noise') {
      drawGauge(0);
    }
  });

  // Initial draw
  drawGauge(0);
});

function drawGauge(db) {
  if (!gaugeCtx || !gaugeCanvas) return;
  
  const width = gaugeCanvas.width;
  const height = gaugeCanvas.height;
  const cx = width / 2;
  const cy = height * 0.75; // Semicircular center shifted down
  const radius = 90;
  
  gaugeCtx.clearRect(0, 0, width, height);
  
  // Draw base track (arc from 0.8 * PI to 2.2 * PI)
  const startAngle = 0.8 * Math.PI;
  const endAngle = 2.2 * Math.PI;
  const totalAngleRange = endAngle - startAngle;
  
  // Resolve Theme Colors for Canvas
  const colorSuccess = getCssVariableColor('--accent-success', '#10b981');
  const colorWarning = getCssVariableColor('--accent-warning', '#f59e0b');
  const colorDanger = getCssVariableColor('--accent-danger', '#ef4444');
  const colorTextMuted = getCssVariableColor('--text-muted', '#8b9bb4');
  const colorTextMain = getCssVariableColor('--text-main', '#f8fafc');
  
  // Create beautiful gradient track
  const grad = gaugeCtx.createLinearGradient(30, 0, width - 30, 0);
  grad.addColorStop(0, colorSuccess);
  grad.addColorStop(0.5, colorWarning);
  grad.addColorStop(1, colorDanger);
  
  gaugeCtx.strokeStyle = 'rgba(255,255,255,0.06)';
  gaugeCtx.lineWidth = 14;
  gaugeCtx.lineCap = 'round';
  gaugeCtx.beginPath();
  gaugeCtx.arc(cx, cy, radius, startAngle, endAngle);
  gaugeCtx.stroke();
  
  // Draw active value arc
  const valueRatio = Math.min(Math.max((db - 30) / 70, 0), 1); // scale 30dB - 100dB
  const valueAngle = startAngle + valueRatio * totalAngleRange;
  
  gaugeCtx.strokeStyle = grad;
  gaugeCtx.beginPath();
  gaugeCtx.arc(cx, cy, radius, startAngle, valueAngle);
  gaugeCtx.stroke();
  
  // Draw tick labels (30, 50, 70, 90, 100)
  gaugeCtx.fillStyle = colorTextMuted;
  gaugeCtx.font = '10px Outfit, sans-serif';
  gaugeCtx.textAlign = 'center';
  gaugeCtx.textBaseline = 'middle';
  
  const tickLabels = [30, 45, 65, 80, 100];
  tickLabels.forEach(tick => {
    const ratio = (tick - 30) / 70;
    const angle = startAngle + ratio * totalAngleRange;
    const tx = cx + (radius + 20) * Math.cos(angle);
    const ty = cy + (radius + 20) * Math.sin(angle);
    gaugeCtx.fillText(`${tick}`, tx, ty);
  });
  
  // Draw threshold line indicator
  const threshRatio = Math.min(Math.max((noiseState.threshold - 30) / 70, 0), 1);
  const threshAngle = startAngle + threshRatio * totalAngleRange;
  gaugeCtx.strokeStyle = colorTextMain;
  gaugeCtx.lineWidth = 3;
  gaugeCtx.beginPath();
  gaugeCtx.arc(cx, cy, radius + 2, threshAngle - 0.01, threshAngle + 0.01);
  gaugeCtx.stroke();
  
  // Draw center hub pin
  gaugeCtx.fillStyle = colorTextMain;
  gaugeCtx.beginPath();
  gaugeCtx.arc(cx, cy, 8, 0, Math.PI * 2);
  gaugeCtx.fill();
  
  // Draw pointer needle
  gaugeCtx.save();
  gaugeCtx.translate(cx, cy);
  gaugeCtx.rotate(valueAngle);
  
  gaugeCtx.strokeStyle = colorTextMain;
  gaugeCtx.lineWidth = 3;
  gaugeCtx.lineCap = 'round';
  gaugeCtx.beginPath();
  gaugeCtx.moveTo(-5, 0);
  gaugeCtx.lineTo(radius - 12, 0);
  gaugeCtx.stroke();
  gaugeCtx.restore();
}

async function startNoiseMonitor() {
  if (noiseState.isRunning) return;
  
  try {
    noiseState.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    
    // Setup Audio Pipeline
    noiseState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    noiseState.analyser = noiseState.audioContext.createAnalyser();
    noiseState.analyser.fftSize = 256;
    
    const bufferLength = noiseState.analyser.frequencyBinCount;
    noiseState.dataArray = new Uint8Array(bufferLength);
    
    noiseState.source = noiseState.audioContext.createMediaStreamSource(noiseState.stream);
    noiseState.source.connect(noiseState.analyser);
    
    // Update UI state
    noiseState.isRunning = true;
    document.getElementById('btn-noise-start').disabled = true;
    document.getElementById('btn-noise-stop').disabled = false;
    
    updateIndicator('green', '音量正常');
    
    // Start sample loop
    noiseLoop();
  } catch (err) {
    console.error("Microphone capture failed: ", err);
    // 釋放可能已被獲取但後續管線建立失敗的麥克風串流
    if (noiseState.stream) {
      noiseState.stream.getTracks().forEach(track => track.stop());
      noiseState.stream = null;
    }
    showCustomModal('啟用失敗', `無法啟用麥克風。錯誤資訊：${err.message || err}`);
    updateIndicator('red', `麥克風啟用失敗 (${err.name || 'Error'})`);
  }
}

function stopNoiseMonitor() {
  if (!noiseState.isRunning) return;
  
  // Stop Animation Loop
  if (noiseState.animationId) {
    cancelAnimationFrame(noiseState.animationId);
  }
  
  // Close audio elements
  if (noiseState.source) noiseState.source.disconnect();
  if (noiseState.audioContext && noiseState.audioContext.state !== 'closed') {
    noiseState.audioContext.close();
  }
  
  // Stop mic capture stream tracks
  if (noiseState.stream) {
    noiseState.stream.getTracks().forEach(track => track.stop());
  }
  
  // Reset States
  noiseState.isRunning = false;
  noiseState.alarmActive = false;
  noiseState.exceedStartTime = null;
  
  document.getElementById('btn-noise-start').disabled = false;
  document.getElementById('btn-noise-stop').disabled = true;
  document.getElementById('noise-decibel-num').innerText = '0';
  document.getElementById('noise-warning').classList.remove('active');
  
  updateIndicator('muted', '麥克風未啟用');
  drawGauge(0);
}

function noiseLoop() {
  if (!noiseState.isRunning) return;
  
  noiseState.animationId = requestAnimationFrame(noiseLoop);
  
  noiseState.analyser.getByteFrequencyData(noiseState.dataArray);
  
  // Calculate average volume
  let sum = 0;
  for (let i = 0; i < noiseState.dataArray.length; i++) {
    sum += noiseState.dataArray[i];
  }
  const average = sum / noiseState.dataArray.length;
  
  // Map frequency volume to 30-95 dB
  // (average can be 0-255)
  let db = 30 + (average / 255) * 65;
  db = Math.round(db);
  
  // UI update
  document.getElementById('noise-decibel-num').innerText = db;
  drawGauge(db);
  
  const now = Date.now();
  
  // Threshold comparisons
  if (db > noiseState.threshold) {
    // Volume exceeds threshold!
    if (!noiseState.exceedStartTime) {
      noiseState.exceedStartTime = now;
      updateIndicator('yellow', '音量有些偏高...');
    } else {
      const elapsedSeconds = (now - noiseState.exceedStartTime) / 1000;
      
      if (elapsedSeconds >= noiseState.delaySeconds) {
        // Trigger Warning State!
        noiseState.alarmActive = true;
        updateIndicator('red', '噪音過大！請安靜');
        document.getElementById('noise-warning').classList.add('active');
        
        // Play synthesized warning buzz every 1.5 seconds
        if (now - noiseState.lastAlarmPlayTime > 1500) {
          playSynthSound('alarm');
          noiseState.lastAlarmPlayTime = now;
        }
      } else {
        updateIndicator('yellow', `超標中... ${Math.ceil(noiseState.delaySeconds - elapsedSeconds)}秒後警示`);
      }
    }
  } else {
    // Volume is below threshold
    if (noiseState.exceedStartTime) {
      noiseState.exceedStartTime = null;
    }
    
    if (noiseState.alarmActive) {
      noiseState.alarmActive = false;
      document.getElementById('noise-warning').classList.remove('active');
    }
    
    updateIndicator('green', '音量正常');
  }
}

function updateIndicator(state, message) {
  const light = document.getElementById('noise-indicator-light');
  const txt = document.getElementById('noise-status-text');
  
  light.className = 'indicator-light';
  if (state === 'green') light.classList.add('green');
  if (state === 'yellow') light.classList.add('yellow');
  if (state === 'red') light.classList.add('red');
  
  txt.innerText = message;
}

function updateNoiseThreshold(val) {
  noiseState.threshold = parseInt(val);
  document.getElementById('threshold-val').innerText = val;
  if (!noiseState.isRunning) {
    drawGauge(0);
  }
}

function updateNoiseDelay(val) {
  noiseState.delaySeconds = parseInt(val);
  document.getElementById('delay-val').innerText = val;
}
