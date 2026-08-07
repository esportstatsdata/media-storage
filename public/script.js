let currentUser = null;
let currentPassword = null;
let currentPath = ''; 
let currentHistoryFiles = [];
window.currentFolders = []; 
let viewMode = 'list';
let sortMode = 'newest';
let rightClickedItem = null; 
let pendingAction = null; 

// --- Cropper & Queue Variables ---
let uploadQueue = [];
let currentCropTargetFolder = '';
let currentCropFormat = '';
let cropperInstance = null;
let currentCropFileIndex = 0;
let croppedFiles = [];

// --- Session & Theme Persistence on Load ---
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('cdn_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    updateThemeIcon('light');
  }

  const savedUser = sessionStorage.getItem('cdn_user');
  const savedPass = sessionStorage.getItem('cdn_pass');
  if (savedUser && savedPass) {
    document.getElementById('loginUser').value = savedUser;
    document.getElementById('loginPassword').value = savedPass;
    const submitEvent = new Event('submit', { cancelable: true });
    handleLogin(submitEvent);
  }
});

// --- Theme Toggle Logic ---
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('cdn_theme', isLight ? 'light' : 'dark');
  updateThemeIcon(isLight ? 'light' : 'dark');
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  if (theme === 'light') {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
  } else {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  }
}

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

  toast.innerHTML = `${iconHtml} <div style="flex: 1; width: 100%;">${message}</div>`;
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  return toast; 
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

// --- Sync Toggles ---
function syncCropToggles(isChecked) {
  const cb1 = document.getElementById('enableCropUpload');
  const cb2 = document.getElementById('enableCropExplorer');
  if (cb1) cb1.checked = isChecked;
  if (cb2) cb2.checked = isChecked;
}

// --- Cropper Intercept & Queue Engine ---
function handleFilesSelection(files, targetFolder, formatSelect) {
  const cb1 = document.getElementById('enableCropUpload');
  const cb2 = document.getElementById('enableCropExplorer');
  const bulkCb = document.getElementById('bulkCropCheckbox');
  
  const isCropEnabled = (cb1 && cb1.checked) || (cb2 && cb2.checked);
  if (bulkCb) bulkCb.checked = false; // Reset bulk option for fresh upload batch

  if (!isCropEnabled) {
     performUpload(Array.from(files), targetFolder, formatSelect);
     return;
  }

  uploadQueue = Array.from(files);
  croppedFiles = [];
  currentCropTargetFolder = targetFolder;
  currentCropFormat = formatSelect;
  currentCropFileIndex = 0;
  
  const btn = document.getElementById('uploadBtn');
  if (btn) btn.disabled = true;

  processNextInQueue();
}

function processNextInQueue() {
  if (currentCropFileIndex >= uploadQueue.length) {
    if (croppedFiles.length > 0) {
      performUpload(croppedFiles, currentCropTargetFolder, currentCropFormat);
    } else {
      const btn = document.getElementById('uploadBtn');
      if (btn) btn.disabled = false;
    }
    return;
  }
  
  const file = uploadQueue[currentCropFileIndex];
  
  if (file.type.startsWith('image/') && !file.type.includes('svg')) {
    openCropModal(file);
  } else {
    croppedFiles.push(file); 
    currentCropFileIndex++;
    processNextInQueue();
  }
}

function openCropModal(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('cropImage');
    img.src = e.target.result;
    document.getElementById('cropModal').style.display = 'flex';
    
    if (cropperInstance) cropperInstance.destroy();
    
    cropperInstance = new Cropper(img, {
      viewMode: 2,
      background: false,
      autoCropArea: 1,
      responsive: true
    });
  };
  reader.readAsDataURL(file);
}

function setCropRatio(ratio) {
  if (cropperInstance) cropperInstance.setAspectRatio(ratio);
}

function cancelCrop() {
  croppedFiles.push(uploadQueue[currentCropFileIndex]);
  document.getElementById('cropModal').style.display = 'none';
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  currentCropFileIndex++;
  processNextInQueue();
}

// Helper to mathematically apply the crop strictly in the background via Canvas
function processBulkCrop(file, refCropData, refImgData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            img.onload = () => {
                // Determine percentage metrics from original crop bounding box
                const pctX = refCropData.x / refImgData.naturalWidth;
                const pctY = refCropData.y / refImgData.naturalHeight;
                const pctW = refCropData.width / refImgData.naturalWidth;
                const pctH = refCropData.height / refImgData.naturalHeight;

                // Map mathematical percentages strictly onto the new image natural dimensions
                let sx = Math.max(0, pctX * img.naturalWidth);
                let sy = Math.max(0, pctY * img.naturalHeight);
                let sw = Math.min(img.naturalWidth - sx, pctW * img.naturalWidth);
                let sh = Math.min(img.naturalHeight - sy, pctH * img.naturalHeight);

                let canvas = document.createElement('canvas');
                let finalW = sw;
                let finalH = sh;
                
                // Enforce Vercel hardcap limits on off-screen bulk canvas
                if (finalW > 2560 || finalH > 2560) {
                    const ratio = Math.min(2560 / finalW, 2560 / finalH);
                    finalW *= ratio;
                    finalH *= ratio;
                }
                
                canvas.width = finalW;
                canvas.height = finalH;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, finalW, finalH);

                let outMime = file.type;
                if (outMime !== 'image/png' && outMime !== 'image/webp') outMime = 'image/jpeg';

                canvas.toBlob((blob) => resolve(blob), outMime, 0.85);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function applyCrop() {
  if (!cropperInstance) return;
  const originalFile = uploadQueue[currentCropFileIndex];
  
  const bulkCb = document.getElementById('bulkCropCheckbox');
  const isBulk = bulkCb ? bulkCb.checked : false;
  
  let outputMime = originalFile.type;
  if (outputMime !== 'image/png' && outputMime !== 'image/webp') {
     outputMime = 'image/jpeg';
  }
  
  // Extract absolute bounding measurements before destroying cropper to use later in loop
  const cropData = cropperInstance.getData();
  const imgData = cropperInstance.getImageData();
  
  cropperInstance.getCroppedCanvas({
    maxWidth: 2560, maxHeight: 2560, imageSmoothingEnabled: true, imageSmoothingQuality: 'high',
  }).toBlob(async (blob) => {
    if (blob) {
      blob.name = originalFile.name;
      blob.lastModified = Date.now();
      croppedFiles.push(blob);
    } else {
      croppedFiles.push(originalFile);
    }
    
    document.getElementById('cropModal').style.display = 'none';
    cropperInstance.destroy();
    cropperInstance = null;
    
    if (isBulk && currentCropFileIndex < uploadQueue.length - 1) {
       let remainingCount = uploadQueue.length - currentCropFileIndex - 1;
       let bulkToast = showToast(`Background compiling ${remainingCount} asset(s)...`, 'loading', 0);
       
       for (let i = currentCropFileIndex + 1; i < uploadQueue.length; i++) {
           let nextFile = uploadQueue[i];
           if (nextFile.type.startsWith('image/') && !nextFile.type.includes('svg')) {
               try {
                   let pBlob = await processBulkCrop(nextFile, cropData, imgData);
                   pBlob.name = nextFile.name;
                   pBlob.lastModified = Date.now();
                   croppedFiles.push(pBlob);
               } catch(e) {
                   croppedFiles.push(nextFile);
               }
           } else {
               croppedFiles.push(nextFile);
           }
       }
       bulkToast.remove();
       currentCropFileIndex = uploadQueue.length;
       processNextInQueue();
    } else {
       currentCropFileIndex++;
       processNextInQueue();
    }
  }, outputMime, 0.85);
}

function abortAllUploads() {
  document.getElementById('cropModal').style.display = 'none';
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  uploadQueue = [];
  croppedFiles = [];
  showToast("Deployment aborted.", "info");
  
  const btn = document.getElementById('uploadBtn');
  if (btn) btn.disabled = false;
}

// --- Centralized Upload Engine ---
async function performUpload(files, targetFolder, targetFormat) {
  if (!files.length) return;
  
  let successCount = 0;
  let loadingToast = showToast(`Deploying [1/${files.length}]: ${files[0].name}`, 'loading', 0);
  const toastText = loadingToast.querySelector('div[style*="flex: 1"]');

  for (let i = 0; i < files.length; i++) {
    if(toastText) toastText.innerHTML = `Deploying [${i + 1}/${files.length}]: ${files[i].name}`;
    try {
      const { base64, extension } = await processFile(files[i], targetFormat);
      const baseName = files[i].name.substring(0, files[i].name.lastIndexOf('.')) || files[i].name;
      const timestampedName = `${Date.now()}-${baseName.replace(/\s+/g, '-')}.${extension}`;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64, fileName: timestampedName, user: currentUser, folder: targetFolder })
      });
      if (res.ok) {
        successCount++;
      } else {
        console.error(`Upload rejected by server for file: ${files[i].name}`);
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  loadingToast.remove();
  if (successCount > 0) {
      showToast(`Deployment Complete: ${successCount} asset(s) pushed. Syncing display...`, 'success');
  } else {
      showToast(`Deployment failed. Image payload might be too large.`, 'danger');
  }
  
  loadFolders(); 
  
  if (document.getElementById('historyTab').classList.contains('active')) {
     setTimeout(() => {
         loadDirectoryContents(currentPath);
     }, 1500);
  }
  
  const btn = document.getElementById('uploadBtn');
  if (btn) btn.disabled = false;
}

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
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        ctx.drawImage(img, 0, 0);
        const mimeType = targetFormat === 'webp' ? 'image/webp' : (targetFormat === 'png' ? 'image/png' : file.type);
        resolve({ base64: canvas.toDataURL(mimeType, 0.9).split(',')[1], extension: targetFormat === 'original' ? originalExtension : targetFormat });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// --- Upload Tab Specific UI Listeners ---
async function loadFolders() {
  const select = document.getElementById('folderSelect');
  if(!select) return;
  select.innerHTML = '<option value="">Loading...</option>';
  try {
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
  const targetFolder = getSelectedFolder(); 
  
  const files = Array.from(fileInput.files);
  if (!files.length) { showToast("No assets selected.", "danger"); return; }

  handleFilesSelection(files, targetFolder, formatSelect);
  
  fileInput.value = ""; updateFileMsg(); 
});

// --- Explorer Inline Upload & Drag/Drop Logic ---
function handleExplorerUpload(input) {
  const files = Array.from(input.files);
  if(!files.length) return;
  const format = document.getElementById('formatSelect') ? document.getElementById('formatSelect').value : 'original';
  handleFilesSelection(files, currentPath, format);
  input.value = "";
}

const mainContentElement = document.querySelector('.main-content');
const dropZoneElement = document.getElementById('explorerDropZone');

mainContentElement.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (currentUser && document.getElementById('historyTab').classList.contains('active')) {
      dropZoneElement.classList.add('active'); 
  }
});

dropZoneElement.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZoneElement.classList.remove('active');
});

dropZoneElement.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZoneElement.classList.remove('active');
  const files = Array.from(e.dataTransfer.files);
  if (!files.length) return;
  const format = document.getElementById('formatSelect') ? document.getElementById('formatSelect').value : 'original';
  handleFilesSelection(files, currentPath, format);
});

// --- Explorer Utilities ---
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isImageExtension(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
}

// --- Sorting Logic ---
function changeSortMode(mode) {
  sortMode = mode;
  renderFiles();
}

function getSortedItems(filesToRender, foldersToRender) {
  let sortedFiles = [...filesToRender];
  let sortedFolders = [...foldersToRender];

  if (sortMode === 'az') {
    sortedFiles.sort((a, b) => a.originalName.localeCompare(b.originalName));
    sortedFolders.sort((a, b) => a.localeCompare(b));
  } else if (sortMode === 'za') {
    sortedFiles.sort((a, b) => b.originalName.localeCompare(a.originalName));
    sortedFolders.sort((a, b) => b.localeCompare(a));
  } else if (sortMode === 'newest') {
    sortedFiles.sort((a, b) => b.timestamp - a.timestamp);
    sortedFolders.sort((a, b) => a.localeCompare(b)); 
  } else if (sortMode === 'oldest') {
    sortedFiles.sort((a, b) => a.timestamp - b.timestamp);
    sortedFolders.sort((a, b) => a.localeCompare(b)); 
  }
  
  return { sortedFiles, sortedFolders };
}

// --- Explorer Engine ---
async function loadDirectoryContents(targetPath = '') {
  currentPath = targetPath;
  renderBreadcrumbs();
  
  const grid = document.getElementById('historyFolderGrid');
  const filesSection = document.getElementById('historyFilesSection');
  const hint = document.getElementById('contextHint');
  const badge = document.getElementById('itemCountBadge');
  
  grid.innerHTML = `
    <div class="loader-container">
      <div class="spinner"></div>
      <div>Syncing Network Storage...</div>
    </div>
  `;
  filesSection.innerHTML = '';
  
  if(hint) hint.style.display = 'none';
  if(badge) badge.style.display = 'none';
  document.getElementById('searchInput').value = '';
  
  currentHistoryFiles = [];
  window.currentFolders = [];
  
  try {
    const cacheBuster = `&t=${Date.now()}`;
    const res = await fetch(`/api/files?user=${currentUser}&path=${encodeURIComponent(currentPath)}${cacheBuster}`);
    const data = await res.json();
    grid.innerHTML = ''; 
    
    if (data.folders && data.folders.length > 0) {
      window.currentFolders = data.folders;
      if(hint) hint.style.display = 'block';
    }

    if (data.files && data.files.length > 0) {
      if(hint) hint.style.display = 'block';
      
      data.files.forEach(file => {
        const timestampMatch = file.name.match(/^(\d{13})-(.+)$/);
        
        let timestamp = 0;
        let dateFormatted = 'N/A';
        let originalName = file.name;
        
        if (timestampMatch) {
            timestamp = parseInt(timestampMatch[1], 10);
            originalName = timestampMatch[2];
            const d = new Date(timestamp);
            dateFormatted = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } else {
            const originalNameMatch = file.name.match(/^\d+-(.+)$/);
            originalName = originalNameMatch ? originalNameMatch[1] : file.name;
        }

        currentHistoryFiles.push({
          rawName: file.name,
          originalName: originalName,
          timestamp: timestamp,
          dateFormatted: dateFormatted,
          size: file.size,
          url: file.url,
          path: currentPath ? `${currentPath}/${file.name}` : file.name
        });
      });
    }
    
    renderFiles();
    
    if (window.currentFolders.length === 0 && currentHistoryFiles.length === 0) {
      grid.innerHTML = '<div style="padding: 2.5rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px;">Directory is empty. Click <b>Upload Here</b> or drag files to populate it.</div>';
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
  
  let filesToRender = getFilteredFiles();
  let foldersToRender = getFilteredFolders();
  
  // Apply Sort
  const sorted = getSortedItems(filesToRender, foldersToRender);
  filesToRender = sorted.sortedFiles;
  foldersToRender = sorted.sortedFolders;

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
  
  const badge = document.getElementById('itemCountBadge');
  if (badge) {
    const totalRendered = filesToRender.length + foldersToRender.length;
    const totalItems = currentHistoryFiles.length + window.currentFolders.length;
    
    if (totalItems === 0) {
      badge.style.display = 'none';
    } else {
      badge.style.display = 'block';
      if (totalRendered < totalItems) {
        badge.innerHTML = `<span style="color:var(--primary)">${totalRendered}</span> matching out of ${totalItems}`;
      } else {
        let fCount = window.currentFolders.length;
        let fiCount = currentHistoryFiles.length;
        let textArr = [];
        if(fCount > 0) textArr.push(`${fCount} Folder${fCount !== 1 ? 's' : ''}`);
        if(fiCount > 0) textArr.push(`${fiCount} Asset${fiCount !== 1 ? 's' : ''}`);
        badge.innerHTML = textArr.join(' &nbsp;•&nbsp; ');
      }
    }
  }

  // Do not block rendering if searching yields 0, let user know.
  if (filesToRender.length === 0 && foldersToRender.length === 0 && (currentHistoryFiles.length > 0 || window.currentFolders.length > 0)) {
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
    html = `<div class="table-container"><table><thead><tr><th style="width: 40%;">Asset Name</th><th style="width: 15%;">Date Added</th><th style="width: 10%;">Size</th><th>CDN Endpoint & Actions</th></tr></thead><tbody>`;
    filesToRender.forEach(file => {
      html += `
        <tr oncontextmenu="showContextMenu(event, '${file.path}', 'file', '${file.originalName}', '${file.url}')">
          <td><div class="file-name-wrapper">${fileIcon} <span style="font-weight: 500;">${file.originalName}</span></div></td>
          <td style="color: var(--text-muted);">${file.dateFormatted}</td>
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
            <div class="grid-meta" style="flex-direction: column; align-items: flex-start; gap: 0.25rem;">
              <span>${formatBytes(file.size)} • ${file.dateFormatted}</span>
              <div style="display:flex; gap:0.25rem; align-self: flex-end; margin-top:-1.25rem;">
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
  } else if (action === 'download') {
    downloadAsset(rightClickedItem);
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

// --- Create Folder Logic ---
function openCreateFolderModal() {
  pendingAction = 'CREATE_FOLDER';
  const modal = document.getElementById('actionModal');
  document.getElementById('actionModalTitle').innerText = 'Create New Folder';
  document.getElementById('actionLabel').innerText = 'Folder Name';
  document.getElementById('actionFolderGroup').style.display = 'none';
  document.getElementById('actionInputGroup').style.display = 'block';
  document.getElementById('actionInput').value = '';
  document.getElementById('actionError').innerText = '';
  modal.style.display = 'flex';
  document.getElementById('actionInput').focus();
}

// --- Download Logic (JSZip Integration with ETA) ---
async function fetchAllFilesRecursively(basePath) {
  let allFiles = [];
  const res = await fetch(`/api/files?user=${currentUser}&path=${encodeURIComponent(basePath)}&t=${Date.now()}`);
  const data = await res.json();

  if (data.files) {
    data.files.forEach(f => {
      allFiles.push({
        ...f,
        path: basePath ? `${basePath}/${f.name}` : f.name
      });
    });
  }

  if (data.folders) {
    for (let folder of data.folders) {
      const subPath = basePath ? `${basePath}/${folder}` : folder;
      const subFiles = await fetchAllFilesRecursively(subPath);
      allFiles.push(...subFiles);
    }
  }
  return allFiles;
}

async function downloadAsset(item) {
  if (item.type === 'file') {
    const toast = showToast(`Downloading ${item.originalName}...`, 'loading', 0);
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = item.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.remove();
      showToast('Download complete!', 'success');
    } catch (e) {
      toast.remove();
      showToast('Download failed.', 'danger');
    }
  } else if (item.type === 'folder') {
    if (typeof JSZip === 'undefined') {
      showToast('Compression library not loaded. Please refresh.', 'danger');
      return;
    }
    
    const toast = showToast(`Analyzing folder '${item.originalName}'...`, 'loading', 0);
    const toastText = toast.querySelector('div[style*="flex: 1"]'); 
    
    try {
      const filesToZip = await fetchAllFilesRecursively(item.path);

      if (filesToZip.length === 0) {
        toast.remove();
        showToast('Folder is empty.', 'info');
        return;
      }

      const zip = new JSZip();
      const totalFiles = filesToZip.length;
      let loadedFiles = 0;
      const startTime = Date.now();

      for (let file of filesToZip) {
        const relativePath = file.path.substring(item.path.length + 1);
        const res = await fetch(file.url);
        const blob = await res.blob();
        zip.file(relativePath, blob);

        loadedFiles++;
        
        const percent = ((loadedFiles / totalFiles) * 100).toFixed(0);
        const elapsedMs = Date.now() - startTime;
        const avgTimePerFile = elapsedMs / loadedFiles;
        const remainingFiles = totalFiles - loadedFiles;
        const etaSec = Math.ceil((remainingFiles * avgTimePerFile) / 1000);
        
        let etaString = etaSec > 60 ? `${Math.floor(etaSec/60)}m ${etaSec%60}s` : `${etaSec}s`;

        toastText.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; min-width: 240px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
              <span>Fetching Assets...</span>
              <span style="color: var(--primary); font-weight: 600;">${percent}%</span>
            </div>
            <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.2); border-radius: 3px; overflow: hidden; border: 1px solid var(--border);">
              <div style="width: ${percent}%; height: 100%; background: var(--primary); transition: width 0.2s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted);">
              <span>${loadedFiles} / ${totalFiles} files</span>
              <span>ETA: ${etaString}</span>
            </div>
          </div>
        `;
      }

      toastText.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; min-width: 240px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
            <span>Compressing Archive...</span>
            <span style="color: var(--primary); font-weight: 600;" id="zipPercent">0%</span>
          </div>
          <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.2); border-radius: 3px; overflow: hidden; border: 1px solid var(--border);">
            <div id="zipProgressBar" style="width: 0%; height: 100%; background: var(--primary); transition: width 0.1s linear;"></div>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Packaging ${totalFiles} files into .zip</div>
        </div>
      `;

      const zipBlob = await zip.generateAsync({ type: 'blob' }, function updateCallback(metadata) {
         const progress = metadata.percent.toFixed(0);
         const pBar = document.getElementById('zipProgressBar');
         const pText = document.getElementById('zipPercent');
         if(pBar) pBar.style.width = `${progress}%`;
         if(pText) pText.innerText = `${progress}%`;
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${item.originalName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.remove();
      showToast(`'${item.originalName}.zip' downloaded successfully!`, 'success');
    } catch (e) {
      toast.remove();
      showToast('Failed to zip and download folder.', 'danger');
    }
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
  
  // -- Handle Folder Creation --
  if (actionToRun === 'CREATE_FOLDER') {
    const inputVal = document.getElementById('actionInput').value.trim();
    if (!inputVal) { errDiv.innerText = "Folder name is required."; return; }
    
    const targetFolder = currentPath ? `${currentPath}/${inputVal}` : inputVal;
    if(btn) { btn.disabled = true; btn.innerText = "Processing..."; }
    
    let loadingToast = showToast(`Creating folder '${inputVal}'...`, 'loading', 0);
    try {
      const base64Empty = btoa("keep"); 
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64Empty, fileName: '.gitkeep', user: currentUser, folder: targetFolder })
      });
      if(!res.ok) throw new Error("Failed to create folder. Permissions error.");
      
      loadingToast.remove();
      showToast("Folder created successfully! Syncing display...", "success");
      closeModal('actionModal');
      
      setTimeout(() => {
        loadDirectoryContents(currentPath);
        loadFolders(); 
      }, 1500);
      
    } catch(e) {
      loadingToast.remove();
      errDiv.innerText = e.message;
    }
    if(btn) { btn.disabled = false; btn.innerText = "Confirm"; }
    return;
  }

  // -- Handle Standard Actions --
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
      showToast(`Asset successfully ${actionToRun.toLowerCase()}d! Syncing display...`, 'success');
      closeModal('actionModal');
      
      setTimeout(() => {
        loadDirectoryContents(currentPath);
        loadFolders(); 
      }, 1500);

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
  let csvContent = "Original Name,Date Added,File Size,CDN Link\n";
  filesToExport.forEach(file => { csvContent += `"${file.originalName}","${file.dateFormatted}","${formatBytes(file.size)}","${file.url}"\n`; });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `Asset_Export_${Date.now()}.csv`);
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  showToast('Export successful!', 'success');
});
