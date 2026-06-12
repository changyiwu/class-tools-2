// Scoreboard Module State
let scoreboardState = {
  teams: [] // Array of { id, name, score, color }
};

const SCOREBOARD_STORAGE_KEY = 'classhub_scoreboard_teams';

const TEAM_COLOR_PALETTE = [
  'var(--accent-primary)',
  'var(--accent-secondary)',
  'var(--accent-success)',
  'var(--accent-warning)',
  'var(--accent-danger)',
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#84cc16'  // Lime
];

document.addEventListener('DOMContentLoaded', () => {
  initScoreboardData();
  
  // Register callbacks
  registerViewSwitchCallback((viewName) => {
    if (viewName === 'scoreboard') {
      renderScoreboard();
    }
  });
});

function initScoreboardData() {
  const storedTeams = localStorage.getItem(SCOREBOARD_STORAGE_KEY);
  if (storedTeams) {
    scoreboardState.teams = JSON.parse(storedTeams);
  } else {
    // Standard default teams
    scoreboardState.teams = [
      { id: 'team_1', name: '第 1 組', score: 0, color: TEAM_COLOR_PALETTE[0] },
      { id: 'team_2', name: '第 2 組', score: 0, color: TEAM_COLOR_PALETTE[1] },
      { id: 'team_3', name: '第 3 組', score: 0, color: TEAM_COLOR_PALETTE[2] },
      { id: 'team_4', name: '第 4 組', score: 0, color: TEAM_COLOR_PALETTE[3] }
    ];
    saveScoreboardToStorage();
  }
}

function saveScoreboardToStorage() {
  localStorage.setItem(SCOREBOARD_STORAGE_KEY, JSON.stringify(scoreboardState.teams));
}

function renderScoreboard() {
  const container = document.getElementById('scoreboard-grid-container');
  container.innerHTML = '';
  
  if (scoreboardState.teams.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:40px;">請點選「新增小組」加入記分板隊伍。</div>';
    return;
  }
  
  scoreboardState.teams.forEach(team => {
    const card = document.createElement('div');
    card.className = 'team-card';
    card.style.setProperty('--team-color', team.color);
    
    // Top colored stripe indicator is set by CSS --team-color property
    
    card.innerHTML = `
      <div class="team-card-color-stripe"></div>
      <div class="team-header">
        <input type="text" class="team-name-input" value="${team.name}" onchange="updateTeamName('${team.id}', this.value)">
        <i class="fa-solid fa-trash-can btn-delete-team" onclick="deleteScoreboardTeam('${team.id}')" title="刪除小組"></i>
      </div>
      <div class="team-score" id="score-lbl-${team.id}">${team.score}</div>
      <div class="team-buttons-row">
        <button class="btn btn-score-adjust plus" onclick="adjustTeamScore('${team.id}', 1)">+1</button>
        <button class="btn btn-score-adjust plus" onclick="adjustTeamScore('${team.id}', 5)">+5</button>
      </div>
      <div class="team-buttons-row" style="margin-top:8px;">
        <button class="btn btn-score-adjust minus" onclick="adjustTeamScore('${team.id}', -1)">-1</button>
        <button class="btn btn-score-adjust minus" onclick="adjustTeamScore('${team.id}', -5)">-5</button>
      </div>
    `;
    
    container.appendChild(card);
  });
}

function addNewScoreboardTeam() {
  const nextIdx = scoreboardState.teams.length;
  if (nextIdx >= TEAM_COLOR_PALETTE.length) {
    showCustomModal('上限提示', '計分板最多只支援新增 8 個小組喔！');
    return;
  }
  
  const newId = `team_${Date.now()}`;
  const color = TEAM_COLOR_PALETTE[nextIdx];
  
  scoreboardState.teams.push({
    id: newId,
    name: `第 ${nextIdx + 1} 組`,
    score: 0,
    color: color
  });
  
  saveScoreboardToStorage();
  playSynthSound('tick');
  renderScoreboard();
}

function deleteScoreboardTeam(teamId) {
  showCustomModal('確認刪除', '確定要將此小組從記分板中移除嗎？這會清除該組的分數喔！', true).then(confirmed => {
    if (confirmed) {
      scoreboardState.teams = scoreboardState.teams.filter(t => t.id !== teamId);
      saveScoreboardToStorage();
      playSynthSound('tick');
      renderScoreboard();
    }
  });
}

function updateTeamName(teamId, newName) {
  const team = scoreboardState.teams.find(t => t.id === teamId);
  if (team) {
    team.name = newName.trim() || team.name;
    saveScoreboardToStorage();
  }
}

function adjustTeamScore(teamId, amount) {
  const team = scoreboardState.teams.find(t => t.id === teamId);
  if (!team) return;
  
  team.score = Math.max(0, team.score + amount); // clamp score above 0
  saveScoreboardToStorage();
  
  // Audio chime selection: play win for plus, tick for minus
  if (amount > 0) {
    playSynthSound('tick');
  } else {
    playSynthSound('tick');
  }
  
  // Update UI and trigger numeric bounce animation
  const lbl = document.getElementById(`score-lbl-${teamId}`);
  if (lbl) {
    lbl.innerText = team.score;
    lbl.classList.remove('animate-bump');
    void lbl.offsetWidth; // Reflow to reset animation
    lbl.classList.add('animate-bump');
  }
}

function resetAllScores() {
  showCustomModal('重置分數', '確定要將所有小組的分數歸零嗎？', true).then(confirmed => {
    if (confirmed) {
      scoreboardState.teams.forEach(t => t.score = 0);
      saveScoreboardToStorage();
      playSynthSound('tick');
      renderScoreboard();
    }
  });
}
