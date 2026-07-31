let uploadedAssets = [];

document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
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

  // Process files sequentially to avoid rate-limiting
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    statusDiv.innerText = `Uploading ${i + 1} of ${files.length}: ${file.name}...`;
    
    const timestampedName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
    try {
      const base64Content = await readFileAsBase64(file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64Content,
          fileName: timestampedName
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Save to our array for the CSV export
        uploadedAssets.push({
          originalName: file.name,
          cdnUrl: data.url
        });

        // Add row to the live table
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${file.name}</td>
          <td><a href="${data.url}" target="_blank">${data.url}</a></td>
        `;
        tableBody.appendChild(row);
        
        successCount++;
        csvBtn.style.display = "inline-block"; // Show CSV button once we have data
      } else {
        console.error(`Failed to upload ${file.name}:`, data.message);
      }
    } catch (error) {
      console.error(`Network error on ${file.name}:`, error);
    }
  }

  statusDiv.innerText = `Upload complete! ${successCount} of ${files.length} files successfully uploaded.`;
  btn.disabled = false;
  fileInput.value = ""; // Clear input for the next batch
});

// Helper function to read files
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// CSV Generation Logic
document.getElementById('csvBtn').addEventListener('click', () => {
  if (uploadedAssets.length === 0) return;

  // Create CSV headers
  let csvContent = "File Name,CDN Link\n";
  
  // Append data rows
  uploadedAssets.forEach(asset => {
    // Wrap names in quotes in case they contain commas
    csvContent += `"${asset.originalName}","${asset.cdnUrl}"\n`;
  });

  // Trigger download
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
