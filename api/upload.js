export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { fileData, fileName, user, folder } = req.body;
  
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_OWNER;
  const repoName = process.env.GITHUB_REPO;

  if (!token || !repoOwner || !repoName) {
    return res.status(500).json({ message: 'Server error: Missing environment variables.' });
  }

  // Validate user access
  const safeUser = user.toLowerCase();
  const allowedUsers = ['shivam', 'aninda', 'rahul'];
  
  if (!allowedUsers.includes(safeUser)) {
    return res.status(403).json({ message: 'Unauthorized user profile.' });
  }

  // Sanitize folder name
  const safeFolder = folder.replace(/[^a-zA-Z0-9-_]/g, '-');
  const filePath = `images/${safeUser}/${safeFolder}/${fileName}`;

  try {
    const githubUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    
    const response = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Upload ${fileName} by ${user} to ${folder}`,
        content: fileData
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'GitHub API error');
    }

    const cdnUrl = `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@main/${filePath}`;

    return res.status(200).json({ success: true, url: cdnUrl });
    
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
