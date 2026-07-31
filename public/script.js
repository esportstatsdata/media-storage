document.getElementById('uploadBtn').addEventListener('click', async () => {
  const owner = document.getElementById('repoOwner').value.trim();
  const repo = document.getElementById('repoName').value.trim();
  const fileInput = document.getElementById('fileInput');
  const statusDiv = document.getElementById('status');
  const btn = document.getElementById('uploadBtn');
  const resultContainer = document.getElementById('resultContainer');
  
  if (!owner || !repo || !fileInput.files.length) {
    statusDiv.innerText = "Please fill in all fields and select a file.";
    return;
  }

  const file = fileInput.files[0];
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  
  statusDiv.innerText = "";
  btn.innerText = "Uploading...";
  btn.disabled = true;
  resultContainer.style.display = "none";

  try {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onloadend = async () => {
      const base64Content = reader.result.split(',')[1];

      // Call our secure Vercel Serverless Function instead of GitHub directly
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64Content,
          fileName: fileName,
          repoOwner: owner,
          repoName: repo
        })
      });

      const data = await response.json();

      if (response.ok) {
        document.getElementById('cdnLink').href = data.url;
        document.getElementById('cdnLink').innerText = data.url;
        
        if (file.type.startsWith('image/')) {
          document.getElementById('previewContainer').innerHTML = `<img src="${data.url}" alt="Uploaded file">`;
        } else {
          document.getElementById('previewContainer').innerHTML = `<p><em>Video uploaded successfully.</em></p>`;
        }
        
        resultContainer.style.display = "block";
      } else {
        statusDiv.innerText = `Error: ${data.message}`;
      }
      
      btn.innerText = "Upload to GitHub";
      btn.disabled = false;
    };
  } catch (error) {
    statusDiv.innerText = "A network error occurred.";
    btn.innerText = "Upload to GitHub";
    btn.disabled = false;
  }
});
