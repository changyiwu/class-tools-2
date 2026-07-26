let seatingState = {
  rows: 5,
  cols: 6,
  cells: [],
  unassigned: []
};

let seatingActiveClassId = '';

document.addEventListener('DOMContentLoaded', () => {
  seatingActiveClassId = appState.activeClassId;
  loadSeatingState(seatingActiveClassId);

  registerClassChangeCallback(classId => {
    saveSeatingState(seatingActiveClassId);
    seatingActiveClassId = classId;
    loadSeatingState(classId);
  });

  registerViewSwitchCallback(viewName => {
    if (viewName === 'seating') {
      renderSeatingGrid();
      renderUnassignedStudents();
    }
  });
});

function getSeatingStorageKey(classId = seatingActiveClassId) {
  return getClassScopedStorageKey('seating', classId);
}

function loadSeatingState(classId) {
  const saved = readStoredJson(getSeatingStorageKey(classId), null);
  const students = getActiveStudents();
  const validStudents = new Set(students);

  if (saved && Array.isArray(saved.cells)) {
    seatingState.rows = Math.min(10, Math.max(1, Number.parseInt(saved.rows, 10) || 5));
    seatingState.cols = Math.min(10, Math.max(1, Number.parseInt(saved.cols, 10) || 6));
    const expectedLength = seatingState.rows * seatingState.cols;
    const alreadyAssigned = new Set();
    seatingState.cells = Array.from({ length: expectedLength }, (_, index) => {
      const storedCell = saved.cells[index] || {};
      const student = typeof storedCell.student === 'string'
        && validStudents.has(storedCell.student)
        && !alreadyAssigned.has(storedCell.student)
        ? storedCell.student
        : null;
      if (student) alreadyAssigned.add(student);
      return {
        index,
        type: storedCell.type === 'empty' ? 'empty' : 'active',
        student
      };
    });
    seatingState.unassigned = students.filter(student => !alreadyAssigned.has(student));
  } else {
    seatingState.rows = 5;
    seatingState.cols = 6;
    seatingState.cells = [];
    rebuildSeatingGrid(false);
  }

  syncSeatingControls();
  renderSeatingGrid();
  renderUnassignedStudents();
}

function saveSeatingState(classId = seatingActiveClassId) {
  if (!classId) return;
  writeStoredJson(getSeatingStorageKey(classId), {
    rows: seatingState.rows,
    cols: seatingState.cols,
    cells: seatingState.cells
  });
}

function syncSeatingControls() {
  const rowsSlider = document.getElementById('seat-rows-slider');
  const colsSlider = document.getElementById('seat-cols-slider');
  if (rowsSlider) rowsSlider.value = seatingState.rows;
  if (colsSlider) colsSlider.value = seatingState.cols;
  document.getElementById('seat-rows-val').textContent = seatingState.rows;
  document.getElementById('seat-cols-val').textContent = seatingState.cols;
}

function updateSeatingGridSize() {
  seatingState.rows = Number.parseInt(document.getElementById('seat-rows-slider').value, 10);
  seatingState.cols = Number.parseInt(document.getElementById('seat-cols-slider').value, 10);
  syncSeatingControls();
  rebuildSeatingGrid(true);
}

function rebuildSeatingGrid(preserveTypes = true) {
  const totalCells = seatingState.rows * seatingState.cols;
  const oldCells = preserveTypes ? [...seatingState.cells] : [];
  seatingState.cells = Array.from({ length: totalCells }, (_, index) => ({
    index,
    type: oldCells[index]?.type === 'empty' ? 'empty' : 'active',
    student: null
  }));
  seatingState.unassigned = getActiveStudents();
  saveSeatingState();
  renderSeatingGrid();
  renderUnassignedStudents();
}

function toggleCellType(index) {
  const cell = seatingState.cells[index];
  if (!cell) return;
  playSynthSound('tick');

  if (cell.type === 'active') {
    cell.type = 'empty';
    if (cell.student) {
      seatingState.unassigned.push(cell.student);
      cell.student = null;
    }
  } else {
    cell.type = 'active';
  }

  saveSeatingState();
  renderSeatingGrid();
  renderUnassignedStudents();
}

function renderSeatingGrid() {
  const grid = document.getElementById('classroom-seating-grid');
  if (!grid) return;
  grid.replaceChildren();
  grid.style.setProperty('--seat-cols', seatingState.cols);
  grid.style.gridTemplateColumns = `repeat(${seatingState.cols}, minmax(0, 1fr))`;

  seatingState.cells.forEach((cell, index) => {
    const rowNumber = Math.floor(index / seatingState.cols) + 1;
    const columnNumber = (index % seatingState.cols) + 1;
    const seatButton = document.createElement('button');
    seatButton.type = 'button';
    seatButton.className = 'seat-cell';
    seatButton.dataset.index = String(index);

    const number = document.createElement('span');
    number.className = 'seat-number';
    number.textContent = `${rowNumber}-${columnNumber}`;
    seatButton.appendChild(number);

    if (cell.type === 'empty') {
      seatButton.classList.add('empty-seat');
      seatButton.setAttribute('aria-label', `第 ${rowNumber} 排第 ${columnNumber} 列，目前是空位；按下可啟用座位`);
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-ban';
      icon.setAttribute('aria-hidden', 'true');
      seatButton.appendChild(icon);
    } else {
      seatButton.classList.add('active-seat');
      seatButton.setAttribute('aria-label', cell.student
        ? `第 ${rowNumber} 排第 ${columnNumber} 列，${cell.student}；按下可設為空位`
        : `第 ${rowNumber} 排第 ${columnNumber} 列，目前無人；按下可設為空位`);
      const content = document.createElement('span');
      if (cell.student) {
        content.className = 'seat-student-name';
        content.textContent = cell.student;
      } else {
        content.className = 'seat-empty-label';
        content.textContent = '無人';
      }
      seatButton.appendChild(content);
    }

    seatButton.addEventListener('click', () => toggleCellType(index));
    grid.appendChild(seatButton);
  });
}

function renderUnassignedStudents() {
  const count = document.getElementById('unassigned-count');
  const container = document.getElementById('unassigned-students-list');
  if (!count || !container) return;
  count.textContent = seatingState.unassigned.length;
  container.replaceChildren();

  if (seatingState.unassigned.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'unassigned-empty';
    emptyState.textContent = '所有學生皆已排座';
    container.appendChild(emptyState);
    return;
  }

  seatingState.unassigned.forEach(name => {
    const tag = document.createElement('span');
    tag.className = 'mini-tag';
    tag.textContent = name;
    container.appendChild(tag);
  });
}

function shuffleList(list) {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function assignStudentsToActiveSeats(students) {
  seatingState.cells.forEach(cell => {
    cell.student = null;
  });
  let studentIndex = 0;
  seatingState.cells.forEach(cell => {
    if (cell.type === 'active' && studentIndex < students.length) {
      cell.student = students[studentIndex];
      studentIndex++;
    }
  });
  seatingState.unassigned = students.slice(studentIndex);
  saveSeatingState();
  renderSeatingGrid();
  renderUnassignedStudents();
}

function randomizeSeatingChart() {
  const students = shuffleList(getActiveStudents());
  if (students.length === 0) {
    showCustomModal('排座失敗', '目前名單中沒有學生，請先至「名單與設定」中新增。');
    return;
  }
  if (!seatingState.cells.some(cell => cell.type === 'active')) {
    showCustomModal('排座失敗', '畫面上沒有可排座的座位。請點擊座位格子以啟用它們。');
    return;
  }
  assignStudentsToActiveSeats(students);
  playSynthSound('win');
}

function applyGroupsToSeating(groups, strategy = 'cluster') {
  const validStudents = new Set(getActiveStudents());
  const cleanGroups = groups.map(group => group.filter(student => validStudents.has(student)));
  let orderedStudents = [];

  if (strategy === 'disperse') {
    const longestGroup = Math.max(0, ...cleanGroups.map(group => group.length));
    for (let memberIndex = 0; memberIndex < longestGroup; memberIndex++) {
      cleanGroups.forEach(group => {
        if (group[memberIndex]) orderedStudents.push(group[memberIndex]);
      });
    }
  } else {
    orderedStudents = cleanGroups.flat();
  }

  const included = new Set(orderedStudents);
  getActiveStudents().forEach(student => {
    if (!included.has(student)) orderedStudents.push(student);
  });
  assignStudentsToActiveSeats(orderedStudents);
  playSynthSound('win');
}

function clearSeatingArrangement() {
  seatingState.cells.forEach(cell => {
    cell.student = null;
  });
  seatingState.unassigned = getActiveStudents();
  saveSeatingState();
  playSynthSound('tick');
  renderSeatingGrid();
  renderUnassignedStudents();
}

function printSeatingChart() {
  window.print();
}

function downloadSeatingChart() {
  downloadElementAsImage(
    document.getElementById('seating-canvas'),
    `座位表-${new Date().toISOString().slice(0, 10)}.png`
  );
}
