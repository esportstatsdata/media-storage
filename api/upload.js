export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { fileData, fileName, repoOwner, repoName } = req.body;
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return res.status(500).json({ message: 'Server configuration error: GitHub token missing.' });
  }

  try {
    // 1. Push to GitHub API
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

    // 2. Generate jsDelivr CDN link
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@main/images/${fileName}`;

    return res.status(200).json({ success: true, url: cdnUrl });
    
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
