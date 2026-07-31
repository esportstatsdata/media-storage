export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { fileData, fileName } = req.body;
  
  // Pulling credentials securely from Vercel Environment Variables
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_OWNER;
  const repoName = process.env.GITHUB_REPO;

  if (!token || !repoOwner || !repoName) {
    return res.status(500).json({ message: 'Server error: Missing environment variables.' });
  }

  try {
    const githubUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/images/${fileName}`;
    
    const response = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Upload ${fileName} via Media Manager`,
        content: fileData
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'GitHub API error');
    }

    const cdnUrl = `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@main/images/${fileName}`;

    return res.status(200).json({ success: true, url: cdnUrl });
    
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
