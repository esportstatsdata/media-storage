let currentUser = null;
let currentPassword = null;
let currentPath = ''; 
let currentHistoryFiles = [];
window.currentFolders = []; 
let viewMode = 'list';
let rightClickedItem = null; // { path: string, type: 'file' | 'folder', url?: string, originalName: string }
let pendingAction = null; // 'RENAME' | 'MOVE' | 'DUPLICATE'

// --- Authentication ---
async function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const errorDiv = document.getElementById('loginError');
  
  btn.innerText = "Authorizing...";
  btn.disabled = true;
  errorDiv.innerText = "";

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      currentUser = user;
      currentPassword = password; 
      
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appScreen').style.display = 'flex'; 
      document.getElementById('userNameDisplay').innerText = currentUser;
      document.getElementById('userAvatar').innerText = currentUser.charAt(0).toUpperCase();
      document.getElementById('loginPassword').value = '';
      
      loadFolders();
    } else {
      errorDiv.innerText = data.message || "Authentication failed.";
    }
  } catch (err) {
    errorDiv.innerText = "Network error. Please try again.";
  }
  btn.innerText = "Authorize Access";
  btn.disabled = false;
}

function logout() {
  currentUser = null; currentPassword = null;
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUser').value = '';
}

// --- Navigation ---
function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  
  if(tabId === 'upload') {
    document.getElementById('nav-upload').classList.add('active');
    document.getElementById('uploadTab').classList.add('active');
    loadFolders(); 
  } else {
    document.getElementById('nav-history').classList.add('active');
    document.getElementById('historyTab').classList.add('active');
    currentPath = ''; 
    loadDirectoryContents();
  }
}

// --- Upload Engine ---
async function loadFolders() {
  const select = document.getElementById('folderSelect');
  if(!select) return;
  select.innerHTML = '<option value="">Loading...</option>';
  try {
    const res = await fetch(`/api/files?user=${currentUser}`);
    const data = await res.json();
    
    select.innerHTML = '<option value="new_folder">+ Create New Path</option><option value="">/ (Root Directory)</option>';
    if (data.folders) data.folders.forEach(f => select.innerHTML += `<option value="${f}">${f}</option>`);
    select.value = data.folders && data.folders.length > 0 ? data.folders[0] : "new_folder";
    toggleNewFolderInput();
  } catch (error) {
    select.innerHTML = '<option value="new_folder">+ Create New Path</option>';
    toggleNewFolderInput();
  }
}

function toggleNewFolderInput() {
  const s = document.getElementById('folderSelect');
  const i = document.getElementById('newFolderInput');
  if(s && i) i.style.display = s.value === 'new_folder' ? 'block' : 'none';
}

function getSelectedFolder() {
  const s = document.getElementById('folderSelect');
  if(!s) return '';
  return s.value === 'new_folder' ? document.getElementById('newFolderInput').value.trim() : s.value;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateFileMsg() {
  const input = document.getElementById('fileInput');
  const msg = document.getElementById('fileMsg');
  if (input.files && input.files.length > 1) {
    msg.innerText = `${input.files.length} assets queued`; msg.style.color = "var(--primary)";
  } else if (input.files && input.files.length === 1) {
    msg.innerText = input.files[0].name; msg.style.color = "var(--primary)";
  } else {
    msg.innerText = "or click to browse local storage"; msg.style.color = "var(--text-muted)";
  }
}

document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
  const formatSelect = document.getElementById('formatSelect').value;
  const statusDiv = document.getElementById('status');
  const btn = document.getElementById('uploadBtn');
  const targetFolder = getSelectedFolder(); 
  
  if (!fileInput.files.length) { statusDiv.innerText = "No assets selected."; return; }

  btn.disabled = true; statusDiv.style.color = "var(--primary)";
  const files = Array.from(fileInput.files);
  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    statusDiv.innerText = `Deploying [${i + 1}/${files.length}]: ${files[i].name}`;
    try {
      const { base64, extension } = await processFile(files[i], formatSelect);
      const baseName = files[i].name.substring(0, files[i].name.lastIndexOf('.')) || files[i].name;
      const timestampedName = `${Date.now()}-${baseName.replace(/\s+/g, '-')}.${extension}`;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64, fileName: timestampedName, user: currentUser, folder: targetFolder })
      });
      if (res.ok) successCount++;
    } catch (e) {}
  }
  statusDiv.innerText = `Operation Complete: ${successCount} asset(s) pushed.`;
  btn.disabled = false; fileInput.value = ""; updateFileMsg(); loadFolders();
});

function processFile(file, targetFormat) {
  return new Promise((resolve, reject) => {
    const originalExtension = file.name.split('.').pop().toLowerCase();
    if (!file.type.startsWith('image/') || targetFormat === 'original') {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result.split(',')[1], extension: originalExtension });
      reader.onerror = reject; reader.readAsDataURL(file); return;
    }
    const img = new Image(); const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0);
        const mimeType = targetFormat === 'webp' ? 'image/webp' : 'image/png';
        resolve({ base64: canvas.toDataURL(mimeType, 0.9).split(',')[1], extension: targetFormat });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// --- Explorer Engine ---
function isImageExtension(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
}

async function loadDirectoryContents(targetPath = '') {
  currentPath = targetPath;
  renderBreadcrumbs();
  
  const grid = document.getElementById('historyFolderGrid');
  const filesSection = document.getElementById('historyFilesSection');
  const toolbar = document.getElementById('toolbarActions');
  const searchContainer = document.getElementById('searchContainer');
  const hint = document.getElementById('contextHint');
  
  grid.innerHTML = '<span style="color: var(--text-muted)">Scanning network...</span>';
  filesSection.innerHTML = '';
  if(toolbar) toolbar.style.display = 'none';
  if(searchContainer) searchContainer.style.display = 'none';
  if(hint) hint.style.display = 'none';
  document.getElementById('searchInput').value = '';
  
  currentHistoryFiles = [];
  window.currentFolders = [];
  
  try {
    const res = await fetch(`/api/files?user=${currentUser}&path=${encodeURIComponent(currentPath)}`);
    const data = await res.json();
    grid.innerHTML = '';
    
    // Folders
    if (data.folders && data.folders.length > 0) {
      window.currentFolders = data.folders;
      if(hint) hint.style.display = 'block';
    }

    // Files
    if (data.files && data.files.length > 0) {
      if(toolbar) toolbar.style.display = 'flex';
      if(searchContainer) searchContainer.style.display = 'flex';
      if(hint) hint.style.display = 'block';
      
      data.files.forEach(file => {
        const originalNameMatch = file.name.match(/^\d+-(.+)$/);
        currentHistoryFiles.push({
          rawName: file.name,
          originalName: originalNameMatch ? originalNameMatch[1] : file.name,
          size: file.size,
          url: file.url,
          path: currentPath ? `${currentPath}/${file.name}` : file.name
        });
      });
    }
    
    renderFiles();
    
    if (window.currentFolders.length === 0 && currentHistoryFiles.length === 0) {
      grid.innerHTML = '<span style="color: var(--text-muted)">Directory is empty.</span>';
    }
    
  } catch (error) {
    grid.innerHTML = '<span style="color: var(--danger);">Directory access failed.</span>';
  }
}

// --- Dynamic View Renderer ---
function changeViewMode(mode) {
  viewMode = mode;
  document.getElementById('btn-view-list').classList.remove('active-view');
  document.getElementById('btn-view-grid').classList.remove('active-view');
  document.getElementById(`btn-view-${mode}`).classList.add('active-view');
  renderFiles();
}

function getFilteredFiles() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  return currentHistoryFiles.filter(f => f.originalName.toLowerCase().includes(query) || f.rawName.toLowerCase().includes(query));
}

function getFilteredFolders() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  return window.currentFolders.filter(f => f.toLowerCase().includes(query));
}

function renderFiles() {
  const grid = document.getElementById('historyFolderGrid');
  const container = document.getElementById('historyFilesSection');
  
  const filesToRender = getFilteredFiles();
  const foldersToRender = getFilteredFolders();
  
  // Render Folders
  grid.innerHTML = '';
  const folderIcon = `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
  foldersToRender.forEach(folder => {
    const fPath = currentPath ? `${currentPath}/${folder}` : folder;
    const div = document.createElement('div');
    div.className = 'folder-card';
    div.innerHTML = `${folderIcon} <span>${folder}</span>`;
    div.onclick = () => loadDirectoryContents(fPath);
    div.oncontextmenu = (e) => showContextMenu(e, fPath, 'folder', folder);
    grid.appendChild(div);
  });

  // Render Files
  container.innerHTML = '';
  if (filesToRender.length === 0 && foldersToRender.length === 0) {
    container.innerHTML = '<div style="padding: 2.5rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px;">No matching assets found.</div>';
    return;
  }

  if (filesToRender.length === 0) return;

  const fileIcon = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
  const genericIconLarge = `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>`;

  let html = '';
  if (viewMode === 'list') {
    html = `<div class="table-container"><table><thead><tr><th style="width: 45%;">Asset Name</th><th style="width: 15%;">Size</th><th>CDN Endpoint</th></tr></thead><tbody>`;
    filesToRender.forEach(file => {
      html += `
        <tr oncontextmenu="showContextMenu(event, '${file.path}', 'file', '${file.originalName}', '${file.url}')">
          <td><div class="file-name-wrapper">${fileIcon} <span style="font-weight: 500;">${file.originalName}</span></div></td>
          <td style="color: var(--text-muted);">${formatBytes(file.size)}</td>
          <td><a href="${file.url}" target="_blank" class="truncate-url" title="${file.url}">${file.url}</a></td>
        </tr>
      `;
    });
    html += `</tbody></table></div>`;
    
  } else if (viewMode === 'grid') {
    html = `<div class="grid-view-container">`;
    filesToRender.forEach(file => {
      const isImg = isImageExtension(file.rawName);
      const previewBlock = isImg ? `<img src="${file.url}" loading="lazy">` : genericIconLarge;
      html += `
        <div class="grid-card" oncontextmenu="showContextMenu(event, '${file.path}', 'file', '${file.originalName}', '${file.url}')">
          <div class="grid-preview">${previewBlock}</div>
          <div class="grid-info">
            <div class="grid-title" title="${file.originalName}">${file.originalName}</div>
            <div class="grid-meta"><span>${formatBytes(file.size)}</span></div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
}

function renderBreadcrumbs() {
  const nav = document.getElementById('breadcrumbNav');
  const homeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
  if (!currentPath) { nav.innerHTML = `<span class="crumb active">${homeIcon} Root Directory</span>`; return; }

  const parts = currentPath.split('/');
  let html = `<span class="crumb" onclick="loadDirectoryContents('')">${homeIcon} Root</span>`;
  let accumulatedPath = '';
  parts.forEach((part, index) => {
    accumulatedPath += (index === 0 ? part : `/${part}`);
    html += `<span class="crumb-separator">/</span>`;
    if (index === parts.length - 1) html += `<span class="crumb active">${part}</span>`;
    else html += `<span class="crumb" onclick="loadDirectoryContents('${accumulatedPath}')">${part}</span>`;
  });
  nav.innerHTML = html;
}

// --- Context Menu Logic ---
function showContextMenu(e, path, type, originalName, url = null) {
  e.preventDefault();
  e.stopPropagation();
  
  rightClickedItem = { path, type, originalName, url };
  
  const menu = document.getElementById('contextMenu');
  const previewItem = document.getElementById('menu-preview');
  const copyItem = document.getElementById('menu-copy');
  const divider = document.getElementById('menu-divider-1');

  if (type === 'folder') {
    previewItem.style.display = 'none';
    copyItem.style.display = 'none';
    divider.style.display = 'none';
  } else {
    previewItem.style.display = 'flex';
    copyItem.style.display = 'flex';
    divider.style.display = 'block';
  }
  
  menu.style.display = 'flex';
  
  let x = e.pageX; let y = e.pageY;
  if (x + 220 > window.innerWidth) x = window.innerWidth - 230;
  if (y + 250 > window.innerHeight) y = window.innerHeight - 260;
  
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

document.addEventListener('click', () => { document.getElementById('contextMenu').style.display = 'none'; });

function triggerContextAction(action) {
  if (!rightClickedItem) return;
  document.getElementById('contextMenu').style.display = 'none';
  
  if (action === 'preview') {
    openPreview(rightClickedItem.url, rightClickedItem.originalName);
  } else if (action === 'copy') {
    navigator.clipboard.writeText(rightClickedItem.url);
  } else if (action === 'delete') {
    if(confirm(`WARNING: Are you sure you want to permanently delete '${rightClickedItem.originalName}'?`)) {
      executeAction('DELETE');
    }
  } else {
    // Open dynamic modal for Rename, Move, Duplicate
    pendingAction = action.toUpperCase();
    const modal = document.getElementById('actionModal');
    const title = document.getElementById('actionModalTitle');
    const label = document.getElementById('actionLabel');
    const input = document.getElementById('actionInput');
    
    document.getElementById('actionError').innerText = "";
    
    if (pendingAction === 'RENAME') {
      title.innerText = rightClickedItem.type === 'folder' ? 'Rename Folder' : 'Rename Asset';
      label.innerText = 'New Name';
      // Fill just the end name
      const parts = rightClickedItem.path.split('/');
      input.value = parts.pop(); 
    } else if (pendingAction === 'MOVE') {
      title.innerText = 'Move to Path';
      label.innerText = 'Target Directory (e.g. Archive/2026)';
      // Fill current path folder
      const parts = rightClickedItem.path.split('/');
      parts.pop();
      input.value = parts.join('/');
    } else if (pendingAction === 'DUPLICATE') {
      title.innerText = 'Duplicate to Path';
      label.innerText = 'Target Directory (e.g. Backups/2026)';
      const parts = rightClickedItem.path.split('/');
      parts.pop();
      input.value = parts.join('/');
    }
    
    modal.style.display = 'flex';
    input.focus();
  }
}

// --- Modals & APIs ---
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  if (id === 'actionModal') pendingAction = null;
  if (id === 'previewModal') document.getElementById('mediaContainer').innerHTML = '';
}

function openPreview(url, fileName) {
  const container = document.getElementById('mediaContainer');
  document.getElementById('previewFileName').innerText = fileName;
  container.innerHTML = '<span style="color: var(--text-muted);">Loading asset...</span>';
  document.getElementById('previewModal').style.display = 'flex';
  
  const ext = fileName.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
    container.innerHTML = `<video controls autoplay class="preview-media" src="${url}"></video>`;
  } else {
    const img = new Image();
    img.onload = () => container.innerHTML = `<img src="${url}" class="preview-media">`;
    img.onerror = () => container.innerHTML = '<span style="color: var(--danger);">Preview unavailable.</span>';
    img.src = url;
  }
}

async function executeAction(overrideAction = null) {
  const actionToRun = overrideAction || pendingAction;
  const inputVal = document.getElementById('actionInput').value.trim();
  const errDiv = document.getElementById('actionError');
  const btn = document.getElementById('executeActionBtn');
  
  let newPath = null;
  
  if (actionToRun !== 'DELETE') {
    if (!inputVal) { errDiv.innerText = "Value is required."; return; }
    
    if (actionToRun === 'RENAME') {
      const parts = rightClickedItem.path.split('/');
      parts.pop(); // remove old name
      newPath = parts.length > 0 ? parts.join('/') + '/' + inputVal : inputVal;
    } else {
      // For move/duplicate, inputVal is the destination folder
      const parts = rightClickedItem.path.split('/');
      const fileName = parts.pop();
      newPath = inputVal ? inputVal + '/' + fileName : fileName;
    }
    
    if (newPath === rightClickedItem.path && actionToRun !== 'DUPLICATE') {
      closeModal('actionModal'); return;
    }
  }

  if(btn) { btn.disabled = true; btn.innerText = "Processing..."; }
  
  try {
    const res = await fetch('/api/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: actionToRun, 
        targetPath: rightClickedItem.path, 
        newPath: newPath, 
        user: currentUser, 
        password: currentPassword 
      })
    });
    const data = await res.json();
    
    if(res.ok) {
      closeModal('actionModal');
      loadDirectoryContents(currentPath);
    } else throw new Error(data.message || "Operation failed.");
  } catch(err) {
    if(errDiv) errDiv.innerText = err.message;
    else alert(err.message);
  }
  
  if(btn) { btn.disabled = false; btn.innerText = "Confirm"; }
}

document.getElementById('historyCsvBtn').addEventListener('click', () => {
  const filesToExport = getFilteredFiles();
  if (filesToExport.length === 0) return;
  let csvContent = "Original Name,File Size,CDN Link\n";
  filesToExport.forEach(file => { csvContent += `"${file.originalName}","${formatBytes(file.size)}","${file.url}"\n`; });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `Asset_Export_${Date.now()}.csv`);
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
});
