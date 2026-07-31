let currentUser = null;
let currentPassword = null; // Stored securely in closure for editorial actions
let currentPath = ''; 
let currentHistoryFiles = [];
let selectedFile = null;

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
      currentPassword = password; // Needed for editorial actions
      
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appScreen').style.display = 'flex'; 
      document.getElementById('userNameDisplay').innerText = currentUser;
      document.getElementById('userAvatar').innerText = currentUser.charAt(0).toUpperCase();
      document.getElementById('loginPassword').value = '';
      
      switchTab('history');
    } else {
      errorDiv.innerText = data.message || "Authentication failed.";
    }
  } catch (err) {
    errorDiv.innerText = "Network error. Please try again.";
  }
  btn.innerText = "Initialize Session";
  btn.disabled = false;
}

function logout() {
  currentUser = null; currentPassword = null;
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  closeInspector();
}

// --- Navigation ---
function switchTab(tabId) {
  document.getElementById('nav-upload').classList.remove('active');
  document.getElementById('nav-history').classList.remove('active');
  document.getElementById('uploadTab').style.display = 'none';
  document.getElementById('historyTab').style.display = 'none';
  closeInspector();

  if(tabId === 'upload') {
    document.getElementById('nav-upload').classList.add('active');
    document.getElementById('uploadTab').style.display = 'block';
    loadFolders(); 
  } else {
    document.getElementById('nav-history').classList.add('active');
    document.getElementById('historyTab').style.display = 'block';
    currentPath = ''; 
    loadDirectoryContents();
  }
}

// --- Upload Engine ---
async function loadFolders() {
  const select = document.getElementById('folderSelect');
  select.innerHTML = '<option value="">Loading...</option>';
  try {
    const res = await fetch(`/api/files?user=${currentUser}`);
    const data = await res.json();
    select.innerHTML = '<option value="new_folder">+ Create Target Path</option><option value="">/ (Root Directory)</option>';
    if (data.folders) data.folders.forEach(f => select.innerHTML += `<option value="${f}">${f}</option>`);
    select.value = data.folders && data.folders.length > 0 ? data.folders[0] : "new_folder";
    toggleNewFolderInput();
  } catch (error) {
    select.innerHTML = '<option value="new_folder">+ Create Target Path</option>';
    toggleNewFolderInput();
  }
}

function toggleNewFolderInput() {
  const s = document.getElementById('folderSelect');
  const i = document.getElementById('newFolderInput');
  if(s && i) i.style.display = s.value === 'new_folder' ? 'block' : 'none';
}

function updateFileMsg() {
  const input = document.getElementById('fileInput');
  const msg = document.getElementById('fileMsg');
  if (input.files && input.files.length > 1) {
    msg.innerText = `${input.files.length} assets staged`;
    msg.style.color = "var(--primary)";
  } else if (input.files && input.files.length === 1) {
    msg.innerText = input.files[0].name;
    msg.style.color = "var(--primary)";
  } else {
    msg.innerText = "or click to browse local storage";
    msg.style.color = "var(--text-muted)";
  }
}

document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
  const formatSelect = document.getElementById('formatSelect').value;
  const statusDiv = document.getElementById('status');
  const btn = document.getElementById('uploadBtn');
  
  const selectVal = document.getElementById('folderSelect').value;
  const targetFolder = selectVal === 'new_folder' ? document.getElementById('newFolderInput').value.trim() : selectVal;

  if (!fileInput.files.length) { statusDiv.innerText = "No assets selected."; return; }

  btn.disabled = true;
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
  statusDiv.innerText = `Deployment Complete: ${successCount} asset(s) pushed.`;
  btn.disabled = false; fileInput.value = ""; updateFileMsg(); loadFolders();
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
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function loadDirectoryContents(targetPath = '') {
  currentPath = targetPath;
  renderBreadcrumbs();
  closeInspector();
  
  const container = document.getElementById('historyFilesSection');
  container.innerHTML = '<div style="color: var(--text-muted); padding: 2rem;">Scanning network...</div>';
  currentHistoryFiles = [];
  
  try {
    const res = await fetch(`/api/files?user=${currentUser}&path=${encodeURIComponent(currentPath)}`);
    const data = await res.json();
    
    // Store folders & files globally for rendering
    window.currentFolders = data.folders || [];
    currentHistoryFiles = (data.files || []).map(file => {
      const match = file.name.match(/^\d+-(.+)$/);
      return {
        rawName: file.name,
        originalName: match ? match[1] : file.name,
        size: file.size,
        url: file.url,
        path: currentPath ? `${currentPath}/${file.name}` : file.name // needed for API ops
      };
    });
    
    renderFiles();
  } catch (error) {
    container.innerHTML = '<div style="color: var(--danger); padding: 2rem;">Connection to storage failed.</div>';
  }
}

function renderBreadcrumbs() {
  const nav = document.getElementById('breadcrumbNav');
  if (!currentPath) { nav.innerHTML = `<span class="crumb" style="color: var(--text-main); cursor:default;">/ Root Directory</span>`; return; }
  
  let html = `<span class="crumb" onclick="loadDirectoryContents('')">/ Root</span>`;
  let acc = '';
  const parts = currentPath.split('/');
  parts.forEach((p, i) => {
    acc += (i===0 ? p : `/${p}`);
    html += `<span style="color: var(--border);">/</span>`;
    if(i === parts.length-1) html += `<span class="crumb" style="color:var(--text-main);cursor:default;">${p}</span>`;
    else html += `<span class="crumb" onclick="loadDirectoryContents('${acc}')">${p}</span>`;
  });
  nav.innerHTML = html;
}

function renderFiles() {
  const container = document.getElementById('historyFilesSection');
  const query = document.getElementById('searchInput').value.toLowerCase();
  
  let html = `<div class="table-container"><table><thead><tr><th style="width: 40%;">Asset Node</th><th style="width: 20%;">Size</th><th>Action</th></tr></thead><tbody>`;
  
  // Render Folders if no search query
  if (!query && window.currentFolders) {
    const folderIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--primary)"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
    window.currentFolders.forEach(f => {
      html += `<tr class="file-row" onclick="loadDirectoryContents('${currentPath ? currentPath+'/'+f : f}')">
        <td colspan="3" style="font-weight:500; display:flex; align-items:center; gap:0.75rem;">${folderIcon} ${f}</td>
      </tr>`;
    });
  }

  // Render Files
  const filesToRender = currentHistoryFiles.filter(f => f.originalName.toLowerCase().includes(query) || f.rawName.toLowerCase().includes(query));
  
  const fileIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
  
  filesToRender.forEach((f, idx) => {
    html += `
      <tr class="file-row" id="row-${idx}" onclick="selectFile(${idx})">
        <td><div style="display:flex; align-items:center; gap:0.75rem;">${fileIcon} <span style="font-weight:500;">${f.originalName}</span></div></td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${formatBytes(f.size)}</td>
        <td><button class="icon-btn" onclick="copyToClipboard('${f.url}', this, event)">Copy URL</button></td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

async function copyToClipboard(text, btn, event) {
  event.stopPropagation(); // prevent row selection
  try { await navigator.clipboard.writeText(text); btn.innerText = "Copied!"; setTimeout(()=>btn.innerText="Copy URL", 2000); } catch(e){}
}

// --- Inspector & Editorial Actions ---
function selectFile(index) {
  document.querySelectorAll('.file-row').forEach(r => r.classList.remove('selected'));
  document.getElementById(`row-${index}`).classList.add('selected');
  selectedFile = currentHistoryFiles[index];
  openInspector();
}

function openInspector() {
  if(!selectedFile) return;
  const panel = document.getElementById('inspectorPanel');
  const preview = document.getElementById('inspectorPreview');
  
  document.getElementById('inspectName').innerText = selectedFile.originalName;
  document.getElementById('inspectId').innerText = selectedFile.rawName;
  document.getElementById('inspectSize').innerText = formatBytes(selectedFile.size);
  document.getElementById('inspectUrl').innerText = "View on Edge Node";
  document.getElementById('inspectUrl').href = selectedFile.url;

  const ext = selectedFile.rawName.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'mov'].includes(ext)) {
    preview.innerHTML = `<video controls class="preview-media" src="${selectedFile.url}"></video>`;
  } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    preview.innerHTML = `<img src="${selectedFile.url}" class="preview-media">`;
  } else {
    preview.innerHTML = `<span style="color: var(--text-muted)">Preview Unavailable</span>`;
  }
  
  panel.classList.add('open');
}

function closeInspector() {
  selectedFile = null;
  document.getElementById('inspectorPanel').classList.remove('open');
  document.querySelectorAll('.file-row').forEach(r => r.classList.remove('selected'));
  document.getElementById('inspectorPreview').innerHTML = ''; // Stop video
}

// -- Rename Logic
function openRenameModal() {
  document.getElementById('renameInput').value = selectedFile.rawName;
  document.getElementById('renameError').innerText = "";
  document.getElementById('renameModal').style.display = 'flex';
}

async function executeRename() {
  const newName = document.getElementById('renameInput').value.trim();
  const errDiv = document.getElementById('renameError');
  const btn = document.getElementById('executeRenameBtn');
  
  if(!newName || newName === selectedFile.rawName) { document.getElementById('renameModal').style.display = 'none'; return; }

  btn.disabled = true; btn.innerText = "Processing...";
  try {
    const res = await fetch('/api/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'RENAME', targetPath: selectedFile.path, newName, user: currentUser, password: currentPassword })
    });
    const data = await res.json();
    if(res.ok) {
      document.getElementById('renameModal').style.display = 'none';
      loadDirectoryContents(currentPath); // Refresh UI
    } else throw new Error(data.message);
  } catch(err) {
    errDiv.innerText = err.message || "Rename failed.";
  }
  btn.disabled = false; btn.innerText = "Confirm";
}

// -- Delete Logic
async function confirmDelete() {
  if(!confirm(`WARNING: This will permanently purge the asset '${selectedFile.originalName}' from the storage network. Continue?`)) return;
  
  try {
    const res = await fetch('/api/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE', targetPath: selectedFile.path, user: currentUser, password: currentPassword })
    });
    if(res.ok) {
      loadDirectoryContents(currentPath); // Refresh UI
    } else {
      alert("Failed to delete asset. Ensure you have the right permissions.");
    }
  } catch(err) { alert("Network error during deletion."); }
}
