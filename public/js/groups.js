// Group Generator State
let groupState = {
  mode: 'count', // 'count' = divide into X groups, 'size' = X students per group
  targetNum: 4,
  groups: [],    // Array of arrays: [ [name1, name2], [name3, name4] ]
  draggedStudent: null,
  sourceGroupIndex: null
};

document.addEventListener('DOMContentLoaded', () => {
  registerClassChangeCallback((classId) => {
    clearGroupsUI();
  });
  
  registerViewSwitchCallback((viewName) => {
    if (viewName === 'groups' && groupState.groups.length > 0) {
      renderGroups();
    }
  });
});

function toggleGroupInputLabel(val) {
  groupState.mode = val;
  const label = document.getElementById('group-input-label');
  const input = document.getElementById('group-target-num');
  
  if (val === 'count') {
    label.innerText = '分組組數';
    input.value = 4;
  } else {
    label.innerText = '每組人數';
    input.value = 5;
  }
}

function clearGroupsUI() {
  groupState.groups = [];
  const container = document.getElementById('groups-grid-container');
  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-users" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
      <p>請點擊「開始隨機分組」產生小組名單。</p>
    </div>
  `;
}

// Fisher-Yates Shuffle Algorithm
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateRandomGroups() {
  const students = shuffleArray(getActiveStudents());
  if (students.length === 0) {
    showCustomModal('分組失敗', '目前班級沒有任何學生，請先至「名單與設定」中新增學生名單。');
    return;
  }
  
  const targetNumInput = document.getElementById('group-target-num');
  let val = parseInt(targetNumInput.value);
  if (isNaN(val) || val < 1) {
    val = 1;
    targetNumInput.value = 1;
  }
  
  groupState.targetNum = val;
  groupState.groups = [];
  
  if (groupState.mode === 'count') {
    // 1. Group by Count: Create exactly X groups
    const groupCount = Math.min(val, students.length);
    for (let i = 0; i < groupCount; i++) {
      groupState.groups.push([]);
    }
    
    // Distribute students round-robin
    students.forEach((student, index) => {
      const groupIdx = index % groupCount;
      groupState.groups[groupIdx].push(student);
    });
  } else {
    // 2. Group by Size: X students per group
    const studentsPerGroup = val;
    const groupCount = Math.ceil(students.length / studentsPerGroup);
    
    for (let i = 0; i < groupCount; i++) {
      const start = i * studentsPerGroup;
      const end = start + studentsPerGroup;
      groupState.groups.push(students.slice(start, end));
    }
  }
  
  playSynthSound('win');
  renderGroups();
}

function renderGroups() {
  const container = document.getElementById('groups-grid-container');
  container.innerHTML = '';
  
  if (groupState.groups.length === 0) {
    clearGroupsUI();
    return;
  }
  
  // Nice pastel colors palette for group headers
  const headerColors = [
    'hsl(265, 75%, 65%)', // Purple
    'hsl(190, 80%, 45%)', // Cyan
    'hsl(145, 75%, 45%)', // Green
    'hsl(35, 85%, 55%)',  // Orange
    'hsl(350, 75%, 60%)', // Red
    'hsl(215, 80%, 55%)', // Blue
    'hsl(300, 70%, 55%)', // Pink
    'hsl(80, 70%, 45%)'   // Lime
  ];
  
  groupState.groups.forEach((groupStudents, groupIdx) => {
    const cardColor = headerColors[groupIdx % headerColors.length];
    
    const card = document.createElement('div');
    card.className = 'group-card';
    card.setAttribute('data-group-index', groupIdx);
    
    // Drag and drop event listeners on the group card
    card.addEventListener('dragover', dragOverGroup);
    card.addEventListener('dragenter', dragEnterGroup);
    card.addEventListener('dragleave', dragLeaveGroup);
    card.addEventListener('drop', dropOnGroup);
    
    // Header
    const header = document.createElement('div');
    header.className = 'group-card-header colored';
    header.style.setProperty('--group-color', cardColor);
    header.innerHTML = `
      <span>第 ${groupIdx + 1} 組</span>
      <span style="font-size: 13px; font-weight:500;">(${groupStudents.length} 人)</span>
    `;
    card.appendChild(header);
    
    // Students list
    const listContainer = document.createElement('div');
    listContainer.className = 'group-student-list';
    
    if (groupStudents.length === 0) {
      listContainer.innerHTML = '<div style="color:var(--text-muted);text-align:center;font-size:12px;padding:20px;border:1px dashed var(--border-color);border-radius:var(--radius-sm)">拖曳學生至此</div>';
    } else {
      groupStudents.forEach((name, studentIdx) => {
        const tag = document.createElement('div');
        tag.className = 'student-tag';
        tag.setAttribute('draggable', 'true');
        tag.innerHTML = `
          <span>${name}</span>
          <i class="fa-solid fa-grip-lines" style="color:var(--text-muted);font-size:11px;"></i>
        `;
        
        // Drag events on the student tag
        tag.addEventListener('dragstart', (e) => dragStartStudent(e, name, groupIdx, studentIdx));
        tag.addEventListener('dragend', dragEndStudent);
        
        listContainer.appendChild(tag);
      });
    }
    
    card.appendChild(listContainer);
    container.appendChild(card);
  });
}

// ==========================================
// DRAG AND DROP HANDLERS
// ==========================================
function dragStartStudent(e, name, groupIdx, studentIdx) {
  groupState.draggedStudent = name;
  groupState.sourceGroupIndex = groupIdx;
  
  // Highlight currently dragging element
  e.currentTarget.classList.add('dragging');
  
  // Necessary for Firefox drag-drop
  e.dataTransfer.setData('text/plain', name);
  e.dataTransfer.effectAllowed = 'move';
}

function dragEndStudent(e) {
  e.currentTarget.classList.remove('dragging');
  
  // Clean state
  groupState.draggedStudent = null;
  groupState.sourceGroupIndex = null;
  
  // Remove all drag-over classes from cards
  document.querySelectorAll('.group-card').forEach(card => {
    card.classList.remove('drag-over');
  });
}

function dragOverGroup(e) {
  e.preventDefault(); // Required to allow drop
  e.dataTransfer.dropEffect = 'move';
}

function dragEnterGroup(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function dragLeaveGroup(e) {
  e.currentTarget.classList.remove('drag-over');
}

function dropOnGroup(e) {
  e.preventDefault();
  const destGroupIdx = parseInt(e.currentTarget.getAttribute('data-group-index'));
  const srcGroupIdx = groupState.sourceGroupIndex;
  const name = groupState.draggedStudent;
  
  e.currentTarget.classList.remove('drag-over');
  
  if (srcGroupIdx === null || isNaN(destGroupIdx) || srcGroupIdx === destGroupIdx) return;
  
  // Move student in state array
  const studentIndex = groupState.groups[srcGroupIdx].indexOf(name);
  if (studentIndex > -1) {
    // Remove from source group
    groupState.groups[srcGroupIdx].splice(studentIndex, 1);
    // Add to dest group
    groupState.groups[destGroupIdx].push(name);
    
    // Play micro-click audio
    playSynthSound('tick');
    
    // Re-render
    renderGroups();
  }
}
