let currentUser = null;
let currentPassword = null; // Secured in closure for editorial actions
let currentPath = ''; 
let currentHistoryFiles = [];
let viewMode = 'list';
let rightClickedFile = null;

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
      currentPassword = password; // Save for rename/delete api
      
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
  currentUser = null;
  currentPassword = null;
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

// --- Folder Management ---
async function loadFolders() {
  const select = document.getElementById('folderSelect');
  if(!select) return;
  select.innerHTML = '<option value="">Loading...</option>';
  
  try {
    const res = await fetch(`/api/files?user=${currentUser}`);
    const data = await res.json();
    
    select.innerHTML = '<option value="new_folder">+ Create New Folder / Path</option>';
    select.innerHTML += '<option value="">/ (Root Directory)</option>';
    
    if (data.folders && data.folders.length > 0) {
      data.folders.forEach(folder => {
        select.innerHTML += `<option value="${folder}">${folder}</option>`;
      });
      select.value = data.folders[0]; 
    } else {
      select.value = "new_folder";
    }
    toggleNewFolderInput();
  } catch (error) {
    select.innerHTML = '<option value="new_folder">+ Create New Folder / Path</option>';
    toggleNewFolderInput();
  }
}

function toggleNewFolderInput() {
  const select = document.getElementById('folderSelect');
  const input = document.getElementById('newFolderInput');
  if(select && input) {
    input.style.display = select.value === 'new_folder' ? 'block' : 'none';
  }
}

function getSelectedFolder() {
  const select = document.getElementById('folderSelect');
  if(!select) return '';
  if (select.value === 'new_folder') {
    return document.getElementById('newFolderInput').value.trim();
  }
  return select.value;
}

// --- Utility ---
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function updateFileMsg() {
  const input = document.getElementById('fileInput');
  const msg = document.getElementById('fileMsg');
  if (input.files && input.files.length > 1) {
    msg.innerText = `${input.files.length} assets queued`;
    msg.style.color = "var(--primary)";
  } else if (input.files && input.files.length === 1) {
    msg.innerText = input.files[0].name;
    msg.style.color = "var(--primary)";
  } else {
    msg.innerText = "or click to browse local storage";
    msg.style.color = "var(--text-muted)";
  }
}

function isImageExtension(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
}

function getFilteredFiles() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  return currentHistoryFiles.filter(f => 
    f.originalName.toLowerCase().includes(query) || 
    f.rawName.toLowerCase().includes(query)
  );
}

// --- Explorer Engine ---
async function loadDirectoryContents(targetPath = '') {
  currentPath = targetPath;
  renderBreadcrumbs();
  
  const grid = document.getElementById('historyFolderGrid');
  const filesSection = document.getElementById('historyFilesSection');
  const toolbar = document.getElementById('toolbarActions');
  const searchContainer = document.getElementById('searchContainer');
  const contextHint = document.getElementById('contextHint');
  
  grid.innerHTML = '<span style="color: var(--text-muted)">Scanning directory...</span>';
  filesSection.innerHTML = '';
  if(toolbar) toolbar.style.display = 'none';
  if(searchContainer) searchContainer.style.display = 'none';
  if(contextHint) contextHint.style.display = 'none';
  
  document.getElementById('searchInput').value = '';
  currentHistoryFiles = [];
  
  try {
    const res = await fetch(`/api/files?user=${currentUser}&path=${encodeURIComponent(currentPath)}`);
    const data = await res.json();
    
    grid.innerHTML = '';
    
    // Folders
    if (data.folders && data.folders.length > 0) {
      const folderIcon = `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
      data.folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = 'folder-card';
        div.innerHTML = `${folderIcon} <span>${folder}</span>`;
        div.onclick = () => loadDirectoryContents(currentPath ? `${currentPath}/${folder}` : folder);
        grid.appendChild(div);
      });
    }

    // Files
    if (data.files && data.files.length > 0) {
      if(toolbar) toolbar.style.display = 'flex';
      if(searchContainer) searchContainer.style.display = 'flex';
      if(contextHint) contextHint.style.display = 'block';
      
      data.files.forEach(file => {
        const originalNameMatch = file.name.match(/^\d+-(.+)$/);
        currentHistoryFiles.push({
          rawName: file.name,
          originalName: originalNameMatch ? originalNameMatch[1] : file.name,
          size: file.size,
          url: file.url,
          path: currentPath ? `${currentPath}/${file.name}` : file.name // needed for rename/delete
        });
      });
      
      renderFiles(); 
    }
    
    if (data.folders.length === 0 && data.files.length === 0) {
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

function renderFiles() {
  const container = document.getElementById('historyFilesSection');
  const filesToRender = getFilteredFiles();
  
  if (filesToRender.length === 0) {
    container.innerHTML = '<div style="padding: 2.5rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px;">No matching assets found.</div>';
    return;
  }

  const fileIcon = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
  const genericIconLarge = `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>`;

  let html = '';

  if (viewMode === 'list') {
    html = `<div class="table-container"><table><thead><tr><th style="width: 40%;">Asset Name</th><th style="width: 15%;">Size</th><th>CDN Endpoint</th></tr></thead><tbody>`;
    filesToRender.forEach(file => {
      // Attached oncontextmenu
      html += `
        <tr oncontextmenu="showContextMenu(event, '${file.url}')">
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
      const previewBlock = isImg ? `<img src="${file.url}" alt="${file.originalName}" loading="lazy">` : genericIconLarge;
      // Attached oncontextmenu  
      html += `
        <div class="grid-card" oncontextmenu="showContextMenu(event, '${file.url}')">
          <div class="grid-preview">${previewBlock}</div>
          <div class="grid-info">
            <div class="grid-title" title="${file.originalName}">${file.originalName}</div>
            <div class="grid-meta">
              <span>${formatBytes(file.size)}</span>
              <span>Right-Click Menu</span>
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

// --- Context Menu Logic (Right Click) ---
function showContextMenu(e, fileUrl) {
  e.preventDefault();
  
  // Find the exact file object
  rightClickedFile = currentHistoryFiles.find(f => f.url === fileUrl);
  if(!rightClickedFile) return;

  const menu = document.getElementById('contextMenu');
  menu.style.display = 'flex';
  
  // Ensure menu stays within screen bounds
  let x = e.pageX;
  let y = e.pageY;
  const menuWidth = 220; 
  const menuHeight = 180;
  
  if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
  if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
  
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

// Hide context menu on left click anywhere
document.addEventListener('click', () => {
  document.getElementById('contextMenu').style.display = 'none';
});

// Trigger actions from the context menu
function triggerContextAction(action) {
  if (!rightClickedFile) return;
  document.getElementById('contextMenu').style.display = 'none'; // hide menu
  
  if (action === 'preview') {
    openPreview(rightClickedFile.url, rightClickedFile.rawName);
  } else if (action === 'copy') {
    copyToClipboard(rightClickedFile.url);
  } else if (action === 'rename') {
    document.getElementById('renameInput').value = rightClickedFile.rawName;
    document.getElementById('renameError').innerText = "";
    document.getElementById('renameModal').style.display = 'flex';
  } else if (action === 'delete') {
    if(confirm(`WARNING: Are you sure you want to permanently delete '${rightClickedFile.originalName}'? This action cannot be undone.`)) {
      executeDelete();
    }
  }
}

// --- Editorial API Integrations ---
async function executeRename() {
  const newName = document.getElementById('renameInput').value.trim();
  const errDiv = document.getElementById('renameError');
  const btn = document.getElementById('executeRenameBtn');
  
  if(!newName || newName === rightClickedFile.rawName) { 
    closeRename(); 
    return; 
  }

  btn.disabled = true; 
  btn.innerText = "Processing...";
  
  try {
    const res = await fetch('/api/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'RENAME', 
        targetPath: rightClickedFile.path, 
        newName: newName, 
        user: currentUser, 
        password: currentPassword 
      })
    });
    const data = await res.json();
    
    if(res.ok) {
      closeRename();
      loadDirectoryContents(currentPath); // Refresh UI
    } else throw new Error(data.message);
  } catch(err) {
    errDiv.innerText = err.message || "Rename failed. Check repository permissions.";
  }
  
  btn.disabled = false; 
  btn.innerText = "Save Changes";
}

function closeRename(e) {
  if (e && e.target.id !== 'renameModal' && !e.target.classList.contains('secondary')) return;
  document.getElementById('renameModal').style.display = 'none';
  rightClickedFile = null;
}

async function executeDelete() {
  try {
    const res = await fetch('/api/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'DELETE', 
        targetPath: rightClickedFile.path, 
        user: currentUser, 
        password: currentPassword 
      })
    });
    
    if(res.ok) {
      loadDirectoryContents(currentPath); // Refresh UI
    } else {
      alert("Failed to delete asset. Please check if your GitHub token has the correct 'repo' scope.");
    }
  } catch(err) { 
    alert("Network error during deletion."); 
  }
}

// --- Preview & Export ---
function openPreview(url, fileName) {
  const modal = document.getElementById('previewModal');
  const container = document.getElementById('mediaContainer');
  document.getElementById('previewFileName').innerText = fileName;
  
  container.innerHTML = '<span style="color: var(--text-muted);">Loading asset...</span>';
  modal.style.display = 'flex';
  
  const ext = fileName.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
    container.innerHTML = `<video controls autoplay class="preview-media" src="${url}"></video>`;
  } else {
    const img = new Image();
    img.onload = () => container.innerHTML = `<img src="${url}" class="preview-media" alt="${fileName}">`;
    img.onerror = () => container.innerHTML = '<span style="color: var(--danger);">Preview unavailable.</span>';
    img.src = url;
  }
}

function closePreview(e) {
  if (e && e.target.id !== 'previewModal' && !e.target.classList.contains('modal-close')) return;
  document.getElementById('previewModal').style.display = 'none';
  document.getElementById('mediaContainer').innerHTML = ''; 
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    // Optional: Add a small toast notification here if desired
  } catch (err) {}
}

document.getElementById('historyCsvBtn').addEventListener('click', () => {
  const filesToExport = getFilteredFiles();
  if (filesToExport.length === 0) return;
  
  let csvContent = "Original Name,File Size,CDN Link\n";
  filesToExport.forEach(file => {
    csvContent += `"${file.originalName}","${formatBytes(file.size)}","${file.url}"\n`;
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `Asset_Export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// --- Upload Engine ---
document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
  const formatSelect = document.getElementById('formatSelect').value;
  const statusDiv = document.getElementById('status');
  const btn = document.getElementById('uploadBtn');
  const targetFolder = getSelectedFolder(); 
  
  if (!fileInput.files.length) {
    statusDiv.innerText = "No assets selected.";
    statusDiv.style.color = "var(--danger)";
    return;
  }

  btn.disabled = true;
  statusDiv.style.color = "var(--primary)";
  const files = Array.from(fileInput.files);
  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    statusDiv.innerText = `Deploying [${i + 1}/${files.length}]: ${file.name}`;
    
    try {
      const { base64, extension } = await processFile(file, formatSelect);
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const timestampedName = `${Date.now()}-${baseName.replace(/\s+/g, '-')}.${extension}`;

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64,
          fileName: timestampedName,
          user: currentUser,
          folder: targetFolder
        })
      });

      if (response.ok) successCount++;
    } catch (error) {}
  }

  statusDiv.innerText = `Operation Complete: ${successCount} asset(s) successfully pushed to CDN.`;
  btn.disabled = false;
  fileInput.value = ""; 
  updateFileMsg();
  
  loadFolders();
});

function processFile(file, targetFormat) {
  return new Promise((resolve, reject) => {
    const originalExtension = file.name.split('.').pop().toLowerCase();
    if (!file.type.startsWith('image/') || targetFormat === 'original') {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result.split(',')[1], extension: originalExtension });
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const mimeType = targetFormat === 'webp' ? 'image/webp' : 'image/png';
        resolve({ base64: canvas.toDataURL(mimeType, 0.9).split(',')[1], extension: targetFormat });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
