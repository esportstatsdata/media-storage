export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { action, targetPath, newName, user, password } = req.body;
  
  // 1. Authenticate Request
  const envVarName = `${user.toUpperCase()}_PASSWORD`;
  const validPassword = process.env[envVarName];

  if (!validPassword || password !== validPassword) {
    return res.status(401).json({ message: 'Unauthorized execution' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_OWNER;
  const repoName = process.env.GITHUB_REPO;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    // FIX: Safely encode the path while preserving forward slashes
    const encodedPath = targetPath.split('/').map(encodeURIComponent).join('/');
    
    // 2. Fetch the target file's exact SHA and content
    const getUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodedPath}`;
    const getRes = await fetch(getUrl, { headers });
    const fileData = await getRes.json();

    if (!getRes.ok) throw new Error(fileData.message || 'File not found');

    const fileSha = fileData.sha;

    // --- ACTION: DELETE ---
    if (action === 'DELETE') {
      const deleteRes = await fetch(getUrl, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ message: `🗑️ Deleted ${targetPath} via Studio CDN`, sha: fileSha })
      });
      if (!deleteRes.ok) throw new Error('Failed to delete asset');
      return res.status(200).json({ success: true, message: 'Asset deleted' });
    }

    // --- ACTION: RENAME ---
    if (action === 'RENAME') {
      if (!newName) throw new Error('New name is required');
      
      // Construct new path
      const pathParts = targetPath.split('/');
      pathParts.pop(); // Remove old file name
      const newPath = [...pathParts, newName].join('/');
      
      // Safely encode the new path
      const encodedNewPath = newPath.split('/').map(encodeURIComponent).join('/');
      const newUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodedNewPath}`;

      // Step A: Create the new file with the old content
      const putRes = await fetch(newUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `📝 Renamed asset to ${newName}`,
          content: fileData.content.replace(/\n/g, '') // Ensure clean base64
        })
      });
      
      if (!putRes.ok) throw new Error('Failed to create renamed asset');

      // Step B: Delete the old file
      await fetch(getUrl, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ message: `🗑️ Removed old path after rename`, sha: fileSha })
      });

      return res.status(200).json({ success: true, message: 'Asset renamed successfully' });
    }

    return res.status(400).json({ message: 'Invalid action requested' });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
