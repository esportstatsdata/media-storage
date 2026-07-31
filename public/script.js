let currentUser = null;
let currentHistoryFiles = [];

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
  document.getElementById('historyFilesSection').style.display = 'none';
  document.getElementById('status').innerText = '';
  document.getElementById('loginUser').value = '';
}

// --- UI Navigation ---
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
    loadHistoryFolders();
  }
}

function updateFileMsg() {
  const input = document.getElementById('fileInput');
  const msg = document.getElementById('fileMsg');
  if (input.files && input.files.length > 1) {
    msg.innerText = `${input.files.length} files selected`;
    msg.style.color = "var(--primary)";
  } else if (input.files && input.files.length === 1) {
    msg.innerText = input.files[0].name;
    msg.style.color = "var(--primary)";
  } else {
    msg.innerText = "or click to browse from your computer";
    msg.style.color = "var(--text-muted)";
  }
}

// --- Folder Management ---
async function loadFolders() {
  const select = document.getElementById('folderSelect');
  select.innerHTML = '<option value="">Loading...</option>';
  
  try {
    const res = await fetch(`/api/files?user=${currentUser}&action=getFolders`);
    const data = await res.json();
    
    select.innerHTML = '<option value="new_folder">+ Create New Folder</option>';
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
    select.innerHTML = '<option value="new_folder">+ Create New Folder</option>';
  }
}

function toggleNewFolderInput() {
  const select = document.getElementById('folderSelect');
  const input = document.getElementById('newFolderInput');
  input.style.display = select.value === 'new_folder' ? 'block' : 'none';
}

function getSelectedFolder() {
  const select = document.getElementById('folderSelect').value;
  if (select === 'new_folder') {
    return document.getElementById('newFolderInput').value.trim() || 'default';
  }
  return select;
}

// --- History / Workspace ---
async function loadHistoryFolders() {
  const grid = document.getElementById('historyFolderGrid');
  grid.innerHTML = '<span style="color: var(--text-muted)">Loading workspace...</span>';
  
  try {
    const res = await fetch(`/api/files?user=${currentUser}&action=getFolders`);
    const data = await res.json();
    
    if (!data.folders || data.folders.length === 0) {
      grid.innerHTML = '<span style="color: var(--text-muted)">No folders found yet.</span>';
      return;
    }

    grid.innerHTML = '';
    const folderIcon = `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;

    data.folders.forEach(folder => {
      const div = document.createElement('div');
      div.className = 'folder-card';
      div.innerHTML = `${folderIcon} <span>${folder}</span>`;
      div.onclick = () => loadHistoryFiles(folder, div);
      grid.appendChild(div);
    });
  } catch (error) {
    grid.innerHTML = '<span style="color: var(--danger);">Error loading workspace.</span>';
  }
}

async function loadHistoryFiles(folder, cardElement) {
  document.querySelectorAll('.folder-card').forEach(el => el.classList.remove('selected'));
  cardElement.classList.add('selected');
  
  const section = document.getElementById('historyFilesSection');
  const tbody = document.getElementById('historyTableBody');
  const csvBtn = document.getElementById('historyCsvBtn');
  document.getElementById('currentHistoryFolder').innerText = folder;
  
  section.style.display = 'block';
  csvBtn.style.display = 'none'; 
  tbody.innerHTML = '<tr><td colspan="3" style="color: var(--text-muted); text-align: center; padding: 2rem;">Loading assets...</td></tr>';
  
  currentHistoryFiles = [];
  
  try {
    const res = await fetch(`/api/files?user=${currentUser}&folder=${folder}&action=getFiles`);
    const data = await res.json();
    
    if (!data.files || data.files.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="color: var(--text-muted); text-align: center; padding: 2rem;">Folder is empty.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    const fileIcon = `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
    const copyIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
    const previewIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;

    data.files.forEach(file => {
      const originalNameMatch = file.name.match(/^\d+-(.+)$/);
      const originalName = originalNameMatch ? originalNameMatch[1] : file.name;

      currentHistoryFiles.push({
        originalName: originalName,
        uploadedName: file.name,
        url: file.url
      });

      tbody.innerHTML += `
        <tr>
          <td>
            <div class="file-name-wrapper">
              ${fileIcon} 
              <span style="font-weight: 500;">${originalName}</span>
            </div>
          </td>
          <td style="color: var(--text-muted); font-size: 0.85rem; font-family: monospace;">${file.name}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <a href="${file.url}" target="_blank" class="truncate-url" title="${file.url}" style="margin-right: auto;">${file.url}</a>
              <button class="icon-btn" onclick="openPreview('${file.url}', '${file.name}')" title="Preview Asset">
                ${previewIcon}
              </button>
              <button class="icon-btn" onclick="copyToClipboard('${file.url}', this)" title="Copy URL">
                ${copyIcon}
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    
    csvBtn.style.display = 'inline-flex';
    
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="3" style="color: var(--danger); text-align: center; padding: 2rem;">Failed to retrieve files.</td></tr>';
  }
}

// --- Preview Modal Logic ---
function openPreview(url, fileName) {
  const modal = document.getElementById('previewModal');
  const container = document.getElementById('mediaContainer');
  const nameLabel = document.getElementById('previewFileName');
  
  nameLabel.innerText = fileName;
  container.innerHTML = '<span style="color: var(--text-muted);">Loading preview...</span>';
  modal.style.display = 'flex';
  
  const ext = fileName.split('.').pop().toLowerCase();
  const videoExts = ['mp4', 'webm', 'ogg', 'mov'];
  
  if (videoExts.includes(ext)) {
    container.innerHTML = `<video controls autoplay class="preview-media" src="${url}"></video>`;
  } else {
    const img = new Image();
    img.onload = () => container.innerHTML = `<img src="${url}" class="preview-media" alt="${fileName}">`;
    img.onerror = () => container.innerHTML = '<span style="color: var(--danger);">Preview not available for this file type.</span>';
    img.src = url;
  }
}

function closePreview(e) {
  if (e && e.target.id !== 'previewModal' && !e.target.classList.contains('modal-close')) return;
  const modal = document.getElementById('previewModal');
  const container = document.getElementById('mediaContainer');
  modal.style.display = 'none';
  container.innerHTML = ''; 
}

// --- Workflow Tools ---
async function copyToClipboard(text, buttonElement) {
  try {
    await navigator.clipboard.writeText(text);
    const originalHTML = buttonElement.innerHTML;
    buttonElement.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--primary)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
    setTimeout(() => {
      buttonElement.innerHTML = originalHTML;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy!', err);
  }
}

document.getElementById('historyCsvBtn').addEventListener('click', () => {
  if (currentHistoryFiles.length === 0) return;

  let csvContent = "Original Name,System ID,CDN Link\n";
  
  currentHistoryFiles.forEach(file => {
    csvContent += `"${file.originalName}","${file.uploadedName}","${file.url}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  const currentFolder = document.getElementById('currentHistoryFolder').innerText;
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${currentUser}_${currentFolder}_export.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// --- Upload Logic & Processing ---
document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
  const formatSelect = document.getElementById('formatSelect').value;
  const statusDiv = document.getElementById('status');
  const btn = document.getElementById('uploadBtn');
  const targetFolder = getSelectedFolder();
  
  if (!fileInput.files.length) {
    statusDiv.innerText = "Please select at least one file to upload.";
    statusDiv.style.color = "var(--danger)";
    return;
  }

  btn.disabled = true;
  statusDiv.style.color = "var(--primary)";
  const files = Array.from(fileInput.files);
  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    statusDiv.innerText = `Deploying ${i + 1} of ${files.length}...`;
    
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
    } catch (error) {
      console.error(`System error processing ${file.name}:`, error);
    }
  }

  statusDiv.innerText = `Deployment Complete: ${successCount} asset(s) successfully pushed to ${targetFolder}.`;
  btn.disabled = false;
  
  fileInput.value = ""; 
  updateFileMsg();
});

function processFile(file, targetFormat) {
  return new Promise((resolve, reject) => {
    const originalExtension = file.name.split('.').pop().toLowerCase();

    if (!file.type.startsWith('image/') || targetFormat === 'original') {
      const reader = new FileReader();
      reader.onload = () => resolve({
        base64: reader.result.split(',')[1],
        extension: originalExtension
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const mimeType = targetFormat === 'webp' ? 'image/webp' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType, 0.9); 
        
        resolve({
          base64: dataUrl.split(',')[1],
          extension: targetFormat
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
