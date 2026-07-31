export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { user, folder, action } = req.query;
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_OWNER;
  const repoName = process.env.GITHUB_REPO;

  const safeUser = user?.toLowerCase();
  if (safeUser !== 'shivam' && safeUser !== 'aninda') {
    return res.status(403).json({ message: 'Unauthorized user profile.' });
  }

  const headers = { 'Authorization': `Bearer ${token}` };

  try {
    // Action 1: Get user's folders
    if (action === 'getFolders') {
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/images/${safeUser}`;
      const response = await fetch(url, { headers });
      
      // 404 means the user hasn't uploaded anything yet, so the folder doesn't exist.
      if (response.status === 404) return res.status(200).json({ folders: [] });
      if (!response.ok) throw new Error('Failed to fetch folders');
      
      const data = await response.json();
      const folders = data.filter(item => item.type === 'dir').map(dir => dir.name);
      return res.status(200).json({ folders });
    }

    // Action 2: Get files inside a specific folder
    if (action === 'getFiles' && folder) {
      const safeFolder = folder.replace(/[^a-zA-Z0-9-_]/g, '-');
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/images/${safeUser}/${safeFolder}`;
      const response = await fetch(url, { headers });
      
      if (response.status === 404) return res.status(200).json({ files: [] });
      if (!response.ok) throw new Error('Failed to fetch files');
      
      const data = await response.json();
      const files = data.filter(item => item.type === 'file').map(file => ({
        name: file.name,
        url: `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@main/${file.path}`
      }));
      return res.status(200).json({ files });
    }

    return res.status(400).json({ message: 'Invalid action parameter' });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
