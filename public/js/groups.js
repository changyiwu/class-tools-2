let groupState = {
  mode: 'count',
  targetNum: 4,
  groups: [],
  draggedStudent: null,
  sourceGroupIndex: null,
  selectedStudent: null
};

let groupsActiveClassId = '';

document.addEventListener('DOMContentLoaded', () => {
  groupsActiveClassId = appState.activeClassId;
  loadGroupsState(groupsActiveClassId);

  registerClassChangeCallback(classId => {
    if (classId === groupsActiveClassId) {
      groupState.groups = [];
      groupState.selectedStudent = null;
      saveGroupsState(classId);
      renderGroups();
      return;
    }
    saveGroupsState(groupsActiveClassId);
    groupsActiveClassId = classId;
    loadGroupsState(classId);
  });

  registerViewSwitchCallback(viewName => {
    if (viewName === 'groups') renderGroups();
  });
});

function getGroupsStorageKey(classId = groupsActiveClassId) {
  return getClassScopedStorageKey('groups', classId);
}

function loadGroupsState(classId) {
  const saved = readStoredJson(getGroupsStorageKey(classId), null);
  const validStudents = new Set(getActiveStudents());

  if (saved && Array.isArray(saved.groups)) {
    groupState.mode = saved.mode === 'size' ? 'size' : 'count';
    groupState.targetNum = Math.max(1, Number.parseInt(saved.targetNum, 10) || 4);
    groupState.groups = saved.groups
      .filter(Array.isArray)
      .map(group => group.filter(name => typeof name === 'string' && validStudents.has(name)));
  } else {
    groupState.mode = 'count';
    groupState.targetNum = 4;
    groupState.groups = [];
  }

  groupState.selectedStudent = null;
  groupState.draggedStudent = null;
  groupState.sourceGroupIndex = null;

  const modeSelect = document.getElementById('group-mode-select');
  const numberInput = document.getElementById('group-target-num');
  if (modeSelect) modeSelect.value = groupState.mode;
  if (numberInput) numberInput.value = groupState.targetNum;
  updateGroupInputLabel();
  renderGroups();
}

function saveGroupsState(classId = groupsActiveClassId) {
  if (!classId) return;
  writeStoredJson(getGroupsStorageKey(classId), {
    mode: groupState.mode,
    targetNum: groupState.targetNum,
    groups: groupState.groups
  });
}

function updateGroupInputLabel() {
  const label = document.getElementById('group-input-label');
  if (label) label.textContent = groupState.mode === 'count' ? '分組組數' : '每組人數';
}

function toggleGroupInputLabel(value) {
  groupState.mode = value === 'size' ? 'size' : 'count';
  groupState.targetNum = groupState.mode === 'count' ? 4 : 5;
  const input = document.getElementById('group-target-num');
  if (input) input.value = groupState.targetNum;
  updateGroupInputLabel();
  saveGroupsState();
}

function clearGroupsUI() {
  groupState.groups = [];
  groupState.selectedStudent = null;
  saveGroupsState();
  renderGroups();
}

function shuffleArray(array) {
  const result = [...array];
  for (let index = result.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function generateRandomGroups() {
  const students = shuffleArray(getActiveStudents());
  if (students.length === 0) {
    showCustomModal('分組失敗', '目前班級沒有任何學生，請先至「名單與設定」中新增學生名單。');
    return;
  }

  const targetInput = document.getElementById('group-target-num');
  let target = Number.parseInt(targetInput.value, 10);
  if (!Number.isFinite(target) || target < 1) target = 1;
  targetInput.value = target;
  groupState.targetNum = target;
  groupState.groups = [];
  groupState.selectedStudent = null;

  if (groupState.mode === 'count') {
    const groupCount = Math.min(target, students.length);
    groupState.groups = Array.from({ length: groupCount }, () => []);
    students.forEach((student, index) => {
      groupState.groups[index % groupCount].push(student);
    });
  } else {
    const groupCount = Math.ceil(students.length / target);
    for (let index = 0; index < groupCount; index++) {
      groupState.groups.push(students.slice(index * target, (index + 1) * target));
    }
  }

  saveGroupsState();
  playSynthSound('win');
  renderGroups();
}

function createGroupsEmptyState(container) {
  const emptyState = document.createElement('div');
  emptyState.className = 'groups-empty-state';
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-users';
  icon.setAttribute('aria-hidden', 'true');
  const message = document.createElement('p');
  message.textContent = '請點擊「開始隨機分組」產生小組名單。';
  emptyState.append(icon, message);
  container.appendChild(emptyState);
}

function renderGroups() {
  const container = document.getElementById('groups-grid-container');
  const actions = document.getElementById('groups-result-actions');
  if (!container || !actions) return;
  container.replaceChildren();

  if (groupState.groups.length === 0) {
    actions.hidden = true;
    createGroupsEmptyState(container);
    return;
  }

  actions.hidden = false;
  const headerColors = [
    'hsl(265, 75%, 65%)',
    'hsl(190, 80%, 45%)',
    'hsl(145, 75%, 45%)',
    'hsl(35, 85%, 55%)',
    'hsl(350, 75%, 60%)',
    'hsl(215, 80%, 55%)',
    'hsl(300, 70%, 55%)',
    'hsl(80, 70%, 45%)'
  ];

  groupState.groups.forEach((students, groupIndex) => {
    const card = document.createElement('section');
    card.className = 'group-card';
    card.dataset.groupIndex = String(groupIndex);
    card.addEventListener('dragover', dragOverGroup);
    card.addEventListener('dragenter', dragEnterGroup);
    card.addEventListener('dragleave', dragLeaveGroup);
    card.addEventListener('drop', dropOnGroup);

    const canReceiveSelected = groupState.selectedStudent && groupState.selectedStudent.groupIndex !== groupIndex;
    if (canReceiveSelected) {
      card.classList.add('move-target');
    }

    const header = document.createElement('div');
    header.className = 'group-card-header colored';
    header.style.setProperty('--group-color', headerColors[groupIndex % headerColors.length]);
    const headerSummary = document.createElement('div');
    headerSummary.className = 'group-card-summary';
    const title = document.createElement('span');
    title.textContent = `第 ${groupIndex + 1} 組`;
    const count = document.createElement('span');
    count.className = 'group-member-count';
    count.textContent = `${students.length} 人`;
    headerSummary.append(title, count);
    header.appendChild(headerSummary);

    if (canReceiveSelected) {
      const targetButton = document.createElement('button');
      targetButton.type = 'button';
      targetButton.className = 'group-target-button';
      targetButton.textContent = '移到這組';
      targetButton.setAttribute('aria-label', `將${groupState.selectedStudent.name}移到第 ${groupIndex + 1} 組`);
      targetButton.addEventListener('click', () => moveSelectedStudentToGroup(groupIndex));
      header.appendChild(targetButton);
    }

    const studentList = document.createElement('div');
    studentList.className = 'group-student-list';
    if (students.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'group-drop-placeholder';
      placeholder.textContent = canReceiveSelected ? '使用上方按鈕移入學生' : '拖曳學生至此';
      studentList.appendChild(placeholder);
    } else {
      students.forEach((name, studentIndex) => {
        const studentButton = document.createElement('button');
        studentButton.type = 'button';
        studentButton.className = 'student-tag';
        studentButton.draggable = true;
        const isSelected = groupState.selectedStudent?.groupIndex === groupIndex
          && groupState.selectedStudent?.studentIndex === studentIndex;
        studentButton.classList.toggle('selected', isSelected);
        studentButton.setAttribute('aria-pressed', String(isSelected));
        studentButton.setAttribute('aria-label', isSelected
          ? `${name}已選取，請選擇目標小組`
          : `選取${name}並移動到其他小組`);

        const nameText = document.createElement('span');
        nameText.textContent = name;
        const grip = document.createElement('i');
        grip.className = 'fa-solid fa-grip-lines';
        grip.setAttribute('aria-hidden', 'true');
        studentButton.append(nameText, grip);

        studentButton.addEventListener('click', event => {
          event.stopPropagation();
          selectStudentForMove(name, groupIndex, studentIndex);
        });
        studentButton.addEventListener('dragstart', event => dragStartStudent(event, name, groupIndex, studentIndex));
        studentButton.addEventListener('dragend', dragEndStudent);
        studentList.appendChild(studentButton);
      });
    }

    card.append(header, studentList);
    container.appendChild(card);
  });
}

function selectStudentForMove(name, groupIndex, studentIndex) {
  const current = groupState.selectedStudent;
  if (current?.groupIndex === groupIndex && current?.studentIndex === studentIndex) {
    groupState.selectedStudent = null;
  } else {
    groupState.selectedStudent = { name, groupIndex, studentIndex };
    playSynthSound('tick');
  }
  renderGroups();
}

function moveSelectedStudentToGroup(destinationGroupIndex) {
  const selected = groupState.selectedStudent;
  if (!selected || selected.groupIndex === destinationGroupIndex) return;
  const sourceGroup = groupState.groups[selected.groupIndex];
  const destinationGroup = groupState.groups[destinationGroupIndex];
  const [student] = sourceGroup.splice(selected.studentIndex, 1);
  if (student) destinationGroup.push(student);
  groupState.selectedStudent = null;
  saveGroupsState();
  playSynthSound('tick');
  renderGroups();
}

function dragStartStudent(event, name, groupIndex, studentIndex) {
  groupState.draggedStudent = { name, groupIndex, studentIndex };
  event.currentTarget.classList.add('dragging');
  event.dataTransfer.setData('text/plain', name);
  event.dataTransfer.effectAllowed = 'move';
}

function dragEndStudent(event) {
  event.currentTarget.classList.remove('dragging');
  groupState.draggedStudent = null;
  document.querySelectorAll('.group-card').forEach(card => card.classList.remove('drag-over'));
}

function dragOverGroup(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function dragEnterGroup(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}

function dragLeaveGroup(event) {
  event.currentTarget.classList.remove('drag-over');
}

function dropOnGroup(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const destinationGroupIndex = Number.parseInt(event.currentTarget.dataset.groupIndex, 10);
  const source = groupState.draggedStudent;
  if (!source || !Number.isFinite(destinationGroupIndex) || source.groupIndex === destinationGroupIndex) return;
  groupState.selectedStudent = source;
  moveSelectedStudentToGroup(destinationGroupIndex);
  groupState.draggedStudent = null;
}

async function sendGroupsToScoreboard() {
  if (groupState.groups.length === 0) return;
  const confirmed = await showCustomModal(
    '送到計分板',
    '這會以目前分組建立新的計分板隊伍，並覆蓋現有隊伍與分數。確定繼續嗎？',
    true
  );
  if (!confirmed) return;
  replaceScoreboardTeamsFromGroups(groupState.groups);
  switchView('scoreboard');
}

function sendGroupsToSeating(strategy) {
  if (groupState.groups.length === 0) return;
  applyGroupsToSeating(groupState.groups, strategy);
  switchView('seating');
}

function printGroupResults() {
  document.body.classList.add('print-groups');
  window.addEventListener('afterprint', () => document.body.classList.remove('print-groups'), { once: true });
  window.print();
}

function downloadGroupResults() {
  const card = document.querySelector('#view-groups > .glass-card');
  downloadElementAsImage(card, `分組結果-${new Date().toISOString().slice(0, 10)}.png`);
}
