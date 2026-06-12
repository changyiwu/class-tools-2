// Seating Chart State
let seatingState = {
  rows: 5,
  cols: 6,
  cells: [],         // Array of { index, type: 'active'|'empty', student: null }
  unassigned: []     // Students who haven't been assigned seats
};

document.addEventListener('DOMContentLoaded', () => {
  // Register callbacks
  registerClassChangeCallback((classId) => {
    rebuildSeatingGrid();
  });
  
  registerViewSwitchCallback((viewName) => {
    if (viewName === 'seating') {
      if (seatingState.cells.length === 0) {
        rebuildSeatingGrid();
      } else {
        renderSeatingGrid();
        renderUnassignedStudents();
      }
    }
  });
  
  // Initial setup
  rebuildSeatingGrid();
});

function updateSeatingGridSize() {
  const rowsSlider = document.getElementById('seat-rows-slider');
  const colsSlider = document.getElementById('seat-cols-slider');
  
  seatingState.rows = parseInt(rowsSlider.value);
  seatingState.cols = parseInt(colsSlider.value);
  
  document.getElementById('seat-rows-val').innerText = seatingState.rows;
  document.getElementById('seat-cols-val').innerText = seatingState.cols;
  
  rebuildSeatingGrid();
}

function rebuildSeatingGrid() {
  const totalCells = seatingState.rows * seatingState.cols;
  const oldCells = [...seatingState.cells];
  
  seatingState.cells = [];
  seatingState.unassigned = getActiveStudents();
  
  for (let i = 0; i < totalCells; i++) {
    // Preserve empty cell types if dimensions are changed, if possible
    let type = 'active';
    if (i < oldCells.length) {
      type = oldCells[i].type;
    }
    
    seatingState.cells.push({
      index: i,
      type: type,
      student: null
    });
  }
  
  renderSeatingGrid();
  renderUnassignedStudents();
}

function toggleCellType(index) {
  const cell = seatingState.cells[index];
  if (!cell) return;
  
  // Play micro click sound
  playSynthSound('tick');
  
  if (cell.type === 'active') {
    cell.type = 'empty';
    // If there was a student, return them to unassigned pool
    if (cell.student) {
      seatingState.unassigned.push(cell.student);
      cell.student = null;
    }
  } else {
    cell.type = 'active';
  }
  
  renderSeatingGrid();
  renderUnassignedStudents();
}

function renderSeatingGrid() {
  const grid = document.getElementById('classroom-seating-grid');
  grid.innerHTML = '';
  
  // Set css grid template columns dynamically
  grid.style.gridTemplateColumns = `repeat(${seatingState.cols}, 1fr)`;
  
  seatingState.cells.forEach((cell, idx) => {
    const cellEl = document.createElement('div');
    cellEl.className = 'seat-cell';
    cellEl.setAttribute('data-index', idx);
    
    // Seat number calculations (e.g. Row 1 Col 2)
    const rowNum = Math.floor(idx / seatingState.cols) + 1;
    const colNum = (idx % seatingState.cols) + 1;
    
    if (cell.type === 'empty') {
      cellEl.classList.add('empty-seat');
      cellEl.innerHTML = `
        <span class="seat-number">${rowNum}-${colNum}</span>
        <i class="fa-solid fa-ban" style="font-size: 16px; opacity:0.3;"></i>
      `;
    } else {
      cellEl.classList.add('active-seat');
      if (cell.student) {
        cellEl.innerHTML = `
          <span class="seat-number">${rowNum}-${colNum}</span>
          <span class="seat-student-name">${cell.student}</span>
        `;
      } else {
        cellEl.innerHTML = `
          <span class="seat-number">${rowNum}-${colNum}</span>
          <span style="font-size:11px;color:var(--text-muted);">無人</span>
        `;
      }
    }
    
    cellEl.onclick = () => toggleCellType(idx);
    grid.appendChild(cellEl);
  });
}

function renderUnassignedStudents() {
  const countLbl = document.getElementById('unassigned-count');
  const listContainer = document.getElementById('unassigned-students-list');
  
  countLbl.innerText = seatingState.unassigned.length;
  listContainer.innerHTML = '';
  
  if (seatingState.unassigned.length === 0) {
    listContainer.innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;width:100%;padding:20px;">所有學生皆已排座</div>';
    return;
  }
  
  seatingState.unassigned.forEach(name => {
    const el = document.createElement('div');
    el.className = 'mini-tag';
    el.innerText = name;
    listContainer.appendChild(el);
  });
}

// Fisher-Yates Shuffle local helper
function shuffleList(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomizeSeatingChart() {
  // 1. Gather all students
  const allStudents = shuffleList(getActiveStudents());
  if (allStudents.length === 0) {
    showCustomModal('排座失敗', '目前名單中沒有學生，請先至「名單與設定」中新增。');
    return;
  }
  
  // 2. Count active seats
  const activeCells = seatingState.cells.filter(c => c.type === 'active');
  if (activeCells.length === 0) {
    showCustomModal('排座失敗', '畫面上沒有可排座的座位。請點擊座位格子以啟用它們。');
    return;
  }
  
  // Clear existing student assignments
  seatingState.cells.forEach(c => c.student = null);
  
  // 3. Distribute students
  let studentIdx = 0;
  seatingState.cells.forEach(cell => {
    if (cell.type === 'active' && studentIdx < allStudents.length) {
      cell.student = allStudents[studentIdx];
      studentIdx++;
    }
  });
  
  // 4. Update unassigned pool
  seatingState.unassigned = studentIdx < allStudents.length ? allStudents.slice(studentIdx) : [];
  
  // Play major winning synthesis chord
  playSynthSound('win');
  
  // Render
  renderSeatingGrid();
  renderUnassignedStudents();
  
  // Trigger nice pop animation effect
  const cells = document.querySelectorAll('.seat-cell.active-seat');
  cells.forEach((cell, i) => {
    cell.style.animation = 'none';
    // Trigger reflow
    void cell.offsetWidth;
    cell.style.animation = `popIn 0.3s ease forwards`;
    cell.style.animationDelay = `${(i % seatingState.cols) * 0.03}s`;
  });
}

function clearSeatingArrangement() {
  seatingState.cells.forEach(c => c.student = null);
  seatingState.unassigned = getActiveStudents();
  
  playSynthSound('tick');
  
  renderSeatingGrid();
  renderUnassignedStudents();
}

function printSeatingChart() {
  // We trigger native browser print.
  // The print CSS stylesheet inside style.css handles layout adjustments automatically.
  window.print();
}
