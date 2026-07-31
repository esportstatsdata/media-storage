export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { action, targetPath, newPath, user, password } = req.body;
  
  // 1. Authenticate Request
  const safeUser = user.toLowerCase();
  const envVarName = `${safeUser.toUpperCase()}_PASSWORD`;
  const validPassword = process.env[envVarName];

  if (!validPassword || password !== validPassword) {
    return res.status(401).json({ message: 'Unauthorized execution' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_OWNER;
  const repoName = process.env.GITHUB_REPO;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Normalize Paths
  const cleanTarget = targetPath.replace(/^\/|\/$/g, '');
  const cleanNew = newPath ? newPath.replace(/^\/|\/$/g, '') : '';

  const fullTargetPath = `images/${safeUser}/${cleanTarget}`;
  const fullNewPath = cleanNew ? `images/${safeUser}/${cleanNew}` : null;

  // 3. Recursive File Scanner
  async function fetchAllFiles(path) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodedPath}`;
    
    const response = await fetch(url, { headers });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error('GitHub API Error: Failed to scan directory.');
    
    const data = await response.json();
    if (!Array.isArray(data)) return [data]; // It's a single file

    let files = [];
    for (const item of data) {
      if (item.type === 'file') files.push(item);
      else if (item.type === 'dir') {
        const subFiles = await fetchAllFiles(item.path);
        files.push(...subFiles);
      }
    }
    return files;
  }

  try {
    const files = await fetchAllFiles(fullTargetPath);
    if (files.length === 0) return res.status(404).json({ message: 'Target asset or folder not found.' });

    for (const file of files) {
      // Calculate the destination path relative to the moving folder
      const relativePath = file.path.substring(fullTargetPath.length);
      const destPath = fullNewPath + relativePath;

      // STEP A: CREATE NEW FILE (For Rename, Move, Duplicate)
      if (action === 'DUPLICATE' || action === 'MOVE' || action === 'RENAME') {
        // Fetch exact file blob (Base64) to prevent corruption
        const blobRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/blobs/${file.sha}`, { headers });
        const blobData = await blobRes.json();

        const putUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${destPath.split('/').map(encodeURIComponent).join('/')}`;
        const putRes = await fetch(putUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: `Studio CDN: ${action} Operation`,
            content: blobData.content.replace(/\n/g, '') // Clean base64
          })
        });
        
        if (!putRes.ok) throw new Error(`Failed to write to destination: ${destPath}`);
      }

      // STEP B: DELETE OLD FILE (For Delete, Move, Rename)
      if (action === 'DELETE' || action === 'MOVE' || action === 'RENAME') {
        const delUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${file.path.split('/').map(encodeURIComponent).join('/')}`;
        const delRes = await fetch(delUrl, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({
            message: `Studio CDN: Cleanup after ${action}`,
            sha: file.sha
          })
        });
        if (!delRes.ok) throw new Error(`Failed to delete original: ${file.path}`);
      }
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
