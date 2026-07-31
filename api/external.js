export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const apiKey = req.headers['x-api-key'];
  let authenticatedUser = null;

  if (apiKey && apiKey === process.env.SHIVAM_API_KEY) authenticatedUser = 'shivam';
  else if (apiKey && apiKey === process.env.ANINDA_API_KEY) authenticatedUser = 'aninda';
  else if (apiKey && apiKey === process.env.SHARVAN_API_KEY) authenticatedUser = 'sharvan';

  if (!authenticatedUser) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized: Invalid or missing x-api-key header.' 
    });
  }

  const { fileData, fileName, folder } = req.body;
  
  if (!fileData || !fileName) {
    return res.status(400).json({ 
      success: false, 
      message: 'Bad Request: Missing fileData (base64 string) or fileName.' 
    });
  }

  const token = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_OWNER;
  const repoName = process.env.GITHUB_REPO;

  if (!token || !repoOwner || !repoName) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server Error: GitHub storage configurations are missing.' 
    });
  }

  const safeFolder = (folder || '')
    .replace(/[^a-zA-Z0-9-_/]/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');

  const filePath = `images/${authenticatedUser}/${safeFolder ? safeFolder + '/' : ''}${fileName}`;

  try {
    const githubUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    
    const response = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `API Upload: ${fileName} by ${authenticatedUser} via Headless Request`,
        content: fileData
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'GitHub API rejected the upload');
    }

    const cdnUrl = `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@main/${filePath}`;

    return res.status(200).json({ 
      success: true, 
      url: cdnUrl,
      path: filePath,
      user: authenticatedUser
    });
    
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
