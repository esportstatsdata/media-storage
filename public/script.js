let uploadedAssets = [];

document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
  const formatSelect = document.getElementById('formatSelect').value;
  const statusDiv = document.getElementById('status');
  const btn = document.getElementById('uploadBtn');
  const tableBody = document.getElementById('tableBody');
  const resultsContainer = document.getElementById('resultsContainer');
  const csvBtn = document.getElementById('csvBtn');
  
  if (!fileInput.files.length) {
    statusDiv.innerText = "Please select at least one file.";
    statusDiv.style.color = "red";
    return;
  }

  btn.disabled = true;
  resultsContainer.style.display = "block";
  statusDiv.style.color = "#333";
  
  const files = Array.from(fileInput.files);
  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    statusDiv.innerText = `Processing ${i + 1} of ${files.length}: ${file.name}...`;
    
    try {
      // 1. Process the file (converts if it's an image and a format is selected)
      const { base64, extension } = await processFile(file, formatSelect);
      
      // 2. Build the new filename with the correct extension
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const cleanBaseName = baseName.replace(/\s+/g, '-');
      const timestampedName = `${Date.now()}-${cleanBaseName}.${extension}`;

      statusDiv.innerText = `Uploading ${i + 1} of ${files.length}: ${timestampedName}...`;

      // 3. Send to Vercel Backend
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64,
          fileName: timestampedName
        })
      });

      const data = await response.json();

      if (response.ok) {
        uploadedAssets.push({
          originalName: file.name,
          uploadedName: timestampedName,
          cdnUrl: data.url
        });

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${timestampedName}</td>
          <td><a href="${data.url}" target="_blank">${data.url}</a></td>
        `;
        tableBody.appendChild(row);
        
        successCount++;
        csvBtn.style.display = "inline-block";
      } else {
        console.error(`Failed to upload ${file.name}:`, data.message);
      }
    } catch (error) {
      console.error(`Error processing/uploading ${file.name}:`, error);
    }
  }

  statusDiv.innerText = `Complete! ${successCount} of ${files.length} files successfully uploaded.`;
  btn.disabled = false;
  fileInput.value = ""; 
});

// Powerful processing function to handle Canvas conversions
function processFile(file, targetFormat) {
  return new Promise((resolve, reject) => {
    const originalExtension = file.name.split('.').pop().toLowerCase();

    // If it's not an image, or user selected 'original', skip conversion
    if (!file.type.startsWith('image/') || targetFormat === 'original') {
      const reader = new FileReader();
      reader.onload = () => resolve({
        base64: reader.result.split(',')[1],
        extension: originalExtension
      });
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
      return;
    }

    // Convert Image using Canvas
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Fill with white background in case converting transparent PNG to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const mimeType = targetFormat === 'webp' ? 'image/webp' : 'image/png';
        // 0.9 is the quality setting for WEBP (90%). PNG ignores this.
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

// CSV Generation Logic
document.getElementById('csvBtn').addEventListener('click', () => {
  if (uploadedAssets.length === 0) return;

  let csvContent = "Original Name,Uploaded Name,CDN Link\n";
  
  uploadedAssets.forEach(asset => {
    csvContent += `"${asset.originalName}","${asset.uploadedName}","${asset.cdnUrl}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `cdn_links_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
