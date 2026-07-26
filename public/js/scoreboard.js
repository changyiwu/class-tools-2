let scoreboardState = {
  teams: [],
  history: [],
  rounds: []
};

const SCOREBOARD_STORAGE_KEY = 'classhub_scoreboard_state_v2';
const LEGACY_SCOREBOARD_STORAGE_KEY = 'classhub_scoreboard_teams';

const TEAM_COLOR_PALETTE = [
  'var(--accent-primary)',
  'var(--accent-secondary)',
  'var(--accent-success)',
  'var(--accent-warning)',
  'var(--accent-danger)',
  '#ec4899',
  '#f43f5e',
  '#84cc16'
];

document.addEventListener('DOMContentLoaded', () => {
  initScoreboardData();
  registerViewSwitchCallback(viewName => {
    if (viewName === 'scoreboard') renderScoreboard();
  });
});

function createDefaultScoreboardTeams() {
  return Array.from({ length: 4 }, (_, index) => ({
    id: `team_${index + 1}`,
    name: `第 ${index + 1} 組`,
    score: 0,
    color: TEAM_COLOR_PALETTE[index]
  }));
}

function initScoreboardData() {
  const storedState = readStoredJson(SCOREBOARD_STORAGE_KEY, null);
  if (storedState && Array.isArray(storedState.teams)) {
    scoreboardState.teams = normalizeScoreboardTeams(storedState.teams);
    scoreboardState.history = Array.isArray(storedState.history) ? storedState.history.slice(0, 100) : [];
    scoreboardState.rounds = Array.isArray(storedState.rounds) ? storedState.rounds.slice(0, 30) : [];
  } else {
    const legacyTeams = readStoredJson(LEGACY_SCOREBOARD_STORAGE_KEY, null);
    scoreboardState.teams = Array.isArray(legacyTeams)
      ? normalizeScoreboardTeams(legacyTeams)
      : createDefaultScoreboardTeams();
    scoreboardState.history = [];
    scoreboardState.rounds = [];
    saveScoreboardToStorage();
  }
  renderScoreboard();
}

function normalizeScoreboardTeams(teams) {
  return teams.slice(0, TEAM_COLOR_PALETTE.length).map((team, index) => ({
    id: typeof team.id === 'string' ? team.id : `team_${Date.now()}_${index}`,
    name: typeof team.name === 'string' && team.name.trim() ? team.name.trim() : `第 ${index + 1} 組`,
    score: Math.max(0, Number.parseInt(team.score, 10) || 0),
    color: typeof team.color === 'string' ? team.color : TEAM_COLOR_PALETTE[index]
  }));
}

function saveScoreboardToStorage() {
  writeStoredJson(SCOREBOARD_STORAGE_KEY, scoreboardState);
}

function getScoreboardTeams() {
  return scoreboardState.teams.map(team => ({ ...team }));
}

function renderScoreboard() {
  const container = document.getElementById('scoreboard-grid-container');
  if (!container) return;
  container.replaceChildren();

  if (scoreboardState.teams.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'scoreboard-empty-state';
    emptyState.textContent = '請點選「新增小組」加入計分板隊伍。';
    container.appendChild(emptyState);
  } else {
    scoreboardState.teams.forEach(team => container.appendChild(createTeamCard(team)));
  }

  renderScoreHistory();
  renderScoreRounds();
  const undoButton = document.getElementById('btn-undo-score');
  if (undoButton) undoButton.disabled = scoreboardState.history.length === 0;
}

function createTeamCard(team) {
  const card = document.createElement('article');
  card.className = 'team-card';
  card.style.setProperty('--team-color', team.color);

  const stripe = document.createElement('div');
  stripe.className = 'team-card-color-stripe';
  stripe.setAttribute('aria-hidden', 'true');

  const header = document.createElement('div');
  header.className = 'team-header';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'team-name-input';
  nameInput.value = team.name;
  nameInput.setAttribute('aria-label', `${team.name}的隊伍名稱`);
  nameInput.addEventListener('change', () => updateTeamName(team.id, nameInput.value));

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'icon-action-button btn-delete-team';
  deleteButton.setAttribute('aria-label', `刪除${team.name}`);
  const deleteIcon = document.createElement('i');
  deleteIcon.className = 'fa-solid fa-trash-can';
  deleteIcon.setAttribute('aria-hidden', 'true');
  deleteButton.appendChild(deleteIcon);
  deleteButton.addEventListener('click', () => deleteScoreboardTeam(team.id));
  header.append(nameInput, deleteButton);

  const score = document.createElement('div');
  score.className = 'team-score';
  score.id = `score-lbl-${team.id}`;
  score.setAttribute('aria-live', 'polite');
  score.textContent = team.score;

  const plusRow = createScoreButtonRow(team, [1, 5]);
  const minusRow = createScoreButtonRow(team, [-1, -5]);
  minusRow.classList.add('team-buttons-secondary');
  card.append(stripe, header, score, plusRow, minusRow);
  return card;
}

function createScoreButtonRow(team, amounts) {
  const row = document.createElement('div');
  row.className = 'team-buttons-row';
  amounts.forEach(amount => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn-score-adjust ${amount > 0 ? 'plus' : 'minus'}`;
    button.textContent = amount > 0 ? `+${amount}` : String(amount);
    button.setAttribute('aria-label', `${team.name}${amount > 0 ? '加' : '扣'}${Math.abs(amount)}分`);
    button.addEventListener('click', () => adjustTeamScore(team.id, amount));
    row.appendChild(button);
  });
  return row;
}

function addNewScoreboardTeam() {
  const nextIndex = scoreboardState.teams.length;
  if (nextIndex >= TEAM_COLOR_PALETTE.length) {
    showCustomModal('上限提示', '計分板最多支援 8 個小組。');
    return;
  }
  scoreboardState.teams.push({
    id: `team_${Date.now()}`,
    name: `第 ${nextIndex + 1} 組`,
    score: 0,
    color: TEAM_COLOR_PALETTE[nextIndex]
  });
  saveScoreboardToStorage();
  playSynthSound('tick');
  renderScoreboard();
}

async function deleteScoreboardTeam(teamId) {
  const team = scoreboardState.teams.find(item => item.id === teamId);
  if (!team) return;
  const confirmed = await showCustomModal('確認刪除', `確定要移除「${team.name}」並清除該組分數嗎？`, true);
  if (!confirmed) return;
  scoreboardState.teams = scoreboardState.teams.filter(item => item.id !== teamId);
  scoreboardState.history = scoreboardState.history.filter(item => item.teamId !== teamId);
  saveScoreboardToStorage();
  playSynthSound('tick');
  renderScoreboard();
}

function updateTeamName(teamId, newName) {
  const team = scoreboardState.teams.find(item => item.id === teamId);
  if (!team) return;
  const trimmedName = newName.trim();
  if (trimmedName) team.name = trimmedName;
  saveScoreboardToStorage();
  renderScoreboard();
}

function adjustTeamScore(teamId, amount, description = '') {
  const team = scoreboardState.teams.find(item => item.id === teamId);
  if (!team) return;
  const previousScore = team.score;
  const nextScore = Math.max(0, previousScore + amount);
  if (nextScore === previousScore) return;

  team.score = nextScore;
  scoreboardState.history.unshift({
    id: `score_action_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    teamId,
    teamName: team.name,
    amount: nextScore - previousScore,
    previousScore,
    nextScore,
    description,
    time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
  });
  scoreboardState.history = scoreboardState.history.slice(0, 100);
  saveScoreboardToStorage();
  playSynthSound('tick');
  renderScoreboard();

  const scoreLabel = document.getElementById(`score-lbl-${teamId}`);
  if (scoreLabel) {
    scoreLabel.classList.remove('animate-bump');
    void scoreLabel.offsetWidth;
    scoreLabel.classList.add('animate-bump');
  }
}

function undoLastScoreAction() {
  const action = scoreboardState.history.shift();
  if (!action) return;
  const team = scoreboardState.teams.find(item => item.id === action.teamId);
  if (team) team.score = Math.max(0, action.previousScore);
  saveScoreboardToStorage();
  playSynthSound('tick');
  renderScoreboard();
}

function renderScoreHistory() {
  const container = document.getElementById('score-history-list');
  if (!container) return;
  container.replaceChildren();
  if (scoreboardState.history.length === 0) {
    container.appendChild(createScoreHistoryEmptyState('尚無加扣分紀錄'));
    return;
  }
  scoreboardState.history.slice(0, 20).forEach(action => {
    const row = document.createElement('div');
    row.className = 'score-history-item';
    const description = document.createElement('span');
    const prefix = action.description ? `${action.description}｜` : '';
    description.textContent = `${prefix}${action.teamName} ${action.amount > 0 ? '+' : ''}${action.amount}`;
    const time = document.createElement('time');
    time.textContent = action.time;
    row.append(description, time);
    container.appendChild(row);
  });
}

function renderScoreRounds() {
  const container = document.getElementById('score-round-list');
  if (!container) return;
  container.replaceChildren();
  if (scoreboardState.rounds.length === 0) {
    container.appendChild(createScoreHistoryEmptyState('尚無已完成回合'));
    return;
  }
  scoreboardState.rounds.slice(0, 10).forEach((round, index) => {
    const row = document.createElement('div');
    row.className = 'score-history-item';
    const label = document.createElement('span');
    const summary = round.teams.map(team => `${team.name} ${team.score}`).join('、');
    label.textContent = `回合 ${scoreboardState.rounds.length - index}：${summary}`;
    const time = document.createElement('time');
    time.textContent = round.time;
    row.append(label, time);
    container.appendChild(row);
  });
}

function createScoreHistoryEmptyState(text) {
  const emptyState = document.createElement('p');
  emptyState.className = 'score-history-empty';
  emptyState.textContent = text;
  return emptyState;
}

async function resetAllScores() {
  const confirmed = await showCustomModal('重置分數', '確定要將所有小組的分數歸零嗎？這不會保存成一個回合。', true);
  if (!confirmed) return;
  scoreboardState.teams.forEach(team => {
    team.score = 0;
  });
  scoreboardState.history = [];
  saveScoreboardToStorage();
  playSynthSound('tick');
  renderScoreboard();
}

async function startNewScoreboardRound() {
  const confirmed = await showCustomModal('開始新回合', '目前分數會保存到回合紀錄，接著所有小組歸零。確定繼續嗎？', true);
  if (!confirmed) return;
  scoreboardState.rounds.unshift({
    id: `round_${Date.now()}`,
    time: new Date().toLocaleString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    teams: scoreboardState.teams.map(team => ({
      name: team.name,
      score: team.score
    }))
  });
  scoreboardState.rounds = scoreboardState.rounds.slice(0, 30);
  scoreboardState.teams.forEach(team => {
    team.score = 0;
  });
  scoreboardState.history = [];
  saveScoreboardToStorage();
  playSynthSound('win');
  renderScoreboard();
}

function replaceScoreboardTeamsFromGroups(groups) {
  scoreboardState.teams = groups.slice(0, TEAM_COLOR_PALETTE.length).map((group, index) => ({
    id: `team_${Date.now()}_${index}`,
    name: `第 ${index + 1} 組`,
    score: 0,
    color: TEAM_COLOR_PALETTE[index]
  }));
  scoreboardState.history = [];
  saveScoreboardToStorage();
  playSynthSound('win');
  renderScoreboard();
}
