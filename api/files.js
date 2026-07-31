export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { user, path = '', action } = req.query;
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_OWNER;
  const repoName = process.env.GITHUB_REPO;

  const safeUser = user?.toLowerCase();
  const allowedUsers = ['shivam', 'aninda', 'sharvan']; 
  
  if (!allowedUsers.includes(safeUser)) {
    return res.status(403).json({ message: 'Unauthorized user profile.' });
  }

  const headers = { 'Authorization': `Bearer ${token}` };

  // --- NEW: Fetch Entire Folder Tree ---
  if (action === 'getAllFolders') {
    try {
      // ?recursive=1 fetches the entire repository structure instantly
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/main?recursive=1`;
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Failed to fetch tree map');
      
      const data = await response.json();
      const prefix = `images/${safeUser}/`;
      
      // Filter for directories belonging to the current user
      const folders = data.tree
        .filter(item => item.type === 'tree' && item.path.startsWith(prefix))
        .map(item => item.path.substring(prefix.length)); // Remove user prefix

      return res.status(200).json({ folders });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // --- Standard Directory Fetch ---
  const cleanPath = path.replace(/^\/|\/$/g, '');
  const fullPath = cleanPath ? `images/${safeUser}/${cleanPath}` : `images/${safeUser}`;

  try {
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${fullPath}`;
    const response = await fetch(url, { headers });
    
    if (response.status === 404) return res.status(200).json({ folders: [], files: [] });
    if (!response.ok) throw new Error('Failed to fetch directory contents');
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ message: 'Target is not a directory' });
    }

    const folders = data.filter(item => item.type === 'dir').map(dir => dir.name);
    const files = data.filter(item => item.type === 'file').map(file => ({
      name: file.name,
      size: file.size, 
      url: `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@main/${file.path}`
    }));

    return res.status(200).json({ folders, files });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
