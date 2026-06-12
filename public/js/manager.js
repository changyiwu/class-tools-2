// Student Manager Module State
let activeEditorClassId = '';

document.addEventListener('DOMContentLoaded', () => {
  // Set default editing class to the active global class
  activeEditorClassId = appState.activeClassId;
  
  // Register callbacks
  registerViewSwitchCallback((viewName) => {
    if (viewName === 'manager') {
      renderManagerUI();
    }
  });

  registerClassChangeCallback((classId) => {
    // Sync editor if global class changes
    activeEditorClassId = classId;
    if (appState.currentView === 'manager') {
      renderManagerUI();
    }
  });
});

function renderManagerUI() {
  const container = document.getElementById('manager-class-list-container');
  container.innerHTML = '';
  
  appState.classes.forEach(cls => {
    const isGlobalActive = cls.id === appState.activeClassId;
    const isEditing = cls.id === activeEditorClassId;
    
    const card = document.createElement('div');
    card.className = `class-list-item-card`;
    if (isEditing) card.classList.add('active');
    
    // Check if delete button should be shown (must have at least 1 class remaining)
    const showDeleteBtn = appState.classes.length > 1;
    const deleteBtnHtml = showDeleteBtn 
      ? `<i class="fa-solid fa-trash-can" onclick="deleteClassList('${cls.id}', event)" style="color:var(--text-muted); cursor:pointer;" title="刪除名單"></i>`
      : '';
      
    const activeIndicatorHtml = isGlobalActive 
      ? `<span style="font-size: 10px; color:var(--accent-secondary); background:hsla(190, 90%, 50%, 0.1); border: 1px solid var(--accent-secondary); padding: 2px 6px; border-radius:10px;">目前選用</span>`
      : `<button class="btn" style="padding: 3px 8px; font-size:10px;" onclick="setGlobalActiveClassFromManager('${cls.id}', event)">選用</button>`;
    
    card.innerHTML = `
      <div class="class-list-info">
        <span class="class-list-name-txt">${cls.name}</span>
        <span class="class-list-count">${cls.students.length} 人</span>
      </div>
      <div class="class-list-actions" style="display:flex; align-items:center; gap:12px;">
        ${activeIndicatorHtml}
        ${deleteBtnHtml}
      </div>
    `;
    
    card.onclick = () => selectClassToEdit(cls.id);
    container.appendChild(card);
  });
  
  // Update editor inputs
  loadClassEditorValues();
}

function selectClassToEdit(classId) {
  activeEditorClassId = classId;
  playSynthSound('tick');
  renderManagerUI();
}

function setGlobalActiveClassFromManager(classId, event) {
  event.stopPropagation(); // Prevent card edit click trigger
  changeActiveGlobalClass(classId);
  document.getElementById('header-class-select').value = classId;
  playSynthSound('win');
  renderManagerUI();
}

function loadClassEditorValues() {
  const currentClass = appState.classes.find(c => c.id === activeEditorClassId);
  if (!currentClass) return;
  
  document.getElementById('editor-title-lbl').innerText = `編輯班級：${currentClass.name}`;
  document.getElementById('edit-class-name-input').value = currentClass.name;
  document.getElementById('edit-class-students-textarea').value = currentClass.students.join('\n');
}

function restoreActiveEditorInfo() {
  playSynthSound('tick');
  loadClassEditorValues();
}

function saveClassListEdits() {
  const nameInput = document.getElementById('edit-class-name-input');
  const txtArea = document.getElementById('edit-class-students-textarea');
  
  const classObj = appState.classes.find(c => c.id === activeEditorClassId);
  if (!classObj) return;
  
  const newName = nameInput.value.trim();
  if (!newName) {
    showCustomModal('儲存失敗', '班級名稱不可以是空白喔！');
    return;
  }
  
  // Parse student names: filter out empty names
  const lines = txtArea.value.split('\n');
  const students = lines
    .map(line => line.trim())
    .filter(line => line.length > 0);
    
  // Update state
  classObj.name = newName;
  classObj.students = students;
  
  saveClassesToStorage();
  updateHeaderClassDropdown();
  
  // Play chime and show success feedback
  playSynthSound('win');
  
  // If editing class is currently the global active class, trigger reloading hooks
  if (activeEditorClassId === appState.activeClassId) {
    changeActiveGlobalClass(activeEditorClassId);
  }
  
  showCustomModal('儲存成功', `班級名單「${newName}」（共 ${students.length} 名學生）已成功儲存！`);
  renderManagerUI();
}

function createNewClassList() {
  const newId = `class_${Date.now()}`;
  const newClass = {
    id: newId,
    name: '新增班級名單',
    students: ['學生 1', '學生 2', '學生 3']
  };
  
  appState.classes.push(newClass);
  saveClassesToStorage();
  updateHeaderClassDropdown();
  
  activeEditorClassId = newId;
  playSynthSound('tick');
  
  renderManagerUI();
}

function deleteClassList(classId, event) {
  event.stopPropagation(); // Prevent selection click
  
  const classObj = appState.classes.find(c => c.id === classId);
  if (!classObj) return;
  
  showCustomModal('確認刪除', `確定要永久刪除「${classObj.name}」這份名單嗎？此動作無法復原！`, true).then(confirmed => {
    if (confirmed) {
      // Remove class
      appState.classes = appState.classes.filter(c => c.id !== classId);
      saveClassesToStorage();
      updateHeaderClassDropdown();
      
      // Re-adjust references if needed
      if (appState.activeClassId === classId) {
        appState.activeClassId = appState.classes[0].id;
        localStorage.setItem('classhub_active_class_id', appState.activeClassId);
        changeActiveGlobalClass(appState.activeClassId);
        document.getElementById('header-class-select').value = appState.activeClassId;
      }
      
      if (activeEditorClassId === classId) {
        activeEditorClassId = appState.classes[0].id;
      }
      
      playSynthSound('tick');
      renderManagerUI();
    }
  });
}
