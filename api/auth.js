export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { user, password } = req.body;

  if (!user || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }

  // Convert username to uppercase to match the environment variable format (e.g., SHIVAM_PASSWORD)
  const envVarName = `${user.toUpperCase()}_PASSWORD`;
  const validPassword = process.env[envVarName];

  if (!validPassword) {
    return res.status(500).json({ message: 'Server configuration error: Password not set.' });
  }

  if (password === validPassword) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ message: 'Invalid password' });
  }
}
