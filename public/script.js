let currentUser = null;
let currentHistoryFiles = [];

// --- Authentication ---
async function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const errorDiv = document.getElementById('loginError');
  
  btn.innerText = "Authenticating...";
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
      // Login successful
      currentUser = user;
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appScreen').style.display = 'block';
      document.getElementById('userNameDisplay').innerText = currentUser;
      
      // Clear password field for security
      document.getElementById('loginPassword').value = '';
      loadFolders();
    } else {
      errorDiv.innerText = data.message || "Authentication failed.";
    }
  } catch (err) {
    errorDiv.innerText = "Network error. Please try again.";
  }
  
  btn.innerText = "Secure Login";
  btn.disabled = false;
}

function logout() {
  currentUser = null;
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'block';
  document.getElementById('historyFilesSection').style.display = 'none';
  document.getElementById('status').innerText = '';
  document.getElementById('loginUser').value = '';
}

// --- Navigation ---
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  
  if(tabId === 'upload') {
    document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
    document.getElementById('uploadTab').classList.add('active');
    loadFolders(); 
  } else {
    document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
    document.getElementById('historyTab').classList.add('active');
    loadHistoryFolders();
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

// --- History / Dashboard ---
async function loadHistoryFolders() {
  const grid = document.getElementById('historyFolderGrid');
  grid.innerHTML = 'Loading folders...';
  
  try {
    const res = await fetch(`/api/files?user=${currentUser}&action=getFolders`);
    const data = await res.json();
    
    if (!data.folders || data.folders.length === 0) {
      grid.innerHTML = '<p style="color: var(--text-muted)">No uploads found yet.</p>';
      return;
    }

    grid.innerHTML = '';
    data.folders.forEach(folder => {
      const div = document.createElement('div');
      div.className = 'folder-card';
      div.innerText = folder;
      div.onclick = () => loadHistoryFiles(folder, div);
      grid.appendChild(div);
    });
  } catch (error) {
    grid.innerHTML = '<p style="color: #ef4444;">Error loading folders.</p>';
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
  tbody.innerHTML = '<tr><td colspan="3" style="color: var(--text-muted);">Loading files...</td></tr>';
  
  currentHistoryFiles = [];
  
  try {
    const res = await fetch(`/api/files?user=${currentUser}&folder=${folder}&action=getFiles`);
    const data = await res.json();
    
    if (!data.files || data.files.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="color: var(--text-muted);">No files in this folder.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
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
          <td>${originalName}</td>
          <td>${file.name}</td>
          <td><a href="${file.url}" target="_blank">${file.url}</a></td>
        </tr>
      `;
    });
    
    csvBtn.style.display = 'inline-block';
    
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="3" style="color: #ef4444;">Error fetching files.</td></tr>';
  }
}

// --- CSV Export Logic ---
document.getElementById('historyCsvBtn').addEventListener('click', () => {
  if (currentHistoryFiles.length === 0) return;

  let csvContent = "Original Name,Uploaded Name,CDN Link\n";
  
  currentHistoryFiles.forEach(file => {
    csvContent += `"${file.originalName}","${file.uploadedName}","${file.url}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  const currentFolder = document.getElementById('currentHistoryFolder').innerText;
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${currentUser}_${currentFolder}_history.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// --- Upload Logic & Canvas Conversion ---
document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
  const formatSelect = document.getElementById('formatSelect').value;
  const statusDiv = document.getElementById('status');
  const btn = document.getElementById('uploadBtn');
  const targetFolder = getSelectedFolder();
  
  if (!fileInput.files.length) {
    statusDiv.innerText = "Please select at least one file.";
    statusDiv.style.color = "#ef4444";
    return;
  }

  btn.disabled = true;
  statusDiv.style.color = "var(--primary)";
  const files = Array.from(fileInput.files);
  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    statusDiv.innerText = `Processing ${i + 1} of ${files.length}: ${file.name}...`;
    
    try {
      const { base64, extension } = await processFile(file, formatSelect);
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const timestampedName = `${Date.now()}-${baseName.replace(/\s+/g, '-')}.${extension}`;

      statusDiv.innerText = `Uploading ${i + 1} of ${files.length}: ${timestampedName}...`;

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
      console.error(`Error with ${file.name}:`, error);
    }
  }

  statusDiv.innerText = `Deploy Complete! ${successCount} of ${files.length} assets successfully processed.`;
  btn.disabled = false;
  fileInput.value = ""; 
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
