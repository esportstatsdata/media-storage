let currentUser = null;
let currentPassword = null;
let currentPath = ''; 
let currentHistoryFiles = [];
window.currentFolders = []; 
let viewMode = 'list';
let rightClickedItem = null; // { path: string, type: 'file'|'folder', url?: string, originalName: string }
let pendingAction = null; 

// --- Session Persistence on Load ---
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = sessionStorage.getItem('cdn_user');
  const savedPass = sessionStorage.getItem('cdn_pass');
  if (savedUser && savedPass) {
    document.getElementById('loginUser').value = savedUser;
    document.getElementById('loginPassword').value = savedPass;
    const submitEvent = new Event('submit', { cancelable: true });
    handleLogin(submitEvent);
  }
});

// --- Toast Notifications ---
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--success)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
  } else if (type === 'danger') {
    iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--danger)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
  } else if (type === 'loading') {
    iconHtml = `<div class="spinner"></div>`;
  } else {
    iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--primary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
  }

  toast.innerHTML = `${iconHtml} <span>${message}</span>`;
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  return toast; // Return element so we can manually remove it if duration is 0
}

// --- Password Eye Toggle ---
function togglePassword() {
  const pwdInput = document.getElementById('loginPassword');
  const eyeIcon = document.getElementById('eyeIcon');
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    eyeIcon.innerHTML = `<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>`;
  } else {
    pwdInput.type = 'password';
    eyeIcon.innerHTML = `<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>`;
  }
}

// --- Authentication ---
async function handleLogin(e) {
  if(e) e.preventDefault();
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
      
      sessionStorage.setItem('cdn_user', user);
      sessionStorage.setItem('cdn_pass', password);
      
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appScreen').style.display = 'flex'; 
      document.getElementById('userNameDisplay').innerText = currentUser;
      document.getElementById('userAvatar').innerText = currentUser.charAt(0).toUpperCase();
      document.getElementById('loginPassword').value = '';
      
      loadFolders();
    } else {
      errorDiv.innerText = data.message || "Authentication failed.";
      sessionStorage.clear();
    }
  } catch (err) {
    errorDiv.innerText = "Network error. Please try again.";
  }
  btn.innerText = "Authorize Access";
  btn.disabled = false;
}

function logout() {
  currentUser = null; currentPassword = null;
  sessionStorage.clear();
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
    // Cache busting timestamp added here
    const res = await fetch(`/api/files?user=${currentUser}&action=getAllFolders&t=${Date.now()}`);
    const data = await res.json();
    
    select.innerHTML = '<option value="">/ (Root Directory)</option>';
    if (data.folders) data.folders.forEach(f => select.innerHTML += `<option value="${f}">/${f}</option>`);
    select.innerHTML += '<option value="new_folder">+ Create New Target Path</option>';
    
    select.value = "";
    toggleNewFolderInput();
  } catch (error) {
    select.innerHTML = '<option value="">/ (Root Directory)</option><option value="new_folder">+ Create New Target Path</option>';
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

// --- Image processing ---
function processFile(file, targetFormat) {
  return new Promise((resolve, reject) => {
    const originalExtension = file.name.split('.').pop().toLowerCase();
    if (!file.type.startsWith('image/') || targetFormat === 'original') {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result.split(',')[1], extension: originalExtension });
      reader.onerror = reject; reader.readAsDataURL(file); return;
    }
    const img = new Image(); 
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas'); 
        canvas.width = img.width; 
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        ctx.drawImage(img, 0, 0);
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
  
  grid.innerHTML = `
    <div class="loader-container">
      <div class="spinner"></div>
      <div>Syncing Network Storage...</div>
    </div>
  `;
  filesSection.innerHTML = '';
  
  if(toolbar) toolbar.style.display = 'none';
  if(searchContainer) searchContainer.style.display = 'none';
  if(hint) hint.style.display = 'none';
  document.getElementById('searchInput').value = '';
  
  currentHistoryFiles = [];
  window.currentFolders = [];
  
  try {
    // Cache busting timestamp completely fixes the CDN caching delay issue
    const cacheBuster = `&t=${Date.now()}`;
    const res = await fetch(`/api/files?user=${currentUser}&path=${encodeURIComponent(currentPath)}${cacheBuster}`);
    const data = await res.json();
    grid.innerHTML = ''; 
    
    if (data.folders && data.folders.length > 0) {
      window.currentFolders = data.folders;
      if(hint) hint.style.display = 'block';
    }

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

  container.innerHTML = '';
  if (filesToRender.length === 0 && foldersToRender.length === 0) {
    container.innerHTML = '<div style="padding: 2.5rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px;">No matching assets found.</div>';
    return;
  }

  if (filesToRender.length === 0) return;

  const fileIcon = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
  const genericIconLarge = `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>`;
  const copyIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
  const previewIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;

  let html = '';
  
  if (viewMode === 'list') {
    html = `<div class="table-container"><table><thead><tr><th style="width: 45%;">Asset Name</th><th style="width: 15%;">Size</th><th>CDN Endpoint & Actions</th></tr></thead><tbody>`;
    filesToRender.forEach(file => {
      html += `
        <tr oncontextmenu="showContextMenu(event, '${file.path}', 'file', '${file.originalName}', '${file.url}')">
          <td><div class="file-name-wrapper">${fileIcon} <span style="font-weight: 500;">${file.originalName}</span></div></td>
          <td style="color: var(--text-muted);">${formatBytes(file.size)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <a href="${file.url}" target="_blank" class="truncate-url" title="${file.url}">${file.url}</a>
              <button class="icon-btn" onclick="event.stopPropagation(); openPreview('${file.url}', '${file.rawName}')" title="Preview">${previewIcon}</button>
              <button class="icon-btn" onclick="event.stopPropagation(); copyToClipboard('${file.url}', this)" title="Copy URL">${copyIcon}</button>
            </div>
          </td>
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
          <div class="grid-preview" onclick="openPreview('${file.url}', '${file.rawName}')">${previewBlock}</div>
          <div class="grid-info">
            <div class="grid-title" title="${file.originalName}">${file.originalName}</div>
            <div class="grid-meta">
              <span>${formatBytes(file.size)}</span>
              <div style="display:flex; gap:0.25rem;">
                <button class="icon-btn" onclick="event.stopPropagation(); openPreview('${file.url}', '${file.rawName}')" title="Preview">${previewIcon}</button>
                <button class="icon-btn" onclick="event.stopPropagation(); copyToClipboard('${file.url}', this)" title="Copy URL">${copyIcon}</button>
              </div>
            </div>
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

async function triggerContextAction(action) {
  if (!rightClickedItem) return;
  document.getElementById('contextMenu').style.display = 'none';
  
  if (action === 'preview') {
    openPreview(rightClickedItem.url, rightClickedItem.originalName);
  } else if (action === 'copy') {
    copyToClipboard(rightClickedItem.url, null, true);
  } else if (action === 'delete') {
    if(confirm(`WARNING: Are you sure you want to permanently delete '${rightClickedItem.originalName}'?`)) {
      executeAction('DELETE');
    }
  } else {
    pendingAction = action.toUpperCase();
    const modal = document.getElementById('actionModal');
    const title = document.getElementById('actionModalTitle');
    const inputGroup = document.getElementById('actionInputGroup');
    const folderGroup = document.getElementById('actionFolderGroup');
    const label = document.getElementById('actionLabel');
    const input = document.getElementById('actionInput');
    const select = document.getElementById('actionFolderSelect');
    
    document.getElementById('actionError').innerText = "";
    
    if (pendingAction === 'RENAME') {
      folderGroup.style.display = 'none';
      inputGroup.style.display = 'block';
      title.innerText = rightClickedItem.type === 'folder' ? 'Rename Folder' : 'Rename Asset';
      label.innerText = 'New Name (include extension for files)';
      const parts = rightClickedItem.path.split('/');
      input.value = parts.pop(); 
    } else {
      title.innerText = pendingAction === 'MOVE' ? 'Move Asset' : 'Duplicate Asset';
      folderGroup.style.display = 'block';
      inputGroup.style.display = 'none'; 
      
      select.innerHTML = '<option value="">Loading directories...</option>';
      modal.style.display = 'flex';
      
      try {
        const res = await fetch(`/api/files?user=${currentUser}&action=getAllFolders&t=${Date.now()}`);
        const data = await res.json();
        const allFolders = data.folders || [];
        
        select.innerHTML = '<option value="">/ (Root Directory)</option>';
        allFolders.forEach(f => {
          if (rightClickedItem.type === 'folder' && f.startsWith(rightClickedItem.path)) return;
          select.innerHTML += `<option value="${f}">/${f}</option>`;
        });
        select.innerHTML += '<option value="new_path">+ Create New Target Path</option>';
      } catch(e) {
        select.innerHTML = '<option value="">/ (Root Directory)</option><option value="new_path">+ Create New Target Path</option>';
      }
      select.value = "";
    }
    
    modal.style.display = 'flex';
    if (pendingAction === 'RENAME') input.focus();
  }
}

function handleActionSelectChange() {
  const select = document.getElementById('actionFolderSelect');
  const inputGroup = document.getElementById('actionInputGroup');
  if (select.value === 'new_path') {
    inputGroup.style.display = 'block';
    document.getElementById('actionLabel').innerText = 'New Target Path';
    document.getElementById('actionInput').value = '';
    document.getElementById('actionInput').focus();
  } else {
    inputGroup.style.display = 'none';
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
  const errDiv = document.getElementById('actionError');
  const btn = document.getElementById('executeActionBtn');
  
  let newPath = null;
  
  if (actionToRun !== 'DELETE') {
    if (actionToRun === 'RENAME') {
      const inputVal = document.getElementById('actionInput').value.trim();
      if (!inputVal) { errDiv.innerText = "New name is required."; return; }
      
      const parts = rightClickedItem.path.split('/');
      parts.pop(); 
      newPath = parts.length > 0 ? parts.join('/') + '/' + inputVal : inputVal;
    } else {
      const selectVal = document.getElementById('actionFolderSelect').value;
      const inputVal = document.getElementById('actionInput').value.trim();
      const targetFolder = selectVal === 'new_path' ? inputVal : selectVal;
      
      if (selectVal === 'new_path' && !inputVal) { errDiv.innerText = "New path is required."; return; }
      
      const parts = rightClickedItem.path.split('/');
      const fileName = parts.pop();
      newPath = targetFolder ? targetFolder + '/' + fileName : fileName;
      
      if (actionToRun === 'DUPLICATE' && newPath === rightClickedItem.path) {
        const extIdx = fileName.lastIndexOf('.');
        const name = extIdx > -1 ? fileName.substring(0, extIdx) : fileName;
        const ext = extIdx > -1 ? fileName.substring(extIdx) : '';
        const newName = `${name}-copy${ext}`;
        newPath = targetFolder ? `${targetFolder}/${newName}` : newName;
      }
    }
    
    if (newPath === rightClickedItem.path && actionToRun !== 'DUPLICATE') {
      closeModal('actionModal'); return;
    }
  }

  if(btn) { btn.disabled = true; btn.innerText = "Processing..."; }
  
  // Create a persistent loading toast
  let loadingToast = null;
  if (actionToRun === 'DELETE') {
    loadingToast = showToast(`Deleting '${rightClickedItem.originalName}'... This may take a moment.`, 'loading', 0);
  } else {
    loadingToast = showToast(`Processing ${actionToRun.toLowerCase()}...`, 'loading', 0);
  }
  
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
    
    if (loadingToast) loadingToast.remove();
    
    if(res.ok) {
      showToast(`Asset successfully ${actionToRun.toLowerCase()}d!`, 'success');
      closeModal('actionModal');
      loadDirectoryContents(currentPath);
    } else throw new Error(data.message || "Operation failed.");
  } catch(err) {
    if (loadingToast) loadingToast.remove();
    showToast(err.message, 'danger');
    if(errDiv) errDiv.innerText = err.message;
  }
  
  if(btn) { btn.disabled = false; btn.innerText = "Confirm"; }
}

async function copyToClipboard(text, btnElement = null, noToast = false) {
  try {
    await navigator.clipboard.writeText(text);
    if (!noToast) showToast('CDN URL copied to clipboard!', 'success');
    
    if(btnElement) {
      const originalHTML = btnElement.innerHTML;
      btnElement.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
      setTimeout(() => btnElement.innerHTML = originalHTML, 2000);
    }
  } catch (err) {
    showToast('Failed to copy to clipboard.', 'danger');
  }
}

document.getElementById('historyCsvBtn').addEventListener('click', () => {
  const filesToExport = getFilteredFiles();
  if (filesToExport.length === 0) {
    showToast('No files to export.', 'danger');
    return;
  }
  let csvContent = "Original Name,File Size,CDN Link\n";
  filesToExport.forEach(file => { csvContent += `"${file.originalName}","${formatBytes(file.size)}","${file.url}"\n`; });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `Asset_Export_${Date.now()}.csv`);
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  showToast('Export successful!', 'success');
});
