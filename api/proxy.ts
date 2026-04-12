import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract the URL from the query string manually to handle nested params correctly
  const fullUrl = req.url || '';
  const urlParamIndex = fullUrl.indexOf('url=');
  
  if (urlParamIndex === -1) {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }

  const targetUrl = decodeURIComponent(fullUrl.substring(urlParamIndex + 4));

  if (!targetUrl) {
    return res.status(400).json({ error: 'Invalid URL parameter' });
  }

  try {
    const response = await fetch(targetUrl);
    const contentType = response.headers.get('content-type');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const body = await response.text();
    return res.status(response.status).send(body);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch the requested URL' });
  }
}
