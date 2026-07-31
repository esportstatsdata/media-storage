let currentUser = null;
let currentPath = ''; 
let currentHistoryFiles = [];
let viewMode = 'list'; // Default state: 'list' or 'grid'

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
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appScreen').style.display = 'flex'; 
      document.getElementById('userNameDisplay').innerText = currentUser;
      document.getElementById('userAvatar').innerText = currentUser.charAt(0).toUpperCase();
      document.getElementById('loginPassword').value = '';
      
      // Load folders for the upload tab
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

// --- Folder Management for Upload Tab ---
async function loadFolders() {
  const select = document.getElementById('folderSelect');
  if(!select) return;
  select.innerHTML = '<option value="">Loading...</option>';
  
  try {
    // Fetch root folders using the files API
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
  return select.value; // Empty string acts as root
}

// --- Utility Functions ---
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
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
  
  grid.innerHTML = '<span style="color: var(--text-muted)">Scanning directory...</span>';
  filesSection.innerHTML = '';
  if(toolbar) toolbar.style.display = 'none';
  if(searchContainer) searchContainer.style.display = 'none';
  document.getElementById('searchInput').value = '';
  currentHistoryFiles = [];
  
  try {
    const res = await fetch(`/api/files?user=${currentUser}&path=${encodeURIComponent(currentPath)}`);
    const data = await res.json();
    
    grid.innerHTML = '';
    
    // Render Folders
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

    // Process Files
    if (data.files && data.files.length > 0) {
      if(toolbar) toolbar.style.display = 'flex';
      if(searchContainer) searchContainer.style.display = 'flex';
      
      data.files.forEach(file => {
        const originalNameMatch = file.name.match(/^\d+-(.+)$/);
        const originalName = originalNameMatch ? originalNameMatch[1] : file.name;
        
        currentHistoryFiles.push({
          rawName: file.name,
          originalName: originalName,
          size: file.size,
          url: file.url
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
  const copyIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
  const previewIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;

  let html = '';

  if (viewMode === 'list') {
    html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">Asset Name</th>
              <th style="width: 15%;">Size</th>
              <th>CDN Endpoint</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    filesToRender.forEach(file => {
      html += `
        <tr>
          <td>
            <div class="file-name-wrapper">
              ${fileIcon} <span style="font-weight: 500;">${file.originalName}</span>
            </div>
          </td>
          <td style="color: var(--text-muted);">${formatBytes(file.size)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <a href="${file.url}" target="_blank" class="truncate-url" title="${file.url}" style="margin-right: auto;">${file.url}</a>
              <button class="icon-btn" onclick="openPreview('${file.url}', '${file.rawName}')" title="Preview">${previewIcon}</button>
              <button class="icon-btn" onclick="copyToClipboard('${file.url}', this)" title="Copy URL">${copyIcon}</button>
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
      const previewBlock = isImg 
        ? `<img src="${file.url}" alt="${file.originalName}" loading="lazy">` 
        : genericIconLarge;
        
      html += `
        <div class="grid-card">
          <div class="grid-preview">${previewBlock}</div>
          <div class="grid-info">
            <div class="grid-title" title="${file.originalName}">${file.originalName}</div>
            <div class="grid-meta">
              <span>${formatBytes(file.size)}</span>
              <div class="grid-actions">
                <button class="icon-btn" onclick="openPreview('${file.url}', '${file.rawName}')" title="Preview">${previewIcon}</button>
                <button class="icon-btn" onclick="copyToClipboard('${file.url}', this)" title="Copy URL">${copyIcon}</button>
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

// --- Breadcrumb Renderer ---
function renderBreadcrumbs() {
  const nav = document.getElementById('breadcrumbNav');
  const homeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
  
  if (!currentPath) {
    nav.innerHTML = `<span class="crumb active">${homeIcon} Root Directory</span>`;
    return;
  }

  const parts = currentPath.split('/');
  let html = `<span class="crumb" onclick="loadDirectoryContents('')">${homeIcon} Root</span>`;
  
  let accumulatedPath = '';
  parts.forEach((part, index) => {
    accumulatedPath += (index === 0 ? part : `/${part}`);
    html += `<span class="crumb-separator">/</span>`;
    
    if (index === parts.length - 1) {
      html += `<span class="crumb active">${part}</span>`;
    } else {
      const target = accumulatedPath;
      html += `<span class="crumb" onclick="loadDirectoryContents('${target}')">${part}</span>`;
    }
  });
  
  nav.innerHTML = html;
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

async function copyToClipboard(text, buttonElement) {
  try {
    await navigator.clipboard.writeText(text);
    const originalHTML = buttonElement.innerHTML;
    buttonElement.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
    setTimeout(() => buttonElement.innerHTML = originalHTML, 2000);
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
  const targetFolder = getSelectedFolder(); // Correctly grabs dropdown or text input
  
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
  
  // Refresh folder list to include any newly created paths
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
