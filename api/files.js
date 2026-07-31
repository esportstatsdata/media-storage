export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { user, path = '' } = req.query;
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_OWNER;
  const repoName = process.env.GITHUB_REPO;

  const safeUser = user?.toLowerCase();
  const allowedUsers = ['shivam', 'aninda', 'rahul']; 
  
  if (!allowedUsers.includes(safeUser)) {
    return res.status(403).json({ message: 'Unauthorized user profile.' });
  }

  const headers = { 'Authorization': `Bearer ${token}` };

  // Construct the secure target path
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
      size: file.size, // Size in bytes
      url: `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@main/${file.path}`
    }));

    return res.status(200).json({ folders, files });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
